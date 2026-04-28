// routes/public/products.js
import admin from 'firebase-admin';
// import { db } from './firebaseAdmin.js';
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

export default router;