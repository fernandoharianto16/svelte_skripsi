<script>
    import api from "$lib/api/axios.js";
    import Swal from "sweetalert2";
    import ImageCropper from "$lib/components/ImageCropper.svelte";
    import { createEventDispatcher } from "svelte";

    // Pilihan kategori konstan sesuai request Anda
    const categories = ["Accessories", "Fashion", "Dekorasi", "Mainan"];

    // State penampung data
    let category = "";
    let description = "";
    let budget = "";          
    let budgetDisplay = "";   
    let imageFile = null;
    let imagePreview = "";
    let isCropping = false;
    let isSubmitting = false;

    const dispatch = createEventDispatcher();

    // Fungsi otomatis mengubah input angka menjadi format ribuan Rupiah
    function formatBudget(e) {
        let raw = e.target.value.replace(/\D/g, ""); 

        budget = raw ? Number(raw) : ""; 

        if (raw === "") {
            budgetDisplay = "";
            return;
        }

        budgetDisplay = new Intl.NumberFormat("id-ID").format(raw);
    }

    async function submitForm() {
        if (!category || !description.trim() || !budget) {
            Swal.fire("Peringatan", "Kategori, Budget, dan Deskripsi wajib diisi!", "warning");
            return;
        }

        const formData = new FormData();
        formData.append("category", category);
        formData.append("budget", budget); 
        formData.append("description", description);

        if (imageFile) {
            formData.append("product_image", imageFile);
        }

        try {
            isSubmitting = true;
            Swal.showLoading();

            const response = await api.post("/buyer/custom_request", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            Swal.fire("Berhasil!", "Custom request Anda berhasil dikirim.", "success");
            
            // Reset Form setelah sukses
            category = "";
            budget = "";
            budgetDisplay = "";
            description = "";
            imageFile = null;
            imagePreview = "";

            dispatch("success", response.data);
        } catch (error) {
            console.error(error);
            Swal.fire(
                "Gagal!",
                error.response?.data?.message || "Terjadi kesalahan saat mengirim request.",
                "error"
            );
        } finally {
            isSubmitting = false;
        }
    }
</script>

<form on:submit|preventDefault={submitForm}>
    <div class="custom-request-layout">
        
        <div class="left-column">
            <label for="image">Upload Gambar Produk</label>
            <div class="cropper-wrapper">
                <ImageCropper
                    aspectRatio={NaN}
                    on:cropped={(e) => {
                        imageFile = e.detail.file;
                        imagePreview = e.detail.preview;
                    }}
                    on:cropping={(e) => {
                        isCropping = e.detail;
                    }}
                />
            </div>

            {#if imagePreview}
                <div class="preview-container">
                    <img src={imagePreview} class="preview" alt="Preview request" />
                </div>
            {/if}
            
            {#if isCropping}
                <p class="warning">⚠️ Selesaikan Crop Gambar Terlebih Dahulu</p>
            {/if}
        </div>

        <div class="right-column">
            
            <div class="field">
                <label for="category">Masukkan deskripsi produk</label>
                <select id="category" bind:value={category} required>
                    <option value="" disabled selected></option>
                    {#each categories as cat}
                        <option value={cat}>{cat}</option>
                    {/each}
                </select>
            </div>

            <div class="field budget-field">
                <label for="budget">Budget / Anggaran (Rp)</label>
                <div class="input-group">
                    <span class="prefix">Rp</span>
                    <input
                        id="budget"
                        type="text"
                        placeholder="Masukkan budget Anda"
                        bind:value={budgetDisplay}
                        on:input={formatBudget}
                        required
                    />
                </div>
            </div>

            <div class="field">
                <textarea
                    id="description"
                    rows="5"
                    placeholder="Data deskripsi produk"
                    bind:value={description}
                    required
                ></textarea>
            </div>

            <button type="submit" disabled={isCropping || isSubmitting}>
                {isSubmitting ? "Mengirim..." : "Kirim Custom Request"}
            </button>
        </div>

    </div>
</form>

<style>
    .custom-request-layout {
        display: flex;
        gap: 24px;
        width: 100%;
        max-width: 900px;
        margin: 0 auto;
    }

    .left-column, .right-column {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 12px;
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

    /* Style Garis Hitam Kaku mengikuti konsep Wireframe */
    input, select, textarea {
        width: 100%;
        padding: 10px;
        border: 2px solid #000; 
        border-radius: 0px; 
        font-size: 14px;
        box-sizing: border-box;
        outline: none;
        background-color: #fff;
    }

    textarea {
        resize: none;
    }

    .input-group {
        display: flex;
        align-items: center;
        border: 2px solid #000;
    }
    .input-group .prefix {
        padding: 10px;
        background: #f1f5f9;
        font-weight: bold;
        font-size: 14px;
        border-right: 2px solid #000;
    }
    .input-group input {
        border: none;
        flex: 1;
    }

    .cropper-wrapper {
        border: 2px dashed #000;
        padding: 10px;
    }

    .preview-container {
        border: 2px solid #000;
        padding: 5px;
        display: flex;
        justify-content: center;
        background: #f8fafc;
    }

    .preview {
        max-width: 100%;
        max-height: 200px;
        object-fit: contain;
    }

    button {
        padding: 12px;
        background: #000;
        color: white;
        border: none;
        cursor: pointer;
        font-weight: bold;
        text-transform: uppercase;
        transition: opacity 0.2s;
        margin-top: 6px;
    }

    button:hover:not(:disabled) {
        opacity: 0.8;
    }

    button:disabled {
        background: #64748b;
        cursor: not-allowed;
    }

    .warning {
        color: #ef4444;
        font-size: 13px;
        font-weight: bold;
        margin-top: 4px;
    }
</style>