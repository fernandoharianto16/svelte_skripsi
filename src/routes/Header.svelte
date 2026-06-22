<script>
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { auth } from "$lib/firebase"; // Jalur file inisialisasi Firebase Anda
    import { onAuthStateChanged, signOut } from "firebase/auth";
    import Swal from "sweetalert2";
	import { doc, getDoc } from "firebase/firestore";
	import { db } from "$lib/firebase";
	import { cart } from "$lib/stores/cartStore";

    // State untuk melacak status login user
    let isLoggedIn = false;
    // State untuk mencegah "flicker" (menu muncul sekilas saat halaman di-refresh)
    let isCheckingAuth = true;
    // State untuk membuka/tutup dropdown profile
    let showDropdown = false;

	let userRole = "";

    onMount(() => {
        // Memantau perubahan status login secara real-time
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                isLoggedIn = true;
                
                try {
                    // 1. Ambil referensi dokumen user berdasarkan UID dari Firestore
                    // Ganti "users" jika nama koleksi Anda berbeda (misal: "profiles" atau "accounts")
                    const userDocRef = doc(db, "users", user.uid);
                    
                    // 2. Ambil snapshot data dokumennya
                    const userDocSnap = await getDoc(userDocRef);

                    if (userDocSnap.exists()) {
                        const userData = userDocSnap.data();
                        userRole = userData.role; // Menyimpan role ('buyer' atau 'seller')
                        // console.log("Data user dari Firestore:", userData);
                    } else {
                        console.warn("Dokumen user tidak ditemukan di Firestore!");
                        userRole = "buyer"; // Fallback jika dokumen belum dibuat
                    }
                } catch (err) {
                    console.error("Gagal mengambil data dari Firestore:", err);
                    userRole = "buyer"; // Fallback aman jika terjadi error
                }

            } else {
                isLoggedIn = false;
                userRole = "";
            }
            isCheckingAuth = false; // Proses pengecekan selesai
        });

        // Bersihkan listener saat komponen dihancurkan
        return () => unsubscribe();
    });

    function toggleDropdown() {
        showDropdown = !showDropdown;
    }

    async function handleLogout() {
        try {
            await signOut(auth);
            showDropdown = false;

            await Swal.fire({
                title: "Berhasil Logout",
                text: "Anda telah keluar dari akun dengan aman.",
                icon: "success",
                timer: 2000,
                timerProgressBar: true,
                showConfirmButton: false
            });
			cart.set([]);

            goto("/login");
        } catch (error) {
            console.error("Gagal logout:", error);
            Swal.fire({
                title: "Gagal Logout",
                text: "Terjadi kesalahan, silakan coba lagi.",
                icon: "error"
            });
        }
    }
</script>

<header>
    <div class="corner">
        </div>

    {#if !isCheckingAuth}
        {#if !isLoggedIn}
            <nav>
                <svg viewBox="0 0 2 3" aria-hidden="true">
                    <path d="M0,0 L1,2 C1.5,3 1.5,3 2,3 L2,0 Z" />
                </svg>
                <ul>
                    <li aria-current={$page.url.pathname === "/" ? "page" : undefined}>
                        <a href="/">Home</a>
                    </li>
                    <li aria-current={$page.url.pathname === "/faq" ? "page" : undefined}>
                        <a href="/faq">FAQ</a>
                    </li>
                    <li aria-current={$page.url.pathname.startsWith("/login") ? "page" : undefined}>
                        <a href="/login">Login</a>
                    </li>
                    <li aria-current={$page.url.pathname.startsWith("/register") ? "page" : undefined}>
                        <a href="/register">Register</a>
                    </li>
                </ul>
                <svg viewBox="0 0 2 3" aria-hidden="true">
                    <path d="M0,0 L0,3 C0.5,3 0.5,3 1,2 L2,0 Z" />
                </svg>
            </nav>
        {/if}
    {/if}

    <div class="corner">
        {#if !isCheckingAuth && isLoggedIn}
            <div class="profile-menu">
                <button class="profile-icon" on:click={toggleDropdown} aria-label="Menu profil">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                </button>

                {#if showDropdown}
					<div class="dropdown-content">
						{#if userRole === 'buyer'}
							<a href="/buyer/notifications" on:click={() => showDropdown = false}>Notifikasi</a>
							<a href="/buyer/product" on:click={() => showDropdown = false}>Cari Produk</a>
							<a href="/buyer/cart" on:click={() => showDropdown = false}>Cart</a>
							<a href="/buyer/custom_request" on:click={() => showDropdown = false}>Buat Custom Request</a>
							<a href="/buyer/my_custom_request" on:click={() => showDropdown = false}>Custom Request Saya</a>
							<a href="/buyer/orders" on:click={() => showDropdown = false}>Pesanan Saya</a>
							<a href="/buyer/negotiation" on:click={() => showDropdown = false}>Negosiasi</a>
							<a href="/buyer/chats" on:click={() => showDropdown = false}>Chat</a>
							<a href="/buyer/report-seller" on:click={() => showDropdown = false}>Report Penjual</a>

						{:else if userRole === 'seller'}
							<a href="/seller/notifications" on:click={() => showDropdown = false}>Notifikasi</a>
							<a href="/seller/product" on:click={() => showDropdown = false}>Produk Saya</a>
							<a href="/seller/custom_request" on:click={() => showDropdown = false}>List Custom Order</a>
							<a href="/seller/my_custom_order" on:click={() => showDropdown = false}>Custom Order Diambil</a>
							<a href="/seller/orders" on:click={() => showDropdown = false}>Daftar Pesanan</a>
							<a href="/seller/negotiation" on:click={() => showDropdown = false}>Negosiasi</a>
							<a href="/seller/chats" on:click={() => showDropdown = false}>Chat</a>
						{/if}

						<button on:click={handleLogout} class="logout-btn">Logout</button>
					</div>
				{/if}
            </div>
        {/if}
    </div>
</header>

<style>
    header {
        display: flex;
        justify-content: space-between;
        align-items: center; /* Menyeimbangkan posisi vertikal elemen */
        padding: 0 1rem;
        height: 4em;
    }

    .corner {
        width: 4em;
        height: 3em;
        display: flex;
        align-items: center;
        justify-content: flex-end; /* Memojokkan menu profile ke kanan */
        position: relative;
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

    /* ─── STYLE TAMBAHAN PROFILE DROPDOWN ─── */
    .profile-menu {
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
        top: 110%;
        background: white;
        min-width: 150px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
        border-radius: 8px;
        border: 1px solid #eee;
        padding: 6px 0;
        display: flex;
        flex-direction: column;
        z-index: 1000;
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
</style>