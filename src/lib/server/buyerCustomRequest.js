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
        const fullDescription = `[Kategori: ${category}] ${description}`;

        // 3. Susun data Sesuai Skema Database Anda
        const newCustomRequest = {
            custom_request_id: customRequestRef.id, 
            buyer_id: buyer_id,
            seller_id: "",
            category:category,                          
            request_description: fullDescription,
            reference_image: imageUrl, // URL Cloudinary disimpan di sini
            budget:budget,
            negotiated_price: Number(budget),       
            request_status: "pending",               
            created_at: new Date().toISOString()    
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

router.patch('/complete/:requestId', verifyToken, async (req, res) => {
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
        // Mencegah buyer menyelesaikan pesanan yang belum dibayar atau belum dikerjakan
        if (data.request_status !== 'shipped') {
            return res.status(400).json({ 
                message: `Tidak dapat menyelesaikan pesanan. Status saat ini masih '${data.request_status}', harus sudah 'shipped'.` 
            });
        }

        // 4. Update data di Firestore
        const now = new Date();
        await docRef.update({
            request_status: 'completed',
            completed_at: admin.firestore.FieldValue.serverTimestamp() // Catat waktu selesai resmi dari server
        });

        // 5. Kirim respon sukses ke Svelte
        res.status(200).json({ 
            message: "Pesanan berhasil diselesaikan. Terima kasih!",
            requestId: requestId,
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