<script>
    import { onMount } from "svelte";
    import { db, auth } from "$lib/firebase";
    import {
        collection,
        query,
        where,
        orderBy,
        onSnapshot,
        or,
        addDoc,
        doc,
        getDoc,
        updateDoc,
        serverTimestamp,
    } from "firebase/firestore";
    import { onAuthStateChanged } from "firebase/auth";
    import { afterUpdate } from "svelte";
    let messageContainerRef;
    function scrollToBottom() {
        if (messageContainerRef) {
            messageContainerRef.scrollTop = messageContainerRef.scrollHeight;
        }
    }
    afterUpdate(() => {
        scrollToBottom();
    });

    // Props yang diterima dari halaman produk ketika tombol "Chat Sekarang" diklik
    export let activeProductId = null;
    export let activeProductData = null; // { title, price, image_url }
    export let isOpen = false;

    let user = null;
    let chatList = [];
    let selectedChatId = null;
    let messages = [];
    let newMessage = "";

    let unsubscribeChatList = () => {};
    let unsubscribeMessages = () => {};

    onMount(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (userData) => {
            if (userData) {
                user = userData;
                listenToChatList();
            } else {
                user = null;
                chatList = [];
            }
        });

        return () => {
            unsubscribeAuth();
            unsubscribeChatList();
            unsubscribeMessages();
        };
    });

    function listenToChatList() {
        const q = query(
            collection(db, "chats"),
            or(
                where("buyer_id", "==", user.uid),
                where("seller_id", "==", user.uid),
            ),
            orderBy("updated_at", "desc"),
        );

        unsubscribeChatList = onSnapshot(q, (snapshot) => {
            chatList = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));

            // Cek apakah kita sedang membuka dari halaman produk dan butuh chat ke seller tertentu
            if (activeProductData?.seller_id) {
                const targetSellerId = activeProductData.seller_id;
                // Cek apakah sudah pernah chat dengan SELLER ini sebelumnya
                const existingChat = chatList.find(
                    (c) =>
                        c.seller_id === targetSellerId ||
                        c.buyer_id === targetSellerId,
                );

                if (existingChat) {
                    selectedChatId = existingChat.id; // Kalau ada, pakai room chat yang lama
                } else {
                    // Kalau BELUM PERNAH CHAT, buat room chat bayangan/sementara di UI sebelah kiri
                    const temporaryChatId = `temp_${user.uid}_${targetSellerId}`;
                    if (!chatList.some((c) => c.id === temporaryChatId)) {
                        chatList = [
                            {
                                id: temporaryChatId,
                                buyer_id: user.uid,
                                buyer_name: user.displayName || "Pembeli",
                                seller_id: targetSellerId,
                                seller_name:
                                    activeProductData?.seller_name ||
                                    "Toko Penjual",
                                last_message:
                                    "Mulai chat tentang produk ini...",
                            },
                            ...chatList,
                        ];
                    }
                    selectedChatId = temporaryChatId;
                }
            } else if (chatList.length > 0 && !selectedChatId) {
                selectedChatId = chatList[0].id; // Default pilih chat teratas (jika dari header)
            }
        });
    }

    // 2. Ambil isi pesan di bar sebelah kanan saat chat dipilih
    $: if (selectedChatId && user && !selectedChatId.startsWith("temp_")) {
        unsubscribeMessages();
        const q = query(
            collection(db, "messages"),
            where("chat_id", "==", selectedChatId), // Diubah dari order_id menjadi chat_id
            orderBy("created_at", "asc"),
        );
        unsubscribeMessages = onSnapshot(q, (snapshot) => {
            messages = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
        });
    } else if (selectedChatId?.startsWith("temp_")) {
        messages = []; // Jika room-nya masih bayangan/sementara, isi pesan jelas masih kosong
    }

    $: currentActiveChat =
        chatList.find((c) => c.id === selectedChatId) || null;

    // Menyimpan ID produk terakhir yang sudah berhasil dikirim di chat ini
    let lastAttachedProductId = "";

    // JIKA pembeli berpindah room chat atau menutup jendela,
    // pastikan kamu meriset variabel ini (bisa dipasang di logika klik sidebar)
    $: if (!selectedChatId) {
        lastAttachedProductId = "";
    }

    let recipientId="";
    // 3. Fungsi Kirim Pesan
    async function sendMessage() {
    if (newMessage.trim() === "" || !user || !selectedChatId) return;

    try {
        let actualChatId = selectedChatId;
        const isFirstMessage = selectedChatId.startsWith("temp_");
        let chatDataForNotif = null;
        // let 

        // 1. Jika ini room sementara (chat pertama kali ke penjual ini), daftarkan dulu ke koleksi "chats"
        if (isFirstMessage) {
            const targetSellerId = activeProductData?.seller_id;

            const newChatObj = {
                buyer_id: user.uid,
                buyer_name: user.displayName || "Pembeli",
                seller_id: targetSellerId,
                seller_name: activeProductData?.seller_name || "Toko Penjual",
                last_message: newMessage,
                updated_at: serverTimestamp(),
            };
            const newChatDoc = await addDoc(collection(db, "chats"), newChatObj);

            actualChatId = newChatDoc.id; // Ambil ID asli dari Firestore
            selectedChatId = actualChatId; // Alihkan ID aktif ke ID asli
            chatDataForNotif = newChatObj; // Gunakan data baru ini untuk notifikasi
        } else {
            // Jika bukan chat pertama, cukup update pesan terakhir di room chat yang sudah ada
            const chatRef = doc(db, "chats", actualChatId);
            await updateDoc(chatRef, {
                last_message: newMessage,
                updated_at: serverTimestamp(),
            });
            const chatSnap = await getDoc(chatRef);
            if (chatSnap.exists()) {
                chatDataForNotif = chatSnap.data();
            }
        }

        // Cek apakah produk ini sudah pernah dikirimkan sebelumnya di room ini
        const shouldAttachProduct =
            activeProductId && activeProductId !== lastAttachedProductId;

        // 2. Kirim detail pesannya ke koleksi "messages" berelasi dengan chat_id asli
        await addDoc(collection(db, "messages"), {
            message: newMessage,
            chat_id: actualChatId,
            user_id: user.uid,
            username: user.displayName || "User",
            created_at: serverTimestamp(),

            // MODIFIKASI: Lampiran dikirim jika produk aktif belum pernah terkirim di room ini
            ...(shouldAttachProduct
                ? {
                        product_data: {
                            product_id: activeProductId,
                            title: activeProductData?.title || "Produk",
                            price: activeProductData?.price || 0,
                            image_url: activeProductData?.image_url || "",
                            seller_id: activeProductData?.seller_id || "",
                        },
                    }
                : {}),
        });
        // console.log(chatDataForNotif);
        // console.log(user.uid);

        if (chatDataForNotif) {
            // JIKA KAMU ADALAH PEMBELI, MAKA PENERIMANYA ADALAH SELLER
            if (user.uid === chatDataForNotif.buyer_id) {
                recipientId = chatDataForNotif.seller_id;
            } 
            // JIKA KAMU ADALAH PENJUAL, MAKA PENERIMANYA ADALAH BUYER
            else if (user.uid === chatDataForNotif.seller_id) {
                recipientId = chatDataForNotif.buyer_id;
            }
        }
        // console.log(recipientId);

        // Jalankan insert notifikasi hanya jika ID penerimanya (lawan bicara) berhasil ditemukan
        if (recipientId) {
            await addDoc(collection(db, "notifications"), {
                user_id: recipientId, // Sekarang dinamis, otomatis terisi ID lawan bicara
                title: "Pesan Chat Baru",
                message: `${user.displayName || 'Seseorang'}: ${newMessage}`,
                is_read: false,
                created_at: new Date().toISOString()
            });
        } else {
            console.warn("Notifikasi tidak terkirim: Gagal menentukan ID penerima.");
        }
        // ─── SELESAI LOGIKA DINAMIS ───

        // Catat bahwa produk ini sudah berhasil dilampirkan, agar pesan berikutnya tidak melampirkannya lagi
        if (shouldAttachProduct) {
            lastAttachedProductId = activeProductId;
        }

        newMessage = "";
    } catch (err) {
        console.error("Gagal kirim:", err);
    }
}
</script>

{#if isOpen}
    <div class="floating-chat-window">
        <div class="chat-header">
            <span>Chat</span>
            <button class="btn-close" on:click={() => (isOpen = false)}
                >Tutup ✕</button
            >
        </div>

        <div class="chat-body">
            <div class="sidebar-list">
                {#each chatList as chat}
                    <button
                        class="list-item {selectedChatId === chat.id
                            ? 'active'
                            : ''}"
                        on:click={() => (selectedChatId = chat.id)}
                    >
                        <div class="avatar"></div>
                        <div class="item-info">
                            <!-- Jika yang login adalah pembeli, tampilkan nama penjual. Jika penjual, tampilkan nama pembeli -->
                            <span class="name">
                                {user && chat.buyer_id === user.uid
                                    ? chat.seller_name || "Toko Penjual"
                                    : chat.buyer_name || "Pembeli"}
                            </span>
                            <span class="preview">{chat.last_message}</span>
                        </div>
                    </button>
                {/each}
            </div>

            <div class="message-area">
                <div class="messages-container" bind:this={messageContainerRef}>
                    {#each messages as msg}
                        {#if msg.product_data}
                            <div class="product-card-message">
                                <img
                                    src={msg.product_data.image_url}
                                    alt="product"
                                />
                                <div class="prod-details">
                                    <h6>{msg.product_data.title}</h6>
                                    <p>
                                        Rp{msg.product_data.price.toLocaleString(
                                            "id-ID",
                                        )}
                                    </p>
                                    <!-- {#if currentActiveChat && currentActiveChat.buyer_id === user?.uid}
                                        <button class="btn-buy-now"
                                            >Beli Sekarang</button
                                        >
                                    {/if} -->
                                </div>
                            </div>
                        {/if}

                        <div
                            class="msg-wrapper {user && msg.user_id === user.uid
                                ? 'sent'
                                : 'received'}"
                        >
                            <div class="msg-box">
                                <p>{msg.message}</p>
                            </div>
                        </div>
                    {/each}
                </div>

                <form on:submit|preventDefault={sendMessage} class="input-area">
                    <input
                        type="text"
                        bind:value={newMessage}
                        placeholder="Tulis pesan..."
                    />
                    <button type="submit">Kirim</button>
                </form>
            </div>
        </div>
    </div>
{/if}

<style>
    .floating-chat-window {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 750px;
        height: 480px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        display: flex;
        flex-direction: column;
        z-index: 9999;
        font-family: sans-serif;
        overflow: hidden;
    }

    .chat-header {
        background: #f97316; /* Warna oranye Shopee-lookalike */
        color: white;
        padding: 12px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: bold;
    }

    .btn-close {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
    }

    .chat-body {
        display: flex;
        flex: 1;
        overflow: hidden;
    }

    .sidebar-list {
        width: 35%;
        border-right: 1px solid #e2e8f0;
        overflow-y: auto;
        background: #f8fafc;
    }

    .list-item {
        display: flex;
        gap: 10px;
        width: 100%;
        padding: 12px;
        border: none;
        background: none;
        border-bottom: 1px solid #f1f5f9;
        text-align: left;
        cursor: pointer;
    }

    .list-item.active {
        background: #ffedd5;
    }

    .avatar {
        width: 36px;
        height: 36px;
        background: #cbd5e1;
        border-radius: 50%;
        flex-shrink: 0;
    }
    .item-info {
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }
    .name {
        font-weight: bold;
        font-size: 0.85rem;
    }
    .preview {
        font-size: 0.75rem;
        color: #64748b;
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
    }

    .message-area {
        width: 65%;
        display: flex;
        flex-direction: column;
    }
    .messages-container {
        flex: 1;
        padding: 12px;
        overflow-y: auto;
        background: #f1f5f9;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    

    /* Gaya Balon Chat */
    .msg-wrapper {
        display: flex;
        width: 100%;
    }
    .msg-wrapper.sent {
        justify-content: flex-end;
    }
    .msg-wrapper.received {
        justify-content: flex-start;
    }
    .msg-box {
        padding: 8px 12px;
        border-radius: 8px;
        max-width: 75%;
        font-size: 0.85rem;
    }
    .sent .msg-box {
        background: #ffedd5;
        color: #ea580c;
    }
    .received .msg-box {
        background: white;
    }

    /* Gaya Kartu Produk di Dalam Chat */
    .product-card-message {
        display: flex;
        gap: 10px;
        background: white;
        padding: 10px;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
        margin: 8px auto;
        width: 90%;
    }
    .product-card-message img {
        width: 60px;
        height: 60px;
        object-fit: cover;
        border-radius: 4px;
    }
    .prod-details h6 {
        margin: 0;
        font-size: 0.85rem;
        color: #334155;
    }
    .prod-details p {
        margin: 4px 0;
        font-size: 0.8rem;
        color: #f97316;
        font-weight: bold;
    }
    /* .btn-buy-now {
        background: #f97316;
        color: white;
        border: none;
        padding: 4px 8px;
        font-size: 0.75rem;
        border-radius: 4px;
        cursor: pointer;
    } */

    .input-area {
        display: flex;
        padding: 10px;
        gap: 8px;
        border-top: 1px solid #e2e8f0;
    }
    .input-area input {
        flex: 1;
        padding: 8px;
        border: 1px solid #cbd5e1;
        border-radius: 4px;
        outline: none;
    }
    .input-area button {
        background: #f97316;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
    }
</style>
