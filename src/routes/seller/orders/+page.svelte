<script>
  import { onMount } from "svelte";
  export let params;
  import api from "$lib/api/axios";
  import { auth } from "$lib/firebase";
  import { onAuthStateChanged } from "firebase/auth";
  import Swal from "sweetalert2";
  import { goto } from "$app/navigation";
  import { getAuth } from "firebase/auth";

  let orders = [];
  let loading = true;
  let currentPage = 1;
  let pageSize = 5;

  let search = "";
  let sortField = null;
  let sortOrder = "desc";

  // State untuk Modal Detail Pesanan (Seller)
  let showDetailModal = false;
  let modalLoading = false;
  let selectedOrderId = "";
  let orderMain = null;
  let orderItems = [];

  onMount(() => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        console.error("User belum login");
        return;
      }
      await loadOrders();
    });
  });

  async function loadOrders() {
    try {
      loading = true;
      const res = await api.get(`/seller/orders`);
      orders = res.data.data;
    } catch (err) {
      console.error(err);
    } finally {
      loading = false;
    }
  }

  // Fungsi untuk Membuka Modal Detail Pesanan menggunakan endpoint terbukti
  async function openOrderDetail(orderId) {
    selectedOrderId = orderId;
    showDetailModal = true;
    modalLoading = true;
    try {
      const res = await api.get(`/seller/orders/${orderId}`);
      
      const dataRespons = res.data;
      if (dataRespons && dataRespons.order) {
        orderMain = dataRespons.order;
        const listDetail = dataRespons.details || [];
        orderItems = [...listDetail];
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Gagal", "Tidak dapat mengambil detail pesanan", "error");
      showDetailModal = false;
    } finally {
      modalLoading = false;
    }
  }

  function closeOrderDetailModal() {
    showDetailModal = false;
    orderMain = null;
    orderItems = [];
  }

  async function takeOrder(orderId) {
    const result = await Swal.fire({
      title: "Terima pesanan?",
      text: "Anda akan mulai memproses pesanan ini.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#28a745",
      cancelButtonColor: "#dc3545",
      confirmButtonText: "Ya, Terima!",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      await api.patch(`/seller/orders/${orderId}/status`, { status: "taken" });
      orders = orders.map((order) =>
        order.id === orderId ? { ...order, order_status: "taken" } : order,
      );
      Swal.fire("Berhasil!", "Pesanan sekarang berstatus dalam proses.", "success");
    } catch (error) {
      console.error(error);
      Swal.fire("Gagal!", "Terjadi kesalahan saat memperbarui status.", "error");
    }
  }

  async function rejectOrder(orderId) {
    const result = await Swal.fire({
      title: "Tolak pesanan?",
      text: "Anda akan menolak pesanan ini.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Ya, Tolak!",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      await api.patch(`/seller/orders/${orderId}/status`, { status: "rejected" });
      orders = orders.map((order) =>
        order.id === orderId ? { ...order, order_status: "rejected" } : order,
      );
      Swal.fire("Berhasil!", "Tolak pesanan berhasil.", "success");
    } catch (error) {
      console.error(error);
      Swal.fire("Gagal!", "Terjadi kesalahan saat memperbarui status.", "error");
    }
  }

  async function sendShipmentProof(orderId) {
    const { value: file } = await Swal.fire({
        title: "Upload Bukti Pengiriman",
        input: "file",
        inputAttributes: {
            "accept": "image/*",
            "aria-label": "Pilih foto bukti pengiriman"
        },
        showCancelButton: true,
        confirmButtonText: "Kirim Bukti",
        cancelButtonText: "Batal"
    });

    if (file) {
        const formData = new FormData();
        formData.append("image", file);
        formData.append("status", "shipped");

        try {
            Swal.showLoading();
            await api.post(`seller/orders/ship/${orderId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            orders = orders.map((o) =>
                o.id === orderId ? { ...o, order_status: "shipped" } : o
            );

            Swal.fire("Berhasil!", "Bukti pengiriman telah diupload.", "success");
        } catch (error) {
            console.error("Gagal mengirim bukti:", error);
            Swal.fire("Gagal", "Terjadi kesalahan saat upload gambar.", "error");
        }
    }
  }

  function goToOrders() {
    goto("/seller/orders");
  }
</script>

<svelte:head>
  <title>Daftar Pesanan</title>
</svelte:head>

<div class="header">
  <h1>Daftar Pesanan</h1>
  <div class="button-group">
    <button class="order-btn" on:click={goToOrders}>
      <i class="bi bi-list-check"></i> Daftar Pesanan
    </button>
  </div>
</div>

<div class="search-box">
  <i class="bi bi-search"></i>
  <input type="text" placeholder="Cari ID pesanan..." bind:value={search} />
</div>

{#if loading}
  <p>Loading...</p>
{:else if orders.length === 0}
  <p>Tidak ada pesanan masuk</p>
{:else}
  <table border="1" cellpadding="8">
    <thead>
      <tr>
        <th>Order ID</th>
        <th>Tanggal</th>
        <th>Total Harga</th>
        <th>Status Pembayaran</th>
        <th>Status Pesanan</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody>
      {#each orders as order}
        <tr>
          <td>{order.id}</td>
          <td>{new Date(order.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</td>
          <td>Rp {order.total_price.toLocaleString()}</td>
          <td><span class="badge {order.payment_status}">{order.payment_status}</span></td>
          <td><span class="badge {order.order_status}">{order.order_status}</span></td>
          <td class="action-cell">
            <div class="action-wrapper">
              <button type="button" on:click={() => openOrderDetail(order.id)} class="btn-icon btn-view" title="Detail Pesanan">
                <i class="bi bi-eye"></i>
              </button>

              {#if order.order_status === "pending" || order.order_status === "paid"}
                <button on:click={() => takeOrder(order.id)} class="btn-icon btn-take" title="Terima Pesanan">
                  <i class="bi bi-check-circle"></i>
                </button>
                <button on:click={() => rejectOrder(order.id)} class="btn-icon btn-reject" title="Tolak Pesanan">
                  <i class="bi bi-x-circle"></i>
                </button>
              {/if}

              {#if order.order_status === "taken" || order.order_status === "processing"}
                <button on:click={() => sendShipmentProof(order.id)} class="btn-icon btn-ship" title="Upload Bukti Kirim">
                  <i class="bi bi-truck"></i>
                </button>
              {/if}
            </div>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}

<style>
  /* DESIGN KOLOM ACTION BERSIH TANPA NTH-CHILD CONFLICT */
  .action-cell { width: 160px; text-align: center; vertical-align: middle; }
  .action-wrapper { display: flex; justify-content: space-evenly; align-items: center; width: 100%; gap: 6px; }
  .action-wrapper button { flex: 1; height: 42px; border: none; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease; }
  .action-wrapper button:hover { filter: brightness(0.9); }
  .action-wrapper button i { font-size: 22px; }

  /* WARNA TOMBOL SPESIFIK */
  .btn-view { background-color: #84b2f8 !important; }
  .btn-view i { color: #0d6efd !important; }

  .btn-take { background-color: #d4edda !important; }
  .btn-take i { color: #155724 !important; }

  .btn-ship { background-color: #ffd895 !important; }
  .btn-ship i { color: #856404 !important; }

  .btn-reject { background-color: #ffb1b1 !important; }
  .btn-reject i { color: #dc3545 !important; }

  /* CSS MODAL DETAIL PESANAN */
  .modal-backdrop { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 9999; }
  .modal-box { background: white; width: 90%; max-width: 500px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); overflow: hidden; animation: fadeIn 0.2s ease-out; }
  .modal-header-detail { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 15px 20px; border-bottom: 1px solid #e2e8f0; }
  .modal-header-detail h3 { margin: 0; font-size: 1.2rem; color: #1e293b; }
  .btn-close-detail { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #94a3b8; }
  .btn-close-detail:hover { color: #1e293b; }
  .modal-body-detail { padding: 20px; max-height: 75vh; overflow-y: auto; text-align: left; }
  .info-summary { background: #f1f5f9; padding: 12px; border-radius: 8px; margin-bottom: 15px; font-size: 0.95rem; }
  .mono { font-family: monospace; color: #475569; }
  .item-list { list-style: none; padding: 0; margin: 0 0 15px 0; }
  .item-list li { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0; font-size: 0.95rem; }
  .total-bar { display: flex; justify-content: space-between; background: #f0fdf4; padding: 12px; border-radius: 6px; color: #16a34a; font-weight: bold; margin-bottom: 20px; }
  .shipping-proof-section { border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 15px; }
  .img-proof { width: 100%; max-height: 200px; object-fit: contain; border-radius: 6px; border: 1px solid #cbd5e1; margin-top: 8px; background: #fafafa; }
  .no-proof { font-size: 0.9rem; color: #94a3b8; font-style: italic; margin-top: 5px; }
  .center-text { text-align: center; color: #64748b; }
  .status-badge { background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 0.8rem; text-transform: uppercase; }
  .status-badge.payment { background: #e2e8f0; color: #475569; margin-left: 5px;}
  @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

  /* PANEL UTAMA */
  h1 { margin-bottom: 20px; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .button-group { display: flex; gap: 12px; }
  .order-btn { padding: 8px 16px; background: #f8f9fa; color: #495057; border: 1px solid #ced4da; border-radius: 6px; cursor: pointer; font-weight: 500; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 10px; border-bottom: 1px solid #ddd; text-align: left; }
  th { background: #f0f0f0; }
  .search-box { display: flex; align-items: center; gap: 8px; width: 300px; padding: 8px 12px; border: 1px solid #ddd; border-radius: 8px; background: #fff; margin-bottom: 10px; }
  .search-box input { border: none; outline: none; flex: 1; font-size: 14px; }
  .badge { padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; font-weight: bold; text-transform: capitalize; }
  .pending { background: #fff3cd; color: #856404; }
  .paid { background: #d4edda; color: #155724; }
  .processing, .taken { background: #cce5ff; color: #004085; }
  .rejected, .canceled { background: #f8d7da; color: #721c24; }
  .completed { background: #d4edda; color: #155724; }
</style>