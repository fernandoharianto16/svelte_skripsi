<script>
    import { onMount } from "svelte";
    import { db, auth } from "$lib/firebase";
    import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, writeBatch } from "firebase/firestore";
    import { onAuthStateChanged } from "firebase/auth";

    let notifications = [];
    let userId = "";

    onMount(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                userId = user.uid;
                
                // Kueri sederhana: Hanya ambil berdasarkan ID user dan urutkan dari yang terbaru
                const q = query(
                    collection(db, "notifications"),
                    where("user_id", "==", user.uid),
                    orderBy("created_at", "desc")
                );

                const unsubscribeNotif = onSnapshot(q, (snapshot) => {
                    let temp = [];
                    snapshot.forEach((doc) => {
                        temp.push({ id: doc.id, ...doc.data() });
                    });
                    notifications = temp;
                });

                return () => unsubscribeNotif();
            }
        });

        return () => unsubscribeAuth();
    });

    // Menandai satu notifikasi sebagai telah dibaca saat diklik
    async function markAsRead(notif) {
        if (!notif.is_read) {
            const docRef = doc(db, "notifications", notif.id);
            await updateDoc(docRef, { is_read: true });
        }
    }

    // Menandai semua notifikasi menjadi sudah dibaca sekaligus
    async function readAllNotifications() {
        const unreadNotifs = notifications.filter(n => !n.is_read);
        if (unreadNotifs.length === 0) return;

        const batch = writeBatch(db);
        unreadNotifs.forEach((notif) => {
            const docRef = doc(db, "notifications", notif.id);
            batch.update(docRef, { is_read: true });
        });
        await batch.commit();
    }
</script>

<div class="container">
    <div class="notif-header">
        <h2>Notifikasi Saya</h2>
        {#if notifications.some(n => !n.is_read)}
            <button on:click={readAllNotifications}>Tandai Semua Sudah Dibaca</button>
        {/if}
    </div>

    <div class="notif-list">
        {#if notifications.length === 0}
            <div class="empty-state">
                <p>Tidak ada notifikasi.</p>
            </div>
        {:else}
            {#each notifications as notif}
                <div class="notif-card" class:unread={!notif.is_read} on:click={() => markAsRead(notif)}>
                    <div class="notif-content">
                        <div class="notif-meta">
                            <h4>{notif.title}</h4>
                            <span class="time">
                                {notif.created_at?.toDate ? notif.created_at.toDate().toLocaleString('id-ID') : 'Baru saja'}
                            </span>
                        </div>
                        <p>{notif.message}</p>
                    </div>
                </div>
            {/each}
        {/if}
    </div>
</div>

<style>
    .container {
        max-width: 800px;
        margin: 30px auto;
        padding: 0 15px;
        font-family: sans-serif;
    }
    .notif-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }
    .notif-header h2 {
        font-size: 1.25rem;
        color: #333;
        margin: 0;
    }
    .notif-header button {
        background: none;
        border: none;
        color: #ee4d2d;
        cursor: pointer;
        font-size: 0.9rem;
    }
    .notif-list {
        background: white;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        overflow: hidden;
    }
    .notif-card {
        padding: 16px;
        border-bottom: 1px solid #f1f5f9;
        cursor: pointer;
        transition: background 0.2s;
    }
    .notif-card:hover {
        background-color: #f8fafc;
    }
    /* Memberikan background merah pudar khas e-commerce untuk yang belum dibaca */
    .notif-card.unread {
        background-color: #fff8f6; 
    }
    .notif-content {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }
    .notif-meta {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
    }
    .notif-content h4 {
        margin: 0;
        font-size: 1rem;
        color: #1e293b;
        font-weight: 600;
    }
    .notif-content p {
        margin: 0;
        font-size: 0.9rem;
        color: #475569;
        line-height: 1.4;
    }
    .notif-content .time {
        font-size: 0.8rem;
        color: #94a3b8;
        white-space: nowrap;
        margin-left: 10px;
    }
    .empty-state {
        text-align: center;
        padding: 40px;
        color: #94a3b8;
    }
</style>