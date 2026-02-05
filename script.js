// ==========================================
// VULTUS STORE - PROFESSIONAL EDITION
// Modern ES6+ | Optimized Performance
// ==========================================

"use strict";

// ============= CONFIGURATION =============
const CONFIG = {
  whatsappNumber: "5511999999999",
  storageKeys: {
    products: "vultus_products",
    categories: "vultus_categories",
    cart: "vultus_cart",
  },
  animation: {
    duration: 300,
    delay: 100,
  },
  lazyLoad: {
    rootMargin: "50px",
    threshold: 0.1,
  },
};

// ============= STATE MANAGEMENT =============
const State = {
  products: [],
  categories: ["Geral"],
  cart: [], // Agora armazenará apenas IDs (ex: [123, 456])
  currentFilter: "all",
  currentSort: "default",
  currentProduct: null,
  currentGalleryIndex: 0,

  init() {
    this.loadFromStorage();
  },

  loadFromStorage() {
    this.products =
      JSON.parse(localStorage.getItem(CONFIG.storageKeys.products)) || [];
    this.categories = JSON.parse(
      localStorage.getItem(CONFIG.storageKeys.categories),
    ) || ["Geral"];
    this.cart = JSON.parse(localStorage.getItem(CONFIG.storageKeys.cart)) || [];
  },

  saveCart() {
    try {
      localStorage.setItem(CONFIG.storageKeys.cart, JSON.stringify(this.cart));
    } catch (e) {
      console.error("Erro ao salvar carrinho:", e);
      alert(
        "A memória do navegador está cheia. Tente limpar alguns produtos antigos.",
      );
    }
  },
};

// ============= UTILITY FUNCTIONS =============
const Utils = {
  formatPrice(value) {
    return parseFloat(value).toFixed(2).replace(".", ",");
  },

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  throttle(func, limit) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  sanitizeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  },

  generateId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
  },
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

// ============= UI COMPONENTS =============
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
    if (DOM.productsSkeleton) {
      DOM.productsSkeleton.style.display = "grid";
    }
    if (DOM.productsGrid) {
      DOM.productsGrid.style.opacity = "0.5";
    }
  },

  hideLoading() {
    if (DOM.productsSkeleton) {
      DOM.productsSkeleton.style.display = "none";
    }
    if (DOM.productsGrid) {
      DOM.productsGrid.style.opacity = "1";
    }
  },

  updateCartUI() {
    if (DOM.cartCount) {
      DOM.cartCount.textContent = State.cart.length;
      if (State.cart.length > 0) {
        DOM.cartCount.style.animation = "pulse 0.3s ease";
        setTimeout(() => {
          DOM.cartCount.style.animation = "";
        }, 300);
      }
    }
    this.renderCartItems();
  },

  renderCartItems() {
    if (!DOM.cartItems || !DOM.cartTotal) return;

    if (State.cart.length === 0) {
      DOM.cartItems.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #888;">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin: 0 auto 1rem;">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <p>Seu carrinho está vazio</p>
        </div>
      `;
      DOM.cartTotal.textContent = "R$ 0,00";
      return;
    }

    let html = "";
    let total = 0;

    // AQUI ESTÁ A MÁGICA: Usamos o ID salvo no carrinho para buscar
    // o produto completo na lista de produtos (State.products)
    State.cart.forEach((cartItemId, index) => {
      const item = State.products.find((p) => p.id === cartItemId);

      // Se por acaso o produto foi deletado da loja, ignoramos
      if (!item) return;

      total += parseFloat(item.price);
      const thumbnail = item.media && item.media[0] ? item.media[0].data : "";

      html += `
        <div class="cart-item">
          <img src="${thumbnail}" alt="${Utils.sanitizeHTML(item.name)}" loading="lazy">
          <div class="cart-item-info">
            <h4>${Utils.sanitizeHTML(item.name)}</h4>
            <p>R$ ${Utils.formatPrice(item.price)}</p>
            <button class="btn-remove" data-index="${index}">Remover</button>
          </div>
        </div>
      `;
    });

    DOM.cartItems.innerHTML = html;
    DOM.cartTotal.textContent = `R$ ${Utils.formatPrice(total)}`;

    // Attach event listeners to remove buttons
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
    this.attachEventListeners();
    this.setupScrollBehavior();
  },

  renderMenu() {
    if (!DOM.dynamicMenu) return;

    const menuItems = [
      { label: "Todos", value: "all" },
      ...State.categories.map((cat) => ({ label: cat, value: cat })),
    ];

    DOM.dynamicMenu.innerHTML = menuItems
      .map(
        (item) => `
        <li>
          <a href="#" class="nav-item ${item.value === "all" ? "active" : ""}" data-category="${item.value}">
            ${item.label}
          </a>
        </li>
      `,
      )
      .join("");

    // Attach click handlers
    DOM.dynamicMenu.querySelectorAll(".nav-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        this.handleCategoryChange(e.target.dataset.category);
      });
    });
  },

  handleCategoryChange(category) {
    State.currentFilter = category;

    // Update active state
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.category === category);
    });

    // Close mobile menu if open
    if (DOM.mainNav.classList.contains("active")) {
      this.toggleMobileMenu();
    }

    Products.render();

    // Scroll para a seção de produtos
    const productsSection = document.getElementById("produtos");
    if (productsSection) {
      setTimeout(() => {
        productsSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  },

  toggleMobileMenu() {
    if (DOM.mobileMenuToggle && DOM.mainNav) {
      const isActive = DOM.mainNav.classList.toggle("active");
      DOM.mobileMenuToggle.classList.toggle("active");
      DOM.mobileMenuToggle.setAttribute("aria-expanded", isActive);

      // Prevent body scroll when menu is open
      document.body.style.overflow = isActive ? "hidden" : "";
    }
  },

  attachEventListeners() {
    // Mobile menu toggle
    if (DOM.mobileMenuToggle) {
      DOM.mobileMenuToggle.addEventListener("click", () =>
        this.toggleMobileMenu(),
      );
    }

    // Close menu on overlay click
    if (DOM.mainNav) {
      DOM.mainNav.addEventListener("click", (e) => {
        if (
          e.target === DOM.mainNav &&
          DOM.mainNav.classList.contains("active")
        ) {
          this.toggleMobileMenu();
        }
      });
    }

    // Sort select
    if (DOM.sortSelect) {
      DOM.sortSelect.addEventListener("change", (e) => {
        State.currentSort = e.target.value;
        Products.render();
      });
    }
  },

  setupScrollBehavior() {
    let lastScroll = 0;

    const handleScroll = Utils.throttle(() => {
      const currentScroll = window.pageYOffset;

      if (DOM.mainHeader) {
        if (currentScroll > 100) {
          DOM.mainHeader.classList.add("scrolled");
        } else {
          DOM.mainHeader.classList.remove("scrolled");
        }
      }

      lastScroll = currentScroll;
    }, 100);

    window.addEventListener("scroll", handleScroll);
  },
};

// ============= PRODUCTS =============
const Products = {
  init() {
    this.render();
  },

  getFilteredAndSorted() {
    let filtered = [...State.products];

    // Filter by category
    if (State.currentFilter !== "all") {
      filtered = filtered.filter((p) => p.category === State.currentFilter);
    }

    // Sort
    switch (State.currentSort) {
      case "price-asc":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "name-asc":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        filtered.sort((a, b) => b.name.localeCompare(a.name));
        break;
    }

    return filtered;
  },

  render() {
    if (!DOM.productsGrid) return;

    UI.showLoading();

    const products = this.getFilteredAndSorted();

    // Use requestAnimationFrame for smooth rendering
    requestAnimationFrame(() => {
      if (products.length === 0) {
        DOM.productsGrid.innerHTML = "";
        if (DOM.emptyState) {
          DOM.emptyState.style.display = "block";
        }
      } else {
        if (DOM.emptyState) {
          DOM.emptyState.style.display = "none";
        }
        this.renderProductCards(products);
      }

      UI.hideLoading();
    });
  },

  renderProductCards(products) {
    const fragment = document.createDocumentFragment();

    products.forEach((product) => {
      const card = this.createProductCard(product);
      fragment.appendChild(card);
    });

    DOM.productsGrid.innerHTML = "";
    DOM.productsGrid.appendChild(fragment);

    // Setup lazy loading for images
    this.setupLazyLoading();
  },

  createProductCard(product) {
    const card = document.createElement("div");
    card.className = "product-card";
    card.setAttribute("role", "article");
    card.setAttribute("data-product-id", product.id);

    let mediaHtml = "";
    if (product.media && product.media.length > 0) {
      const first = product.media[0];
      const second = product.media.length > 1 ? product.media[1] : first;

      const getMediaTag = (item, className) => {
        if (item.type === "video") {
          return `<video src="${item.data}" class="product-image ${className}" autoplay muted loop playsinline loading="lazy"></video>`;
        }
        return `<img data-src="${item.data}" class="product-image ${className} lazy" alt="${Utils.sanitizeHTML(product.name)}">`;
      };

      mediaHtml = `
        <div class="product-image-container">
          ${getMediaTag(first, "img-front")}
          ${getMediaTag(second, "img-back")}
        </div>
      `;
    } else {
      mediaHtml =
        '<div class="product-image-container" style="background:#222"></div>';
    }

    card.innerHTML = `
      ${product.tag ? `<span class="product-tag">${Utils.sanitizeHTML(product.tag)}</span>` : ""}
      ${mediaHtml}
      <div class="product-info-area">
        <h3 class="product-name">${Utils.sanitizeHTML(product.name)}</h3>
        <div class="price-box">
          ${product.originalPrice ? `<span class="old-price">R$ ${Utils.formatPrice(product.originalPrice)}</span>` : ""}
          <span class="current-price">R$ ${Utils.formatPrice(product.price)}</span>
        </div>
      </div>
      <button class="btn-add-to-cart" data-product-id="${product.id}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 2L9 6M15 2L15 6M6 6H18C19.1046 6 20 6.89543 20 8V19C20 20.1046 19.1046 21 18 21H6C4.89543 21 4 20.1046 4 19V8C4 6.89543 4.89543 6 6 6Z"/>
        </svg>
        Adicionar
      </button>
    `;

    // Event listeners
    const imageContainer = card.querySelector(".product-image-container");
    const infoArea = card.querySelector(".product-info-area");
    const addBtn = card.querySelector(".btn-add-to-cart");

    // Abrir detalhes ao clicar na imagem ou info
    if (imageContainer) {
      imageContainer.addEventListener("click", (e) => {
        e.stopPropagation();
        ProductDetail.open(product.id);
      });
    }

    if (infoArea) {
      infoArea.addEventListener("click", (e) => {
        e.stopPropagation();
        ProductDetail.open(product.id);
      });
    }

    // Adicionar ao carrinho
    if (addBtn) {
      addBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        Cart.addItem(product.id);
        openCart();
      });
    }

    return card;
  },

  setupLazyLoading() {
    const lazyImages = document.querySelectorAll("img.lazy");

    if ("IntersectionObserver" in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.remove("lazy");
            imageObserver.unobserve(img);
          }
        });
      }, CONFIG.lazyLoad);

      lazyImages.forEach((img) => imageObserver.observe(img));
    } else {
      // Fallback for browsers without IntersectionObserver
      lazyImages.forEach((img) => {
        img.src = img.dataset.src;
        img.classList.remove("lazy");
      });
    }
  },
};

// ============= PRODUCT DETAIL =============
const ProductDetail = {
  open(productId) {
    const product = State.products.find((p) => p.id === productId);
    if (!product) return;

    State.currentProduct = product;
    State.currentGalleryIndex = 0;

    this.render(product);

    if (DOM.productDetailModal) {
      DOM.productDetailModal.style.display = "flex";
      document.body.style.overflow = "hidden";

      // Animate in
      requestAnimationFrame(() => {
        DOM.productDetailModal.querySelector(
          ".detail-container",
        ).style.animation = "fadeInUp 0.3s ease";
      });
    }
  },

  close() {
    if (DOM.productDetailModal) {
      const container =
        DOM.productDetailModal.querySelector(".detail-container");
      container.style.animation = "fadeInUp 0.3s ease reverse";

      setTimeout(() => {
        DOM.productDetailModal.style.display = "none";
        document.body.style.overflow = "";
      }, 300);
    }
  },

  render(product) {
    // Update text content
    if (DOM.detailName) DOM.detailName.textContent = product.name;
    if (DOM.detailCat) DOM.detailCat.textContent = product.category || "GERAL";
    if (DOM.detailPrice)
      DOM.detailPrice.textContent = `R$ ${Utils.formatPrice(product.price)}`;

    if (DOM.detailOldPrice) {
      if (product.originalPrice) {
        DOM.detailOldPrice.textContent = `R$ ${Utils.formatPrice(product.originalPrice)}`;
        DOM.detailOldPrice.style.display = "inline";
      } else {
        DOM.detailOldPrice.style.display = "none";
      }
    }

    if (DOM.detailDesc) {
      DOM.detailDesc.textContent =
        product.description || "Sem descrição disponível.";
    }

    if (DOM.detailSpecs) {
      DOM.detailSpecs.textContent =
        product.specs || "Informações não disponíveis.";
    }

    // Setup gallery
    this.renderGallery(product);

    // Setup add to cart button
    if (DOM.btnDetailAdd) {
      DOM.btnDetailAdd.onclick = (e) => {
        e.preventDefault();
        Cart.addItem(product.id);
        this.close();
        openCart();
      };
    }
  },

  renderGallery(product) {
    if (!product.media || product.media.length === 0) {
      if (DOM.mainMediaContainer) {
        DOM.mainMediaContainer.innerHTML =
          '<div style="width:100%;aspect-ratio:3/4;background:#222"></div>';
      }
      if (DOM.thumbsList) {
        DOM.thumbsList.innerHTML = "";
      }
      return;
    }

    // Render main image
    this.setMainMedia(product.media[State.currentGalleryIndex]);

    // Render thumbnails
    if (DOM.thumbsList) {
      DOM.thumbsList.innerHTML = "";

      product.media.forEach((media, index) => {
        const thumb = document.createElement(
          media.type === "video" ? "video" : "img",
        );
        thumb.src = media.data;
        thumb.className = `thumb ${index === State.currentGalleryIndex ? "active" : ""}`;
        thumb.setAttribute("loading", "lazy");

        thumb.addEventListener("click", () => {
          State.currentGalleryIndex = index;
          this.setMainMedia(media);

          // Update active thumbnail
          DOM.thumbsList.querySelectorAll(".thumb").forEach((t, i) => {
            t.classList.toggle("active", i === index);
          });
        });

        DOM.thumbsList.appendChild(thumb);
      });
    }
  },

  setMainMedia(mediaItem) {
    if (!DOM.mainMediaContainer) return;

    if (mediaItem.type === "video") {
      DOM.mainMediaContainer.innerHTML = `
        <video src="${mediaItem.data}" class="main-image" autoplay muted loop controls style="object-fit: contain; object-position: center;">
          Seu navegador não suporta vídeos.
        </video>
      `;
    } else {
      DOM.mainMediaContainer.innerHTML = `
        <img src="${mediaItem.data}" class="main-image" alt="Produto" loading="eager" style="object-fit: contain; object-position: center;">
      `;
    }
  },
};

// Navigate gallery function (called by navigation buttons)
window.navigateGallery = function (direction) {
  if (!State.currentProduct || !State.currentProduct.media) return;

  const totalMedia = State.currentProduct.media.length;
  State.currentGalleryIndex =
    (State.currentGalleryIndex + direction + totalMedia) % totalMedia;

  ProductDetail.setMainMedia(
    State.currentProduct.media[State.currentGalleryIndex],
  );

  // Update active thumbnail
  if (DOM.thumbsList) {
    DOM.thumbsList.querySelectorAll(".thumb").forEach((thumb, index) => {
      thumb.classList.toggle("active", index === State.currentGalleryIndex);
    });
  }
};

// Close product detail function (called by close button)
window.closeProductDetail = function () {
  ProductDetail.close();
};

// ============= CART (OTIMIZADO) =============
const Cart = {
  addItem(productId) {
    const product = State.products.find((p) => p.id === productId);
    if (!product) return;

    // CORREÇÃO CRÍTICA:
    // Salvamos apenas o ID do produto, não o objeto inteiro com imagens.
    // Isso evita o erro QuotaExceededError.
    State.cart.push(product.id);
    State.saveCart();
    UI.updateCartUI();
    UI.showToast(`"${product.name}" adicionado ao carrinho!`);
  },

  removeItem(index) {
    // Como State.cart agora é um array de IDs, removemos pelo index normalmente
    const removedId = State.cart[index];
    const removedItem = State.products.find((p) => p.id === removedId);

    State.cart.splice(index, 1);
    State.saveCart();
    UI.updateCartUI();

    if (removedItem) {
      UI.showToast(`"${removedItem.name}" removido do carrinho`);
    } else {
      UI.showToast("Item removido");
    }
  },

  clear() {
    if (State.cart.length === 0) return;

    if (confirm("Deseja realmente limpar o carrinho?")) {
      State.cart = [];
      State.saveCart();
      UI.updateCartUI();
      UI.showToast("Carrinho limpo");
    }
  },

  checkout() {
    if (State.cart.length === 0) {
      UI.showToast("Seu carrinho está vazio");
      return;
    }

    let message = "*PEDIDO VULTUS:*\n\n";
    let total = 0;

    State.cart.forEach((cartItemId) => {
      const item = State.products.find((p) => p.id === cartItemId);
      if (!item) return;

      message += `▪ ${item.name} - R$ ${Utils.formatPrice(item.price)}\n`;
      total += parseFloat(item.price);
    });

    message += `\n*TOTAL: R$ ${Utils.formatPrice(total)}*`;

    const whatsappUrl = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  },
};

// Global cart functions
window.openCart = function () {
  if (DOM.cartModal) {
    DOM.cartModal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }
};

window.closeCart = function () {
  if (DOM.cartModal) {
    DOM.cartModal.style.display = "none";
    document.body.style.overflow = "";
  }
};

window.checkoutWhatsApp = function () {
  Cart.checkout();
};

window.clearCart = function () {
  Cart.clear();
};

// ============= NEWSLETTER =============
window.handleNewsletter = function (event) {
  event.preventDefault();
  const email = event.target.querySelector('input[type="email"]').value;

  if (email) {
    UI.showToast(
      "Obrigado por se inscrever! Em breve você receberá nossas novidades.",
    );
    event.target.reset();
  }
};

// ============= INITIALIZATION =============
const App = {
  init() {
    // Initialize state
    State.init();

    // Hide loading screen
    if (DOM.loadingScreen) {
      setTimeout(() => {
        DOM.loadingScreen.classList.add("fade-out");
        setTimeout(() => {
          DOM.loadingScreen.style.display = "none";
        }, 500);
      }, 1000);
    }

    // Initialize modules
    Navigation.init();
    Products.init();
    UI.updateCartUI();

    // Setup keyboard shortcuts
    this.setupKeyboardShortcuts();

    // Setup performance monitoring
    this.monitorPerformance();

    console.log("🚀 Vultus Store initialized successfully!");
  },

  setupKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      // ESC to close modals
      if (e.key === "Escape") {
        if (DOM.productDetailModal?.style.display === "flex") {
          ProductDetail.close();
        }
        if (DOM.cartModal?.style.display === "flex") {
          closeCart();
        }
        if (DOM.mainNav?.classList.contains("active")) {
          Navigation.toggleMobileMenu();
        }
      }

      // Ctrl/Cmd + K to open cart
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        openCart();
      }
    });
  },

  monitorPerformance() {
    if ("PerformanceObserver" in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === "largest-contentful-paint") {
              console.log("LCP:", entry.startTime);
            }
          }
        });
        observer.observe({ entryTypes: ["largest-contentful-paint"] });
      } catch (e) {
        // PerformanceObserver not fully supported
      }
    }
  },
};

// ============= START APPLICATION =============
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => App.init());
} else {
  App.init();
}

// ============= SERVICE WORKER REGISTRATION =============
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    // Uncomment to enable PWA functionality
    // navigator.serviceWorker.register('/sw.js')
    //   .then(reg => console.log('Service Worker registered'))
    //   .catch(err => console.log('Service Worker registration failed'));
  });
}

// ============= ERROR HANDLING =============
window.addEventListener("error", (e) => {
  console.error("Global error:", e.error);
});

window.addEventListener("unhandledrejection", (e) => {
  console.error("Unhandled promise rejection:", e.reason);
});
