import { db } from '../firebaseAdmin.js';
async function autoExpirePayments(batasWaktuISO) {
  try {
    const ordersRef = db.collection('orders');
    const expiredPaymentsSnapshot = await ordersRef
      .where('payment_status', '==', 'pending')
      .where('created_at', '<', batasWaktuISO)
      .get();
    if (expiredPaymentsSnapshot.empty) return 0;
    const batch = db.batch();
    expiredPaymentsSnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { 
        order_status: 'canceled',
        payment_status: 'canceled', 
        cancel_reason: 'Sistem: Pembayaran melewati batas waktu 24 jam.',
        updated_at: new Date().toISOString()
      });
    });
    await batch.commit();
    return expiredPaymentsSnapshot.size;
  } catch (error) {
    console.error('[CRON ERROR] Gagal mengecek pembayaran kedaluwarsa:', error);
    throw error;
  }
}
export default autoExpirePayments;