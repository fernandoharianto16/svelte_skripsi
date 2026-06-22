<script>
  export let image = ""; 
  export let title = "Produk Tanpa Nama";
  export let price = 0;
  export let soldCount = 0;
  export let id="";

  function formatRupiah(number) {
    return new Intl.NumberFormat('id-ID').format(number);
  }
</script>

<div class="product-card">
  <div class="image-container">
    <img src={image || "https://via.placeholder.com/250"} alt={title} loading="lazy" />
  </div>

  <div class="product-info">
    <h3 class="product-title">{title}</h3>

    <div class="product-footer">
      <span class="product-price">
        <span class="currency">Rp</span>{formatRupiah(price)}
      </span>
      <span class="product-sold">
        {soldCount > 999 ? (soldCount/1000).toFixed(1) + 'RB+' : soldCount} terjual
      </span>
    </div>
  </div>
</div>

<style>
  .product-card {
    width: 100%; 
    max-width: 250px; /* 🔥 Selesai! Sudah diperlebar ke 250px agar tulisan tidak mepet */
    background-color: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    cursor: pointer;
    box-sizing: border-box;
  }

  .product-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .image-container {
    position: relative;
    width: 100%;
    aspect-ratio: 1 / 1; 
    background-color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .image-container img {
    width: 100%;
    height: 100%;
    object-fit: cover; 
  }

  .product-info {
    padding: 12px; /* Sedikit ditambah dari 10px ke 12px agar jarak padding bagian dalam lebih seimbang dengan lebar baru */
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .product-title {
    margin: 0;
    font-size: 13px;
    font-weight: 400;
    color: #212121;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2; 
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    min-height: 36.4px; 
  }

  .product-footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }

  .product-price {
    color: #ff4500;
    font-size: 13px; 
    font-weight: 500;
  }

  .product-price .currency {
    font-size: 10px; 
    margin-right: 1px;
  }

  .product-sold {
    font-size: 11px;
    color: #757575;
  }
</style>