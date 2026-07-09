<script>
  import { auth } from "../../../lib/firebase.js";
  import { signInWithEmailAndPassword, updateProfile } from "firebase/auth"; // Membersihkan signOut
  import api from "$lib/api/axios";
  import { goto } from "$app/navigation";
  import Swal from "sweetalert2";
  import { signOut } from "firebase/auth";
  import { onMount } from "svelte";

  let email = "";
  let password = "";

  let isLoading = false;
  let errors = {}; // Membersihkan isSuccess

  const handleSubmit = async () => {
    errors = {};
    if (email.length === 0) {
      errors.email = "Field tidak boleh kosong";
    }
    if (password.length === 0) {
      errors.password = "Field tidak boleh kosong";
    }
    
    if (Object.keys(errors).length === 0) {
      isLoading = true;
      try {
        // 1. Lakukan autentikasi awal ke Firebase Auth
        await signInWithEmailAndPassword(auth, email, password); 
        
        // 2. Ambil data profil pengguna dari database melalui backend Anda
        const userLogin = await api.get("/users/me");

        // 🌟 VALIDASI BLOKIR: Cek apakah status dari database bernilai false atau tidak aktif
        if (userLogin.data.status === false) {
          // Paksa logout dari Firebase Auth agar sesi token tidak tersimpan di browser
          await signOut(auth);

          // Tampilkan pesan penolakan tegas lewat SweetAlert2
          await Swal.fire({
            title: "Akses Ditolak!",
            text: "Akun Anda telah ditangguhkan atau diblokir karena pelanggaran ketentuan.",
            icon: "error",
            timer: 2000, // Alert akan muncul selama 2.5 detik
            timerProgressBar: true, // Menampilkan bar waktu berjalan di bawah alert
            showConfirmButton: false, // Menghilangkan tombol "OK/Mengerti" agar fokus pada timer
          });
          location.reload();
          errors.error = "Akun ini telah diblokir.";
          return; // Hentikan fungsi di sini agar tidak lanjut mengarahkan (redirect) ke halaman dashboard
        }

        // 3. Jika status lolos (true), lanjutkan proses login seperti biasa
        await Swal.fire({
          title: "Login Berhasil",
          text: "Selamat datang kembali!",
          icon: "success",
          timer: 1500,
          timerProgressBar: true,
          showConfirmButton: false,
        });

        if (userLogin.data.role == "buyer") {
          await goto("/buyer/product");
        } else if (userLogin.data.role == "seller") {
          await goto("/seller/product");
        } else if (userLogin.data.role == "admin") {
          await goto("/admin/revenue");
        }
      } catch (error) {
        console.error("Login error:", error);
        if (
          error.code === "auth/invalid-credential" ||
          error.code === "auth/user-not-found" ||
          error.code === "auth/wrong-password"
        ) {
          errors.error = "Email atau password salah.";
        } else {
          errors.error = error.response?.data?.message || "Terjadi kesalahan, silakan coba lagi.";
        }
      } finally {
        isLoading = false;
      }
    }
  };
</script>

<svelte:head>
  <title>Login</title>
</svelte:head>

<div class="container">
  <form on:submit|preventDefault={handleSubmit}>
    <h1>Login</h1>
    <h1>👤</h1>

    <label for="email">Email</label>
    <input
      name="email"
      id="email"
      placeholder="name@example.com"
      bind:value={email}
      autocomplete="email"
    />

    <label for="password">Password</label>
    <input
      name="password"
      id="password"
      type="password"
      bind:value={password}
      autocomplete="current-password"
    />

    <button type="submit" disabled={isLoading}>
      {#if isLoading}Logging in...{:else}Log in 🔒{/if}
    </button>

    {#if Object.keys(errors).length > 0}
      <ul class="errors">
        {#each Object.keys(errors) as field}
          <li>{errors[field]}</li> {/each}
      </ul>
    {/if}
  </form>
</div>

<style>
  .container {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
  }

  form {
    background: #fff;
    padding: 50px;
    width: 300px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    box-shadow: 0px 20px 14px 8px rgba(0, 0, 0, 0.1);
    border-radius: 10px;
  }

  label {
    margin: 10px 0;
    align-self: flex-start;
    font-weight: 500;
  }

  input {
    border: none;
    border-bottom: 1px solid #ccc;
    margin-bottom: 20px;
    transition: all 300ms ease-in-out;
    width: 100%;
    padding: 10px 0;
  }

  input:focus {
    outline: 0;
    border-bottom: 1px solid #666;
  }

  button {
    margin-top: 20px;
    background: black;
    color: white;
    padding: 10px 0;
    width: 200px;
    border-radius: 25px;
    text-transform: uppercase;
    font-weight: bold;
    cursor: pointer;
    transition: all 300ms ease-in-out;
    display: flex;
    justify-content: center;
  }

  button:hover:not(:disabled) {
    transform: translateY(-2.5px);
    box-shadow: 0px 1px 10px 0px rgba(0, 0, 0, 0.1);
  }

  button:disabled {
    background: #666;
    cursor: not-allowed;
  }

  h1 {
    margin: 10px 0 30px 0;
    font-size: 40px;
    text-align: center;
  }

  .errors {
    list-style-type: none;
    padding: 10px;
    margin: 20px 0 0 0;
    border: 2px solid #be6283;
    color: #be6283;
    background: rgba(190, 98, 131, 0.3);
    width: 100%;
    border-radius: 5px;
  }
  
  /* Class .success dihapus karena style-nya sudah tidak terpakai */
</style>