import express from 'express';
import admin from 'firebase-admin';
import { verifyToken } from './middleware/auth.js'; // Sesuaikan path middleware Anda
import upload from './multer.js';
const router = express.Router();
const db = admin.firestore();
import { uploadToCloudinary } from './service/uploadImageService.js';
import { snap } from './midtrans.js';


router.get('/all', verifyToken, async (req, res) => {
    try {
        // 1. Cek apakah req.user ada dari middleware verifyToken
        if (!req.user) {
            return res.status(401).json({ message: "Otentikasi gagal, user tidak ditemukan di request" });
        }

        // Antisipasi: Baca 'uid' atau 'id' dari payload JWT token login
        const sellerId = req.user.uid || req.user.id;

        if (!sellerId) {
            return res.status(400).json({ message: "ID Penjual tidak valid atau kosong" });
        }
        
        const db = admin.firestore();

        // 🌟 Mengambil SEMUA data custom request yang 'seller_id'-nya COCOK dengan seller yang login
        const snapshot = await db.collection('custom_requests')
            .where('seller_id', '==', sellerId)
            .get();

        const requests = [];
        snapshot.forEach(doc => {
            const data = doc.data();

            // Antisipasi jika created_at berupa Firestore Timestamp (.toDate()) atau string biasa
            let formattedDate = new Date();
            if (data.created_at) {
                formattedDate = typeof data.created_at.toDate === 'function'
                    ? data.created_at.toDate()
                    : data.created_at;
            }

            requests.push({
                ...data,
                // 🌟 PERBAIKAN KUNCI: Svelte Anda membaca properti 'custom_request_id'
                // Kita berikan keduanya agar tidak terjadi 'undefined' error di sisi frontend Svelte
                id: doc.id, 
                custom_request_id: data.custom_request_id || doc.id, 
                created_at: formattedDate
            });
        });

        // Urutkan berdasarkan tanggal masuk terbaru secara aman di sisi Node.js
        requests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // Berikan respon array data ke frontend
        res.status(200).json(requests);
    } catch (error) {
        console.error("Gagal mengambil riwayat proyek seller:", error);
        res.status(500).json({ message: "Gagal memuat riwayat proyek kustom Anda." });
    }
});


// ENDPOINT: GET /api/seller/custom_request/
// Berfungsi untuk mengambil semua custom request yang berstatus 'pending'
// router.get('/', verifyToken, async (req, res) => {
//     try {
//         const currentSellerId = req.user.id;
//         // Ambil data dari koleksi 'custom_requests'
//         const snapshot = await db.collection('custom_requests')
//             .where('request_status', '==', 'pending') // Hanya yang belum diambil
//             .orderBy('created_at', 'desc')            // Urutkan dari yang terbaru
//             .get();


//         const negoRef = await db.collection('negotiations')
//         .where('seller_id', '==', currentSellerId) // Hanya yang belum diambil
//         .get();
//         // Jika data kosong, kembalikan array kosong
//         if (snapshot.empty) {
//             return res.status(200).json([]);
//         }
//         // Mapping data dokumen Firestore menjadi array objek JSON
//         const availableRequests = [];
//         snapshot.forEach(doc => {
//             availableRequests.push({
//                 id: doc.id, // ID Dokumen Firestore
//                 ...doc.data() // Menyalin semua field (custom_request_id, customer_id, dll)
//             });
//         });

//         const listNego = [];
//         snapshot.forEach(doc => {
//             listNego.push({
//                 id: doc.id, // ID Dokumen Firestore
//                 ...doc.data() // Menyalin semua field (custom_request_id, customer_id, dll)
//             });
//         });

//         // Kirim data ke frontend
//         res.status(200).json(availableRequests,listNego);
//     } catch (error) {
//         console.error("Error fetching available custom requests:", error);
//         res.status(500).json({
//             message: "Server error gagal mengambil daftar custom request"
//         });
//     }
// });

router.get('/', verifyToken, async (req, res) => {
    try {
        const sellerId = req.user.uid; // Menggunakan UID dari token

        // A. Ambil semua request yang pending
        const requestSnapshot = await db.collection('custom_requests')
            .where('request_status', '==', 'pending')
            .get();

        // B. Ambil semua negosiasi milik penjual ini
        const negoSnapshot = await db.collection('negotiations')
            .where('seller_id', '==', sellerId)
            .get();

        // C. Petakan negosiasi untuk setiap request
        const negoDataMap = {};
        negoSnapshot.docs.forEach(doc => {
            const data = doc.data();
            // Simpan informasi negosiasi terakhir (status & count)
            negoDataMap[data.custom_request_id] = {
                status: data.status,
                counter_count: data.counter_count,
                counterReason : data.bargain_reason,
                counterPrice : data.offered_price
            };
        });

        // D. Gabungkan data
        const combinedRequests = requestSnapshot.docs.map(doc => {
            const negoInfo = negoDataMap[doc.id] || { status: null, counter_count: 0 };
            return {
                id: doc.id,
                ...doc.data(),
                negoStatus: negoInfo.status,     // 'pending', 'rejected', dll
                negoCount: negoInfo.counter_count, // 1, 2, atau 3
                negoCounterReason: negoInfo.counterReason,
                negoCounterPrice: negoInfo.counterPrice
            };
        });

        res.status(200).json(combinedRequests);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Gagal mengambil data" });
    }
});

router.get('/:requestId', verifyToken, async (req, res) => {
    try {
        const { requestId } = req.params;
        
        // Ambil ID penjual dari token untuk memastikan dia hanya bisa melihat proyeknya sendiri
        const sellerId = req.user.uid || req.user.id;

        if (!requestId) {
            return res.status(400).json({ message: "ID Custom Request tidak valid atau kosong!" });
        }

        // Ambil dokumen berdasarkan ID di koleksi 'custom_requests'
        const docRef = db.collection('custom_requests').doc(requestId);
        const docSnap = await docRef.get();

        // 1. Validasi jika data tidak ditemukan
        if (!docSnap.exists) {
            return res.status(404).json({ message: "Permintaan kustom tidak ditemukan." });
        }

        const data = docSnap.data();

        // 2. Validasi Keamanan: Pastikan seller yang mengakses adalah pemilik proyek ini
        // (Kecuali jika Anda mengizinkan semua seller melihat detail pesanan 'pending' yang belum diambil)
        if (data.seller_id && data.seller_id !== sellerId) {
            return res.status(403).json({ message: "Akses ditolak. Anda bukan pemilik proyek ini." });
        }

        // 3. Antisipasi format tanggal (Firestore Timestamp ke ISO String)
        let formattedDate = data.created_at;
        if (data.created_at && typeof data.created_at.toDate === 'function') {
            formattedDate = data.created_at.toDate();
        }
        
        let formattedShippedDate = data.shipped_at;
        if (data.shipped_at && typeof data.shipped_at.toDate === 'function') {
            formattedShippedDate = data.shipped_at.toDate();
        }

        // 4. Susun response data untuk dikirim ke Svelte
        const requestDetail = {
            id: docSnap.id,
            ...data,
            created_at: formattedDate,
            shipped_at: formattedShippedDate
        };

        // Kirim data dengan status 200 OK
        res.status(200).json(requestDetail);

    } catch (error) {
        console.error("Gagal mengambil detail custom request:", error);
        res.status(500).json({ 
            message: "Server error, gagal memuat detail permintaan kustom." 
        });
    }
});

router.patch('/:requestId', verifyToken, async (req, res) => {
    try {
        const { requestId } = req.params;
        const seller_id = req.user.uid || req.user.id; // Ambil ID penjual dari token login

        if (!requestId) {
            return res.status(400).json({ message: "ID Custom Request tidak valid atau kosong!" });
        }

        // 1. Referensi ke dokumen custom_request spesifik di Firestore
        const customRequestRef = db.collection('custom_requests').doc(requestId);
        const doc = await customRequestRef.get();

        // 2. Validasi apakah data custom request tersebut ada
        if (!doc.exists) {
            return res.status(404).json({ message: "Custom request tidak ditemukan!" });
        }

        const requestData = doc.data();

        // 3. Validasi keamanan: Mencegah pesanan diambil dua kali oleh penjual berbeda
        if (requestData.request_status !== 'pending' || requestData.seller_id !== "") {
            return res.status(400).json({
                message: "Maaf, pesanan custom ini sudah diambil atau sedang diproses oleh penjual lain."
            });
        }

        // 4. Proses Update data ke Firestore sesuai skema database Anda
        await customRequestRef.update({
            seller_id: seller_id,         // Diisi dengan UID penjual yang mengambil
            request_status: 'accepted',    // Status berubah dari 'pending' menjadi 'accepted'
            payment_status: 'pending'
        });

        // Kembalikan respon sukses ke frontend
        res.status(200).json({
            message: "Berhasil mengajukan diri mengerjakan pesanan custom ini!",
            custom_request_id: requestId,
            status: "accepted"
        });

    } catch (error) {
        console.error("Error updating custom request:", error);
        res.status(500).json({
            message: "Server error gagal memperbarui status custom request"
        });
    }
});

// router.patch('/:requestId', async (req, res) => {
//     try {
//         const { requestId } = req.params;
//         const { status } = req.body; // Menerima payload { status: "accepted" } dari Svelte
//         const sellerId = req.user.uid;

//         const docRef = admin.firestore().collection('custom_requests').doc(requestId);
//         const docSnap = await docRef.get();

//         if (!docSnap.exists) {
//             return res.status(404).json({ message: "Permintaan kustom tidak ditemukan" });
//         }

//         const data = docSnap.data();
//         if (data.seller_id !== sellerId) {
//             return res.status(403).json({ message: "Akses ditolak" });
//         }

//         // Perbarui status utama proyek menjadi accepted agar pembeli bisa melakukan check-out
//         await docRef.update({
//             request_status: status, // Nilainya diset menjadi "accepted"
//             updated_at: admin.firestore.FieldValue.serverTimestamp()
//         });

//         res.status(200).json({ message: "Permintaan kustom berhasil disetujui." });
//     } catch (error) {
//         console.error("Gagal menyetujui proyek:", error);
//         res.status(500).json({ message: "Gagal memperbarui status proyek." });
//     }
// });

// =========================================================================
// 4. UPLOAD BUKTI HASIL PENGERJAAN / PENGIRIMAN (AKSI TOMBOL TRUCK)
// URL: POST /api/seller/custom_request/ship/:requestId
// =========================================================================

// ini endpoint pengiriman
router.post('/ship/:requestId',verifyToken, upload.single('product_image'), async (req, res) => {
    try {
        const { requestId } = req.params;
        const { status } = req.body; // Menerima text "shipped" dari Form Data Svelte
        const sellerId = req.user.uid || req.user.id;

        if (!req.file) {
            return res.status(400).json({ message: "File gambar bukti wajib dilampirkan" });
        }

        const docRef = admin.firestore().collection('custom_requests').doc(requestId);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return res.status(404).json({ message: "Permintaan kustom tidak ditemukan" });
        }

        const data = docSnap.data();
        if (data.seller_id !== sellerId) {
            return res.status(403).json({ message: "Akses ditolak" });
        }

        // --- 🌟 MENGGUNAKAN FUNGSI UPLOAD YANG SUDAH ANDA MILIKI ---
        // Panggil fungsi Anda dengan mengirimkan buffer file dari multer
        const downloadUrl = await uploadToCloudinary(req.file.buffer, {
            folder: 'shipment_proofs'
        });
        // -------------------------------------------------------------

        // Perbarui dokumen kustom di Firestore
        await docRef.update({
            request_status: status,                  // Mengubah status menjadi "shipped"
            shipment_proof_image: downloadUrl,       // Menyimpan URL hasil dari Cloudinary
            shipped_at: new Date().toISOString()
        });

        res.status(200).json({ message: "Bukti pengiriman berhasil diunggah.", url: downloadUrl });
    } catch (error) {
        console.error("Gagal memproses upload bukti pengiriman ke Cloudinary:", error);
        res.status(500).json({ message: "Terjadi kesalahan saat upload gambar bukti." });
    }
});



// POST /seller/custom_request/:requestId/apply
router.post('/:requestId/apply', verifyToken, async (req, res) => {
    try {
        const seller_id = req.user.uid || req.user.id;
        const { requestId } = req.params;
        let namaPenjual="";
        // const seller_name = req.user.displayName;

        console.log(seller_id);
        const sellerSnapshot = await db.collection('users')
            .where('uid', '==', seller_id)
            .get();

        if (!sellerSnapshot.empty) {
            const sellerDoc = sellerSnapshot.docs[0];
            const sellerData = sellerDoc.data();
            
            // Gunakan field 'nama' sesuai dengan gambar Anda
            namaPenjual= sellerData.nama; 
            // console.log("Nama Penjual:", namaPenjual);
        } else {
            console.log("Penjual tidak ditemukan.");
        }

        const customRequestRef = db.collection('custom_requests').doc(requestId);
        const customRequestDoc = await customRequestRef.get();

        if (!customRequestDoc.exists) {
            return res.status(404).json({ message: "Permintaan custom tidak ditemukan!" });
        }

        const customRequestData = customRequestDoc.data();
        if (customRequestData.request_status !== "pending") {
            return res.status(400).json({ message: "Permintaan ini sudah tidak tersedia!" });
        }

        // Cari berdasarkan custom_request_id untuk memastikan keunikan di jalur kustom
        const existingNegotiation = await db.collection('negotiations')
            .where('custom_request_id', '==', requestId)
            .where('seller_id', '==', seller_id)
            .get();

        if (!existingNegotiation.empty) {
            return res.status(400).json({ message: "Anda sudah terdaftar. Gunakan menu nego jika ingin mengubah harga!" });
        }

        const allNegotiations = await db.collection('negotiations')
            .where('custom_request_id', '==', requestId)
            .get();

        if (allNegotiations.size >= 3) {
            return res.status(400).json({ message: "Kuota penawar untuk pesanan ini sudah penuh!" });
        }

        const negotiationRef = db.collection('negotiations').doc();
        const newApply = {
            buyer_id: customRequestData.buyer_id,
            seller_id: seller_id,
            
            // 🌟 KEDUANYA ADA SEBAGAI PEMISAH JALUR TX:
            custom_request_id: requestId, // Terisi karena ini jalur Custom Request
            product_id: "",                // Kosong karena bukan produk ready-stok penjual
            seller_name: namaPenjual,
            
            product_name: customRequestData.product_name || "Produk Custom Baru",
            offered_price: Number(customRequestData.budget),
            counter_count: 1,
            origin_type: "seller",
            status: "pending",
            bargain_reason: "Mengambil langsung sesuai anggaran awal pembeli.",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        await negotiationRef.set(newApply);
        res.status(201).json({ message: "Berhasil mengambil pesanan custom!", data: newApply });

    } catch (error) {
        console.error("Error dalam apply order:", error);
        res.status(500).json({ message: "Server error gagal memproses pengambilan pesanan" });
    }
});

// router.post('/:requestId/negotiate', verifyToken, async (req, res) => {
//     try {
//         const { selectedNegoId } = req.params;
//         const { offered_price, bargain_reason } = req.body;
//         const sellerId = req.user?.uid;

//         // 1. Validasi Input Dasar
//         if (!offered_price || offered_price <= 0) {
//             return res.status(400).json({ message: "Nominal harga tidak valid." });
//         }
//         if (!bargain_reason || !bargain_reason.trim()) {
//             return res.status(400).json({ message: "Alasan harus diisi." });
//         }

//         // 2. Ambil data dokumen negosiasi yang sedang berjalan
//         const negoRef = db.collection('negotiations').doc(selectedNegoId);
//         const negoDoc = await negoRef.get();

//         if (!negoDoc.exists) {
//             return res.status(404).json({ message: "Data negosiasi tidak ditemukan!" });
//         }

//         const negoData = negoDoc.data();

//         // Safe check: Pastikan penjual ini yang memiliki hak atas negosiasi ini
//         if (negoData.seller_id !== sellerId) {
//             return res.status(403).json({ message: "Anda tidak berhak mengakses negosiasi ini." });
//         }

//         // 🛑 3. VALIDASI LIMIT COUNTER (Sesuai kesepakatan maks 3 kali dari penjual)
//         if (negoData.counter_count >= 3) {
//             return res.status(400).json({ message: "Anda sudah mencapai batas maksimal 3 kali penawaran!" });
//         }

//         // 4. Siapkan Data Update Penawaran Kedua / Ketiga
//         const updatedNego = {
//             offered_price: Number(offered_price),
//             bargain_reason: bargain_reason,
//             origin_type: "seller", // Menandakan aksi terakhir beralih ke penjual
//             status: "pending",     // Status kembali pending menunggu respon pembeli
            
//             // 🌟 PENTING: Naikkan jumlah counter_count penjual di sini
//             counter_count: (negoData.counter_count || 0) + 1, 
            
//             updated_at: new Date()
//         };

//         // 5. Eksekusi Perubahan ke Firestore
//         await negoRef.update(updatedNego);

//         res.status(200).json({ 
//             message: "Penawaran baru Anda berhasil dikirim!", 
//             data: updatedNego 
//         });

//     } catch (error) {
//         console.error("Error dalam seller counter offer:", error);
//         res.status(500).json({ message: "Server error gagal memproses penawaran." });
//     }
// });
router.post('/:requestId/negotiate', verifyToken, async (req, res) => {
    try {
        const seller_id = req.user.uid || req.user.id;
        const { requestId } = req.params;
        const { offered_price, bargain_reason } = req.body;

        if (!offered_price || Number(offered_price) <= 0) {
            return res.status(400).json({ message: "Harga penawaran wajib diisi dan valid!" });
        }

        const customRequestRef = db.collection('custom_requests').doc(requestId);
        const customRequestDoc = await customRequestRef.get();

        if (!customRequestDoc.exists) {
            return res.status(404).json({ message: "Permintaan custom tidak ditemukan!" });
        }

        const customRequestData = customRequestDoc.data();

        // Cari berdasarkan custom_request_id
        const negotiationQuery = await db.collection('negotiations')
            .where('custom_request_id', '==', requestId)
            .where('seller_id', '==', seller_id)
            .get();

        // KONDISI 1: Belum pernah daftar sama sekali tapi langsung mau NEGO harga awal
        if (negotiationQuery.empty) {
            const allNegotiations = await db.collection('negotiations')
                .where('custom_request_id', '==', requestId)
                .get();

            if (allNegotiations.size >= 3) {
                return res.status(400).json({ message: "Kuota penawar untuk pesanan ini sudah penuh!" });
            }
            const sellerRef = db.collection("users").doc(seller_id);
            const doc = await sellerRef.get();


            // Ekstrak data asli dari dalam dokumen Firestore
            const sellerData = doc.data();

            const negotiationRef = db.collection('negotiations').doc();
            const newNegotiation = {
                buyer_id: customRequestData.buyer_id,
                seller_id: seller_id,
                seller_name:sellerData.nama,
                
                // 🌟 KEDUANYA ADA SEBAGAI PEMISAH JALUR TX:
                custom_request_id: requestId, // Terisi karena jalur Custom Request
                product_id: "",                // Kosong karena bukan produk ready-stok penjual
                
                product_name: customRequestData.product_name || "Produk Custom Baru",
                offered_price: Number(offered_price),
                counter_count: 1,
                origin_type: "seller",
                status: "pending",
                bargain_reason: bargain_reason || "Mengajukan penawaran harga awal.",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            await negotiationRef.set(newNegotiation);
            return res.status(201).json({ message: "Berhasil mengirimkan penawaran harga Anda!", data: newNegotiation });
        } 
        
        // KONDISI 2: Sudah pernah daftar, ditolak, dan sekarang mau kirim Counter-Offer (Nego ulang ke-2 / ke-3)
        else {
            const existingDoc = negotiationQuery.docs[0];
            const currentData = existingDoc.data();

            if (currentData.status === "accepted") {
                return res.status(400).json({ message: "Penawaran Anda sudah diterima oleh pembeli!" });
            }
            
            // 🛑 VALIDASI JALUR TERBARU: Cek siapa yang berhak menawar sekarang
            if (currentData.origin_type === "seller" && currentData.status === "pending") {
                return res.status(400).json({ message: "Penawaran Anda sebelumnya masih menunggu keputusan pembeli!" });
            }

            // 🛑 VALIDASI LIMIT COUNTER PENJUAL
            if (currentData.counter_count >= 3) {
                return res.status(400).json({ message: "Kesempatan menawar Anda sudah habis (Maksimal 3 kali)!" });
            }

            // Jika origin_type === "buyer" atau status === "rejected", maka penjual boleh menawar balik
            const nextCounter = currentData.counter_count + 1;
            const updatedData = {
                offered_price: Number(offered_price),
                counter_count: nextCounter,
                origin_type: "seller",             // Kembalikan kendali ke seller
                status: "pending",                 // Reset status ke pending untuk pembeli
                bargain_reason: bargain_reason || "Mengajukan harga penawaran baru.",
                updated_at: new Date().toISOString()
            };

            await existingDoc.ref.update(updatedData);
            return res.status(200).json({ message: `Berhasil mengirimkan penawaran ke-${nextCounter}!`, data: updatedData });
        }

    } catch (error) {
        console.error("Error dalam proses negosiasi:", error);
        res.status(500).json({ message: "Server error gagal memproses negosiasi" });
    }
});

router.post('/:requestId', verifyToken, async (req, res) => {
    const { requestId } = req.params;
    const { offered_price, bargain_reason } = req.body;
    const sellerId = req.user?.uid;
    console.log(sellerId);
    if (!offered_price || offered_price <= 0) {
        return res.status(400).json({ message: "Nominal harga tidak valid." });
    }
    if (!bargain_reason || !bargain_reason.trim()) {
        return res.status(400).json({ message: "Alasan harus diisi." });
    }

    try {
        let namaPenjual="";
        // const seller_name = req.user.displayName;

        const sellerSnapshot = await db.collection('users')
            .where('uid', '==', sellerId)
            .get();

        if (!sellerSnapshot.empty) {
            const sellerDoc = sellerSnapshot.docs[0];
            const sellerData = sellerDoc.data();
            
            // Gunakan field 'nama' sesuai dengan gambar Anda
            namaPenjual= sellerData.nama; 
            // console.log("Nama Penjual:", namaPenjual);
        } else {
            console.log("Penjual tidak ditemukan.");
        }

        const customRequestRef = db.collection('custom_requests').doc(requestId);
        const customRequestDoc = await customRequestRef.get();

        if (!customRequestDoc.exists) {
            return res.status(404).json({ message: "Permintaan custom tidak ditemukan!" });
        }

        const customRequestData = customRequestDoc.data();
        if (customRequestData.request_status !== "pending") {
            return res.status(400).json({ message: "Permintaan ini sudah tidak tersedia!" });
        }

        const allNegotiations = await db.collection('negotiations')
            .where('custom_request_id', '==', requestId)
            .get();

        // STATUS: Sekarang kita sudah pegang semua data penawaran di dalam variabel `allNegotiations`

        // 2. JALUR UTAMA: Cek kuota dulu (misal jumlah data yang diambil tadi ada berapa)
        if (allNegotiations.size >= 3) {
            return res.status(400).json({ message: "Kuota penawar sudah penuh!" });
        }

        // 3. JALUR KEDUA: Cek apakah dari data yang kita pegang tadi, ada ID kita di dalamnya
        // Fungsi .some() itu seperti mata kita yang men-scan tumpukan data tersebut
        const isAlreadyApplied = allNegotiations.docs.some(doc => doc.data().seller_id === sellerId);

        if (isAlreadyApplied) {
            return res.status(400).json({ message: "Anda sudah terdaftar!" });
        }

        const negotiationRef = db.collection('negotiations').doc();
        const newApply = {
            buyer_id: customRequestData.buyer_id,
            seller_id: sellerId,
            
            custom_request_id: requestId, 
            product_id: "",                
            seller_name: namaPenjual,
            
            product_name: customRequestData.product_name || "Produk Custom Baru",
            
            // 🌟 UBAH DI SINI: Menggunakan harga tawaran baru dari penjual
            offered_price: Number(offered_price), 
            
            counter_count: 1,
            origin_type: "seller",
            status: "pending",
            
            // 🌟 UBAH DI SINI: Menggunakan alasan tawar-menawar dari input frontend
            bargain_reason: bargain_reason || "Mengajukan penawaran harga baru.", 
            
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        await negotiationRef.set(newApply);
        res.status(201).json({ message: "Berhasil mengambil pesanan custom!", data: newApply });

    } catch (error) {
        console.error("Error dalam apply order:", error);
        res.status(500).json({ message: "Server error gagal memproses pengambilan pesanan" });
    }

});

export default router;