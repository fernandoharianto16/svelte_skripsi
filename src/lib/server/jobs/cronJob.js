import cron from 'node-cron';
import autoCancelOrders from './autoCancelOrders.js';
import autoConfirmOrders from './autoConfirmOrders.js';
import autoExpirePayments from './autoExpirePayments.js';

// Bungkus schedule ke dalam sebuah fungsi fungsi
const initCronJob = () => {
  cron.schedule('*/2 * * * *', async () => {
    console.log('--- [CRON] Memulai Patroli Berkala Firestore... ---');
    try {
      const batasWaktu = new Date(Date.now() - 2 * 60 * 1000);
      const batasWaktuISO = batasWaktu.toISOString();

      const [totalCanceledOrders, totalExpiredPayments, totalConfirmedOrders] = await Promise.all([
        autoCancelOrders(batasWaktuISO),
        autoExpirePayments(batasWaktuISO),
        autoConfirmOrders(batasWaktuISO)
      ]);

      if (totalCanceledOrders === 0 && totalExpiredPayments === 0 && totalConfirmedOrders==0) {
        // Kondisi 1: Tidak ada data yang melanggar batas waktu
        console.log('   ↳ 🟢 [STATUS] Semua data aman. Tidak ada pesanan pasif atau pembayaran kedaluwarsa.');
        console.log('[CRON] Patroli Selesai: Sukses diverifikasi tanpa perubahan dokumen.');
      } else {
        // Kondisi 2: Ada tindakan eksekusi pembatalan otomatis
        console.log(`[CRON SUCCESS] Patroli Selesai dieksekusi pada ${new Date().toLocaleTimeString()}:`);
        
        if (totalCanceledOrders > 0) {
          console.log(`   ${totalCanceledOrders} Pesanan otomatis dibatalkan (Penjual tidak merespon/pasif).`);
        }
        
        if (totalExpiredPayments > 0) {
          console.log(`   ${totalExpiredPayments} Pembayaran otomatis kedaluwarsa (Pembeli tidak menyelesaikan pembayaran).`);
        }
        if (totalConfirmedOrders > 0) {
          console.log(`   ${totalConfirmedOrders} Pesanan otomatis diselesaikan (Pembeli tidak menyelesaikan pesanan).`);
        }


        console.log(`📊 [RINGKASAN] Total data yang diperbarui pada batch ini: ${totalCanceledOrders + totalExpiredPayments} dokumen.\n`);
      }
    } catch (error) {
      console.error('[CRON MASTER ERROR]:', error);
    }
  });
};

// Export fungsinya
export default initCronJob;