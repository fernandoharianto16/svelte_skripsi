<script>
    import Header from "./Header.svelte";
    import "./styles.css";
    import { onMount } from "svelte";
    import { auth, db } from "$lib/firebase"; // Pastikan 'db' (Firestore) di-import dari firebase.js kamu
    import { doc, getDoc } from "firebase/firestore";
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import Swal from "sweetalert2";

    // 1. URL publik tanpa login
    const halamanPublik = ["/", "/login", "/register", "/products"];

    onMount(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            // Tambah async di sini
            const urlSekarang = $page.url.pathname;
            const isStaticPublic = halamanPublik.includes(urlSekarang);
            const isDetailPublic = urlSekarang.startsWith("/detail/");

            // KONDISI 1: JIKA BELUM LOGIN dan mencoba akses halaman privat
            if (!user) {
                if (!isStaticPublic && !isDetailPublic) {
                    tampilkanAlert(
                        "Akses Ditolak!",
                        "Silakan login terlebih dahulu.",
                        "/login",
                    );
                }
                return; // Berhenti di sini jika belum login
            }

            // KONDISI 2: JIKA SUDAH LOGIN, CEK ROLE
            try {
                // Ambil data user dari Firestore berdasarkan UID Firebase Auth
                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    const roleUser = userData.role; // Ambil field 'role' (misal isinya: 'buyer' atau 'seller')

                    const isHalamanPenjual = urlSekarang.startsWith("/seller"); // Deteksi halaman penjual (misal: /seller/dashboard)

                    // Jika user adalah BUYER, tapi nekat masuk ke halaman SELLER
                    if (roleUser === "buyer" && isHalamanPenjual) {
                        tampilkanAlert(
                            "Akses Terbatas!",
                            "Halaman ini hanya dapat diakses oleh akun Penjual.",
                            "/buyer/product", // Tendang balik ke beranda atau dashboard buyer
                        );
                    } else if (
                        roleUser === "seller" &&
                        !isHalamanPenjual &&
                        !isStaticPublic &&
                        !isDetailPublic
                    ) {
                        tampilkanAlert(
                            "Akses Terbatas!",
                            "Halaman ini hanya dapat diakses oleh akun Pembeli.",
                            "/seller/product", // Tendang balik ke beranda atau dashboard seller
                        );
                    }
                } else {
                    // 🟢 PERBAIKAN DI SINI: Tolong toleransi jika user berada di halaman publik/registrasi
                    if (
                        urlSekarang === "/register" ||
                        urlSekarang === "/login"
                    ) {
                        console.log(
                            "User baru terdeteksi di halaman autentikasi, menunggu inisialisasi database...",
                        );
                    } else {
                        // Jika dia di halaman privat tapi datanya ga ada di DB, baru tendang keluar
                        console.error(
                            "Data user tidak ditemukan di Firestore.",
                        );
                        tampilkanAlert(
                            "Akun Tidak Valid",
                            "Profil Anda tidak ditemukan di sistem kami. Silakan registrasi ulang.",
                            "/register",
                        );
                    }
                }
            } catch (error) {
                console.error("Gagal mengambil data role:", error);
            }
        });

        // Fungsi helper agar tidak menulis Swal berulang-ulang
        function tampilkanAlert(title, text, ruteTujuan) {
            Swal.fire({
                icon: "error",
                title: title,
                text: text,
                timer: 3000,
                timerProgressBar: true,
                showConfirmButton: false,
                allowOutsideClick: false,
                allowEscapeKey: false,
            }).then(() => {
                goto(ruteTujuan);
            });
        }

        return () => unsubscribe();
    });
</script>

<div class="app">
    <Header />

    <main>
        <slot />
    </main>

    <footer></footer>
</div>

<style>
    /* Style bawaan kamu tetap sama, tidak ada perubahan */
    .app {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
    }
    main {
        flex: 1;
        display: flex;
        flex-direction: column;
        padding: 1rem;
        width: 100%;
        max-width: 64rem;
        margin: 0 auto;
        box-sizing: border-box;
    }
    footer {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 12px;
    }
    @media (min-width: 480px) {
        footer {
            padding: 12px 0;
        }
    }
</style>
