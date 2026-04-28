<script lang="ts">
  const faqs = [
    { question: "Apa itu SvelteKit?", answer: "Framework berbasis Svelte..." },
    { question: "Bagaimana cara deploy SvelteKit?", answer: "Gunakan Vercel, Netlify, atau SSR." },
    { question: "Bisakah bersifat static?", answer: "Ya, aktifkan `prerender = true`." },
    // tambahkan pertanyaan–jawaban lain di sini
  ];

  let search = "";
  $: filtered = faqs.filter(faq =>
    faq.question.toLowerCase().includes(search.toLowerCase())
  );
</script>

<svelte:head>
  <title>FAQ • Situs Saya</title>
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
  .search-input {
    font-size: 1rem;
  }
  .faq-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  details summary {
    cursor: pointer;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  summary::before {
    /* content: "+ "; */
    font-weight: bold;
    margin-right: 0.5rem;
  }
  details[open] summary::before {
    /* content: "− "; */
    margin-right: 0.5rem;
  }
  .question {
    font-weight: bold;
  }
</style>