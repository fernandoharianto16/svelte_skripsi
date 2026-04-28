import admin from 'firebase-admin';
import { db } from './firebaseAdmin.js';

import { Router } from "express";
import upload from "./multer.js";
import multer from 'multer';
const router = Router();

import { verifyToken } from "./middleware/auth.js";

router.get('/', verifyToken, async (req, res) => {
    try {
        const sellerId = req.user.uid;
        console.log(sellerId);

        const productsRef = admin.firestore().collection('products');

        const snapshot = await productsRef
            .where('seller_id', '==', sellerId)
            .where('status', '==', 'active')
            .orderBy('created_at', 'desc')
            .get();

        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(products);

        res.json({
            data: products,
            total: products.length
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});


/**
 * POST /api/products
 * create product
 */
router.post("/", verifyToken, upload.single("image"), async (req, res) => {
    console.log("masuk ke backend add");

    try {
        console.log("BODY:", req.body);
        console.log("FILE:", req.file);

        const { product_name, price, description, category } = req.body;

        // 🔥 ambil dari token
        const seller_id = req.user.uid;

        const image = req.file ? req.file.filename : null;

        const newProduct = {
            product_name,
            price: Number(price),
            category,
            description,
            image,
            seller_id,
            sold_count: 0,
            status: "active",
            created_at: new Date(),
            updated_at: new Date(),
        };

        const productsRef = db.collection("products");
        const result = await productsRef.add(newProduct);

        console.log("Product received:", newProduct);

        res.status(201).json({
            message: "Product created",
            id: result.id, // 🔥 tambahkan ini
            data: newProduct,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Server error",
        });
    }
}
);

router.put("/:id", verifyToken, upload.single("image"), async (req, res) => {
    try {
        const { id } = req.params;
        const { product_name, price, description, category } = req.body;

        const productsRef = db.collection("products").doc(id);
        const doc = await productsRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: "Product not found" });
        }

        const oldData = doc.data();
        if (oldData.seller_id !== req.user.uid) {
            return res.status(403).json({
                message: "Forbidden: not your product"
            });
        }
        // kalau ada file baru → pakai
        // kalau tidak → tetap pakai yang lama
        let image = oldData.image;

        if (req.file) {
            image = req.file.filename;
        }

        const updatedProduct = {
            product_name,
            price,
            description,
            category,
            image,
            updatedAt: new Date(),
        };

        await productsRef.update(updatedProduct);

        res.status(200).json({
            message: "Product updated",
            data: updatedProduct,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Server error",
        });
    }
});

router.delete("/:id", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.uid;
        console.log(id);
        console.log(userId);

        const productRef = db.collection("products").doc(id);
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
    console.log("Error middleware hit:", err); // DEBUG
    if (err instanceof multer.MulterError) {
        console.log("MulterError code:", err.code); // DEBUG
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ message: "Ukuran file terlalu besar, maksimal 1 MB" });
        }
        return res.status(400).json({ message: err.message });
    }
    next(err);
});

export default router;