<script>
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import api from "$lib/api/axios";
  import { goto } from "$app/navigation";

  const order_id = $page.params.order_id;

  let orderMain = null; // Untuk menampung data object 'order'
  let orderDetails = []; // Untuk menampung data array 'details'
  let orderReviews = [];
  let loading = true;
  let errorMessage = "";

  onMount(async () => {
    try {
      // Menembak kedua API secara bersamaan (Parallel)
      const [orderRes, reviewRes] = await Promise.all([
        api.get(`/buyer/orders/${order_id}`),
        api.get(`/buyer/orders/review/${order_id}`), // Sesuaikan dengan endpoint review backend Anda
      ]);

      // console.log("=== DEBUG ORDER ===", orderRes.data);
      // console.log("=== DEBUG REVIEW ===", reviewRes.data);

      if (orderRes.data) {
        orderMain = orderRes.data.order || null;
        const rawDetails = orderRes.data.details || []; // Ambil data detail asli dulu
        const reviewData = reviewRes.data || null; // Ambil data review dari backend

        // Lakukan mapping untuk menempelkan rating dan comment ke tiap produk
        orderDetails = rawDetails.map((detail) => {
          // Cari apakah ada review yang cocok dengan product_id milik detail ini
          // (Gunakan kondisi ini jika reviewData berbentuk objek tunggal atau array)
          const matchingReview = Array.isArray(reviewData)
            ? reviewData.find((rev) => rev.product_id === detail.product_id)
            : reviewData && reviewData.product_id === detail.product_id
              ? reviewData
              : null;

          return {
            ...detail,
            // Tempelkan data jika ketemu, jika tidak beri nilai default (null/0)
            rating: matchingReview ? matchingReview.rating : null,
            comment: matchingReview ? matchingReview.comment : "",
          };
        });

        // console.log("=== HASIL MAPPING DETAILS ===", orderDetails);
      } else {
        errorMessage = "Gagal memuat detail pesanan.";
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      errorMessage =
        err.response?.data?.message || "Terjadi kesalahan pada server.";
    } finally {
      loading = false;
    }
  });
</script>

<div class="detail-container">
  {#if loading}
    <div class="state-box">
      <div class="spinner"></div>
      <p>Memuat rincian pesanan Anda...</p>
    </div>
  {:else if errorMessage}
    <div class="state-box error-box">
      <p class="error-text">⚠️ {errorMessage}</p>
      <button on:click={() => goto('/buyer/orders')} class="btn-back">
            <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
            >
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Kembali ke Daftar Pesanan Saya
        </button>
    </div>
  {:else if orderMain}
    <div class="back-navigation">
      <a href="/buyer/orders" class="btn-back">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Kembali ke Daftar Pesanan
      </a>
    </div>

    <div class="card-header">
      <div class="header-info">
        <span class="order-label">ORDER ID</span>
        <h3 class="order-id-text">{order_id}</h3>
        {#if orderMain.created_at}
          <p class="order-date">
            Dibuat pada: {new Date(orderMain.created_at).toLocaleDateString(
              "id-ID",
              { day: "numeric", month: "long", year: "numeric" },
            )}
          </p>
        {/if}
      </div>
      <div class="header-status">
        <span class="badge-status-completed"
          >{(
            orderMain.order_status ||
            orderMain.request_status ||
            "COMPLETED"
          ).toUpperCase()}</span
        >
      </div>
    </div>
    {#if (orderMain.order_status === 'canceled' || orderMain.request_status === 'canceled')}
      <div class="cancel-reason-box" style="margin-top: 8px; font-size: 12px; color: #dc2626; text-align: right;">
        <strong>Alasan:</strong> {orderMain.cancel_reason || orderMain.cancellation_reason || 'Dibatalkan oleh sistem.'}
      </div>
    {/if}

    <div class="section-title">
      <h4>Item yang Dibeli & Ulasan Anda</h4>
    </div>

    <div class="items-list">
      {#each orderDetails as product}
  <div class="product-card-wrapper">
    <div class="product-info-row">
      <img
        src={product.product_image_at_purchase ||
          product.image ||
          product.reference_image ||
          ""}
        alt={product.product_name}
        class="product-image-mini"
      />
      <div class="product-details">
        <h5 class="product-name">{product.product_name || "Produk"}</h5>
        <p class="product-pricing">
          {product.quantity || 1} barang ×
          <span class="price-unit">
            Rp {(
              product.product_price_at_purchase ||
              product.price ||
              orderMain?.negotiated_price ||
              0
            ).toLocaleString("id-ID")}
          </span>
        </p>
      </div>
      <div class="product-subtotal">
        <h5>
          Rp {(
            (product.product_price_at_purchase ||
              product.price ||
              orderMain?.negotiated_price ||
              0) * (product.quantity || 1)
          ).toLocaleString("id-ID")}
        </h5>
      </div>
    </div>

    <div class="review-bubble-box">
      {#if product.rating}
        <div class="review-stars-row">
          <span class="stars-gold">
            {"★".repeat(product.rating)}{"☆".repeat(5 - product.rating)}
          </span>
          <span class="rating-score">({product.rating} / 5 Bintang)</span>
        </div>
        <p class="review-comment-text">
          "{product.comment || "Anda tidak menyertakan ulasan tertulis."}"
        </p>
      {:else}
        <p class="no-review-text">
          <i>⚠️ Anda belum menulis ulasan pada produk ini.</i>
        </p>
      {/if}
    </div>
  </div>
{/each}
    </div>

    <div class="footer-summary-card">
      <div class="total-row">
        <span class="total-label">Total Pembayaran</span>
        <h3 class="total-value-green">
          Rp {(
            orderMain.total_price ||
            orderMain.negotiated_price ||
            0
          ).toLocaleString("id-ID")}
        </h3>
      </div>

      <hr class="card-divider" />

      <div class="shipment-proof-section">
        <h5>Bukti Pengiriman dari Penjual:</h5>
        {#if orderMain.shipment_proof}
          <div class="image-wrapper">
            <img
              src={orderMain.shipment_proof}
              alt="Bukti Resi Pengiriman"
              class="img-resi-fluid"
            />
          </div>
        {:else}
          <p class="no-proof-text">
            <i>(Tidak ada lampiran gambar bukti pengiriman)</i>
          </p>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  /* Style tetap sama seperti CSS rapi yang kita buat sebelumnya */
  .detail-container {
    max-width: 680px;
    margin: 30px auto;
    padding: 0 16px;
    font-family: sans-serif;
  }
  .card-header {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .order-id-text {
    margin: 2px 0 6px 0;
    color: #2d3748;
    font-size: 20px;
    font-weight: 600;
  }
  .badge-status-completed {
    background: #ebf8ff;
    color: #2b6cb0;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 700;
  }
  .product-card-wrapper {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 16px;
  }
  .product-info-row {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .product-image-mini {
    width: 60px;
    height: 60px;
    object-fit: cover;
    border-radius: 8px;
  }
  .product-name {
    margin: 0 0 4px 0;
    font-size: 16px;
    font-weight: 600;
  }
  .review-bubble-box {
    margin-top: 14px;
    background: #f7fafc;
    border-left: 4px solid #ecc94b;
    padding: 12px 14px;
    border-radius: 4px;
  }
  .stars-gold {
    color: #ecc94b;
  }
  .total-value-green {
    color: #38a169;
    font-size: 22px;
    font-weight: 700;
    margin: 0;
  }
  .card-divider {
    border: 0;
    border-top: 1px dashed #e2e8f0;
    margin: 18px 0;
  }
  .img-resi-fluid {
    max-width: 100%;
    max-height: 250px;
    object-fit: contain;
    border-radius: 6px;
  }
  .state-box {
    text-align: center;
    padding: 40px 20px;
  }
  .spinner {
    border: 3px solid #f3f3f3;
    border-top: 3px solid #4a5568;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    animation: spin 1s linear infinite;
    margin: 0 auto 12px auto;
  }
  /* Container Navigasi */
  .back-navigation {
    display: block;
    margin: 15px 0; /* Memberikan ruang di atas dan bawah */
  }

  /* Tombol / Link Kembali */
  .btn-back {
    display: inline-flex;
    align-items: center;
    gap: 10px; /* Mengatur jarak antara ikon panah dan teks */
    text-decoration: none; /* Menghilangkan garis bawah bawaan tag <a> */
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      Helvetica, Arial, sans-serif;
    font-size: 15px;
    font-weight: 500;
    color: #1d4ed8; /* Warna teks biru modern (bisa diganti sesuai kecocokan) */
    transition: color 0.2s ease;
  }

  /* Mengatur warna ikon SVG secara spesifik */
  .btn-back svg {
    color: #4b5563; /* Warna abu-abu gelap untuk ikon panah */
    flex-shrink: 0;
  }

  /* Efek ketika kursor diarahkan (Hover) */
  .btn-back:hover {
    color: #1e40af; /* Warna biru sedikit lebih gelap saat di-hover */
    text-decoration: underline; /* Opsional: memberi garis bawah halus saat hover */
  }
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
</style>
