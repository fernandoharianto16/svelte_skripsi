// routes/public/products.js
import admin from 'firebase-admin';
import { db } from './firebaseAdmin.js';
import { verifyToken } from "./middleware/auth.js";
import { Router } from "express";
const router = Router();

router.get("/", async (req, res) => {
    // ambil semua produk
    try {

        const productsRef = admin.firestore().collection('products');

        const snapshot = await productsRef
            // .where('seller_id', '==', sellerId)
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

router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const doc = await admin.firestore()
            .collection('products')
            .doc(id)
            .get();

        if (!doc.exists) {
            return res.status(404).json({ message: "Product not found" });
        }
        // console.log(doc);

        const product = { id: doc.id, ...doc.data() };

        // optional: hanya tampilkan yang active
        if (product.status !== 'active') {
            return res.status(404).json({ message: "Product not available" });
        }

        res.json({ data: product });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/:id', verifyToken, async (req, res) => {
    const productId = req.params.id;
    const userId = req.user.uid;

    try {
        // 1. Ambil data produk
        const productRef = db.collection('products').doc(productId);
        const productDoc = await productRef.get();

        if (!productDoc.exists) {
            return res.status(404).json({ message: "Produk tidak ditemukan" });
        }

        const productData = productDoc.data();

        // Pastikan productData memiliki seller_id
        const sellerId = productData.seller_id;
        if (!sellerId) {
            return res.status(400).json({ message: "Data penjual produk tidak valid" });
        }

        // 2. Persiapkan data order (termasuk seller_id)
        const newOrder = {
            buyer_id: userId,
            seller_id: sellerId, // <--- Penambahan seller_id di sini
            total_price: productData.price,
            shipment_proof: "",
            shipped_at: "",
            shipping_address:"",
            payment_status: 'pending',
            order_status: 'pending',
            cancel_reason: "",
            payment_id: "",
            transaction_token: "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // 3. Gunakan Firestore Batch
        const batch = db.batch();

        // Buat referensi ID untuk order baru
        const orderRef = db.collection('orders').doc();
        batch.set(orderRef, newOrder);

        // order_details di level koleksi root
        const orderDetailRef = db.collection('order_details').doc();
        batch.set(orderDetailRef, {
            order_id: orderRef.id,
            product_id: productId,
            product_name_at_purchase: productData.product_name,
            product_price_at_purchase: productData.price,
            product_image_at_purchase: productData.image,
            quantity: 1
        });

        const buyerRef = db.collection('users').doc(userId);
        const buyerDoc = await buyerRef.get();

        if (!buyerDoc.exists) {
            return res.status(404).json({ message: "Pengguna tidak ditemukan" });
        }

        const buyerData = buyerDoc.data();

        // const sellerId = product.seller_id; // UID penjual yang akan menerima notifikasi
        const buyerName = buyerData.nama; // Nama pembeli yang memesan produk

        // SINKRONISASI STRUKTUR DATA NOTIFIKASI
        const newNotification = {
            user_id: sellerId, // Penerima notifikasi (Penjual)
            title: "Pesanan Baru Masuk",
            message: `${buyerName} telah memesan produk Anda: "${productData.product_name}". Segera proses pesanan ini.`,
            is_read: false, // Default false karena belum dibaca penjual
            created_at: new Date().toISOString() // Format ISO String murni sesuai standar kamu
        };

        // Simpan ke koleksi notifications di Firestore
        await admin.firestore().collection('notifications').add(newNotification);

        await batch.commit();

        res.status(201).json({ message: "Pesanan berhasil dibuat", orderId: orderRef.id });
    } catch (err) {
        console.error("Error Firestore:", err);
        res.status(500).json({ message: "Gagal memproses pesanan di Firestore" });
    }
});


export default router;