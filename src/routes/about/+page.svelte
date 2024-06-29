<script>
	import { onMount } from "svelte";
	import axios from "axios";
	let message = "";
	onMount(async () => {
		try {
			const response = await axios.get(
				"http://localhost:3000/api/getUsers",
			);
			console.log(response.data.data[0].data);
			message = response.data;
		} catch (error) {
			console.error("Error fetching data:", error);
		}
	});
</script>

<svelte:head>
	<title>About</title>
	<meta name="description" content="About this app" />
</svelte:head>

<div class="text-column">
	<h1>About this app</h1>
	aaaaaaaaaa

	{message}
	<!-- <p>
		This is a <a href="https://kit.svelte.dev">SvelteKit</a> app. You can make your own by typing the
		following into your command line and following the prompts:
	</p>

	<pre>npm create svelte@latest</pre>

	<p>
		The page you're looking at is purely static HTML, with no client-side interactivity needed.
		Because of that, we don't need to load any JavaScript. Try viewing the page's source, or opening
		the devtools network panel and reloading.
	</p>

	<p>
		The <a href="/sverdle">Sverdle</a> page illustrates SvelteKit's data loading and form handling. Try
		using it with JavaScript disabled!
	</p> -->
</div>
