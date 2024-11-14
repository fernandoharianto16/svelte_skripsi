<!-- <script>
	import Counter from './Counter.svelte';
	import welcome from '$lib/images/svelte-welcome.webp';
	import welcome_fallback from '$lib/images/svelte-welcome.png';

	import { onMount } from 'svelte';
 	import axios from 'axios';
	let message = '';
	onMount(async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/hello');
      message = response.data.message;
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  });
</script>
  
  <h1>{message}</h1>
  

<svelte:head>
	<title>Home</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head>

<section>
	<h1>
		<span class="welcome">
			<picture>
				<source srcset={welcome} type="image/webp" />
				<img src={welcome_fallback} alt="Welcome" />
			</picture>
		</span>

		to your new<br />SvelteKit app
	</h1>

	<h2>
		try editing <strong>src/routes/+page.svelte</strong>
	</h2>
	HALO FUSHIA
	<br>
	<strong>
		ini Setelah Login

	</strong>

	<Counter />
</section>

<style>
	section {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		flex: 0.6;
	}

	h1 {
		width: 100%;
	}

	.welcome {
		display: block;
		position: relative;
		width: 100%;
		height: 0;
		padding: 0 0 calc(100% * 495 / 2048) 0;
	}

	.welcome img {
		position: absolute;
		width: 100%;
		height: 100%;
		top: 0;
		display: block;
	}
</style> -->
<script>
	let searchQuery = '';
  </script>
  
  <style>
	/* body {
		font-family: Arial, sans-serif;
		display: flex;
		flex-direction: column;
		align-items: center;
		margin: 0;
		padding: 0;
	} */
	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 10px;
		border-bottom: 1px solid #000;
	}
	.header div, .header input {
		margin: 0 10px;
	}
	.header input {
		flex-grow: 1;
		padding: 5px;
	}
	.icon {
		width: 40px;
		height: 40px;
		border: 1px solid #000;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.categories, .products {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		margin: 20px 0;
	}
	.categories div, .products div {
		width: 150px;
		height: 50px;
		border: 1px solid #000;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 10px;
	}
	.products div {
		height: 100px;
	}
  </style>
  
  <!-- Bagian Header -->
  <div class="header">
	<div>Logo</div>
	<input
		type="text"
		bind:value={searchQuery}
		placeholder="Kolom pencarian"
	/>
	<div class="icon">Icon cart</div>
	<div class="icon">Icon notifikasi</div>
	<div class="icon">Icon bot CS</div>
	<div class="icon">Icon profile</div>
  </div>
  
  <!-- Bagian Kategori -->
  <div class="categories">
	{#each ['Kategori 1', 'Kategori 2', 'Kategori 3', 'Kategori 4', 'Kategori 5'] as category}
		<div>{category}</div>
	{/each}
  </div>
  
  <!-- Bagian Produk -->
  <div class="products">
	<!-- {#each Array(10).fill().map((_, i) => `Gambar produk ${i + 1}`) as product}
		<div>{product}</div>
	{/each} -->
	{#each Array.from({ length: 10 }, (_, i) => `Gambar produk ${i + 1}`) as product}
        <div>{product}</div>
    {/each}
  </div>
  