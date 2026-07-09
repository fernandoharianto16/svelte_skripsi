// lib/server/server.js
import express from 'express';
// import { handler } from '../../../build/handler.js';
import cors from "cors";

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Route Web API yang ditambahkan atau digunakan
// import userRoutes from './buyerProducts.js';
import userRoutes from './user.js';
import sellerProductRoutes from './sellerProducts.js';
import sellerOrderRoutes from './sellerOrders.js';
import sellerNegoRoutes from './sellerNegotiation.js';
import sellerCustomRequestRoutes from './sellerCustomRequest.js';

import buyerProductRoutes from './buyerProducts.js';
import buyerOrderRoutes from './buyerOrders.js';
import buyerNegoRoutes from './buyerNegotiation.js';
import buyerCustomRequestRoutes from './buyerCustomRequest.js';

import publicProductRoutes from'./publicProducts.js';

// import chatbotRoutes from './chatbot.js';
import paymentRoutes from './payments.js';
import reportRoutes from './report.js';
import transactionRoutes from './transaction.js';

import adminRoutes from './admin.js';

import initCronJob from './jobs/cronJob.js';
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
app.use('/api/seller/products', sellerProductRoutes);
app.use('/api/seller/orders', sellerOrderRoutes);
app.use('/api/seller/negotiations', sellerNegoRoutes);
app.use('/api/seller/custom_request',sellerCustomRequestRoutes);

app.use('/api/buyer/products', buyerProductRoutes);
app.use('/api/buyer/orders', buyerOrderRoutes);
app.use('/api/buyer/negotiations', buyerNegoRoutes);
app.use('/api/buyer/custom_request',buyerCustomRequestRoutes);

app.use('/api/products',publicProductRoutes);
// app.use('/api/chatbot',chatbotRoutes);
app.use('/api/payments',paymentRoutes);
app.use('/api/reports',reportRoutes);
app.use('/api/transaction',transactionRoutes);

app.use('/api/admin',adminRoutes);

// Tambahkan endpoint API kustom di sini
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from Express!aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' });
});

app.get('/', (req, res) => {
  res.send('API is running');
});

// Jalankan server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  initCronJob();
  console.log('Sistem Cron Job Pembatalan Firestore Aktif.');
});

export default app;