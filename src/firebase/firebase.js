// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCYpRVUrQpHb9m5FpD5XDnuhPKxKwVfaLw",
  authDomain: "marketdb-c9853.firebaseapp.com",
  projectId: "marketdb-c9853",
  storageBucket: "marketdb-c9853.appspot.com",
  messagingSenderId: "697093184525",
  appId: "1:697093184525:web:a9df22f56e3f0017220944",
  measurementId: "G-WLV01B97VR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);

const auth = getAuth(app);

export { auth };

