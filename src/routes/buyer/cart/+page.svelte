<script>
    import { cart } from "$lib/stores/cartStore";
    import api from "$lib/api/axios";
    import Swal from "sweetalert2";
    // Fungsi saat buyer mengklik tombol "Checkout / Bayar Sekarang"
    async function handleCheckout() {
        // Validasi jika keranjang masih kosong
        if ($cart.length === 0) {
            Swal.fire("Keranjang Kosong", "Silakan tambah produk terlebih dahulu sebelum checkout.", "warning");
            return;
        }

        try {
            // Kirim SEKALIGUS seluruh isi keranjang dari frontend ke backend saat checkout
            const response = await api.post('/buyer/orders', { items: $cart });
            
            if (response.status === 200 || response.status === 201) {
                // Kosongkan keranjang di frontend setelah berhasil checkout
                cart.set([]); 
                Swal.fire("Sukses", "Pesanan Anda berhasil diproses!", "success");
            }
        } catch (err) {
            console.error("Checkout error:", err);
            Swal.fire("Gagal", err.response?.data?.message || "Gagal memproses checkout", "error");
        }
    }

    // Fungsi opsional untuk menghapus satu item dari keranjang belanja
    function hapusItem(productId) {
        cart.update(items => items.filter(item => item.id !== productId));
    }
</script>

<div class="cart-container">
    <h1>Keranjang Belanja Saya</h1>

    {#if $cart.length === 0}
        <div class="empty-cart">
            <p>Keranjang belanja Anda masih kosong.</p>
            <a href="/buyer/product">Tambahkan Produk</a>
        </div>
    {:else}
        <div class="cart-content">
            <ul class="cart-list">
                {#each $cart as item}
                    <li class="cart-item">
                        <img src={item.image} alt={item.product_name} class="item-img" />
                        <div class="item-details">
                            <h3>{item.product_name}</h3>
                            <p>{item.quantity} pcs x Rp {item.price?.toLocaleString("id-ID")}</p>
                            <p class="subtotal">Subtotal: Rp {(item.price * item.quantity)?.toLocaleString("id-ID")}</p>
                        </div>
                        <button type="button" class="btn-hapus" on:click={() => hapusItem(item.id)}>Hapus</button>
                    </li>
                {/each}
            </ul>

            <div class="checkout-section">
                <h2>Total: Rp {$cart.reduce((total, item) => total + (item.price * item.quantity), 0).toLocaleString("id-ID")}</h2>
                <button type="button" class="btn-checkout" on:click={handleCheckout}>Checkout Sekarang</button>
            </div>
        </div>
    {/if}
</div>

<style>
    .cart-container {
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
        font-family: sans-serif;
    }
    h1 {
        border-bottom: 2px solid #eee;
        padding-bottom: 10px;
    }
    .empty-cart {
        text-align: center;
        padding: 40px;
        color: #666;
    }
    .empty-cart a {
        display: inline-block;
        margin-top: 10px;
        padding: 10px 20px;
        background: #2563eb;
        color: white;
        text-decoration: none;
        border-radius: 6px;
    }
    .cart-list {
        list-style: none;
        padding: 0;
    }
    .cart-item {
        display: flex;
        align-items: center;
        gap: 20px;
        border-bottom: 1px solid #eee;
        padding: 15px 0;
    }
    .item-img {
        width: 80px;
        height: 80px;
        object-fit: cover;
        border-radius: 6px;
    }
    .item-details {
        flex: 1;
    }
    .item-details h3 {
        margin: 0 0 5px 0;
    }
    .subtotal {
        font-weight: bold;
        color: #d32f2f;
    }
    .btn-hapus {
        background: none;
        border: 1px solid #dc3545;
        color: #dc3545;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
    }
    .btn-hapus:hover {
        background: #dc3545;
        color: white;
    }
    .checkout-section {
        margin-top: 30px;
        text-align: right;
        background: #f9f9f9;
        padding: 20px;
        border-radius: 8px;
    }
    .btn-checkout {
        padding: 12px 24px;
        background: #2ecc71;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 1.1rem;
        cursor: pointer;
        font-weight: bold;
    }
    .btn-checkout:hover {
        background: #27ae60;
    }
</style>