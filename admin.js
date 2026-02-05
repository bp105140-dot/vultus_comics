// ==========================================
// VULTUS ADMIN JS - FIREBASE EDITION
// ==========================================

// 1. Importa as ferramentas do nosso arquivo de conexão
import { db, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "./firebase.js";

// --- UI HELPERS (Toast e Confirmação) ---
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
// Mantemos as categorias locais por enquanto para facilitar
let categories = JSON.parse(localStorage.getItem("vultus_categories")) || ["Camisetas", "Bonés", "Geral"];
let currentMediaFiles = [];

// Elementos do DOM
const tableBody = document.getElementById("adminProductsList");
const productModal = document.getElementById("productModal");
const mediaInput = document.getElementById("mediaInput");
const previewContainer = document.getElementById("previewContainer");
const categorySelect = document.getElementById("prodCategory");

// --- FUNÇÃO: CARREGAR PRODUTOS DA NUVEM (FIREBASE) ---
async function loadProducts() {
  tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Carregando produtos da nuvem...</td></tr>';
  products = []; // Limpa a lista local
  
  try {
    // Busca a coleção "products" no banco de dados
    const querySnapshot = await getDocs(collection(db, "products"));
    
    querySnapshot.forEach((doc) => {
      // Junta o ID do documento (do Firebase) com os dados do produto
      products.push({ fireId: doc.id, ...doc.data() });
    });
    
    renderTable(); // Desenha a tabela com os dados novos
  } catch (error) {
    console.error("Erro ao buscar:", error);
    showToast("Erro ao conectar com o servidor.");
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Erro ao carregar. Verifique o console.</td></tr>';
  }
}

// --- RENDERIZAR TABELA ---
function renderTable() {
  tableBody.innerHTML = "";
  
  if (products.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px">Nenhum produto encontrado.</td></tr>';
    return;
  }
  
  // Ordena por nome para ficar organizado
  products.sort((a, b) => a.name.localeCompare(b.name));

  products.forEach((p) => {
    let thumbContent = "";
    if (p.media && p.media.length > 0) {
      const first = p.media[0];
      if (first.type === "video") {
        thumbContent = '<div style="width:50px;height:50px;background:#333;display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;">VIDEO</div>';
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
                <button class="btn-action" id="btn-edit-${p.fireId}">EDITAR</button>
                <button class="btn-action delete" id="btn-del-${p.fireId}">X</button>
            </td>
        `;
    tableBody.appendChild(tr);

    // Adiciona os eventos de clique (necessário ao usar modules)
    document.getElementById(`btn-edit-${p.fireId}`).onclick = () => editProduct(p.fireId);
    document.getElementById(`btn-del-${p.fireId}`).onclick = () => deleteProduct(p.fireId);
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

// --- UPLOAD DE IMAGENS (Base64) ---
mediaInput.addEventListener("change", function (e) {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;
  
  files.forEach((file) => {
    // Validação de tamanho (Firebase Firestore tem limite de 1MB por doc)
    if (file.size > 800000) { // ~800kb
        alert(`A imagem "${file.name}" é muito grande! Por favor, use imagens menores que 800KB.`);
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
    
    let content = media.type === "video"
        ? `<video src="${media.data}" muted></video>`
        : `<img src="${media.data}">`;
    
    // Cria botão de remover
    const btn = document.createElement("button");
    btn.className = "remove-media-btn";
    btn.innerText = "X";
    btn.type = "button"; // Importante para não submeter o form
    btn.onclick = () => {
        currentMediaFiles.splice(index, 1);
        renderPreviews();
    };
    
    item.innerHTML = content;
    item.appendChild(btn);
    previewContainer.appendChild(item);
  });
}

// --- CRUD (CRIAR, LER, ATUALIZAR, DELETAR) ---

// Botão Novo Produto
document.getElementById("btnNewProduct").onclick = () => {
  document.getElementById("modalTitle").innerText = "Novo Produto";
  document.getElementById("productForm").reset();
  document.getElementById("productForm").dataset.mode = "new"; // Marca como novo
  delete document.getElementById("productForm").dataset.fireId; // Remove ID antigo se houver
  
  currentMediaFiles = [];
  renderPreviews();
  loadCategories();
  productModal.style.display = "flex";
};

// Função de Editar
window.editProduct = (fireId) => {
  const p = products.find((x) => x.fireId === fireId);
  if (!p) return;

  document.getElementById("modalTitle").innerText = "Editar Produto";
  
  // Salva o ID do Firebase no formulário para sabermos qual atualizar
  document.getElementById("productForm").dataset.mode = "edit";
  document.getElementById("productForm").dataset.fireId = fireId;

  // Preenche os campos
  document.getElementById("prodName").value = p.name;
  document.getElementById("prodCategory").value = p.category;
  document.getElementById("prodTag").value = p.tag;
  document.getElementById("prodPrice").value = p.price;
  document.getElementById("prodOldPrice").value = p.originalPrice;
  document.getElementById("prodDesc").value = p.description || "";
  document.getElementById("prodSpecs").value = p.specs || "";
  
  // Converte listas de volta para texto (separado por vírgula)
  document.getElementById("prodSizes").value = p.sizes ? p.sizes.join(", ") : "";
  document.getElementById("prodColors").value = p.colors ? p.colors.join(", ") : "";

  currentMediaFiles = p.media || [];
  renderPreviews();
  loadCategories();
  productModal.style.display = "flex";
};

// Salvar (Submit do Form)
document.getElementById("productForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  
  if (currentMediaFiles.length === 0) {
    showToast("Erro: Adicione pelo menos uma imagem!");
    return;
  }

  showToast("Salvando dados na nuvem...");

  // Pega os dados dos inputs
  const mode = e.target.dataset.mode; // "new" ou "edit"
  const fireId = e.target.dataset.fireId;

  const sizesInput = document.getElementById("prodSizes").value;
  const colorsInput = document.getElementById("prodColors").value;

  // Monta o objeto do produto
  const productData = {
    id: Date.now(), // ID numérico para compatibilidade interna (carrinho, etc)
    name: document.getElementById("prodName").value,
    category: document.getElementById("prodCategory").value,
    tag: document.getElementById("prodTag").value,
    price: parseFloat(document.getElementById("prodPrice").value),
    originalPrice: parseFloat(document.getElementById("prodOldPrice").value) || 0,
    description: document.getElementById("prodDesc").value,
    specs: document.getElementById("prodSpecs").value,
    // Transforma texto em Arrays
    sizes: sizesInput ? sizesInput.split(",").map(s => s.trim()).filter(s => s) : [],
    colors: colorsInput ? colorsInput.split(",").map(s => s.trim()).filter(s => s) : [],
    media: currentMediaFiles,
    updatedAt: new Date() // Para saber quando foi alterado
  };

  try {
    if (mode === "edit" && fireId) {
        // ATUALIZAR existente
        // Não mudamos o ID numérico original para não quebrar carrinhos antigos
        delete productData.id; 
        const productRef = doc(db, "products", fireId);
        await updateDoc(productRef, productData);
        showToast("Produto atualizado com sucesso!");
    } else {
        // CRIAR novo
        await addDoc(collection(db, "products"), productData);
        showToast("Produto criado com sucesso!");
    }

    productModal.style.display = "none";
    await loadProducts(); // Recarrega a lista direto da nuvem

  } catch (err) {
    console.error(err);
    if(err.message && err.message.includes("exceeds")) {
        alert("ERRO: O tamanho das imagens é muito grande para o banco gratuito.\nTente usar imagens menores ou comprimidas (TinyPNG).");
    } else {
        alert("Erro ao salvar: " + err.message);
    }
  }
});

// Função Deletar
window.deleteProduct = (fireId) => {
  showConfirm("Excluir", "Esta ação não pode ser desfeita. Tem certeza?", async () => {
    try {
        showToast("Excluindo...");
        await deleteDoc(doc(db, "products", fireId));
        await loadProducts();
        showToast("Produto excluído.");
    } catch (e) {
        console.error(e);
        showToast("Erro ao excluir.");
    }
  });
};

// --- CONFIGURAÇÃO DOS MODAIS ---
const catModal = document.getElementById("categoryModal");

// Funções globais para botões de categoria
window.manageCategories = () => {
  document.getElementById("catInput").value = categories.join(", ");
  catModal.style.display = "flex";
};

window.closeCategoryModal = () => (catModal.style.display = "none");

// Fecha modais ao clicar no X
document.querySelectorAll(".close-modal, .close-modal-btn").forEach((b) => {
  b.onclick = () => {
    productModal.style.display = "none";
    catModal.style.display = "none";
  };
});

// Salvar Categorias (Local Storage)
document.getElementById("categoryForm").onsubmit = (e) => {
  e.preventDefault();
  categories = document.getElementById("catInput").value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s);
  localStorage.setItem("vultus_categories", JSON.stringify(categories));
  closeCategoryModal();
  showToast("Categorias Atualizadas");
};

// INICIALIZAÇÃO
// Carrega os produtos assim que a página abre
loadProducts();
