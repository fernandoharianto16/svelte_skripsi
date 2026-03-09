<script>
    let product_name = "";
    let price = "";
    let description = "";
    let archived = false;
    let category = "";
    let imageFile;
    let priceDisplay = "";
    export let actionModal;
    export let product;

    if (actionModal === "edit" && product) {
        product_name = product.product_name;
        price = product.price;
    }

    function handleImage(event) {
        imageFile = event.target.files[0];
    }

    const categories = ["Accessories", "Fashion", "Decoration", "Toy"];

    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher();

    async function submitForm() {
        const product = {
            product_name,
            price,
            category,
            imageFile,
            description,
        };
        const formData = new FormData();

        formData.append("product_name", product_name);
        formData.append("price", price);
        formData.append("category", category);
        formData.append("description", description);

        if (imageFile) {
            formData.append("image", imageFile);
        }
        try {
            let response;

            if (actionModal === "add") {
                response = await axios.post("/api/products", formData);
            } else {
                response = await axios.put(
                    `/api/products/${product_id}`,
                    formData,
                );
            }
            console.log("Success:", response.data);

            dispatch("saved");
        } catch (error) {
            console.error(error);
        }

        console.log(product, mode);
        // kirim event ke parent
        dispatch("saved", product);
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
        />
    </div>
    <div class="field">
        <label for="category">Kategori</label>
        <select id="category" bind:value={category} required>
            {#each categories as cat}
                <option value={cat}>{cat}</option>
            {/each}
        </select>
    </div>

    <div class="field">
        <label for="image">Gambar Produk</label>
        <input
            id="image"
            type="file"
            accept="image/*"
            on:change={handleImage}
        />
    </div>

    <div class="field">
        <label for="description">Deskripsi</label>
        <textarea id="description" rows="4" bind:value={description}></textarea>
    </div>

    <button type="submit"> Simpan Produk </button>
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
</style>
