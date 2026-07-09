import express from 'express';
import { db,admin } from './firebaseAdmin.js';
import { verifyToken } from './middleware/auth.js';

const router = express.Router();


router.get('/', verifyToken, async (req, res) => {
    try {
        // 1. Ambil Buyer ID dari token (pastikan menggunakan properti yang tepat, misal: uid atau id)
        const seller_id = req.user.uid || req.user.id; 
        // console.log(buyer_id);

        // 2. Arahkan ke koleksi 'negotiations' (bukan 'orders')
        const negotiationsRef = admin.firestore().collection('negotiations');
        
        // 3. Query menggunakan composite index: buyer_id (Filter) & updated_at (Sorting)
        const snapshot = await negotiationsRef
            .where('seller_id', '==', seller_id) // Mencari berdasarkan id pembeli
            .orderBy('created_at', 'desc')    // Mengurutkan dari yang terbaru diperbarui
            .get();

        // 4. Map hasilnya
        const negotiations = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
        }));

        // 5. Kembalikan response
        res.json({
            data: negotiations,
            total: negotiations.length
        });

    } catch (error) {
        console.error("--- DEBUG ERROR ---");
        console.error("Pesan Error:", error.message);
        console.error("Stack Trace:", error.stack);

        res.status(500).json({
            message: "Server error",
            error: error.message,
            details: "Cek terminal VS Code untuk detail lengkap"
        });
    }
});


/**
 * 2. ENDPOINT: Menerima Tawaran (Penjual)
 * PATCH /api/negotiations/:id/accept
 * Membuka 4 Koleksi Sekaligus via Atomic Transaction
 */
router.patch('/:id/accept', verifyToken, async (req, res) => {
    const { id } = req.params; // ID Negosiasi dari URL

    try {
        await db.runTransaction(async (transaction) => {
            const negoRef = db.collection('negotiations').doc(id);
            const negoDoc = await transaction.get(negoRef);

            if (!negoDoc.exists) {
                res.status(404);
                throw new Error("Data negosiasi tidak ditemukan!");
            }

            const data = negoDoc.data();

            const productsRef = db.collection("products").doc(data.product_id);
            const doc = await productsRef.get();

            // 💡 VALIDASI WAJIB: Cek apakah produknya benar-benar ada di Firestore
            if (!doc.exists) {
            console.error(`[ERROR] Produk dengan ID ${data.product_id} tidak ditemukan!`);
            // Berikan return atau throw error sesuai kebutuhan flow backend-mu
            throw new Error("Produk tidak ditemukan"); 
            }

            // Ekstrak data asli dari dalam dokumen Firestore
            const productData = doc.data();

            // 1. Generate ID Baru untuk Dokumen Order dan Payment secara instan
            const orderRef = db.collection('orders').doc();
            const detailRef = db.collection('order_details').doc();
            const paymentRef = db.collection('payments').doc();

            const timestampISO = new Date().toISOString();

            // 2. UPDATE KOLEKSI 'negotiations'
            transaction.update(negoRef, {
                status: 'accepted',
                updated_at: timestampISO
            });

            // 3. SET KOLEKSI 'orders' (Lengkap sesuai skema Anda)
            // Nilai awal diset sebagai 'pending'/'unpaid' karena baru dibuat, 
            // Namun struktur field 100% sama dengan yang Anda minta.
            transaction.set(orderRef, {
                buyer_id: data.buyer_id,
                seller_id: data.seller_id,
                order_status: "taken", // Default awal sebelum dibayar pembeli
                payment_id: paymentRef.id,       // Mengaitkan ID Payment yang digenerate di bawah
                payment_status: "pending",        // Default awal
                total_price: Number(data.offered_price), // Nominal deal tawar-menawar
                cancel_reason: "",
                shipping_address: "",
                shipment_proof: "",
                shipped_at: null,
                snap_token: "",                 // Diisi nanti jika pakai Midtrans Snap
                transaction_token: "",
                created_at: timestampISO,
                updated_at: timestampISO
            });

            // 4. SET KOLEKSI 'order_details' (Dengan 3 field tambahan _at_purchase)
            transaction.set(detailRef, {
                order_id: orderRef.id,
                negotiation_id: negoDoc.id, 
                product_id: data.product_id,
                product_name: data.product_name,
                price: Number(data.offered_price),
                quantity: 1,
                // 3 Field Tambahan Sesuai Request Anda:
                product_name_at_purchase: data.product_name,
                product_price_at_purchase: Number(data.offered_price),
                // Pastikan saat membuat tawaran awal (POST), data.product_image sudah disimpan di data negosiasi
                product_image_at_purchase: productData.image || "" 
            });

            // 5. SET KOLEKSI 'payments' (Lengkap sesuai skema Anda)
            // transaction.set(paymentRef, {
            //     payment_id: paymentRef.id,
            //     order_id: orderRef.id,
            //     payment_status: "pending", // Default awal sebelum ada transfer masuk
            //     payment_method: "transfer", // Default metode pembayaran awal
            //     payment_date: null,
            //     custom_request_id: null,
            //     // Menggunakan ID unik gabungan untuk Midtrans tracking ke depan
            //     midtrans_order_id: `${orderRef.id}-${Date.now()}`, 
            //     transaction_token: "" 
            // });
        });

        // Response Berhasil jika seluruh rangkaian transaksi di atas sukses tanpa error
        res.status(200).json({ 
            message: "Kesepakatan tawar-menawar berhasil dikunci. Invoice siap dibayar!" 
        });

    } catch (error) {
        console.error("--- ERROR TRANSACTION ACCEPTOFFER ---");
        console.error(error.message);
        
        // Memastikan status code diset dengan benar jika bukan 404
        const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
        res.status(statusCode).json({ 
            message: error.message || "Gagal memproses persetujuan harga" 
        });
    }
});
/**
 * 3. ENDPOINT: Menolak Tawaran (Penjual)
 * PATCH /api/negotiations/:id/reject
 * Ditopang limitasi counter_count maksimal 3 kali tawar-menawar
 */
router.patch('/:id/reject', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        let seller_id = req.user.uid || req.user.id; 
      
        // console.log(seller_id);
        const negoRef = db.collection('negotiations').doc(id);
        
        await db.runTransaction(async (transaction) => {
            const negoDoc = await transaction.get(negoRef);
            if (!negoDoc.exists) throw new Error("Negosiasi tidak ditemukan!");
            
            const data = negoDoc.data();
            if (data.seller_id !== seller_id) throw new Error("Akses ditolak!");
            if (data.status !== 'pending') throw new Error("Negosiasi ini sudah tidak aktif.");

            const currentCounter = data.counter_count || 0;
            if (currentCounter >= 3) {
                throw new Error("Batas maksimal kesempatan tawar-menawar (3x) telah habis.");
            }

            const nextCounter = currentCounter + 1;
            // Jika counter sudah mencapai ke-3, status langsung gugur ('rejected')
            const newStatus = nextCounter >= 3 ? 'rejected' : 'pending';

            transaction.update(negoRef, { 
                counter_count: nextCounter,
                status: "rejected",
                updated_at: new Date().toISOString()
            });
        });

        res.json({ message: "Tawaran berhasil ditolak oleh penjual." });
    } catch (error) {
        console.error("Error rejecting negotiation:", error.message);
        res.status(500).json({ message: error.message || "Gagal menolak tawaran." });
    }
});
export default router;