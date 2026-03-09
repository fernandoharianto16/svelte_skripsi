// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyABceXZ4x-5Syb7eg_vIVxbC8f8U0EJn3Y",
  authDomain: "dbfirebase-skripsi.firebaseapp.com",
  projectId: "dbfirebase-skripsi",
  storageBucket: "dbfirebase-skripsi.firebasestorage.app",
  messagingSenderId: "575180960966",
  appId: "1:575180960966:web:af0977db472a8784ce53c7",
  measurementId: "G-41KPK3X3LP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);

const auth = getAuth(app);

export { auth };

