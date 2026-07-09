<script>
  import { onMount } from "svelte";
  import Swal from "sweetalert2";
  import {
    createUserWithEmailAndPassword,
    updateProfile,
    signOut,
  } from "firebase/auth";
  import { auth } from "../../../lib/firebase.js";
  import api from "$lib/api/axios";
  let message = "";

  let email = "";
  let role = "buyer";
  let password = "";
  let confirmPassword = "";

  let isLoading = false;
  let isSuccess = false;
  let errors = {};

  let responseMessage = "";

  let newUserData = {
    emailInput: "",
    passwordInput: "",
  };
  let data;

  const handleSubmit = async () => {
    errors = {};
    // ... (validasi regex email & password kamu tetap sama) ...

    if (Object.keys(errors).length === 0) {
      isLoading = true;
      let createdUser = null; // 1. Simpan referensi user yang berhasil dibuat di sini

      try {
        await new Promise((resolve, reject) => {
          setTimeout(async () => {
            try {
              // LANGKAH A: Buat user di Firebase Auth
              const defaultName = email.split("@")[0];
              const userCredential = await createUserWithEmailAndPassword(
                auth,
                email,
                password,
              );
              createdUser = userCredential.user; // Ambil referensinya untuk jaga-jaga kalau harus dihapus

              // LANGKAH B: Update Profile
              await updateProfile(createdUser, { displayName: defaultName });

              // LANGKAH C: Kirim ke Backend API / Tambah ke Firestore
              // Jika di dalam api.post ini terjadi error (misal server down, salah input, dll),
              // alur akan langsung loncat ke blok CATCH di bawah.
              await api.post("/users", {
                emailInput: email,
                passwordInput: password,
                roleSelected: role,
              });

              // Jika semua sukses sampai sini:
              resolve({ message: "Registrasi sukses!" });
            } catch (innerError) {
              // Tangkap error yang terjadi di dalam simulasi/proses async
              reject(innerError);
            }
          }, 2000);
        });
        await signOut(auth);
        isSuccess = true;
        Swal.fire({
          icon: "success",
          title: "Registrasi Berhasil!",
          text: "Mengarahkan ke halaman login...",
          toast: true, // 1. Mengubah gaya menjadi mini popup (toast)
          position: "top-end", // 2. Posisi di pojok kanan atas (bisa diganti 'top' atau 'bottom-end')
          showConfirmButton: false, // 3. MATIKAN TOMBOL KONFIRMASI
          timer: 3000, // 4. Alert hanya muncul selama 2 detik
          timerProgressBar: true,
          didOpen: (toast) => {
            // Opsional: Memberikan efek interaktif kecil saat kursor diarahkan ke popup
            toast.addEventListener("mouseenter", Swal.stopTimer);
            toast.addEventListener("mouseleave", Swal.resumeTimer);
          },
        }).then(() => {
          // Otomatis pindah halaman begitu timer 2 detik di atas habis
          window.location.href = "/login";
        });
      } catch (error) {
        console.error("Error terdeteksi selama proses:", error);
        errors.server = error.message || error;

        // 🟢 MEKANISME ROLLBACK (Pembersihan Data Hantu)
        if (createdUser) {
          console.warn(
            "Terjadi error setelah akun Auth dibuat. Menghapus kembali akun dari Firebase Auth...",
          );
          try {
            // Hapus user dari Firebase Auth karena data pasangannya gagal tersimpan di database
            await createdUser.delete();
            console.log("Rollback sukses. Akun Auth berhasil dibersihkan.");
          } catch (deleteError) {
            console.error(
              "Gagal melakukan rollback otomatis akun Auth:",
              deleteError,
            );
          }
        }
      } finally {
        isLoading = false;
      }
    }
  };
</script>

<svelte:head>
  <title>Register</title>
  <!-- <meta name="description" content="About this app" /> -->
</svelte:head>

<div class="container">
  <form novalidate on:submit|preventDefault={handleSubmit}>
    {#if isSuccess}
      <div class="success">✅ Registration Successful!</div>
    {:else}
      <h1>Register</h1>

      <label for="email">Email</label>
      <input
        type="email"
        id="email"
        bind:value={email}
        class={errors.email ? "is-invalid" : ""}
        placeholder="name@example.com"
        autocomplete="email"
      />

      <label for="role">Mendaftar sebagai</label>
      <div class="role-group">
        <label class="role-option">
          <input type="radio" name="role" value="buyer" bind:group={role} />
          Pembeli
        </label>

        <label class="role-option">
          <input type="radio" name="role" value="seller" bind:group={role} />
          Penjual
        </label>
      </div>

      <label for="password">Password</label>
      <input
        type="password"
        id="password"
        bind:value={password}
        autocomplete="new-password"
      />

      <label for="confirmPassword">Konfirmasi Password</label>
      <input
        type="password"
        id="confirmPassword"
        bind:value={confirmPassword}
        autocomplete="new-password"
      />

      <button type="submit">
        {#if isLoading}Proses Register...{:else}Register 📝{/if}
      </button>

      {#if Object.keys(errors).length > 0}
        <ul class="errors">
          {#each Object.keys(errors) as field}
            <li>{field}: {errors[field]}</li>
          {/each}
        </ul>
      {/if}
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

  button:hover {
    transform: translateY(-2.5px);
    box-shadow: 0px 1px 10px 0px rgba(0, 0, 0, 0.1);
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

  .success {
    font-size: 24px;
    text-align: center;
    color: green;
  }

  .role-group {
    display: flex;
    justify-content: space-between;
    width: 100%;
    margin: 15px 0;
  }

  .role-option {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 500;
  }
</style>
