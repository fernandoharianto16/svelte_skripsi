router.post("/orders", verifyToken, async (req, res) => {
    try {
        const { items, total_price } = req.body;
        const buyer_id = req.user.uid;
        if (!items || items.length === 0 || !total_price) {
            return res.status(400).json({ message: "Data order tidak lengkap" });
        }
        const orderRef = await db.collection("orders").add({
            user_id: buyer_id,
            total_price,
            payment_status: "unpaid",
            order_status: "pending",
            created_at: new Date()
        });
        const detailPromises = items.map((item) => {
            return db.collection("order_details").add({
                order_id: orderRef.id,
                product_id: item.product_id,
                product_name_at_purchase: item.name,
                product_price_at_purchase: item.price,
                product_image_at_purchase: item.image,
                quantity: item.quantity,
                created_at: new Date()
            });
        });
        await Promise.all(detailPromises);
        res.status(201).json({
            message: "Order berhasil dibuat",
            order_id: orderRef.id
        });
    } catch (error) {
        console.error("Gagal membuat order:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// ------------------------------------------------------------------------------------




router.post("/custom-requests", verifyToken, upload.single("image"), async (req, res) => {
    try {
        const { request_description, category, budget_estimate } = req.body;
        const customer_id = req.user.uid;

        // Validasi data
        if (!request_description || !category || !budget_estimate) {
            return res.status(400).json({ message: "Data permintaan tidak lengkap" });
        }

        // Penanganan upload gambar ke Cloudinary
        let imageUrl = null;
        if (req.file) {
            imageUrl = await uploadToCloudinary(req.file.buffer, "custom_requests_images");
        }

        // Menyimpan request ke database
        const newRequest = {
            customer_id,
            seller_id: null, // Ditambahkan agar struktur konsisten
            request_description,
            category,
            budget_estimate: budget,
            reference_image: imageUrl,
            negotiated_price: null,
            request_status: "open",
            interested_sellers: [], // Persiapan untuk fitur limit 5 penjual
            created_at: new Date()
        };

        const result = await db.collection("custom_requests").add(newRequest);

        res.status(201).json({
            message: "Permintaan kustom berhasil dibuat",
            custom_request_id: result.id,
            data: newRequest
        });

    } catch (error) {
        console.error("Gagal membuat custom request:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});


router.post("/payments", verifyToken, async (req, res) => {
    try {
        // Mengambil data dari body
        const { 
            order_id, 
            custom_request_id, 
            payment_method, 
            transaction_token 
        } = req.body;

        // Validasi dasar
        if (!transaction_token || (!order_id && !custom_request_id)) {
            return res.status(400).json({ message: "Data pembayaran tidak lengkap" });
        }

        // Membuat objek pembayaran baru sesuai struktur image_f77787.png
        const newPayment = {
            order_id: order_id || null,
            custom_request_id: custom_request_id || null,
            payment_method: payment_method || "midtrans", // Default method
            payment_status: "pending", // Status awal saat token dibuat
            payment_date: new Date(),
            transaction_token: transaction_token
        };

        // Menyimpan ke koleksi PAYMENT
        const result = await db.collection("payments").add(newPayment);

        res.status(201).json({
            message: "Data pembayaran berhasil dibuat",
            payment_id: result.id,
            data: newPayment
        });

    } catch (error) {
        console.error("Gagal membuat data pembayaran:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});


router.post('/:orderId', verifyToken, async (req, res) => {
    try {
        const { orderId } = req.params;
        const buyerId = req.user.uid;
        const orderRef = admin.firestore().collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();
        if (!orderDoc.exists) return res.status(404).json({ message: "Pesanan tidak ditemukan" });
        const orderData = orderDoc.data();
        if (orderData.buyer_id !== buyerId) return res.status(403).json({ message: "Akses ditolak" });
        const existingPaymentQuery = await admin.firestore().collection('payments')
            .where('order_id', '==', orderId)
            .where('payment_status', '==', 'pending')
            .limit(1)
            .get();
        if (!existingPaymentQuery.empty) {
            const existingPayment = existingPaymentQuery.docs[0].data();
            return res.json({ token: existingPayment.transaction_token });
        }
        const uniqueOrderId = `${orderId}-${Date.now()}`;
        const token = await createSnapToken({
            id: uniqueOrderId,
            total: orderData.total_price,
            name: orderData.buyer_name,
            email: orderData.buyer_email
        });
        const paymentRef = admin.firestore().collection('payments').doc();
        await paymentRef.set({
            payment_id: paymentRef.id,
            order_id: orderId,
            midtrans_order_id: uniqueOrderId,
            custom_request_id: orderData.custom_request_id || null,
            payment_method: null,
            payment_status: 'pending',
            payment_date: new Date().toISOString(),
            transaction_token: token
        });
        await orderRef.update({
            payment_id: paymentRef.id,
            snap_token: token
        });
        res.json({ token });
    } catch (error) {
        console.error("Gagal:", error);
        res.status(500).json({ message: "Server error" });
    }
});

router.patch('/custom_requests/:id/accept', verifyToken, async (req, res) => {
    try {
        const { custom_request_id, seller_id } = req.body; 
        const buyer_id = req.user.uid || req.user.id; 
        if (!custom_request_id || !seller_id) {
            return res.status(400).json({ message: "ID Custom Request atau ID Penjual tidak boleh kosong!" });
        }
        const customRequestRef = db.collection('custom_requests').doc(custom_request_id);
        const doc = await customRequestRef.get();
        if (!doc.exists) {
            return res.status(404).json({ message: "Custom request tidak ditemukan!" });
        }
        const requestData = doc.data();
        if (requestData.buyer_id !== buyer_id) {
            return res.status(403).json({ message: "Anda tidak memiliki hak akses untuk memilih penjual pada request ini!" });
        }
        if (requestData.request_status !== 'pending' || (requestData.seller_id && requestData.seller_id !== "")) {
            return res.status(400).json({ message: "Pesanan custom ini sudah memiliki penjual atau sedang diproses." });
        }
        const negotiationsSnapshot = await db.collection('negotiations').where('custom_request_id', '==', custom_request_id).get();
        const sellerNegotiationsSnapshot = await db.collection('negotiations').where('custom_request_id', '==', custom_request_id).where('seller_id', "==", seller_id).get();
        const sellerNegoData = sellerNegotiationsSnapshot.docs[0].data();
        const batch = db.batch();
        negotiationsSnapshot.forEach((negoDoc) => {
            const negoData = negoDoc.data();
            if (negoData.seller_id === seller_id) {
                batch.update(negoDoc.ref, { status: 'accepted' });
            } else {
                batch.update(negoDoc.ref, { status: 'canceled' });
            }
        });
        await batch.commit();
        await customRequestRef.update({
            seller_id: seller_id,
            negotiated_price: sellerNegoData.offered_price,
            request_status: 'accepted',
            payment_status: 'pending'
        });
        res.status(200).json({
            message: "Berhasil memilih penjual dan membatalkan penawaran lainnya!",
            custom_request_id: custom_request_id,
            seller_id: seller_id,
            status: "accepted"
        });
    } catch (error) {
        console.error("Error updating custom request:", error);
        res.status(500).json({ message: "Server error gagal memperbarui status custom request" });
    }
});


import { admin, db } from '../firebaseAdmin.js';
const autoConfirmOrders = async (batasWaktuISO) => {
  try {
    const snapshotOrders = await db.collection('orders')
      .where('order_status', '==', 'shipped') 
      .where('updated_at', '<=', batasWaktuISO)
      .get();
    if (snapshotOrders.empty) {
      return 0; 
    }
    const batch = db.batch();
    let counter = 0;
    for (const orderDoc of snapshotOrders.docs) {
      const orderId = orderDoc.id;
      const orderData = orderDoc.data();
      const orderRef = orderDoc.ref;
      batch.update(orderRef, {
        order_status: 'completed',
        updated_at: new Date().toISOString()
      });
      const orderDetailsSnapshot = await db.collection('order_details')
        .where('order_id', '==', orderId)
        .get();
      orderDetailsSnapshot.forEach((docDetail) => {
        const itemData = docDetail.data();
        const productId = itemData.product_id;
        const quantity = itemData.quantity;
        if (productId && quantity) {
          const productRef = db.collection('products').doc(productId);
          batch.update(productRef, {
            sold_count: admin.firestore.FieldValue.increment(quantity)
          });
        }
      });
      const autoIdRef = db.collection('transactions').doc();
      const transactionId = `TX-${autoIdRef.id}`;
      const totalPayment = orderData.total_price; 
      const adminFee = totalPayment * 0.15;
      const sellerIncome = totalPayment - adminFee;
      const transactionRef = db.collection('transactions').doc(transactionId);
      batch.set(transactionRef, {
        transaction_id: transactionId,
        source_type: "normal_order", 
        source_id: orderId,            
        seller_id: orderData.seller_id, 
        buyer_id: orderData.buyer_id,
        total_payment: totalPayment,
        admin_fee: adminFee,
        seller_income: sellerIncome,
        status: "completed",
        created_at: new Date().toISOString()
      });
      counter++;
    }
    await batch.commit();
    return counter;
  } catch (error) {
    console.error('Error pada fungsi autoCompleteOrders:', error);
    throw error;
  }
};
export default autoConfirmOrders;

import cron from 'node-cron';
import autoCancelOrders from './autoCancelOrders.js';
import autoConfirmOrders from './autoConfirmOrders.js';
import autoExpirePayments from './autoExpirePayments.js';
const initCronJob = () => {
  cron.schedule('*/10 * * * *', async () => {
    console.log('--- [CRON] Memulai Patroli Berkala Firestore... ---');
    try {
    const batasWaktu = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    const batasWaktuISO = batasWaktu.toISOString();
    const [totalCanceledOrders, totalExpiredPayments, totalConfirmedOrders] = await Promise.all([
        autoCancelOrders(batasWaktuISO),
        autoExpirePayments(batasWaktuISO),
        autoConfirmOrders(batasWaktuISO)
      ]);
    } catch (error) {
      console.error('[CRON MASTER ERROR]:', error);
    }
  });
};
export default initCronJob;