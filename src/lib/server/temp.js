router.post("/orders", verifyToken, async (req, res) => {
    try {
        const { items, total_price } = req.body;
        const buyer_id = req.user.uid;
        if (!items || items.length === 0 || !total_price) {
            return res.status(400).json({ message: "Data order tidak lengkap" });
        }
        const orderRef = await db.collection("orders").add({
            user_id: buyer_id,
            total_price,
            payment_status: "unpaid",
            order_status: "pending",
            created_at: new Date()
        });
        const detailPromises = items.map((item) => {
            return db.collection("order_details").add({
                order_id: orderRef.id,
                product_id: item.product_id,
                product_name_at_purchase: item.name,
                product_price_at_purchase: item.price,
                product_image_at_purchase: item.image,
                quantity: item.quantity,
                created_at: new Date()
            });
        });
        await Promise.all(detailPromises);
        res.status(201).json({
            message: "Order berhasil dibuat",
            order_id: orderRef.id
        });
    } catch (error) {
        console.error("Gagal membuat order:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

// ------------------------------------------------------------------------------------




router.post("/custom-requests", verifyToken, upload.single("image"), async (req, res) => {
    try {
        const { request_description, category, budget_estimate } = req.body;
        const customer_id = req.user.uid;

        // Validasi data
        if (!request_description || !category || !budget_estimate) {
            return res.status(400).json({ message: "Data permintaan tidak lengkap" });
        }

        // Penanganan upload gambar ke Cloudinary
        let imageUrl = null;
        if (req.file) {
            imageUrl = await uploadToCloudinary(req.file.buffer, "custom_requests_images");
        }

        // Menyimpan request ke database
        const newRequest = {
            customer_id,
            seller_id: null, // Ditambahkan agar struktur konsisten
            request_description,
            category,
            budget_estimate: budget,
            reference_image: imageUrl,
            negotiated_price: null,
            request_status: "open",
            interested_sellers: [], // Persiapan untuk fitur limit 5 penjual
            created_at: new Date()
        };

        const result = await db.collection("custom_requests").add(newRequest);

        res.status(201).json({
            message: "Permintaan kustom berhasil dibuat",
            custom_request_id: result.id,
            data: newRequest
        });

    } catch (error) {
        console.error("Gagal membuat custom request:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});


router.post("/payments", verifyToken, async (req, res) => {
    try {
        // Mengambil data dari body
        const { 
            order_id, 
            custom_request_id, 
            payment_method, 
            transaction_token 
        } = req.body;

        // Validasi dasar
        if (!transaction_token || (!order_id && !custom_request_id)) {
            return res.status(400).json({ message: "Data pembayaran tidak lengkap" });
        }

        // Membuat objek pembayaran baru sesuai struktur image_f77787.png
        const newPayment = {
            order_id: order_id || null,
            custom_request_id: custom_request_id || null,
            payment_method: payment_method || "midtrans", // Default method
            payment_status: "pending", // Status awal saat token dibuat
            payment_date: new Date(),
            transaction_token: transaction_token
        };

        // Menyimpan ke koleksi PAYMENT
        const result = await db.collection("payments").add(newPayment);

        res.status(201).json({
            message: "Data pembayaran berhasil dibuat",
            payment_id: result.id,
            data: newPayment
        });

    } catch (error) {
        console.error("Gagal membuat data pembayaran:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});