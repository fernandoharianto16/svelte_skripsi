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
        const sellerId = req.user.uid;
        // console.log(sellerId);

        const ordersRef = admin.firestore().collection('orders');

        const snapshot = await ordersRef
            .where('seller_id', '==', sellerId)
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
        if (orderData.seller_id !== req.user.uid) return res.status(403).json({ message: "Akses ditolak" });

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
        const { status, paymentStatus } = req.body; // Status baru (misal: 'processing', 'shipped', 'cancelled')
        const sellerId = req.user.uid; // Pastikan user yang login adalah penjual yang sah
        // 1. Referensi ke dokumen order
        const orderRef = db.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();
        // 2. Cek apakah pesanan ada
        if (!orderDoc.exists) {
            return res.status(404).json({ message: "Pesanan tidak ditemukan" });
        }
        // 3. Keamanan: Pastikan hanya penjual pemilik pesanan yang bisa mengubah status
        if (orderDoc.data().seller_id !== sellerId) {
            return res.status(403).json({ message: "Anda tidak memiliki akses ke pesanan ini" });
        }
        // 4. Update status di Firestore
        await orderRef.update({
            order_status: status,
            payment_status:paymentStatus,
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

router.post("/ship/:orderId", verifyToken, upload.single("image"), async (req, res) => {
    try {
        const { orderId } = req.params;
        let imageUrl = null;

        if (req.file) {
            // Upload ke Cloudinary dengan folder 'shipment_proofs'
            imageUrl = await uploadToCloudinary(req.file.buffer, "shipment_proofs");
        } else {
            return res.status(400).json({ message: "Bukti gambar wajib diunggah" });
        }

        // Update Firestore
        await db.collection("orders").doc(orderId).update({
            order_status: "shipped",
            shipment_proof: imageUrl, // Menyimpan URL Cloudinary
            shipped_at: new Date().toISOString()
        });

        res.status(200).json({ 
            message: "Bukti pengiriman berhasil diunggah",
            shipment_proof: imageUrl 
        });

    } catch (error) {
        console.error("Gagal mengunggah bukti pengiriman:", error);
        res.status(500).json({ 
            message: "Server error", 
            error: error.message 
        });
    }
});

router.put("/:id", verifyToken, upload.single("image"), async (req, res) => {
    try {
        const { id } = req.params;
        const { product_name, price, description, category } = req.body;

        const ordersRef = db.collection("orders").doc(id);
        const doc = await ordersRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: "Product not found" });
        }

        const oldData = doc.data();
        if (oldData.seller_id !== req.user.uid) {
            return res.status(403).json({
                message: "Forbidden: not your product"
            });
        }

        // Jika ada file baru, upload ke Cloudinary dan ambil URL-nya
        let image = oldData.image;
        if (req.file) {
            image = await uploadToCloudinary(req.file.buffer, "orders_images");
        }

        const updatedProduct = {
            product_name,
            price: Number(price),
            description,
            category,
            image,
            updatedAt: new Date(),
        };

        await ordersRef.update(updatedProduct);

        res.status(200).json({
            message: "Product updated",
            data: updatedProduct,
        });

    } catch (error) {
        console.error("Gagal update produk:", error);
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
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

router.get('/review/:id', verifyToken, async (req, res) => {
    try {
    const orderId = req.params.id;
    const sellerUid = req.user.uid; // ID Penjual yang sedang login

    // 1. Validasi Keamanan: Cek apakah order ini benar milik Seller yang login
    // Kita cek dulu ke collection 'orders' (atau 'requests')
    const orderDoc = await db.collection('orders').doc(orderId).get();

    if (!orderDoc.exists) {
        return res.status(404).json({ message: "Pesanan tidak ditemukan" });
    }

    const orderData = orderDoc.data();

    // Pastikan seller_id di order tersebut cocok dengan UID seller yang sedang login
    if (orderData.seller_id !== sellerUid) {
        return res.status(403).json({ message: "Akses ditolak. Ini bukan pesanan toko Anda." });
    }

    // 2. Jika aman, baru ambil SEMUA dokumen dari collection 'reviews' berdasarkan order_id
    const reviewsSnapshot = await db.collection('reviews')
        .where('order_id', '==', orderId)
        .get();

    // Jika tidak ada review sama sekali untuk order_id ini
    if (reviewsSnapshot.empty) {
        return res.status(200).json([]); 
    }

    const allReviews = [];

    // 3. Ambil semua data review (tidak perlu validasi buyer_id lagi karena order sudah tervalidasi)
    reviewsSnapshot.forEach(doc => {
        allReviews.push(doc.data());
    });

    // 4. Kembalikan ARRAY yang berisi seluruh review produk untuk seller
    return res.status(200).json(allReviews);

} catch (err) {
    console.error("Backend Error (Seller Review):", err);
    return res.status(500).json({ message: "Gagal mengambil data review" });
}
});

export default router;