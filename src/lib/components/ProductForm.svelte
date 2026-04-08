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

    if (selectedProduct && actionModal != "add") {
        imagePreview = "/uploads/" + selectedProduct.image;
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
        // const updateProduct = {
        //     id: selectedProduct,
        //     product_name,
        //     price,
        //     category,
        //     imageFile,
        //     description,
        // };

        const formData = new FormData();

        formData.append("product_name", product_name);
        formData.append("price", price);
        formData.append("category", category);
        formData.append("description", description);

        if (imageFile) {
            formData.append("image", imageFile);
        }
        console.log(formData);
        console.log(imageFile);
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
                // Tangani error file terlalu besar
                if (error.response.data.message.includes("terlalu besar")) {
                    imageError = error.response.data.message; // <-- simpan ke state
                } else {
                    alert(error.response.data.message); // error lain
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
