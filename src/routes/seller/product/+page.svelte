<script>
  import { onMount } from "svelte";
  import ProductForm from "$lib/components/ProductForm.svelte";
  export let params;
  import api from "$lib/api/axios";
  import { auth } from "$lib/firebase";
  import { onAuthStateChanged } from "firebase/auth";
  import Swal from "sweetalert2";

  let products = [];
  let loading = true;
  // let page = 1;
  // let totalPages = 1;
  // let products = [];
  let currentPage = 1;
  let pageSize = 5;

  let search = "";
  let sortField = null;
  let sortOrder = "desc";

  // const API_URL = import.meta.env.VITE_API_URL;

  onMount(() => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        console.error("User belum login");
        return;
      }

      await loadProducts();
    });
  });

  async function loadProducts() {
    try {
      loading = true;

      const res = await api.get(`/seller/products`);
      products = res.data.data;

      console.log("Products loaded:", products);
    } catch (err) {
      console.error(err);
    } finally {
      loading = false;
    }
  }

  let mode = "-";
  let showModal = false;
  let selectedProduct = null;
  // let actionModal = "-";

  function openAddModal() {
    mode = "add";
    console.log("modal add dibuka");
    showModal = true;
  }

  function openEditModal(product) {
    mode = "edit";
    console.log("modal edit dibuka");
    selectedProduct = product;
    // console.log(selectedProduct);
    showModal = true;
  }

  function openDetailModal(product) {
    mode = "detail";
    console.log("modal detail dibuka");
    selectedProduct = product;
    // console.log(selectedProduct);
    showModal = true;
  }

  function closeModal() {
    showModal = false;
  }

  async function deleteProduct(id) {
    // 🔹 ganti confirm
    const result = await Swal.fire({
      title: "Yakin ingin menghapus produk ini?",
      text: "Data tidak bisa dikembalikan",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Hapus",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await api.delete(`/seller/products/${id}`);
      const data = res.data;

      // 🔥 update state
      products = products.filter((p) => p.id !== id);

      // 🔹 success alert
      await Swal.fire({
        icon: "success",
        title: "Berhasil dihapus",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2000,
      });
    } catch (error) {
      console.error(error);

      // 🔹 error alert
      await Swal.fire({
        icon: "error",
        title: "Gagal Menghapus",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2000,
      });
    }
  }

  async function handleSaved(event) {
    const product = event.detail;

    console.log("ini log di parent frontend produk, disimpan:", product);

    // nanti disini bisa panggil API
    // SETELAH MODAL SELESAI MENGIRIM DISPATCH SAVED MAKA INI AKAN DIJALANKAN
    closeModal();
    await Swal.fire({
      icon: "success",
      title: "Product Berhasil Ditambahkan",
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 2000,
    });

    loadProducts();
  }

  $: filteredProducts = products.filter((p) =>
    p.product_name.toLowerCase().includes(search.toLowerCase()),
  );

  $: sortedProducts = [...filteredProducts].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    // handle undefined
    if (valA == null) return 1;
    if (valB == null) return -1;

    if (sortOrder === "asc") {
      return valA > valB ? 1 : -1;
    } else {
      return valA < valB ? 1 : -1;
    }
  });

  $: paginatedProducts = sortedProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  $: totalPages = Math.ceil(sortedProducts.length / pageSize);

  $: if (search) currentPage = 1;

  function handleSort(field) {
    if (sortField === field) {
      // 🔁 toggle asc ↔ desc
      sortOrder = sortOrder === "asc" ? "desc" : "asc";
    } else {
      // 🔄 pindah kolom → reset ke asc
      sortField = field;
      sortOrder = "asc";
    }
  }

</script>

<div class="header">
  <h1>Produk Saya</h1>
  <button class="add-btn" on:click={openAddModal}>+ Tambah Produk</button>
</div>

<div class="search-box">
  <i class="bi bi-search"></i>
  <input
    type="text"
    placeholder="Cari produk..."
    bind:value={search}
  />
</div>
{#if loading}
  <p>Loading...</p>
{:else if products.length === 0}
  <p>Tidak ada produk</p>
{:else}
  <table border="1" cellpadding="8">
    <thead>
      <tr>
        <th>Gambar</th>
        <th on:click={() => handleSort("product_name")} style="cursor:pointer">
          Nama
          <i
            class="bi"
            class:bi-arrow-up={sortField === "product_name" &&
              sortOrder === "asc"}
            class:bi-arrow-down={sortField === "product_name" &&
              sortOrder === "desc"}
            class:bi-arrow-down-up={sortField !== "product_name"}
          ></i>
        </th>

        <th on:click={() => handleSort("price")} style="cursor:pointer">
          Harga
          <i
            class="bi"
            class:bi-arrow-up={sortField === "price" && sortOrder === "asc"}
            class:bi-arrow-down={sortField === "price" && sortOrder === "desc"}
            class:bi-arrow-down-up={sortField !== "price"}
          ></i>
        </th>

        <th on:click={() => handleSort("sold_count")} style="cursor:pointer">
          Jumlah Terjual
          <i
            class="bi"
            class:bi-arrow-up={sortField === "sold_count" &&
              sortOrder === "asc"}
            class:bi-arrow-down={sortField === "sold_count" &&
              sortOrder === "desc"}
            class:bi-arrow-down-up={sortField !== "sold_count"}
          ></i>
        </th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody>
      {#each paginatedProducts as product}
        <tr>
          <td>
            <img
              src={`/uploads/${product.image}`}
              alt={product.product_name}
              width="80"
            />
          </td>
          <td>{product.product_name}</td>
          <td>{product.price}</td>
          <!-- <td>{product.archived ? "Archived" : "Active"}</td> -->
          <td>{product.sold_count}</td>
          <td class="action-cell">
            <div class="action-wrapper">
              <button
                on:click={() => openDetailModal(product)}
                aria-label="Lihat detail"
              >
                <i class="bi bi-eye"></i>
              </button>

              <button
                on:click={() => openEditModal(product)}
                aria-label="Edit produk"
              >
                <i class="bi bi-pencil"></i>
              </button>

              <button
                on:click={() => deleteProduct(product.id)}
                aria-label="Hapus produk"
              >
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
  <div style="margin-top: 10px;">
    <button on:click={() => currentPage--} disabled={currentPage === 1}>
      Back
    </button>

    <span> {currentPage} / {totalPages} </span>

    <button
      on:click={() => currentPage++}
      disabled={currentPage === totalPages}
    >
      Next
    </button>
  </div>
{/if}

{#if showModal}
  <div class="modal-overlay">
    <div class="modal">
      <div class="modal-header">
        {#if mode == "add"}
          <h1>Tambah Produk</h1>
        {:else if mode == "edit"}
          <h1>Update Produk</h1>
        {:else if mode == "detail"}
          <h1>Detail Produk</h1>
        {/if}
        <button class="button button-danger button-icon" on:click={closeModal}>
          ✕
        </button>
      </div>

      <div class="modal-content">
        <ProductForm
          actionModal={mode}
          {selectedProduct}
          on:saved={handleSaved}
        />
      </div>
    </div>
  </div>
{/if}

<style>
  .action-cell {
    width: 150px; /* bikin kolom konsisten */
    text-align: center;
    vertical-align: middle;
  }

  .action-wrapper {
    display: flex;
    justify-content: space-evenly; /* isi penuh kolom */
    align-items: center;
    width: 100%;
    height: 100%;
    gap: 6px;
  }

  .action-wrapper button {
    flex: 1;
    height: 42px;

    border: none;
    border-radius: 8px;

    display: flex;
    align-items: center;
    justify-content: center;

    cursor: pointer;
    transition: all 0.2s ease;
  }

  .action-wrapper button i {
    font-size: 25px;
  }

  /* efek hover biar enak dilihat */
  .action-wrapper button:hover {
    background-color: #f1f1f1;
    border-radius: 6px;
  }

  /* warna icon */
  .bi-eye {
    color: #0d6efd;
  }

  .bi-pencil {
    color: #ffc107;
  }

  .bi-trash {
    color: #dc3545;
  }
  /* LIHAT */
  .action-wrapper button:nth-child(1) {
    background-color: #84b2f8;
    color: white;
  }
  .action-wrapper button:nth-child(1):hover {
    background-color: #ffffff;
  }

  /* EDIT */
  .action-wrapper button:nth-child(2) {
    background-color: #ffd895;
    color: white;
  }
  .action-wrapper button:nth-child(2):hover {
    background-color: #fafafa;
  }

  /* DELETE */
  .action-wrapper button:nth-child(3) {
    background-color: #ffb1b1;
    color: white;
  }
  .action-wrapper button:nth-child(3):hover {
    background-color: #ffffff;
  }

  h1 {
    margin-bottom: 20px;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .add-btn {
    padding: 8px 14px;
    background: #2ecc71;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  }

  .add-btn:hover {
    background: #27ae60;
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.4);

    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal {
    background: white;
    padding: 20px;
    border-radius: 8px;
    width: 500px;
    position: relative;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  }

  .modal-content {
    margin-top: 10px;
    max-height: 80vh;
    overflow-y: auto;
  }
  .button {
    display: flex;
    align-items: center;
    justify-content: center;

    padding: 6px 10px;
    border-radius: 6px;
    border: 1px solid transparent;

    font-size: 14px;
    cursor: pointer;

    transition: all 0.2s ease;
  }

  .button-danger {
    background: #ef4444;
    color: white;
  }

  .button-danger:hover {
    background: #dc2626;
  }

  .button-icon {
    width: 32px;
    height: 32px;
    padding: 0;
    font-size: 18px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th,
  td {
    padding: 10px;
    border-bottom: 1px solid #ddd;
    text-align: left;
  }

  th i {
    margin-left: 6px;
    font-size: 0.8rem;
  }

  th {
    background: #f0f0f0;
    user-select: none;
  }
  .search-box {
  display: flex;
  align-items: center;
  gap: 8px;

  width: 300px;
  padding: 8px 12px;

  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;

  transition: all 0.2s ease;
  margin-bottom: 10px;
}

.search-box i {
  color: #888;
  font-size: 14px;
}

.search-box input {
  border: none;
  outline: none;
  flex: 1;
  font-size: 14px;
}

.search-box:focus-within {
  border-color: #2ecc71;
  box-shadow: 0 0 0 2px rgba(46, 204, 113, 0.2);
}
</style>
