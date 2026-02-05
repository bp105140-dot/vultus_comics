// firebase.js

// 1. Importa as funções do Firebase direto do servidor do Google
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 2. TUA CONFIGURAÇÃO (Copiado do teu print)
const firebaseConfig = {
  apiKey: "AIzaSyCYkuiLBw24BgRor2L5XxFKQwUB158BosM",
  authDomain: "vultus-comics.firebaseapp.com",
  projectId: "vultus-comics",
  storageBucket: "vultus-comics.firebasestorage.app",
  messagingSenderId: "1038475327118",
  appId: "1:1038475327118:web:adcb44cd0f04769fbcfbdf"
};

// 3. Inicia a conexão
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 4. Exporta as ferramentas para usarmos nos outros arquivos
export { db, collection, getDocs, addDoc, updateDoc, deleteDoc, doc };
