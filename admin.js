// ==========================================
// VULTUS ADMIN JS - COM GESTÃO DE TAMANHOS E CORES
// ==========================================

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
let products = JSON.parse(localStorage.getItem("vultus_products")) || [];
let categories = JSON.parse(localStorage.getItem("vultus_categories")) || [
  "Camisetas",
  "Bonés",
];
let currentMediaFiles = [];

// Elementos
const tableBody = document.getElementById("adminProductsList");
const productModal = document.getElementById("productModal");
const mediaInput = document.getElementById("mediaInput");
const previewContainer = document.getElementById("previewContainer");
const categorySelect = document.getElementById("prodCategory");

// --- RENDERIZAR TABELA ---
function renderTable() {
  tableBody.innerHTML = "";
  if (products.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="5" style="text-align:center; padding:20px">Nenhum produto.</td></tr>';
    return;
  }
  products.forEach((p) => {
    let thumbContent = "";
    if (p.media && p.media.length > 0) {
      const first = p.media[0];
      if (first.type === "video") {
        thumbContent =
          '<div style="width:50px;height:50px;background:#333;display:flex;align-items:center;justify-content:center;color:#fff;">▶</div>';
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
                <button class="btn-action" onclick="editProduct(${p.id})">EDITAR</button>
                <button class="btn-action delete" onclick="deleteProduct(${p.id})">X</button>
            </td>
        `;
    tableBody.appendChild(tr);
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
    let html =
      media.type === "video"
        ? `<video src="${media.data}" muted></video>`
        : `<img src="${media.data}">`;
    html += `<button type="button" class="remove-media-btn" onclick="removeMedia(${index})">X</button>`;
    item.innerHTML = html;
    previewContainer.appendChild(item);
  });
}

window.removeMedia = (index) => {
  currentMediaFiles.splice(index, 1);
  renderPreviews();
};

// --- CRUD ---
document.getElementById("btnNewProduct").onclick = () => {
  document.getElementById("modalTitle").innerText = "Novo Produto";
  document.getElementById("productForm").reset();
  document.getElementById("prodId").value = "";
  currentMediaFiles = [];
  renderPreviews();
  loadCategories();
  productModal.style.display = "flex";
};

window.editProduct = (id) => {
  const p = products.find((x) => x.id === id);
  if (!p) return;
  document.getElementById("modalTitle").innerText = "Editar Produto";
  document.getElementById("prodId").value = p.id;
  document.getElementById("prodName").value = p.name;
  document.getElementById("prodCategory").value = p.category;
  document.getElementById("prodTag").value = p.tag;
  document.getElementById("prodPrice").value = p.price;
  document.getElementById("prodOldPrice").value = p.originalPrice;

  // Carrega Descrição e Specs
  document.getElementById("prodDesc").value = p.description || "";
  document.getElementById("prodSpecs").value = p.specs || "";

  // NOVO: Carrega Tamanhos e Cores (converte array para texto)
  document.getElementById("prodSizes").value = p.sizes
    ? p.sizes.join(", ")
    : "";
  document.getElementById("prodColors").value = p.colors
    ? p.colors.join(", ")
    : "";

  currentMediaFiles = p.media || [];
  renderPreviews();
  loadCategories();
  productModal.style.display = "flex";
};

document.getElementById("productForm").addEventListener("submit", (e) => {
  e.preventDefault();
  if (currentMediaFiles.length === 0) {
    showToast("Adicione mídia!");
    return;
  }

  const id = document.getElementById("prodId").value;
  const isEdit = id !== "";

  // Processa Tamanhos e Cores
  const sizesInput = document.getElementById("prodSizes").value;
  const sizesList = sizesInput
    ? sizesInput
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s !== "")
    : [];

  const colorsInput = document.getElementById("prodColors").value;
  const colorsList = colorsInput
    ? colorsInput
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s !== "")
    : [];

  const newProd = {
    id: isEdit ? parseInt(id) : Date.now(),
    name: document.getElementById("prodName").value,
    category: document.getElementById("prodCategory").value,
    tag: document.getElementById("prodTag").value,
    price: parseFloat(document.getElementById("prodPrice").value),
    originalPrice:
      parseFloat(document.getElementById("prodOldPrice").value) || 0,
    description: document.getElementById("prodDesc").value,
    specs: document.getElementById("prodSpecs").value,
    sizes: sizesList, // <--- Salva lista de tamanhos
    colors: colorsList, // <--- Salva lista de cores
    media: currentMediaFiles,
  };

  if (isEdit) {
    const idx = products.findIndex((x) => x.id == id);
    products[idx] = newProd;
  } else {
    products.push(newProd);
  }

  try {
    localStorage.setItem("vultus_products", JSON.stringify(products));
    productModal.style.display = "none";
    renderTable();
    showToast("Salvo com sucesso!");
  } catch (err) {
    showToast("Erro: Imagens muito pesadas!");
  }
});

window.deleteProduct = (id) => {
  showConfirm("Excluir", "Tem certeza?", () => {
    products = products.filter((x) => x.id !== id);
    localStorage.setItem("vultus_products", JSON.stringify(products));
    renderTable();
  });
};

// --- Utils ---
const catModal = document.getElementById("categoryModal");
window.manageCategories = () => {
  document.getElementById("catInput").value = categories.join(", ");
  catModal.style.display = "flex";
};
window.closeCategoryModal = () => (catModal.style.display = "none");
document.querySelectorAll(".close-modal, .close-modal-btn").forEach((b) => {
  b.onclick = () => {
    productModal.style.display = "none";
    catModal.style.display = "none";
  };
});
document.getElementById("categoryForm").onsubmit = (e) => {
  e.preventDefault();
  categories = document
    .getElementById("catInput")
    .value.split(",")
    .map((s) => s.trim())
    .filter((s) => s);
  localStorage.setItem("vultus_categories", JSON.stringify(categories));
  closeCategoryModal();
  showToast("Categorias Atualizadas");
};

renderTable();
