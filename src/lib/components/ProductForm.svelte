<script>
    import api from "$lib/api/axios.js";
    let product_name = "";
    let price = "";
    let description = "";
    let archived = false;
    let category = "";
    let imageFile;
    let imagePreview;
    let priceDisplay = "";
    export let actionModal;
    export let selectedProduct;
    let imageError = "";
    import ImageCropper from "$lib/components/ImageCropper.svelte";
    const API_URL = import.meta.env.VITE_API_URL;
    // import { auth } from "$lib/firebase";
    // import { onAuthStateChanged } from "firebase/auth";
    let isCropping=false;

    // Pengaturan Kustomisasi
    let is_customable = false;

    // Pengaturan Varian Standar
    // Struktur data: [{ nama: "Warna", opsi: ["Merah", "Biru"] }]
    let listVariasi = [];

    function tambahJenisVariasi() {
        if (listVariasi.length < 2) {
            listVariasi = [...listVariasi, { nama: "", opsi: [""] }];
        }
    }

    // Fungsi menghapus jenis variasi
    function hapusJenisVariasi(index) {
        listVariasi = listVariasi.filter((_, i) => i !== index);
    }

    // Fungsi menambah opsi pilihan di dalam variasi tertentu (Maksimal 3)
    function tambahOpsiVariasi(indexJenis) {
        if (listVariasi[indexJenis].opsi.length < 3) {
            listVariasi[indexJenis].opsi = [...listVariasi[indexJenis].opsi, ""];
        }
    }

    // Fungsi menghapus opsi pilihan tertentu
    function hapusOpsiVariasi(indexJenis, indexOpsi) {
        listVariasi[indexJenis].opsi = listVariasi[indexJenis].opsi.filter((_, i) => i !== indexOpsi);
    }

    if (selectedProduct && actionModal != "add") {
        imagePreview = selectedProduct.image;
        // console.log(imagePreview);
        product_name = selectedProduct.product_name || "";
        category = selectedProduct.category || "";
        price = selectedProduct.price || "";
        description = selectedProduct.description || "";

        archived = selectedProduct.archived || false;

        // untuk display harga
        priceDisplay = selectedProduct.price
            ? new Intl.NumberFormat("id-ID").format(selectedProduct.price)
            : "";
    }

    const categories = ["Accessories", "Fashion", "Dekorasi", "Mainan"];

    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher();

    async function submitForm() {

        const formData = new FormData();

        formData.append("product_name", product_name);
        formData.append("price", price);
        formData.append("category", category);
        formData.append("description", description);
        formData.append("is_customable", is_customable);

        formData.append("list_variasi", JSON.stringify(listVariasi));

        if (imageFile) {
            formData.append("image", imageFile);
        }
        const config = {
            headers: {
                "Content-Type": "multipart/form-data"
            }
        };
        try {
            let response;
            if (actionModal === "add") {
                response = await api.post("/seller/products", formData);
            } else {
                console.log(selectedProduct.id);
                response = await api.put(
                    `/seller/products/${selectedProduct.id}`,
                    formData,
                );
            }
            console.log("Success:", response.data);

            dispatch("saved");
        } catch (error) {
            if (error.response) {
                // 🌟 Gunakan optional chaining (?.) untuk menghindari crash jika message kosong
                const errorMessage = error.response.data?.message || "";
                
                // Tangani error file terlalu besar
                if (errorMessage.includes("terlalu besar")) {
                    imageError = errorMessage; // <-- simpan ke state
                } else {
                    alert(errorMessage || "Terjadi kesalahan pada server."); // error lain
                }
            } else {
                console.error("Axios error:", error);
            }
        }

        // console.log(product, actionModal);
        // kirim event ke parent
        // dispatch("saved", product);
    }

    function formatPrice(e) {
        let raw = e.target.value.replace(/\D/g, "");

        price = Number(raw);

        if (raw === "") {
            priceDisplay = "";
            return;
        }

        priceDisplay = new Intl.NumberFormat("id-ID").format(raw);
    }
</script>

<form on:submit|preventDefault={submitForm}>
    <div class="field">
        <label for="product_name">Nama Produk</label>
        <input
            id="product_name"
            type="text"
            bind:value={product_name}
            required
            disabled={actionModal === "detail"}
        />
    </div>

    <div class="field">
        <label for="price">Harga</label>
        <input
            id="price"
            type="text"
            bind:value={priceDisplay}
            on:input={formatPrice}
            required
            disabled={actionModal === "detail"}
        />
    </div>
    <div class="field">
        <label for="category">Kategori</label>
        <select
            id="category"
            bind:value={category}
            required
            disabled={actionModal === "detail"}
        >
            {#each categories as cat}
                <option value={cat}>{cat}</option>
            {/each}
        </select>
    </div>

    <div class="field">
        <label for="image">Gambar Produk</label>
        {#if actionModal !== "detail"}
            <ImageCropper
                aspectRatio={NaN}
                on:cropped={(e) => {
                    imageFile = e.detail.file;
                    imagePreview = e.detail.preview;
                    console.log(isCropping);
                }}
                on:cropping={(e)=>{
                    isCropping=e.detail;
                    console.log(isCropping);
                }}
            />
        {/if}

        {#if imagePreview}
            <img src={imagePreview} class="preview" />
        {/if}
    </div>

    <!-- ================= SAKLAR FITUR KUSTOMISASI ================= -->
    <div class="field check-field" style="margin-bottom: 20px; background: #f9fafb; padding: 12px; border-radius: 8px; border: 1px solid #e5e7eb;">
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 600; color: #374151;">
            <input 
                type="checkbox" 
                bind:checked={is_customable} 
                disabled={actionModal === "detail"}
                style="width: 18px; height: 18px; cursor: pointer;"
            />
            ✨ Izinkan Pembeli Melakukan Request Kustomisasi 
        </label>
        <p style="margin: 4px 0 0 26px; font-size: 0.8rem; color: #6b7280;">
            Jika dicentang, pembeli dapat mengetik instruksi kustom khusus & mengunggah gambar referensi mereka sendiri.
        </p>
    </div>

    <!-- ================= PENGATURAN VARIAN STANDAR ================= -->
    <div class="field-varian-container" style="margin-bottom: 25px; border-top: 1px dashed #d1d5db; padding-top: 15px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <label style="font-weight: 600; font-size: 0.95rem; color: #1f2937;">Varian Produk Standar</label>
            
            {#if actionModal !== "detail" && listVariasi.length < 2}
                <button 
                    type="button" 
                    on:click={tambahJenisVariasi}
                    style="background: #e0e7ff; color: #4f46e5; border: none; padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; cursor: pointer; font-weight: 500;"
                >
                    + Tambah Jenis Varian ({listVariasi.length}/2)
                </button>
            {/if}
        </div>

        {#if listVariasi.length === 0}
            <p style="font-size: 0.85rem; color: #9ca3af; italic; margin: 0 0 15px 0;">Belum ada varian (produk akan dijual sebagai satu jenis standar).</p>
        {/if}

        <!-- Loop untuk Jenis Variasi (Maksimal 2) -->
        {#each listVariasi as varian, indexJenis}
            <div style="background: #fdfdfd; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 15px; position: relative;">
                
                <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
                    <div style="flex: 1;">
                        <span style="font-size: 0.75rem; color: #6b7280; font-weight: 600; display: block; margin-bottom: 3px;">Nama Varian {indexJenis + 1} (contoh: Warna, Ukuran)</span>
                        <input 
                            type="text" 
                            placeholder="Misal: Warna" 
                            bind:value={varian.nama}
                            required
                            disabled={actionModal === "detail"}
                            style="margin: 0;"
                        />
                    </div>
                    
                    {#if actionModal !== "detail"}
                        <button 
                            type="button" 
                            on:click={() => hapusJenisVariasi(indexJenis)}
                            style="background: #fee2e2; color: #dc2626; border: none; padding: 8px 12px; border-radius: 6px; margin-top: 18px; cursor: pointer;"
                            title="Hapus varian ini"
                        >
                            🗑️
                        </button>
                    {/if}
                </div>

                <!-- Bagian Input Pilihan Opsi Dropdown (Maksimal 3) -->
                <div style="padding-left: 15px; border-left: 2px solid #e5e7eb; margin-top: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <span style="font-size: 0.8rem; font-weight: 600; color: #4b5563;">Opsi Pilihan Dropdown:</span>
                        
                        {#if actionModal !== "detail" && varian.opsi.length < 3}
                            <button 
                                type="button" 
                                on:click={() => tambahOpsiVariasi(indexJenis)}
                                style="background: none; border: 1px dashed #9ca3af; color: #4b5563; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; cursor: pointer;"
                            >
                                + Tambah Pilihan ({varian.opsi.length}/3)
                            </button>
                        {/if}
                    </div>

                    <!-- Loop untuk List Opsi -->
                    {#each varian.opsi as opsi, indexOpsi}
                        <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 6px;">
                            <input 
                                type="text" 
                                placeholder={`Pilihan ${indexOpsi + 1} (contoh: Merah, Hitam)`} 
                                bind:value={varian.opsi[indexOpsi]}
                                required
                                disabled={actionModal === "detail"}
                                style="margin: 0; font-size: 0.85rem; padding: 6px 10px;"
                            />
                            
                            <!-- Hanya ijinkan hapus opsi jika jumlah opsi lebih dari 1 -->
                            {#if actionModal !== "detail" && varian.opsi.length > 1}
                                <button 
                                    type="button" 
                                    on:click={() => hapusOpsiVariasi(indexJenis, indexOpsi)}
                                    style="background: none; border: none; color: #9ca3af; cursor: pointer; font-size: 0.85rem;"
                                >
                                    ✕
                                </button>
                            {/if}
                        </div>
                    {/each}
                </div>

            </div>
        {/each}
    </div>

    <div class="field">
        <label for="description">Deskripsi</label>
        <textarea
            id="description"
            rows="4"
            bind:value={description}
            disabled={actionModal === "detail"}
        ></textarea>
    </div>

    {#if actionModal !== "detail"}
        <button type="submit" disabled={isCropping==true}>
            {actionModal === "edit" ? "Update Produk" : "Simpan Produk"}
        </button>
    {/if}
    {#if isCropping==true}
        <p class="warning">
            Selesaikan Crop Gambar Terlebih Dahulu
        </p>
    {/if}
</form>

<style>
    form {
        display: flex;
        flex-direction: column;
        gap: 16px;
        width: 100%;
    }

    .field {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    label {
        font-weight: 600;
        font-size: 14px;
    }

    input,
    select,
    textarea {
        width: 100%;
        padding: 8px 10px;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 14px;
        box-sizing: border-box;
    }

    textarea {
        resize: vertical;
    }

    button {
        margin-top: 10px;
        padding: 10px;
        background: #2563eb;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
    }

    button:hover {
        background: #1d4ed8;
    }
    
    button:disabled{
        opacity: 0.5;
        cursor: not-allowed;;
    }
    
    .error,.warning {
        color: red;
        font-size: 12px;
        margin-top: 2px;
    }
    .preview {
        display: block;
        max-width: 100%;
        max-height: 250px; /* batas tinggi */
        width: auto;
        height: auto;
        object-fit: contain;
    }
</style>
