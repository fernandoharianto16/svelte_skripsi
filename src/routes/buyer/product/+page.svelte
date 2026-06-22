<script>
  import { onMount } from "svelte";
  import api from "$lib/api/axios";
  import ProductCard from "../../../lib/components/ProductCard.svelte";
  
  let searchQuery = "";
  let selectedCategory = "";
  const categories = ["Accessories", "Fashion", "Dekorasi", "Mainan"];

  import { goto } from "$app/navigation";
  import { auth } from "$lib/firebase"; 
  import { signOut } from "firebase/auth";
  let showDropdown = false;

  function toggleDropdown() {
    showDropdown = !showDropdown;
  }

  async function handleLogout() {
  try {
    // 1. Proses logout dari Firebase
    await signOut(auth);
    showDropdown = false;

    // 2. Tampilkan notifikasi SweetAlert2
    await Swal.fire({
      title: "Berhasil Logout",
      text: "Anda telah keluar dari akun dengan aman.",
      icon: "success",
      timer: 2000, // Notifikasi otomatis tertutup dalam 2 detik
      timerProgressBar: true,
      showConfirmButton: false // Menghilangkan tombol OK agar terlihat lebih seamless
    });

    // 3. Pindah ke halaman login setelah notifikasi selesai/tertutup
    goto("/login");

  } catch (error) {
    console.error("Gagal logout:", error);
    
    // Jaga-jaga jika proses logout Firebase gagal
    Swal.fire({
      title: "Gagal Logout",
      text: "Terjadi kesalahan pada server, silakan coba lagi.",
      icon: "error"
    });
  }
}

  let products = [];
  let isLoading = true;

  // 1. Fungsi Mengambil Data
  async function loadProducts() {
    try {
      isLoading = true;
      const res = await api.get(`/buyer/products`);
      products = res.data.data;
      console.log("Struktur data produk:", products[0]);
    } catch (err) {
      console.error("Gagal memuat produk:", err);
    } finally {
      isLoading = false;
    }
  }

  // 2. Fungsi Filter (Reaktif)
  // Ini akan berjalan otomatis setiap kali searchQuery atau selectedCategory berubah
  $: filteredProducts = products.filter((product) => {
    // Tambahkan ini untuk melihat data asli dari database
    const matchesSearch = product.product_name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "" || product.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  onMount(() => {
    loadProducts();
  });
</script>

<svelte:head>
  <title>
    Products
  </title>
</svelte:head>

<div class="container">
  <div class="header">
    <input
      type="text"
      bind:value={searchQuery}
      placeholder="Cari produk berdasarkan nama..."
    />
    <!-- <div class="profile-menu">
      <button class="profile-icon" on:click={toggleDropdown} aria-label="Menu profil">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </button>

      {#if showDropdown}
        <div class="dropdown-content">
          <a href="/profil">Profil Saya</a>
          <a href="/buyer/orders/">Pesanan Saya</a>
          <button on:click={handleLogout} class="logout-btn">Logout</button>
        </div>
      {/if}
    </div> -->
  </div>

  <div class="categories">
    <div
      class:selected={selectedCategory === ""}
      on:click={() => (selectedCategory = "")}
    >
      Semua
    </div>
    
    {#each categories as category}
      <div
        class:selected={selectedCategory === category}
        on:click={() => (selectedCategory = category)}
      >
        {category}
      </div>
    {/each}
  </div>

  <div class="products-container">
    {#if isLoading}
      <div class="state-msg">Memuat produk dari database...</div>
    {:else if filteredProducts.length === 0}
      <div class="state-msg">Tidak ada produk ditemukan.</div>
    {:else}
      <div class="product-grid">
        {#each filteredProducts as product (product.id || product._id)}
          <a href="/buyer/product/{product.id}" class="product-link">
            <ProductCard
              image={product.image_url || product.image}
              title={product.product_name}
              price={product.price}
              soldCount={product.total_sold || 0}
            />
          </a>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .container {
    font-family: Arial, sans-serif;
    padding: 20px;
  }

  .header {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
  }
  .header input {
    flex-grow: 1;
    padding: 10px;
    border-radius: 8px;
    border: 1px solid #ccc;
  }

  .categories {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-bottom: 30px;
  }
  .categories div {
    padding: 8px 20px;
    border: 1px solid #333;
    border-radius: 20px;
    cursor: pointer;
  }
  .categories div.selected {
    background: #333;
    color: #fff;
  }

  .product-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 20px;
  }

  .product-link {
    text-decoration: none;
    color: inherit;
    display: block; /* Penting: agar <a> mengikuti ukuran ProductCard */
  }

  .state-msg {
    text-align: center;
    padding: 50px;
    color: #888;
  }

  .profile-menu {
    position: relative; /* Penting untuk posisi dropdown */
  }

  .profile-icon {
    background: none;
    border: 1px solid #000;
    cursor: pointer;
    padding: 8px;
    color: currentColor;
  }

  .dropdown-content {
    position: absolute;
    right: 0;
    top: 100%;
    background: white;
    min-width: 150px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    border-radius: 8px;
    padding: 8px 0;
    display: flex;
    flex-direction: column;
    z-index: 1000;
  }

  .dropdown-content a, .dropdown-content .logout-btn {
    padding: 10px 16px;
    text-decoration: none;
    color: #333;
    border: none;
    background: none;
    text-align: left;
    cursor: pointer;
    font-size: 14px;
  }

  .dropdown-content a:hover, .logout-btn:hover {
    background: #f8f9fa;
  }
</style>
