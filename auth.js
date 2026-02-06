// ==========================================
// VULTUS AUTH - Sistema de Autenticação
// Firebase Authentication + Firestore
// ==========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Configuração Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCYkuiLBw24BgRor2L5XxFKQwUB158BosM",
  authDomain: "vultus-comics.firebaseapp.com",
  projectId: "vultus-comics",
  storageBucket: "vultus-comics.firebasestorage.app",
  messagingSenderId: "1038475327118",
  appId: "1:1038475327118:web:adcb44cd0f04769fbcfbdf"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ============= ESTADO DO USUÁRIO =============
let currentUser = null;

// ============= AUTENTICAÇÃO =============
const Auth = {
  
  // Cadastro de novo usuário
  async register(email, password, userData) {
    try {
      // Criar usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Atualizar perfil com nome
      if (userData.name) {
        await updateProfile(user, {
          displayName: userData.name
        });
      }
      
      // Criar documento do usuário no Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: email,
        name: userData.name || "",
        phone: userData.phone || "",
        cpf: userData.cpf || "",
        createdAt: serverTimestamp(),
        addresses: [],
        orders: [],
        favorites: [],
        role: "customer"
      });
      
      return { success: true, user };
    } catch (error) {
      console.error("Erro no cadastro:", error);
      return { 
        success: false, 
        error: this.getErrorMessage(error.code) 
      };
    }
  },
  
  // Login
  async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error("Erro no login:", error);
      return { 
        success: false, 
        error: this.getErrorMessage(error.code) 
      };
    }
  },
  
  // Logout
  async logout() {
    try {
      await signOut(auth);
      currentUser = null;
      return { success: true };
    } catch (error) {
      console.error("Erro no logout:", error);
      return { success: false, error: error.message };
    }
  },
  
  // Recuperar senha
  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      console.error("Erro ao recuperar senha:", error);
      return { 
        success: false, 
        error: this.getErrorMessage(error.code) 
      };
    }
  },
  
  // Obter usuário atual
  getCurrentUser() {
    return auth.currentUser;
  },
  
  // Verificar se está logado
  isAuthenticated() {
    return auth.currentUser !== null;
  },
  
  // Mensagens de erro em português
  getErrorMessage(code) {
    const errors = {
      'auth/email-already-in-use': 'Este email já está cadastrado',
      'auth/invalid-email': 'Email inválido',
      'auth/operation-not-allowed': 'Operação não permitida',
      'auth/weak-password': 'Senha muito fraca (mínimo 6 caracteres)',
      'auth/user-disabled': 'Usuário desabilitado',
      'auth/user-not-found': 'Usuário não encontrado',
      'auth/wrong-password': 'Senha incorreta',
      'auth/too-many-requests': 'Muitas tentativas. Tente mais tarde',
      'auth/network-request-failed': 'Erro de conexão. Verifique sua internet'
    };
    return errors[code] || 'Erro ao processar. Tente novamente';
  }
};

// ============= DADOS DO USUÁRIO =============
const UserData = {
  
  // Obter dados completos do usuário
  async getUserData(uid) {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        return { success: true, data: userDoc.data() };
      }
      return { success: false, error: "Usuário não encontrado" };
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      return { success: false, error: error.message };
    }
  },
  
  // Atualizar perfil do usuário
  async updateProfile(uid, data) {
    try {
      await updateDoc(doc(db, "users", uid), {
        ...data,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      return { success: false, error: error.message };
    }
  },
  
  // Adicionar endereço
  async addAddress(uid, address) {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const addresses = userData.addresses || [];
        
        // Adicionar ID único ao endereço
        const newAddress = {
          id: Date.now().toString(),
          ...address,
          createdAt: new Date().toISOString()
        };
        
        addresses.push(newAddress);
        
        await updateDoc(doc(db, "users", uid), {
          addresses: addresses,
          updatedAt: serverTimestamp()
        });
        
        return { success: true, address: newAddress };
      }
      return { success: false, error: "Usuário não encontrado" };
    } catch (error) {
      console.error("Erro ao adicionar endereço:", error);
      return { success: false, error: error.message };
    }
  },
  
  // Atualizar endereço
  async updateAddress(uid, addressId, addressData) {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        let addresses = userData.addresses || [];
        
        const index = addresses.findIndex(a => a.id === addressId);
        if (index !== -1) {
          addresses[index] = {
            ...addresses[index],
            ...addressData,
            updatedAt: new Date().toISOString()
          };
          
          await updateDoc(doc(db, "users", uid), {
            addresses: addresses,
            updatedAt: serverTimestamp()
          });
          
          return { success: true };
        }
        return { success: false, error: "Endereço não encontrado" };
      }
      return { success: false, error: "Usuário não encontrado" };
    } catch (error) {
      console.error("Erro ao atualizar endereço:", error);
      return { success: false, error: error.message };
    }
  },
  
  // Remover endereço
  async removeAddress(uid, addressId) {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        let addresses = userData.addresses || [];
        
        addresses = addresses.filter(a => a.id !== addressId);
        
        await updateDoc(doc(db, "users", uid), {
          addresses: addresses,
          updatedAt: serverTimestamp()
        });
        
        return { success: true };
      }
      return { success: false, error: "Usuário não encontrado" };
    } catch (error) {
      console.error("Erro ao remover endereço:", error);
      return { success: false, error: error.message };
    }
  },
  
  // Definir endereço padrão
  async setDefaultAddress(uid, addressId) {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        let addresses = userData.addresses || [];
        
        // Remove padrão de todos
        addresses = addresses.map(a => ({
          ...a,
          isDefault: false
        }));
        
        // Define novo padrão
        const index = addresses.findIndex(a => a.id === addressId);
        if (index !== -1) {
          addresses[index].isDefault = true;
          
          await updateDoc(doc(db, "users", uid), {
            addresses: addresses,
            updatedAt: serverTimestamp()
          });
          
          return { success: true };
        }
        return { success: false, error: "Endereço não encontrado" };
      }
      return { success: false, error: "Usuário não encontrado" };
    } catch (error) {
      console.error("Erro ao definir endereço padrão:", error);
      return { success: false, error: error.message };
    }
  },
  
  // Adicionar aos favoritos
  async addToFavorites(uid, productId) {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        let favorites = userData.favorites || [];
        
        if (!favorites.includes(productId)) {
          favorites.push(productId);
          
          await updateDoc(doc(db, "users", uid), {
            favorites: favorites,
            updatedAt: serverTimestamp()
          });
        }
        
        return { success: true };
      }
      return { success: false, error: "Usuário não encontrado" };
    } catch (error) {
      console.error("Erro ao adicionar favorito:", error);
      return { success: false, error: error.message };
    }
  },
  
  // Remover dos favoritos
  async removeFromFavorites(uid, productId) {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        let favorites = userData.favorites || [];
        
        favorites = favorites.filter(id => id !== productId);
        
        await updateDoc(doc(db, "users", uid), {
          favorites: favorites,
          updatedAt: serverTimestamp()
        });
        
        return { success: true };
      }
      return { success: false, error: "Usuário não encontrado" };
    } catch (error) {
      console.error("Erro ao remover favorito:", error);
      return { success: false, error: error.message };
    }
  }
};

// ============= OBSERVER DE AUTENTICAÇÃO =============
function initAuthObserver(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Usuário logado
      const userData = await UserData.getUserData(user.uid);
      currentUser = {
        ...user,
        data: userData.success ? userData.data : null
      };
      callback(currentUser);
    } else {
      // Usuário deslogado
      currentUser = null;
      callback(null);
    }
  });
}

// ============= EXPORTAÇÕES =============
export { 
  auth, 
  db, 
  Auth, 
  UserData, 
  initAuthObserver,
  currentUser
};
