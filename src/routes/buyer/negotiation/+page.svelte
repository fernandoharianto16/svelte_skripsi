<script>
  import { onMount } from "svelte";
  export let params;
  import api from "$lib/api/axios";
  import { auth } from "$lib/firebase";
  import { onAuthStateChanged } from "firebase/auth";
  import Swal from "sweetalert2";
  import { goto } from "$app/navigation";

  let negotiations = [];
  let loading = true;
  let search = "";

  // State untuk Modal Detail Riwayat Tawar-menawar
  let showDetailModal = false;
  let modalLoading = false;
  let selectedParentId = "";
  let negoMain = null;
  let negoHistory = [];

  onMount(() => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        console.error("User belum login");
        goto("/login"); // Redirect ke login jika user belum terautentikasi
        return;
      }
      await loadNegotiations();
    });
  });

  // Mengambil daftar negosiasi aktif milik PEMBELI
  async function loadNegotiations() {
    try {
      // loading = true;
      // Cukup panggil tanpa melempar ID di parameter, karena backend membaca token JWT Anda
      const res = await api.get(`/buyer/negotiations`);
      // console.log(res);
      negotiations = res.data.data || res.data || [];
      console.log("Data Negosiasi Pembeli:", negotiations);
    } catch (err) {
      console.error(err);
      Swal.fire("Gagal", "Tidak dapat mengambil data negosiasi", "error");
    } finally {
      loading = false;
    }
  }

  // Membuka modal history negosiasi berdasarkan parent_id (room obrolan)
  async function openNegoDetail(parent_id, currentNego) {
    selectedParentId = parent_id;
    negoMain = currentNego;
    showDetailModal = true;
    modalLoading = true;
    try {
      // Mengambil semua lembar penawaran yang memiliki parent_id sama
      const res = await api.get(`/buyer/negotiations/thread/${parent_id}`);
      negoHistory = res.data.data || res.data || [];
    } catch (err) {
      console.error(err);
      Swal.fire("Gagal", "Tidak dapat mengambil riwayat negosiasi", "error");
      showDetailModal = false;
    } finally {
      modalLoading = false;
    }
  }

  function closeNegoModal() {
    showDetailModal = false;
    negoMain = null;
    negoHistory = [];
  }

  // Aksi Menerima Tawaran dari Penjual
  async function acceptNego(negoId) {
    const result = await Swal.fire({
      title: "Terima tawaran harga?",
      text: "Sistem akan otomatis menerbitkan invoice pesanan dengan harga kesepakatan ini.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#28a745",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Ya, Deal!",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      Swal.showLoading();
      await api.patch(`/negotiations/${negoId}/accept`);

      // Update state lokal menggunakan .id sesuai mapping backend
      negotiations = negotiations.map((n) =>
        n.id === negoId ? { ...n, status: "accepted" } : n,
      );

      Swal.fire(
        "Berhasil!",
        "Tawaran diterima, order dan tagihan payment sukses dibuat.",
        "success",
      );
      closeNegoModal();
    } catch (error) {
      console.error(error);
      Swal.fire(
        "Gagal!",
        error.response?.data?.message || "Terjadi kesalahan sistem.",
        "error",
      );
    }
  }

  // Aksi Menolak Tawaran
  async function rejectNego(negoId) {
    const result = await Swal.fire({
      title: "Tolak tawaran ini?",
      text: "Kesempatan negosiasi untuk barang ini akan berkurang.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Ya, Tolak!",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      Swal.showLoading();
      await api.patch(`/negotiations/${negoId}/reject`);

      await loadNegotiations();

      Swal.fire("Ditolak!", "Tawaran berhasil ditolak.", "success");
      closeNegoModal();
    } catch (error) {
      console.error(error);
      Swal.fire(
        "Gagal!",
        error.response?.data?.message || "Gagal memproses penolakan.",
        "error",
      );
    }
  }

  function goToDashboard() {
    goto("/buyer/dashboard"); // Menyesuaikan ke arah dashboard buyer
  }

  async function quickCounter(negoId, currentPrice,productName) {
    const { value: newPrice } = await Swal.fire({
      title: "Masukkan Harga Penawaran Baru",
      input: "number",
      inputLabel: `Harga sebelumnya: Rp ${currentPrice.toLocaleString("id-ID")}`,
      inputPlaceholder: "Contoh: 150000",
      showCancelButton: true,
      confirmButtonText: "Kirim",
      cancelButtonText: "Batal",
      inputValidator: (value) => {
        if (!value || value <= 0) {
          return "Masukkan nominal harga yang valid!";
        }
        if (Number(value) <= currentPrice) {
          return "Harga baru harus lebih tinggi dari penawaran sebelumnya!";
        }
      },
    });

    if (!newPrice) return; // Jika user klik batal

    try {
      Swal.showLoading();
      // Tembak endpoint counter ke backend
      await api.patch(`/buyer/negotiations/${negoId}/counter`, {
        offered_price: Number(newPrice),
        product_name:productName
      });

      Swal.fire("Berhasil!", "Tawaran baru Anda telah dikirim.", "success");
      await loadNegotiations(); // Refresh tabel otomatis
    } catch (error) {
      console.error(error);
      Swal.fire(
        "Gagal!",
        error.response?.data?.message || "Gagal mengirim harga.",
        "error",
      );
    }
  }
</script>

<svelte:head>
  <title>Daftar Negosiasi Saya</title>
</svelte:head>

<div class="header">
  <h1>Negosiasi Saya</h1>
  <div class="button-group">
    <button class="order-btn" on:click={goToDashboard}>
      <i class="bi bi-house"></i> Dashboard Buyer
    </button>
  </div>
</div>

<!-- <div class="search-box">
  <i class="bi bi-search"></i>
  <input type="text" placeholder="Cari nama produk..." bind:value={search} />
</div> -->

{#if loading}
  <p>Loading data negosiasi...</p>
{:else if negotiations.length === 0}
  <p>Anda belum memiliki pengajuan negosiasi saat ini.</p>
{:else}
  <table border="1" cellpadding="8">
    <thead>
      <tr>
        <th>Nego ID</th>
        <th>Produk</th>
        <th>Pengaju</th>
        <th>Harga Tawaran</th>
        <th>Counter</th>
        <th>Status</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody>
      {#each negotiations.filter((n) => (n.product_name || "")
          .toLowerCase()
          .includes(search.toLowerCase())) as nego}
        <tr>
          <td class="mono">{nego.id ? nego.id.substring(0, 8) : "..."}...</td>
          <td
            ><strong>{nego.product_name || "Produk Tidak Diketahui"}</strong
            ></td
          >
          <td
            ><span class="badge origin">{nego.origin_type || "buyer"}</span></td
          >
          <td class="price-text"
            >Rp {nego.offered_price
              ? nego.offered_price.toLocaleString("id-ID")
              : 0}</td
          >
          <td
            ><span class="counter-indicator">{nego.counter_count || 0} / 3</span
            ></td
          >
          <td><span class="badge {nego.status}">{nego.status}</span></td>
          <td class="action-cell">
            <div class="action-wrapper">
              {#if nego.status === "rejected" && (nego.counter_count || 0) < 3}
                <button
                  on:click={() => quickCounter(nego.id, nego.offered_price,nego.product_name)}
                  class="btn-icon btn-take"
                  title="Tawar Ulang"
                  style="background-color: #e0f2fe !important;"
                >
                  <i class="bi bi-pencil-square" style="color: #0284c7 !important;"></i>
                </button>
              {/if}

              {#if (nego.counter_count || 0) < 3}
              <button
                on:click={() => acceptNego(nego.id)}
                class="btn-icon btn-take"
                title="Terima & Buat Order"
              >
                <i class="bi bi-check-lg"></i>
              </button>
              <button
                on:click={() => rejectNego(nego.id)}
                class="btn-icon btn-reject"
                title="Tolak Tawaran"
              >
                <i class="bi bi-trash"></i>
              </button>
              {/if}
            </div>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}




{#if showDetailModal}
  <div class="modal-backdrop" on:click={closeNegoModal}>
    <div class="modal-box" on:click|stopPropagation>
      <div class="modal-header-detail">
        <h3>Log Alur Tawar-Menawar</h3>
        <button class="btn-close-detail" on:click={closeNegoModal}
          >&times;</button
        >
      </div>

      <div class="modal-body-detail">
        {#if modalLoading}
          <p class="center-text">Menarik data timeline...</p>
        {:else}
          <div class="info-summary">
            <p><strong>Product Focus:</strong> {negoMain?.product_name}</p>
            <p>
              <strong>Thread Root ID:</strong>
              <span class="mono">{selectedParentId}</span>
            </p>
          </div>

          <h4>Timeline Penawaran (Terbaru di Atas):</h4>
          <div class="timeline">
            {#each negoHistory.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) as step}
              <div
                class="timeline-card {step.origin_type === 'buyer'
                  ? 'from-buyer'
                  : 'from-seller'}"
              >
                <div class="card-meta">
                  <span class="sender"
                    >Oleh: {step.origin_type
                      ? step.origin_type.toUpperCase()
                      : ""}</span
                  >
                  <span class="time"
                    >{step.created_at
                      ? new Date(step.created_at).toLocaleTimeString("id-ID")
                      : ""}</span
                  >
                </div>
                <div class="card-price">
                  Nominal: <strong
                    >Rp {step.offered_price
                      ? step.offered_price.toLocaleString("id-ID")
                      : 0}</strong
                  >
                </div>
                <div class="card-status">
                  Counter Hit: <span class="badge-mini"
                    >{step.counter_count || 0}</span
                  >
                  | Status Lembar:
                  <span class="status-inline">{step.status}</span>
                </div>
              </div>
            {/each}
          </div>

          {#if negoMain?.status === "pending" && negoMain?.origin_type === "seller"}
            <div class="modal-action-footer">
              <button
                class="action-footer-btn accept"
                on:click={() => acceptNego(negoMain.id)}
                >Terima Deal Harga Sekarang</button
              >
              <button
                class="action-footer-btn reject"
                on:click={() => rejectNego(negoMain.id)}>Tolak</button
              >
            </div>
          {/if}
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  /* DESIGN ACTION WRAPPER */
  .action-cell {
    width: 140px;
    text-align: center;
  }
  .action-wrapper {
    display: flex;
    justify-content: space-evenly;
    gap: 6px;
  }
  .action-wrapper button {
    flex: 1;
    height: 38px;
    border: none;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  .action-wrapper button i {
    font-size: 18px;
  }

  /* ADJUSTMENT WARNA ACTION */
  .btn-view {
    background-color: #e0f2fe !important;
  }
  .btn-view i {
    color: #0369a1 !important;
  }
  .btn-take {
    background-color: #dcfce7 !important;
  }
  .btn-take i {
    color: #15803d !important;
  }
  .btn-reject {
    background-color: #fee2e2 !important;
  }
  .btn-reject i {
    color: #b91c1c !important;
  }

  /* CSS MODAL TIMELINE LOG NEGOSIASI */
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
  }
  .modal-box {
    background: white;
    width: 95%;
    max-width: 550px;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    overflow: hidden;
  }
  .modal-header-detail {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f8fafc;
    padding: 15px 20px;
    border-bottom: 1px solid #e2e8f0;
  }
  .modal-header-detail h3 {
    margin: 0;
    font-size: 1.1rem;
  }
  .btn-close-detail {
    background: none;
    border: none;
    font-size: 1.4rem;
    cursor: pointer;
  }
  .modal-body-detail {
    padding: 20px;
    max-height: 75vh;
    overflow-y: auto;
  }
  .info-summary {
    background: #f8fafc;
    padding: 12px;
    border-radius: 6px;
    margin-bottom: 15px;
    font-size: 0.9rem;
    line-height: 1.5;
    border-left: 4px solid #cbd5e1;
  }

  /* TIMELINE CARDS */
  .timeline {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 20px;
  }
  .timeline-card {
    padding: 12px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    background: #fff;
  }
  .timeline-card.from-buyer {
    border-left: 5px solid #3b82f6;
    background: #f0f6ff;
  }
  .timeline-card.from-seller {
    border-left: 5px solid #10b981;
    background: #f0fdf4;
  }
  .card-meta {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    color: #64748b;
    margin-bottom: 5px;
  }
  .sender {
    font-weight: bold;
  }
  .card-price {
    font-size: 1rem;
    margin-bottom: 5px;
  }
  .card-status {
    font-size: 0.8rem;
    color: #64748b;
  }
  .badge-mini {
    background: #cbd5e1;
    padding: 1px 5px;
    border-radius: 3px;
    font-weight: bold;
  }

  /* FOOTER ACTION di MODAL */
  .modal-action-footer {
    display: flex;
    gap: 10px;
    border-top: 1px solid #e2e8f0;
    padding-top: 15px;
  }
  .action-footer-btn {
    flex: 1;
    padding: 10px;
    border: none;
    border-radius: 6px;
    font-weight: bold;
    cursor: pointer;
  }
  .action-footer-btn.accept {
    background: #22c55e;
    color: white;
  }
  .action-footer-btn.reject {
    background: #ef4444;
    color: white;
  }

  /* BADGES & GENERAL */
  .mono {
    font-family: monospace;
  }
  .price-text {
    font-weight: bold;
    color: #0f172a;
  }
  .counter-indicator {
    background: #f1f5f9;
    padding: 3px 8px;
    border-radius: 20px;
    font-weight: bold;
    font-size: 0.85rem;
  }
  .badge {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: bold;
    text-transform: uppercase;
  }
  .badge.pending {
    background: #fef3c7;
    color: #d97706;
  }
  .badge.accepted {
    background: #dcfce7;
    color: #15803d;
  }
  .badge.rejected {
    background: #fee2e2;
    color: #b91c1c;
  }
  .badge.origin {
    background: #e0f2fe;
    color: #0369a1;
    text-transform: capitalize;
  }
  .badge.initiated {
    background: #f1f5f9;
    color: #475569;
    text-transform: capitalize;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }
  .order-btn {
    padding: 8px 16px;
    background: #fff;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    cursor: pointer;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 15px;
  }
  th,
  td {
    padding: 12px 10px;
    border-bottom: 1px solid #e2e8f0;
    text-align: left;
  }
  th {
    background: #f8fafc;
    color: #475569;
    font-weight: 600;
  }
  .search-box {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 300px;
    padding: 8px 12px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    background: #fff;
  }
  .search-box input {
    border: none;
    outline: none;
    flex: 1;
  }
</style>
