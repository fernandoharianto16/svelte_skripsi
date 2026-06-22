<script>
  import { onMount } from "svelte";
  import api from "$lib/api/axios";
  import { auth } from "$lib/firebase";
  import { onAuthStateChanged } from "firebase/auth";
  import Swal from "sweetalert2";

  // State Utama Daftar Order
  let orders = [];
  let loading = true;
  let search = "";

  // State Modal Detail Pesanan
  let showModal = false;
  let modalLoading = false;
  let selectedOrderId = "";
  let orderMain = null;
  let orderItems = [];

  onMount(() => {
    onAuthStateChanged(auth, async (user) => {
      if (user) await loadOrders();
    });
  });

  async function loadOrders() {
    try {
      loading = true;
      const res = await api.get(`/buyer/orders`);
      orders = res.data.data;
    } catch (err) {
      console.error(err);
    } finally {
      loading = false;
    }
  }

  async function openDetailModal(orderId) {
    selectedOrderId = orderId;
    showModal = true;
    modalLoading = true;
    try {
      const res = await api.get(`/buyer/orders/${orderId}`);
      
      console.log("Data asli dari backend:", res.data);
      
      // Ambil datanya ke dalam variabel lokal terlebih dahulu
      const dataRespons = res.data;
      
      if (dataRespons && dataRespons.order) {
        // Ambil objek order utama
        orderMain = dataRespons.order;
        
        // Ambil array details secara aman, beri fallback array kosong jika null/undefined
        const listDetail = dataRespons.details || [];
        
        // Iterasi/petakan ulang datanya ke orderItems agar Svelte mendeteksi array baru
        orderItems = [...listDetail];
        
        console.log("orderItems berhasil diisi & direfresh:", orderItems);
      } else {
        console.error("Struktur data tidak sesuai:", dataRespons);
      }
      
    } catch (err) {
      console.error("Gagal mengambil detail:", err);
      Swal.fire("Gagal", "Tidak dapat mengambil detail pesanan", "error");
      showModal = false;
    } finally {
      modalLoading = false;
    }
  }

  function closeModal() {
    showModal = false;
    orderMain = null;
    orderItems = [];
  }

  async function completeOrder(orderId) {
    const result = await Swal.fire({
      title: "Konfirmasi Penerimaan",
      text: "Apakah Anda yakin barang sudah diterima dengan kondisi baik?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#20c997",
      cancelButtonColor: "#dc3545",
      confirmButtonText: "Ya, Sudah Diterima!",
    });

    if (!result.isConfirmed) return;

    try {
      await api.patch(`/buyer/orders/${orderId}/status`, { status: "completed" });
      orders = orders.map((o) => o.id === orderId ? { ...o, order_status: "completed" } : o);
      Swal.fire("Terima Kasih!", "Pesanan Anda telah selesai.", "success");
    } catch (error) {
      console.error(error);
      Swal.fire("Gagal!", "Terjadi kesalahan saat mengonfirmasi pesanan.", "error");
    }
  }

  async function payOrder(orderId) {
    const result = await Swal.fire({
      title: "Konfirmasi Pembayaran",
      text: "Lanjutkan pembayaran pesanan ini?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#ffc107",
      cancelButtonColor: "#dc3545",
      confirmButtonText: "Ya, Bayar Sekarang!",
    });

    if (!result.isConfirmed) return;

    try {
      Swal.fire({
        title: "Menyiapkan pembayaran...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const response = await api.post(`/payments/${orderId}`);
      const { token } = response.data;
      Swal.close();

      window.snap.pay(token, {
        onSuccess: async function () {
          orders = orders.map((o) => o.id === orderId ? { ...o, payment_status: "paid", order_status: "processing" } : o);
          Swal.fire("Pembayaran Berhasil!", "Terima kasih telah berbelanja.", "success");
          await api.post(`/payments/update/${orderId}`);
        },
        onPending: () => Swal.fire("Menunggu Pembayaran", "Silakan selesaikan pembayaran Anda.", "info"),
        onError: () => Swal.fire("Gagal", "Pembayaran gagal diproses.", "error"),
      });
    } catch (error) {
      console.error("Error pembayaran:", error);
      Swal.fire("Gagal!", "Terjadi kesalahan sistem pembayaran.", "error");
    }
  }
</script>

<svelte:head>
  <title>Daftar Pesanan</title>
</svelte:head>

<div class="header">
  <h1>Daftar Pesanan Saya</h1>
</div>

<div class="back-navigation">
  <a href="/buyer/product" class="btn-back">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <line x1="19" y1="12" x2="5" y2="12"></line>
      <polyline points="12 19 5 12 12 5"></polyline>
    </svg>
    Kembali ke Daftar Produk
  </a>
</div>

<div class="search-box">
  <i class="bi bi-search"></i>
  <input type="text" placeholder="Cari produk..." bind:value={search} />
</div>

{#if loading}
  <p>Loading...</p>
{:else if orders.length === 0}
  <p>Tidak ada produk</p>
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
              <button type="button" on:click={() => openDetailModal(order.id)} class="btn-icon btn-view" title="Detail">
                <i class="bi bi-eye"></i>
              </button>

              {#if order.payment_status === "pending" && order.order_status === "taken"}
                <button on:click={() => payOrder(order.id)} class="btn-icon btn-pay" title="Bayar Sekarang">
                  <i class="bi bi-wallet2"></i>
                </button>
              {/if}

              {#if order.order_status === "shipped"}
                <button on:click={() => completeOrder(order.id)} class="btn-icon btn-finish" title="Terima Barang">
                  <i class="bi bi-check-square"></i>
                </button>
              {/if}
            </div>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}

{#if showModal}
  <div class="modal-backdrop" on:click={closeModal}>
    <div class="modal-box" on:click|stopPropagation>
      <div class="modal-header">
        <h3>Detail Pesanan</h3>
        <button class="btn-close" on:click={closeModal}>&times;</button>
      </div>

      <div class="modal-body">
        {#if modalLoading}
          <p class="center-text">Sedang memuat data...</p>
        {:else}
          <div class="info-summary">
            <p><strong>Order ID:</strong> <span class="mono">{selectedOrderId}</span></p>
            <p><strong>Status Pesanan:</strong> <span class="status-badge">{orderMain?.order_status}</span></p>
          </div>

          <h4>Daftar Item:</h4>
          <ul class="item-list">
            {#each orderItems as item}
              <li>
                <span>{item.product_name_at_purchase} (x{item.quantity})</span>
                <strong>Rp {(item.product_price_at_purchase * item.quantity).toLocaleString("id-ID")}</strong>
              </li>
            {/each}
          </ul>

          <div class="total-bar">
            <span>Total Pembayaran:</span>
            <strong>Rp {orderMain?.total_price?.toLocaleString("id-ID")}</strong>
          </div>

          <div class="shipping-proof-section">
            <h4>Bukti Pengiriman:</h4>
            {#if orderMain?.shipment_proof}
              <img src={orderMain.shipment_proof} alt="Bukti Resi" class="img-proof" />
            {:else}
              <p class="no-proof">Penjual belum mengunggah bukti pengiriman resmi.</p>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  /* CONFIG MODAL POPUP */
  .modal-backdrop { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 9999; }
  .modal-box { background: white; width: 90%; max-width: 500px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); overflow: hidden; animation: fadeIn 0.2s ease-out; }
  .modal-header { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 15px 20px; border-bottom: 1px solid #e2e8f0; }
  .modal-header h3 { margin: 0; font-size: 1.2rem; color: #1e293b; }
  .btn-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #94a3b8; }
  .btn-close:hover { color: #1e293b; }
  .modal-body { padding: 20px; max-height: 75vh; overflow-y: auto; }
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
  @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

  /* CONFIG ACTION CELL & BUTTON SESUAI GAMBAR */
  .action-cell { width: 150px; text-align: center; vertical-align: middle; }
  .action-wrapper { display: flex; justify-content: space-evenly; align-items: center; width: 100%; gap: 6px; }
  .action-wrapper button { flex: 1; height: 42px; border: none; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease; }
  .action-wrapper button:hover { filter: brightness(0.9); }
  .action-wrapper button i { font-size: 22px; }

  /* WARNA SEPERTI DI GAMBAR CONTOH */
  .btn-view { background-color: #84b2f8 !important; }
  .btn-view i { color: #0d6efd !important; } /* Icon mata biru tua di atas background biru muda */

  .btn-pay { background-color: #ffd895 !important; }
  .btn-pay i { color: #212529 !important; } /* Icon dompet gelap di atas background kuning muda */

  .btn-finish { background-color: rgb(88, 209, 99) !important; }
  .btn-finish i { color: #2b1e20 !important; } /* Icon centang merah di atas background merah muda */

  /* GAYA NAVIGASI & TABEL UTAMA */
  .back-navigation { margin-bottom: 20px; }
  .btn-back { display: inline-flex; align-items: center; gap: 8px; color: #4b5563; text-decoration: none; font-size: 0.95rem; font-weight: 500; transition: color 0.2s ease; }
  .btn-back:hover { color: #2563eb; }
  h1 { margin-bottom: 20px; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 10px; border-bottom: 1px solid #ddd; text-align: left; }
  th { background: #f0f0f0; }
  .search-box { display: flex; align-items: center; gap: 8px; width: 300px; padding: 8px 12px; border: 1px solid #ddd; border-radius: 8px; background: #fff; margin-bottom: 10px; }
  .search-box input { border: none; outline: none; flex: 1; font-size: 14px; }

  /* BADGE STATUS */
  .badge { padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; font-weight: bold; text-transform: capitalize; }
  .pending { background: #fff3cd; color: #856404; }
  .paid { background: #d4edda; color: #155724; }
  .processing, .taken { background: #cce5ff; color: #004085; }
  .shipped { background: #ffffff; color: #155724; }
  .rejected { background: #f8d7da; color: #721c24; }
  .completed { background: #d4edda; color: #155724; }
</style>