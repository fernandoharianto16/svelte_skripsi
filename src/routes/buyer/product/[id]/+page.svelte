<script>
    import { page } from "$app/stores";
    import { goto } from "$app/navigation"; // Ditambahkan untuk navigasi ke login
    import api from "$lib/api/axios";
    import ProductForm from "$lib/components/ProductForm.svelte";
    import { getAuth } from "firebase/auth";
    import { addToCart } from "$lib/stores/cartStore"; // 1. Import fungsi store baru
    import Swal from "sweetalert2";
    // Mengambil ID langsung dari URL tanpa +page.js
    $: id = $page.params.id;

    let product = null;
    let loading = true;
    let error = null;
    let dataDetailProduk = {};
    let isSubmittingCart = false; // State untuk loading tombol keranjang

    let offerPrice = 0;
    let showNegoModal = false;

    async function submitNego() {
        const userLogin = getAuth().currentUser;
        try {
            await api.post("/buyer/negotiations", {
                product_id: product.id,
                product_name: product.product_name,
                seller_id: product.seller_id,
                offered_price: offerPrice,
                buyer_id:userLogin.uid,
                status: "pending",
            });
            // console.log(userLogin);
            // console.log(product.id);
            // console.log(product.seller_id);
            // console.log(offerPrice);
            Swal.fire(
                "Berhasil",
                "Tawaran Anda telah dikirim ke penjual!, Silahkan lanjutkan di halaman Negosiasi",
                "success",
            );
            showNegoModal = false;
        } catch (err) {
            Swal.fire("Gagal", "Tidak dapat mengirim tawaran.", "error");
        }
    }
    function openNegoModal() {
        showNegoModal = true;
    }

    function closeModal() {
        showNegoModal = false;
    }

    async function loadDetailProduct() {
        if (!id) return;

        loading = true;
        try {
            const res = await api.get(`/buyer/products/${id}`);
            product = res.data.data;
            dataDetailProduk = product;
        } catch (err) {
            error = "Gagal memuat produk";
            console.error(err);
        } finally {
            loading = false;
        }
    }

    // Jalankan fetch saat ID berubah
    $: if (id) loadDetailProduct();

    // Fungsi Pesan Sekarang (Langsung transaksi/lewat backend)
    async function handlePesan(productId) {
        const userLogin = getAuth().currentUser;

        if (!userLogin) {
            Swal.fire({
                title: "Belum Login",
                text: "Silakan login terlebih dahulu untuk memesan produk.",
                icon: "warning",
                confirmButtonColor: "#2ecc71",
                confirmButtonText: "Login Sekarang",
                showCancelButton: true,
                cancelButtonText: "Batal",
            }).then((result) => {
                if (result.isConfirmed) {
                    goto("/login");
                }
            });
            return;
        }

        try {
            const response = await api.post(`/products/${productId}`);

            if (response.status === 200 || response.status === 201) {
                await Swal.fire({
                    title: "Berhasil Dipesan!",
                    text: "Produk telah berhasil ditambahkan ke pesanan Anda.",
                    icon: "success",
                    timer: 2500,
                    timerProgressBar: true,
                    showConfirmButton: false,
                });
            }
        } catch (err) {
            console.error("Gagal melakukan pemesanan:", err);
            Swal.fire({
                title: "Gagal Memesan",
                text:
                    err.response?.data?.message ||
                    "Terjadi kesalahan pada server, silakan coba lagi.",
                icon: "error",
                confirmButtonColor: "#dc3545",
            });
        }
    }

    // Fungsi Tambah Ke Keranjang (Murni Frontend / LocalStorage)
    async function handleTambahCart() {
        const userLogin = getAuth().currentUser;

        if (!userLogin) {
            Swal.fire({
                title: "Belum Login",
                text: "Silakan login terlebih dahulu untuk menambahkan produk ke keranjang.",
                icon: "warning",
                confirmButtonColor: "#2ecc71",
                confirmButtonText: "Login Sekarang",
                showCancelButton: true,
                cancelButtonText: "Batal",
            }).then((result) => {
                if (result.isConfirmed) {
                    goto("/login");
                }
            });
            return;
        }

        isSubmittingCart = true;

        // Masukkan langsung ke svelte store / localStorage
        addToCart(product, 1);

        // Berikan feedback instan toast ke buyer
        Swal.fire({
            title: "Berhasil!",
            text: `${product.product_name} berhasil dimasukkan ke keranjang.`,
            icon: "success",
            toast: true,
            position: "top-end",
            showConfirmButton: false,
            timer: 2500,
            timerProgressBar: true,
        });

        isSubmittingCart = false;
    }
</script>

<svelte:head>
    <title>Detail Product</title>
</svelte:head>

<div class="container">
    {#if loading}
        <p>Memuat detail produk...</p>
    {:else if error}
        <p style="color: red;">{error}</p>
    {:else if product}
        <div class="back-navigation">
            <a href="/buyer/product" class="btn-back">
                <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                Kembali ke Daftar Produk
            </a>
        </div>
        <main>
            <section class="left-column">
                <div class="product-image">
                    <img
                        src={product.image || product.image_url}
                        alt={product.product_name}
                    />
                </div>
            </section>
            <section class="right-column">
                <h2 class="nama-produk">{product.product_name}</h2>
                <div class="kategori">Kategori : {product.category || "-"}</div>
                <div class="total-penjualan">
                    Terjual : <strong>{product.sold_count || 5}</strong> produk
                </div>
                <!-- <div class="rating-section">
                    <span class="stars">{"★".repeat(Math.round(product.rating || 0))}</span>
                    <span class="rating-count">({product.reviews?.length || 0} ulasan)</span>
                </div> -->
                <div class="harga">
                    Rp {product.price?.toLocaleString("id-ID")}
                </div>
                <button
                    type="button"
                    class="tambah-cart"
                    on:click={() => handlePesan(product.id)}
                >
                    Pesan Sekarang
                </button>
                <button
                    type="button"
                    class="tambah-cart"
                    disabled={isSubmittingCart}
                    on:click={handleTambahCart}
                >
                    {#if isSubmittingCart}
                        Memproses...
                    {:else}
                        Tambah ke Keranjang
                    {/if}
                </button>
                <button class="tambah-cart" on:click={openNegoModal}>
                    <i class="bi bi-tag"></i> Tawar Harga
                </button>
                {#if showNegoModal}
                    <div class="modal-backdrop">
                        <div class="modal-container">
                            <div class="modal-header">
                                <h3>Tawar Harga</h3>
                                <button class="close-btn" on:click={closeModal}
                                    >&times;</button
                                >
                            </div>

                            <div class="modal-body">
                                <p class="product-name">
                                    Produk: <strong
                                        >{product.product_name}</strong
                                    >
                                </p>
                                <p class="price-info">
                                    Harga Normal: <strong
                                        >Rp {product.price.toLocaleString()}</strong
                                    >
                                </p>

                                <div class="input-group">
                                    <label for="offer"
                                        >Masukkan Harga Penawaran (Rp)</label
                                    >
                                    <input
                                        type="number"
                                        id="offer"
                                        bind:value={offerPrice}
                                        placeholder="Contoh: 150000"
                                    />
                                </div>
                            </div>

                            <div class="modal-footer">
                                <button class="btn-cancel" on:click={closeModal}
                                    >Batal</button
                                >
                                <button class="btn-submit" on:click={submitNego}
                                    >Kirim Penawaran</button
                                >
                            </div>
                        </div>
                    </div>
                {/if}
            </section>
        </main>
    {/if}
</div>

<style>
    /* .rating-section { display: flex; align-items: center; gap: 8px; margin: 10px 0; }
    .stars { color: #f59e0b; font-size: 1.2rem; }
    .rating-count { color: #666; font-size: 0.9rem; } */

    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }

    .modal-container {
        background: white;
        width: 90%;
        max-width: 400px;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    }

    .modal-header {
        padding: 16px;
        background: #f8f9fa;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #dee2e6;
    }

    .modal-header h3 {
        margin: 0;
        font-size: 1.1rem;
    }

    .close-btn {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
    }

    .modal-body {
        padding: 20px;
    }

    .input-group {
        margin-top: 15px;
    }
    .input-group label {
        display: block;
        margin-bottom: 8px;
        font-size: 0.9rem;
        color: #666;
    }
    .input-group input {
        width: 100%;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 6px;
        box-sizing: border-box;
    }

    .modal-footer {
        padding: 15px;
        display: flex;
        gap: 10px;
        justify-content: flex-end;
    }

    .btn-cancel {
        padding: 8px 16px;
        border: 1px solid #ddd;
        background: white;
        border-radius: 6px;
        cursor: pointer;
    }
    .btn-submit {
        padding: 8px 16px;
        border: none;
        background: #2ecc71;
        color: white;
        border-radius: 6px;
        cursor: pointer;
    }
    .btn-submit:hover {
        background: #27ae60;
    }
    .back-navigation {
        margin-bottom: 20px;
    }
    .btn-back {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: #4b5563; /* Warna abu-abu gelap text */
        text-decoration: none;
        font-size: 0.95rem;
        font-weight: 500;
        transition: color 0.2s ease;
    }
    .btn-back:hover {
        color: #2563eb; /* Berubah biru saat dihover */
    }
    .container {
        max-width: 1000px;
        margin: 0 auto;
        padding: 20px;
        font-family: sans-serif;
    }
    main {
        display: flex;
        gap: 40px;
    }
    .left-column {
        flex: 1;
    }
    .right-column {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 15px;
    }
    .product-image img {
        width: 100%;
        border-radius: 8px;
        object-fit: cover;
    }
    .nama-produk {
        font-size: 1.8rem;
        margin: 0;
    }
    .harga {
        font-size: 1.5rem;
        color: #d32f2f;
        font-weight: bold;
    }
    .kategori {
        color: #666;
    }
    .total-penjualan {
        color: #444;
        font-size: 0.95rem;
        background: #f3f4f6;
        padding: 5px 10px;
        border-radius: 4px;
        width: fit-content;
    }
    .tambah-cart {
        padding: 12px;
        background: #2563eb;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 1rem;
    }
    .tambah-cart:hover {
        background: #1d4ed8;
    }
</style>
