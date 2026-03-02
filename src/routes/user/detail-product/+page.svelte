<script>
    let searchQuery = "";
    let colorOption = "";
    let product = {
        kategori: "Elektronik",
        totalPenjualan: 150,
        rating: 4.5,
        nama: "Smartphone XYZ",
        harga: "Rp 3.000.000",
        varianWarna: ["Merah", "Biru", "Hitam"],
        gambarUrl:
            "https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/c92e110e-f2e1-48e4-b75b-c81832435da4.png", // Placeholder image
        reviewRating: "Review dan rating produk akan ditampilkan di sini.",
    };

    function tambahKeCart() {
        alert(
            `Produk ${product.nama} dengan warna ${colorOption} telah ditambahkan ke keranjang.`,
        );
    }
</script>

<div class="container" aria-label="Detail Produk">
    <header role="banner" aria-label="Navigasi Utama">
        <div class="logo" aria-label="Logo">Logo</div>
        <input
            class="search-bar"
            type="search"
            placeholder="Kolom pencarian"
            bind:value={searchQuery}
            aria-label="Kolom pencarian produk"
        />
        <div class="icon-buttons" role="group" aria-label="Ikon navigasi">
            <button class="icon-circle" aria-label="Keranjang belanja"
                >Cart</button
            >
            <button class="icon-circle" aria-label="Notifikasi"
                >Notifikasi</button
            >
            <button class="icon-circle" aria-label="Chat Support">CS</button>
            <button class="icon-circle" aria-label="Profil pengguna"
                >Profile</button
            >
        </div>
    </header>

    <main>
        <section class="left-column" aria-label="Gambar dan ulasan produk">
            <div class="product-image" aria-label="Gambar produk">
                <img
                    src="https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/0a0d1366-98d7-4c52-b3e3-0b6a264f1e9d.png"
                    alt="Preview produk"
                    width="400"
                    height="300"
                    class="rounded-lg border"
                />
            </div>
            <div class="product-review" aria-label="Review dan rating produk">
                {product.reviewRating}
            </div>
        </section>

        <section class="right-column" aria-label="Detail produk dan aksi">
            <div class="kategori" aria-label="Kategori produk">
                <div>Kategori</div>
                <div aria-label="Kategori produk">{product.kategori}</div>
            </div>
            <div
                class="total-penjualan-rating"
                aria-label="Total penjualan dan rating produk"
            >
                <div aria-label="Total penjualan produk">
                    {product.totalPenjualan} terjual
                </div>
                <div aria-label="Rating produk">{product.rating} ★</div>
            </div>
            <div class="nama-produk" aria-label="Nama produk">
                {product.nama}
            </div>
            <div class="harga" aria-label="Harga produk">{product.harga}</div>

            <label class="variasi-warna-label" for="pilih-warna"
                >Variasi warna</label
            >
            <select
                id="pilih-warna"
                class="color-options"
                bind:value={colorOption}
                aria-label="Pilih opsi warna produk"
            >
                <option value="" disabled selected>Opsi warna</option>
                {#each product.varianWarna as warna}
                    <option value={warna}>{warna}</option>
                {/each}
            </select>

            <button
                class="tambah-cart"
                on:click={tambahKeCart}
                aria-label="Tambah produk ke keranjang"
            >
                Tambah ke cart
            </button>
        </section>
    </main>
</div>

<style>
    /* Global Reset */
    * {
        box-sizing: border-box;
    }

    .container {
        font-family: Arial, sans-serif;
        max-width: 1000px;
        margin: 0 auto;
        padding: 16px;
        border: 1px solid #ccc;
    }

    header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 24px;
    }

    .logo {
        font-weight: bold;
        font-size: 1.4rem;
        padding: 6px 12px;
        border: 1px solid #444;
        border-radius: 6px;
    }

    .search-bar {
        flex-grow: 1;
        height: 36px;
        font-size: 1rem;
        padding: 0 12px;
        border-radius: 8px;
        border: 1px solid #bbb;
    }

    /* Icon Buttons in header */
    .icon-buttons {
        display: flex;
        gap: 10px;
    }

    .icon-circle {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 1px solid #666;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        font-size: 0.9rem;
        user-select: none;
        background-color: #f9f9f9;
        transition: background-color 0.2s ease;
    }

    .icon-circle:hover {
        background-color: #e0e0e0;
    }

    main {
        display: flex;
        gap: 32px;
    }

    .left-column {
        flex: 1 1 60%;
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .product-image {
        width: 100%;
        max-width: 400px;
        border: 1px solid #ddd;
        border-radius: 8px;
        overflow: hidden;
        background-color: #f3f3f3;
    }

    .product-image img {
        display: block;
        width: 100%;
        height: auto;
    }

    .product-review {
        min-height: 120px;
        border: 1px solid #ddd;
        border-radius: 6px;
        padding: 12px;
        background-color: #fafafa;
        font-size: 0.9rem;
        color: #555;
    }

    .right-column {
        flex: 1 1 40%;
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-width: 350px;
    }

    .kategori,
    .total-penjualan-rating {
        display: flex;
        gap: 12px;
        font-weight: 600;
        font-size: 0.95rem;
        color: #444;
    }

    .total-penjualan-rating > div {
        border: 1px solid #ccc;
        border-radius: 8px;
        padding: 6px 14px;
        background-color: #f8f8f8;
        user-select: none;
    }

    .nama-produk {
        font-size: 1.5rem;
        font-weight: 700;
        border: 1px solid #aaa;
        border-radius: 8px;
        padding: 10px 16px;
        user-select: none;
    }

    .harga {
        font-size: 1.25rem;
        font-weight: 600;
        border: 1px solid #ccc;
        border-radius: 8px;
        padding: 8px 14px;
        user-select: none;
    }

    .variasi-warna-label {
        font-size: 0.9rem;
        user-select: none;
    }

    select.color-options {
        border-radius: 8px;
        border: 1px solid #bbb;
        padding: 8px 12px;
        font-size: 1rem;
        cursor: pointer;
    }

    button.tambah-cart {
        margin-top: 16px;
        font-size: 1rem;
        padding: 10px 14px;
        border-radius: 8px;
        border: none;
        background-color: #2563eb; /* Tailwind blue-600 */
        color: white;
        cursor: pointer;
        transition: background-color 0.3s ease;
    }

    button.tambah-cart:hover {
        background-color: #1e40af; /* Tailwind blue-800 */
    }

    /* Responsive small screens*/
    @media (max-width: 768px) {
        main {
            flex-direction: column;
            gap: 24px;
        }

        .right-column {
            max-width: 100%;
        }

        header {
            flex-wrap: wrap;
            gap: 12px;
        }

        .search-bar {
            flex: 1 1 100%;
            min-width: 160px;
        }
    }
</style>
