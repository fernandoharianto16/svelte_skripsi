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


router.get('/seller', verifyToken, async (req, res) => {
    try {
        const sellerId = req.user.uid;

        const transactionsRef = admin.firestore().collection('transactions');

        // Mengambil transaksi yang sukses milik seller tersebut
        const snapshot = await transactionsRef
            .where('seller_id', '==', sellerId)
            .where('status', '==', 'completed')
            .orderBy('created_at', 'desc')
            .get();

        const transactions = snapshot.docs.map(doc => {
            const data = doc.data();
            return { 
                id: doc.id, 
                ...data,
                // Mengonversi Timestamp Firestore ke format string/milidetik agar aman saat di-parse di JSON frontend
                created_at: data.created_at && typeof data.created_at.toDate === 'function' 
                    ? data.created_at.toDate()
                    : data.created_at
            };
        });

        // ========================================================
        // OPTIMASI: Hitung Agregasi Keuangan Langsung di Backend
        // ========================================================
        let totalGross = 0;
        let totalFee = 0;
        let totalNet = 0;

        transactions.forEach(tx => {
            totalGross += Number(tx.total_payment || 0);
            totalFee += Number(tx.admin_fee || 0);
            totalNet += Number(tx.seller_income || 0);
        });

        // Kirim data transaksi beserta ringkasan keuangannya sekaligus
        res.json({
            status: "success",
            summary: {
                gross: totalGross,
                fee: totalFee,
                net: totalNet
            },
            data: transactions,
            total: transactions.length
        });

    } catch (error) {
        console.error("--- DEBUG ERROR ---");
        console.error("Pesan Error:", error.message);
        console.error("Stack Trace:", error.stack);

        res.status(500).json({
            message: "Server error",
            error: error.message,
            details: "Cek terminal VS Code untuk detail lengkap"
        });
    }
});


router.get('/admin', verifyToken, async (req, res) => {
    try {
        const transactionsRef = admin.firestore().collection('transactions');

        // Admin mengambil semua data tanpa filter seller_id
        const snapshot = await transactionsRef
            .where('status', '==', 'completed')
            .orderBy('created_at', 'desc')
            .get();

        const transactions = snapshot.docs.map(doc => {
            const data = doc.data();
            return { 
                id: doc.id, 
                ...data,
                // Mengonversi Timestamp Firestore ke format string/milidetik agar aman saat di-parse di JSON frontend
                created_at: data.created_at && typeof data.created_at.toDate === 'function' 
                    ? data.created_at.toDate()
                    : data.created_at
            };
        });

        // Hitung ringkasan total seluruh platform
        let totalGross = 0, totalPlatformRevenue = 0, totalSellerPayouts = 0;
        transactions.forEach(tx => {
            totalGross += Number(tx.total_payment || 0);
            totalPlatformRevenue += Number(tx.admin_fee || 0);
            totalSellerPayouts += Number(tx.seller_income || 0);
        });

        res.json({
            status: "success",
            summary: {
                gross: totalGross,
                platformRevenue: totalPlatformRevenue,
                sellerPayouts: totalSellerPayouts
            },
            data: transactions
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

export default router;