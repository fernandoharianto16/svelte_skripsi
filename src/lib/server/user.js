import admin from 'firebase-admin';
import { db } from './firebaseAdmin.js';
import { Router } from 'express';

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

router.get('/', async (req, res) => {
    try {
        /**
         * @type {{ id: string; data: admin.firestore.DocumentData; }[]}
         */
        let users = [];
        const usersRef = db.collection('users');
        const queryResult = await usersRef.get();
        if (queryResult.empty) {
            console.log('Tidak ada dokumen yang ditemukan dalam koleksi "users".');
            return res.status(200).json({ data: [] });
        }

        users = queryResult.docs.map(doc => ({
            id: doc.id,
            data: doc.data()
        }));

        res.status(200).json({ data: users });
    } catch (error) {
        console.error('Gagal mengambil data:', error);
        res.status(500).send('Terjadi kesalahan saat mengambil data');
    }
});




router.post('/', async (req, res) => {
    try {

        const { emailInput, passwordInput, roleSelected } = req.body;
        console.log(req.body);
        if (!emailInput || !passwordInput) {
            return res.status(400).send('Email dan Password harus disertakan');
        }
        const username = emailInput.split('@')[0];
        const newUser = {
            email: emailInput,
            nama: username,
            role: roleSelected,
            password: passwordInput,
            poin: 0,
            status: true,
        };

        const usersRef = db.collection('users');
        const result = await usersRef.add(newUser);

        res.status(201).json({ id: result.id, data: newUser });
    } catch (error) {
        console.error('Gagal menambahkan data:', error);
        res.status(500).send('Terjadi kesalahan saat menambahkan data');
    }
});


export default router;