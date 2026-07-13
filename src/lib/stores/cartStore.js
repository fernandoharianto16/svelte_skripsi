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

// Fungsi helper untuk mengubah file gambar menjadi string Base64 (agar bisa disimpan di localStorage)
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        if (!file) resolve("");
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });
}

// Fungsi helper untuk menambah produk ke keranjang tanpa lewat backend (Disesuaikan agar menerima payloadCart)
export async function addToCart(product, quantity = 1, payloadCart = {}) {
    // 1. Ambil nilai dari payloadCart (sesuai dengan inisialisasi variabel Anda)
    const isCustom = payloadCart.is_custom || false;
    const variants = payloadCart.variants || {};
    const customNote = payloadCart.custom_note || "";
    
    // 2. Konversi gambar biner ke Base64 string agar aman disimpan di localStorage
    let customImageBase64 = "";
    if (isCustom && payloadCart.custom_image_file) {
        try {
            customImageBase64 = await fileToBase64(payloadCart.custom_image_file);
        } catch (e) {
            console.error("Gagal mengonversi gambar kustom:", e);
        }
    }

    cart.update((items) => {
        // 3. Modifikasi pencarian: Produk yang sama tetapi beda variasi/kustomisasi 
        // harus dianggap sebagai item terpisah di keranjang belanja.
        const existingItemIndex = items.findIndex(item => {
            const isSameId = item.id === product.id;
            const isSameCustomMode = item.is_custom === isCustom;
            const isSameNote = item.custom_note === customNote;
            const isSameVariant = JSON.stringify(item.variants) === JSON.stringify(variants);
            
            return isSameId && isSameCustomMode && isSameNote && isSameVariant;
        });

        if (existingItemIndex > -1) {
            // Jika semua aspek (id, varian/kustomisasi) sama persis, cukup tambahkan kuantitasnya
            items[existingItemIndex].quantity += quantity;
        } else {
            // Jika varian/kustomisasi berbeda (atau produk baru), masukkan sebagai baris baru
            items.push({
                id: product.id,
                product_name: product.product_name,
                price: product.price,
                image: product.image || product.image_url,
                quantity: quantity,
                
                // 🌟 MENYIMPAN DATA VARIASI & KUSTOMISASI KEDALAM STORE 🌟
                is_custom: isCustom,
                variants: variants,
                custom_note: customNote,
                custom_image: customImageBase64, // Berisi string Base64 yang bisa dibaca tag <img src="...">
                
                addedAt: new Date().toISOString()
            });
        }
        return items;
    });
}