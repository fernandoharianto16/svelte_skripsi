<script>
    import { onMount, createEventDispatcher } from "svelte";
    import { onDestroy } from "svelte";
    export let aspectRatio = NaN; // default bebas (produk)
    export let maxWidth = 1000;
    export let maxHeight = 1000;

    let currentPreview;
    let Cropper;
    let cropper;
    let imageElement;
    let imagePreview;
    let imageError = "";
    let fileInput;
    import "cropperjs/dist/cropper.css";

    const dispatch = createEventDispatcher();

    // ✅ load hanya di browser
    onMount(async () => {
        const module = await import("cropperjs");
        Cropper = module.default;
    });

    function handleImage(event) {
        const file = event.target.files[0];
        if (!file || !Cropper) return;

        dispatch("cropping",true);
        const allowedTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
        ];
        // 🔥 validasi tipe file
        if (!allowedTypes.includes(file.type)) {
            imageError =
                "Ekstensi gambar hanya menerima jpeg, jpg, png, atau webp";
            return;
        }

        // 🔥 validasi ukuran (optional, samakan dengan multer 1MB)
        if (file.size > 1024 * 1024) {
            imageError = "Ukuran maksimal 1MB";
            return;
        }

        if (currentPreview) URL.revokeObjectURL(currentPreview);
        currentPreview = URL.createObjectURL(file);
        imagePreview = currentPreview;
        imageError = "";

        setTimeout(() => {
            if (cropper) cropper.destroy();

            cropper = new Cropper(imageElement, {
                aspectRatio,
                viewMode: 1,
                dragMode: "move",
                autoCropArea: 1,
            });
        }, 0);
    }

    async function cropImage() {
        if (!cropper) return;

        const canvas = cropper.getCroppedCanvas({
            maxWidth,
            maxHeight,
        });

        const blob = await new Promise((resolve) =>
            canvas.toBlob(resolve, "image/jpeg", 0.8),
        );

        const file = new File([blob], "cropped.jpg", {
            type: "image/jpeg",
        });

        // 🔥 kirim ke parent
        dispatch("cropped", {
            file,
            preview: URL.createObjectURL(blob),
        });
        dispatch("cropping",false);
        // 🔥 tutup area crop
        cropper.destroy();
        cropper = null;

        imagePreview = null; // ini yang bikin UI crop hilang
        fileInput.value = ""; // reset input
    }

    function reset() {
        if (cropper) cropper.destroy();
        if (currentPreview) URL.revokeObjectURL(currentPreview);
        imagePreview = null;
        fileInput.value = ""; // penting
        dispatch("cropping",false);
    }
    onDestroy(() => {
        if (cropper) cropper.destroy();
        if (currentPreview) URL.revokeObjectURL(currentPreview);
    });
</script>

<div class="cropper-container">
    <input
        bind:this={fileInput}
        type="file"
        accept="image/jpeg, image/jpg, image/png, image/webp"
        on:change={handleImage}
        class="hidden-input"
    />

    <button type="button" class="upload-btn" on:click={() => fileInput.click()}>
        Pilih Gambar
    </button>

    {#if imagePreview}
        <div class="preview-wrapper">
            <img bind:this={imageElement} src={imagePreview} class="preview" />
        </div>

        <div class="actions">
            <button type="button" class="primary" on:click={cropImage}>
                Gunakan Gambar
            </button>
            <button type="button" class="secondary" on:click={reset}>
                Batalkan
            </button>
        </div>
    {/if}

    {#if imageError}
        <span class="error">{imageError}</span>
    {/if}
</div>

<style>
    .cropper-container {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .preview-wrapper {
        max-height: 300px;
        overflow: hidden;
    }

    .preview {
        max-width: 100%;
        display: block;
    }

    .actions {
        display: flex;
        gap: 10px;
    }

    .error {
        color: red;
        font-size: 12px;
    }
    .hidden-input {
        display: none;
    }

    /* Upload button */
    .upload-btn {
        padding: 10px 14px;
        background: #f3f4f6;
        border: 1px dashed #9ca3af;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        color: #374151;
        transition: all 0.2s ease;
    }

    .upload-btn:hover {
        background: #e5e7eb;
        border-color: #6b7280;
    }

    /* Preview */
    .preview-wrapper {
        max-height: 300px;
        overflow: hidden;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
    }

    .preview {
        width: 100%;
        display: block;
    }

    /* Action buttons */
    .actions {
        display: flex;
        gap: 10px;
        margin-top: 10px;
    }

    button {
        padding: 8px 14px;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        border: none;
        transition: 0.2s;
    }

    /* Primary button */
    button.primary {
        background: #2563eb;
        color: white;
    }

    button.primary:hover {
        background: #1d4ed8;
    }

    /* Secondary button */
    button.secondary {
        background: #e5e7eb;
        color: #374151;
    }

    button.secondary:hover {
        background: #d1d5db;
    }
</style>
