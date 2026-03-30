import admin from 'firebase-admin';
import { db } from './firebaseAdmin.js';

import { Router } from "express";
import upload from "./multer.js";
import multer from 'multer';
const router = Router();

import { verifyToken } from "./middleware/auth.js";



// router.get('/seller/products', verifyToken, async (req, res) => {
// 	try {
// 		const page = parseInt(req.query.page) || 1;
// 		const limit = parseInt(req.query.limit) || 10;
// 		const skip = (page - 1) * limit;

// 		const sellerId = req.user.uid; // dari Firebase

// 		const products = await Product.find({ seller: sellerId })
// 			.skip(skip)
// 			.limit(limit)
// 			.sort({ createdAt: -1 });

// 		const total = await Product.countDocuments({ seller: sellerId });

// 		res.json({
// 			data: products,
// 			pagination: {
// 				page,
// 				limit,
// 				total,
// 				totalPages: Math.ceil(total / limit)
// 			}
// 		});
// 	} catch (err) {
// 		res.status(500).json({ message: 'Server error' });
// 	}
// });

// GET /api/products/seller/products?page=1&limit=10
// router.get('/', verifyToken, async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;

//     const sellerId = req.user.uid;

//     const productsRef = admin.firestore().collection('products');

//     // pagination Firestore: startAt / startAfter but sederhana pakai offset skip
//     const snapshot = await productsRef
//       .where('seller', '==', sellerId)
//       .orderBy('createdAt', 'desc')
//       .offset((page - 1) * limit)
//       .limit(limit)
//       .get();

//     const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

//     // total produk seller
//     const totalSnapshot = await productsRef.where('seller', '==', sellerId).get();
//     const total = totalSnapshot.size;

//     res.json({
//       data: products,
//       pagination: {
//         page,
//         limit,
//         total,
//         totalPages: Math.ceil(total / limit)
//       }
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

router.get('/', verifyToken, async (req, res) => {
    try {
        const sellerId = req.user.uid;
        console.log(sellerId);

        const productsRef = admin.firestore().collection('products');

        // Hapus sementara orderBy untuk menghindari error index
        const snapshot = await productsRef
            .where('seller_id', '==', sellerId)
            .orderBy('createdAt', 'desc')
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
router.post("/", upload.single("image"), async (req, res) => {

    console.log("masuk ke backend add");
    try {
        console.log("BODY:", req.body);
        console.log("FILE:", req.file);
        const { product_name, price, description } = req.body;
        const image = req.file ? req.file.filename : null;
        // Status isinya active atau archived atau deleted
        const newProduct = {
            product_name,
            price: Number(price),
            description,
            image,
            soldCount: 0,
            status: "active",
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const productsRef = db.collection('products');
        const result = await productsRef.add(newProduct);
        console.log("Product received:", newProduct);
        res.status(201).json({
            message: "Product created",
            // id : result.id,
            data: newProduct
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Server error"
        });
    }
});

router.put("/:id", upload.single("image"), async (req, res) => {
    try {
        const { id } = req.params;
        const { product_name, price, description } = req.body;

        const productsRef = db.collection("product").doc(id);
        const doc = await productsRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: "Product not found" });
        }

        const oldData = doc.data();

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