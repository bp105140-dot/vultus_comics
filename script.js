// ==========================================
// VULTUS STORE - FIREBASE EDITION
// ==========================================

// Importa o Firebase para ler os dados
import { db, collection, getDocs } from "./firebase.js";

"use strict";

const CONFIG = {
  whatsappNumber: "5511984006656",
  storageKeys: {
    cart: "vultus_cart",
  },
  lazyLoad: {
    rootMargin: "50px",
    threshold: 0.1,
  },
};

const State = {
  products: [],
  categories: ["Geral"], // Categorias podem vir do banco depois, por enquanto fixo
  cart: [],
  currentFilter: "all",
  currentSort: "default",
  currentProduct: null,
  currentGalleryIndex: 0,
  selectedSize: null,
  selectedColor: null,

  // Agora a inicialização espera o banco de dados responder
  async init() {
    await this.loadData(); // <--- AQUI BUSCA DO FIREBASE
    this.loadCart();
  },

  // Busca produtos no Firebase
  async loadData() {
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        this.products = [];
        querySnapshot.forEach((doc) => {
            // Guarda os dados do produto + ID
            this.products.push(doc.data());
        });
        console.log("Produtos carregados:", this.products.length);
    } catch (e) {
        console.error("Erro ao carregar produtos:", e);
        // Fallback: Tenta carregar do localStorage antigo se der erro
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
    return parseFloat(value).toFixed(2).replace(".", ",");
  },
  sanitizeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
};

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
  showToast(message, duration = 3000) {
    const toast = document.createElement("div");
    toast.className = "vultus-toast";
    toast.textContent = message;
    DOM.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = "slideInRight 0.3s ease reverse";
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  showLoading() {
    if (DOM.productsSkeleton) DOM.productsSkeleton.style.display = "grid";
    if (DOM.productsGrid) DOM.productsGrid.style.opacity = "0.5";
  },

  hideLoading() {
    if (DOM.productsSkeleton) DOM.productsSkeleton.style.display = "none";
    if (DOM.productsGrid) DOM.productsGrid.style.opacity = "1";
  },

  updateCartUI() {
    if (DOM.cartCount) {
      DOM.cartCount.textContent = State.cart.length;
      if (State.cart.length > 0) {
        DOM.cartCount.style.animation = "pulse 0.3s ease";
        setTimeout(() => DOM.cartCount.style.animation = "", 300);
      }
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
      const id = cartItem.id || cartItem;
      const size = cartItem.size;
      const color = cartItem.color;

      const item = State.products.find((p) => p.id === id);
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
            <div>${badges}</div>
            <button class="btn-remove" data-index="${index}">Remover</button>
          </div>
        </div>
      `;
    });

    DOM.cartItems.innerHTML = html;
    DOM.cartTotal.textContent = `R$ ${Utils.formatPrice(total)}`;

    DOM.cartItems.querySelectorAll(".btn-remove").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const index = parseInt(e.target.dataset.index);
        Cart.removeItem(index);
      });
    });
  },
};

const Navigation = {
  init() {
    this.renderMenu();
    this.attachEventListeners();
    
    // Header scroll effect
    window.addEventListener("scroll", () => {
        if (window.pageYOffset > 50) DOM.mainHeader.classList.add("scrolled");
        else DOM.mainHeader.classList.remove("scrolled");
    });
  },

  renderMenu() {
    if (!DOM.dynamicMenu) return;
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
    if (DOM.mainNav.classList.contains("active")) this.toggleMobileMenu();
    Products.render();
    document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth" });
  },

  toggleMobileMenu() {
    DOM.mainNav.classList.toggle("active");
    DOM.mobileMenuToggle.classList.toggle("active");
  },

  attachEventListeners() {
    DOM.mobileMenuToggle?.addEventListener("click", () => this.toggleMobileMenu());
    DOM.sortSelect?.addEventListener("change", (e) => {
        State.currentSort = e.target.value;
        Products.render();
    });
  }
};

const Products = {
  init() {
    this.render();
  },

  getFilteredAndSorted() {
    let filtered = [...State.products];
    if (State.currentFilter !== "all") {
      filtered = filtered.filter((p) => p.category === State.currentFilter);
    }
    // Ordenação básica
    if (State.currentSort === 'price-asc') filtered.sort((a, b) => a.price - b.price);
    if (State.currentSort === 'price-desc') filtered.sort((a, b) => b.price - a.price);
    if (State.currentSort === 'name-asc') filtered.sort((a, b) => a.name.localeCompare(b.name));
    
    return filtered;
  },

  render() {
    if (!DOM.productsGrid) return;
    UI.showLoading();
    
    const products = this.getFilteredAndSorted();

    // Pequeno delay para garantir que o DOM atualize
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
      
      // Lógica de Mídia (Imagem/Video)
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
        <button class="btn-add-to-cart">Adicionar</button>
      `;

      // Eventos
      card.querySelector(".product-image-container").onclick = () => ProductDetail.open(product.id);
      card.querySelector(".product-info-area").onclick = () => ProductDetail.open(product.id);
      card.querySelector(".btn-add-to-cart").onclick = (e) => {
          e.stopPropagation();
          ProductDetail.open(product.id); // Abre modal para escolher tamanho/cor
      };

      fragment.appendChild(card);
    });
    
    DOM.productsGrid.appendChild(fragment);
  }
};

const ProductDetail = {
  open(productId) {
    const product = State.products.find((p) => p.id === productId);
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

    // Tamanhos
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

    // Cores
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

    DOM.btnDetailAdd.onclick = () => {
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
        openCart();
    };
  },

  renderGallery(product) {
    if(!product.media || product.media.length === 0) return;
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

const Cart = {
  addItem(id, size, color) {
    const product = State.products.find(p => p.id === id);
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
        const p = State.products.find(prod => prod.id === item.id);
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

// Globais para HTML
window.openCart = () => DOM.cartModal.style.display = "flex";
window.closeCart = () => DOM.cartModal.style.display = "none";
window.checkoutWhatsApp = () => Cart.checkout();
window.clearCart = () => Cart.clear();
window.handleNewsletter = (e) => {
    e.preventDefault();
    UI.showToast("Inscrito com sucesso!");
    e.target.reset();
};

// Iniciar a aplicação
document.addEventListener("DOMContentLoaded", () => App.init());

// Lógica Admin (Botão e Modal)
const setupAdmin = () => {
    const btn = document.getElementById("btnAdminAccess");
    const modal = document.getElementById("adminModal");
    const input = document.getElementById("adminPassInput");
    
    if(btn) {
        btn.onclick = () => {
            modal.style.display = "flex";
            setTimeout(() => input.focus(), 100);
        };
    }
    
    document.getElementById("btnConfirmAdmin")?.addEventListener("click", () => {
        if(input.value === "*K4m1k4z3") {
            window.location.href = "admin.html";
        } else {
            UI.showToast("Senha incorreta");
            input.value = "";
        }
    });
    
    document.getElementById("btnCancelAdmin")?.addEventListener("click", () => {
        modal.style.display = "none";
    });
};
setupAdmin();
