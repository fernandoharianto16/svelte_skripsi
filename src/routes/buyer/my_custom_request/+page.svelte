<script>
    import { onMount } from "svelte";
    import api from "$lib/api/axios";
    import { auth } from "$lib/firebase";
    import { onAuthStateChanged } from "firebase/auth";
    import Swal from "sweetalert2";

    // State Utama Daftar Custom Request
    let customRequests = [];
    let loading = true;
    let search = "";

    // State Modal Detail Custom Request
    let showModal = false;
    let modalLoading = false;
    let selectedRequestId = "";
    let requestDetail = null;

    onMount(() => {
        onAuthStateChanged(auth, async (user) => {
            if (user) await loadCustomRequests();
        });
    });

    // Ambil data custom request milik buyer yang sedang login
    async function loadCustomRequests() {
        try {
            loading = true;
            const res = await api.get(`/buyer/custom_request`);
            customRequests = res.data;
        } catch (err) {
            console.error(err);
            Swal.fire("Error", "Gagal memuat data custom request.", "error");
        } finally {
            loading = false;
        }
    }

    // Buka Modal untuk melihat detail spesifik custom request
    async function openDetailModal(requestId) {
        selectedRequestId = requestId;
        showModal = true;
        modalLoading = true;
        try {
            const res = await api.get(`/buyer/custom_request/${requestId}`);
            requestDetail = res.data;
        } catch (err) {
            console.error("Gagal mengambil detail:", err);
            Swal.fire(
                "Gagal",
                "Tidak dapat mengambil detail permintaan kustom",
                "error",
            );
            showModal = false;
        } finally {
            modalLoading = false;
        }
    }

    function closeModal() {
        showModal = false;
        requestDetail = null;
    }

    // Pembayaran Uang Muka / Pelunasan Custom Request via Midtrans Snap
    async function payCustomRequest(requestId) {
        const result = await Swal.fire({
            title: "Konfirmasi Pembayaran",
            text: "Lanjutkan proses pembayaran untuk pesanan custom ini?",
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#000",
            cancelButtonColor: "#dc3545",
            confirmButtonText: "Ya, Bayar Sekarang!",
        });

        if (!result.isConfirmed) return;

        try {
            Swal.fire({
                title: "Menyiapkan gerbang pembayaran...",
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading(),
            });

            const response = await api.post(`/payments/custom/${requestId}`);
            const { token } = response.data;
            Swal.close();

            window.snap.pay(token, {
                onSuccess: async function (result) {
                    Swal.fire({
                        title: "Memperbarui status pesanan...",
                        allowOutsideClick: false,
                        didOpen: () => Swal.showLoading(),
                    });

                    try {
                        await api.post(`/payments/custom/update/${requestId}`);

                        customRequests = customRequests.map((r) =>
                            r.custom_request_id === requestId
                                ? { ...r, payment_status: "paid", request_status: "paid" }
                                : r,
                        );

                        Swal.fire(
                            "Pembayaran Berhasil!",
                            "Pesanan kustom Anda akan segera diproses penuh.",
                            "success",
                        );
                        
                        await loadCustomRequests(); 
                    } catch (updateErr) {
                        console.error("Gagal memperbarui database:", updateErr);
                        Swal.fire("Peringatan", "Pembayaran berhasil, namun sistem gagal memperbarui status internal.", "warning");
                    }
                },
                onPending: () =>
                    Swal.fire(
                        "Menunggu Pembayaran",
                        "Silakan tuntaskan transaksi Anda.",
                        "info",
                    ),
                onError: () =>
                    Swal.fire("Gagal", "Pembayaran gagal diproses.", "error"),
            });
        } catch (error) {
            console.error("Error pembayaran kustom:", error);
            Swal.fire(
                "Gagal!",
                "Terjadi kesalahan pada sistem pembayaran otomatis.",
                "error",
            );
        }
    }

    // 🌟 FUNGSI BARU: Buyer Menerima Pesanan (Selesai)
    async function confirmReceipt(requestId) {
        const result = await Swal.fire({
            title: "Terima Pesanan?",
            text: "Apakah Anda yakin produk kustom yang diterima sudah sesuai? Tindakan ini tidak dapat dibatalkan.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#28a745",
            cancelButtonColor: "#000",
            confirmButtonText: "Ya, Sesuai!",
            cancelButtonText: "Batal",
        });

        if (!result.isConfirmed) return;

        try {
            Swal.showLoading();
            // Menembak endpoint patch/post ke backend pembeli untuk update status jadi completed
            await api.patch(`/buyer/custom_request/complete/${requestId}`);

            // Update state tampilan lokal secara instan
            customRequests = customRequests.map((r) =>
                r.custom_request_id === requestId ? { ...r, request_status: "completed" } : r
            );

            Swal.fire("Selesai!", "Terima kasih, pesanan kustom telah dinyatakan selesai.", "success");
            await loadCustomRequests();
        } catch (error) {
            console.error("Gagal menerima pesanan:", error);
            Swal.fire("Gagal", "Terjadi kesalahan saat menyelesaikan pesanan.", "error");
        }
    }

    // Filter pencarian berdasarkan isi teks deskripsi
    $: filteredRequests = customRequests.filter((req) =>
        req.request_description?.toLowerCase().includes(search.toLowerCase()),
    );
</script>

<svelte:head>
    <title>My Custom Requests</title>
</svelte:head>

<div class="header">
    <h1>Permintaan Kustom Saya</h1>
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
    <input type="text" placeholder="Cari custom request..." bind:value={search} />
</div>

{#if loading}
    <p class="center-text">Memuat daftar permintaan...</p>
{:else if filteredRequests.length === 0}
    <p class="center-text">Tidak ada riwayat permintaan kustom ditemukan.</p>
{:else}
    <table>
        <thead>
            <tr>
                <th width="15%">Foto Referensi</th>
                <th width="15%">Request ID</th>
                <th width="15%">Tanggal Dibuat</th>
                <th width="15%">Anggaran Anda</th>
                <th width="15%">Status Permintaan</th>
                <th width="13%">Status Pembayaran</th> 
                <th width="12%">Aksi</th>
            </tr>
        </thead>
        <tbody>
            {#each filteredRequests as req}
                <tr>
                    <td>
                        {#if req.reference_image}
                            <img src={req.reference_image} alt="Referensi" class="table-img" />
                        {:else}
                            <span class="no-img">No Image</span>
                        {/if}
                    </td>
                    <td class="mono">{req.custom_request_id}</td>
                    <td>
                        {new Date(req.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                        })}
                    </td>
                    <td class="price-text">
                        Rp {req.negotiated_price?.toLocaleString("id-ID")}
                    </td>
                    <td>
                        <span class="badge {req.request_status}">
                            {req.request_status}
                        </span>
                    </td>
                    <td>
                        <span class="badge {req.payment_status || 'unpaid'}">
                            {req.payment_status || "unpaid"}
                        </span>
                    </td>
                    <td class="action-cell">
                        <div class="action-wrapper">
                            <button type="button" on:click={() => openDetailModal(req.custom_request_id)} class="btn-icon btn-view" title="Lihat Detail">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                            </button>

                            {#if req.request_status === "accepted" && req.payment_status !== "settlement" && req.payment_status !== "paid"}
                                <button on:click={() => payCustomRequest(req.custom_request_id)} class="btn-icon btn-pay" title="Bayar Sekarang">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
                                        <line x1="12" y1="20" x2="12" y2="4" />
                                    </svg>
                                </button>
                            {/if}

                            {#if req.request_status === "shipped"}
                                <button on:click={() => confirmReceipt(req.custom_request_id)} class="btn-icon btn-complete" title="Pesanan Diterima / Selesai">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
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
        <h3>Detail Permintaan Kustom</h3>
        <button class="btn-close" on:click={closeModal}>&times;</button>
      </div>

      <div class="modal-body">
        {#if modalLoading}
          <p class="center-text">Sedang memuat data...</p>
        {:else}
          <div class="info-summary">
            <p><strong>Request ID:</strong> <span class="mono">{selectedRequestId}</span></p>
            <p><strong>Status Terkini:</strong> <span class="status-badge {requestDetail?.request_status}">{requestDetail?.request_status}</span></p>
            <p><strong>ID Penjual Pengerja:</strong> <span class="mono">{requestDetail?.seller_id || "Mencari Penjual..."}</span></p>
          </div>

          <h4>Deskripsi Permintaan Kustom:</h4>
          <div class="desc-box">
            {requestDetail?.request_description || "Tidak ada deskripsi rinci."}
          </div>

          <div class="total-bar">
            <span>Anggaran Disepakati:</span>
            <strong>Rp {requestDetail?.negotiated_price?.toLocaleString("id-ID")}</strong>
          </div>

          <div class="shipping-proof-section">
            <h4>Foto Referensi Produk:</h4>
            {#if requestDetail?.reference_image}
              <img src={requestDetail.reference_image} alt="Referensi Desain" class="img-proof" />
            {:else}
              <p class="no-proof">Tidak menyertakan gambar acuan desain.</p>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
    /* CSS bawaan Anda dijaga sepenuhnya */
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    h1 { font-weight: bold; font-size: 24px; }
    .back-navigation { margin-bottom: 20px; }
    .btn-back { display: inline-flex; align-items: center; gap: 8px; color: #4b5563; text-decoration: none; font-size: 0.95rem; font-weight: 600; }
    .btn-back:hover { color: #000; }
    .search-box { width: 300px; padding: 4px; margin-bottom: 20px; }
    .search-box input { width: 100%; padding: 10px; border: 2px solid #000; font-size: 14px; outline: none; }
    table { width: 100%; border-collapse: collapse; border: 2px solid #000; background: #fff; }
    th, td { padding: 12px; border: 1px solid #000; text-align: left; vertical-align: middle; font-size: 14px; }
    th { background: #000; color: #fff; text-transform: uppercase; font-weight: bold; }
    tr:hover { background-color: #f8fafc; }
    .table-img { width: 70px; height: 70px; object-fit: cover; border: 1px solid #000; display: block; }
    .no-img { font-size: 12px; color: #64748b; font-style: italic; }
    .price-text { font-weight: bold; }
    .mono { font-family: monospace; font-weight: bold; color: #334155; }
    .center-text { text-align: center; color: #64748b; padding: 20px; }
    .desc-box { background: #fafafa; padding: 12px; border: 1px solid #000; white-space: pre-line; line-height: 1.5; margin-bottom: 15px; }

    /* BADGE STATUS CUSTOM REQUEST */
    .badge { padding: 4px 8px; border-radius: 0px; font-size: 0.85rem; font-weight: bold; text-transform: uppercase; border: 1px solid #000; }
    .pending { background: #fff3cd; color: #856404; }
    .accepted { background: #cce5ff; color: #004085; }
    .paid { background: #d4edda; color: #155724; }
    .completed { background: #d4edda; color: #155724; }
    .shipped { background: #e2e8f0; color: #334155; } /* Tambahan style status shipped */

    /* CONFIG ACTION CELL & BUTTONS */
    .action-cell { width: 120px; text-align: center; }
    .action-wrapper { display: flex; justify-content: center; gap: 8px; }
    .btn-icon { width: 40px; height: 40px; border: 2px solid #000; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.1s; }
    .btn-icon:hover { transform: scale(1.05); }
    .btn-view { background-color: #84b2f8 !important; color: #0d6efd; }
    .btn-pay { background-color: #ffd895 !important; color: #b45309; }
    
    /* 🌟 STYLE BUTTON BARU: Cocok dengan tema brutalist kaku Anda */
    .btn-complete { background-color: #d4edda !important; color: #155724; }

    /* MODAL BOX SYSTEM */
    .modal-backdrop { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 9999; }
    .modal-box { background: white; width: 90%; max-width: 500px; border: 3px solid #000; overflow: hidden; animation: fadeIn 0.15s ease-out; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; background: #000; color: #fff; padding: 15px; }
    .modal-header h3 { margin: 0; font-size: 1.1rem; font-weight: bold; }
    .btn-close { background: none; border: none; font-size: 1.8rem; cursor: pointer; color: #fff; }
    .modal-body { padding: 20px; max-height: 75vh; overflow-y: auto; }
    .info-summary { background: #f1f5f9; padding: 12px; border: 1px solid #000; margin-bottom: 15px; font-size: 0.95rem; }
    .total-bar { display: flex; justify-content: space-between; background: #f0fdf4; padding: 12px; border: 1px solid #000; color: #16a34a; font-weight: bold; margin-bottom: 20px; }
    .shipping-proof-section { border-top: 2px dashed #000; padding-top: 15px; }
    .img-proof { width: 100%; max-height: 220px; object-fit: contain; border: 1px solid #000; margin-top: 8px; background: #fafafa; }
    .no-proof { font-size: 0.9rem; color: #64748b; font-style: italic; }
    .status-badge { padding: 2px 6px; font-weight: bold; font-size: 0.8rem; text-transform: uppercase; border: 1px solid #000; }

    @keyframes fadeIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
</style>