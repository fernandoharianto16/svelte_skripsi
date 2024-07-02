// lib/server/server.js
import express from 'express';
import { handler } from '../../../build/handler.js';
import cors from "cors";
import admin from 'firebase-admin';

import { readFileSync } from 'fs';
import { resolve } from 'path';

// App menggunakan Express
const app = express();

// Middleware untuk mengizinkan CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // Atur origin ke '*' untuk mengizinkan akses dari semua sumber
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE'); // Atur metode yang diizinkan
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Atur header yang diizinkan
  next();
});

// App menggunakan setting CORS
app.use(cors());

// Middleware untuk parsing JSON dan urlencoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// const serviceAccount = require('../../../serviceAccountKey.json');
import serviceAccount from '../../../serviceAccountKey.cjs';

// const serviceAccount = JSON.parse(readFileSync(resolve(__dirname, '../../../serviceAccountKey.json'), 'utf8'));


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Tambahkan endpoint API kustom di sini
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from Express!aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' });
});


// Endpoint untuk mendapatkan data dari koleksi "users"
app.get('/api/getUsers', async (req, res) => {
  try {
    /**
     * @type {{ id: string; data: admin.firestore.DocumentData; }[]}
     */
    let users = [];
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();
    if (snapshot.empty) {
      console.log('Tidak ada dokumen yang ditemukan dalam koleksi "users".');
      return res.status(404).send('Data tidak ditemukan');
    }

    snapshot.forEach(doc => {
      users.push({
        id: doc.id,
        data: doc.data()
      });
    });

    res.status(200).json({data:users});
  } catch (error) {
    console.error('Gagal mengambil data:', error);
    res.status(500).send('Terjadi kesalahan saat mengambil data');
  }
});


app.post('/api/addUsers', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).send('Name dan email harus disertakan');
    }
    const username = email.split('@')[0];
    const newUser = {
      email: email,
      nama: username,
      password:"123",
      poin:0,
      status:true,
    };

    const usersRef = db.collection('users');
    const result = await usersRef.add(newUser);

    res.status(201).json({ id: result.id, data: newUser });
  } catch (error) {
    console.error('Gagal menambahkan data:', error);
    res.status(500).send('Terjadi kesalahan saat menambahkan data');
  }
});


// SvelteKit handler
app.use(handler); // Menyerahkan kontrol ke SvelteKit untuk rute yang tidak ditangani

// Jalankan server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

export default app;