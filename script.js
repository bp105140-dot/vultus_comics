// ==========================================
// VULTUS STORE - FINAL FIXED VERSION
// ==========================================

import { db, collection, getDocs } from "./firebase.js";

"use strict";

const CONFIG = {
  whatsappNumber: "5511999999999", 
  storageKeys: {
    cart: "vultus_cart",
  },
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
    await this.loadData();
    this.loadCart();
  },

  async loadData() {
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        this.products = [];
        const uniqueCategories = new Set(); 

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            this.products.push({ id: doc.id, ...data });
            if (data.category && data.category !== "Geral") {
                uniqueCategories.add(data.category);
            }
        });

        this.categories = ["Geral", ...Array.from(uniqueCategories)];
        console.log("Produtos carregados:", this.products.length);

    } catch (e) {
        console.error("Erro ao carregar produtos:", e);
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

// ============= DOM ELEMENTS =============
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
  
  // Elementos do Modal de Detalhes
  detailName: document.getElementById("detailName"),
  detailCat: document.getElementById("detailCat"),
  detailPrice: document.getElementById("detailPrice"),
  detailOldPrice: document.getElementById("detailOldPrice"),
  detailDesc: document.getElementById("detailDesc"),
  detailSpecs: document.getElementById("detailSpecs"),
  btnDetailAdd: document.getElementById("btnDetailAdd"),
  
  // Containers dentro do modal para reconstruir se necessário
  detailInfo: document.querySelector(".detail-info"),
};

// ============= UI =============
const UI = {
  showToast(message) {
    const toast = document.createElement("div");
    toast.className = "vultus-toast";
    toast.textContent = message;
    if(DOM.toastContainer) DOM.toastContainer.appendChild(toast);
    setTimeout(() => { if(toast.parentElement) toast.remove(); }, 3000);
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
    if (!DOM.cartItems) return;
    if (State.cart.length === 0) {
      DOM.cartItems.innerHTML = `<div style="text-align:center;padding:2rem;color:#888;">Carrinho vazio</div>`;
      DOM.cartTotal.textContent = "R$ 0,00";
      return;
    }

    let html = "";
    let total = 0;

    State.cart.forEach((cartItem, index) => {
      const id = cartItem.id || cartItem;
      const item = State.products.find((p) => String(p.id) === String(id) || p.fireId === id);
      
      if (item) {
        total += parseFloat(item.price);
        const img = item.media && item.media[0] ? item.media[0].data : "";
        let badges = "";
        if (cartItem.size) badges += `Tam: ${cartItem.size} `;
        if (cartItem.color) badges += `Cor: ${cartItem.color}`;

        html += `
          <div class="cart-item">
            <img src="${img}" style="object-fit:cover;">
            <div class="cart-item-info">
              <h4>${item.name}</h4>
              <p>R$ ${Utils.formatPrice(item.price)}</p>
              <small style="color:#888">${badges}</small>
              <button class="btn-remove" data-index="${index}">Remover</button>
            </div>
          </div>
        `;
      }
    });

    DOM.cartItems.innerHTML = html;
    DOM.cartTotal.textContent = `R$ ${Utils.formatPrice(total)}`;

    DOM.cartItems.querySelectorAll(".btn-remove").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        Cart.removeItem(parseInt(e.target.dataset.index));
      });
    });
  },
};

// ============= PRODUCTS =============
const Products = {
  init() { this.render(); },

  getFilteredAndSorted() {
    let filtered = [...State.products];
    if (State.currentFilter !== "all") {
      filtered = filtered.filter((p) => p.category === State.currentFilter);
    }
    if (State.currentSort === 'price-asc') filtered.sort((a, b) => a.price - b.price);
    if (State.currentSort === 'price-desc') filtered.sort((a, b) => b.price - a.price);
    if (State.currentSort === 'name-asc') filtered.sort((a, b) => a.name.localeCompare(b.name));
    return filtered;
  },

  render() {
    if (!DOM.productsGrid) return;
    const products = this.getFilteredAndSorted();

    requestAnimationFrame(() => {
      DOM.productsGrid.innerHTML = "";
      if (products.length === 0) {
        if (DOM.emptyState) DOM.emptyState.style.display = "block";
      } else {
        if (DOM.emptyState) DOM.emptyState.style.display = "none";
        products.forEach(p => DOM.productsGrid.appendChild(this.createCard(p)));
      }
      UI.hideLoading();
    });
  },

  createCard(product) {
    const card = document.createElement("div");
    card.className = "product-card";
    
    let mediaHtml = '<div class="product-image-container" style="background:#222"></div>';
    if (product.media?.length > 0) {
        const first = product.media[0];
        const tag = first.type === 'video' 
          ? `<video src="${first.data}" class="product-image" muted></video>`
          : `<img src="${first.data}" class="product-image" loading="lazy">`;
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
      <button class="btn-add-to-cart">Ver Opções</button>
    `;
    card.onclick = () => ProductDetail.open(product.id);
    return card;
  }
};

// ============= PRODUCT DETAIL MODAL (LÓGICA AJUSTADA) =============
const ProductDetail = {
  open(productId) {
    const product = State.products.find((p) => String(p.id) === String(productId));
    if (!product) return;
    State.currentProduct = product;
    State.currentGalleryIndex = 0;
    this.render(product);
    DOM.productDetailModal.style.display = "flex";
    document.body.style.overflow = "hidden";
  },

  close() {
    DOM.productDetailModal.style.display = "none";
    document.body.style.overflow = "";
  },

  render(product) {
    // 1. RECONSTRUIR A ESTRUTURA INTERNA (Para aplicar o CSS novo corretamente)
    // Isso garante que se o HTML estiver velho, o JS força a estrutura nova
    DOM.detailInfo.innerHTML = `
        <div class="detail-header-group">
            <span class="detail-category">${product.category || "GERAL"}</span>
            <h2 class="detail-name">${Utils.sanitizeHTML(product.name)}</h2>
            <div class="price-wrapper">
                <span class="detail-price">R$ ${Utils.formatPrice(product.price)}</span>
                ${product.originalPrice ? `<span class="detail-old-price">R$ ${Utils.formatPrice(product.originalPrice)}</span>` : ''}
            </div>
        </div>

        <div class="detail-scroll-area">
            <div class="info-block">
                <h3>Descrição</h3>
                <p class="info-text">${product.description || ""}</p>
            </div>
            
            ${product.specs ? `
            <div class="info-block">
                <h3>Características</h3>
                <p class="info-text">${product.specs}</p>
            </div>` : ''}

            <div class="size-selector" style="display: ${product.sizes?.length ? 'flex' : 'none'}">
                <h3>Selecione o Tamanho</h3>
                <div class="size-options"></div>
            </div>

            <div class="size-selector" id="colorSelector" style="display: ${product.colors?.length ? 'flex' : 'none'}">
                <h3>Selecione a Cor</h3>
                <div class="size-options color-options"></div>
            </div>
        </div>

        <button class="btn-add-cart-large" id="btnDetailAddAction">
            ADICIONAR AO CARRINHO
        </button>
    `;

    // 2. LÓGICA DE BOTÕES (Tamanho e Cor)
    State.selectedSize = null;
    State.selectedColor = null;

    // Tamanhos
    if (product.sizes?.length) {
        const container = DOM.detailInfo.querySelector(".size-options");
        product.sizes.forEach(s => {
            const btn = document.createElement("button");
            btn.className = "size-option";
            btn.textContent = s;
            btn.onclick = () => {
                container.querySelectorAll(".selected").forEach(el => el.classList.remove("selected"));
                btn.classList.add("selected");
                State.selectedSize = s;
            };
            container.appendChild(btn);
        });
    }

    // Cores
    if (product.colors?.length) {
        const container = DOM.detailInfo.querySelector(".color-options");
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
    }

    // 3. GALERIA
    this.renderGallery(product);

    // 4. AÇÃO DO BOTÃO
    document.getElementById("btnDetailAddAction").onclick = () => {
        if(product.sizes?.length > 0 && !State.selectedSize) return UI.showToast("Escolha o tamanho!");
        if(product.colors?.length > 0 && !State.selectedColor) return UI.showToast("Escolha a cor!");
        
        Cart.addItem(product.id, State.selectedSize, State.selectedColor);
        this.close();
        window.openCart();
    };
  },

  renderGallery(product) {
    if(!product.media || product.media.length === 0) {
        DOM.mainMediaContainer.innerHTML = '';
        DOM.thumbsList.innerHTML = "";
        return;
    }
    
    // Função local para setar imagem
    const setImg = (media) => {
        if(media.type === 'video') {
            DOM.mainMediaContainer.innerHTML = `<video src="${media.data}" class="main-image" autoplay muted loop controls></video>`;
        } else {
            DOM.mainMediaContainer.innerHTML = `<img src="${media.data}" class="main-image">`;
        }
    };

    setImg(product.media[0]);
    
    DOM.thumbsList.innerHTML = "";
    product.media.forEach((m, i) => {
        const thumb = document.createElement(m.type === 'video' ? 'video' : 'img');
        thumb.src = m.data;
        thumb.className = `thumb ${i === 0 ? 'active' : ''}`;
        thumb.onclick = () => {
            setImg(m);
            document.querySelectorAll(".thumb").forEach(t => t.classList.remove("active"));
            thumb.classList.add("active");
        };
        DOM.thumbsList.appendChild(thumb);
    });
  }
};

window.navigateGallery = (dir) => { /* Lógica simplificada no render acima */ };
window.closeProductDetail = () => ProductDetail.close();

// ============= CART =============
const Cart = {
  addItem(id, size, color) {
    State.cart.push({ id, size, color });
    State.saveCart();
    UI.updateCartUI();
    UI.showToast("Adicionado!");
  },
  removeItem(idx) {
    State.cart.splice(idx, 1);
    State.saveCart();
    UI.updateCartUI();
  },
  checkout() {
    if (State.cart.length === 0) return UI.showToast("Carrinho vazio");
    let msg = "*PEDIDO VULTUS:*\n\n";
    let total = 0;
    State.cart.forEach(item => {
        const p = State.products.find(prod => String(prod.id) === String(item.id) || prod.fireId === item.id);
        if(p) {
            let detail = "";
            if(item.size) detail += ` [Tam: ${item.size}]`;
            if(item.color) detail += ` [Cor: ${item.color}]`;
            msg += `▪ ${p.name}${detail} - R$ ${Utils.formatPrice(p.price)}\n`;
            total += p.price;
        }
    });
    msg += `\n*TOTAL: R$ ${Utils.formatPrice(total)}*`;
    window.open(`https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(msg)}`, "_blank");
  },
  clear() {
      if(confirm("Limpar?")) { State.cart=[]; State.saveCart(); UI.updateCartUI(); }
  }
};

// Funções Globais HTML
window.openCart = () => DOM.cartModal.style.display = "flex";
window.closeCart = () => DOM.cartModal.style.display = "none";
window.checkoutWhatsApp = () => Cart.checkout();
window.clearCart = () => Cart.clear();

// ============= APP START & ADMIN =============
const App = {
  async init() {
    await State.init();
    
    // Destrava Loading
    if (DOM.loadingScreen) {
        DOM.loadingScreen.style.opacity = 0;
        setTimeout(() => DOM.loadingScreen.style.display = "none", 500);
    }
    
    Navigation.init(); // Renderiza Menu
    Products.init();   // Renderiza Produtos
    UI.updateCartUI();
    
    // ESC para fechar
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            ProductDetail.close();
            window.closeCart();
            document.getElementById("adminModal").style.display = "none";
        }
    });

    // === LÓGICA DO ADMIN (MODAL BONITO) ===
    const btnAdmin = document.getElementById("btnAdminAccess");
    const adminModal = document.getElementById("adminModal");
    const adminPassInput = document.getElementById("adminPassInput");
    const btnConfirmAdmin = document.getElementById("btnConfirmAdmin");
    const btnCancelAdmin = document.getElementById("btnCancelAdmin");

    if (btnAdmin) {
        btnAdmin.onclick = () => {
            adminModal.style.display = "flex";
            adminPassInput.value = "";
            setTimeout(() => adminPassInput.focus(), 100);
        };
    }

    if (btnConfirmAdmin) {
        btnConfirmAdmin.onclick = () => {
            if (adminPassInput.value === "*K4m1k4z3") {
                UI.showToast("Acesso Liberado!");
                setTimeout(() => window.location.href = "admin.html", 500);
            } else {
                UI.showToast("Senha Incorreta");
                adminPassInput.style.borderColor = "red";
                setTimeout(() => adminPassInput.style.borderColor = "", 500);
            }
        };
    }

    if (btnCancelAdmin) {
        btnCancelAdmin.onclick = () => adminModal.style.display = "none";
    }

    if (adminPassInput) {
        adminPassInput.onkeydown = (e) => {
            if (e.key === "Enter") btnConfirmAdmin.click();
        };
    }
  }
};

document.addEventListener("DOMContentLoaded", () => App.init());
