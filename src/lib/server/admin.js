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

router.get('/users', verifyToken, async (req, res) => {
    try {
        // 1. Ambil koleksi 'users' dari Firestore
        const usersRef = admin.firestore().collection('users');

        // 2. Lakukan query dengan filter: role TIDAK SAMA DENGAN 'admin'
        const snapshot = await usersRef
            .where('role', '!=', 'admin')
            .get();

        // 3. Mapping data dokumen menjadi array objek yang bersih
        const usersList = snapshot.docs.map(doc => ({
            uid: doc.id, // Menyertakan ID dokumen sebagai uid
            ...doc.data()
        }));

        // 4. Langsung kirim array usersList agar terbaca oleh `response.data` di frontend Svelte Anda
        res.json(usersList);

    } catch (error) {
        console.error("--- DEBUG ERROR (GET ADMIN USERS) ---");
        console.error("Pesan Error:", error.message);
        console.error("Stack Trace:", error.stack);

        res.status(500).json({
            message: "Server error gagal mengambil daftar pengguna",
            error: error.message
        });
    }
});

router.get('/reports', verifyToken, async (req, res) => {
    try {
        // 1. Ambil koleksi laporan dari Firestore
        const reportsRef = admin.firestore().collection('reports');

        // 2. Urutkan berdasarkan tanggal teks (ISO String bisa di-urutkan langsung dengan orderBy)
        const snapshot = await reportsRef
            .orderBy('created_at', 'desc')
            .get();

        // 3. Karena data di DB sudah pasti String ISO, mapping-nya jadi sangat simpel
        const reportsList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data() // Semua field (created_at, incident_date, dll.) langsung lolos sebagai String
        }));

        // 4. Kirim ke frontend SvelteKit
        res.json(reportsList);

    } catch (error) {
        console.error("--- DEBUG ERROR (GET ADMIN REPORTS) ---");
        console.error("Pesan Error:", error.message);

        res.status(500).json({
            message: "Server error gagal mengambil daftar pengaduan",
            error: error.message
        });
    }
});

router.post('/reports', verifyToken, async (req, res) => {
    try {
        const { report_id, user_to_sanction, sanction_type, reason } = req.body;

        // 1. Validasi input dasar
        if (!report_id || !user_to_sanction || !sanction_type) {
            return res.status(400).json({ 
                message: "Data laporan, nama terlapor, dan jenis sanksi wajib diisi!" 
            });
        }

        // Cek isi alasan jika hukumannya bukan ban permanen
        if (sanction_type !== 'permanent_ban' && (!reason || reason.trim().length < 10)) {
            return res.status(400).json({ 
                message: "Alasan sanksi wajib disertakan minimal 10 karakter!" 
            });
        }

        // 2. Ambil dokumen laporan terkait
        const reportRef = db.collection('reports').doc(report_id);
        const reportDoc = await reportRef.get();

        if (!reportDoc.exists) {
            return res.status(404).json({ message: "Data laporan tidak ditemukan!" });
        }

        const reportData = reportDoc.data();

        // Antisipasi jika laporan sudah pernah diselesaikan sebelumnya
        if (reportData.status !== 'pending') {
            return res.status(400).json({ message: "Laporan ini sudah diproses atau selesai." });
        }

        // 3. Cari UID Pengguna yang akan dijatuhi sanksi berdasarkan namanya 
        // (Tips: Jika di data laporan Anda menyimpan `reported_id`, cari berdasarkan ID akan jauh lebih akurat)
        const userSnapshot = await db.collection('users')
            .where('nama', '==', user_to_sanction)
            .limit(1)
            .get();

        if (userSnapshot.empty) {
            return res.status(404).json({ 
                message: `Pengguna dengan nama "${user_to_sanction}" tidak ditemukan di database.` 
            });
        }

        const userDocSnapshot = userSnapshot.docs[0];
        const userDocRef = userDocSnapshot.ref;
        const userData = userDocSnapshot.data();
        
        // Ambil nilai SP saat ini (jika belum ada di DB, default ke 0)
        const currentSpCount = userData.sp_count || 0; 
        const nowIso = new Date().toISOString();

        // 4. Mulai operasi massal lewat Firestore Batch
        const batch = db.batch();

        // Variabel untuk menampung pesan sukses dinamis
        let responseMessage = "";

        // JIKA ADMIN MEMILIH PERMANENT BAN LANGSUNG
        if (sanction_type === 'permanent_ban') {
            batch.update(userDocRef, {
                status: false,
                updated_at: nowIso
            });

            batch.update(reportRef, {
                status: 'resolved',
                sanction_executed: 'permanent_ban',
                sanction_reason: reason || "Akun diblokir secara permanen oleh Admin.",
                updated_at: nowIso
            });

            responseMessage = `Berhasil mengeksekusi sanksi. Akun ${user_to_sanction} telah diblokir permanen.`;

        } else {
            // JIKA ADMIN MEMBERIKAN SANKSI BIASA (PERINGATAN / SP)
            const newSpCount = currentSpCount + 1;

            // Cek apakah dengan penambahan ini, SP-nya menyentuh angka 3 atau lebih
            if (newSpCount >= 3) {
                // OTOMATIS BAN KARENA AKUMULASI SP = 3
                batch.update(userDocRef, {
                    sp_count: newSpCount,
                    status: false, // Akun otomatis nonaktif
                    updated_at: nowIso
                });

                batch.update(reportRef, {
                    status: 'resolved',
                    sanction_executed: 'permanent_ban_by_sp',
                    sanction_reason: "Akun diblokir otomatis oleh sistem karena akumulasi Surat Peringatan (SP) telah mencapai 3 kali.",
                    updated_at: nowIso
                });

                responseMessage = `Akun ${user_to_sanction} otomatis diblokir permanen oleh sistem karena jumlah SP telah mencapai ${newSpCount}.`;
            } else {
                // JIKA SP MASIH DI BAWAH 3 (Hanya tambah hitungan SP saja)
                batch.update(userDocRef, {
                    sp_count: newSpCount,
                    updated_at: nowIso
                });

                batch.update(reportRef, {
                    status: 'resolved',
                    sanction_executed: sanction_type,
                    sanction_reason: reason,
                    updated_at: nowIso
                });

                responseMessage = `Berhasil memberikan ${sanction_type} kepada ${user_to_sanction}. Total SP saat ini: ${newSpCount}/3.`;
            }
        }

        // Eksekusi semua perintah batch di atas secara bersamaan
        await batch.commit();

        // Kirim respon sukses yang dinamis ke frontend SvelteKit
        res.status(200).json({ message: responseMessage });

    } catch (error) {
        console.error("Error executing sanction:", error);
        res.status(500).json({
            message: "Server error gagal memproses tindakan sanksi admin",
            error: error.message
        });
    }
});


export default router;