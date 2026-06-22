import express from 'express';
import { db ,admin } from './firebaseAdmin.js';
import { verifyToken } from './middleware/auth.js';

const router = express.Router();


router.get('/', verifyToken, async (req, res) => {
    try {
        // 1. Ambil Buyer ID dari token (pastikan menggunakan properti yang tepat, misal: uid atau id)
        const buyer_id = req.user.uid || req.user.id; 
        // console.log(buyer_id);

        // 2. Arahkan ke koleksi 'negotiations' (bukan 'orders')
        const negotiationsRef = admin.firestore().collection('negotiations');
        
        // 3. Query menggunakan composite index: buyer_id (Filter) & updated_at (Sorting)
        const snapshot = await negotiationsRef
            .where('buyer_id', '==', buyer_id) // Mencari berdasarkan id pembeli
            // .orderBy('updated_at', 'desc')    // Mengurutkan dari yang terbaru diperbarui
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
 * 1. ENDPOINT: Mengajukan Tawaran Pertama (Pembeli)
 * POST /api/negotiations
 */
router.post('/', verifyToken, async (req, res) => {
    try {
        const { product_id, offered_price, buyer_id } = req.body;
        // const buyer_id = req.user.id;

        // 1. Ambil data produk dari Firestore
        const productRef = db.collection('products').doc(product_id);
        const productDoc = await productRef.get();

        if (!productDoc.exists) {
            return res.status(404).json({ message: "Produk tidak ditemukan!" });
        }

        const product = productDoc.data();

        // 2. Validasi: Jangan biarkan tawaran di bawah 50% harga asli
        if (offered_price < (product.price * 0.5)) {
            return res.status(400).json({ message: "Penawaran terlalu rendah!" });
        }

        // 3. Simpan ke koleksi 'negotiations'
        const negoRef = db.collection('negotiations').doc(); 
        const newNego = {
            product_id,
            product_name: product.product_name,
            origin_type:"buyer", 
            buyer_id,
            seller_id: product.seller_id,
            offered_price,
            status: 'pending',
            counter_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        await negoRef.set(newNego);

        res.status(201).json({ 
            message: "Tawaran berhasil dikirim", 
            id: negoRef.id, 
            data: newNego 
        });
    } catch (error) {
        console.error("Error creating negotiation:", error);
        res.status(500).json({ message: "Gagal mengirim tawaran" });
    }
});

router.patch('/:id/counter', verifyToken, async (req, res) => {
    try {
        const { id } = req.params; 
        // Mengambil offered_price DAN product_name dari body request
        const { offered_price, product_name } = req.body;
        const buyer_id = req.user.uid || req.user.id;

        const negoRef = db.collection('negotiations').doc(id);
        const negoDoc = await negoRef.get();

        if (!negoDoc.exists) {
            return res.status(404).json({ message: "Data negosiasi tidak ditemukan!" });
        }

        const negoData = negoDoc.data();

        // VALIDASI 1: Pastikan yang melanjutkan adalah pembeli yang sama
        if (negoData.buyer_id !== buyer_id) {
            return res.status(403).json({ message: "Anda tidak berhak mengubah negosiasi ini." });
        }

        // VALIDASI 2: Cek apakah jatah menawar sudah habis (Maksimal 3x)
        if (negoData.counter_count >= 3) {
            return res.status(400).json({ message: "Kesempatan negosiasi Anda sudah habis (Maksimal 3x)!" });
        }

        // 3. Update dokumen termasuk product_name baru jika dikirim
        const updatedNego = {
            offered_price: offered_price,
            status: 'pending', 
            origin_type: 'buyer',
            product_name:product_name,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        };

        // Jika product_name diisi di body, ikut simpan/update ke Firestore
        if (product_name) {
            updatedNego.product_name = product_name;
        }

        await negoRef.update(updatedNego);

        res.status(200).json({ 
            message: "Tawaran baru berhasil dikirim ulang", 
            data: updatedNego 
        });

    } catch (error) {
        console.error("Error counter negotiation:", error);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;