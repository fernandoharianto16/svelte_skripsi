<script>
    import { onMount } from "svelte";
    import api from "$lib/api/axios"; // Sesuaikan dengan instance axios / fetch Anda
    import { onAuthStateChanged } from "firebase/auth"; 
    import { auth } from "$lib/firebase";

    let users = [];
    let filteredUsers = [];
    let searchQuery = "";
    let selectedRole = "all";
    let loading = true;
    let errorMessage = "";

    onMount(() => {
        // Jalankan listener Firebase Auth
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            // 1. Kondisi jika token hilang / user belum login / refresh halaman dan auth belum siap
            if (!user) {
                loading = false;
                errorMessage = "Anda belum login atau sesi telah berakhir.";
                return;
            }
            
            // 2. Jika user terdeteksi aktif (login valid), baru tembak API backend
            try {
                loading = true; // Set loading true setiap kali status auth dicek kembali
                const response = await api.get("/admin/users");
                // Pastikan response.data adalah Array, jika tidak set ke array kosong
                users = Array.isArray(response.data) ? response.data : [];
                filteredUsers = users;
                errorMessage = ""; // Bersihkan error jika sebelumnya sempat error
            } catch (error) {
                console.error("Gagal memuat data pengguna:", error);
                errorMessage = "Gagal mengambil data dari server.";
            } finally {
                loading = false;
            }
        });

        // Hancurkan listener saat admin meninggalkan halaman ini
        return () => unsubscribe();
    });

    // 2. Logika Filter & Pencarian di Frontend (Sudah Dibuat Kebal Error)
    $: {
        filteredUsers = users.filter((user) => {
            // Pastikan user tidak null/undefined sebelum membaca propertinya
            if (!user) return false;

            // Menggunakan (user.nama || "") dan ?.toLowerCase() untuk mencegah crash jika datanya null di DB
            const namaUser = user.nama ? String(user.nama).toLowerCase() : "";
            const emailUser = user.email ? String(user.email).toLowerCase() : "";
            const uidUser = user.uid ? String(user.uid) : "";
            const query = searchQuery.toLowerCase();

            const matchesSearch =
                namaUser.includes(query) ||
                emailUser.includes(query) ||
                uidUser.includes(searchQuery);

            const matchesRole =
                selectedRole === "all" || user.role === selectedRole;

            return matchesSearch && matchesRole;
        });
    }
</script>

<div class="user-management-page">
    <div class="header">
        <h2>Daftar Pengguna</h2>
        <p>
            Daftar seluruh akun pembeli (buyer) dan penjual (seller) di
            platform.
        </p>
    </div>

    <div class="filter-container">
        <input
            type="text"
            placeholder="Cari nama, email, atau UID..."
            bind:value={searchQuery}
            class="search-input"
        />

        <select bind:value={selectedRole} class="role-select">
            <option value="all">Semua Role</option>
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
        </select>
    </div>

    {#if loading}
        <div class="message-box">Memuat data pengguna...</div>
    {:else if errorMessage}
        <div class="message-box error">{errorMessage}</div>
    {:else if filteredUsers.length === 0}
        <div class="message-box">Tidak ada data pengguna yang cocok.</div>
    {:else}
        <div class="table-responsive">
            <table class="user-table">
                <thead>
                    <tr>
                        <th>UID Pengguna</th>
                        <th>Nama Lengkap</th>
                        <th>Email</th>
                        <th>Role</th>
                        <!-- <th>Poin</th> -->
                        <th>Status Akun</th>
                    </tr>
                </thead>
                <tbody>
                    {#each filteredUsers as user}
                        <tr>
                            <td class="user-id">{user.uid}</td>
                            <td class="font-weight-bold">{user.nama}</td>
                            <td>{user.email}</td>
                            <td>
                                <span class="role-badge {user.role}">
                                    {user.role === "seller"
                                        ? "Seller"
                                        : "Buyer"}
                                </span>
                            </td>
                            <!-- <td
                                ><span class="poin-value"
                                    >{user.poin.toLocaleString("id-ID")}</span
                                > Poin</td> -->
                            <td>
                                <span
                                    class="status-badge {user.status
                                        ? 'active'
                                        : 'inactive'}"
                                >
                                    {user.status ? "Aktif" : "Nonaktif"}
                                </span>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}
</div>

<style>
    /* Layout Utama */
    .user-management-page {
        padding: 24px;
        font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #333;
        max-width: 1200px;
        margin: 0 auto;
    }

    .header h2 {
        margin: 0 0 8px 0;
        font-size: 24px;
        color: #111827;
    }

    .header p {
        margin: 0 0 24px 0;
        color: #6b7280;
        font-size: 14px;
    }

    /* Filter & Search Bar */
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

    .search-input:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .role-select {
        padding: 10px 14px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        background-color: white;
        font-size: 14px;
        cursor: pointer;
        outline: none;
    }

    /* Styling Tabel (Sesuai Referensi CSS Utama Anda) */
    .table-responsive {
        overflow-x: auto;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        border: 1px solid #e5e7eb;
    }

    .user-table {
        width: 100%;
        border-collapse: collapse;
        background-color: white;
        text-align: left;
        font-size: 14px;
    }

    .user-table th {
        background-color: #f9fafb;
        padding: 14px 16px;
        font-weight: 600;
        color: #4b5563;
        border-bottom: 2px solid #e5e7eb;
    }

    .user-table td {
        padding: 14px 16px;
        border-bottom: 1px solid #e5e7eb;
        color: #1f2937;
        vertical-align: middle;
    }

    /* Utility & ID formatting */
    .user-id {
        font-family: monospace;
        color: #6b7280;
        font-size: 13px;
    }

    .font-weight-bold {
        font-weight: 600;
    }

    .poin-value {
        font-weight: 500;
        color: #059669;
    }

    /* Styling Badge untuk Role */
    .role-badge {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 50px;
        font-size: 12px;
        font-weight: 500;
    }

    .role-badge.buyer {
        background-color: #eff6ff;
        color: #1e40af;
    }

    .role-badge.seller {
        background-color: #faf5ff;
        color: #6b21a8;
    }

    /* Styling Badge untuk Status Akun */
    .status-badge {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
    }

    .status-badge.active {
        background-color: #d1fae5;
        color: #065f46;
    }

    .status-badge.inactive {
        background-color: #fee2e2;
        color: #991b1b;
    }

    /* Kotak Pesan Loading / Error */
    .message-box {
        padding: 20px;
        text-align: center;
        background-color: #f3f4f6;
        border-radius: 8px;
        color: #4b5563;
    }

    .message-box.error {
        background-color: #fee2e2;
        color: #b91c1c;
    }
</style>
