<script>
  import { auth } from "../../firebase/firebase.js";
  import { signInWithEmailAndPassword, signOut } from "firebase/auth";

  let email = "";
  let password = "";

  let isLoading = false;
  let isSuccess = false;
  let errors = {};

  const handleSubmit = async () => {
    errors = {};

    if (email.length === 0) {
      errors.email = "Field should not be empty";
    }
    if (password.length === 0) {
      errors.password = "Field should not be empty";
    }

    if (Object.keys(errors).length === 0) {
      isLoading = true;

      signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          // Signed in
          const user = userCredential.user;
          console.log("Kamu Berhasil Login!",user);
          isSuccess=true;
          // ...
        })
        .catch((error) => {
          const errorCode = error.code;
          const errorMessage = error.message;
          console.log("Gagal Login!, Silahkan Coba Ulang", errorCode, errorMessage);
        });
    }
  };
</script>

<svelte:head>
  <title>Login</title>
  <!-- <meta name="description" content="About this app" /> -->
</svelte:head>

<div class="container">
  <form on:submit|preventDefault={handleSubmit}>
    {#if isSuccess}
      <div class="success">
        🔓<br />
        You've been successfully logged in.
      </div>
    {:else}
      <h1>Login</h1>
      <h1>👤</h1>

      <label for="email">Email</label>
      <input
        name="email"
        id="email"
        placeholder="name@example.com"
        bind:value={email}
      />

      <label for="password">Password</label>
      <input
        name="password"
        id="password"
        type="password"
        bind:value={password}
      />

      <button type="submit">
        {#if isLoading}Logging in...{:else}Log in 🔒{/if}
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

<!-- body {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      background-color: #f7f8fa;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
    } -->
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
</style>
