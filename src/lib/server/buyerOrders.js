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

router.get('/', verifyToken, async (req, res) => {
    try {
        const BuyerId = req.user.uid;

        const ordersRef = admin.firestore().collection('orders');
        // console.log("Mencari di koleksi:", ordersRef.path);
        const snapshot = await ordersRef
            .where('buyer_id', '==', BuyerId)
            .orderBy('created_at', 'desc')
            .get();

        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // console.log(orders);

        res.json({
            data: orders,
            total: orders.length
        });
    } catch (error) {
        console.error("--- DEBUG ERROR ---");
        console.error("Pesan Error:", error.message);
        console.error("Stack Trace:", error.stack);

        res.status(500).json({
            message: "Server error",
            error: error.message, // Ini akan muncul di network tab browser
            details: "Cek terminal VS Code untuk detail lengkap"
        });
    }
});

router.get('/:id', verifyToken, async (req, res) => {
    try {
        const orderDoc = await db.collection('orders').doc(req.params.id).get();
        if (!orderDoc.exists) return res.status(404).json({ message: "Pesanan tidak ditemukan" });

        const orderData = orderDoc.data();
        if (orderData.buyer_id !== req.user.uid) return res.status(403).json({ message: "Akses ditolak" });

        const detailsSnapshot = await db.collection('order_details').where('order_id', '==', req.params.id).get();
        const orderDetails = [];
        detailsSnapshot.forEach(doc => orderDetails.push(doc.data()));

        return res.status(200).json({ order: orderData, details: orderDetails });
    } catch (err) {
        return res.status(500).json({ message: "Gagal mengambil data" });
    }
});


router.patch('/:orderId/status', verifyToken, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body; // Status baru (misal: 'processing', 'shipped', 'cancelled')
        const BuyerId = req.user.uid; // Pastikan user yang login adalah penjual yang sah
        // 1. Referensi ke dokumen order
        const orderRef = db.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();
        // 2. Cek apakah pesanan ada
        if (!orderDoc.exists) {
            return res.status(404).json({ message: "Pesanan tidak ditemukan" });
        }
        // 3. Keamanan: Pastikan hanya penjual pemilik pesanan yang bisa mengubah status
        if (orderDoc.data().buyer_id !== BuyerId) {
            return res.status(403).json({ message: "Anda tidak memiliki akses ke pesanan ini" });
        }
        // 4. Update status di Firestore
        await orderRef.update({
            order_status: status,
            updated_at: new Date().toISOString()
        });
        res.status(200).json({
            message: "Status pesanan berhasil diperbarui",
            new_status: status
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// create order by cart
router.post('/', verifyToken, async (req, res) => {
    const userId = req.user.uid;
    const { items } = req.body; // Menerima array items dari SvelteKit ($cart)

    // 1. Validasi awal jika data array kosong
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Keranjang belanja kosong atau tidak valid" });
    }

    try {
        // Ambil daftar ID produk dari keranjang
        const productIds = items.map(item => item.id);
        
        // Ambil data produk asli dari database Firestore demi keamanan harga
        const productsSnapshot = await db.collection('products')
            .where('__name__', 'in', productIds)
            .get();

        if (productsSnapshot.empty) {
            return res.status(404).json({ message: "Produk di dalam keranjang tidak ditemukan di database" });
        }

        // Petakan produk dari DB ke dalam objek agar mudah diakses
        const dbProducts = {};
        productsSnapshot.forEach(doc => {
            dbProducts[doc.id] = { id: doc.id, ...doc.data() };
        });

        // 2. Ambil SELLER_ID dari produk pertama (Karena asumsinya semua produk milik seller yang sama)
        const firstProductId = productIds[0];
        const sellerId = dbProducts[firstProductId]?.seller_id;

        if (!sellerId) {
            return res.status(400).json({ message: "Data penjual produk tidak ditemukan atau tidak valid" });
        }

        // 3. Hitung TOTAL HARGA secara keseluruhan dari database asli
        let totalOrderPrice = 0;
        const processedItems = [];

        for (const item of items) {
            const freshProductData = dbProducts[item.id];
            if (!freshProductData) continue;

            const subtotal = freshProductData.price * item.quantity;
            totalOrderPrice += subtotal;

            // Simpan data bersih untuk kebutuhan detail transaksi nanti
            processedItems.push({
                productId: freshProductData.id,
                product_name: freshProductData.product_name,
                price: freshProductData.price,
                quantity: item.quantity
            });
        }

        // 4. PROSES SIMPAN KE FIRESTORE (Hanya menghasilkan 1 Dokumen Order Utama)
        const batch = db.batch();
        const orderRef = db.collection('orders').doc(); // Auto-generate ID dokumen order

        const newOrder = {
            buyer_id: userId,
            seller_id: sellerId, // Langsung dimasukkan ke dokumen utama
            total_price: totalOrderPrice,
            shipment_proof: "",
            shipped_at: "",
            shipping_address: "",
            payment_status: 'pending',
            order_status: 'pending',
            cancel_reason: "",
            payment_id: "",
            transaction_token: "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Masukkan dokumen order utama ke dalam batch
        batch.set(orderRef, newOrder);

        // Masukkan setiap detail barang belanjaan ke koleksi 'order_details'
        processedItems.forEach(p => {
            const orderDetailRef = db.collection('order_details').doc();
            
            batch.set(orderDetailRef, {
                order_id: orderRef.id, // Menghubungkan ke ID order utama di atas
                product_id: p.productId,
                product_name_at_purchase: p.product_name,
                product_price_at_purchase: p.price,
                quantity: p.quantity
            });
        });

        // Eksekusi penulisan ke Firestore secara massal
        await batch.commit();

        // Respon balik sukses ke front-end SvelteKit
        return res.status(201).json({ 
            success: true,
            message: "Pesanan keranjang berhasil diproses", 
            orderId: orderRef.id 
        });

    } catch (err) {
        console.error("Error Backend Checkout Single Seller:", err);
        return res.status(500).json({ message: "Gagal memproses checkout di server" });
    }
});



router.delete("/:id", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.uid;
        // console.log(id);
        // console.log(userId);

        const productRef = db.collection("orders").doc(id);
        const doc = await productRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: "Produk tidak ditemukan" });
        }

        const product = doc.data();

        // 🔥 WAJIB: cek kepemilikan
        if (product.seller_id !== userId) {
            return res.status(403).json({ message: "Tidak punya akses" });
        }

        // optional: cegah double delete
        if (product.status === "deleted") {
            return res.status(400).json({ message: "Produk sudah dihapus" });
        }

        await productRef.update({
            status: "deleted"
        });

        res.json({ message: "Produk berhasil dihapus" });

    } catch (error) {
        res.status(500).json({ message: "Terjadi kesalahan" });
    }
});

// 2️⃣ Error handling Multer
router.use((err, req, res, next) => {
    // console.log("Error middleware hit:", err); // DEBUG
    if (err instanceof multer.MulterError) {
        // console.log("MulterError code:", err.code); // DEBUG
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ message: "Ukuran file terlalu besar, maksimal 1 MB" });
        }
        return res.status(400).json({ message: err.message });
    }
    next(err);
});

export default router;