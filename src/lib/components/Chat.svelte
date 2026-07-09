<script>
    import { onMount } from "svelte";
    import { db, auth } from "$lib/firebase";
    import {
        collection,
        query,
        orderBy,
        where,
        onSnapshot,
        addDoc,
        serverTimestamp,
        doc,        // 👈 BARU: Ditambahkan agar auto-repair tidak error
        updateDoc,   // 👈 BARU: Ditambahkan agar auto-repair tidak error
    } from "firebase/firestore";
    import { onAuthStateChanged, updateProfile } from "firebase/auth";

    export let orderId; // Menerima orderId dari modal luar

    let user = null; // State global yang dibaca oleh HTML
    let messages = [];
    let newMessage = "";

    onMount(() => {
        // 1. Memantau Status Login User (Dipindahkan ke dalam onMount agar aman)
        const unsubscribeAuth = onAuthStateChanged(auth, async (userData) => {
            if (userData) {
                user = userData; // 👈 SEKARANG BENAR: Memperbarui state global, bukan variabel lokal

                // 🔥 LOGIKA AUTO-REPAIR PENGGUNA LAMA YANG NULL
                if (!user.displayName && user.email) {
                    try {
                        const autoName = user.email.split("@")[0];

                        // Perbaiki di Firebase Auth
                        await updateProfile(user, { displayName: autoName });

                        // Perbaiki di Firestore (Tabel Users) agar sinkron
                        const userDocRef = doc(db, "users", user.uid);
                        await updateDoc(userDocRef, { name: autoName }).catch((err) => {
                            console.log("Dokumen user di Firestore belum ada, abaikan saja:", err.message);
                        });

                        console.log(`Profil diperbaiki! Nama otomatis: ${autoName}`);
                    } catch (error) {
                        console.error("Gagal auto-update profil:", error);
                    }
                }
            } else {
                user = null;
            }
        });

        // 2. Memfilter pesan berdasarkan orderId spesifik
        const q = query(
            collection(db, "messages"),
            where("order_id", "==", orderId),
            orderBy("created_at", "asc"),
        );

        const unsubscribeChat = onSnapshot(q, (snapshot) => {
            messages = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
        });

        // Hancurkan listener saat modal ditutup agar tidak memakan memori
        return () => {
            unsubscribeAuth();
            unsubscribeChat();
        };
    });

    async function sendMessage() {
        if (newMessage.trim() === "" || !user) return;
        try {
            await addDoc(collection(db, "messages"), {
                message: newMessage, 
                order_id: orderId, 
                user_id: user.uid, 
                username: user.displayName || "User", 
                created_at: serverTimestamp(),
            });
            newMessage = "";
        } catch (error) {
            console.error("Gagal mengirim pesan:", error);
        }
    }
</script>

<div class="chat-box">
    <div class="chat-messages">
        {#each messages as msg}
            <div class="message-wrapper {user && msg.user_id === user.uid ? 'sent' : 'received'}">
                <div class="message-box">
                    <!-- <span class="sender-label">{msg.username || "User"}</span> -->
                    <p class="message-text">{msg.message}</p>
                </div>
            </div>
        {/each}
    </div>
    
    <form on:submit|preventDefault={sendMessage} class="chat-form">
        <input
            type="text"
            bind:value={newMessage}
            placeholder="Tulis pesan..."
        />
        <button type="submit">Kirim</button>
    </form>
</div>

<style>
    /* Container Utama Box Chat */
    .chat-box {
        border-top: 1px solid #e2e8f0;
        padding-top: 15px;
        margin-top: 15px;
        display: flex;
        flex-direction: column;
        height: 400px;
    }

    /* Area pembungkus riwayat chat (Scrollable) */
    .chat-messages {
        flex: 1;
        overflow-y: auto;
        background: #f8fafc;
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 12px;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    /* Baris dasar pesan (menggunakan Flexbox penuh) */
    .message-wrapper {
        display: flex;
        width: 100%;
    }

    /* Logika geser kanan untuk milik kita */
    .message-wrapper.sent {
        justify-content: flex-end;
    }

    /* Logika geser kiri untuk kiriman orang lain */
    .message-wrapper.received {
        justify-content: flex-start;
    }

    /* Bentuk balon chat gelembung */
    .message-box {
        padding: 10px 14px;
        border-radius: 12px;
        max-width: 75%;
        width: fit-content;
        font-size: 0.9rem;
        line-height: 1.4;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        display: flex;
        flex-direction: column;
    }

    /* Warna balon chat KANAN (Milik Kita) */
    .sent .message-box {
        background: #d9fdd3; /* Hijau soft ala WA */
        color: #1c1c1c;
        border-top-right-radius: 2px;
    }

    /* Warna balon chat KIRI (Milik Orang Lain) */
    .received .message-box {
        background: #ffffff; /* Putih bersih */
        color: #1c1c1c;
        border-top-left-radius: 2px;
    }

    /* Nama user di atas balon */
    .sender-label {
        font-size: 0.75rem;
        font-weight: bold;
        margin-bottom: 2px;
    }
    
    .sent .sender-label {
        color: #155724;
        text-align: right;
    }
    
    .received .sender-label {
        color: #475569;
    }

    /* Teks isi pesan */
    .message-text {
        margin: 0;
        word-break: break-word;
    }

    /* Form Input & Tombol Kirim */
    .chat-form {
        display: flex;
        gap: 8px;
    }

    .chat-form input {
        flex: 1;
        padding: 10px 14px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        outline: none;
        font-size: 0.9rem;
        transition: border-color 0.2s ease;
    }

    .chat-form input:focus {
        border-color: #0ea5e9;
    }

    .chat-form button {
        padding: 10px 18px;
        background: #0ea5e9;
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s ease;
    }

    .chat-form button:hover {
        background: #0284c7;
    }
</style>