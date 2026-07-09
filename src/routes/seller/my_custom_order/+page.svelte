<script>
  import { onMount } from "svelte";
  export let params;
  import api from "$lib/api/axios";
  import { auth } from "$lib/firebase";
  import { onAuthStateChanged } from "firebase/auth";
  import Swal from "sweetalert2";
  import { goto } from "$app/navigation";

  let customRequests = [];
  let loading = true;

  let search = "";

  // State untuk Modal Detail Custom Request (Seller)
  let showDetailModal = false;
  let modalLoading = false;
  let selectedRequestId = "";
  let requestMain = null;

  onMount(() => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        console.error("User belum login");
        return;
      }
      await loadMyCustomRequests();
    });
  });

  // Ambil daftar custom request yang di-handle oleh seller ini
  async function loadMyCustomRequests() {
    try {
      loading = true;
      // Mengarah ke endpoint GET khusus pesanan kustom milik seller
      const res = await api.get(`/seller/custom_request/all`);
      customRequests = res.data;
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Gagal memuat proyek kustom Anda.", "error");
    } finally {
      loading = false;
    }
  }

  // Fungsi untuk Membuka Modal Detail Permintaan Kustom
  async function openRequestDetail(requestId) {
    selectedRequestId = requestId;
    showDetailModal = true;
    modalLoading = true;

    try {
      // Panggil endpoint backend yang baru saja kita buat
      const res = await api.get(`/seller/custom_request/${requestId}`);

      // Masukkan data hasil response ke dalam variabel state
      requestMain = res.data;
    } catch (err) {
      console.error(err);
      Swal.fire(
        "Gagal",
        "Tidak dapat mengambil detail permintaan kustom",
        "error",
      );
      showDetailModal = false;
    } finally {
      modalLoading = false;
    }
  }

  function closeDetailModal() {
    showDetailModal = false;
    requestMain = null;
  }

  // Aksi Penjual menyetujui kustomisasi setelah diskusi/negosiasi awal selesai
  async function acceptProject(requestId) {
    const result = await Swal.fire({
      title: "Setujui Pengerjaan?",
      text: "Anda akan menyetujui permintaan ini dan menunggu pembeli melakukan pembayaran.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#28a745",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Ya, Setujui!",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      // Mengirim patch update status menjadi accepted
      await api.patch(`/seller/custom_request/${requestId}`, {
        status: "accepted",
      });

      customRequests = customRequests.map((req) =>
        req.custom_request_id === requestId
          ? { ...req, request_status: "accepted" }
          : req,
      );
      Swal.fire(
        "Berhasil!",
        "Permintaan disetujui, menunggu pembayaran dari pembeli.",
        "success",
      );
    } catch (error) {
      console.error(error);
      Swal.fire(
        "Gagal!",
        "Terjadi kesalahan saat memperbarui status.",
        "error",
      );
    }
  }

  // Upload Bukti Hasil Pengerjaan / Pengiriman Produk Kustom
  async function sendShipmentProof(requestId) {
    const { value: file } = await Swal.fire({
      title: "Upload Bukti Pengiriman / Hasil Kustom",
      input: "file",
      inputAttributes: {
        accept: "image/*",
        "aria-label": "Pilih foto bukti pengiriman",
      },
      showCancelButton: true,
      confirmButtonText: "Kirim Bukti",
      cancelButtonText: "Batal",
    });

    if (file) {
      const formData = new FormData();
      formData.append("product_image", file); // Disesuaikan dengan penanganan multer backend
      formData.append("status", "shipped");

      try {
        Swal.showLoading();
        // Menembak ke endpoint pengiriman/penyelesaian custom request Anda
        await api.post(`/seller/custom_request/ship/${requestId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        customRequests = customRequests.map((r) =>
          r.custom_request_id === requestId
            ? { ...r, request_status: "shipped" }
            : r,
        );

        Swal.fire(
          "Berhasil!",
          "Bukti pengiriman kustom telah diupload.",
          "success",
        );
        await loadMyCustomRequests();
      } catch (error) {
        console.error("Gagal mengirim bukti:", error);
        Swal.fire(
          "Gagal",
          "Terjadi kesalahan saat upload gambar bukti.",
          "error",
        );
      }
    }
  }

  // Reaktifitas pencarian
  $: filteredRequests = customRequests.filter(
    (req) =>
      req.custom_request_id?.toLowerCase().includes(search.toLowerCase()) ||
      req.request_description?.toLowerCase().includes(search.toLowerCase()),
  );
</script>

<svelte:head>
  <title>Proyek Custom Request Saya</title>
</svelte:head>

<div class="header">
  <h1>Proyek Custom Order Saya</h1>
</div>

<div class="search-box">
  <i class="bi bi-search"></i>
  <input
    type="text"
    placeholder="Cari ID atau deskripsi..."
    bind:value={search}
  />
</div>

{#if loading}
  <p>Loading...</p>
{:else if filteredRequests.length === 0}
  <p>Tidak ada proyek kustom yang sedang Anda tangani.</p>
{:else}
  <table border="1" cellpadding="8">
    <thead>
      <tr>
        <th>Gambar Produk</th>
        <th>Request ID</th>
        <th>Tanggal Masuk</th>
        <th>Harga Negosiasi</th>
        <th>Status Proyek</th>
        <th>Status Pembayaran</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody>
      {#each filteredRequests as req}
        <tr>
          <td>
            {#if req.reference_image}
              <img
                src={req.reference_image}
                alt="Referensi"
                class="table-img"
              />
            {:else}
              <span class="no-img">No Image</span>
            {/if}
          </td>
          <td class="mono">{req.custom_request_id}</td>
          <td
            >{new Date(req.created_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}</td
          >
          <td>Rp {req.negotiated_price?.toLocaleString("id-ID")}</td>
          <td
            ><span class="badge {req.request_status}">{req.request_status}</span
            ></td
          >

          <td>
            <span class="badge {req.payment_status || 'unpaid'}">
              {req.payment_status || "Belum Bayar"}
            </span>
          </td>

          <td class="action-cell">
            <div class="action-wrapper">
              <button
                type="button"
                on:click={() => openRequestDetail(req.custom_request_id)}
                class="btn-icon btn-view"
                title="Detail Permintaan"
              >
                <i class="bi bi-eye"></i>
              </button>

              {#if req.request_status === "pending"}
                <button
                  on:click={() => acceptProject(req.custom_request_id)}
                  class="btn-icon btn-take"
                  title="Setujui Pengerjaan"
                >
                  <i class="bi bi-check-circle"></i>
                </button>
              {/if}

              {#if req.request_status === "processing" && req.payment_status == "paid"}
                <button
                  on:click={() => sendShipmentProof(req.custom_request_id)}
                  class="btn-icon btn-ship"
                  title="Upload Bukti Hasil/Kirim"
                >
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

{#if showDetailModal}
  <div class="modal-backdrop" on:click={closeDetailModal}>
    <div class="modal-box" on:click|stopPropagation>
      <div class="modal-header-detail">
        <h3>Detail Permintaan Kustom</h3>
        <button class="btn-close-detail" on:click={closeDetailModal}
          >&times;</button
        >
      </div>

      <div class="modal-body-detail">
        {#if modalLoading}
          <p class="center-text">Sedang memuat detail data...</p>
        {:else if requestMain}
          <div class="info-summary">
            <p>
              <strong>ID Permintaan:</strong>
              <span class="mono">{requestMain.custom_request_id}</span>
            </p>
            <p>
              <strong>Status Proyek:</strong>
              <span class="badge {requestMain.request_status}"
                >{requestMain.request_status}</span
              >
            </p>
            <p>
              <strong>Status Pembayaran:</strong>
              <span class="badge {requestMain.payment_status || 'unpaid'}">
                {requestMain.payment_status || "Belum Bayar"}
              </span>
            </p>
            <p>
              <strong>Tanggal Masuk:</strong>
              {new Date(requestMain.created_at).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

          <div style="margin-bottom: 15px;">
            <label
              style="font-weight: bold; display: block; margin-bottom: 5px;"
              >Deskripsi Permintaan:</label
            >
            <div class="desc-text-box">
              {requestMain.request_description}
            </div>
          </div>

          <div class="total-bar">
            <span>Harga Kesepakatan / Negosiasi:</span>
            <span
              >Rp {requestMain.negotiated_price?.toLocaleString("id-ID")}</span
            >
          </div>

          <h4>Foto Referensi Produk:</h4>
            {#if requestMain?.reference_image}
              <img src={requestMain.reference_image} alt="Referensi Desain" class="img-proof" />
            {:else}
              <p class="no-proof">Tidak menyertakan gambar acuan desain.</p>
            {/if}

          <div class="shipping-proof-section">
            <label style="font-weight: bold; display: block;"
              >Bukti Hasil / Pengiriman:</label
            >
            {#if requestMain.shipment_proof_image}
              <img
                src={requestMain.shipment_proof_image}
                alt="Bukti Pengiriman"
                class="img-proof"
              />
              {#if requestMain.shipped_at}
                <p style="font-size: 0.8rem; color: #64748b; margin-top: 5px;">
                  Dikirim pada: {new Date(
                    requestMain.shipped_at,
                  ).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              {/if}
            {:else}
              <p class="no-proof">Belum ada bukti pengerjaan yang diunggah.</p>
            {/if}
          </div>
        {:else}
          <p class="center-text" style="color: #ef4444;">
            Gagal memuat data detail proyek.
          </p>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  /* MENJAGA KONSISTENSI DESIGN BERSIH ANDA */
  .action-cell {
    width: 120px;
    text-align: center;
    vertical-align: middle;
  }
  .action-wrapper {
    display: flex;
    justify-content: space-evenly;
    align-items: center;
    width: 100%;
    gap: 6px;
  }
  .action-wrapper button {
    flex: 1;
    height: 42px;
    border: none;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .action-wrapper button:hover {
    filter: brightness(0.9);
  }
  .action-wrapper button i {
    font-size: 22px;
  }

  .btn-view {
    background-color: #84b2f8 !important;
  }
  .btn-view i {
    color: #0d6efd !important;
  }

  .btn-take {
    background-color: #d4edda !important;
  }
  .btn-take i {
    color: #155724 !important;
  }

  .btn-ship {
    background-color: #ffd895 !important;
  }
  .btn-ship i {
    color: #856404 !important;
  }

  .text-truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .desc-text-box {
    background: #f8fafc;
    padding: 10px;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    font-size: 0.95rem;
    white-space: pre-line;
  }

  /* CSS MODAL POPUP */
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
  }
  .modal-box {
    background: white;
    width: 90%;
    max-width: 500px;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    overflow: hidden;
    animation: fadeIn 0.2s ease-out;
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
    font-size: 1.2rem;
    color: #1e293b;
  }
  .btn-close-detail {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #94a3b8;
  }
  .modal-body-detail {
    padding: 20px;
    max-height: 75vh;
    overflow-y: auto;
    text-align: left;
  }
  .info-summary {
    background: #f1f5f9;
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 15px;
    font-size: 0.95rem;
  }
  .mono {
    font-family: monospace;
    color: #475569;
    font-weight: bold;
  }
  .total-bar {
    display: flex;
    justify-content: space-between;
    background: #f0fdf4;
    padding: 12px;
    border-radius: 6px;
    color: #16a34a;
    font-weight: bold;
    margin-bottom: 20px;
  }
  .shipping-proof-section {
    border-top: 1px solid #e2e8f0;
    padding-top: 15px;
    margin-top: 15px;
  }
  .img-proof {
    width: 100%;
    max-height: 200px;
    object-fit: contain;
    border-radius: 6px;
    border: 1px solid #cbd5e1;
    margin-top: 8px;
    background: #fafafa;
  }
  .no-proof {
    font-size: 0.9rem;
    color: #94a3b8;
    font-style: italic;
    margin-top: 5px;
  }
  .center-text {
    text-align: center;
    color: #64748b;
  }
  .status-badge {
    background: #e0f2fe;
    color: #0369a1;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: bold;
    font-size: 0.8rem;
    text-transform: uppercase;
  }

  /* PANEL UTAMA */
  h1 {
    margin-bottom: 20px;
    font-size: 24px;
    font-weight: bold;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }
  .button-group {
    display: flex;
    gap: 12px;
  }
  .order-btn {
    padding: 8px 16px;
    background: #f8f9fa;
    color: #495057;
    border: 1px solid #ced4da;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th,
  td {
    padding: 10px;
    border-bottom: 1px solid #ddd;
    text-align: left;
  }
  th {
    background: #f0f0f0;
  }
  .search-box {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 300px;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 8px;
    background: #fff;
    margin-bottom: 10px;
  }
  .search-box input {
    border: none;
    outline: none;
    flex: 1;
    font-size: 14px;
  }

  /* BADGE WARNA */
  .badge {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: bold;
    text-transform: capitalize;
  }
  .pending {
    background: #fff3cd;
    color: #856404;
  }
  .accepted,
  .processing {
    background: #cce5ff;
    color: #004085;
  }
  .paid,.completed {
    background: #d4edda;
    color: #155724;
  }
  .shipped {
    background: #e2e8f0;
    color: #475569;
  }
  .table-img {
    width: 70px;
    height: 70px;
    object-fit: cover;
    display: block;
  }
  .img-proof { width: 100%; max-height: 220px; object-fit: contain; border: 1px solid #000; margin-top: 8px; background: #fafafa; }
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
