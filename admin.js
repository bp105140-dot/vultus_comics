// ==========================================
// VULTUS ADMIN JS - FIREBASE EDITION (CORRIGIDO)
// ==========================================

import { db, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "./firebase.js";

// --- UI HELPERS ---
const toastContainer = document.createElement("div");
toastContainer.id = "toast-container";
document.body.appendChild(toastContainer);

function showToast(msg) {
  const toast = document.createElement("div");
  toast.className = "vultus-toast";
  toast.innerText = msg;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function showConfirm(title, msg, callback) {
  const overlay = document.createElement("div");
  overlay.className = "confirm-overlay";
  overlay.innerHTML = `
        <div class="confirm-box">
            <h3>${title}</h3><p>${msg}</p>
            <button class="btn-confirm-no">Cancelar</button>
            <button class="btn-confirm-yes">Confirmar</button>
        </div>
    `;
  document.body.appendChild(overlay);
  overlay.style.display = "flex";

  overlay.querySelector(".btn-confirm-yes").onclick = () => {
    callback();
    overlay.remove();
  };
  overlay.querySelector(".btn-confirm-no").onclick = () => overlay.remove();
}

// --- DADOS ---
let products = [];
let categories = JSON.parse(localStorage.getItem("vultus_categories")) || ["Camisetas", "Bonés", "Geral"];
let currentMediaFiles = [];

// Elementos
const tableBody = document.getElementById("adminProductsList");
const productModal = document.getElementById("productModal");
const categoryModal = document.getElementById("categoryModal");
const mediaInput = document.getElementById("mediaInput");
const previewContainer = document.getElementById("previewContainer");
const categorySelect = document.getElementById("prodCategory");

// --- FIREBASE LOAD ---
async function loadProducts() {
  tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Carregando da nuvem...</td></tr>';
  products = [];
  
  try {
    const querySnapshot = await getDocs(collection(db, "products"));
    querySnapshot.forEach((doc) => {
      products.push({ fireId: doc.id, ...doc.data() });
    });
    renderTable();
  } catch (error) {
    console.error("Erro Firebase:", error);
    showToast("Erro ao conectar com o banco.");
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red">Erro de conexão. Verifique o console.</td></tr>';
  }
}

// --- RENDER TABLE ---
function renderTable() {
  tableBody.innerHTML = "";
  if (products.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px">Nenhum produto cadastrado.</td></tr>';
    return;
  }
  
  products.sort((a, b) => a.name.localeCompare(b.name));

  products.forEach((p) => {
    let thumbContent = "";
    if (p.media && p.media.length > 0) {
      const first = p.media[0];
      if (first.type === "video") {
        thumbContent = '<div style="width:50px;height:50px;background:#333;display:flex;align-items:center;justify-content:center;color:#fff;">▶</div>';
      } else {
        thumbContent = `<img src="${first.data}" class="table-media" style="width:50px;height:50px;object-fit:cover;border:1px solid #333;">`;
      }
    }
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td>${thumbContent}</td>
            <td><strong>${p.name}</strong><br><small>${p.tag || ""}</small></td>
            <td>${p.category}</td>
            <td>R$ ${parseFloat(p.price).toFixed(2)}</td>
            <td>
                <button class="btn-action edit-btn" data-id="${p.fireId}">EDITAR</button>
                <button class="btn-action delete delete-btn" data-id="${p.fireId}">X</button>
            </td>
        `;
    tableBody.appendChild(tr);
  });

  // Atrela eventos aos botões da tabela
  document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => editProduct(btn.dataset.id));
  });
  document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteProduct(btn.dataset.id));
  });
}

function loadCategories() {
  categorySelect.innerHTML = '<option value="">Selecione...</option>';
  categories.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.innerText = c;
    categorySelect.appendChild(opt);
  });
}

// --- UPLOAD ---
mediaInput.addEventListener("change", function (e) {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;
  
  files.forEach((file) => {
    if (file.size > 800000) { 
        alert(`Imagem "${file.name}" muito grande! Máx 800KB.`);
        return;
    }
    const reader = new FileReader();
    reader.onload = function (readerEvent) {
      currentMediaFiles.push({
        type: file.type.startsWith("video") ? "video" : "image",
        data: readerEvent.target.result,
      });
      renderPreviews();
    };
    reader.readAsDataURL(file);
  });
});

function renderPreviews() {
  previewContainer.innerHTML = "";
  currentMediaFiles.forEach((media, index) => {
    const item = document.createElement("div");
    item.className = "preview-item";
    let html = media.type === "video" ? `<video src="${media.data}" muted></video>` : `<img src="${media.data}">`;
    
    const btn = document.createElement("button");
    btn.className = "remove-media-btn";
    btn.innerText = "X";
    btn.type = "button";
    btn.onclick = () => {
        currentMediaFiles.splice(index, 1);
        renderPreviews();
    };
    
    item.innerHTML = html;
    item.appendChild(btn);
    previewContainer.appendChild(item);
  });
}

// --- FUNÇÕES CRUD (Exportadas para window para segurança) ---

window.editProduct = (fireId) => {
  const p = products.find((x) => x.fireId === fireId);
  if (!p) return;

  document.getElementById("modalTitle").innerText = "Editar Produto";
  document.getElementById("productForm").dataset.mode = "edit";
  document.getElementById("productForm").dataset.fireId = fireId;

  document.getElementById("prodName").value = p.name;
  document.getElementById("prodCategory").value = p.category;
  document.getElementById("prodTag").value = p.tag;
  document.getElementById("prodPrice").value = p.price;
  document.getElementById("prodOldPrice").value = p.originalPrice;
  document.getElementById("prodDesc").value = p.description || "";
  document.getElementById("prodSpecs").value = p.specs || "";
  document.getElementById("prodSizes").value = p.sizes ? p.sizes.join(", ") : "";
  document.getElementById("prodColors").value = p.colors ? p.colors.join(", ") : "";

  currentMediaFiles = p.media || [];
  renderPreviews();
  loadCategories();
  productModal.style.display = "flex";
};

window.deleteProduct = (fireId) => {
  showConfirm("Excluir", "Tem certeza?", async () => {
    try {
        await deleteDoc(doc(db, "products", fireId));
        await loadProducts();
        showToast("Excluído com sucesso.");
    } catch (e) {
        console.error(e);
        showToast("Erro ao excluir.");
    }
  });
};

// --- LISTENERS DE INICIALIZAÇÃO ---
document.addEventListener("DOMContentLoaded", () => {
    
    // Botão Novo Produto
    const btnNew = document.getElementById("btnNewProduct");
    if(btnNew) {
        btnNew.addEventListener("click", () => {
            document.getElementById("modalTitle").innerText = "Novo Produto";
            document.getElementById("productForm").reset();
            document.getElementById("productForm").dataset.mode = "new";
            delete document.getElementById("productForm").dataset.fireId;
            currentMediaFiles = [];
            renderPreviews();
            loadCategories();
            productModal.style.display = "flex";
        });
    }

    // Botões de Segmentos (Menu e Header)
    const openCats = () => {
        document.getElementById("catInput").value = categories.join(", ");
        categoryModal.style.display = "flex";
    };
    
    const btnSegHeader = document.getElementById("btnSegmentsHeader");
    const btnSegNav = document.getElementById("navSegmentos");
    
    if(btnSegHeader) btnSegHeader.addEventListener("click", openCats);
    if(btnSegNav) btnSegNav.addEventListener("click", openCats);

    // Botões Fechar Modais
    document.querySelectorAll(".close-modal, .close-modal-btn").forEach(b => {
        b.addEventListener("click", () => productModal.style.display = "none");
    });
    
    document.querySelectorAll(".close-cat-btn").forEach(b => {
        b.addEventListener("click", () => categoryModal.style.display = "none");
    });

    // Salvar Produto
    document.getElementById("productForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        if (currentMediaFiles.length === 0) {
            showToast("Adicione mídia!");
            return;
        }
        showToast("Salvando...");

        const mode = e.target.dataset.mode;
        const fireId = e.target.dataset.fireId;
        
        const sizesInput = document.getElementById("prodSizes").value;
        const colorsInput = document.getElementById("prodColors").value;

        const productData = {
            id: Date.now(),
            name: document.getElementById("prodName").value,
            category: document.getElementById("prodCategory").value,
            tag: document.getElementById("prodTag").value,
            price: parseFloat(document.getElementById("prodPrice").value),
            originalPrice: parseFloat(document.getElementById("prodOldPrice").value) || 0,
            description: document.getElementById("prodDesc").value,
            specs: document.getElementById("prodSpecs").value,
            sizes: sizesInput ? sizesInput.split(",").map(s => s.trim()).filter(s => s) : [],
            colors: colorsInput ? colorsInput.split(",").map(s => s.trim()).filter(s => s) : [],
            media: currentMediaFiles,
            updatedAt: new Date()
        };

        try {
            if (mode === "edit" && fireId) {
                delete productData.id; 
                await updateDoc(doc(db, "products", fireId), productData);
                showToast("Atualizado!");
            } else {
                await addDoc(collection(db, "products"), productData);
                showToast("Criado!");
            }
            productModal.style.display = "none";
            await loadProducts();
        } catch (err) {
            console.error(err);
            showToast("Erro ao salvar (verifique tamanho da imagem).");
        }
    });

    // Salvar Categorias
    document.getElementById("categoryForm").onsubmit = (e) => {
        e.preventDefault();
        categories = document.getElementById("catInput").value.split(",").map(s => s.trim()).filter(s => s);
        localStorage.setItem("vultus_categories", JSON.stringify(categories));
        categoryModal.style.display = "none";
        showToast("Categorias Atualizadas");
    };

    // Iniciar
    loadProducts();
});
