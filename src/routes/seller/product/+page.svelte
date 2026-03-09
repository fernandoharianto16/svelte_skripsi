<script>
  import { onMount } from "svelte";
  import ProductForm from "$lib/components/ProductForm.svelte";

  let products = [
    {
      id: 1,
      product_name: "Mouse Gaming RGB",
      image: "",
      price: 250000,
      sold: 45,
      archived: false,
    },
    {
      id: 2,
      product_name: "Keyboard Mechanical",
      image: "",
      price: 750000,
      sold: 30,
      archived: false,
    },
    {
      id: 3,
      product_name: "Headset Gaming",
      image: "",
      price: 500000,
      sold: 18,
      archived: false,
    },
    {
      id: 4,
      product_name: "Mousepad XL",
      image: "",
      price: 120000,
      sold: 60,
      archived: false,
    },
    {
      id: 5,
      product_name: "Webcam HD 1080p",
      image: "",
      price: 320000,
      sold: 12,
      archived: true,
    },
  ];
  let mode = "-";
  let showModal = false;
  let selectedProduct = null;
  let actionModal = "-";
  

  function openAddModal() {
    mode = "add";
    console.log("modal add dibuka");
    showModal = true;
  }

  function openEditModal() {
    mode = "edit";
    console.log("modal edit dibuka");
    showModal = true;
  }

  function closeModal() {
    showModal = false;
  }
  // let loading = false;

  async function fetchOrders() {
    // try {
    // 	const res = await fetch('/api/orders/latest');
    // 	const data = await res.json();
    // 	orders = data.orders;
    // } catch (err) {
    // 	console.error(err);
    // } finally {
    // 	loading = false;
    // }
  }
  function handleSaved(event) {
    const product = event.detail;

    console.log("produk disimpan:", product);

    // nanti disini bisa panggil API
    // await fetch('/api/addProduct')

    // SETELAH MODAL SELESAI MENGIRIM DISPATCH SAVED MAKA INI AKAN DIJALANKAN
    // closeModal();
  }

  onMount(() => {
    // fetchOrders();
  });
</script>

<div class="header">
  <h1>Produk Saya</h1>
  <button class="add-btn" on:click={openAddModal}>+ Tambah Produk</button>
</div>

<table>
  <thead>
    <tr>
      <th>No</th>
      <th>Nama Produk</th>
      <th>Gambar</th>
      <th>Harga</th>
      <th>Jumlah Terjual</th>
      <th>Diarsipkan</th>
      <th>Action</th>
    </tr>
  </thead>

  <tbody>
    {#each products as product, index}
      <tr>
        <td>{index + 1}</td>
        <td>{product.product_name}</td>
        <td>{product.image}</td>
        <td>Rp {product.price}</td>
        <td>{product.sold}</td>
        <td>{product.archived ? "Ya" : "Tidak"}</td>
        <td>
          <button>Edit</button>
          <button>Hapus</button>
        </td>
      </tr>
    {/each}
  </tbody>
</table>

{#if showModal}
  <div class="modal-overlay">
    <div class="modal">
      <div class="modal-header">
        <h1>Tambah Produk</h1>

        <button class="button button-danger button-icon" on:click={closeModal}>
          ✕
        </button>
      </div>

      <div class="modal-content">
        <ProductForm 
          actionModal={mode} 
          product={selectedProduct}
          on:saved={handleSaved} />
      </div>
    </div>
  </div>
{/if}

<style>
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
  /* .cards{
		display:flex;
		gap:20px;
		margin-bottom:30px;
	}

	.card{
		background:#f5f5f5;
		padding:20px;
		border-radius:8px;
		width:200px;
	} */

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

  th {
    background: #f0f0f0;
  }
</style>
