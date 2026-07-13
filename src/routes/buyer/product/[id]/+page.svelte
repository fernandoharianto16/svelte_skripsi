<script>
    import { page } from "$app/stores";
    import { goto } from "$app/navigation"; 
    import api from "$lib/api/axios";
    import ProductForm from "$lib/components/ProductForm.svelte";
    import { getAuth, onAuthStateChanged } from "firebase/auth"; // 👈 Ditambahkan onAuthStateChanged
    import { onMount } from "svelte"; // 👈 Ditambahkan onMount
    import { addToCart } from "$lib/stores/cartStore"; 
    import Swal from "sweetalert2";
    
    import FloatingChat from "$lib/components/FloatingChat.svelte"; 

    $: id = $page.params.id;
    let productReviews = [];
    let product = null;
    let loading = true;
    let error = null;
    let dataDetailProduk = {};
    let isSubmittingCart = false; 

    let offerPrice = 0;
    let showNegoModal = false;
    let isChatOpen = false;
    let averageRating = 0;
    let totalReviews = 0;

    let listVariasi = [];
    let pilihanVarianPembeli = {};
    let modeCustomAktif = false;
    let catatanCustom = "";
    let fileGambar = null;

    // Reactive statement: Otomatis menghitung ulang saat data productReviews berubah
    $: if (productReviews && productReviews.length > 0) {
        totalReviews = productReviews.length;
        
        // Menjumlahkan semua nilai rating yang ada di dalam array ulasan
        const totalScore = productReviews.reduce((sum, review) => sum + (review.rating || 0), 0);
        
        // Menghitung rata-rata dan membatasi hanya 1 angka di belakang koma (misal: 4.7)
        averageRating = parseFloat((totalScore / totalReviews).toFixed(1)); 
    } else {
        totalReviews = 0;
        averageRating = 0;
    }
    
    // 1. State pengunci agar API tidak menembak sebelum Firebase siap
    let isAuthReady = false; 

    // 2. Gunakan onMount untuk memantau kesiapan Firebase Auth sebelum memuat produk
    onMount(() => {
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            isAuthReady = true;
            
            // Jika user login, pastikan token paling segar disuntikkan ke Axios Interceptor
            if (user) {
                const token = await user.getIdToken();
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            }
            
            // Trigger load data jika ID produk sudah tersedia dari URL
            if (id) loadDetailProduct();
        });

        return unsubscribe;
    });

    async function submitNego() {
        const userLogin = getAuth().currentUser;
        try {
            await api.post("/buyer/negotiations", {
                product_id: product.id,
                product_name: product.product_name,
                seller_id: product.seller_id,
                offered_price: offerPrice,
                buyer_id: userLogin.uid,
                status: "pending",
            });
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
        if (!id || !isAuthReady) return;

        loading = true;
        error = null;
        try {
            // Panggil API Produk dan API Review Produk secara bersamaan (Parallel)
            // Catatan: Pastikan backend Anda punya endpoint GET /buyer/reviews/product/:product_id
            const [productRes, reviewsRes] = await Promise.all([
                api.get(`/buyer/products/${id}`),
                api.get(`/buyer/products/review/${id}`).catch(() => ({ data: [] })) // Fallback aman jika belum ada ulasan
            ]);

            product = productRes.data.data;
            dataDetailProduk = product;
            
            // Simpan data ulasan dari backend
            productReviews = Array.isArray(reviewsRes.data) ? reviewsRes.data : [];
            // console.log("=== DEBUG REVIEWS PRODUCT ===", productReviews);
            // ========================================================
            // 🌟 PROSES MAP BARU DARI FIREBASE DI SINI 🌟
            // ========================================================
            // Ambil objek variants, jika kosong otomatis beri objek kosong {}
            // Potong dengan .slice(0, 2) agar maksimal hanya mengambil 2 jenis variasi
            listVariasi = Object.entries(product.variants || {}).slice(0, 2);

            // Inisialisasi object pilihan agar default-nya kosong/belum terpilih
            pilihanVarianPembeli = {}; 
            // ========================================================

            // Simpan data ulasan dari backend
            productReviews = Array.isArray(reviewsRes.data) ? reviewsRes.data : [];

        } catch (err) {
            if (err.response?.status === 401) {
                error = "Sesi Anda telah habis atau tidak sah. Silakan login kembali.";
                triggerLoginAlert();
            } else {
                error = "Gagal memuat produk";
            }
            console.error(err);
        } finally {
            loading = false;
        }
    }

    // 3. Modifikasi reactive statement agar menunggu id DAN kesiapan auth berkas Firebase
    $: if (id && isAuthReady) loadDetailProduct();

    async function handlePesan(productId) {
    const userLogin = getAuth().currentUser;

    if (!userLogin) {
        triggerLoginAlert();
        return;
    }

    // 🛑 VALIDASI 1: Jika mode standar, pastikan semua variasi dari backend sudah dipilih
    if (!modeCustomAktif && listVariasi.length > 0) {
        for (const [namaVarian] of listVariasi) {
            if (!pilihanVarianPembeli[namaVarian]) {
                Swal.fire({
                    title: "Pilihan Belum Lengkap",
                    text: `Silakan pilih ${namaVarian} terlebih dahulu sebelum memesan.`,
                    icon: "warning",
                    confirmButtonColor: "#4f46e5"
                });
                return; // Batalkan proses pesanan
            }
        }
    }

    // 🛑 VALIDASI 2: Jika mode custom aktif, minimal text deskripsi diisi
    if (modeCustomAktif && !catatanCustom.trim()) {
        Swal.fire({
            title: "Deskripsi Kosong",
            text: "Mohon jelaskan permintaan kustomisasi Anda pada kolom yang disediakan.",
            icon: "warning",
            confirmButtonColor: "#4f46e5"
        });
        return;
    }

    try {
        // 🌟 GUnakan FormData karena ada potensi upload File Gambar 🌟
        const formData = new FormData();
        
        // Kirim status mode pesanan
        formData.append("is_custom", modeCustomAktif);

        if (!modeCustomAktif) {
            // Jika standar, kirim objek variasi (diubah jadi string JSON agar aman dikirim via FormData)
            formData.append("variants", JSON.stringify(pilihanVarianPembeli));
        } else {
            // Jika custom, kirim teks deskripsi dan file gambar (jika ada)
            formData.append("custom_note", catatanCustom);
            if (fileGambar) {
                formData.append("custom_image", fileGambar);
            }
        }

        // Kirim FormData ke backend
        const response = await api.post(`/products/${productId}`, formData, {
            headers: {
                "Content-Type": "multipart/form-data" // Wajib jika mengirim fileGambar
            }
        });

        if (response.status === 200 || response.status === 201) {
            await Swal.fire({
                title: "Berhasil Dipesan!",
                text: "Produk telah berhasil ditambahkan ke pesanan Anda.",
                icon: "success",
                timer: 2500,
                timerProgressBar: true,
                showConfirmButton: false,
            });

            // Opsional: Reset form setelah berhasil memesan
            pilihanVarianPembeli = {};
            catatanCustom = "";
            fileGambar = null;
            modeCustomAktif = false;
        }
    } catch (err) {
        console.error("Gagal melakukan pemesanan:", err);
        Swal.fire({
            title: "Gagal Memesan",
            text: err.response?.data?.message || "Terjadi kesalahan pada server, silakan coba lagi.",
            icon: "error",
            confirmButtonColor: "#dc3545",
        });
    }
}

    // async function handleTambahCart() {
    //     const userLogin = getAuth().currentUser;

    //     if (!userLogin) {
    //         triggerLoginAlert();
    //         return;
    //     }

    //     isSubmittingCart = true;
    //     addToCart(product, 1);

    //     Swal.fire({
    //         title: "Berhasil!",
    //         text: `${product.product_name} berhasil dimasukkan ke keranjang.`,
    //         icon: "success",
    //         toast: true,
    //         position: "top-end",
    //         showConfirmButton: false,
    //         timer: 2500,
    //         timerProgressBar: true,
    //     });

    //     isSubmittingCart = false;
    // }
    
    async function handleTambahCart() {
        const userLogin = getAuth().currentUser;

        if (!userLogin) {
            triggerLoginAlert();
            return;
        }

        // --- 1. VALIDASI INPUT PEMBELI ---
        if (modeCustomAktif) {
            // Jika mode custom aktif, pembeli wajib mengisi catatan atau mengirim gambar referensi
            if (!catatanCustom.trim() && !fileGambar) {
                Swal.fire("Peringatan", "Harap isi catatan custom atau unggah gambar referensi.", "warning");
                return;
            }
        } else {
            // Jika produk memiliki varian, pastikan pembeli memilih semua opsi dari objek 'product.variants'
            if (product.variants && Object.keys(product.variants).length > 0) {
                const jumlahVarianWajib = Object.keys(product.variants).length;
                const jumlahVarianDipilih = Object.keys(pilihanVarianPembeli).length;
                
                if (jumlahVarianDipilih < jumlahVarianWajib) {
                    Swal.fire("Peringatan", "Harap pilih variasi produk terlebih dahulu.", "warning");
                    return;
                }
            }
        }

        isSubmittingCart = true;

        // --- 2. BUNGKUS PAYLOAD DATA CART ---
        const payloadCart = {
            is_custom: modeCustomAktif,
            variants: modeCustomAktif ? {} : pilihanVarianPembeli,
            custom_note: modeCustomAktif ? catatanCustom : "",
            custom_image_file: modeCustomAktif ? fileGambar : null 
        };

        try {
            // Mengirim data ke fungsi utama addToCart
            await addToCart(product, 1, payloadCart);

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

            // --- 3. RESET FORM CUSTOM SETELAH BERHASIL ---
            catatanCustom = "";
            fileGambar = null;
            // Pilihan varian pembeli tidak perlu direset agar dropdown tidak mendadak kosong/error di UI
        } catch (error) {
            console.error("Gagal menambahkan ke keranjang:", error);
            Swal.fire("Gagal", "Terjadi kesalahan saat menyimpan ke keranjang.", "error");
        } finally {
            isSubmittingCart = false;
        }
    }

    function handleChatSekarang() {
        const userLogin = getAuth().currentUser;
        if (!userLogin) {
            triggerLoginAlert();
            return;
        }
        isChatOpen = true;
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                Kembali ke Daftar Produk
            </a>
        </div>
        <main>
            <section class="left-column">
                <div class="product-image">
                    <img src={product.image || product.image_url} alt={product.product_name} />
                </div>
            </section>
            <section class="right-column">
                <h2 class="nama-produk">{product.product_name}</h2>
                <div class="kategori">Kategori : {product.category || "-"}</div>
                <div class="total-penjualan">
                    Terjual : <strong>{product.sold_count}</strong> produk
                </div>
                <div class="harga">
                    Rp {product.price?.toLocaleString("id-ID")}
                </div>
                <div class="rating-summary-container" style="display: flex; align-items: flex-end; gap: 6px; margin: -5px 0 10px 0;">
                    {#if totalReviews > 0}
                        <div style="color: #f59e0b; font-size: 1.1rem; display: flex; gap: 2px;">
                            {#each Array(5) as _, i}
                                {@const starIndex = i + 1}
                                {@const diff = averageRating - i}

                                {#if diff >= 0.8}
                                    <i class="bi bi-star-fill"></i>
                                {:else if diff >= 0.3 && diff < 0.8}
                                    <i class="bi bi-star-half"></i>
                                {:else}
                                    <i class="bi bi-star"></i>
                                {/if}
                            {/each}
                        </div>
                        <strong style="font-size: 1rem; color: #1f2937; margin-left: 4px;">{averageRating}</strong>
                        <span style="color: #6b7280; font-size: 0.85rem;">({totalReviews} Ulasan)</span>
                    {:else}
                        <span style="color: #9ca3af; font-size: 0.85rem; font-style: italic;">Belum ada ulasan</span>
                    {/if}
                </div>

                <div class="product-customization-box" style=" padding: 15px; border: 1px dashed #ccc; border-radius: 8px; background-color: #fafafa;">
    
                    <!-- 1. JIKA PEMBELI MEMILIH BELI STANDAR (MODE CUSTOM NONAKTIF) -->
                    {#if !modeCustomAktif}
                        {#if listVariasi.length > 0}
                            <!-- 🌟 KONTAINER FLEX BARU AGAR BERJEJER HORIZONTAL 🌟 -->
                            <div style="display: flex; gap: 15px; flex-wrap: wrap; margin-bottom: 5px;">
                                {#each listVariasi as [namaVarian, opsiVarian]}
                                    <!-- Set flex: 1 dan width minimal agar pembagiannya rata ke samping -->
                                    <div class="variant-group" style="flex: 1; min-width: 140px; margin-bottom: 12px;">
                                        <label for={namaVarian} style="display: block; font-weight: bold; font-size: 0.9rem; margin-bottom: 4px; color: #4b5563;">
                                            Pilih {namaVarian.charAt(0).toUpperCase() + namaVarian.slice(1)}:
                                        </label>
                                        <select 
                                            id={namaVarian} 
                                            bind:value={pilihanVarianPembeli[namaVarian]} 
                                            style="width: 100%; padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 6px; background-color: white;"
                                        >
                                            <option value="" disabled selected>-- Pilih {namaVarian} --</option>
                                            {#each opsiVarian.slice(0, 3) as opsi}
                                                <option value={opsi}>{opsi}</option>
                                            {/each}
                                        </select>
                                    </div>
                                {/each}
                            </div>
                        {:else}
                            <p style="font-size: 0.85rem; color: #6b7280; margin: 0;">Produk ini tidak memiliki variasi standar.</p>
                        {/if}
                    {/if}

                    <!-- 2. SAKLAR TOMBOL UNTUK AKTIFKAN MODE CUSTOM -->
                    {#if product.is_customable}
                        <div style="margin-top: {modeCustomAktif ? '0' : '10px'};">
                            <button 
                                type="button" 
                                style="background: none; border: 1px solid #4f46e5; color: #4f46e5; padding: 6px 12px; border-radius: 6px; font-size: 0.85rem; cursor: pointer; font-weight: 500;"
                                on:click={() => {
                                    modeCustomAktif = !modeCustomAktif;
                                    if(modeCustomAktif) pilihanVarianPembeli = {};
                                    else { catatanCustom = ""; fileGambar = null; }
                                }}
                            >
                                {modeCustomAktif ? "← Kembali ke Varian Standar" : "✨ Ingin Kustom Sendiri (Warna/Motif)?"}
                            </button>
                        </div>
                    {/if}

                    <!-- 3. FORM INPUTAN CUSTOM -->
                    {#if modeCustomAktif}
                        <div class="custom-form-fields" style="margin-top: 15px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
                            <div style="margin-bottom: 12px;">
                                <label style="display: block; font-weight: bold; font-size: 0.9rem; margin-bottom: 4px; color: #4b5563;">
                                    Jelaskan Permintaan Kustomisasi Anda:
                                </label>
                                <textarea 
                                    bind:value={catatanCustom}
                                    placeholder="Contoh: Saya ingin warna dasarnya hijau sage motif bintik hitam, dan tinggi toples ditambah 5cm..." 
                                    rows="3"
                                    style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.85rem; resize: vertical;"
                                ></textarea>
                            </div>

                            <div>
                                <label style="display: block; font-weight: bold; font-size: 0.9rem; margin-bottom: 4px; color: #4b5563;">
                                    Upload 1 Foto Referensi Kustom:
                                </label>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    on:change={(e) => fileGambar = e.target.files[0]}
                                    style="font-size: 0.85rem; color: #4b5563;"
                                />
                                <small style="display: block; color: #9ca3af; font-size: 0.75rem; margin-top: 2px;">
                                    *Jika referensi berupa kombinasi 2 gambar, mohon gabungkan (kolase) terlebih dahulu.
                                </small>
                            </div>
                        </div>
                    {/if}
                </div>
                
                <div class="action-buttons">
                    <button type="button" class="btn-chat-sekarang" on:click={handleChatSekarang}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        Chat Sekarang
                    </button>

                    <button type="button" class="tambah-cart btn-pesan" on:click={() => handlePesan(product.id)}>
                        Pesan Sekarang
                    </button>
                    
                    <button type="button" class="tambah-cart btn-keranjang" disabled={isSubmittingCart} on:click={handleTambahCart}>
                        {#if isSubmittingCart} Memproses... {:else} Tambah ke Keranjang {/if}
                    </button>
                    
                    <button class="tambah-cart btn-tawar" on:click={openNegoModal}>
                        <i class="bi bi-tag"></i> Tawar Harga
                    </button>
                </div>

                {#if showNegoModal}
                    <div class="modal-backdrop">
                        <div class="modal-container">
                            <div class="modal-header">
                                <h3>Tawar Harga</h3>
                                <button class="close-btn" on:click={closeModal}>&times;</button>
                            </div>

                            <div class="modal-body">
                                <p class="product-name">Produk: <strong>{product.product_name}</strong></p>
                                <p class="price-info">Harga Normal: <strong>Rp {product.price.toLocaleString()}</strong></p>

                                <div class="input-group">
                                    <label for="offer">Masukkan Harga Penawaran (Rp)</label>
                                    <input type="number" id="offer" bind:value={offerPrice} placeholder="Contoh: 150000" />
                                </div>
                            </div>

                            <div class="modal-footer">
                                <button class="btn-cancel" on:click={closeModal}>Batal</button>
                                <button class="btn-submit" on:click={submitNego}>Kirim Penawaran</button>
                            </div>
                        </div>
                    </div>
                {/if}
            </section>
        </main>
        <section class="reviews-section">
            <h3 class="reviews-title">Ulasan Pembeli ({productReviews.length})</h3>
            
            {#if productReviews.length === 0}
                <div class="no-reviews">
                    <p>Belum ada ulasan untuk produk ini.</p>
                </div>
            {:else}
                <div class="reviews-list">
                    {#each productReviews.slice(0, 3) as review}
                        <div class="review-card">
                            <div class="review-header">
                                <div class="buyer-info">
                                    <strong class="buyer-name">Pembeli #{review.buyer_id?.substring(0, 5)}...</strong>
                                    <span class="review-date">
                                        {new Date(review.created_at).toLocaleDateString("id-ID", {
                                            year: "numeric", month: "long", day: "numeric"
                                        })}
                                    </span>
                                </div>
                                <div class="review-stars">
                                    {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                                </div>
                            </div>
                            {#if review.comment !== ""}
                                <p class="review-comment">
                                    "{review.comment || "Pembeli tidak memberikan ulasan tertulis."}"
                                </p>
                            {/if}
                        </div>
                    {/each}

                    {#if productReviews.length > 3}
                        <p style="text-align: center; color: #6b7280; font-size: 0.85rem; margin-top: 10px;">
                            Menampilkan 3 dari {productReviews.length} ulasan.
                        </p>
                    {/if}
                </div>
            {/if}
        </section>

        <FloatingChat 
            bind:isOpen={isChatOpen} 
            activeProductId={product.id} 
            activeProductData={{
                product_id: product.id,
                title: product.product_name,
                price: product.price,
                image_url: product.image || product.image_url,
                seller_id: product.seller_id,
                seller_name: product.seller_name || "Toko Penjual" // Pastikan API mengembalikan data nama penjual
            }} 
        />
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

    .action-buttons {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-top: 10px;
    }
    .btn-chat-sekarang {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px;
        background-color: #fff5f3;
        color: #ee4d2d;
        border: 1px solid #ee4d2d;
        border-radius: 8px;
        cursor: pointer;
        font-size: 1rem;
        font-weight: 600;
        transition: background-color 0.2s;
    }
    .btn-chat-sekarang:hover {
        background-color: #ffeae6;
    }

    .tambah-cart {
        padding: 12px;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 1rem;
        font-weight: 500;
    }
    .btn-pesan { background: #2ecc71; }
    .btn-pesan:hover { background: #27ae60; }
    .btn-keranjang { background: #2563eb; }
    .btn-keranjang:hover { background: #1d4ed8; }
    .btn-tawar { background: #f59e0b; }
    .btn-tawar:hover { background: #d97706; }
</style>
