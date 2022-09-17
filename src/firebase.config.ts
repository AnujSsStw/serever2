// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCtOQoDkS4ktuLdPzEG_LcyALBbG0br_EE",
  authDomain: "blog-ba7a2.firebaseapp.com",
  projectId: "blog-ba7a2",
  storageBucket: "blog-ba7a2.appspot.com",
  messagingSenderId: "467996096168",
  appId: "1:467996096168:web:2f33cfd578b678edad349d",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
