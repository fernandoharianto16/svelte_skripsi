import { dev } from '$app/environment';

// we don't need any JS on this page, though we'll load
// it in dev so that we get hot module replacement
export const csr = dev;

// since there's no dynamic data here, we can prerender
// it so that it gets served as a static asset in production
export const prerender = true;

import axios from "axios";

let products = [];

async function fetchProducts() {
  try {
    const token = localStorage.getItem("token");

    const response = await axios.get(
      "http://localhost:3000/api/products",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    products = response.data;
    console.log(products);
  } catch (error) {
    console.error("Gagal ambil produk:", error.response?.data || error.message);
  }
}