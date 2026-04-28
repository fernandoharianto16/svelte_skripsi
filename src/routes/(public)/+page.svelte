<script>
  let searchQuery = "";
  let selectedCategory = "";
  import api from "$lib/api/axios";
  const categories = ["Accessories", "Fashion", "Dekorasi", "Mainan"];
  import { onMount } from "svelte";

  function selectCategory(category) {
    selectedCategory = category;
    console.log("Kategori dipilih:", category);
  }

  async function loadProducts() {
    try {
      const res = await api.get(`/products`);
      products = res.data.data;

      console.log("Products loaded:", products);
    } catch (err) {
      console.error(err);
    } finally {
      // loading = false;
    }
  }

  onMount(() => {
    loadProducts();
  });
</script>

<!-- Bagian Header -->
<div class="header">
  <div>Logo</div>
  <input type="text" bind:value={searchQuery} placeholder="Kolom pencarian" />
  <div class="icon">Cart</div>
  <div class="icon">Notif</div>
  <div class="icon">CS</div>
  <div class="icon">Profile</div>
</div>

<!-- Bagian Kategori -->
<div class="categories">
  {#each categories as category}
    <div
      class:selected={selectedCategory === category}
      on:click={() => selectCategory(category)}
    >
      {category}
    </div>
  {/each}
</div>

<!-- Bagian Produk -->
<div class="products">
  {#each Array(10)
    .fill()
    .map((_, i) => `Gambar produk ${i + 1}`) as product}
    <div>{product}</div>
  {/each}
</div>

<style>
  body {
    font-family: Arial, sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 0;
    padding: 0;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 10px;
    border-bottom: 1px solid #000;
  }

  .header div,
  .header input {
    margin: 0 10px;
  }

  .header input {
    flex-grow: 1;
    padding: 5px;
  }

  .icon {
    width: 40px;
    height: 40px;
    border: 1px solid #000;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .categories,
  .products {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    margin: 20px 0;
  }

  .categories div,
  .products div {
    width: 150px;
    height: 50px;
    border: 1px solid #000;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 10px;
    cursor: pointer;
    transition: 0.2s;
  }

  .categories div:hover {
    background-color: #f0f0f0;
  }

  /* 🔥 kategori aktif */
  .categories div.selected {
    background-color: #000;
    color: #fff;
  }

  .products div {
    height: 100px;
  }
</style>
