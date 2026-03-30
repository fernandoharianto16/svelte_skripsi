// lib/server/server.js
import express from 'express';
import { handler } from '../../../build/handler.js';
import cors from "cors";

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Route Web API yang ditambahkan atau digunakan
import userRoutes from './user.js';
import sellerProductRoutes from './sellerProducts.js';
import productRoutes from './products.js';

// App menggunakan Express
const app = express();

// Middleware CORS, app menggunakan setting CORS
app.use(cors({
  // origin: '*' → mengizinkan semua domain melakukan request ke server
  origin: '*',

  // methods → daftar HTTP method yang diizinkan untuk request lintas-origin
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'],

  // allowedHeaders → header yang diizinkan dikirim oleh client (misal dari frontend)
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware untuk parsing JSON dan urlencoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mendeclare bahwa express menambahkan route URL dari route API berikut
app.use('/api/users', userRoutes);
app.use('/api/products',productRoutes);
app.use('/api/seller/products', sellerProductRoutes);

// Tambahkan endpoint API kustom di sini
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from Express!aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' });
});

// SvelteKit handler
// @ts-ignore
app.use(handler); // Menyerahkan kontrol ke SvelteKit untuk rute yang tidak ditangani

// Jalankan server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

export default app;