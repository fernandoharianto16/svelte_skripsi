<!-- <script>
	// import { onMount } from "svelte";
	// import axios from "axios";
	// let message = "";
	// onMount(async () => {
	// 	try {
	// 		const response = await axios.get(
	// 			"http://localhost:3000/api/getUsers",
	// 		);
	// 		console.log(response.data.data[0].data);
	// 		message = response.data;
	// 	} catch (error) {
	// 		console.error("Error fetching data:", error);
	// 	}
	// });
</script> -->

<!-- <svelte:head>
	<title>About</title>
	<meta name="description" content="About this app" />
</svelte:head> -->

<!-- <div class="text-column">
	<h1>About this app</h1>
	aaaaaaaaaa
</div> -->
<script>
  let showChat = false;

  function toggleChat() {
    showChat = !showChat;
  }
</script>

<svelte:head>
  <title>Tentang Kami | Custom Handmade</title>
  <meta name="description" content="Pelajari lebih lanjut tentang layanan custom handmade kami dan cara membuat permintaan khusus." />
</svelte:head>

<section class="about">
  <div class="container">
    <h1>Tentang Kami</h1>
    <p>
      Kami adalah pengrajin lokal yang berfokus pada pembuatan produk <strong>custom handmade</strong> seperti hadiah personal, dekorasi rumah, dan aksesoris unik.
    </p>
    <p>
      Setiap produk kami dibuat dengan penuh perhatian terhadap detail dan bisa disesuaikan sesuai permintaan Anda. Kami percaya bahwa setiap orang berhak mendapatkan sesuatu yang benar-benar personal dan bermakna.
    </p>

    <h2>Request Custom</h2>
    <p>
      Punya ide unik? Kami bisa bantu wujudkan! Kirimkan deskripsi produk yang Anda inginkan — mulai dari ukuran, warna, hingga pesan khusus yang ingin ditambahkan.
    </p>
    <ul>
      <li>🎁 Hadiah ulang tahun personal</li>
      <li>🏡 Dekorasi rumah custom</li>
      <li>💍 Aksesoris buatan tangan</li>
    </ul>

    <h2>Butuh Bantuan?</h2>
    <p>
      Klik tombol di bawah ini untuk berbicara dengan asisten virtual kami. Kami siap membantu pertanyaan Anda seputar pemesanan custom!
    </p>
    <button on:click={toggleChat}>
      {showChat ? 'Tutup Chat' : 'Buka Chatbot'}
    </button>

    {#if showChat}
      <div class="chatbot">
        <h3>💬 Chatbot Bantuan</h3>
        <p><em>Halo! Ada yang bisa kami bantu?</em></p>
        <ul>
          <li>📌 Bagaimana cara request custom?</li>
          <li>⏱️ Berapa lama proses pengerjaan?</li>
          <li>💳 Metode pembayaran yang tersedia?</li>
        </ul>
        <p><small>*Ini hanya simulasi chatbot statis.</small></p>
      </div>
    {/if}
  </div>
</section>

<style>
  .about {
    padding: 2rem;
    background: #f4f4f4;
    min-height: 100vh;
  }

  .container {
    max-width: 800px;
    margin: 0 auto;
    background: white;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
  }

  h1, h2 {
    color: #333;
    margin-bottom: 1rem;
  }

  p {
    line-height: 1.6;
    color: #555;
  }

  ul {
    margin-left: 1.5rem;
    margin-bottom: 1rem;
  }

  button {
    padding: 0.6rem 1.2rem;
    background-color: #333;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  button:hover {
    background-color: #555;
  }

  .chatbot {
    margin-top: 1rem;
    padding: 1rem;
    background-color: #eef;
    border-left: 4px solid #66f;
    border-radius: 4px;
  }
</style>
