<script>
    import { page } from "$app/stores";
    // import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { auth } from "$lib/firebase"; // Jalur file inisialisasi Firebase Anda
    import { onAuthStateChanged, signOut } from "firebase/auth";
    import Swal from "sweetalert2";
    import { doc, getDoc } from "firebase/firestore";
    import { db } from "$lib/firebase";
    import { cart } from "$lib/stores/cartStore";
    import FloatingChat from "$lib/components/FloatingChat.svelte";
    
    // State untuk melacak status login user
    let isLoggedIn = false;
    // State untuk mencegah "flicker" (menu muncul sekilas saat halaman di-refresh)
    let isCheckingAuth = true;
    // State untuk membuka/tutup dropdown profile
    let showDropdown = false;

    let userRole = "";
    let userData = "";

    // Tambahkan orderBy dan limit di dalam tanda kurung kurawal `{ }`
    import { collection, query, where, onSnapshot, updateDoc, writeBatch, getDocs, orderBy, limit } from "firebase/firestore";

    let unreadNotifCount = 0;
    let notificationList = [];
    let showNotifDropdown = false;
    onMount(() => {
    // Variabel penampung fungsi untuk mematikan listener notifikasi
    let unsubscribeNotif = () => {};

    // Memantau perubahan status login secara real-time
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user && user.uid) {
            isLoggedIn = true;
            
            try {
                // 1. Ambil data role user dari Firestore
                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    userData = userDocSnap.data();
                    userRole = userData.role; 
                } else {
                    console.warn("Dokumen user tidak ditemukan di Firestore!");
                    userRole = "buyer"; 
                }
            } catch (err) {
                console.warn("Meredam sisa cek data user saat awal/logout:", err.message);
                userRole = "buyer"; 
            }

            // ─── TAMBAHAN AWAL: LISTENER REAL-TIME NOTIFIKASI ───
            // Query untuk mencari notifikasi milik user ini yang is_read-nya masih false
            const notifQuery = query(
                collection(db, "notifications"),
                where("user_id", "==", user.uid),
                orderBy("created_at", "desc"), // Mengurutkan dari yang paling baru masuk
                limit(5) // Membatasi hanya 10 log aktivitas terakhir untuk di dropdown lonceng
            );

            // Mulai mendengarkan secara real-time
            unsubscribeNotif = onSnapshot(notifQuery, (snapshot) => {
                let tempNotifs = [];
                let unreadCount = 0; // Buat penghitung manual untuk badge merah

                snapshot.forEach((doc) => {
                    const data = doc.data();
                    tempNotifs.push({ id: doc.id, ...data });
                    
                    // Hanya naikkan angka badge merah jika statusnya memang belum dibaca
                    if (data.is_read === false) {
                        unreadCount++;
                    }
                });

                notificationList = tempNotifs; // List dropdown tetap berisi 5 aktivitas terbaru (campuran read & unread)
                unreadNotifCount = unreadCount;
            }, (error) => {
                console.warn("Meredam listener notifikasi saat logout:", error.message);
            });
            // ─── TAMBAHAN AKHIR: LISTENER REAL-TIME NOTIFIKASI ───

        } else {
            isLoggedIn = false;
            userRole = "";
            
            // Matikan listener notifikasi jika user logout
            unsubscribeNotif();
            unreadNotifCount = 0;
            notificationList = [];
        }
        isCheckingAuth = false; 
    });

    // Bersihkan semua listener saat komponen Header dihancurkan
    return () => {
        unsubscribe();
        unsubscribeNotif();
    };
});


    function toggleDropdown() {
        showDropdown = !showDropdown;
    }

    async function handleLogout() {
        try {
            // 1. Amankan UI & State lokal terlebih dahulu
            showDropdown = false;
            cart.set([]);

            // 2. Tampilkan notifikasi sukses ke user
            await Swal.fire({
                title: "Berhasil Logout",
                text: "Anda telah keluar dari akun dengan aman.",
                icon: "success",
                timer: 2000,
                timerProgressBar: true,
                showConfirmButton: false
            });

            // 3. BARU JALANKAN SIGNOUT (Taruh di paling bawah)
            await signOut(auth);

            // 4. Pindah halaman
            // goto("/login");
            window.location.href = "/login";
        } catch (error) {
            console.error("Gagal logout:", error);
            Swal.fire({
                title: "Gagal Logout",
                text: "Terjadi kesalahan, silakan coba lagi.",
                icon: "error"
            });
        }
    }
    let isChatOpen = false;

    async function closeDropdownsOnOutsideClick(event) {
    // Jika yang diklik bukan bagian dari tombol lonceng atau isinya, tutup dropdown notif
    if (!event.target.closest('.notif-wrapper')) {
        if (showNotifDropdown) {
            // Tandai sudah dibaca di database tepat saat kotaknya menutup
            await clearUnreadNotifications(); 
            showNotifDropdown = false;
        }
    }
    // Jika yang diklik bukan bagian dari tombol profil atau isinya, tutup dropdown profil
    if (!event.target.closest('.profile-btn-wrapper')) {
        showDropdown = false;
    }
}
async function toggleNotifDropdown() {
    if (showNotifDropdown) {
        // Jika posisi sedang terbuka lalu diklik (artinya mau menutup), tandai sudah dibaca
        await clearUnreadNotifications();
    }
    showNotifDropdown = !showNotifDropdown;
}
// 2. Fungsi ini bertugas membersihkan/menandai 'read' HANYA KETIKA DROPDOWN DITUTUP
async function clearUnreadNotifications() {
    if (notificationList.length > 0) {
        const batch = writeBatch(db);
        
        notificationList.forEach((notif) => {
            const notifRef = doc(db, "notifications", notif.id);
            batch.update(notifRef, { is_read: true });
        });

        try {
            await batch.commit();
        } catch (err) {
            console.error("Gagal mengupdate status notifikasi:", err);
        }
    }
}
</script>

<svelte:window on:click={closeDropdownsOnOutsideClick} />

<header>
    <div class="header-left">
        </div>

    <div class="header-center">
        <nav>
            <svg viewBox="0 0 2 3" aria-hidden="true">
                <path d="M0,0 L1,2 C1.5,3 1.5,3 2,3 L2,0 Z" />
            </svg>
            <ul>
                {#if userRole=="buyer"}
                    <li aria-current={$page.url.pathname === "/buyer/product" ? "page" : undefined}>
                        <a href="/buyer/product">Home</a>
                    </li>
                {:else if userRole=="seller"}
                    <li aria-current={$page.url.pathname === "/seller/product" ? "page" : undefined}>
                        <a href="/seller/product">Home</a>
                    </li>
                {:else if userRole=="admin"}
                    <li aria-current={$page.url.pathname === "/admin/revenue" ? "page" : undefined}>
                        <a href="/admin/revenue">Laporan Pendapatan</a>
                    </li>
                {:else}
                    <li aria-current={$page.url.pathname === "/" ? "page" : undefined}>
                        <a href="/">Home</a>
                    </li>
                {/if}
                <!-- <li aria-current={$page.url.pathname === "/faq" ? "page" : undefined}>
                    <a href="/faq">FAQ</a>
                </li> -->
                {#if userRole=="buyer"}
                    <li aria-current={$page.url.pathname === "/buyer/orders" ? "page" : undefined}>
                        <a href="/buyer/orders">Pesanan Saya</a>
                    </li>
                    <li aria-current={$page.url.pathname === "/buyer/custom_request" ? "page" : undefined}>
                        <a href="/buyer/custom_request">Buat Permintaan Kustom</a>
                    </li>
                    <li aria-current={$page.url.pathname === "/buyer/my_custom_request" ? "page" : undefined}>
                        <a href="/buyer/my_custom_request">Permintaan Kustom Saya</a>
                    </li>
                    <li aria-current={$page.url.pathname === "/buyer/negotiation" ? "page" : undefined}>
                        <a href="/buyer/negotiation">Negosiasi Saya</a>
                    </li>
                {:else if userRole=="seller"}
                    <li aria-current={$page.url.pathname === "/seller/orders" ? "page" : undefined}>
                        <a href="/seller/orders">Daftar Pesanan</a>
                    </li>
                    <li aria-current={$page.url.pathname === "/seller/custom_request" ? "page" : undefined}>
                        <a href="/seller/custom_request">List Custom Request</a>
                    </li>
                    <li aria-current={$page.url.pathname === "/seller/my_custom_order" ? "page" : undefined}>
                        <a href="/seller/my_custom_order">Custom Request Diambil</a>
                    </li>
                    <li aria-current={$page.url.pathname === "/seller/negotiation" ? "page" : undefined}>
                        <a href="/seller/negotiation">Negosiasi Saya</a>
                    </li>
                {:else if userRole=="admin"}
                    <li aria-current={$page.url.pathname === "/admin/list_user" ? "page" : undefined}>
                        <a href="/admin/list_user">List Semua pengguna</a>
                    </li>
                    <li aria-current={$page.url.pathname === "/admin/report" ? "page" : undefined}>
                        <a href="/admin/report">Laporan Report Pengguna</a>
                    </li>
                    <!-- <li aria-current={$page.url.pathname === "/seller/my_custom_order" ? "page" : undefined}>
                        <a href="/seller/my_custom_order">Custom Order Diambil</a>
                    </li> -->
                {/if}
                {#if !isCheckingAuth && !isLoggedIn}
                    <li aria-current={$page.url.pathname.startsWith("/login") ? "page" : undefined}>
                        <a href="/login">Login</a>
                    </li>
                    <li aria-current={$page.url.pathname.startsWith("/register") ? "page" : undefined}>
                        <a href="/register">Register</a>
                    </li>
                {/if}
            </ul>
            <svg viewBox="0 0 2 3" aria-hidden="true">
                <path d="M0,0 L0,3 C0.5,3 0.5,3 1,2 L2,0 Z" />
            </svg>
        </nav>
    </div>

    <div class="header-right">
        {#if !isCheckingAuth && isLoggedIn}
            <div class="profile-menu">
                
                <div class="notif-wrapper">
                    <button class="notif-btn" on:click={toggleNotifDropdown} aria-label="Notifikasi">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="#facc15" stroke="#1e293b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="bell-icon">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                        
                        {#if unreadNotifCount > 0}
                            <span class="badge">{unreadNotifCount}</span>
                        {/if}
                    </button>

                    {#if showNotifDropdown}
                        <div class="notif-dropdown">
                            <h4>Notifikasi Baru</h4>
                            
                            <div class="notif-scroll">
                                {#if notificationList.length === 0}
                                    <p class="empty-notif">Tidak ada notifikasi baru.</p>
                                {:else}
                                    {#each notificationList as notif}
                                        <div class="notif-item">
                                            <strong>{notif.title}</strong>
                                            <p>{notif.message}</p>
                                        </div>
                                    {/each}
                                {/if}
                            </div>

                            <div class="notif-footer">
                                <a href={userRole === 'seller' ? '/seller/notifications' : '/buyer/notifications'} 
                                on:click={() => showNotifDropdown = false}>
                                    Lihat Semua Notifikasi
                                </a>
                            </div>
                        </div>
                    {/if}
                </div>

                <div class="profile-btn-wrapper">
                    <button class="profile-icon" on:click={toggleDropdown} aria-label="Menu profil">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                    </button>

                    {#if showDropdown}
                        <div class="dropdown-content">
                            {#if userRole === 'buyer' && userData.status!=false}
                                <a href="/buyer/notifications" on:click={() => showDropdown = false}>Notifikasi</a>
                                <a href="/buyer/product" on:click={() => showDropdown = false}>Cari Produk</a>
                                <a href="/buyer/cart" on:click={() => showDropdown = false}>Cart</a>
                                <a href="/buyer/orders" on:click={() => showDropdown = false}>Pesanan Saya</a>
                                <a href="/buyer/custom_request" on:click={() => showDropdown = false}>Buat Custom Request</a>
                                <a href="/buyer/my_custom_request" on:click={() => showDropdown = false}>Custom Request Saya</a>
                                <a href="/buyer/negotiation" on:click={() => showDropdown = false}>Negosiasi</a>
                                <a on:click={() => { showDropdown = false; isChatOpen = true; }}>Chat</a>
                                <a href="/buyer/report" on:click={() => showDropdown = false}>Report Penjual</a>
                            {:else if userRole === 'seller'&& userData.status!=false}
                                <a href="/seller/notifications" on:click={() => showDropdown = false}>Notifikasi</a>
                                <a href="/seller/product" on:click={() => showDropdown = false}>Produk Saya</a>
                                <a href="/seller/orders" on:click={() => showDropdown = false}>Daftar Pesanan</a>
                                <a href="/seller/custom_request" on:click={() => showDropdown = false}>List Custom Order</a>
                                <a href="/seller/my_custom_order" on:click={() => showDropdown = false}>Custom Order Diambil</a>
                                <a href="/seller/negotiation" on:click={() => showDropdown = false}>Negosiasi</a>
                                <a href="/seller/revenue" on:click={() => showDropdown = false}>Cek Penghasilan</a>
                                <a on:click={() => { showDropdown = false; isChatOpen = true; }}>Chat</a>
                                <a href="/seller/report" on:click={() => showDropdown = false}>Report Pembeli</a>
                            {:else if userRole ==='admin'}
                                <a href="/admin/revenue" on:click={() => showDropdown = false}>Laporan Pendapatan</a>
                                <a href="/admin/list_user" on:click={() => showDropdown = false}>Laporan List Pengguna</a>
                                <a href="/admin/report" on:click={() => showDropdown = false}>Laporan Report Pengguna</a>
                            {/if}
                            <button on:click={handleLogout} class="logout-btn">Logout</button>
                        </div>
                    {/if}
                </div>

            </div>
        {/if}
    </div>
</header>

<FloatingChat bind:isOpen={isChatOpen} activeProductId={null} activeProductData={null} />

<style>
    header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 10px 20px;
    box-sizing: border-box;
}

/* Sisi kiri dan kanan diberi porsi flex yang sama (1) agar adil */
.header-left, .header-right {
    flex: 1; 
    display: flex;
    align-items: center;
}

/* Profil ditarik paksa ke pojok kanan paling ujung */
.header-right {
    justify-content: flex-end; 
}

/* Sisi tengah otomatis terpusat di tengah layar tanpa terpengaruh konten kanan/kiri */
.header-center {
    flex: 0 0 auto; /* Ukurannya pas sesuai isi nav */
    display: flex;
    justify-content: center;
}

/* CSS Tambahan untuk merapikan list navbar Anda */
nav ul {
    display: flex;
    list-style: none;
    margin: 0;
    padding: 0;
    gap: 15px; /* Jarak antar menu */
}

    nav {
        display: flex;
        justify-content: center;
        --background: rgba(255, 255, 255, 0.7);
    }

    svg {
        width: 2em;
        height: 3em;
        display: block;
    }

    path {
        fill: var(--background);
    }

    ul {
        position: relative;
        padding: 0;
        margin: 0;
        height: 3em;
        display: flex;
        justify-content: center;
        align-items: center;
        list-style: none;
        background: var(--background);
        background-size: contain;
    }

    li {
        position: relative;
        height: 100%;
    }

    li[aria-current="page"]::before {
        --size: 6px;
        content: "";
        width: 0;
        height: 0;
        position: absolute;
        top: 0;
        left: calc(50% - var(--size));
        border: var(--size) solid transparent;
        border-top: var(--size) solid var(--color-theme-1);
    }

    nav a {
        display: flex;
        height: 100%;
        align-items: center;
        padding: 0 0.5rem;
        color: var(--color-text);
        font-weight: 700;
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        text-decoration: none;
        transition: color 0.2s linear;
    }

    a:hover {
        color: var(--color-theme-1);
    }

    /* Mendorong lonceng dan profil berjejer ke samping */
    .profile-menu {
        display: flex;
        align-items: center;
        gap: 16px; 
        position: relative;
    }

    .profile-btn-wrapper {
        position: relative;
    }

    .profile-icon {
        background: white;
        border: 1px solid #ccc;
        border-radius: 50%;
        cursor: pointer;
        padding: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #333;
        transition: background 0.2s;
    }

    .profile-icon:hover {
        background: #f0f0f0;
    }

    .dropdown-content {
        position: absolute;
        right: 0;
        top: 120%;
        background: white;
        min-width: 160px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
        border-radius: 8px;
        border: 1px solid #eee;
        padding: 6px 0;
        display: flex;
        flex-direction: column;
        z-index: 1001;
    }

    .dropdown-content a, .dropdown-content .logout-btn {
        padding: 10px 16px;
        text-decoration: none;
        color: #333;
        border: none;
        background: none;
        text-align: left;
        cursor: pointer;
        font-size: 13px;
        font-family: Arial, sans-serif;
    }

    .dropdown-content a:hover, .dropdown-content .logout-btn:hover {
        background: #f5f5f5;
    }

    .logout-btn {
        color: #d32f2f !important;
        border-top: 1px solid #eee !important;
        margin-top: 5px;
    }

    .notif-wrapper {
        position: relative;
        display: flex;
        align-items: center;
    }

    /* .notif-btn {
        background: none;
        border: none;
        font-size: 22px;
        cursor: pointer;
        position: relative;
        padding: 5px;
        display: flex;
        align-items: center;
        justify-content: center;
    } */
    .notif-btn {
        background: none;
        border: none;
        cursor: pointer;
        position: relative;
        padding: 5px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .bell-icon {
        transition: transform 0.2s;
    }

    .notif-btn:hover .bell-icon {
        transform: scale(1.1);
    }

    .badge {
        position: absolute;
        top: -2px;
        right: -2px;
        background: #ef4444; 
        color: white;
        font-size: 10px;
        font-weight: bold;
        padding: 2px 6px;
        border-radius: 10px;
    }

    .notif-dropdown {
        position: absolute;
        right: 0;
        top: 130%;
        background: white;
        width: 280px;
        box-shadow: 0px 8px 16px rgba(0,0,0,0.15);
        border-radius: 8px;
        padding: 0; /* Diubah ke 0 agar footer menempel ke ujung kiri-kanan bawah */
        z-index: 1000;
        overflow: hidden; /* Biar ujung footer ikut melengkung sesuai border-radius */
        display: flex;
        flex-direction: column;
    }

    .notif-dropdown h4 {
        margin: 0;
        font-size: 14px;
        color: #333;
        border-bottom: 1px solid #f1f5f9;
        padding: 12px 12px 8px 12px; /* Diberi padding manual karena padding dropdown sekarang 0 */
    }

    .notif-scroll {
        max-height: 200px;
        overflow-y: auto;
        padding: 0 12px; /* Menggeser padding ke dalam area scroll */
    }

    .notif-item {
        padding: 8px 0;
        border-bottom: 1px solid #f1f5f9;
    }

    .notif-item:last-child {
        border-bottom: none;
    }

    .notif-item strong {
        font-size: 13px;
        color: #1e293b;
    }

    .notif-item p {
        margin: 4px 0 0 0;
        font-size: 12px;
        color: #64748b;
    }

    .empty-notif {
        font-size: 12px;
        color: #94a3b8;
        text-align: center;
        margin: 10px 0; /* Tetap sesuai aslinya milikmu */
    }

    /* 🟢 FOOTER BARU (UNTUK TOMBOL LIHAT SEMUA) */
    .notif-footer {
        text-align: center;
        border-top: 1px solid #f1f5f9;
        background-color: #ffffff;
        padding: 10px 0;
        font-size: 0.85rem;
        font-weight: 500;
    }

    .notif-footer a {
        color: #ee4d2d; 
        text-decoration: none;
        display: block;
        width: 100%;
    }

    .notif-footer a:hover {
        color: #d13b1b;
        text-decoration: underline;
    }
</style>