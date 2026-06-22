<script>
    import { page } from "$app/stores";
    import { onMount } from "svelte";
    import api from "$lib/api/axios";
    import { goto } from "$app/navigation";
    import { getAuth } from "firebase/auth";
    import Swal from "sweetalert2";

    // 1. Deklarasikan variabel penampung dengan nilai awal null
    let product = null;
    let isLoading = true;

    // 2. Ambil ID dari parameter URL secara reaktif
    // $page.params.id otomatis mengambil nilai dari folder [id]
    $: productId = $page.params.id;

    // 3. Fungsi untuk mengambil data ke API berdasarkan ID dari URL
    async function loadDetail() {
        if (!productId) return;

        try {
            isLoading = true;
            // Gunakan productId yang ditangkap dari parameter URL
            const res = await api.get(`/buyer/products/${productId}`);
            product = res.data.data;

            // console.log("ID yang terbaca dari URL:", productId);
            // console.log("Data produk dari backend:", product);
        } catch (err) {
            console.error("Gagal memuat detail produk:", err);
        } finally {
            isLoading = false;
        }
    }
    async function handleTambahCart(productId) {
        const userLogin = getAuth().currentUser;

        // 1. Validasi jika user belum login
        if (!userLogin) {
            Swal.fire({
                title: "Belum Login",
                text: "Silakan login terlebih dahulu untuk menambahkan produk ke keranjang.",
                icon: "warning",
                confirmButtonColor: "#2ecc71",
                confirmButtonText: "Login Sekarang", // Mengubah teks tombol OK
                showCancelButton: true, // Menampilkan tombol batal jika user ingin tetap di halaman detail
                cancelButtonText: "Batal",
            }).then((result) => {
                // Jika user mengeklik tombol "Login Sekarang"
                if (result.isConfirmed) {
                    goto("/login");
                }
            });
            return;
        }
    }

    // 4. Jalankan fungsi saat halaman pertama kali dibuka
    onMount(() => {
        loadDetail();
    });
</script>

<svelte:head>
    <title>Detail</title>
</svelte:head>

<div class="container">
    {#if product}
        <div class="back-navigation">
            <a href="/" class="btn-back">
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
                <div class="kategori">Kategori: {product.category || "-"}</div>
                <div class="total-penjualan">
                    Terjual: <strong>{product.sold_count || 10}</strong> produk
                </div>
                <div class="harga">
                    Rp {product.price?.toLocaleString("id-ID")}
                </div>
                <button
                    type="button"
                    class="tambah-cart"
                    on:click={() => handleTambahCart()}
                >
                    Tambah ke Keranjang
                </button>
            </section>
        </main>
    {:else}
        <p>Memuat detail produk...</p>
    {/if}
</div>

<style>
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

    .tambah-cart {
        padding: 12px;
        background: #2563eb;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 1rem;
        transition: background 0.2s;
    }
    .tambah-cart:hover {
        background: #1d4ed8;
    }
</style>
