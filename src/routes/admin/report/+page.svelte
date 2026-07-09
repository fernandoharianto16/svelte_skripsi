<script>
  import { onMount } from "svelte";
  import api from "$lib/api/axios"; // Sesuaikan instance axios Anda
  import { onAuthStateChanged } from "firebase/auth";
  import { auth } from "$lib/firebase";
    import Swal from "sweetalert2";
  let reports = [];
  let filteredReports = [];
  let searchQuery = "";
  let statusFilter = "all";
  let loading = true;
  let errorMessage = "";

  let isSanksiModalOpen = false;
  let selectedReport = null;
  let sanctionReason = "";
  let sanctionType = "warning"; // default jenis sanksi

  // 1. Ambil data pengaduan dari backend
  onMount(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        loading = false;
        errorMessage = "Anda belum login atau sesi telah berakhir.";
        return;
      }
      loadReports();
    });

    return () => unsubscribe();
  });

  async function loadReports() {
    try {
        loading = true;
        const response = await api.get("/admin/reports");
        reports = Array.isArray(response.data) ? response.data : [];
        filteredReports = reports;
        errorMessage = "";
    } catch (error) {
        console.error("Gagal memuat data laporan:", error);
        errorMessage = "Gagal mengambil data laporan dari server.";
    } finally {
        loading = false;
    }
    }
  

  // Fungsi untuk membuka modal sanksi
  function openSanksiModal(report) {
    selectedReport = report;
    sanctionReason = "";
    sanctionType = "warning";
    isSanksiModalOpen = true;
  }

  // Fungsi untuk menutup modal
  function closeSanksiModal() {
    isSanksiModalOpen = false;
    selectedReport = null;
  }

  // Fungsi kirim sanksi ke backend
    async function submitSanksi() {
        // 1. Cek validasi alasan HANYA JIKA sanksinya BUKAN permanent_ban
        if (sanctionType !== 'permanent_ban') {
            if (!sanctionReason.trim() || sanctionReason.trim().length < 10) {
                Swal.fire("Gagal!", "Alasan sanksi wajib diisi (minimal 10 karakter).", "error");
                return;
            }
        }
        try {
            Swal.fire({
                title: "Memproses Sanksi...",
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });
            // Jika permanent_ban, set alasan default agar database tetap rapi & informatif
            const finalReason = sanctionType === 'permanent_ban' 
                ? "Akun diblokir secara permanen oleh Admin." 
                : sanctionReason.trim();

            // 2. Kirimkan data sanksi ke backend
            const res = await api.post("/admin/reports", {
                report_id: selectedReport.id,
                user_to_sanction: selectedReport.reported_name, 
                sanction_type: sanctionType,
                reason: finalReason
            });

            if (res.status === 200 || res.status === 201) {
                closeSanksiModal();
                await Swal.fire("Berhasil!", "Sanksi telah berhasil dijatuhkan.", "success");
                loadReports(); // Refresh tabel data laporan otomatis
            }
        } catch (err) {
            console.error(err);
            Swal.fire("Gagal!", err.response?.data?.message || "Terjadi kesalahan server.", "error");
        }
    }

  // Trik konversi Tanggal jika tipenya masih Firestore Timestamp bawaan Firebase
  function formatTanggal(dateInput) {
    if (!dateInput) return "-";
    // Jika bentuknya Firebase Timestamp object { seconds, nanoseconds }
    if (dateInput.seconds) {
      return new Date(dateInput.seconds * 1000).toLocaleDateString("id-ID", {
        day: "numeric", month: "short", year: "numeric"
      });
    }
    // Jika bentuknya string ISO / format tanggal bawaan SDK Node
    return new Date(dateInput).toLocaleDateString("id-ID", {
      day: "numeric", month: "short", year: "numeric"
    });
  }

  // 2. Logika Live Filter & Search di Frontend
  $: {
    filteredReports = reports.filter((report) => {
      if (!report) return false;

      const reportedName = report.reported_name ? String(report.reported_name).toLowerCase() : "";
      const description = report.description ? String(report.description).toLowerCase() : "";
      const query = searchQuery.toLowerCase();

      const matchesSearch = reportedName.includes(query) || description.includes(query);
      const matchesStatus = statusFilter === "all" || report.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }
</script>

<div class="reports-page">
  <div class="header">
    <h2>Pusat Pengaduan & Laporan</h2>
    <p>Tinjau keluhan transaksi, bukti kecurangan, dan sengketa antar pengguna.</p>
  </div>

  <div class="filter-container">
    <input 
      type="text" 
      placeholder="Cari nama terlapor atau deskripsi kasus..." 
      bind:value={searchQuery}
      class="search-input"
    />
    
    <select bind:value={statusFilter} class="status-select">
      <option value="all">Semua Status</option>
      <option value="pending">Pending</option>
      <option value="resolved">Resolved</option>
    </select>
  </div>

  {#if loading}
    <div class="message-box">Memuat data pengaduan...</div>
  {:else if errorMessage}
    <div class="message-box error">{errorMessage}</div>
  {:else if filteredReports.length === 0}
    <div class="message-box">Tidak ada laporan pengaduan yang ditemukan.</div>
  {:else}
    <div class="table-responsive">
      <table class="reports-table">
        <thead>
          <tr>
            <th>Tanggal Lapor</th>
            <th>Pelapor (Role)</th>
            <th>Nama Terlapor</th>
            <th>Deskripsi Masalah</th>
            <th>Tanggal Kejadian</th>
            <th>Bukti Gambar</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {#each filteredReports as report}
            <tr>
              <td>{formatTanggal(report.created_at)}</td>
              <td>
                <div class="reporter-info">
                  <span class="uid-text">{report.reporter_id}</span>
                  <span class="role-badge {report.reporter_role}">{report.reporter_role}</span>
                </div>
              </td>
              <td class="font-weight-bold text-dark">{report.reported_name}</td>
              <td class="description-cell" title={report.description}>
                {report.description}
              </td>
              <td>{formatTanggal(report.incident_date)}</td>
              <td>
                {#if report.evidence_image}
                  <a href={report.evidence_image} target="_blank" class="btn-evidence">
                    Lihat Bukti ↗
                  </a>
                {:else}
                  <span class="text-muted">Tidak ada</span>
                {/if}
              </td>
              <td>
                <span class="status-badge {report.status}">
                  {report.status}
                </span>
              </td>
              <td>
                {#if report.status === "pending"}
                  <button class="btn-sanction" on:click={() => openSanksiModal(report)}>⚠️ Beri Sanksi</button>
                {:else}
                  <button class="btn-disabled" disabled>Selesai</button>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

{#if isSanksiModalOpen}
  <div class="modal-backdrop" on:click={closeSanksiModal}>
    <div class="modal-box" on:click|stopPropagation>
      <h3>Formulir Tindakan Sanksi</h3>
      <p class="modal-subtitle">Berikan tindakan tegas untuk pengguna: <strong>{selectedReport?.reported_name}</strong></p>
      
      <div class="form-group">
        <label for="sanction-type">Jenis Sanksi:</label>
        <select id="sanction-type" bind:value={sanctionType}>
          <option value="warning">Peringatan (SP) +1 SP</option>
          <option value="permanent_ban">Blokir Permanen (Banned)</option>
        </select>
      </div>

      <div class="form-group">
        <label for="reason">Alasan Sanksi & Catatan Pelanggaran:</label>
        {#if sanctionType === 'permanent_ban'}
            <div style="padding: 12px; background-color: #fee2e2; color: #b91c1c; border-radius: 6px; font-size: 13px; font-weight: 500;">
            🚫 Pengguna ini akan langsung diblokir permanen. Tidak memerlukan catatan alasan sanksi.
            </div>
        {:else}
            <textarea 
            id="reason"
            rows="4" 
            placeholder="Tuliskan alasan rasional kenapa sanksi ini dijatuhkan..." 
            bind:value={sanctionReason}
            ></textarea>
            <span class="char-count">{sanctionReason.length}/10 karakter minimal</span>
        {/if}
      </div>

      <div class="modal-actions">
        <button class="btn-secondary" on:click={closeSanksiModal}>Batal</button>
        <button class="btn-primary" on:click={submitSanksi}>Eksekusi Sanksi</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .reports-page {
    padding: 24px;
    font-family: 'Segoe UI', Roboto, sans-serif;
    max-width: 1300px;
    margin: 0 auto;
  }

  .header h2 {
    margin: 0 0 6px 0;
    color: #111827;
  }

  .header p {
    margin: 0 0 24px 0;
    color: #6b7280;
    font-size: 14px;
  }

  /* Filter */
  .filter-container {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
  }

  .search-input {
    flex: 1;
    padding: 10px 14px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    outline: none;
  }

  .status-select {
    padding: 10px 14px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background-color: white;
    font-size: 14px;
  }

  /* Table CSS */
  .table-responsive {
    overflow-x: auto;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    border: 1px solid #e5e7eb;
  }

  .reports-table {
    width: 100%;
    border-collapse: collapse;
    background-color: white;
    font-size: 14px;
    text-align: left;
  }

  .reports-table th {
    background-color: #f9fafb;
    padding: 14px 16px;
    color: #4b5563;
    font-weight: 600;
    border-bottom: 2px solid #e5e7eb;
  }

  .reports-table td {
    padding: 14px 16px;
    border-bottom: 1px solid #e5e7eb;
    color: #374151;
    vertical-align: top;
  }

  .font-weight-bold { font-weight: 600; }
  .text-dark { color: #111827; }
  .text-muted { color: #9ca3af; font-size: 13px; }

  /* Info Pelapor */
  .reporter-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .uid-text {
    font-family: monospace;
    font-size: 12px;
    color: #6b7280;
  }

  /* Batasi teks deskripsi agar tabel tidak hancur melebar */
  .description-cell {
    max-width: 300px;
    white-space: normal;
    word-wrap: break-word;
    line-height: 1.4;
  }

  /* Tombol Link Bukti Gambar */
  .btn-evidence {
    display: inline-block;
    color: #2563eb;
    text-decoration: none;
    font-weight: 500;
  }

  .btn-evidence:hover {
    text-decoration: underline;
  }

  /* Badges System */
  .role-badge {
    display: inline-block;
    padding: 2px 6px;
    font-size: 11px;
    border-radius: 4px;
    text-transform: capitalize;
    width: fit-content;
  }

  .role-badge.seller { background-color: #f3e8ff; color: #6b21a8; }
  .role-badge.buyer { background-color: #e0f2fe; color: #0369a1; }

  .status-badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 50px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .status-badge.pending { background-color: #fef3c7; color: #d97706; }
  .status-badge.resolved { background-color: #d1fae5; color: #065f46; }
  .status-badge.rejected { background-color: #fee2e2; color: #b91c1c; }

  .message-box {
    padding: 20px;
    text-align: center;
    background-color: #f3f4f6;
    border-radius: 8px;
    color: #4b5563;
  }
  .message-box.error { background-color: #fee2e2; color: #b91c1c; }

  /* Tombol Sanksi */
  .btn-sanction {
    background-color: #dc2626;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
  }
  .btn-sanction:hover { background-color: #b91c1c; }
  .btn-disabled { background-color: #e5e7eb; color: #9ca3af; border: none; padding: 6px 12px; border-radius: 4px; cursor: not-allowed; }

  /* CSS MODAL SYSTEM */
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
  }

  .modal-box {
    background: white;
    padding: 24px;
    border-radius: 12px;
    width: 100%;
    max-width: 500px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  }

  .modal-box h3 { margin: 0 0 4px 0; color: #111827; }
  .modal-subtitle { margin: 0 0 20px 0; font-size: 14px; color: #4b5563; }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 16px;
  }

  .form-group label { font-size: 14px; font-weight: 600; color: #374151; }
  
  .form-group select, .form-group textarea {
    padding: 10px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    outline: none;
  }
  
  .form-group textarea { resize: none; }
  .char-count { font-size: 12px; color: #9ca3af; text-align: right; }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 24px;
  }

  .btn-secondary { background: #f3f4f6; border: 1px solid #d1d5db; padding: 10px 16px; border-radius: 6px; cursor: pointer; }
  .btn-secondary:hover { background: #e5e7eb; }
  .btn-primary { background: #dc2626; color: white; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-weight: 500; }
  .btn-primary:hover { background: #b91c1c; }
  .message-box { padding: 20px; text-align: center; background: #f3f4f6; border-radius: 8px; }
</style>