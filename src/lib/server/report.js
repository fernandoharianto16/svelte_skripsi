import admin from 'firebase-admin';
import { db } from './firebaseAdmin.js';
import { Router } from "express";
import upload from "./multer.js";
import multer from 'multer';
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import 'dotenv/config';
import { uploadToCloudinary } from './service/uploadImageService.js';


const router = Router();

import { verifyToken } from "./middleware/auth.js";


router.post("/", verifyToken, upload.single("evidence"), async (req, res) => {
    try {
    // 1. Ambil data teks pengaduan dari req.body (Termasuk nama dan incident_date)
    const {  
        name, 
        incident_date, 
        description 
    } = req.body;
    
    // ID pengguna yang sedang login dan mengirimkan laporan
    const reporter_id = req.user.uid; 

    const userDoc = await db.collection("users").doc(reporter_id).get();
    if (!userDoc.exists) {
        return res.status(404).json({ message: "Pengguna tidak ditemukan." });
    }

    const userData = userDoc.data();
    const reporter_role = userData.role;

    // 2. Validasi input dasar wajib isi
    // 🌟 Validasi input baru: Title
    if (!name || name.trim().length < 5) {
        return res.status(400).json({ message: "Judul laporan wajib diisi (minimal 5 karakter)." });
    }
    // 🌟 Validasi input baru: Tanggal Kejadian
    if (!incident_date) {
        return res.status(400).json({ message: "Tanggal kejadian pelanggaran wajib ditentukan." });
    }
    const parsedIncidentDate = new Date(incident_date);
    if (isNaN(parsedIncidentDate.getTime())) {
        return res.status(400).json({ message: "Format tanggal kejadian tidak valid." });
    }
    if (!description || description.trim().length < 15) {
        return res.status(400).json({ message: "Deskripsi tindakan minimal berisikan 15 karakter." });
    }

    // 3. Proses upload bukti file pelanggaran ke Cloudinary
    let evidenceUrl = null;
    if (req.file) {
        // Disimpan ke folder khusus "reports_evidence" di Cloudinary milikmu
        evidenceUrl = await uploadToCloudinary(req.file.buffer, "reports_evidence");
    } else {
        // Proteksi jika bukti foto/dokumen bersifat wajib
        return res.status(400).json({ message: "Anda wajib menyertakan file bukti pelanggaran." });
    }

    // 4. Susun struktur objek data laporan baru
    const newReport = {
        reporter_id,                           // UID pelapor (dari token login)
        
        // 🌟 Field baru hasil sinkronisasi form frontend
        reported_name: name.trim(),                   // nama penjual/pembeli
        incident_date: parsedIncidentDate.toISOString(),          // Tanggal kejadian pelanggaran (format string YYYY-MM-DD atau Date)
        
        reporter_role,
        description: description.trim(),       // Kronologi kejadian
        evidence_image: evidenceUrl,           // URL Bukti dari Cloudinary
        status: "pending",                     // Status awal: pending -> investigated -> resolved
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    // 5. Eksekusi simpan ke dokumen koleksi "reports" di Firestore
    const result = await db.collection("reports").add(newReport);

    // 6. Berikan respons sukses balik ke frontend
    res.status(201).json({
        message: "Laporan pengaduan Anda berhasil dikirim dan akan segera diproses.",
        id: result.id,
        data: newReport,
    });

} catch (error) {
    console.error("Gagal memproses laporan pengguna:", error);
    res.status(500).json({
        message: "Server error gagal memproses pengaduan",
        error: error.message
    });
}
});

// 2️⃣ Error handling Multer
router.use((err, req, res, next) => {
    // console.log("Error middleware hit:", err); // DEBUG
    if (err instanceof multer.MulterError) {
        // console.log("MulterError code:", err.code); // DEBUG
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ message: "Ukuran file terlalu besar, maksimal 1 MB" });
        }
        return res.status(400).json({ message: err.message });
    }
    next(err);
});

export default router;