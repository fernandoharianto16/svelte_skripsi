import axios from "axios";
import { auth } from "$lib/firebase";
import { PUBLIC_API_URL } from "$env/static/public";

const api = axios.create({
    baseURL: PUBLIC_API_URL,
});

// 🔥 interceptor request
api.interceptors.request.use(
    async (config) => {
        const user = auth.currentUser;

        if (user) {
            const token = await user.getIdToken();
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;