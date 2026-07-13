<script>
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import api from '$lib/api/axios';
  import Swal from 'sweetalert2';
  import { goto } from '$app/navigation';

  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
  });

  $: order_id = $page.params.order_id;

  let orderData = null;
  let loading = true;
  let errorMessage = "";

  // 1. MEMUAT DATA DETAIL ORDER DENGAN FIELD KUSTOMISASI BARU
  async function loadOrderDetails() {
    try {
      loading = true;
      
      const res = await api.get(`/buyer/orders/${order_id}`);
      const dataRespons = res.data;

      if (dataRespons && dataRespons.order) {
        const orderMain = dataRespons.order;
        const listDetail = dataRespons.details || [];
        orderData = {
          order_id: orderMain.id || order_id,
          date: orderMain.created_at || "Baru saja", 
          products: listDetail.map(item => ({
            id: item.product_id,
            name: item.product_name_at_purchase,
            price: item.product_price_at_purchase,
            img: item.product_image_at_purchase, 
            quantity: item.quantity,
            // 🌟 Petakan properti kustomisasi dari DB ke objek front-end
            is_custom: item.is_custom || false,
            variants: item.variants || {},
            custom_note: item.custom_note || "",
            custom_image: item.custom_image || "",
            rating: 0,   
            comment: ""  
          }))
        };
      } else {
        throw new Error("Struktur data pesanan tidak dikenali.");
      }
    } catch (error) {
      console.error(error);
      errorMessage = error.message || "Gagal memuat detail produk untuk diulas.";
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    if (order_id) {
      loadOrderDetails();
    }
  });

  // 2. LOGIKA SUBMIT
  async function handleSubmit() {
    const unreviewedProducts = orderData.products.filter(p => p.rating === 0);
    
    if (unreviewedProducts.length > 0) {
      Toast.fire({
        icon: 'warning',
        title: 'Rating Bintang Wajib',
        text: 'Mohon berikan rating bintang terlebih dahulu untuk semua produk.'
      });
      return;
    }

    const payload = orderData.products.map(product => ({
      order_id: orderData.order_id,
      product_id: product.id,
      rating: product.rating,
      comment: product.comment
    }));

    try {
      await api.post('/buyer/orders/reviews', payload);
      
      Toast.fire({
        icon: 'success',
        title: 'Ulasan Berhasil!',
        text: 'Terima kasih! Ulasan Anda berhasil disimpan.'
      });

      setTimeout(() => {
        goto('/buyer/orders');
      }, 2000);

    } catch (err) {
      console.error(err);
      Toast.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: err.response?.data?.message || 'Gagal menyimpan ulasan, coba beberapa saat lagi.'
      });
    }
  }
</script>

<main class="review-container">
  {#if loading}
    <div class="loading-state">Sedang memuat data pesanan...</div>
  {:else if errorMessage}
    <div class="error-state">{errorMessage}</div>
  {:else if orderData}
    <header class="review-header">
      <a href="/buyer/orders" class="btn-back">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/>
        </svg>
        Kembali ke Daftar Pesanan
      </a>
      <h2>Ulas Pesanan Anda</h2>
      <p class="order-meta">Nomor Pesanan: <span>{orderData.order_id}</span> • {orderData.date}</p>
    </header>

    <form on:submit|preventDefault={handleSubmit}>
      
      {#each orderData.products as product, index}
        <div class="product-card">
          
          <div class="product-info">
            <img src={product.img} alt={product.name} class="product-img" />
            <div class="product-detail">
              <h3>{product.name}</h3>
              <p class="product-qty">Jumlah: {product.quantity} pcs</p>
              <p class="product-price">Rp {product.price.toLocaleString('id-ID')}</p>
              
              <!-- 🌟 MENAMPILKAN VARIAN STANDAR (Jika Ada) -->
              {#if Object.keys(product.variants).length > 0}
                <div class="variants-badge-wrapper">
                  {#each Object.entries(product.variants) as [key, value]}
                    <span class="variant-badge">
                      <strong>{key}:</strong> {value}
                    </span>
                  {/each}
                </div>
              {/if}
            </div>
          </div>

          <!-- 🌟 MENAMPILKAN DETAIL KUSTOMISASI PEMBELI (Jika is_custom = true) -->
          {#if product.is_custom}
            <div class="custom-specs-box">
              <div class="custom-title-row">
                <span class="badge-custom-status">Produk Kustom</span>
              </div>
              
              {#if product.custom_note}
                <div class="custom-note-view">
                  <strong>Catatan Kustom Pembeli:</strong>
                  <p>"{product.custom_note}"</p>
                </div>
              {/if}

              {#if product.custom_image}
                <div class="custom-image-view">
                  <strong>Referensi Kustom (Klik gambar untuk memperbesar):</strong>
                  <div class="preview-img-wrapper">
                    <!-- 🌟 Gambar dibungkus tag <a> agar langsung clickable -->
                    <a href={product.custom_image} target="_blank" rel="noopener noreferrer" class="img-link-container">
                      <img src={product.custom_image} alt="Referensi Desain Kustom" class="clickable-preview-img" />
                      <!-- <div class="img-overlay-hover">
                        <span>Buka Foto ↗</span>
                      </div> -->
                    </a>
                  </div>
                </div>
              {/if}
            </div>
          {/if}

          <hr class="divider" />

          <div class="review-inputs">
            
            <div class="rating-section">
              <span class="section-label">Kualitas Produk</span>
              <div class="stars-wrapper">
                {#each [5, 4, 3, 2, 1] as star}
                  <input 
                    type="radio" 
                    id="star-{index}-{star}" 
                    name="rating-{index}" 
                    value={star} 
                    bind:group={product.rating}
                  />
                  <label for="star-{index}-{star}">★</label>
                {/each}
              </div>
              {#if product.rating > 0}
                <span class="rating-hint">({product.rating} dari 5 bintang)</span>
              {/if}
            </div>

            <div class="comment-section">
              <label for="comment-{index}" class="section-label">Bagikan ulasan Anda (opsional)</label>
              <textarea 
                id="comment-{index}"
                bind:value={product.comment} 
                rows="3" 
                placeholder="Bagaimana kualitas bahan, ukuran, atau pengiriman produk ini? Ceritakan di sini..."
              ></textarea>
            </div>

          </div>

        </div>
      {/each}

      <div class="form-actions">
        <button type="submit" class="btn-submit">Kirim Semua Ulasan</button>
      </div>

    </form>
  {/if}
</main>

<style>
  :global(body) {
    background-color: #f4f6f9;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #333;
    margin: 0;
  }

  .review-container {
    max-width: 680px;
    margin: 40px auto;
    padding: 0 20px;
  }

  .loading-state, .error-state {
    text-align: center;
    padding: 40px;
    font-weight: 500;
    color: #6c757d;
  }
  
  .error-state {
    color: #dc3545;
  }

  .review-header {
    margin-bottom: 30px;
  }

  .btn-back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #6c757d;
    text-decoration: none;
    font-size: 14px;
    margin-bottom: 15px;
  }

  .btn-back:hover {
    color: #333;
  }

  .review-header h2 {
    margin: 0 0 5px 0;
    font-size: 24px;
    font-weight: 700;
  }

  .order-meta {
    margin: 0;
    color: #6c757d;
    font-size: 14px;
  }

  .order-meta span {
    color: #212529;
    font-weight: 600;
  }

  /* Kartu Per Produk */
  .product-card {
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    padding: 24px;
    margin-bottom: 24px;
  }

  .product-info {
    display: flex;
    gap: 16px;
    align-items: center;
  }

  .product-img {
    width: 72px;
    height: 72px;
    border-radius: 8px;
    object-fit: cover;
    background: #eee;
  }

  .product-detail h3 {
    margin: 0 0 4px 0;
    font-size: 15px;
    font-weight: 600;
    line-height: 1.4;
  }

  .product-price {
    margin: 0;
    color: #212529;
    font-weight: 600;
    font-size: 14px;
  }

  .product-qty {
    margin: 2px 0;
    color: #8a94a6;
    font-size: 13px;
  }

  /* Styling Varian */
  .variants-badge-wrapper {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 6px;
  }

  .variant-badge {
    background-color: #f1f5f9;
    color: #475569;
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 12px;
    border: 1px solid #e2e8f0;
  }

  /* 🌟 Styling Box Kustomisasi Baru */
  .custom-specs-box {
    margin-top: 16px;
    background-color: #fafafa;
    border-left: 4px solid #ff9800;
    border-radius: 0 8px 8px 0;
    padding: 14px;
  }

  .badge-custom-status {
    background-color: #fff3e0;
    color: #e65100;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 4px;
    text-transform: uppercase;
    display: inline-block;
    margin-bottom: 8px;
  }

  .custom-note-view strong, .custom-image-view strong {
    font-size: 13px;
    color: #4a5568;
    display: block;
    margin-bottom: 4px;
  }

  .custom-note-view p {
    margin: 0 0 10px 0;
    font-size: 13px;
    color: #2d3748;
    font-style: italic;
    background: #fff;
    padding: 8px 12px;
    border-radius: 6px;
    border: 1px dashed #e2e8f0;
  }

  .preview-img-wrapper {
    display: flex;
    align-items: flex-end;
    gap: 12px;
    margin-top: 6px;
  }

  .preview-img-wrapper img {
    width: 90px;
    height: 90px;
    object-fit: cover;
    border-radius: 6px;
    border: 1px solid #cbd5e1;
    background: #fff;
  }

  .btn-zoom {
    font-size: 12px;
    color: #ff9800;
    text-decoration: none;
    font-weight: 500;
  }

  .btn-zoom:hover {
    text-decoration: underline;
  }

  .divider {
    border: 0;
    border-top: 1px solid #edf2f7;
    margin: 20px 0;
  }

  .section-label {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: #4a5568;
    margin-bottom: 10px;
  }

  .rating-section {
    text-align: center;
    margin-bottom: 20px;
  }

  .stars-wrapper {
    direction: rtl; 
    display: inline-flex;
    gap: 4px;
  }

  .stars-wrapper input {
    display: none; 
  }

  .stars-wrapper label {
    font-size: 32px;
    color: #e2e8f0;
    cursor: pointer;
    transition: color 0.15s ease;
  }

  .stars-wrapper input:checked ~ label,
  .stars-wrapper label:hover,
  .stars-wrapper label:hover ~ label {
    color: #ffb74d;
  }

  .rating-hint {
    display: block;
    font-size: 12px;
    color: #a0aec0;
    margin-top: 4px;
  }

  .comment-section textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 12px;
    font-family: inherit;
    font-size: 14px;
    resize: vertical;
    outline: none;
    transition: border-color 0.2s;
  }

  .comment-section textarea:focus {
    border-color: #ffb74d;
    box-shadow: 0 0 0 3px rgba(255, 183, 77, 0.15);
  }

  .form-actions {
    margin-top: 32px;
  }

  .btn-submit {
    width: 100%;
    background-color: #ff9800;
    color: white;
    border: none;
    padding: 14px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;
    box-shadow: 0 4px 6px rgba(255, 152, 0, 0.15);
  }

  .btn-submit:hover {
    background-color: #f57c00;
  }
</style>