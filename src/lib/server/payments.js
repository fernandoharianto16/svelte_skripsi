import admin from 'firebase-admin';
import { db } from './firebaseAdmin.js';
import { Router } from "express";
import upload from "./multer.js";
import multer from 'multer';
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import 'dotenv/config';
import { uploadToCloudinary } from './service/uploadImageService.js';
import { createSnapToken } from './midtrans.js';


const router = Router();

import { verifyToken } from "./middleware/auth.js";

router.post('/:orderId', verifyToken, async (req, res) => {
    try {
        const { orderId } = req.params;
        const buyerId = req.user.uid;

        // 1. Ambil data order
        const orderRef = admin.firestore().collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();
        if (!orderDoc.exists) return res.status(404).json({ message: "Pesanan tidak ditemukan" });

        const orderData = orderDoc.data();
        if (orderData.buyer_id !== buyerId) return res.status(403).json({ message: "Akses ditolak" });

        // --- PENYESUAIAN: Cek apakah sudah ada pembayaran PENDING untuk order ini ---
        const existingPaymentQuery = await admin.firestore().collection('payments')
            .where('order_id', '==', orderId)
            .where('payment_status', '==', 'pending')
            .limit(1)
            .get();

        if (!existingPaymentQuery.empty) {
            // Jika ada, kirimkan token yang lama (Resume Payment)
            const existingPayment = existingPaymentQuery.docs[0].data();
            return res.json({ token: existingPayment.transaction_token });
        }
        // --------------------------------------------------------------------------
        const uniqueOrderId = `${orderId}-${Date.now()}`;
        // 2. Jika tidak ada yang PENDING, baru buat transaksi baru
        const token = await createSnapToken({
            id: uniqueOrderId,
            total: orderData.total_price,
            name: orderData.buyer_name,
            email: orderData.buyer_email
        });

        // 3. Simpan ke collection PAYMENT
        const paymentRef = admin.firestore().collection('payments').doc();
        await paymentRef.set({
            payment_id: paymentRef.id,
            order_id: orderId,
            midtrans_order_id: uniqueOrderId,
            custom_request_id: orderData.custom_request_id || null,
            payment_method: null,
            payment_status: 'pending',
            payment_date: admin.firestore.FieldValue.serverTimestamp(),
            transaction_token: token
        });

        // 4. Update order
        await orderRef.update({
            payment_id: paymentRef.id,
            snap_token: token
        });

        res.json({ token });
    } catch (error) {
        console.error("Gagal:", error);
        res.status(500).json({ message: "Server error" });
    }
});

router.post('/update/:orderId', async (req, res) => {
    const { orderId } = req.params;
    const { status, payment_type } = req.body;

    try {
        const db = admin.firestore();

        // 1. Update koleksi 'orders'
        await db.collection('orders').doc(orderId).update({
            payment_status: "paid",
            order_status:"processing"
        });

        // 2. Update koleksi 'PAYMENT'
        // Kita cari dokumen pembayaran yang memiliki order_id tersebut
        const paymentSnap = await db.collection('payments')
            .where('order_id', '==', orderId)
            .limit(1).get();

        if (!paymentSnap.empty) {
            const paymentDocId = paymentSnap.docs[0].id;
            await db.collection('payments').doc(paymentDocId).update({
                payment_status: "paid",
                payment_method: 'transfer'
            });
        }

        res.status(200).json({ message: "Status berhasil diupdate di Firestore" });
    } catch (error) {
        console.error("Error updating status:", error);
        res.status(500).json({ message: "Gagal update status" });
    }
});



router.post('/webhook', verifyToken, async (req, res) => {
    try {
        const notification = req.body;

        // 1. Verifikasi notifikasi dari Midtrans
        const statusResponse = await apiClient.transaction.notification(notification);

        const orderId = statusResponse.order_id;
        const transactionStatus = statusResponse.transaction_status;
        const fraudStatus = statusResponse.fraud_status;

        // 2. Logika Update Database
        const paymentRef = admin.firestore().collection('PAYMENT');
        const query = await paymentRef.where('midtrans_order_id', '==', orderId).limit(1).get();

        if (query.empty) return res.status(404).send('Payment not found');

        const paymentDoc = query.docs[0];
        const docId = paymentDoc.id;

        // 3. Update berdasarkan status dari Midtrans
        if (transactionStatus === 'settlement') {
            await paymentRef.doc(docId).update({
                payment_status: 'paid',
                payment_method: statusResponse.payment_type
            });
            await admin.firestore().collection('orders').doc(paymentDoc.data().order_id).update({
                payment_status: 'paid'
            });
        } else if (['expire', 'cancel', 'deny'].includes(transactionStatus)) {
            await paymentRef.doc(docId).update({ payment_status: 'failed' });
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/custom/:requestId', verifyToken, async (req, res) => {
    try {
        const { requestId } = req.params;
        const buyerId = req.user.uid;

        // 1. Ambil data custom request
        const requestRef = admin.firestore().collection('custom_requests').doc(requestId);
        const requestDoc = await requestRef.get();
        if (!requestDoc.exists) return res.status(404).json({ message: "Permintaan kustom tidak ditemukan" });

        const requestData = requestDoc.data();
        
        // Proteksi: Pastikan yang bayar adalah buyer yang mengajukan kustomisasi tersebut
        if (requestData.buyer_id !== buyerId) return res.status(403).json({ message: "Akses ditolak" });
        
        // Tambahan Validasi: Pastikan status penawaran sudah disetujui (accepted) oleh penjual
        if (requestData.request_status !== 'accepted') {
            return res.status(400).json({ message: "Permintaan kustom belum disetujui penjual" });
        }

        // 2. Cek apakah sudah ada pembayaran PENDING untuk custom request ini (Resume Payment)
        const existingPaymentQuery = await admin.firestore().collection('payments')
            .where('custom_request_id', '==', requestId)
            .where('payment_status', '==', 'pending')
            .limit(1)
            .get();

        if (!existingPaymentQuery.empty) {
            // Jika ada, kirimkan token yang lama agar tidak membuat invoice ganda di Midtrans
            const existingPayment = existingPaymentQuery.docs[0].data();
            return res.json({ token: existingPayment.transaction_token });
        }

        // 3. Ambil data nama & email buyer dari koleksi users untuk payload Midtrans
        const userDoc = await admin.firestore().collection('users').doc(buyerId).get();
        const userData = userDoc.data();

        const uniqueOrderId = `CUSTOM-${requestId}-${Date.now()}`;
        
        // 4. Buat transaksi baru menggunakan fungsi bawaan Anda
        const token = await createSnapToken({
            id: uniqueOrderId,
            total: requestData.negotiated_price, // Menggunakan harga kesepakatan kustom
            name: userData?.name || "Pembeli Custom",
            email: req.user.email || userData?.email || ""
        });

        // 5. Simpan log transaksi ke koleksi 'payments'
        const paymentRef = admin.firestore().collection('payments').doc();
        await paymentRef.set({
            payment_id: paymentRef.id,
            order_id: null, // Kosong karena ini transaksi kustom direct, bukan dari keranjang reguler
            midtrans_order_id: uniqueOrderId,
            custom_request_id: requestId, // Menyimpan ID custom request
            payment_method: null,
            payment_status: 'pending',
            payment_date: admin.firestore.FieldValue.serverTimestamp(),
            transaction_token: token
        });

        // 6. Update dokumen 'custom_requests' pembeli
        await requestRef.update({
            payment_id: paymentRef.id,
            snap_token: token,
            payment_status: 'pending' // Sinkron dengan status pembayaran di tabel Svelte
        });

        res.json({ token });
    } catch (error) {
        console.error("Gagal memproses pembayaran custom:", error);
        res.status(500).json({ message: "Server error" });
    }
});

router.post('/custom/update/:requestId', async (req, res) => {
    const { requestId } = req.params;

    try {
        const db = admin.firestore();

        // 1. Update koleksi 'custom_requests'
        await db.collection('custom_requests').doc(requestId).update({
            payment_status: "paid",
            request_status: "paid" // atau "processing" agar penjual tahu ini siap diproduksi
        });

        // 2. Update koleksi 'payments'
        const paymentSnap = await db.collection('payments')
            .where('custom_request_id', '==', requestId)
            .limit(1).get();

        if (!paymentSnap.empty) {
            const paymentDocId = paymentSnap.docs[0].id;
            await db.collection('payments').doc(paymentDocId).update({
                payment_status: "paid",
                payment_method: 'transfer'
            });
        }

        res.status(200).json({ message: "Status custom request berhasil diupdate di Firestore" });
    } catch (error) {
        console.error("Error updating custom status:", error);
        res.status(500).json({ message: "Gagal update status" });
    }
});


export default router;