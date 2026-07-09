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
    
    // State Modal Daftar Negosiasi
    let selectedNegotiations = []; 
    let isNegoModalOpen = false;

    let selectedNegoId = null; // Menampung ID dokumen negosiasi yang sedang aktif ditawar balik
let counterPrice = 0;
let counterReason = "";

function openCounterForm(nego) {
    selectedNegoId = nego.id; // Pastikan objek nego Anda membawa kolom id dokumen dari Firestore
    counterPrice = nego.offered_price; // Harga default mengikuti penawaran lama
    counterReason = "";
}

function closeCounterForm() {
    selectedNegoId = null;
    isNegoModalOpen = false;
}

async function submitCounterOffer() {
    if (counterPrice <= 0 || !counterReason.trim()) {
        alert("Harga penawaran dan alasan wajib diisi dengan benar.");
        return;
    }
    try {
        // console.log(selectedNegoId);
        const response = await api.post(`/buyer/negotiations/${selectedNegoId}/counter`, {
            offered_price: counterPrice,
            bargain_reason: counterReason
        });
        closeNegoModal();
        if(response.status==200 || response.status==201){
            await Swal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: response.message,
                confirmButtonColor: '#3085d6',
                confirmButtonText: 'OK'
            });
        }

        closeCounterForm();
        // Jalankan fungsi fetch/refresh data nego Anda di sini
        
    } catch (error) {
        console.error("Error:", error);
        
        // Menangkap pesan error dari server (jika interceptor tidak memblokirnya)
        const errorMessage = error.response?.data?.message || "Gagal mengirim penawaran balik.";
        alert(errorMessage);
    }
}

    function formatThousand(value) {
        if (!value) return "0";
        return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }

    function closeNegoModal() {
        isNegoModalOpen = false;
        selectedNegotiations = [];
    }

    async function checkNegotiations(requestId) {
        try {
            const response = await api.get(`/buyer/custom_request/${requestId}/negotiations`);
            if (response.status === 200) {
                selectedNegotiations = response.data; 
                isNegoModalOpen = true; 
            }
            // console.log(selectedNegotiations);
        } catch (error) {
            console.error("Gagal mengambil data nego:", error);
            Swal.fire("Error", "Terjadi kesalahan saat mengambil data negosiasi.", "error");
        }
    }

    onMount(() => {
        onAuthStateChanged(auth, async (user) => {
            if (user) await loadCustomRequests();
        });
    });

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

    async function openDetailModal(requestId) {
        selectedRequestId = requestId;
        showModal = true;
        modalLoading = true;
        try {
            const res = await api.get(`/buyer/custom_request/${requestId}`);
            requestDetail = res.data;
        } catch (err) {
            console.error("Gagal mengambil detail:", err);
            Swal.fire("Gagal", "Tidak dapat mengambil detail permintaan kustom", "error");
            showModal = false;
        } finally {
            modalLoading = false;
        }
    }

    function closeModal() {
        showModal = false;
        requestDetail = null;
    }

// memilih penjual
async function handleAccept(customRequestId, sellerId) {
    try {
        console.log("id kustom request:", customRequestId);
        console.log("id seller:", sellerId);

        // Tampilkan loading/proses saat request dikirim
        Swal.fire({
            title: 'Memproses...',
            text: 'Sedang menerima pengajuan penjual',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const res = await api.post(`/buyer/custom_request/choose`, {
            custom_request_id: customRequestId,
            seller_id: sellerId
        });
        isNegoModalOpen=false;
        
        if (res.status === 200 || res.status === 201) {
            // Tutup loading lalu tampilkan alert sukses
            await Swal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: res.message,
                confirmButtonColor: '#3085d6',
                confirmButtonText: 'OK'
            });
            
            // Reload halaman setelah user menekan tombol 'OK'
            // location.reload();
        }
    } catch (err) {
        console.error("Gagal menerima penawaran:", err);
        
        const errorMessage = err.response?.data?.message || "Terjadi kesalahan pada server.";
        
        // Tampilkan alert error
        Swal.fire({
            icon: 'error',
            title: 'Gagal!',
            text: errorMessage,
            confirmButtonColor: '#d33'
        });
    }
}
async function handleReject(customRequestId, sellerId) {
    try {
        closeNegoModal();
        // 1. Tampilkan konfirmasi awal sebelum menolak penawaran
        const confirmResult = await Swal.fire({
            title: 'Apakah Anda yakin?',
            text: "Penawaran dari seller ini akan ditolak secara permanen.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Tolak!',
            cancelButtonText: 'Batal'
        });

        // Jika user menekan tombol 'Batal', hentikan fungsi
        if (!confirmResult.isConfirmed) return;

        console.log("Menolak kustom request ID:", customRequestId);
        console.log("ID seller ditolak:", sellerId);

        // 2. Tampilkan status proses loading
        Swal.fire({
            title: 'Memproses...',
            text: 'Sedang menolak pengajuan penjual',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // 3. Tembak endpoint reject ke backend Express Anda
        const res = await api.post(`/buyer/custom_request/reject`, {
            custom_request_id: customRequestId,
            seller_id: sellerId
        });
        
        isNegoModalOpen = false;

        // 4. Jika backend berhasil memproses penolakan
        if (res.status === 200 || res.status === 201) {
            await Swal.fire({
                icon: 'success',
                title: 'Berhasil Ditolak!',
                text: res.data?.message || "Penawaran penjual telah ditolak.",
                confirmButtonColor: '#3085d6',
                confirmButtonText: 'OK'
            });

            // Opsional: Jalankan fungsi refresh data/halaman di sini jika diperlukan
            // location.reload();
        }
    } catch (err) {
        console.error("Gagal menolak penawaran:", err);
        
        const errorMessage = err.response?.data?.message || "Terjadi kesalahan pada server.";
        
        // Tampilkan alert error jika backend menolak request
        Swal.fire({
            title: 'Gagal!',
            text: errorMessage,
            icon: 'error',
            confirmButtonColor: '#d33'
        });
    }
}

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
                                ? { ...r, payment_status: "paid", request_status: "processing" }
                                : r,
                        );
                        Swal.fire("Pembayaran Berhasil!", "Pesanan kustom Anda akan segera diproses penuh.", "success");
                        await loadCustomRequests(); 
                    } catch (updateErr) {
                        console.error("Gagal memperbarui database:", updateErr);
                        Swal.fire("Peringatan", "Pembayaran berhasil, namun sistem gagal memperbarui status internal.", "warning");
                    }
                },
                onPending: () => Swal.fire("Menunggu Pembayaran", "Silakan tuntaskan transaksi Anda.", "info"),
                onError: () => Swal.fire("Gagal", "Pembayaran gagal diproses.", "error"),
            });
        } catch (error) {
            console.error("Error pembayaran kustom:", error);
            Swal.fire("Gagal!", "Terjadi kesalahan pada sistem pembayaran otomatis.", "error");
        }
    }

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
            await api.patch(`/buyer/custom_request/${requestId}/complete`);
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

    $: filteredRequests = customRequests.filter((req) =>
        req.request_description?.toLowerCase().includes(search.toLowerCase()) ||
        req.custom_request_id?.toLowerCase().includes(search.toLowerCase())
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
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                            </button>
                            
                            {#if req.request_status === "pending"}
                                <button class="btn-check" on:click={() => checkNegotiations(req.custom_request_id)}>
                                    Cek
                                </button>
                            {/if}

                            {#if req.request_status === "accepted" && req.payment_status !== "settlement" && req.payment_status !== "paid"}
                                <button on:click={() => payCustomRequest(req.custom_request_id)} class="btn-icon btn-pay" title="Bayar Sekarang">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
                                        <path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
                                        <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" />
                                    </svg>
                                </button>
                            {/if}

                            {#if req.request_status === "shipped"}
                                <button on:click={() => confirmReceipt(req.custom_request_id)} class="btn-icon btn-complete" title="Pesanan Diterima / Selesai">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
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
            <p><strong>ID Penjual Pengerja:</strong> <span class="mono">{requestDetail?.seller_id || "Belum ada yang mengerjakan"}</span></p>
          </div>

          <h4>Deskripsi Permintaan Kustom:</h4>
          <div class="desc-box">
            {requestDetail?.request_description || "Tidak ada deskripsi rinci."}
          </div>

          <div class="total-bar">
                {#if requestDetail?.request_status === 'pending'}
                    <span>Anggaran:</span>
                {:else}
                    <span>Anggaran Disepakati:</span>
                {/if}
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

<!-- {#if isNegoModalOpen}
<div class="modal-backdrop" on:click={closeNegoModal}>
    <div class="nego-modal-box" on:click|stopPropagation>
        <div class="nego-modal-header">
            <h3>Daftar Penawaran Penjual</h3>
            <p class="nego-subtitle">Berikut adalah para penjual yang tertarik dengan permintaan kustom Anda.</p>
        </div>

        <div class="nego-modal-body">
            {#if selectedNegotiations.length === 0}
                <div class="empty-nego">
                    <p>📭 Belum ada penjual yang mengajukan penawaran untuk request ini.</p>
                </div>
            {:else}
                <div class="nego-list">
                    {#each selectedNegotiations as nego}
                        <div class="nego-card {nego.status}">
                            <div class="nego-card-header">
                                <span class="seller-name">
                                    🏪 {nego.seller_name}
                                </span>
                                <span class="nego-badge {nego.status}">
                                    {nego.status.toUpperCase()}
                                </span>
                            </div>
                            
                            <div class="nego-card-body">
                                <div class="price-info">
                                    <span class="label">Harga Ditawarkan:</span>
                                    <span class="price-value">Rp {formatThousand(nego.offered_price)}</span>
                                </div>
                                
                                {#if nego.bargain_reason}
                                    <div class="reason-info">
                                        <span class="label">Pesan Penjual:</span>
                                        <p class="reason-text">"{nego.bargain_reason}"</p>
                                    </div>
                                {/if}
                                
                                <div class="meta-info">
                                    <span>Nego ke: <strong>{nego.counter_count}/3</strong></span>
                                </div>
                            </div>

                            <div class="card-actions">
                                {#if nego.status == 'pending'||nego.status=='countered'}
                                    <button class="btn-action btn-accept" on:click={() => handleAccept(nego.custom_request_id,nego.seller_id)}>
                                    Terima
                                    </button>
                                    <button class="btn-action btn-counter" on:click={() => handleAccept(nego.custom_request_id,nego.seller_id)}>Tawar</button>
                                {:else if nego.status === 'accepted'}
                                    <span class="text-success">✅ Penawaran telah disetujui</span>
                                {:else}
                                    <span class="text-muted">Selesai</span>
                                {/if}
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>

        <div class="nego-modal-footer">
            <button class="btn-close-modal" on:click={closeNegoModal}>Tutup</button>
        </div>
    </div>
</div>
{/if} -->

{#if isNegoModalOpen}
<div class="modal-backdrop" on:click={closeNegoModal}>
    <div class="nego-modal-box" on:click|stopPropagation>
        <div class="nego-modal-header">
            <h3>Daftar Penawaran Penjual</h3>
            <p class="nego-subtitle">Berikut adalah para penjual yang tertarik dengan permintaan kustom Anda.</p>
        </div>

        <div class="nego-modal-body">
            {#if selectedNegotiations.length === 0}
                <div class="empty-nego">
                    <p>📭 Belum ada penjual yang mengajukan penawaran untuk request ini.</p>
                </div>
            {:else}
                <div class="nego-list">
                    {#each selectedNegotiations as nego}
                        <div class="nego-card {nego.status}">
                            <div class="nego-card-header">
                                <span class="seller-name">
                                    🏪 {nego.seller_name}
                                </span>
                                <span class="nego-badge {nego.status}">
                                    {nego.status.toUpperCase()}
                                </span>
                            </div>
                            
                            <div class="nego-card-body">
                                <div class="price-info">
                                    <span class="label">Harga Ditawarkan:</span>
                                    <span class="price-value">Rp {formatThousand(nego.offered_price)}</span>
                                </div>
                                
                                {#if nego.bargain_reason}
                                    <div class="reason-info">
                                        <span class="label">{nego.origin_type === 'buyer' ? 'Pesan Anda:' : 'Pesan Penjual:'}</span>
                                        <p class="reason-text">"{nego.bargain_reason}"</p>
                                    </div>
                                {/if}
                                
                                <div class="meta-info">
                                    <span>Nego ke: <strong>{nego.counter_count}/3</strong></span>
                                </div>
                            </div>

                            <div class="card-actions">
                                {#if nego.status == 'pending' || nego.status == 'countered'}
                                    {#if nego.origin_type === 'seller'}
                                        <button class="btn-action btn-accept" on:click={() => handleAccept(nego.custom_request_id, nego.seller_id)}>
                                            Terima
                                        </button>
                                        {#if nego.counter_count==3}
                                            <button class="btn-action btn-cancel" on:click={() => handleReject(nego.custom_request_id, nego.seller_id)}>
                                            Tolak
                                            </button>
                                        {:else}
                                            <button class="btn-action btn-counter" on:click={() => openCounterForm(nego)}>
                                                Tawar
                                            </button>
                                        {/if}
                                    {:else}
                                        <span class="text-waiting">⏳ Menunggu respon balik dari penjual...</span>
                                    {/if}
                                {:else if nego.status === 'accepted'}
                                    <span class="text-success">✅ Penawaran telah disetujui</span>
                                {:else}
                                    <span class="text-muted">Selesai</span>
                                {/if}
                            </div>

                            {#if selectedNegoId === nego.id}
                                <div class="counter-form-container" style="margin-top: 15px; padding: 15px; background: #f9f9f9; border-top: 1px dashed #ddd; border-radius: 0 0 8px 8px;">
                                    <h4 style="margin-top: 0; margin-bottom: 10px; font-size: 14px;">Masukkan Penawaran Balik Anda:</h4>
                                    
                                    <div style="margin-bottom: 10px;">
                                        <label style="display: block; font-size: 12px; margin-bottom: 4px; font-weight: bold;">Harga Baru (Rp):</label>
                                        <input type="number" bind:value={counterPrice} style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;" placeholder="Contoh: 350000" />
                                    </div>

                                    <div style="margin-bottom: 12px;">
                                        <label style="display: block; font-size: 12px; margin-bottom: 4px; font-weight: bold;">Alasan / Catatan:</label>
                                        <textarea bind:value={counterReason} style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; resize: vertical;" placeholder="Contoh: Budget saya pasnya segini kak..."></textarea>
                                    </div>

                                    <div style="display: flex; gap: 8px; justify-content: flex-end;">
                                        <button on:click={submitCounterOffer} style="padding: 6px 12px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Kirim</button>
                                        <button on:click={closeCounterForm} style="padding: 6px 12px; background-color: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Batal</button>
                                    </div>
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>
            {/if}
        </div>

        <div class="nego-modal-footer">
            <button class="btn-close-modal" on:click={closeNegoModal}>Tutup</button>
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
    .search-box input { width: 100%; padding: 10px;  font-size: 14px; outline: none; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px;  text-align: left; vertical-align: middle; font-size: 14px; }
    th { text-transform: uppercase; font-weight: bold; }
    tr:hover { background-color: #f8fafc; }
    .table-img { width: 70px; height: 70px; object-fit: cover;  display: block; }
    .no-img { font-size: 12px; color: #64748b; font-style: italic; }
    .price-text { font-weight: bold; }
    .mono { font-family: monospace; font-weight: bold; color: #334155; }
    .center-text { text-align: center; color: #64748b; padding: 20px; }
    .desc-box { background: #fafafa; padding: 12px;  white-space: pre-line; line-height: 1.5; margin-bottom: 15px; }

    /* BADGE STATUS CUSTOM REQUEST */
    .badge { padding: 4px 8px; border-radius: 0px; font-size: 0.85rem; font-weight: bold; text-transform: uppercase; }
    .pending { background: #fff3cd; color: #856404; }
    .accepted,.processing { background: #cce5ff; color: #004085; }
    .paid { background: #d4edda; color: #155724; }
    .completed { background: #d4edda; color: #155724; }
    .shipped { background: #e2e8f0; color: #334155; } 

    /* CONFIG ACTION CELL & BUTTONS */
    .action-cell { width: 120px; text-align: center; }
    .action-wrapper { display: flex; justify-content: center; gap: 8px; align-items: center; }
    .btn-icon { width: 40px; height: 40px;  display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.1s; border:none; border-radius:8px;}
    .btn-icon:hover { transform: scale(1.05); }
    .btn-view { background-color: #84b2f8 !important; color: #0d6efd; }
    .btn-pay { background-color: #ffd895 !important; color: #b45309; }
    .btn-complete { background-color: #d4edda !important; color: #155724; }

    /* Tombol Cek Baru (Brutalist style agar serasi) */
    .btn-check { background: #000; color: #fff; border: none; padding: 8px 14px; font-weight: bold; cursor: pointer; font-size: 13px; border-radius: 4px; }
    .btn-check:hover { background: #333; }

    /* SYSTEM BACKDROP UTAMA (Digunakan kedua modal) */
    .modal-backdrop { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 99999; backdrop-filter: blur(4px); }
    
    /* MODAL BOX 1 STYLE (Detail Permintaan) */
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

    /* ========================================== */
    /* 🌟 CSS ISOLASI KHUSUS MODAL 2 (NEGOSIASI)    */
    /* ========================================== */
    .nego-modal-box { background: #ffffff; width: 90%; max-width: 520px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.25); display: flex; flex-direction: column; overflow: hidden; animation: fadeIn 0.15s ease-out; }
    .nego-modal-header { padding: 20px; border-bottom: 1px solid #eee; background: #fff; text-align: left; }
    .nego-modal-header h3 { margin: 0; font-size: 18px; color: #111; font-weight: bold; }
    .nego-subtitle { margin: 4px 0 0 0; font-size: 13px; color: #666; }
    
    .nego-modal-body { padding: 20px; max-height: 60vh; overflow-y: auto; background: #f8f9fa; }
    .nego-list { display: flex; flex-direction: column; gap: 14px; }
    
    /* Kartu Penawaran per Toko */
    .nego-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; display: flex; flex-direction: column; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
    .nego-card.accepted { border-left: 5px solid #2ecc71; }
    .nego-card.pending { border-left: 5px solid #e67e22; }
    
    .nego-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .seller-name { font-weight: bold; color: #333; font-size: 14px; }
    
    /* Badge Status di dalam Card */
    .nego-badge { font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: bold; }
    .nego-badge.pending { background: #fff3cd; color: #856404; border: 1px solid #ffeeba; }
    .nego-badge.accepted { background: #d4edda; color: #155724; }

    /* Data Harga & Pesan */
    .price-info { margin-bottom: 8px; }
    .label { font-size: 12px; color: #777; display: block; }
    .price-value { font-size: 16px; font-weight: bold; color: #e67e22; }
    .reason-text { font-style: italic; background: #f1f3f5; padding: 8px 12px; border-radius: 6px; font-size: 13px; color: #444; margin: 4px 0 0 0; }
    .meta-info { font-size: 12px; color: #999; margin-top: 8px; }

    /* Aksi di dalam Card Penjual */
    .card-actions { display: flex; gap: 8px; margin-top: 12px; justify-content: flex-end; align-items: center; }
    .btn-action { padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; border: none; font-weight: bold; }
    .btn-accept { background: #2ecc71; color: white; }
    .btn-accept:hover { background: #27ae60; }
    .btn-counter { background: #fff; border: 1px solid #cbd5e1; color: #334155; }
    .btn-counter:hover { background: #f1f5f9; }
    .btn-cancel {
        background-color: #fee2e2; /* Merah sangat muda */
        color: #dc2626;            /* Teks Merah Solid */
        border: 1px solid #fca5a5;
    }
    .btn-cancel:hover {
        background-color: #dc2626; /* Berubah menjadi merah penuh */
        color: #ffffff;            /* Teks menjadi putih */
        border-color: #dc2626;
        box-shadow: 0 4px 6px -1px rgba(220, 38, 38, 0.2);
    }

    .btn-cancel:active {
        transform: scale(0.97); /* Sedikit mengecil memberi efek membal */
    }
    .text-success { color: #27ae60; font-weight: bold; font-size: 13px; }
    .text-muted { color: #888; font-size: 13px; }

    /* Footer Penutup Modal */
    .nego-modal-footer { padding: 15px 20px; border-top: 1px solid #eee; display: flex; justify-content: flex-end; background: #fff; }
    .btn-close-modal { background: #e2e8f0; color: #334155; border: none; padding: 8px 18px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px; }
    .btn-close-modal:hover { background: #cbd5e1; }
    .empty-nego { text-align: center; color: #64748b; padding: 30px 0; font-size: 14px; }

    @keyframes fadeIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
</style>