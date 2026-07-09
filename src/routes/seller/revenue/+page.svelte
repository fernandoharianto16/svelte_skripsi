<script>
    import { onMount } from 'svelte';
    import { onAuthStateChanged } from 'firebase/auth'; // Sesuaikan auth Anda
    import { auth } from "$lib/firebase";
    import api from "$lib/api/axios";
  let transactions = [];
  let loading = true;
  let searchId = '';
  let grossEarnings=0;
  let totalAdminFee=0;
  let netEarnings=0;

  onMount(() => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      await loadTransactions();
    });
  });

  async function loadTransactions() {
    try {
      loading = true;
      // Memanggil endpoint khusus yang mengambil data dari collection transactions
      const res = await api.get(`/transaction/seller`);
      transactions = res.data.data; // Berisi array objek seperti gambar Anda
      console.log(transactions);
    } catch (err) {
      console.error("Gagal memuat data transaksi:", err);
    } finally {
      loading = false;
    }
  }

  // ==========================================
  // HITUNG OTOMATIS DARI TRANSAKSI YANG SUKSES
  // ==========================================
  $: completedTx = transactions.filter(tx => tx.status === 'completed');

  $: grossEarnings = completedTx.reduce((sum, tx) => sum + tx.total_payment, 0);
  $: totalAdminFee = completedTx.reduce((sum, tx) => sum + tx.admin_fee, 0);
  $: netEarnings = completedTx.reduce((sum, tx) => sum + tx.seller_income, 0);

  // Filter pencarian berdasarkan Transaction ID
  $: filteredTransactions = transactions.filter(tx => 
    tx.transaction_id.toLowerCase().includes(searchId.toLowerCase())
  );
</script>
<svelte:head>
<title>Penghasilan</title>
</svelte:head>

<div class="revenue-page">
  <div class="header">
    <h2>Riwayat Pendapatan</h2>
  </div>

  <div class="earnings-container">
    <div class="card card-gross">
      <span class="card-label">Total Omzet (Kotor)</span>
      <span class="card-value">Rp {grossEarnings.toLocaleString('id-ID')}</span>
    </div>

    <div class="card card-fee">
      <span class="card-label">Potongan Admin</span>
      <span class="card-value">- Rp {totalAdminFee.toLocaleString('id-ID')}</span>
    </div>

    <div class="card card-net">
      <span class="card-label">Pendapatan Bersih</span>
      <span class="card-value">Rp {netEarnings.toLocaleString('id-ID')}</span>
    </div>
  </div>

  <!-- <div class="search-box">
    <i class="bi bi-search"></i>
    <input type="text" placeholder="Cari ID Transaksi..." bind:value={searchId} />
  </div> -->

  {#if loading}
    <p>Memuat data keuangan...</p>
  {:else if filteredTransactions.length === 0}
    <p>Belum ada riwayat transaksi masuk.</p>
  {:else}
    <table class="revenue-table" border="1" cellpadding="8">
      <thead>
        <tr>
          <th>ID Transaksi</th>
          <th>Tanggal</th>
          <th>Sumber Dana</th>
          <th>Total Bayar (Kotor)</th>
          <th>Potongan Admin</th>
          <th>Pendapatan Anda (Bersih)</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {#each filteredTransactions as tx}
          <tr>
            <td class="tx-id">{tx.source_id}</td>
            <td>
              {new Date(tx.created_at).toLocaleDateString("id-ID", {
                day: "numeric", month: "short", year: "numeric"
              })}
            </td>
            <td>
              <span class="source-badge {tx.source_type}">
                {tx.source_type === 'custom_request' ? 'Custom Request' : 'Order Biasa'}
              </span>
            </td>
            <td>Rp {tx.total_payment.toLocaleString('id-ID')}</td>
            <td class="text-danger">- Rp {tx.admin_fee.toLocaleString('id-ID')}</td>
            <td class="text-success font-weight-bold">Rp {tx.seller_income.toLocaleString('id-ID')}</td>
            <td>
              <span class="status-badge {tx.status}">{tx.status}</span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>

<style>
/* Style tambahan untuk elemen halaman transaksi */
.revenue-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
  font-size: 0.9rem;
}

.revenue-table th {
  background-color: #f8f9fa;
  color: #495057;
  font-weight: 600;
  text-align: left;
}

.tx-id {
  font-family: 'Courier New', Courier, monospace;
  font-weight: bold;
  color: #2b6cb0;
}

/* Badge untuk tipe sumber dana (Custom Request vs Order) */
.source-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}
.source-badge.custom_request {
  background-color: #ebf8ff;
  color: #2b6cb0;
  border: 1px solid #bee3f8;
}
.source-badge.order {
  background-color: #f7fafc;
  color: #4a5568;
  border: 1px solid #e2e8f0;
}

/* Status Badge (Completed) */
.status-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
  text-transform: uppercase;
}
.status-badge.completed {
  background-color: #c6f6d5;
  color: #22543d;
}

/* utility warna teks */
.text-danger { color: #e53e3e; }
.text-success { color: #38a169; }
.font-weight-bold { font-weight: 700; }
.header {
  margin-bottom: 20px;
}

.header h2 {
  font-size: 1.4rem;
  color: #2d3748; /* Warna abu-abu gelap elegan */
  font-weight: 700;
  margin: 0;
}

/* --- STYLE UNTUK CARDS CONTAINER --- */
.earnings-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); /* Responsif otomatis */
  gap: 12px; /* Jarak antar kartu lebih rapat */
  margin-bottom: 25px;
  width: 100%;
}

/* --- BASE STYLE UNTUK SEMUA KARTU (UKURAN RAMPING) --- */
.card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 12px 16px; /* Padding tipis agar hemat tempat */
  border-radius: 8px; /* Sudut melengkung halus */
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: transform 0.2s ease;
}

.card:hover {
  transform: translateY(-2px); /* Efek melayang tipis saat di-hover */
}

/* Style untuk judul teks di dalam kartu */
.card-label {
  font-size: 0.75rem; /* Ukuran teks kecil ringkas */
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
  opacity: 0.85;
}

/* Style untuk nominal angka uang */
.card-value {
  font-size: 1.25rem; /* Ukuran angka proporsional tidak terlalu besar */
  font-weight: 700;
  letter-spacing: -0.3px;
}

/* --- VARIASI WARNA KARTU --- */

/* 1. Card Omzet Kotor (Warna Abu-Abu/Netral Modern) */
.card-gross {
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  color: #343a40;
}
.card-gross .card-label {
  color: #6c757d;
}

/* 2. Card Potongan Admin (Warna Merah Muda Soft) */
.card-fee {
  background: linear-gradient(135deg, #fff5f5, #ffe3e3);
  color: #e53e3e; /* Angka minus berwarna merah */
  border: 1px solid #fec5c5;
}
.card-fee .card-label {
  color: #c53030;
}

/* 3. Card Pendapatan Bersih (Warna Hijau Utama/Paling Mencolok) */
.card-net {
  background: linear-gradient(135deg, #198754, #146c43);
  color: #ffffff; /* Teks putih agar kontras */
  box-shadow: 0 2px 8px rgba(25, 135, 84, 0.25); /* Efek glow hijau tipis */
}
.card-net .card-label {
  color: rgba(255, 255, 255, 0.85);
}
</style>