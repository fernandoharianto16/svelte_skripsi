// import cron from 'node-cron';
// // Sesuaikan path menuju inisialisasi database Firebase Admin SDK Anda
// import { db } from '../firebaseAdmin.js';

// const initOrderCron = () => {
//   // Jalankan cron job setiap 10 menit sekali
//   //   cron.schedule('*/1 * * * *', async () => {
//   cron.schedule('*/1 * * * *', async () => {
//     console.log('--- [CRON] Mengecek data menggantung di Firestore... ---');

//     try {
//       // Tentukan batas waktu toleransi (Contoh: 24 jam yang lalu)
//       // const batasWaktu = new Date(Date.now() - 24 * 60 * 60 * 1000);

//       // 2 menit yang lalu
//       const batasWaktu = new Date(Date.now() - 60 * 60 * 1000);
//       // 1 menit yang lalu
//       // const batasWaktu = new Date(Date.now() - 1 * 60 * 1000);
//       const batasWaktuISO = batasWaktu.toISOString();

//       // Query ke koleksi orders
//       const ordersRef = db.collection('orders');
//       const snapshot = await ordersRef
//         .where('order_status', '==', 'pending') // Sesuaikan dengan status awal Anda (misal: 'pending')
//         .where('created_at', '<', batasWaktuISO)
//         .get();

//       if (snapshot.empty) {
//         console.log('[CRON] Tidak ada pesanan menggantung saat ini.');
//         return;
//       }

//       // Gunakan Batch Writes agar proses update massal lebih efisien
//       const batch = db.batch();

//       snapshot.docs.forEach((doc) => {
//         const docRef = ordersRef.doc(doc.id);
//         batch.update(docRef, {
//           order_status: 'canceled',
//           payment_status: 'canceled',
//           cancel_reason: 'Sistem: Penjual tidak menanggapi pesanan lebih dari 24 jam.',
//           updated_at: new Date()
//         });
//       });

//       await batch.commit();
//       // console.log(`[CRON SUCCESS] Berhasil membatalkan ${snapshot.size} pesanan otomatis.`);
//       console.log(`[CRON SUCCESS] Patroli Selesai di Eksekusi:`);
//       if (snapshot.size > 0) {
//         console.log(`  -> 🚫 ${snapshot.size} Pesanan dibatalkan karena Penjual tidak merespon.`);
//       }
//       // if (expiredPaymentsSnapshot.size > 0) {
//       //   console.log(`  -> 💸 ${expiredPaymentsSnapshot.size} Pesanan dibatalkan karena Pembayaran kedaluwarsa.`);
//       // }
//       // console.log(`Total data diperbarui pada batch ini: ${snapshot.size + expiredPaymentsSnapshot.size} dokumen.\n`);
//     } catch (error) {
//       console.error('[CRON ERROR] Gagal mengecek pesanan di Firestore:', error);
//     }
//   });
// };

// export default initOrderCron;

import { db } from '../firebaseAdmin.js';
async function autoCancelOrders(batasWaktuISO) {
  try {
    const ordersRef = db.collection('orders');
    const snapshot = await ordersRef
      .where('order_status', '==', 'pending')
      .where('created_at', '<', batasWaktuISO)
      .get();

    if (snapshot.empty) return 0;
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        order_status: 'canceled',
        payment_status: 'canceled',
        cancel_reason: 'Sistem: Penjual tidak menanggapi pesanan lebih dari 24 jam.',
        updated_at: new Date().toISOString()
      });
    });
    await batch.commit();
    return snapshot.size;
  } catch (error) {
    console.error('[CRON ERROR] Gagal mengecek pesanan menggantung:', error);
    throw error;
  }
}
export default autoCancelOrders;