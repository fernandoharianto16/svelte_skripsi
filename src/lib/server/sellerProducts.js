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

        const productsRef = admin.firestore().collection('products');

        const snapshot = await productsRef
            .where('seller_id', '==', sellerId)
            .where('status', '==', 'active')
            .orderBy('created_at', 'desc')
            .get();

        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // console.log(products);

        res.json({
            data: products,
            total: products.length
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


/**
 * POST /api/products
 * create product
 */


// router.post("/", verifyToken, upload.single("image"), async (req, res) => {
//     try {
//         const { product_name, price, description, category } = req.body;
//         const seller_id = req.user.uid;
//         let imageUrl = null;
//         if (req.file) {
//             imageUrl = await uploadToCloudinary(req.file.buffer, "products_images");
//         }

//         const newProduct = {
//             product_name,
//             price: Number(price),
//             category,
//             description,
//             image: imageUrl, // Menyimpan URL Cloudinary, bukan nama file lokal
//             seller_id,
//             sold_count: 0,
//             status: "active",
//             created_at: new Date().toISOString(),
//             updated_at: new Date().toISOString(),
//         };

//         const result = await db.collection("products").add(newProduct);

//         res.status(201).json({
//             message: "Product created",
//             id: result.id,
//             data: newProduct,
//         });

//     } catch (error) {
//         console.error("Gagal menambah produk:", error);
//         res.status(500).json({
//             message: "Server error",
//             error: error.message
//         });
//     }
// });

// router.post("/", verifyToken, upload.single("image"), async (req, res) => {
//     try {
//         // 1. Ambil field baru dari req.body
//         const { product_name, price, description, category, is_customable, list_variasi } = req.body;
//         const seller_id = req.user.uid;
        
//         let imageUrl = null;
//         if (req.file) {
//             imageUrl = await uploadToCloudinary(req.file.buffer, "products_images");
//         }

//         // 🌟 2. PROSES KONVERSI DATA BARU
//         // Konversi string "true"/"false" menjadi boolean asli
//         const customableStatus = is_customable === 'true'; 

//         // Parse string JSON list_variasi kembali menjadi Array/Object JavaScript
//         let parsedVariasi = [];
//         if (list_variasi) {
//             try {
//                 parsedVariasi = JSON.parse(list_variasi);
//             } catch (e) {
//                 parsedVariasi = [];
//             }
//         }

//         // Tempat menampung hasil konversi objek dinamis
//         let variantsData = {}; 

//         if (list_variasi) {
//             try {
//                 const parsedVariasi = JSON.parse(list_variasi);
                
//                 // Loop array dari frontend dan ubah menjadi Key-Value secara otomatis
//                 parsedVariasi.forEach(item => {
//                     // Validasi agar nama varian tidak kosong
//                     if (item.nama && item.nama.trim() !== "") {
//                         // Mengubah input nama varian menjadi huruf kecil dan membuang spasi tak berguna
//                         // Misal: "Ukuran Produk " -> "ukuran produk"
//                         const key = item.nama.trim().toLowerCase();
                        
//                         // Set nama varian tersebut sebagai KEY, dan isinya adalah ARRAY opsi
//                         variantsData[key] = item.opsi || [];
//                     }
//                 });
//             } catch (e) {
//                 variantsData = {};
//             }
//         }

//         // 3. Susun objek produk baru dengan field tambahan
//         const newProduct = {
//             product_name,
//             price: Number(price),
//             category,
//             description,
//             image: imageUrl, 
//             seller_id,
//             sold_count: 0,
//             status: "active",
//             is_customable: customableStatus,
            
//             // HAPUS: list_variasi: parsedVariasi
//             // GANTI DENGAN INI:
//             variants: variantsData, 
            
//             created_at: new Date().toISOString(),
//             updated_at: new Date().toISOString(),
//         };

//         const result = await db.collection("products").add(newProduct);

//         res.status(201).json({
//             message: "Product created",
//             id: result.id,
//             data: newProduct,
//         });

//     } catch (error) {
//         console.error("Gagal menambah produk:", error);
//         res.status(500).json({
//             message: "Server error",
//             error: error.message
//         });
//     }
// });

router.post("/", verifyToken, upload.single("image"), async (req, res) => {
    try {
        // 1. Ambil field baru dari req.body
        const { product_name, price, description, category, is_customable, list_variasi } = req.body;
        const seller_id = req.user.uid;
        
        // 🔍 AMBIL NAMA SELLER DARI COLLECTION USERS
        let seller_name = "Unknown Seller"; // Nilai default jika data tidak ditemukan
        
        // Menggunakan query where karena dokumen diidentifikasi dengan field 'uid' di dalamnya
        const userSnapshot = await db.collection("users").where("uid", "==", seller_id).get();
        
        if (!userSnapshot.empty) {
            // Mengambil dokumen pertama yang cocok
            const userData = userSnapshot.docs[0].data();
            seller_name = userData.nama || "Unknown Seller"; // 'nama' sesuai gambar struktur data kamu
        } else {
            // Opsional: Jika proteksi ketat, batalkan simpan produk jika user tidak terdaftar
            return res.status(404).json({ message: "Seller tidak ditemukan di sistem" });
        }
        
        let imageUrl = null;
        if (req.file) {
            imageUrl = await uploadToCloudinary(req.file.buffer, "products_images");
        }

        // 🌟 2. PROSES KONVERSI DATA BARU
        const customableStatus = is_customable === 'true'; 

        let variantsData = {}; 
        if (list_variasi) {
            try {
                const parsedVariasi = JSON.parse(list_variasi);
                parsedVariasi.forEach(item => {
                    if (item.nama && item.nama.trim() !== "") {
                        const key = item.nama.trim().toLowerCase();
                        variantsData[key] = item.opsi || [];
                    }
                });
            } catch (e) {
                variantsData = {};
            }
        }

        // 3. Susun objek produk baru dengan field tambahan
        const newProduct = {
            product_name,
            price: Number(price),
            category,
            description,
            image: imageUrl, 
            seller_id,
            seller_name, // 🌟 FIELD BARU YANG DISIMPAN
            sold_count: 0,
            status: "active",
            is_customable: customableStatus,
            variants: variantsData, 
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        const result = await db.collection("products").add(newProduct);

        res.status(201).json({
            message: "Product created",
            id: result.id,
            data: newProduct,
        });

    } catch (error) {
        console.error("Gagal menambah produk:", error);
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

        // Jika ada file baru, upload ke Cloudinary dan ambil URL-nya
        let image = oldData.image;
        if (req.file) {
            image = await uploadToCloudinary(req.file.buffer, "products_images");
        }

        const updatedProduct = {
            product_name,
            price: Number(price),
            description,
            category,
            image,
            updated_at: new Date().toISOString(),
        };

        await productsRef.update(updatedProduct);

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