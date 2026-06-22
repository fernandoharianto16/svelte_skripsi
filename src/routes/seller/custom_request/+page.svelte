<script>
    import { onMount } from "svelte";
    import api from "$lib/api/axios.js";
    import Swal from "sweetalert2";

    let customRequests = [];
    let isLoading = true;

    // Ambil data custom request yang berstatus 'pending' dari backend
    async function fetchAvailableRequests() {
        try {
            isLoading = true;
            // Pastikan Anda membuat endpoint GET ini di sellerCustomRequest.js backend
            const response = await api.get("/seller/custom_request");
            customRequests = response.data;
        } catch (error) {
            console.error("Gagal mengambil data custom request:", error);
            Swal.fire("Error", "Gagal memuat daftar custom request.", "error");
        } finally {
            isLoading = false;
        }
    }

    // Fungsi ketika penjual tertarik dan mengambil pekerjaan custom request tersebut
    async function acceptCustomRequest(requestId) {
        const result = await Swal.fire({
            title: "Ambil Pesanan Custom?",
            text: "Anda akan ditunjuk sebagai penjual untuk memproses permintaan custom ini.",
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#000",
            cancelButtonColor: "#6c757d",
            confirmButtonText: "Ya, Ambil!",
            cancelButtonText: "Batal",
        });

        if (!result.isConfirmed) return;

        try {
            Swal.showLoading();
            // Mengirim req ke backend untuk update seller_id dan status request
            await api.patch(`/seller/custom_request/${requestId}`);

            Swal.fire(
                "Berhasil Mengajukan Diri!",
                "Anda telah bersedia mengerjakan pesanan custom ini. Silakan cek detailnya di menu Pesanan Anda.",
                "success",
            );
            // Refresh tabel agar request yang sudah diambil hilang dari daftar "Tersedia"
            fetchAvailableRequests();
        } catch (error) {
            console.error(error);
            Swal.fire(
                "Gagal!",
                error.response?.data?.message || "Gagal mengambil pesanan.",
                "error",
            );
        }
    }

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
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    onMount(() => {
        fetchAvailableRequests();
    });
</script>

<div class="table-container">
    <h2>Daftar Custom Request Tersedia</h2>
    <p class="subtitle">
        Pilih dan ambil pesanan kustom dari pembeli yang sesuai dengan keahlian
        toko Anda.
    </p>

    {#if isLoading}
        <div class="loading-state">Memuat data permintaan...</div>
    {:else}
        <table>
            <thead>
                <tr>
                    <th width="15%">Foto Referensi</th>
                    <th width="20%">Tanggal Masuk</th>
                    <th width="35%">Deskripsi Permintaan</th>
                    <th width="15%">Tawaran Harga (Budget)</th>
                    <th width="15%">Aksi</th>
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
                                <button
                                    class="btn-take"
                                    on:click={() =>
                                        acceptCustomRequest(
                                            req.custom_request_id,
                                        )}
                                >
                                    Ambil Pesanan
                                </button>
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
        border: 2px solid #000;
        background: #fff;
    }

    th {
        background-color: #000;
        color: #fff;
        text-align: left;
        padding: 12px;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    td {
        padding: 12px;
        border: 1px solid #000;
        vertical-align: middle;
        font-size: 14px;
    }

    tr:hover {
        background-color: #f8fafc;
    }

    /* Elemen Gambar dalam Tabel */
    .table-img {
        width: 80px;
        height: 80px;
        object-fit: cover;
        border: 1px solid #000;
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
    .btn-take {
        width: 100%;
        padding: 8px 12px;
        background-color: #000;
        color: #fff;
        border: none;
        font-weight: bold;
        cursor: pointer;
        text-transform: uppercase;
        font-size: 12px;
        transition: opacity 0.1s;
    }

    .btn-take:hover {
        opacity: 0.8;
    }

    .empty-state,
    .loading-state {
        text-align: center;
        padding: 40px;
        font-style: italic;
        color: #64748b;
        font-weight: 500;
    }
</style>
