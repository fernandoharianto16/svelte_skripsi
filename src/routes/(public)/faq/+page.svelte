<script lang="ts">
  const faqs = [
    {
      question: "Bagaimana cara melakukan pembayaran?",
      answer:
        "Kami menggunakan Midtrans sebagai payment gateway yang mendukung QRIS, transfer bank, dan e-wallet untuk transaksi yang aman dan cepat.",
    },
    {
      question: "Apakah data transaksi saya aman?",
      answer:
        "Keamanan adalah prioritas kami. Sistem menggunakan koneksi terenkripsi dan proses pembayaran dikelola melalui standar industri Midtrans.",
    },
    {
      question: "Mengapa proses upload foto produk memerlukan waktu?",
      answer:
        "Foto disimpan secara profesional melalui Cloudinary untuk memastikan kualitas gambar tetap optimal dan loading website tetap cepat.",
    },
    {
      question: "Bagaimana sistem menjaga keamanan akun saya?",
      answer:
        "Aplikasi kami mengintegrasikan Firebase Authentication, sebuah sistem keamanan tingkat lanjut dari Google untuk melindungi data akun Anda.",
    },
    {
      question: "Apakah saya bisa mengubah detail produk setelah diunggah?",
      answer:
        "Ya, Anda dapat masuk ke menu 'Produk Saya' di profil penjual untuk memperbarui informasi produk atau mengganti foto kapan saja.",
    },
  ];

  let search = "";
  $: filtered = faqs.filter((faq) =>
    faq.question.toLowerCase().includes(search.toLowerCase()),
  );
</script>

<svelte:head>
  <title>FAQ</title>
  <meta name="description" content="Cari pertanyaan umum seputar aplikasi" />
</svelte:head>

<section class="container mx-auto py-10 px-4">
  <h1 class="text-2xl font-bold mb-4">Frequently Asked Questions</h1>

  <input
    type="text"
    placeholder="Cari pertanyaan..."
    bind:value={search}
    class="search-input mb-6 p-2 border rounded w-full"
  />

  {#if filtered.length > 0}
    <ul class="faq-list divide-y">
      {#each filtered as faq}
        <li class="py-4">
          <details>
            <summary><span class="question">{faq.question}</span></summary>
            <div class="mt-2 pl-4 text-gray-700">{faq.answer}</div>
          </details>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="text-gray-500">Tidak ada pertanyaan yang sesuai.</p>
  {/if}
</section>

<style>
  /* 1. Reset & Search Input */
  .search-input {
    font-size: 1rem;
    padding: 12px 16px;
    margin-bottom: 2rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    width: 100%;
    box-sizing: border-box;
    outline: none;
    transition: border-color 0.3s;
  }
  
  .search-input:focus {
    border-color: #000;
  }

  /* 2. FAQ List */
  .faq-list {
    list-style: none;
    padding: 0;
    margin: 0;
    width: 100%;
  }

  /* 3. Perbaikan Elemen Details */
  details {
    padding: 16px;
    border-radius: 8px;
    background-color: #fff;
    border: 1px solid #eee;
    margin-bottom: 10px;
    width: 100%;
    box-sizing: border-box; /* PENTING */
    transition: all 0.3s ease;
    display: block; /* Memastikan elemen bersifat block */
  }

  details:hover {
    background-color: #fcfcfc;
    border-color: #ccc;
  }

  /* 4. Perbaikan Summary */
  details summary {
    cursor: pointer;
    font-weight: 600;
    display: flex;
    justify-content: space-between;
    align-items: center;
    list-style: none;
    outline: none;
    word-break: break-all; /* Mencegah pertanyaan memanjang keluar box */
  }

  summary::-webkit-details-marker {
    display: none;
  }

  /* 5. Menambahkan ikon panah kustom */
  summary::after {
    content: '▼';
    font-size: 0.8rem;
    transition: transform 0.3s;
    color: #888;
    margin-left: 10px; /* Jarak ikon dengan teks */
    flex-shrink: 0;    /* Ikon tidak ikut mengecil */
  }

  details[open] summary::after {
    transform: rotate(180deg);
  }

  .question {
    font-weight: 700;
    color: #333;
    display: block;
    margin-right: 10px;
  }

  /* 6. Styling untuk Jawaban agar menurun ke bawah */
  details div {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #eee;
    line-height: 1.6;
    color: #4a4a4a;
    width: 100%;               /* Memastikan jawaban lebar penuh */
    box-sizing: border-box;    /* Menjaga padding tidak melebihi lebar */
    word-wrap: break-word;     /* Mencegah teks melampaui lebar box */
    overflow-wrap: break-word; /* Standar modern untuk pembungkusan teks */
    white-space: normal;       /* Memastikan teks menurun ke bawah */
  }
</style>