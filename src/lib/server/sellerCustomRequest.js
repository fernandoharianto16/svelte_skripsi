import express from 'express';
import admin from 'firebase-admin';
import { verifyToken } from './middleware/auth.js'; // Sesuaikan path middleware Anda
import upload from './multer.js';
const router = express.Router();
const db = admin.firestore();
import { uploadToCloudinary } from './service/uploadImageService.js';

// ENDPOINT: GET /api/seller/custom_request/
// Berfungsi untuk mengambil semua custom request yang berstatus 'pending'
router.get('/', verifyToken, async (req, res) => {
    try {
        // Ambil data dari koleksi 'custom_requests'
        const snapshot = await db.collection('custom_requests')
            .where('request_status', '==', 'pending') // Hanya yang belum diambil
            .orderBy('created_at', 'desc')            // Urutkan dari yang terbaru
            .get();

        // Jika data kosong, kembalikan array kosong
        if (snapshot.empty) {
            return res.status(200).json([]);
        }

        // Mapping data dokumen Firestore menjadi array objek JSON
        const availableRequests = [];
        snapshot.forEach(doc => {
            availableRequests.push({
                id: doc.id, // ID Dokumen Firestore
                ...doc.data() // Menyalin semua field (custom_request_id, customer_id, dll)
            });
        });

        // Kirim data ke frontend
        res.status(200).json(availableRequests);

    } catch (error) {
        console.error("Error fetching available custom requests:", error);
        res.status(500).json({
            message: "Server error gagal mengambil daftar custom request"
        });
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
            formattedDate = data.created_at.toDate().toISOString();
        }
        
        let formattedShippedDate = data.shipped_at;
        if (data.shipped_at && typeof data.shipped_at.toDate === 'function') {
            formattedShippedDate = data.shipped_at.toDate().toISOString();
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
            let formattedDate = new Date().toISOString();
            if (data.created_at) {
                formattedDate = typeof data.created_at.toDate === 'function'
                    ? data.created_at.toDate().toISOString()
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

router.patch('/:requestId', async (req, res) => {
    try {
        const { requestId } = req.params;
        const { status } = req.body; // Menerima payload { status: "accepted" } dari Svelte
        const sellerId = req.user.uid;

        const docRef = admin.firestore().collection('custom_requests').doc(requestId);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return res.status(404).json({ message: "Permintaan kustom tidak ditemukan" });
        }

        const data = docSnap.data();
        if (data.seller_id !== sellerId) {
            return res.status(403).json({ message: "Akses ditolak" });
        }

        // Perbarui status utama proyek menjadi accepted agar pembeli bisa melakukan check-out
        await docRef.update({
            request_status: status, // Nilainya diset menjadi "accepted"
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(200).json({ message: "Permintaan kustom berhasil disetujui." });
    } catch (error) {
        console.error("Gagal menyetujui proyek:", error);
        res.status(500).json({ message: "Gagal memperbarui status proyek." });
    }
});

// =========================================================================
// 4. UPLOAD BUKTI HASIL PENGERJAAN / PENGIRIMAN (AKSI TOMBOL TRUCK)
// URL: POST /api/seller/custom_request/ship/:requestId
// =========================================================================
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
            shipped_at: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(200).json({ message: "Bukti pengiriman berhasil diunggah.", url: downloadUrl });
    } catch (error) {
        console.error("Gagal memproses upload bukti pengiriman ke Cloudinary:", error);
        res.status(500).json({ message: "Terjadi kesalahan saat upload gambar bukti." });
    }
});

export default router;