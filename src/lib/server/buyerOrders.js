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

router.get('/review/:id', verifyToken, async (req, res) => {
    try {
        // 1. Ambil SEMUA dokumen dari collection 'reviews' berdasarkan order_id
        const reviewsSnapshot = await db.collection('reviews')
            .where('order_id', '==', req.params.id)
            .get();

        // Jika tidak ada review sama sekali untuk order_id ini
        if (reviewsSnapshot.empty) {
            return res.status(200).json([]); 
        }

        const allReviews = [];
        let isAuthorized = true;

        // 2. Lakukan looping untuk mengambil semua data dokumen review
        reviewsSnapshot.forEach(doc => {
            const reviewData = doc.data();

            // Validasi keamanan: Pastikan buyer_id di setiap ulasan cocok dengan user yang login
            if (reviewData.buyer_id !== req.user.uid) {
                isAuthorized = false;
            }

            allReviews.push(reviewData);
        });

        // Jika ada salah satu review yang terindikasi milik user lain, tolak aksesnya
        if (!isAuthorized) {
            return res.status(403).json({ message: "Akses ditolak" });
        }

        // 3. Kembalikan ARRAY yang berisi seluruh review produk
        return res.status(200).json(allReviews);

    } catch (err) {
        console.error("Backend Error:", err);
        return res.status(500).json({ message: "Gagal mengambil data review" });
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
        // await orderRef.update({
        //     order_status: status,
        //     updated_at: new Date()
        // });
        if (status === 'completed') {
            // A. Ambil semua item dari koleksi 'order_details' yang memiliki order_id terkait
            const orderDetailsSnapshot = await db.collection('order_details')
                .where('order_id', '==', orderId)
                .get();

            // Gunakan Batch agar proses atomis (aman)
            const batch = db.batch();

            // Antrikan update status pada dokumen order utama
            batch.update(orderRef, {
                order_status: status,
                updated_at: new Date().toISOString()
            });

            // B. Looping setiap dokumen item yang ditemukan di order_details
            orderDetailsSnapshot.forEach((docDetail) => {
                const itemData = docDetail.data();

                // Ambil data product_id dan quantity sesuai gambar database kamu
                const productId = itemData.product_id;
                const quantity = itemData.quantity;

                if (productId && quantity) {
                    const productRef = db.collection('products').doc(productId);

                    // Tambahkan sold_count berdasarkan nilai quantity dokumen ini
                    batch.update(productRef, {
                        sold_count: admin.firestore.FieldValue.increment(quantity)
                    });
                }
            });

            // Ambil data order untuk kalkulasi atau mencocokkan ID penjual
            const orderData = orderDoc.data(); 
            
            const autoIdRef = db.collection('transactions').doc();

            // 2. Gabungkan teks 'TX-' dengan Auto-ID bawaan Firestore tadi
            const transactionId = `TX-${autoIdRef.id}`; // Hasilnya nanti seperti: TX-K3b7FmX9zLqP2wV1rS8t

            // Hitung biaya admin dan pendapatan bersih penjual
            const totalPayment = orderData.total_price; // Ambil dari data order asli
            const adminFee = totalPayment * 0.15; // Misal biaya admin 15%
            const sellerIncome = totalPayment - adminFee;

            // Referensi ke dokumen baru di koleksi 'transactions' dengan ID custom
            const transactionRef = db.collection('transactions').doc(transactionId);

            // Antrikan pembuatan dokumen transaksi ke dalam BATCH
            batch.set(transactionRef, {
                transaction_id: transactionId,
                source_type: "normal_order", // atau sesuaikan dengan jenis ordernya
                source_id: orderId,            // Diisi dengan ID order terkait
                seller_id: orderData.seller_id, // ID Penjual diambil dari data order
                buyer_id: BuyerId,             // ID Pembeli yang sedang login
                total_payment: totalPayment,
                admin_fee: adminFee,
                seller_income: sellerIncome,
                status: "completed",
                created_at: new Date().toISOString()
            });

            // C. Eksekusi seluruh batch sekaligus
            await batch.commit();
        }
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
                image: freshProductData.image,
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
                product_image_at_purchase:p.image,
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

router.post('/reviews', verifyToken, async (req, res) => {
    const userId = req.user.uid;
    const payload = req.body; // Menerima array dari frontend Svelte

    // 1. Validasi awal payload
    if (!payload || !Array.isArray(payload) || payload.length === 0) {
        return res.status(400).json({ message: "Data ulasan tidak valid atau kosong." });
    }

    try {
        const batch = db.batch();
        
        // Ambil order_id dari item pertama untuk memvalidasi kepemilikan order
        const firstReview = payload[0];
        const orderId = firstReview.order_id;

        if (!orderId) {
            return res.status(400).json({ message: "Order ID wajib disertakan." });
        }

        // 2. Validasi Keamanan: Pastikan order ini benar-benar milik buyer yang sedang login
        const orderRef = db.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            return res.status(404).json({ message: "Data pesanan tidak ditemukan." });
        }

        const orderData = orderDoc.data();
        if (orderData.buyer_id !== userId) {
            return res.status(403).json({ message: "Akses ditolak. Ini bukan pesanan Anda." });
        }

        // Cek jika pesanan sudah pernah diulas sebelumnya untuk menghindari double-input
        if (orderData.is_reviewed) {
            return res.status(400).json({ message: "Pesanan ini sudah pernah diulas sebelumnya." });
        }

        // 3. Iterasi setiap ulasan produk di dalam payload dan masukkan ke batch
        payload.forEach(item => {
            const reviewRef = db.collection('reviews').doc(); // Auto-generate ID review
            
            batch.set(reviewRef, {
                order_id: item.order_id,
                product_id: item.product_id,
                buyer_id: userId,
                rating: Number(item.rating), // Pastikan bertipe angka/integer
                comment: item.comment || "", // Jika kosong, beri string kosong
                created_at: new Date().toISOString()
            });
        });

        // 4. Update status dokumen 'orders' utama agar 'is_reviewed' menjadi true
        batch.update(orderRef, {
            is_reviewed: true,
            updated_at: new Date().toISOString()
        });

        // 5. Eksekusi semua penulisan data ke Firestore secara bersamaan
        await batch.commit();

        return res.status(201).json({
            success: true,
            message: "Semua ulasan berhasil disimpan secara permanen."
        });

    } catch (err) {
        console.error("Error saat menyimpan review:", err);
        return res.status(500).json({ message: "Gagal menyimpan ulasan di server." });
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