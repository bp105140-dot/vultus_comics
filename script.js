// ==========================================
// VULTUS STORE - FIREBASE EDITION (CORRIGIDO)
// ==========================================

// 1. IMPORTA O FIREBASE
import { db, collection, getDocs } from "./firebase.js";

"use strict";

const CONFIG = {
  whatsappNumber: "5511999999999", // Coloque seu número aqui
  storageKeys: {
    cart: "vultus_cart",
  },
  lazyLoad: {
    rootMargin: "50px",
    threshold: 0.1,
  },
};

// ============= STATE MANAGEMENT =============
const State = {
  products: [],
  categories: ["Geral"], // Começa com o padrão
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

  // BUSCA DADOS NO FIREBASE E GERA CATEGORIAS
  async loadData() {
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        this.products = [];
        
        // Criamos um "Conjunto" (Set) para guardar categorias únicas
        const uniqueCategories = new Set(); 

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Salva o produto
            this.products.push({ id: doc.id, ...data });
            
            // Se o produto tem categoria, adiciona à lista
            if (data.category && data.category !== "Geral") {
                uniqueCategories.add(data.category);
            }
        });

        // Atualiza a lista de categorias do site
        // Mantém "Geral" se quiseres, ou remove. Aqui adicionamos as encontradas.
        this.categories = ["Geral", ...Array.from(uniqueCategories)];
        
        console.log("Produtos carregados:", this.products.length);
        console.log("Categorias encontradas:", this.categories);

    } catch (e) {
        console.error("Erro ao carregar produtos:", e);
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

// ============= UTILS =============
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
  detailName: document.getElementById("detailName"),
  detailCat: document.getElementById("detailCat"),
  detailPrice: document.getElementById("detailPrice"),
  detailOldPrice: document.getElementById("detailOldPrice"),
  detailDesc: document.getElementById("detailDesc"),
  detailSpecs: document.getElementById("detailSpecs"),
  btnDetailAdd: document.getElementById("btnDetailAdd"),
};

// ============= UI =============
const UI = {
  showToast(message) {
    const toast = document.createElement("div");
    toast.className = "vultus-toast";
    toast.textContent = message;
    if(DOM.toastContainer) DOM.toastContainer.appendChild(toast);
    setTimeout(() => {
      if(toast.parentElement) toast.remove();
    }, 3000);
  },

  hideLoading() {
    if (DOM.productsSkeleton) DOM.productsSkeleton.style.display = "none";
    if (DOM.productsGrid) DOM.productsGrid.style.opacity = "1";
  },

  updateCartUI() {
    if (DOM.cartCount) {
        DOM.cartCount.textContent = State.cart.length;
    }
    this.renderCartItems();
  },

  renderCartItems() {
    if (!DOM.cartItems || !DOM.cartTotal) return;

    if (State.cart.length === 0) {
      DOM.cartItems.innerHTML = `<div style="text-align:center;padding:2rem;color:#888;">Carrinho vazio</div>`;
      DOM.cartTotal.textContent = "R$ 0,00";
      return;
    }

    let html = "";
    let total = 0;

    State.cart.forEach((cartItem, index) => {
      const id = cartItem.id || cartItem; // Compatibilidade com versões antigas
      const size = cartItem.size;
      const color = cartItem.color;

      // Procura por ID string (Firebase) ou number (Legado)
      const item = State.products.find((p) => String(p.id) === String(id) || p.fireId === id);
      
      if (!item) return;

      total += parseFloat(item.price);
      const thumbnail = item.media && item.media[0] ? item.media[0].data : "";
      
      let badges = "";
      if (size) badges += `<span style="font-size:0.75rem; background:#333; padding:2px 6px; margin-right:5px; border-radius:4px;">Tam: ${size}</span>`;
      if (color) badges += `<span style="font-size:0.75rem; background:#333; padding:2px 6px; border-radius:4px;">Cor: ${color}</span>`;

      html += `
        <div class="cart-item">
          <img src="${thumbnail}" alt="${Utils.sanitizeHTML(item.name)}" loading="lazy">
          <div class="cart-item-info">
            <h4>${Utils.sanitizeHTML(item.name)}</h4>
            <p>R$ ${Utils.formatPrice(item.price)}</p>
            <div style="margin-top:4px;">${badges}</div>
            <button class="btn-remove" data-index="${index}">Remover</button>
          </div>
        </div>
      `;
    });

    DOM.cartItems.innerHTML = html;
    DOM.cartTotal.textContent = `R$ ${Utils.formatPrice(total)}`;

    // Re-atachar eventos de remover
    DOM.cartItems.querySelectorAll(".btn-remove").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const index = parseInt(e.target.dataset.index);
        Cart.removeItem(index);
      });
    });
  },
};

// ============= NAVIGATION =============
const Navigation = {
  init() {
    this.renderMenu();
    
    // Mobile Toggle
    if(DOM.mobileMenuToggle) {
        DOM.mobileMenuToggle.addEventListener("click", () => {
            DOM.mainNav.classList.toggle("active");
            DOM.mobileMenuToggle.classList.toggle("active");
        });
    }

    // Scroll Header
    window.addEventListener("scroll", () => {
        if (window.pageYOffset > 50) DOM.mainHeader.classList.add("scrolled");
        else DOM.mainHeader.classList.remove("scrolled");
    });

    // Sort Select
    if (DOM.sortSelect) {
        DOM.sortSelect.addEventListener("change", (e) => {
            State.currentSort = e.target.value;
            Products.render();
        });
    }
  },

  renderMenu() {
    if (!DOM.dynamicMenu) return;
    
    // GERA O MENU DINAMICAMENTE COM BASE NO STATE.CATEGORIES
    const menuItems = [{ label: "Todos", value: "all" }, ...State.categories.map((cat) => ({ label: cat, value: cat }))];
    
    DOM.dynamicMenu.innerHTML = menuItems.map(item => `
        <li><a href="#" class="nav-item ${item.value === "all" ? "active" : ""}" data-category="${item.value}">${item.label}</a></li>
    `).join("");

    DOM.dynamicMenu.querySelectorAll(".nav-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        this.handleCategoryChange(e.target.dataset.category);
      });
    });
  },

  handleCategoryChange(category) {
    State.currentFilter = category;
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.category === category);
    });
    if (DOM.mainNav.classList.contains("active")) {
        DOM.mainNav.classList.remove("active");
        DOM.mobileMenuToggle.classList.remove("active");
    }
    Products.render();
    document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth" });
  }
};

// ============= PRODUCTS =============
const Products = {
  init() {
    this.render();
  },

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
      if (products.length === 0) {
        DOM.productsGrid.innerHTML = "";
        if (DOM.emptyState) DOM.emptyState.style.display = "block";
      } else {
        if (DOM.emptyState) DOM.emptyState.style.display = "none";
        this.renderProductCards(products);
      }
      UI.hideLoading();
    });
  },

  renderProductCards(products) {
    DOM.productsGrid.innerHTML = "";
    const fragment = document.createDocumentFragment();
    
    products.forEach((product) => {
      const card = document.createElement("div");
      card.className = "product-card";
      
      let mediaHtml = '<div class="product-image-container" style="background:#222"></div>';
      if (product.media && product.media.length > 0) {
          const first = product.media[0];
          const second = product.media.length > 1 ? product.media[1] : first;
          
          const getTag = (item, cls) => item.type === 'video' 
            ? `<video src="${item.data}" class="product-image ${cls}" autoplay muted loop playsinline></video>`
            : `<img src="${item.data}" class="product-image ${cls}" loading="lazy">`;

          mediaHtml = `<div class="product-image-container">${getTag(first, 'img-front')}${getTag(second, 'img-back')}</div>`;
      }

      card.innerHTML = `
        ${product.tag ? `<span class="product-tag">${product.tag}</span>` : ""}
        ${mediaHtml}
        <div class="product-info-area">
            <h3 class="product-name">${Utils.sanitizeHTML(product.name)}</h3>
            <div class="price-box">
                ${product.originalPrice ? `<span class="old-price">R$ ${Utils.formatPrice(product.originalPrice)}</span>` : ""}
                <span class="current-price">R$ ${Utils.formatPrice(product.price)}</span>
            </div>
        </div>
        <button class="btn-add-to-cart">Ver Opções</button>
      `;

      card.onclick = () => ProductDetail.open(product.id);
      fragment.appendChild(card);
    });
    
    DOM.productsGrid.appendChild(fragment);
  }
};

// ============= PRODUCT DETAIL =============
const ProductDetail = {
  open(productId) {
    // Procura por ID string ou number
    const product = State.products.find((p) => String(p.id) === String(productId));
    if (!product) return;
    
    State.currentProduct = product;
    State.currentGalleryIndex = 0;
    this.render(product);
    
    if (DOM.productDetailModal) {
      DOM.productDetailModal.style.display = "flex";
      document.body.style.overflow = "hidden";
    }
  },

  close() {
    if (DOM.productDetailModal) {
      DOM.productDetailModal.style.display = "none";
      document.body.style.overflow = "";
    }
  },

  render(product) {
    DOM.detailName.textContent = product.name;
    DOM.detailCat.textContent = product.category || "GERAL";
    DOM.detailPrice.textContent = `R$ ${Utils.formatPrice(product.price)}`;
    DOM.detailDesc.textContent = product.description || "";
    DOM.detailSpecs.textContent = product.specs || "";
    
    if (DOM.detailOldPrice) {
        DOM.detailOldPrice.style.display = product.originalPrice ? "inline" : "none";
        if(product.originalPrice) DOM.detailOldPrice.textContent = `R$ ${Utils.formatPrice(product.originalPrice)}`;
    }

    // Reset
    State.selectedSize = null;
    State.selectedColor = null;

    // Render Tamanhos
    const sizeSel = document.getElementById("sizeSelector");
    if (product.sizes && product.sizes.length > 0) {
        sizeSel.style.display = "flex";
        const opts = sizeSel.querySelector(".size-options");
        opts.innerHTML = "";
        product.sizes.forEach(s => {
            const btn = document.createElement("button");
            btn.className = "size-option";
            btn.textContent = s;
            btn.onclick = () => {
                opts.querySelectorAll(".size-option").forEach(b => b.classList.remove("selected"));
                btn.classList.add("selected");
                State.selectedSize = s;
            };
            opts.appendChild(btn);
        });
    } else {
        sizeSel.style.display = "none";
    }

    // Render Cores
    const colSel = document.getElementById("colorSelector");
    if (product.colors && product.colors.length > 0) {
        colSel.style.display = "flex";
        const opts = colSel.querySelector(".size-options");
        opts.innerHTML = "";
        product.colors.forEach(c => {
            const btn = document.createElement("button");
            btn.className = "size-option";
            btn.textContent = c;
            btn.onclick = () => {
                opts.querySelectorAll(".size-option").forEach(b => b.classList.remove("selected"));
                btn.classList.add("selected");
                State.selectedColor = c;
            };
            opts.appendChild(btn);
        });
    } else {
        colSel.style.display = "none";
    }

    this.renderGallery(product);

    // Botão Adicionar
    if(DOM.btnDetailAdd) {
        DOM.btnDetailAdd.onclick = (e) => {
            e.preventDefault();
            if(product.sizes?.length > 0 && !State.selectedSize) {
                UI.showToast("Selecione um tamanho!");
                return;
            }
            if(product.colors?.length > 0 && !State.selectedColor) {
                UI.showToast("Selecione uma cor!");
                return;
            }
            Cart.addItem(product.id, State.selectedSize, State.selectedColor);
            this.close();
            window.openCart();
        };
    }
  },

  renderGallery(product) {
    if(!product.media || product.media.length === 0) {
        DOM.mainMediaContainer.innerHTML = '<div style="width:100%;height:100%;background:#222"></div>';
        DOM.thumbsList.innerHTML = "";
        return;
    }
    this.setMainMedia(product.media[0]);
    
    DOM.thumbsList.innerHTML = "";
    product.media.forEach((m, i) => {
        const thumb = document.createElement(m.type === 'video' ? 'video' : 'img');
        thumb.src = m.data;
        thumb.className = `thumb ${i === 0 ? 'active' : ''}`;
        thumb.onclick = () => {
            State.currentGalleryIndex = i;
            this.setMainMedia(m);
            document.querySelectorAll(".thumb").forEach(t => t.classList.remove("active"));
            thumb.classList.add("active");
        };
        DOM.thumbsList.appendChild(thumb);
    });
  },

  setMainMedia(item) {
    if(item.type === 'video') {
        DOM.mainMediaContainer.innerHTML = `<video src="${item.data}" class="main-image" autoplay muted loop controls></video>`;
    } else {
        DOM.mainMediaContainer.innerHTML = `<img src="${item.data}" class="main-image">`;
    }
  }
};

// Funções globais para o HTML
window.navigateGallery = (dir) => {
    if(!State.currentProduct?.media) return;
    const len = State.currentProduct.media.length;
    State.currentGalleryIndex = (State.currentGalleryIndex + dir + len) % len;
    ProductDetail.setMainMedia(State.currentProduct.media[State.currentGalleryIndex]);
    
    document.querySelectorAll(".thumb").forEach((t, i) => {
        t.classList.toggle("active", i === State.currentGalleryIndex);
    });
};

window.closeProductDetail = () => ProductDetail.close();
window.openCart = () => DOM.cartModal.style.display = "flex";
window.closeCart = () => DOM.cartModal.style.display = "none";
window.checkoutWhatsApp = () => Cart.checkout();
window.clearCart = () => Cart.clear();
window.handleNewsletter = (e) => {
    e.preventDefault();
    UI.showToast("Inscrito com sucesso!");
    e.target.reset();
};

const Cart = {
  addItem(id, size, color) {
    const product = State.products.find(p => String(p.id) === String(id));
    if (!product) return;
    State.cart.push({ id, size, color });
    State.saveCart();
    UI.updateCartUI();
    UI.showToast("Adicionado ao carrinho!");
  },
  removeItem(index) {
    State.cart.splice(index, 1);
    State.saveCart();
    UI.updateCartUI();
  },
  clear() {
    if(confirm("Limpar carrinho?")) {
        State.cart = [];
        State.saveCart();
        UI.updateCartUI();
    }
  },
  checkout() {
    if (State.cart.length === 0) return UI.showToast("Carrinho vazio");
    let msg = "*PEDIDO VULTUS:*\n\n";
    let total = 0;
    State.cart.forEach(item => {
        const p = State.products.find(prod => String(prod.id) === String(item.id));
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
  }
};

// ============= INICIALIZAÇÃO E ADMIN =============
const App = {
  async init() {
    await State.init(); // Carrega Firebase e gera categorias
    
    // Destrava Loading Screen
    if (DOM.loadingScreen) {
        DOM.loadingScreen.classList.add("fade-out");
        setTimeout(() => {
            DOM.loadingScreen.style.display = "none";
        }, 500);
    }
    
    Navigation.init(); // Aqui ele vai desenhar o menu com as categorias novas
    Products.init();
    UI.updateCartUI();
    
    // Configura Atalhos
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            ProductDetail.close();
            window.closeCart();
            document.getElementById("adminModal").style.display = "none";
        }
    });

    // === LÓGICA RESTAURADA DO MODAL ADMIN ===
    this.setupAdminAccess();
  },

  setupAdminAccess() {
    const btnOpen = document.getElementById("btnAdminAccess");
    const modal = document.getElementById("adminModal");
    const input = document.getElementById("adminPassInput");
    const btnConfirm = document.getElementById("btnConfirmAdmin");
    const btnCancel = document.getElementById("btnCancelAdmin");

    // Função verificar
    const checkPassword = () => {
      if (input.value === "*K4m1k4z3") {
        UI.showToast("Acesso autorizado!");
        setTimeout(() => window.location.href = "admin.html", 500);
      } else {
        UI.showToast("Senha incorreta");
        input.value = "";
        input.focus();
        input.style.borderColor = "red";
        setTimeout(() => (input.style.borderColor = ""), 300);
      }
    };

    if (btnOpen) {
      btnOpen.addEventListener("click", () => {
        modal.style.display = "flex";
        input.value = "";
        setTimeout(() => input.focus(), 100);
      });
    }

    if (btnConfirm) btnConfirm.addEventListener("click", checkPassword);
    
    if (btnCancel) {
        btnCancel.addEventListener("click", () => {
            modal.style.display = "none";
        });
    }

    if (input) {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") checkPassword();
        if (e.key === "Escape") modal.style.display = "none";
      });
    }
    
    // Clicar fora fecha
    if(modal) {
        modal.addEventListener("click", (e) => {
            if(e.target === modal) modal.style.display = "none";
        });
    }
  }
};

// Start
document.addEventListener("DOMContentLoaded", () => App.init());
