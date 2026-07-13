<script>
    import { onMount } from "svelte";
    import api from "$lib/api/axios.js";
    import Swal from "sweetalert2";

    let customRequests = [];
    let isLoading = true;

    let isBargainModalOpen = false;
    let selectedRequestId = "";
    let initialBudget = 0;
    let offeredPrice = 0;
    let negoCounterPrice = 0;
    let bargainReason = "";
    let lastBuyerReason ="";

    // Ambil data custom request yang berstatus 'pending' dari backend
    async function fetchAvailableRequests() {
        try {
            isLoading = true;
            // Pastikan Anda membuat endpoint GET ini di sellerCustomRequest.js backend
            const response = await api.get("/seller/custom_request");
            customRequests = response.data;
            console.log(customRequests);
        } catch (error) {
            console.error("Gagal mengambil data custom request:", error);
            Swal.fire("Error", "Gagal memuat daftar custom request.", "error");
        } finally {
            isLoading = false;
        }
    }
    
    function openBargainModal(requestId, budget, buyerReason, counterPrice) {
        // console.log("Alasan Pembeli:", buyerReason);
        selectedRequestId = requestId;
        initialBudget = budget;
        offeredPrice = budget; // Set harga awal default sama dengan budget pembeli
        negoCounterPrice = counterPrice;
        bargainReason = "";    // Reset alasan
        lastBuyerReason = buyerReason;
        isBargainModalOpen = true; // Buka modal kustom Anda
    }

    async function submitBargain() {
        if (!offeredPrice || offeredPrice <= 0) {
            Swal.fire("Error", "Masukkan nominal harga yang valid", "error");
            return;
        }
        if (!bargainReason.trim()) {
            Swal.fire("Error", "Mohon isi alasan Anda mengajukan penawaran", "error");
            return;
        }
        try {
            Swal.showLoading();
            
            // Kirim data lengkap ke collection negosiasi
            // console.log(bargainReason);
            // console.log(offeredPrice);
            await api.post(`/seller/custom_request/${selectedRequestId}/negotiate`, {
                offered_price: Number(offeredPrice),
                bargain_reason: bargainReason // Menyimpan alasan penawaran di database
            });

            Swal.fire("Tawaran Dikirim!", "Penawaran Anda berhasil diajukan ke pembeli.", "success");
            isBargainModalOpen = false; // Tutup modal
            fetchAvailableRequests();   // Refresh data tabel
        } catch (error) {
            console.error(error);
            Swal.fire("Gagal!", error.response?.data?.message || "Gagal mengirim penawaran.", "error");
        }
    }

    function formatThousand(value) {
    if (!value) return "";
    // Hapus semua karakter selain angka
    const cleanNumber = value.toString().replace(/\D/g, "");
    // Beri separator titik menggunakan regex lokal Indonesia
    return cleanNumber.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

    // Fungsi handler saat seller mengetik di input penawaran
    function handlePriceInput(event) {
        const rawValue = event.target.value;
        // Bersihkan titik agar kembali menjadi angka mentah untuk disimpan ke variabel offeredPrice
        const cleanNumber = rawValue.replace(/\D/g, "");
        offeredPrice = cleanNumber ? Number(cleanNumber) : 0;
    }

    // Fungsi ketika penjual tertarik dan mengambil pekerjaan custom request tersebut
    async function applyToTakeCustomRequest(requestId, currentBudget) {
        const result = await Swal.fire({
            title: "Ambil Pesanan Custom?",
            text: `Anda akan mengajukan diri untuk mengerjakan pesanan ini sesuai anggaran pembeli (Rp ${currentBudget.toLocaleString("id-ID")}).`,
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#1e293b", // Warna dark slate yang solid
            cancelButtonColor: "#6c757d",
            confirmButtonText: "Ya, Ambil!",
            cancelButtonText: "Batal",
        });

        if (!result.isConfirmed) return;

        try {
            Swal.showLoading();
            
            // Mengirimkan harga default pembeli karena seller memilih langsung mengambil tanpa nego
            await api.post(`/seller/custom_request/${requestId}/apply`, {
                offered_price: Number(currentBudget),
                reason: "Mengambil langsung sesuai anggaran awal pembeli." // Memberikan alasan default otomatis
            });
            Swal.fire(
                "Berhasil Mengajukan!",
                "Pengajuan Anda telah dikirim. Silahkan tunggu respon pengajuan.",
                "success",
            );
            // Refresh daftar tabel agar data di layar ter-update (atau hilang jika slot 3 penuh)
            fetchAvailableRequests();
        } catch (error) {
            console.error(error);
            Swal.fire(
                "Gagal!",
                error.response?.data?.message || "Gagal mengambil pesanan custom.",
                "error",
            );
        }
    }

    // async function bargainCustomRequest(requestId) {
    //     const result = await Swal.fire({
    //         title: "Ajukan Diri untuk Pesanan Ini?",
    //         text: "Anda akan masuk ke dalam daftar calon penjual. Pembeli akan memilih hingga maksimal 3 penawar.",
    //         icon: "question",
    //         showCancelButton: true,
    //         confirmButtonColor: "#1e293b", // Warna dark mode modern yang tadi kita bahas
    //         cancelButtonColor: "#6c757d",
    //         confirmButtonText: "Ya, Ajukan!",
    //         cancelButtonText: "Batal",
    //     });

    //     if (!result.isConfirmed) return;

    //     try {
    //         Swal.showLoading();
            
    //         // 🌟 UBAH ENDPOINT: Arahkan ke endpoint negosiasi/bidding, bukan langsung patch custom_request
    //         await api.post(`/seller/custom_request/${requestId}/negotiate`, {
    //             offered_price: requestDetail?.budget // Kirim harga awal/tawaran default
    //         });

    //         Swal.fire(
    //             "Berhasil Mengajukan Diri!",
    //             "Tawaran Anda telah dikirim. Silakan pantau statusnya di menu Negosiasi Saya.",
    //             "success",
    //         );
            
    //         // Refresh daftar agar memperbarui jumlah penawar (atau menghilangkan jika sudah penuh 3)
    //         fetchAvailableRequests();
    //     } catch (error) {
    //         console.error(error);
    //         Swal.fire(
    //             "Gagal!",
    //             error.response?.data?.message || "Gagal mengajukan diri.",
    //             "error",
    //         );
    //     }
    // }

    // Helper format mata uang rupiah
    function formatRupiah(amount) {
        return "Rp " + new Intl.NumberFormat("id-ID").format(amount);
    }

    // Helper format tanggal agar lebih manusiawi
    function formatDate(dateString) {
        if (!dateString) return "-";
        const date = new Date(dateString);
        return date.toLocaleDateString("id-ID", {
            year: "numeric",
            month: "short",
            day: "numeric",
            // hour: "2-digit",
            // minute: "2-digit",
        });
    }

    onMount(() => {
        fetchAvailableRequests();
    });
</script>

<div class="table-container">
    <h2>Daftar Custom Request Tersedia</h2>
    <p class="subtitle">
        Pilih dan ambil pesanan kustom dari pembeli yang Anda rasa cocok.
    </p>

    {#if isLoading}
        <div class="loading-state">Memuat data permintaan...</div>
    {:else}
        <table>
            <thead>
                <tr>
                    <th width="15%">Foto Referensi</th>
                    <th width="20%">Tanggal Permintaan Dibuat</th>
                    <th width="35%">Deskripsi Permintaan</th>
                    <th width="15%">Budget</th>
                    <th width="15%">Action</th>
                </tr>
            </thead>
            <tbody>
                {#if customRequests.length === 0}
                    <tr>
                        <td colspan="5" class="empty-state"
                            >Belum ada custom request tersedia saat ini.</td
                        >
                    </tr>
                {:else}
                    {#each customRequests as req}
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
                            <td>
                                <span class="date-text"
                                    >{formatDate(req.created_at)}</span
                                >
                            </td>
                            <td>
                                <div class="desc-box">
                                    {req.request_description ||
                                        "Tidak ada deskripsi"}
                                </div>
                            </td>
                            <td class="price-text">
                                {formatRupiah(req.negotiated_price)}
                            </td>
                            <td>
                                <div class="action-buttons">
    {#if req.negoCount < 3}
        
        {#if req.negoStatus === 'pending'}
            <span class="status-badge">Sudah Mengajukan, Menunggu Respons Pembeli</span>
        
        {:else}
            {#if req.negoCount === 0}
                <button class="btn-take" on:click={() => applyToTakeCustomRequest(req.id,req.budget)}>
                    Ajukan Ambil
                </button>
            {/if}
            <!-- {#if req.bargainReason !== ""}
                <button 
                    class="btn-icon-reason" 
                    on:click={() => openReasonModal(req.bargainReason)}
                    title="Lihat alasan penolakan"
                >
                    🔍 </button>
            {/if} -->
            <button class="btn-bargain" on:click={() => openBargainModal(req.id,req.budget, req.negoCounterReason,req.negoCounterPrice)}>
                {req.negoCount === 0 ? "Tawar" : "Tawar Lagi"}
            </button>
        {/if}

    {:else}
        <span class="status-badge" style="color: red;">Maks. Negosiasi</span>
    {/if}
</div>
                            </td>
                        </tr>
                    {/each}
                {/if}
            </tbody>
        </table>
    {/if}
</div>

<svelte:head>
    <title>Custom Request</title>
</svelte:head>

{#if isBargainModalOpen}
<div class="modal-backdrop">
    <div class="modal-content">
        <h3>Ajukan Penawaran Harga</h3>
        <p class="subtitle">Sesuaikan penawaran Anda untuk pesanan kustom ini.</p>
        
        {#if lastBuyerReason && lastBuyerReason !== ""}
            <div class="buyer-rejection-box">
                <strong>⚠️ Alasan Penolakan Sebelumnya:</strong>
                <p>{lastBuyerReason}</p>
            </div>
        {/if}

        {#if negoCounterPrice>0}
            <div class="form-group">
                <label for="buyer-counter-price">Harga Counter Pembeli</label>
                <input 
                    id="buyer-counter-price"
                    type="text" 
                    value="Rp {formatThousand(negoCounterPrice)}" 
                    disabled 
                    class="input-disabled" 
                />
            </div>
        {/if}
        <div class="form-group">
            <label>Harga Anggaran Awal Pembeli</label>
            <input 
                type="text" 
                value={initialBudget ? `Rp ${formatThousand(initialBudget)}` : 'Rp 0'} 
                disabled 
                class="input-disabled" 
            />
        </div>

        <div class="form-group">
            <label>Harga Tawaran Anda (Rp)</label>
            <input 
                type="text" 
                value={formatThousand(offeredPrice)} 
                on:input={handlePriceInput}
                placeholder="Masukkan harga penawaran Anda" 
            />
        </div>

        <div class="form-group">
            <label>Alasan Mengajukan Penawaran</label>
            <textarea bind:value={bargainReason} placeholder="Contoh: Butuh biaya tambahan untuk bahan katun premium warna biru muda..."></textarea>
        </div>

        <div class="modal-actions">
            <button class="btn-cancel" on:click={() => isBargainModalOpen = false}>Batal</button>
            <button class="btn-submit" on:click={submitBargain}>Kirim Penawaran</button>
        </div>
    </div>
</div>
{/if}

<style>
    .table-container {
        width: 100%;
        max-width: 1200px;
        margin: 20px auto;
        font-family: sans-serif;
    }

    h2 {
        margin-bottom: 4px;
        font-weight: bold;
    }

    .subtitle {
        color: #64748b;
        font-size: 14px;
        margin-bottom: 20px;
    }

    /* Style Tabel Kaku Minimalis Hitam Putih senada dengan Wireframe */
    table {
        width: 100%;
        border-collapse: collapse;
    }

    th {
        text-align: left;
        padding: 12px;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    td {
        padding: 12px;
        vertical-align: middle;
        font-size: 14px;
    }


    /* Elemen Gambar dalam Tabel */
    .table-img {
        width: 80px;
        height: 80px;
        object-fit: cover;
        display: block;
    }

    .no-img {
        font-size: 12px;
        color: #64748b;
        font-style: italic;
    }

    .desc-box {
        white-space: pre-line;
        line-height: 1.4;
    }

    .price-text {
        font-weight: bold;
    }

    .date-text {
        color: #334155;
        font-size: 13px;
    }

    /* Tombol Aksi */
    .action-buttons {
        display: flex;
        flex-direction: row; /* Berbaris ke samping */
        gap: 8px;            /* Jarak konsisten antar tombol sebesar 8px */
        justify-content: center; /* Membuat tombol berada di tengah kolom tabel */
        align-items: center;     /* Menyeimbangkan tinggi tombol agar sejajar lurus */
    }

    /* Sifat dasar tombol Anda */
    .btn-take, .btn-bargain {
        white-space: nowrap;  /* Mencegah teks di dalam tombol patah menjadi 2 baris */
        padding: 8px 12px;    /* Sesuaikan padding agar tombol tidak terlalu gemuk di dalam tabel */
        font-size: 14px;      /* Ukuran font yang pas untuk UI tabel */
        cursor: pointer;
        border-radius: 4px;   /* Membuat sudut tombol sedikit melengkung halus */
        border: none;
    }

    /* Pilihan Opsional: Membedakan warna tombol tawar agar visualnya lebih dinamis */
    .btn-take {
        background-color: #1e293b; /* Tema Dark Slate modern yang tadi kita bahas */
        color: #ffffff;
        transition: background-color 0.2s ease;
    }
    .btn-take:hover {
        background-color: #0f172a; /* Warna navy yang lebih gelap saat di-hover */
    }

    .btn-bargain {
        background-color: #f59e0b; /* Warna Amber/Oranye hangat yang kontras */
        color: #ffffff;            /* Teks putih bersih */
        font-weight: 600;
        transition: background 0.2s ease;
    }

    .btn-bargain:hover {
        background-color: #d97706; /* Sedikit lebih gelap saat kursor di atasnya */
    }

    .empty-state,
    .loading-state {
        text-align: center;
        padding: 40px;
        font-style: italic;
        color: #64748b;
        font-weight: 500;
    }

    .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(15, 23, 42, 0.6); /* Navy gelap transparan */
    backdrop-filter: blur(4px); /* Membuat latar belakang agak blur/buram */
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999; /* Memastikan modal berada di paling depan */
}

/* Kotak Konten Utama Modal */
.modal-content {
    background-color: #ffffff;
    width: 100%;
    max-width: 500px; /* Batas lebar maksimal modal */
    padding: 24px;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    animation: scaleUp 0.2s ease-out; /* Animasi pop-up halus */
}

/* Animasi Muncul */
@keyframes scaleUp {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
}

.modal-content h3 {
    margin: 0 0 8px 0;
    color: #0f172a;
    font-size: 20px;
    font-weight: 700;
}

.modal-content .subtitle {
    margin: 0 0 20px 0;
    color: #64748b;
    font-size: 14px;
}

/* Pembungkus Form Group */
.form-group {
    margin-bottom: 16px;
    display: flex;
    flex-direction: column;
    text-align: left;
}

.form-group label {
    font-size: 14px;
    font-weight: 600;
    color: #334155;
    margin-bottom: 6px;
}

/* Elemen Input dan Textarea */
.form-group input, 
.form-group textarea {
    padding: 10px 12px;
    font-size: 14px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    color: #0f172a;
    background-color: #ffffff;
    outline: none;
    transition: border-color 0.2s;
}

.form-group input:focus, 
.form-group textarea:focus {
    border-color: #f59e0b; /* Mengubah border jadi oranye hangat saat diketik */
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
}

/* Sifat khusus Textarea */
.form-group textarea {
    height: 100px;
    resize: vertical; /* Hanya bisa ditarik ke atas bawah */
    font-family: inherit;
}

/* Gaya khusus input anggaran awal pembeli yang di-disable */
.form-group .input-disabled {
    background-color: #f1f5f9;
    color: #64748b;
    cursor: not-allowed;
    border-color: #e2e8f0;
}

/* Bagian Tombol Aksi */
.modal-actions {
    margin-top: 24px;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
}

.modal-actions button {
    padding: 10px 16px;
    font-size: 14px;
    font-weight: 600;
    border-radius: 6px;
    cursor: pointer;
    border: none;
    transition: all 0.2s;
}

/* Tombol Batal */
.btn-cancel {
    background-color: #f1f5f9;
    color: #475569;
}

.btn-cancel:hover {
    background-color: #e2e8f0;
}

/* Tombol Kirim Penawaran */
.btn-submit {
    background-color: #f59e0b; /* Warna Amber kontras */
    color: #ffffff;
}

.btn-submit:hover {
    background-color: #d97706;
}
.buyer-rejection-box {
        background-color: #fff3cd;
        border-left: 4px solid #ffc107;
        color: #856404;
        padding: 12px;
        border-radius: 4px;
        margin-bottom: 15px;
        text-align: left;
        font-size: 14px;
    }
    .buyer-rejection-box p {
        margin: 5px 0 0 0;
        font-style: italic;
    }
</style>
