<script>
  import { tick } from 'svelte';

  // =========================================================================
  // BARIS TAMBAHAN BARU (1): PROPS SAKELAR UNTUK MENYEMBUNYIKAN WIDGET
  // =========================================================================
  export let hideChatbot = false;

  let isOpen = false;
  let inputMessage = '';
  let messages = [
    { text: 'Halo! Ada yang bisa saya bantu terkait panduan operasional platform?', sender: 'bot' }
  ];
  let isLoading = false;
  let chatBodyEl;

  function toggleChatbox() {
    isOpen = !isOpen;
    if (isOpen) autoScroll();
  }

  async function autoScroll() {
    await tick();
    if (chatBodyEl) chatBodyEl.scrollTop = chatBodyEl.scrollHeight;
  }

  async function kirimPesan() {
    if (!inputMessage.trim() || isLoading) return;
    const userText = inputMessage.trim();
    messages = [...messages, { text: userText, sender: 'user' }];
    inputMessage = '';
    autoScroll();
    isLoading = true;

    try {
      const response = await fetch('http://localhost:3000/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, sessionId: 'session-svelte-client' })
      });
      const data = await response.json();
      messages = [...messages, { text: data.reply, sender: 'bot' }];
    } catch (error) {
      console.error(error);
      messages = [...messages, { text: 'Gagal terhubung ke server bantuan.', sender: 'bot' }];
    } finally {
      isLoading = false;
      autoScroll();
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter') kirimPesan();
  }
</script>

{#if !hideChatbot}

  <button class="chatbot-launcher" on:click={toggleChatbox}>
  <div class="ai-head">
      <div class="ai-mouth"></div>
    </div>
    <!-- 💬 Bantuan -->
  </button>

  {#if isOpen}
    <div class="chatbot-container">
      <div class="chat-header">
        <h4>Asisten Panduan</h4>
        <button on:click={toggleChatbox} class="close-btn">&times;</button>
      </div>
      
      <div class="chat-body" bind:this={chatBodyEl}>
        {#each messages as msg}
          <div class="message {msg.sender}">{msg.text}</div>
        {/each}

        {#if isLoading}
          <div class="message bot loading"><span>Mengetik...</span></div>
        {/if}
      </div>
      
      <div class="chat-footer">
        <input type="text" bind:value={inputMessage} on:keydown={handleKeyDown} placeholder="Ketik pertanyaan Anda..." />
        <button on:click={kirimPesan}>Kirim</button>
      </div>
    </div>
  {/if}

{/if}

<style>
  /* =========================================================================
     TOMBOL LAUNCHER (IKON KEPALA ZOOM AI COMPANION)
     ========================================================================= */
  .chatbot-launcher { 
    position: fixed; 
    bottom: 20px; 
    right: 20px; 
    width: 65px;
    height: 65px;
    background-color: #2D8CFF; /* Warna Biru khas Zoom */
    border: none; 
    border-radius: 50%; 
    cursor: pointer; 
    box-shadow: 0 4px 10px rgba(0,0,0,0.15); 
    z-index: 9999; 
    display: flex;
    justify-content: center;
    align-items: center;
    transition: transform 0.2s ease, background-color 0.2s ease;
  }

  /* Efek membesar sedikit & warna menggelap saat hover */
  .chatbot-launcher:hover {
    transform: scale(1.05);
    background-color: #1a73e8;
  }

  /* Bentuk Kepala Putih (Sudut kanan bawah dibuat agak tajam seperti ikon aslinya) */
  .ai-head {
    width: 34px;
    height: 34px;
    background-color: white;
    border-top-left-radius: 50%;
    border-top-right-radius: 50%;
    border-bottom-left-radius: 50%;
    border-bottom-right-radius: 15%; 
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  /* Bentuk Mulut (Kondisi Awal: Senyum Lengkung) */
  .ai-mouth {
    width: 14px;
    height: 7px;
    border: 3px solid #2D8CFF;
    border-top: none;
    border-bottom-left-radius: 10px;
    border-bottom-right-radius: 10px;
    position: absolute;
    bottom: 8px;
    transition: all 0.2s ease-in-out;
  }

  /* Kondisi Saat Hover: Mulut Terbuka Lebar Menganga */
  .chatbot-launcher:hover .ai-mouth {
    height: 12px;
    border: 3px solid #2D8CFF;
    background-color: #2D8CFF; /* Mengisi bagian dalam mulut */
    border-radius: 50%;
    bottom: 6px;
  }

  /* =========================================================================
     CHAT KONTEN & WIDGET CONTAINER (TETAP SAMA)
     ========================================================================= */
  .chatbot-container { position: fixed; bottom: 80px; right: 20px; width: 350px; height: 450px; background-color: white; border-radius: 12px; box-shadow: 0 5px 20px rgba(0,0,0,0.2); display: flex; flex-direction: column; overflow: hidden; font-family: Arial, sans-serif; z-index: 9999; }
  .chat-header { background-color: #007bff; color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center; }
  .chat-header h4 { margin: 0; }
  .close-btn { background: none; border: none; color: white; font-size: 20px; cursor: pointer; }
  .chat-body { flex: 1; padding: 15px; overflow-y: auto; background-color: #f8f9fa; display: flex; flex-direction: column; gap: 10px; scroll-behavior: smooth; }
  .message { padding: 10px 14px; border-radius: 8px; max-width: 80%; font-size: 14px; line-height: 1.4; word-wrap: break-word; }
  .message.bot { background-color: #e9ecef; color: #333; align-self: flex-start; }
  .message.user { background-color: #007bff; color: white; align-self: flex-end; }
  .message.loading { font-style: italic; color: #888; }
  .chat-footer { display: flex; padding: 10px; border-top: 1px solid #dee2e6; background: white; }
  .chat-footer input { flex: 1; padding: 8px 12px; border: 1px solid #ced4da; border-radius: 4px; outline: none; }
  .chat-footer button { background-color: #007bff; color: white; border: none; padding: 0 15px; margin-left: 5px; border-radius: 4px; cursor: pointer; }
</style>