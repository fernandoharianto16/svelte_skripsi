import { admin, db } from '../firebaseAdmin.js';
const autoConfirmOrders = async (batasWaktuISO) => {
  try {
    // 1. Cari order yang menggantung (misal statusnya: 'delivered' atau 'sent') yang melewati batas waktu
    const snapshotOrders = await db.collection('orders')
      .where('order_status', '==', 'shipped') 
      .where('updated_at', '<=', batasWaktuISO) // Sudah lewat x hari/menit sejak dikirim
      .get();
    if (snapshotOrders.empty) {
      return 0; 
    }
    const batch = db.batch();
    let counter = 0;
    // 2. Looping setiap order yang harus diselesaikan otomatis
    for (const orderDoc of snapshotOrders.docs) {
      const orderId = orderDoc.id;
      const orderData = orderDoc.data();
      const orderRef = orderDoc.ref;
      // A. Antrikan update status pada dokumen order utama
      batch.update(orderRef, {
        order_status: 'completed',
        updated_at: new Date().toISOString()
      });
      // B. Looping setiap dokumen item yang ditemukan di order_details
      const orderDetailsSnapshot = await db.collection('order_details')
        .where('order_id', '==', orderId)
        .get();
      orderDetailsSnapshot.forEach((docDetail) => {
        const itemData = docDetail.data();
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
      // C. Hitung finansial & Buat Dokumen Transaksi (Dompet Penjual)
      const autoIdRef = db.collection('transactions').doc();
      const transactionId = `TX-${autoIdRef.id}`;

      const totalPayment = orderData.total_price; 
      const adminFee = totalPayment * 0.15; // Potongan admin 15%
      const sellerIncome = totalPayment - adminFee;

      const transactionRef = db.collection('transactions').doc(transactionId);

      batch.set(transactionRef, {
        transaction_id: transactionId,
        source_type: "normal_order", 
        source_id: orderId,            
        seller_id: orderData.seller_id, 
        buyer_id: orderData.buyer_id, // 💡 PERBAIKAN: Diambil dari orderData, bukan 'BuyerId' (karena ga ada session login)
        total_payment: totalPayment,
        admin_fee: adminFee,
        seller_income: sellerIncome,
        status: "completed",
        created_at: new Date().toISOString()
      });

      counter++;
    }

    // 3. Eksekusi seluruh batch secara atomis (All-or-Nothing)
    await batch.commit();
    return counter;

  } catch (error) {
    console.error('Error pada fungsi autoCompleteOrders:', error);
    throw error;
  }
};

export default autoConfirmOrders;