import { writable } from 'svelte/store';

// Ambil data awal dari localStorage jika sudah pernah ada, jika belum buat array kosong []
const initialCart = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('cart') || '[]') : [];

export const cart = writable(initialCart);

// Setiap kali isi store 'cart' berubah, otomatis simpan perubahan ke localStorage
if (typeof window !== 'undefined') {
    cart.subscribe((value) => {
        localStorage.setItem('cart', JSON.stringify(value));
    });
}

// Fungsi helper untuk menambah produk ke keranjang tanpa lewat backend
export function addToCart(product, quantity = 1) {
    cart.update((items) => {
        // Cek apakah produk ini sudah ada di keranjang sebelumnya
        const existingItemIndex = items.findIndex(item => item.id === product.id);

        if (existingItemIndex > -1) {
            // Jika sudah ada, cukup tambahkan quantity-nya
            items[existingItemIndex].quantity += quantity;
        } else {
            // Jika belum ada, masukkan sebagai data produk baru
            items.push({
                id: product.id,
                product_name: product.product_name,
                price: product.price,
                image: product.image || product.image_url,
                quantity: quantity,
                addedAt: new Date().toISOString()
            });
        }
        return items;
    });
}