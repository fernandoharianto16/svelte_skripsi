import express from 'express';
import admin from 'firebase-admin';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary'; // Menggunakan ES Modules import untuk Cloudinary
import { verifyToken } from './middleware/auth.js';

const router = express.Router();
const db = admin.firestore();

// Konfigurasi Multer (menyimpan file di memory buffer sebelum dikirim ke Cloudinary)
const upload = multer({ 
    limits: { fileSize: 5 * 1024 * 1024 } 
});

router.get('/', verifyToken, async (req, res) => {
    try {
        const buyer_id = req.user.uid || req.user.id; // Ambil ID pembeli dari token session login

        // Cari di koleksi 'custom_requests' yang buyer_id-nya cocok
        const snapshot = await db.collection('custom_requests')
            .where('buyer_id', '==', buyer_id)
            .orderBy('created_at', 'desc') // Urutkan dari yang paling baru dibuat
            .get();

        if (snapshot.empty) {
            return res.status(200).json([]);
        }

        const myRequests = [];
        snapshot.forEach(doc => {
            myRequests.push({
                id: doc.id,
                ...doc.data()
            });
        });

        res.status(200).json(myRequests);

    } catch (error) {
        console.error("Error fetching buyer custom requests:", error);
        res.status(500).json({ 
            message: "Server error gagal memuat daftar permintaan kustom Anda" 
        });
    }
});

// mengambil semua negosiasi berdasarkan custom request id
router.get('/:requestId/negotiations', verifyToken, async (req, res) => {
    try {
        const { requestId } = req.params;

        // Kuerinya sesimpel ini karena cuma mencari relasi untuk SATU request saja
        const negoSnapshot = await db.collection('negotiations')
            .where('custom_request_id', '==', requestId)
            .get();

        const listNegotiations = negoSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.status(200).json(listNegotiations);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Gagal mengambil data negosiasi" });
    }
});


// ==========================================
// 2. ENDPOINT: GET SINGLE CUSTOM REQUEST DETAIL (Untuk Modal)
// URL: GET /api/buyer/custom_request/:requestId
// ==========================================
router.get('/:requestId', verifyToken, async (req, res) => {
    try {
        const { requestId } = req.params;
        const buyer_id = req.user.uid || req.user.id;

        // Ambil dokumen berdasarkan ID yang dikirim
        const docRef = db.collection('custom_requests').doc(requestId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: "Data permintaan kustom tidak ditemukan" });
        }

        const requestData = doc.data();

        // Keamanan tambahan: Pastikan pembeli tidak bisa mengintip data custom request milik orang lain
        if (requestData.buyer_id !== buyer_id) {
            return res.status(403).json({ 
                message: "Akses ditolak! Anda tidak berhak melihat data permintaan ini." 
            });
        }

        // Kembalikan data utuh dokumen tersebut
        res.status(200).json({
            id: doc.id,
            ...requestData
        });

    } catch (error) {
        console.error("Error fetching single custom request:", error);
        res.status(500).json({ 
            message: "Server error gagal mengambil detail permintaan kustom" 
        });
    }
});

// ENDPOINT: POST /buyer/custom-requests
router.post('/', verifyToken, upload.single('product_image'), async (req, res) => {
    try {
        const buyer_id = req.user.uid || req.user.id; 
        const { category, budget, description } = req.body;

        if (!category || !budget || !description) {
            return res.status(400).json({ message: "Kategori, budget, dan deskripsi wajib diisi!" });
        }

        // 1. LOGIKA UPLOAD GAMBAR KE CLOUDINARY DENGAN FOLDER KHUSUS
        let imageUrl = "";
        if (req.file) {
            try {
                // Mengubah buffer multer menjadi base64 string agar bisa dibaca Cloudinary
                const fileBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
                
                // Proses Upload ke Cloudinary
                const uploadResponse = await cloudinary.uploader.upload(fileBase64, {
                    folder: 'custom_request_images', // 🔥 Mengarahkan gambar masuk ke folder ini
                    resource_type: 'image'
                });

                // Ambil URL secure (https) hasil upload
                imageUrl = uploadResponse.secure_url; 
            } catch (uploadError) {
                console.error("Cloudinary Upload Error:", uploadError);
                return res.status(500).json({ message: "Gagal mengupload gambar ke Cloudinary" });
            }
        }

        // 2. Generate ID Dokumen Baru untuk Custom Request
        const customRequestRef = db.collection('custom_requests').doc();

        // 3. Susun data Sesuai Skema Database Anda (Sudah dipisahkan)
        const newCustomRequest = {
            custom_request_id: customRequestRef.id, 
            buyer_id: buyer_id,
            seller_id: "",
            category: category, // Kategori tersimpan rapi di fieldnya sendiri
            request_description: description, // Murni deskripsi tanpa embel-embel teks kategori
            reference_image: imageUrl, 
            budget: budget,
            negotiated_price: Number(budget),       
            request_status: "pending",               
            created_at: new Date().toISOString(),
            payment_status: "pending", 
            payment_id: "",
            snap_token: "",
            shipment_proof_image: "",
            shipped_at: null,
            completed_at: null  
        };

        // Simpan ke Firestore
        await customRequestRef.set(newCustomRequest);

        res.status(201).json({
            message: "Custom request berhasil dibuat!",
            data: newCustomRequest
        });

    } catch (error) {
        console.error("Error creating custom request:", error);
        res.status(500).json({ message: "Server error gagal menyimpan custom request" });
    }
});

// memilih penjual untuk mengerjakan custom order
router.post('/choose', verifyToken, async (req, res) => {
    try {
        // 1. Ambil custom_request_id DAN seller_id dari req.body (karena diinput/dipilih oleh pembeli)
        const { custom_request_id, seller_id } = req.body; 
        // Ambil ID pembeli dari token login untuk validasi kepemilikan
        const buyer_id = req.user.uid || req.user.id; 
        if (!custom_request_id || !seller_id) {
            return res.status(400).json({ message: "ID Custom Request atau ID Penjual tidak boleh kosong!" });
        }
        // 2. Referensi ke dokumen custom_request spesifik di Firestore
        const customRequestRef = db.collection('custom_requests').doc(custom_request_id);
        const doc = await customRequestRef.get();
        // 3. Validasi apakah data custom request tersebut ada
        if (!doc.exists) {
            return res.status(404).json({ message: "Custom request tidak ditemukan!" });
        }
        const requestData = doc.data();
        // 4. Validasi Keamanan 1: Pastikan yang menekan tombol adalah pembeli yang membuat request ini
        if (requestData.buyer_id !== buyer_id) {
            return res.status(403).json({ 
                message: "Anda tidak memiliki hak akses untuk memilih penjual pada request ini!" 
            });
        }
        // 5. Validasi Keamanan 2: Mencegah pesanan dipilih ulang jika sudah diproses
        if (requestData.request_status !== 'pending' || (requestData.seller_id && requestData.seller_id !== "")) {
            return res.status(400).json({
                message: "Pesanan custom ini sudah memiliki penjual atau sedang diproses."
            });
        }

        const negotiationsSnapshot = await db.collection('negotiations')
            .where('custom_request_id', '==', custom_request_id)
            .get();

        const sellerNegotiationsSnapshot = await db.collection('negotiations')
            .where('custom_request_id', '==', custom_request_id)
            .where('seller_id',"==",seller_id)
            .get();
            // console.log(negotiationsSnapshot);
        const sellerNegoData=sellerNegotiationsSnapshot.docs[0].data();
            // console.log(negoData);

            // Gunakan Firestore Batch untuk efisiensi update banyak dokumen sekaligus
        const batch = db.batch();

        negotiationsSnapshot.forEach((negoDoc) => {
            const negoData = negoDoc.data();
            
            if (negoData.seller_id === seller_id) {
                // Opsional: Jika Anda ingin mengubah status negosiasi penjual yang TERPILIH menjadi 'accepted'
                batch.update(negoDoc.ref, { status: 'accepted' });
            } else {
                // SEAIN penjual terpilih, statusnya diubah menjadi 'canceled'
                batch.update(negoDoc.ref, { status: 'canceled' });
            }
        });

        // Eksekusi perubahan status negosiasi secara massal
        await batch.commit();

        // 6. Proses Update data ke Firestore (Pembeli menyetujui Penjual pilihan)
        await customRequestRef.update({
            seller_id: seller_id,          // Menggunakan seller_id yang dikirim dari frontend
            negotiated_price:sellerNegoData.offered_price,
            request_status: 'accepted',    // Status berubah menjadi 'accepted'
            payment_status: 'pending'
        });

        // Kembalikan respon sukses ke frontend
        res.status(200).json({
            message: "Berhasil memilih penjual dan membatalkan penawaran lainnya!",
            custom_request_id: custom_request_id,
            seller_id: seller_id,
            status: "accepted"
        });

    } catch (error) {
        console.error("Error updating custom request:", error);
        res.status(500).json({
            message: "Server error gagal memperbarui status custom request"
        });
    }
});


router.post('/reject', verifyToken, async (req, res) => {
    try {
        // 1. Ambil data dari req.body dan token login
        const { custom_request_id, seller_id } = req.body; 
        const buyer_id = req.user.uid || req.user.id; 

        if (!custom_request_id || !seller_id) {
            return res.status(400).json({ message: "ID Custom Request atau ID Penjual tidak boleh kosong!" });
        }

        // 2. Ambil dokumen custom_request dari Firestore
        const customRequestRef = db.collection('custom_requests').doc(custom_request_id);
        const doc = await customRequestRef.get();

        // 3. Validasi keberadaan dokumen
        if (!doc.exists) {
            return res.status(404).json({ message: "Custom request tidak ditemukan!" });
        }
        const requestData = doc.data();

        // 4. Validasi Keamanan 1: Pastikan pembeli yang menolak adalah pemilik request asli
        if (requestData.buyer_id !== buyer_id) {
            return res.status(403).json({ 
                message: "Anda tidak memiliki hak akses untuk menolak penawaran pada request ini!" 
            });
        }

        // 5. Validasi Keamanan 2: Pastikan request belum diproses oleh seller lain
        if (requestData.request_status !== 'pending' || (requestData.seller_id && requestData.seller_id !== "")) {
            return res.status(400).json({
                message: "Pesanan custom ini sudah berjalan atau sudah diproses."
            });
        }

        // 6. Cari dokumen negosiasi spesifik milik seller yang ditolak ini
        const sellerNegotiationsSnapshot = await db.collection('negotiations')
            .where('custom_request_id', '==', custom_request_id)
            .where('seller_id', '==', seller_id)
            .get();

        if (sellerNegotiationsSnapshot.empty) {
            return res.status(404).json({ message: "Data penawaran negosiasi tidak ditemukan!" });
        }

        const negoDocRef = sellerNegotiationsSnapshot.docs[0].ref;

        // 7. Eksekusi Batch Update (Guna menjaga konsistensi data)
        const batch = db.batch();

        // Ubah status negosiasi seller spesifik ini menjadi 'rejected'
        batch.update(negoDocRef, { 
            status: 'rejected',
            updated_at: new Date().toISOString()
        });

        // Update status dokumen custom_request utama:
        // Kembalikan counter ke 0 agar siklus tawar-menawar dengan seller lain bisa dimulai dari awal lagi.
        // batch.update(customRequestRef, {
        //     request_status: 'pending', // Tetap pending agar bisa ditawar seller lain
        //     seller_id: "",             // Kosongkan slot seller karena penawaran ditolak
        //     // counter_count: 0,          // Reset counter negosiasi kembali ke nol
        //     updated_at: new Date().toISOString()
        // });

        // Komit perubahan data secara bersamaan
        await batch.commit();

        // 8. Kirim response sukses kembali ke SvelteKit
        res.status(200).json({
            message: "Berhasil menolak penawaran dari penjual ini.",
            custom_request_id: custom_request_id,
            seller_id: seller_id,
            status: "rejected"
        });

    } catch (error) {
        console.error("Error rejecting seller offer:", error);
        res.status(500).json({
            message: "Server error gagal menolak penawaran custom request",
            error: error.message
        });
    }
});
// router.patch('/:requestId/complete', verifyToken, async (req, res) => {
//     try {
//         const { requestId } = req.params;
        
//         // Ambil ID pembeli dari token untuk validasi kepemilikan
//         const buyerId = req.user.uid || req.user.id;

//         if (!requestId) {
//             return res.status(400).json({ message: "ID Custom Request tidak valid!" });
//         }

//         const db = admin.firestore();
//         const docRef = db.collection('custom_requests').doc(requestId);
//         const docSnap = await docRef.get();

//         // 1. Validasi jika data tidak ditemukan
//         if (!docSnap.exists) {
//             return res.status(404).json({ message: "Permintaan kustom tidak ditemukan." });
//         }

//         const data = docSnap.data();

//         // 2. Validasi Keamanan: Pastikan yang menekan tombol selesai adalah buyer pemilik asli proyek ini
//         if (data.buyer_id !== buyerId) {
//             return res.status(403).json({ message: "Akses ditolak. Anda bukan pemilik pesanan ini." });
//         }

//         // 3. Validasi Status: Pastikan status proyek memang sudah dikirim (shipped) oleh seller
//         // Mencegah buyer menyelesaikan pesanan yang belum dibayar atau belum dikerjakan
//         if (data.request_status !== 'shipped') {
//             return res.status(400).json({ 
//                 message: `Tidak dapat menyelesaikan pesanan. Status saat ini masih '${data.request_status}', harus sudah 'shipped'.` 
//             });
//         }

//         // 4. Update data di Firestore
//         const now = new Date();
//         await docRef.update({
//             request_status: 'completed',
//             completed_at: admin.firestore.FieldValue.serverTimestamp() // Catat waktu selesai resmi dari server
//         });

//         // 5. Kirim respon sukses ke Svelte
//         res.status(200).json({ 
//             message: "Pesanan berhasil diselesaikan. Terima kasih!",
//             requestId: requestId,
//             status: "completed"
//         });

//     } catch (error) {
//         console.error("Gagal menyelesaikan custom request oleh buyer:", error);
//         res.status(500).json({ 
//             message: "Server error, gagal mengonfirmasi penyelesaian pesanan." 
//         });
//     }
// });
router.patch('/:requestId/complete', verifyToken, async (req, res) => {
    try {
        const { requestId } = req.params;
        
        // Ambil ID pembeli dari token untuk validasi kepemilikan
        const buyerId = req.user.uid || req.user.id;

        if (!requestId) {
            return res.status(400).json({ message: "ID Custom Request tidak valid!" });
        }

        const db = admin.firestore();
        const docRef = db.collection('custom_requests').doc(requestId);
        const docSnap = await docRef.get();

        // 1. Validasi jika data tidak ditemukan
        if (!docSnap.exists) {
            return res.status(404).json({ message: "Permintaan kustom tidak ditemukan." });
        }

        const data = docSnap.data();

        // 2. Validasi Keamanan: Pastikan yang menekan tombol selesai adalah buyer pemilik asli proyek ini
        if (data.buyer_id !== buyerId) {
            return res.status(403).json({ message: "Akses ditolak. Anda bukan pemilik pesanan ini." });
        }

        // 3. Validasi Status: Pastikan status proyek memang sudah dikirim (shipped) oleh seller
        if (data.request_status !== 'shipped') {
            return res.status(400).json({ 
                message: `Tidak dapat menyelesaikan pesanan. Status saat ini masih '${data.request_status}', harus sudah 'shipped'.` 
            });
        }

        // =======================================================
        // PROSES BATCH: UPDATE STATUS DAN BUAT TRANSAKSI BARU
        // =======================================================
        const batch = db.batch();
        const nowISO = new Date().toISOString();

        // A. Antrikan update status pada dokumen custom_requests
        batch.update(docRef, {
            request_status: 'completed',
            completed_at: nowISO
        });

        // B. Hitung nominal keuangan dari data Custom Request asli di DB
        // (Pastikan di dokumen custom_requests kamu ada field penampung harga total, misal: price atau total_price)
        const totalPayment = data.negotiated_price; 
        const adminFee = totalPayment * 0.15; // Hitung biaya admin otomatis (misal 5%)
        const sellerIncome = totalPayment - adminFee; // Hitung pendapatan bersih penjual

        // Buat ID Transaksi Unik secara otomatis (Contoh: TX-2026-XXXXX)
        const autoIdRef = db.collection('transactions').doc();
    
        // 2. Gabungkan teks 'TX-' dengan Auto-ID bawaan Firestore tadi
        const transactionId = `TX-${autoIdRef.id}`; // Hasilnya nanti seperti: TX-K3b7FmX9zLqP2wV1rS8t

        // Referensi ke dokumen baru di koleksi 'transactions' dengan ID custom transaksi
        const transactionRef = db.collection('transactions').doc(transactionId);

        // C. Antrikan pembuatan data transaksi finansial
        batch.set(transactionRef, {
            transaction_id: transactionId,
            source_type: "custom_request", // Menandakan transaksi dari custom request
            source_id: requestId,          // Relasi langsung ke ID custom_requests ini
            seller_id: data.seller_id,     // Diambil dari data custom request
            buyer_id: buyerId,             // ID pembeli yang sedang login
            total_payment: totalPayment,
            admin_fee: adminFee,
            seller_income: sellerIncome,
            status: "completed",
            created_at: nowISO
        });

        // D. Eksekusi semua perintah batch sekaligus (Atomik & Aman)
        await batch.commit();
        // =======================================================

        // 5. Kirim respon sukses ke Svelte
        res.status(200).json({ 
            message: "Pesanan berhasil diselesaikan dan transaksi berhasil dicatat. Terima kasih!",
            requestId: requestId,
            transactionId: transactionId,
            status: "completed"
        });

    } catch (error) {
        console.error("Gagal menyelesaikan custom request oleh buyer:", error);
        res.status(500).json({ 
            message: "Server error, gagal mengonfirmasi penyelesaian pesanan." 
        });
    }
});


export default router;