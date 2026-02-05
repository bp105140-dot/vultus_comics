// ==========================================
// VULTUS STORE - DIAGNOSTIC MODE
// ==========================================

// 1. MONITOR DE ERROS (Avisa-te se algo quebrar)
window.onerror = function(msg, url, line) {
    alert("ERRO NO SITE:\n" + msg + "\nLinha: " + line);
    // Remove a tela de carregamento para não travar
    const loader = document.getElementById('loadingScreen');
    if(loader) loader.style.display = 'none';
};

// 2. Importa o Firebase
import { db, collection, getDocs } from "./firebase.js";

"use strict";

const CONFIG = {
  whatsappNumber: "5511999999999",
  storageKeys: { cart: "vultus_cart" },
  lazyLoad: { rootMargin: "50px", threshold: 0.1 },
};

const State = {
  products: [],
  categories: ["Geral"],
  cart: [],
  currentFilter: "all",
  currentSort: "default",
  currentProduct: null,
  currentGalleryIndex: 0,
  selectedSize: null,
  selectedColor: null,

  async init() {
    console.log("Iniciando carregamento...");
    await this.loadData();
    this.loadCart();
  },

  async loadData() {
    try {
        console.log("Conectando ao Firebase...");
        const querySnapshot = await getDocs(collection(db, "products"));
        
        this.products = [];
        querySnapshot.forEach((doc) => {
            this.products.push({ id: doc.id, ...doc.data() }); // Garante o ID correto
        });
        
        console.log(`Sucesso! ${this.products.length} produtos encontrados.`);
        
    } catch (e) {
        console.error(e);
        alert("Erro ao conectar no banco de dados:\n" + e.message);
        // Fallback
        this.products = JSON.parse(localStorage.getItem("vultus_products")) || [];
    }
  },

  loadCart() {
    this.cart = JSON.parse(localStorage.getItem(CONFIG.storageKeys.cart)) || [];
  },

  saveCart() {
    localStorage.setItem(CONFIG.storageKeys.cart, JSON.stringify(this.cart));
  },
};

const Utils = {
  formatPrice(value) {
    if (value === undefined || value === null) return "0,00";
    return parseFloat(value).toFixed(2).replace(".", ",");
  },
  sanitizeHTML(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
};

// ... DOM e UI mantêm-se iguais, vou simplificar para focar no erro ...
const DOM = {
  loadingScreen: document.getElementById("loadingScreen"),
  toastContainer: document.getElementById("toast-container"),
  mainHeader: document.getElementById("mainHeader"),
  mobileMenuToggle: document.getElementById("mobileMenuToggle"),
  mainNav: document.getElementById("mainNav"),
  dynamicMenu: document.getElementById("dynamicMenu"),
  productsGrid: document.getElementById("productsGrid"),
  emptyState: document.getElementById("emptyState"),
  productsSkeleton: document.getElementById("productsSkeleton"),
  sortSelect: document.getElementById("sortSelect"),
  cartCount: document.getElementById("cartCount"),
  cartModal: document.getElementById("cartModal"),
  cartItems: document.getElementById("cartItems"),
  cartTotal: document.getElementById("cartTotal"),
  productDetailModal: document.getElementById("productDetailModal"),
  mainMediaContainer: document.getElementById("mainMediaContainer"),
  thumbsList: document.getElementById("thumbsList"),
  detailName: document.getElementById("detailName"),
  detailCat: document.getElementById("detailCat"),
  detailPrice: document.getElementById("detailPrice"),
  detailOldPrice: document.getElementById("detailOldPrice"),
  detailDesc: document.getElementById("detailDesc"),
  detailSpecs: document.getElementById("detailSpecs"),
  btnDetailAdd: document.getElementById("btnDetailAdd"),
};

const UI = {
  showToast(message) {
    const toast = document.createElement("div");
    toast.className = "vultus-toast";
    toast.textContent = message;
    DOM.toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3000);
  },
  
  hideLoading() {
    if (DOM.productsSkeleton) DOM.productsSkeleton.style.display = "none";
    if (DOM.productsGrid) DOM.productsGrid.style.opacity = "1";
  },
  
  updateCartUI() {
    if (DOM.cartCount) DOM.cartCount.textContent = State.cart.length;
    this.renderCartItems();
  },

  renderCartItems() {
    // (Lógica do carrinho igual ao anterior)
    if (!DOM.cartItems) return;
    if (State.cart.length === 0) {
      DOM.cartItems.innerHTML = `<div style="text-align:center;padding:2rem;">Vazio</div>`;
      DOM.cartTotal.textContent = "R$ 0,00";
      return;
    }
    
    let html = "";
    let total = 0;
    
    State.cart.forEach((item, index) => {
        // Suporta ID string (Firebase) ou numérico
        const id = item.id || item;
        const p = State.products.find(prod => String(prod.id) === String(id) || prod.fireId === id);
        
        if(p) {
            total += parseFloat(p.price);
            const img = p.media && p.media[0] ? p.media[0].data : "";
            const size = item.size ? `Tam: ${item.size}` : "";
            const color = item.color ? `Cor: ${item.color}` : "";
            
            html += `
            <div class="cart-item">
                <img src="${img}" style="width:50px;height:50px;object-fit:cover;">
                <div>
                    <h4>${p.name}</h4>
                    <p>R$ ${Utils.formatPrice(p.price)}</p>
                    <small>${size} ${color}</small>
                </div>
                <button onclick="Cart.removeItem(${index})">X</button>
            </div>`;
        }
    });
    
    DOM.cartItems.innerHTML = html;
    DOM.cartTotal.textContent = `R$ ${Utils.formatPrice(total)}`;
  }
};

const Navigation = {
    init() { /* ... igual ... */ }
};

const Products = {
  init() {
    this.render();
  },

  getFilteredAndSorted() {
    return [...State.products]; // Simplificado para teste
  },

  render() {
    if (!DOM.productsGrid) return;
    
    // Mostra erro se array estiver vazio
    if (State.products.length === 0) {
        console.warn("Array de produtos vazio!");
        DOM.productsGrid.innerHTML = "";
        if (DOM.emptyState) DOM.emptyState.style.display = "block";
        UI.hideLoading();
        return;
    }

    if (DOM.emptyState) DOM.emptyState.style.display = "none";
    this.renderProductCards(State.products);
    UI.hideLoading();
  },

  renderProductCards(products) {
    DOM.productsGrid.innerHTML = "";
    
    products.forEach((product) => {
      try {
          const card = document.createElement("div");
          card.className = "product-card";
          
          let mediaHtml = '<div class="product-image-container" style="background:#222"></div>';
          if (product.media && product.media.length > 0) {
              const first = product.media[0];
              // Verifica se é vídeo ou imagem
              const tag = first.type === 'video' 
                ? `<video src="${first.data}" class="product-image" muted></video>`
                : `<img src="${first.data}" class="product-image">`;
              mediaHtml = `<div class="product-image-container">${tag}</div>`;
          }

          card.innerHTML = `
            ${product.tag ? `<span class="product-tag">${product.tag}</span>` : ""}
            ${mediaHtml}
            <div class="product-info-area">
                <h3 class="product-name">${Utils.sanitizeHTML(product.name)}</h3>
                <div class="price-box">
                    <span class="current-price">R$ ${Utils.formatPrice(product.price)}</span>
                </div>
            </div>
            <button class="btn-add-to-cart">Ver Detalhes</button>
          `;

          // Eventos de clique
          card.onclick = () => ProductDetail.open(product);
          
          DOM.productsGrid.appendChild(card);
      } catch (err) {
          console.error("Erro ao renderizar card:", err, product);
      }
    });
  }
};

const ProductDetail = {
  open(product) {
    State.currentProduct = product;
    this.render(product);
    DOM.productDetailModal.style.display = "flex";
  },
  
  close() {
    DOM.productDetailModal.style.display = "none";
  },

  render(product) {
    DOM.detailName.textContent = product.name;
    DOM.detailPrice.textContent = `R$ ${Utils.formatPrice(product.price)}`;
    DOM.detailDesc.textContent = product.description || "";
    
    // Render Sizes
    const sizeSel = document.getElementById("sizeSelector");
    if(product.sizes && product.sizes.length > 0) {
        sizeSel.style.display = "flex";
        const container = sizeSel.querySelector(".size-options");
        container.innerHTML = "";
        product.sizes.forEach(s => {
            const btn = document.createElement("button");
            btn.className = "size-option";
            btn.textContent = s;
            btn.onclick = () => {
                // Remove selected de todos
                container.querySelectorAll(".selected").forEach(el => el.classList.remove("selected"));
                btn.classList.add("selected");
                State.selectedSize = s;
            };
            container.appendChild(btn);
        });
    } else {
        sizeSel.style.display = "none";
    }

    // Render Colors
    const colSel = document.getElementById("colorSelector");
    if(product.colors && product.colors.length > 0) {
        colSel.style.display = "flex";
        const container = colSel.querySelector(".size-options");
        container.innerHTML = "";
        product.colors.forEach(c => {
            const btn = document.createElement("button");
            btn.className = "size-option";
            btn.textContent = c;
            btn.onclick = () => {
                container.querySelectorAll(".selected").forEach(el => el.classList.remove("selected"));
                btn.classList.add("selected");
                State.selectedColor = c;
            };
            container.appendChild(btn);
        });
    } else {
        colSel.style.display = "none";
    }

    // Galeria simplificada
    if(product.media && product.media.length > 0) {
        const item = product.media[0];
        if(item.type === 'video') DOM.mainMediaContainer.innerHTML = `<video src="${item.data}" class="main-image" controls></video>`;
        else DOM.mainMediaContainer.innerHTML = `<img src="${item.data}" class="main-image">`;
    }

    DOM.btnDetailAdd.onclick = () => {
        if(product.sizes?.length > 0 && !State.selectedSize) return alert("Escolha o tamanho!");
        if(product.colors?.length > 0 && !State.selectedColor) return alert("Escolha a cor!");
        
        Cart.addItem(product, State.selectedSize, State.selectedColor);
        ProductDetail.close();
        window.openCart();
    };
  }
};

const Cart = {
    addItem(product, size, color) {
        State.cart.push({ id: product.id || product.fireId, size, color }); // Usa ID do Firebase se não tiver ID numérico
        State.saveCart();
        UI.updateCartUI();
    },
    removeItem(idx) {
        State.cart.splice(idx, 1);
        State.saveCart();
        UI.updateCartUI();
    },
    checkout() { /* ... igual ... */ }
};

// Funções Globais
window.openCart = () => DOM.cartModal.style.display = "flex";
window.closeCart = () => DOM.cartModal.style.display = "none";
window.closeProductDetail = () => ProductDetail.close();
window.clearCart = () => { State.cart = []; State.saveCart(); UI.updateCartUI(); };

// INICIALIZAÇÃO SEGURA
const App = {
    async init() {
        console.log("App Init...");
        await State.init();
        
        // Remove loading
        if (DOM.loadingScreen) {
            DOM.loadingScreen.style.opacity = 0;
            setTimeout(() => DOM.loadingScreen.style.display = "none", 500);
        }
        
        Products.init();
        UI.updateCartUI();
        
        // Configura Admin
        const btnAdmin = document.getElementById("btnAdminAccess");
        if(btnAdmin) {
            btnAdmin.onclick = () => document.getElementById("adminModal").style.display = "flex";
        }
        document.getElementById("btnConfirmAdmin")?.addEventListener("click", () => {
            const input = document.getElementById("adminPassInput");
            if(input.value === "*K4m1k4z3") window.location.href = "admin.html";
            else alert("Senha errada");
        });
        document.getElementById("btnCancelAdmin")?.addEventListener("click", () => {
            document.getElementById("adminModal").style.display = "none";
        });
    }
};

// Arranca o sistema
App.init();
