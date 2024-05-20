// lib/server/server.js
import express from 'express';
import { handler } from '../../../build/handler.js';
import cors from "cors";

const app = express();

// Middleware untuk mengizinkan CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // Atur origin ke '*' untuk mengizinkan akses dari semua sumber
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE'); // Atur metode yang diizinkan
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Atur header yang diizinkan
  next();
});

app.use(cors());

// Middleware untuk parsing JSON dan urlencoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Tambahkan endpoint API kustom di sini
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from Express!aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' });
});

// SvelteKit handler
app.use(handler); // Menyerahkan kontrol ke SvelteKit untuk rute yang tidak ditangani

// Jalankan server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

export default app;