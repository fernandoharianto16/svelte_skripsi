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

// Endpoint untuk mencari pengguna berdasarkan email
router.get('/by-email', async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({
                message: 'Parameter email wajib diisi'
            });
        }

        const queryResult = await db
            .collection('users')
            .where('email', '==', email)
            .limit(1)
            .get();

        if (queryResult.empty) {
            return res.status(404).json({
                message: 'User tidak ditemukan'
            });
        }

        const doc = queryResult.docs[0];

        return res.status(200).json({
            id: doc.id,
            ...doc.data()
        });

    } catch (error) {
        console.error('Error get user by email:', error);
        return res.status(500).json({
            message: 'Internal server error'
        });
    }
});


// router.post('/',verifyToken, async (req, res) => {
//     try {
//         const uid=req.user.uid;
//         const { emailInput, passwordInput, roleSelected } = req.body;
//         const username = emailInput.split('@')[0];
//         const newUser = {
//             email: emailInput,
//             nama: username,
//             role: roleSelected,
//             password: passwordInput,
//             poin: 0,
//             status: true,
//         };
//         await db.collection('users').doc(uid).set(newUser);
//         res.status(201).json({ message:"User Created", data: newUser });
//     } catch (error) {
//         console.error('Gagal menambahkan data:', error);
//         res.status(500).send('Terjadi kesalahan saat menambahkan data');
//     }
// });

router.post('/', verifyToken, async (req, res) => {
    try {
        const uid = req.user.uid; // UID dari token
        const { emailInput, roleSelected } = req.body; // Password sudah ditangani Auth
        
        const newUser = {
            uid: uid,
            email: emailInput,
            nama: emailInput.split('@')[0],
            role: roleSelected || 'customer', // Default role jika kosong
            poin: 0,
            sp_count:0,
            status: true,
            created_at: new Date().toISOString(), // Simpan format waktu standar
            updated_at: new Date().toISOString()
        };

        await db.collection('users').doc(uid).set(newUser);
        
        res.status(201).json({ message: "User created successfully", data: newUser });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/me', verifyToken, async (req, res) => {
  const uid = req.user.uid;

  const docSnap = await db.collection('users').doc(uid).get();

  if (!docSnap.exists) {
    return res.status(404).json({ message: "User tidak ditemukan" });
  }

  res.json(docSnap.data());
});


export default router;