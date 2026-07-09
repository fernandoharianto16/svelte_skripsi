import admin from 'firebase-admin';
import { db } from './firebaseAdmin.js';
import { Router } from 'express';
import { verifyToken } from './middleware/auth.js';
import upload from "./multer.js";
import multer from 'multer';
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import 'dotenv/config';

// 2. Konfigurasi Cloudinary (menggunakan data dari .env)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});
const router = Router();

router.get("/", verifyToken, async (req, res) => {
    // ambil semua produk
    try {
         
            const productsRef = admin.firestore().collection('products');
    
            const snapshot = await productsRef
                .where('status', '==', 'active')
                .orderBy('created_at', 'desc')
                .get();
    
            const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // console.log(products);
    
            res.json({
                data: products,
                total: products.length
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server error' });
        }
});

router.get("/:id", verifyToken, async (req, res) => {
    try {
        const productId = req.params.id; // Mengambil ID dari URL
        const productRef = admin.firestore().collection('products').doc(productId);
        const doc = await productRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Produk tidak ditemukan' });
        }

        // Mengembalikan data beserta ID-nya
        res.json({
            data: { id: doc.id, ...doc.data() }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/review/:id', verifyToken, async (req, res) => {
    try {
        const productId = req.params.id;

        // 1. Query ke collection 'reviews' berdasarkan product_id
        const reviewsSnapshot = await db.collection('reviews')
            .where('product_id', '==', productId)
            .get();

        // 2. Jika tidak ada ulasan sama sekali, kembalikan array kosong dengan status 200 OK
        // Ini agar frontend tidak memicu error catch() dan halaman tetap tampil rapi
        if (reviewsSnapshot.empty) {
            return res.status(200).json([]);
        }

        const productReviews = [];

        // 3. Looping semua dokumen review yang ditemukan
        reviewsSnapshot.forEach(doc => {
            productReviews.push(doc.data());
        });

        // 4. Kirimkan seluruh daftar ulasan produk ke frontend
        return res.status(200).json(productReviews);

    } catch (err) {
        console.error("Backend Error Fetching Product Reviews:", err);
        return res.status(500).json({ message: "Gagal mengambil ulasan produk" });
    }
});

export default router;