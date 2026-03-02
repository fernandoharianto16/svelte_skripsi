<script>
  import { onMount } from 'svelte';

  let name = '';
  let price = '';
  let description = '';
  let message = '';
  let loading = false;

  // upload file
  let image = null;
  let previewUrl = '';

  let theme = 'light';

  onMount(() => {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      theme = 'dark';
    }
  });

  function toggleTheme() {
    theme = theme === 'light' ? 'dark' : 'light';
  }

  function handleFileChange(event) {
    const file = event.target.files[0];
    if (file) {
      image = file;
      previewUrl = URL.createObjectURL(file);
    }
  }

  async function submitForm() {
    loading = true;
    message = '';

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('price', price);
      formData.append('description', description);
      if (image) formData.append('image', image);

      const res = await fetch('http://localhost:4000/api/products', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        message = `✅ ${data.message}`;
        name = '';
        price = '';
        description = '';
        image = null;
        previewUrl = '';
      } else {
        message = `❌ Error: ${data.message || 'Gagal menambahkan produk'}`;
      }
    } catch (err) {
      message = '❌ Gagal terhubung ke server';
      console.error(err);
    } finally {
      loading = false;
    }
  }
</script>

<div class="container" class:dark={theme === 'dark'}>
  <div class="card">
    <!-- Toggle Dark/Light -->
    <button class="toggle-btn" on:click={toggleTheme}>
      {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
    </button>

    <h1>➕ Tambah Produk</h1>

    <form on:submit|preventDefault={submitForm}>
      <div class="form-group">
        <label for="name">Nama Produk</label>
        <input id="name" bind:value={name} type="text" required placeholder="Contoh: Laptop Asus ROG" />
      </div>

      <div class="form-group">
        <label for="price">Harga</label>
        <input id="price" bind:value={price} type="number" min="0" required placeholder="Contoh: 7500000" />
      </div>

      <div class="form-group">
        <label for="description">Deskripsi</label>
        <textarea id="description" bind:value={description} rows="4" placeholder="Tuliskan detail produk"></textarea>
      </div>

      <!-- Gambar Produk -->
      <div class="form-group">
        <label for="image">Gambar Produk</label>
        <input id="image" type="file" accept="image/*" on:change={handleFileChange} />
        {#if previewUrl}
          <div class="preview">
            <p>📷 Preview:</p>
            <img src={previewUrl} alt="Preview Gambar Produk" />
          </div>
        {/if}
      </div>

      <button type="submit" disabled={loading}>
        {#if loading}
          ⏳ Menyimpan...
        {:else}
          💾 Simpan Produk
        {/if}
      </button>
    </form>

    {#if message}
      <p class:success={message.startsWith('✅')} class:error={message.startsWith('❌')}>
        {message}
      </p>
    {/if}
  </div>
</div>

<style>
  .container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    background: #f3f4f6;
  }

  .card {
    width: 100%;
    max-width: 500px;
    background: white;
    padding: 2rem;
    border-radius: 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    border: 1px solid #e5e7eb;
  }

  h1 {
    font-size: 1.8rem;
    font-weight: bold;
    color: #1f2937;
    margin-bottom: 1.5rem;
    text-align: center;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
  }

  label {
    font-size: 0.9rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
    color: #374151;
  }

  input,
  textarea {
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 1rem;
    color: #111827;
    background: white;
  }

  input[type="file"] {
    padding: 0.4rem;
  }

  .preview {
    margin-top: 0.5rem;
  }

  .preview img {
    margin-top: 0.5rem;
    max-width: 100%;
    border-radius: 8px;
    border: 1px solid #d1d5db;
  }

  button {
    width: 100%;
    background: #2563eb;
    color: white;
    font-weight: 500;
    padding: 0.9rem;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s;
  }

  button:hover:not(:disabled) {
    background: #1e40af;
  }

  button:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }

  .toggle-btn {
    margin-bottom: 1rem;
    padding: 0.5rem 1rem;
    background: #6b7280;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    width: fit-content;
  }

  p {
    margin-top: 1rem;
    text-align: center;
    font-weight: 500;
  }

  .success {
    color: #16a34a;
  }

  .error {
    color: #dc2626;
  }

  /* Dark Mode */
  .dark {
    background: #111827;
  }

  .dark .card {
    background: #1f2937;
    border-color: #374151;
    color: #f9fafb;
  }

  .dark h1 {
    color: #f9fafb;
  }

  .dark label {
    color: #d1d5db;
  }

  .dark input,
  .dark textarea {
    background: #111827;
    color: #f9fafb;
    border: 1px solid #374151;
  }

  .dark input[type="file"] {
    background: #111827;
  }

  .dark .toggle-btn {
    background: #4b5563;
  }

  .dark button {
    background: #3b82f6;
  }

  .dark button:hover:not(:disabled) {
    background: #2563eb;
  }

  .dark .preview img {
    border: 1px solid #374151;
  }
</style>
