import cron from 'node-cron';
// Sesuaikan path menuju inisialisasi database Firebase Admin SDK Anda
import { db } from '../firebaseAdmin.js'; 

const initOrderCron = () => {
  // Jalankan cron job setiap 10 menit sekali
//   cron.schedule('*/1 * * * *', async () => {
  cron.schedule('*/10 * * * *', async () => {
    console.log('--- [CRON] Mengecek pesanan menggantung di Firestore... ---');

    try {
      // Tentukan batas waktu toleransi (Contoh: 24 jam yang lalu)
      const batasWaktu = new Date(Date.now() - 24 * 60 * 60 * 1000);
    //   const batasWaktu = new Date(Date.now() - 2 * 60 * 1000);
    //   const batasWaktu = new Date(Date.now() - 1 * 60 * 1000);
      const batasWaktuISO = batasWaktu.toISOString(); 

      // Query ke koleksi orders
      const ordersRef = db.collection('orders');
      const snapshot = await ordersRef
        .where('order_status', '==', 'pending') // Sesuaikan dengan status awal Anda (misal: 'pending')
        .where('created_at', '<', batasWaktuISO)
        .get();

      if (snapshot.empty) {
        console.log('[CRON] Tidak ada pesanan menggantung saat ini.');
        return;
      }

      // Gunakan Batch Writes agar proses update massal lebih efisien
      const batch = db.batch();

      snapshot.docs.forEach((doc) => {
        const docRef = ordersRef.doc(doc.id);
        batch.update(docRef, {
          order_status: 'canceled',
          payment_status: 'canceled',
          cancel_reason: 'Sistem: Penjual tidak menanggapi pesanan lebih dari 24 jam.',
          updated_at: new Date().toISOString()
        });
      });

      await batch.commit();
      console.log(`[CRON SUCCESS] Berhasil membatalkan ${snapshot.size} pesanan otomatis.`);

    } catch (error) {
      console.error('[CRON ERROR] Gagal mengecek pesanan di Firestore:', error);
    }
  });
};

export default initOrderCron;