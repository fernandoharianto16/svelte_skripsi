<script>
    import Swal from 'sweetalert2';
    import { onMount } from 'svelte';
    import api from '$lib/api/axios';

    // 🌟 STATE BARU
    let reportName = "";
    let incidentDate = "";
    
    let reportDescription = "";
    let evidenceFile = null;
    let evidencePreview = ""; 
    let isSubmitting = false;

    // Fungsi menangani perubahan file
    function handleFileChange(event) {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                Swal.fire("Ukuran File Terlalu Besar", "Maksimal ukuran file bukti adalah 2MB.", "warning");
                event.target.value = ""; 
                return;
            }
            
            evidenceFile = file;

            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    evidencePreview = e.target.result;
                };
                reader.readAsDataURL(file);
            } else {
                evidencePreview = ""; 
            }
        }
    }

    // Fungsi Kirim Form Laporan
    async function handleFormSubmit() {
        // 🌟 VALIDASI INPUT BARU
        if (!reportName.trim() || reportName.trim().length < 5) {
            Swal.fire("Peringatan", "Silakan isi judul laporan (minimal 5 karakter).", "warning");
            return;
        }
        if (!incidentDate) {
            Swal.fire("Peringatan", "Silakan tentukan tanggal kejadian pelanggaran.", "warning");
            return;
        }
        if (!reportDescription.trim() || reportDescription.trim().length < 15) {
            Swal.fire("Peringatan", "Mohon berikan deskripsi kronologi tindakan minimal 15 karakter.", "warning");
            return;
        }
        if (!evidenceFile) {
            Swal.fire("Bukti Wajib", "Anda harus mengunggah minimal 1 file bukti pelanggaran.", "warning");
            return;
        }

        try {
            isSubmitting = true;
            Swal.showLoading();

            const formData = new FormData();
            // formData.append("reported_user_id", reportedUserId);
            // formData.append("transaction_id", transactionId);
            // formData.append("reporter_role", currentUserRole);
            
            // 🌟 TAMBAHKAN DATA BARU KE FORMDATA
            formData.append("name", reportName.trim());
            formData.append("incident_date", incidentDate);

            formData.append("description", reportDescription.trim());
            formData.append("evidence", evidenceFile); 

            const res = await api.post('/reports', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            await Swal.fire({
                icon: 'success',
                name: 'Laporan Berhasil Dikirim',
                text: 'Laporan anda akan ditinjau oleh admin.',
                confirmButtonColor: '#3085d6'
            });
            reportName = "";
            incidentDate = "";
            reportDescription = "";
            evidenceFile = null;
            evidencePreview = "";
            
            // Membersihkan nama file yang tertinggal di elemen input HTML
            // if (dateInputRef) dateInputRef.value = ""; 
            const fileInput = document.getElementById("evidence");
            if (fileInput) fileInput.value = "";

        } catch (error) {
            console.error("Gagal mengirim laporan:", error);
            Swal.fire("Gagal", error.response?.data?.message || "Terjadi kesalahan server.", "error");
        } finally {
            isSubmitting = false;
        }
    }
</script>

<div class="page-wrapper">
    <main class="content-box">
        <header class="page-header">
            <h1>Halaman Pelaporan</h1>
            <p>Laporkan segala bentuk pelanggaran yang anda rasakan.</p>
        </header>

        <form on:submit|preventDefault={handleFormSubmit} class="report-form">
            
            <div class="form-group">
                <label for="name">Username yang dilaporkan</label>
                <input 
                    type="text" 
                    id="name" 
                    bind:value={reportName} 
                    disabled={isSubmitting}
                />
            </div>

            <div class="form-group">
                <label for="incident-date">Tanggal Kejadian Pelanggaran</label>
                <input 
                    type="date" 
                    id="incident-date" 
                    bind:value={incidentDate} 
                    max={new Date().toISOString().split("T")[0]} 
                    disabled={isSubmitting}
                    on:click={(e) => e.target.showPicker()} 
                />
                <span class="hint-text">Pilih tanggal perkiraan kapan pelanggaran ini terjadi.</span>
            </div>

            <div class="form-group">
                <label for="description">Deskripsi Tindakan & Kronologi Kejadian</label>
                <textarea 
                    id="description" 
                    bind:value={reportDescription} 
                    placeholder="Ceritakan secara mendetail tindakan pelanggaran apa yang dilakukan..."
                    rows="6"
                    disabled={isSubmitting}
                ></textarea>
                <span class="hint-text">Jelaskan secara objektif. Minimal tuliskan 15 karakter.</span>
            </div>

            <div class="form-group">
                <label for="evidence">Unggah Bukti Pelanggaran (Wajib)</label>
                <div class="upload-zone">
                    <input 
                        type="file" 
                        id="evidence" 
                        accept="image/*,application/pdf"
                        on:change={handleFileChange}
                        disabled={isSubmitting}
                    />
                    <div class="upload-placeholder">
                        <span class="upload-icon">📂</span>
                        <span class="upload-text">Klik untuk pilih berkas bukti atau seret ke sini</span>
                        <span class="upload-hint">Mendukung format gambar (JPG/PNG) atau PDF. Maksimal 2MB.</span>
                    </div>
                </div>

                {#if evidencePreview}
                    <div class="preview-container">
                        <span class="preview-name">Pratinjau Bukti Gambar:</span>
                        <img src={evidencePreview} alt="Preview Bukti Pelanggaran" class="img-preview" />
                    </div>
                {:else if evidenceFile}
                    <div class="file-attached-badge">
                        📄 Berkas Terlampir: <strong>{evidenceFile.name}</strong>
                    </div>
                {/if}
            </div>

            <footer class="form-footer">
                <button type="button" class="btn-secondary" disabled={isSubmitting} on:click={() => window.history.back()}>
                    Kembali
                </button>
                <button type="submit" class="btn-danger" disabled={isSubmitting}>
                    {isSubmitting ? 'Memproses Laporan...' : 'Kirim Laporan Pengaduan'}
                </button>
            </footer>
        </form>
    </main>
</div>

<!-- --- -->

<!-- ### 🎨 Kode CSS Terpadu (`<style>`) -->

<!-- ```html -->
<style>
    .page-wrapper {
        min-height: 100vh;
        background-color: #f1f5f9;
        display: flex;
        justify-content: center;
        padding: 40px 20px;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    .content-box {
        width: 100%;
        max-width: 750px;
        background-color: #ffffff;
        border-radius: 12px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
        padding: 40px;
    }

    .page-header h1 {
        font-size: 26px;
        color: #0f172a;
        margin: 0 0 10px 0;
        font-weight: 700;
    }

    .page-header p {
        color: #64748b;
        font-size: 14px;
        line-height: 1.6;
        margin-bottom: 30px;
    }


    .report-form {
        display: flex;
        flex-direction: column;
        gap: 24px;
    }

    .form-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .form-group label {
        font-size: 14px;
        font-weight: 600;
        color: #334155;
    }

    textarea {
        width: 100%;
        padding: 12px;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        font-size: 14px;
        background-color: #fff;
        transition: border-color 0.2s, box-shadow 0.2s;
        box-sizing: border-box;
    }

    textarea:focus {
        outline: none;
        border-color: #ef4444;
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }

    .hint-text {
        font-size: 12px;
        color: #94a3b8;
    }

    /* Area Kustom Drag & Drop / File Upload */
    .upload-zone {
        position: relative;
        border: 2px dashed #cbd5e1;
        border-radius: 8px;
        padding: 30px;
        text-align: center;
        background-color: #f8fafc;
        cursor: pointer;
        transition: background-color 0.2s, border-color 0.2s;
    }

    .upload-zone:hover {
        background-color: #f1f5f9;
        border-color: #94a3b8;
    }

    .upload-zone input[type="file"] {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        cursor: pointer;
    }

    .upload-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
    }

    .upload-icon {
        font-size: 32px;
    }

    .upload-text {
        font-size: 14px;
        font-weight: 600;
        color: #475569;
    }

    .upload-hint {
        font-size: 12px;
        color: #94a3b8;
    }

    /* Preview Bukti */
    .preview-container {
        margin-top: 14px;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .preview-name {
        font-size: 13px;
        font-weight: 600;
        color: #475569;
    }

    .img-preview {
        max-width: 250px;
        max-height: 250px;
        object-fit: cover;
        border-radius: 6px;
        border: 1px solid #cbd5e1;
    }

    .file-attached-badge {
        margin-top: 12px;
        background-color: #f0fdf4;
        border: 1px solid #bbf7d0;
        color: #166534;
        padding: 10px 14px;
        border-radius: 6px;
        font-size: 13px;
    }

    /* Footer / Tombol Aksi */
    .form-footer {
        display: flex;
        justify-content: flex-end;
        gap: 16px;
        border-top: 1px solid #e2e8f0;
        padding-top: 24px;
        margin-top: 10px;
    }

    .form-footer button {
        padding: 12px 24px;
        font-size: 14px;
        font-weight: 600;
        border-radius: 6px;
        border: none;
        cursor: pointer;
        transition: transform 0.1s, opacity 0.2s;
    }

    .form-footer button:active {
        transform: scale(0.98);
    }

    .btn-secondary {
        background-color: #e2e8f0;
        color: #334155;
    }

    .btn-secondary:hover {
        background-color: #cbd5e1;
    }

    .btn-danger {
        background-color: #ef4444;
        color: #ffffff;
    }

    .btn-danger:hover {
        background-color: #dc2626;
    }

    input[type="text"], input[type="date"] {
        width: 100%;
        padding: 12px;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        font-size: 14px;
        background-color: #fff;
        transition: border-color 0.2s, box-shadow 0.2s;
        box-sizing: border-box;
    }

    input[type="text"]:focus, input[type="date"]:focus {
        outline: none;
        border-color: #ef4444;
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }
    
</style>