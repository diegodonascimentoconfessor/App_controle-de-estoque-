// Importações necessárias do Firebase SDK (Versão Web Modular v9+)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Sua configuração do Firebase (Mantida idêntica)
const firebaseConfig = {
  apiKey: "AIzaSyCr8R25YBzIEpETQiKatgMJOhzwSXBZPeM",
  authDomain: "controleestoque-eefc1.firebaseapp.com",
  projectId: "controleestoque-eefc1",
  storageBucket: "controleestoque-eefc1.firebasestorage.app",
  messagingSenderId: "1069327180647",
  appId: "1:1069327180647:web:26ef067e273a0854e685c2",
  measurementId: "G-PCQEHT6X20"
};

// Inicializa o Firebase e o Firestore
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ===== ESTADO ===== */
const state = {
  produtos: [],
  movimentacoes: [],
};

/* ===== SINCRONIZAÇÃO EM TEMPO REAL (FIRESTORE) ===== */
async function autenticarAnonimamente() {
  try {
    await signInAnonymously(auth);
  } catch (error) {
    console.error("Erro ao autenticar: ", error);
    toast("Ative a autenticação anônima no Firebase para usar o sistema.", "error");
    throw error;
  }
}

// Substitui a antiga função carregar(). Fica escutando as mudanças no banco.
function iniciarSincronizacao() {
  // Escuta a coleção de produtos
  onSnapshot(collection(db, "produtos"), (snapshot) => {
    state.produtos = [];
    snapshot.forEach((doc) => {
      state.produtos.push({ id: doc.id, ...doc.data() });
    });
    // Força a atualização da tela em que o usuário está trabalhando
    renderizarPagina(paginaAtiva());
    atualizarBadgeAlertas();
  }, (error) => {
    console.error("Erro ao sincronizar produtos: ", error);
    toast("Sem permissão para ler os produtos.", "error");
  });

  // Escuta a coleção de movimentações
  onSnapshot(collection(db, "movimentacoes"), (snapshot) => {
    state.movimentacoes = [];
    snapshot.forEach((doc) => {
      state.movimentacoes.push({ id: doc.id, ...doc.data() });
    });
    renderizarPagina(paginaAtiva());
  }, (error) => {
    console.error("Erro ao sincronizar movimentações: ", error);
    toast("Sem permissão para ler as movimentações.", "error");
  });
}

// Funções para salvar/deletar diretamente no banco de dados
async function dbSalvarProduto(produto) {
  try {
    await setDoc(doc(db, "produtos", produto.id), produto);
  } catch (error) {
    console.error("Erro ao salvar produto: ", error);
    toast("Erro ao conectar com o servidor.", "error");
  }
}

async function dbExcluirProduto(id) {
  try {
    await deleteDoc(doc(db, "produtos", id));
  } catch (error) {
    console.error("Erro ao excluir produto: ", error);
  }
}

async function dbSalvarMovimentacao(mov) {
  try {
    await setDoc(doc(db, "movimentacoes", mov.id), mov);
  } catch (error) {
    console.error("Erro ao salvar movimentação: ", error);
  }
}

/* ===== UTILITÁRIOS ===== */
function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatarData(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatarPreco(v) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function toast(msg, tipo = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast show ${tipo}`;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 3000);
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
}

function escapeJSString(value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/* ===== NAVEGAÇÃO ===== */
function navegarPara(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  document.getElementById(`page-${page}`).classList.add('active');
  document.querySelector(`[data-page="${page}"]`).classList.add('active');

  const titulos = {
    dashboard: 'Dashboard',
    produtos: 'Produtos',
    movimentacoes: 'Movimentações',
    alertas: 'Alertas'
  };
  document.getElementById('pageTitle').textContent = titulos[page] || page;

  fecharSidebar();
  renderizarPagina(page);
}

// Disponibilizado globalmente para os botões do HTML que usam onclick
window.abrirModalMov = function(produtoId) {
  const produto = state.produtos.find(p => p.id === produtoId);
  if (!produto) return;

  document.getElementById('movProdutoId').value = produtoId;
  document.getElementById('movProdutoNome').textContent = produto.nome;
  document.getElementById('movQtd').value = '1';
  document.getElementById('movObs').value = '';

  document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.toggle-btn[data-tipo="entrada"]').classList.add('active');
  document.getElementById('movTipo').value = 'entrada';

  document.getElementById('modalMov').classList.add('open');
  setTimeout(() => document.getElementById('movQtd').focus(), 100);
}

window.editarProduto = function(id) {
  const p = state.produtos.find(p => p.id === id);
  if (!p) return;

  document.getElementById('produtoId').value = p.id;
  document.getElementById('inputNome').value = p.nome;
  document.getElementById('inputCategoria').value = p.categoria;
  document.getElementById('inputQtd').value = p.quantidade;
  document.getElementById('inputMin').value = p.minimo;
  document.getElementById('inputPreco').value = p.preco;
  document.getElementById('inputDesc').value = p.descricao || '';
  document.getElementById('modalTitulo').textContent = 'Editar Produto';
  document.getElementById('modalProduto').classList.add('open');
}

window.excluirProduto = function(id) {
  if (!confirm('Tem certeza que deseja excluir este produto?')) return;
  dbExcluirProduto(id);
  toast('Produto excluído.');
}

function renderizarPagina(page) {
  if (page === 'dashboard') renderDashboard();
  if (page === 'produtos') renderProdutos();
  if (page === 'movimentacoes') renderMovimentacoes();
  if (page === 'alertas') renderAlertas();
}

/* ===== SIDEBAR MOBILE ===== */
function abrirSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('overlay').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function fecharSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
  document.body.style.overflow = '';
}

/* ===== DASHBOARD ===== */
function renderDashboard() {
  const totalProdutos = state.produtos.length;
  const totalItens = state.produtos.reduce((s, p) => s + Number(p.quantidade), 0);
  const totalCritico = state.produtos.filter(p => p.quantidade <= p.minimo).length;
  const categorias = new Set(state.produtos.map(p => p.categoria)).size;

  document.getElementById('totalProdutos').textContent = totalProdutos;
  document.getElementById('totalItens').textContent = totalItens;
  document.getElementById('totalCritico').textContent = totalCritico;
  document.getElementById('totalCategorias').textContent = categorias;

  const movRecentes = [...state.movimentacoes]
    .sort((a, b) => new Date(b.data) - new Date(a.data))
    .slice(0, 8);

  const tbody = document.getElementById('tbodyMovRecentes');
  const empty = document.getElementById('emptyMovRecentes');

  if (movRecentes.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    tbody.innerHTML = movRecentes.map(m => `
      <tr>
        <td>${escapeHTML(m.produtoNome)}</td>
        <td><span class="tag tag--${m.tipo === 'entrada' ? 'entrada' : 'saida'}">${m.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída'}</span></td>
        <td>${escapeHTML(m.quantidade)}</td>
        <td>${formatarData(m.data)}</td>
      </tr>
    `).join('');
  }

  atualizarBadgeAlertas();
}

/* ===== PRODUTOS ===== */
function getProdutosFiltrados() {
  const busca = document.getElementById('searchProduto').value.toLowerCase();
  const cat = document.getElementById('filterCategoria').value;

  return state.produtos.filter(p => {
    const matchBusca = p.nome.toLowerCase().includes(busca) ||
                       p.categoria.toLowerCase().includes(busca);
    const matchCat = !cat || p.categoria === cat;
    return matchBusca && matchCat;
  });
}

function renderProdutos() {
  const lista = getProdutosFiltrados();
  const tbody = document.getElementById('tbodyProdutos');
  const empty = document.getElementById('emptyProdutos');
  const filterCat = document.getElementById('filterCategoria');

  const cats = [...new Set(state.produtos.map(p => p.categoria))].sort();
  const catAtual = filterCat.value;
  filterCat.innerHTML = '<option value="">Todas as categorias</option>' +
    cats.map(c => `<option value="${escapeHTML(c)}" ${c === catAtual ? 'selected' : ''}>${escapeHTML(c)}</option>`).join('');

  if (lista.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    tbody.innerHTML = lista.map(p => {
      const critico = p.quantidade <= p.minimo;
      const produtoId = escapeJSString(p.id);
      return `
        <tr>
          <td><strong>${escapeHTML(p.nome)}</strong><br><small style="color:var(--text2)">${escapeHTML(p.descricao || '')}</small></td>
          <td>${escapeHTML(p.categoria)}</td>
          <td>
            <span class="tag tag--${critico ? 'critico' : 'ok'}">${escapeHTML(p.quantidade)}</span>
          </td>
          <td>${escapeHTML(p.minimo)}</td>
          <td>${formatarPreco(p.preco)}</td>
          <td>
            <button class="action-btn" onclick="abrirModalMov('${produtoId}')">⇅ Mov.</button>
            <button class="action-btn" onclick="editarProduto('${produtoId}')">✎ Editar</button>
            <button class="action-btn danger" onclick="excluirProduto('${produtoId}')">✕</button>
          </td>
        </tr>
      `;
    }).join('');
  }
}

/* ===== MOVIMENTAÇÕES ===== */
function renderMovimentacoes() {
  const tipo = document.getElementById('filterTipoMov').value;
  const lista = tipo
    ? state.movimentacoes.filter(m => m.tipo === tipo)
    : state.movimentacoes;

  const sorted = [...lista].sort((a, b) => new Date(b.data) - new Date(a.data));
  const tbody = document.getElementById('tbodyMovimentacoes');
  const empty = document.getElementById('emptyMovimentacoes');

  if (sorted.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    tbody.innerHTML = sorted.map(m => `
      <tr>
        <td>${escapeHTML(m.produtoNome)}</td>
        <td><span class="tag tag--${m.tipo === 'entrada' ? 'entrada' : 'saida'}">${m.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída'}</span></td>
        <td>${escapeHTML(m.quantidade)}</td>
        <td>${escapeHTML(m.observacao || '—')}</td>
        <td>${formatarData(m.data)}</td>
      </tr>
    `).join('');
  }
}

/* ===== ALERTAS ===== */
function renderAlertas() {
  const criticos = state.produtos.filter(p => p.quantidade <= p.minimo);
  const lista = document.getElementById('listaAlertas');
  const empty = document.getElementById('emptyAlertas');

  if (criticos.length === 0) {
    lista.innerHTML = '';
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    lista.innerHTML = criticos.map(p => `
      <div class="alerta-card">
        <div class="alerta-info">
          <div class="alerta-nome">${escapeHTML(p.nome)}</div>
          <div class="alerta-detalhe">
            Categoria: ${escapeHTML(p.categoria)} · Estoque atual: <strong>${escapeHTML(p.quantidade)}</strong> · Mínimo: <strong>${escapeHTML(p.minimo)}</strong>
          </div>
        </div>
        <button class="btn-primary" onclick="abrirModalMov('${escapeJSString(p.id)}')">+ Entrada</button>
      </div>
    `).join('');
  }
}

function atualizarBadgeAlertas() {
  const criticos = state.produtos.filter(p => p.quantidade <= p.minimo).length;
  const badge = document.getElementById('badgeAlertas');
  badge.textContent = criticos;
  badge.classList.toggle('show', criticos > 0);
}

/* ===== MODAL PRODUTO ===== */
function abrirModalNovoProduto() {
  document.getElementById('produtoId').value = '';
  document.getElementById('inputNome').value = '';
  document.getElementById('inputCategoria').value = '';
  document.getElementById('inputQtd').value = '0';
  document.getElementById('inputMin').value = '5';
  document.getElementById('inputPreco').value = '0';
  document.getElementById('inputDesc').value = '';
  document.getElementById('modalTitulo').textContent = 'Novo Produto';

  const cats = [...new Set(state.produtos.map(p => p.categoria))].sort();
  document.getElementById('categoriasList').innerHTML =
    cats.map(c => `<option value="${escapeHTML(c)}">`).join('');

  document.getElementById('modalProduto').classList.add('open');
  setTimeout(() => document.getElementById('inputNome').focus(), 100);
}

function fecharModalProduto() {
  document.getElementById('modalProduto').classList.remove('open');
}

function salvarProduto() {
  const nome = document.getElementById('inputNome').value.trim();
  const categoria = document.getElementById('inputCategoria').value.trim();
  const quantidade = parseInt(document.getElementById('inputQtd').value) || 0;
  const minimo = parseInt(document.getElementById('inputMin').value) || 0;
  const preco = parseFloat(document.getElementById('inputPreco').value) || 0;
  const descricao = document.getElementById('inputDesc').value.trim();
  let id = document.getElementById('produtoId').value;

  if (!nome) { toast('Informe o nome do produto.', 'error'); return; }
  if (!categoria) { toast('Informe a categoria.', 'error'); return; }

  if (!id) id = gerarId();

  const produtoDados = { id, nome, categoria, quantidade, minimo, preco, descricao };
  
  dbSalvarProduto(produtoDados);
  toast(document.getElementById('produtoId').value ? 'Produto atualizado!' : 'Produto cadastrado!');

  fecharModalProduto();
}

/* ===== MODAL MOVIMENTAÇÃO ===== */
function fecharModalMov() {
  document.getElementById('modalMov').classList.remove('open');
}

function salvarMovimentacao() {
  const produtoId = document.getElementById('movProdutoId').value;
  const tipo = document.getElementById('movTipo').value;
  const quantidade = parseInt(document.getElementById('movQtd').value) || 0;
  const observacao = document.getElementById('movObs').value.trim();

  if (!quantidade || quantidade <= 0) { toast('Informe uma quantidade válida.', 'error'); return; }

  const produto = state.produtos.find(p => p.id === produtoId);
  if (!produto) return;

  if (tipo === 'saida' && produto.quantidade < quantidade) {
    toast(`Estoque insuficiente! Disponível: ${produto.quantidade}`, 'error');
    return;
  }

  const novaQuantidade = tipo === 'entrada' ? produto.quantidade + quantidade : produto.quantidade - quantidade;

  // 1. Atualiza a quantidade do produto
  dbSalvarProduto({ ...produto, quantidade: novaQuantidade });

  // 2. Registra o histórico da movimentação
  dbSalvarMovimentacao({
    id: gerarId(),
    produtoId,
    produtoNome: produto.nome,
    tipo,
    quantidade,
    observacao,
    data: new Date().toISOString()
  });

  fecharModalMov();
  toast(`${tipo === 'entrada' ? 'Entrada' : 'Saída'} registrada com sucesso!`);
}

/* ===== HELPERS ===== */
function paginaAtiva() {
  const page = document.querySelector('.page.active');
  return page ? page.id.replace('page-', '') : 'dashboard';
}

/* ===== INICIALIZAÇÃO ===== */
async function init() {
  // Inicializa o ouvinte em tempo real do Firebase
  await autenticarAnonimamente();
  iniciarSincronizacao();

  // Nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      navegarPara(item.dataset.page);
    });
  });

  // Menu mobile
  document.getElementById('menuBtn').addEventListener('click', abrirSidebar);
  document.getElementById('sidebarClose').addEventListener('click', fecharSidebar);
  document.getElementById('overlay').addEventListener('click', fecharSidebar);

  // Botão add produto (topbar)
  document.getElementById('btnAddProduto').addEventListener('click', abrirModalNovoProduto);

  // Modal produto
  document.getElementById('modalClose').addEventListener('click', fecharModalProduto);
  document.getElementById('btnCancelarProduto').addEventListener('click', fecharModalProduto);
  document.getElementById('btnSalvarProduto').addEventListener('click', salvarProduto);

  document.getElementById('modalProduto').addEventListener('click', e => {
    if (e.target === document.getElementById('modalProduto')) fecharModalProduto();
  });

  // Modal movimentação
  document.getElementById('modalMovClose').addEventListener('click', fecharModalMov);
  document.getElementById('btnCancelarMov').addEventListener('click', fecharModalMov);
  document.getElementById('btnSalvarMov').addEventListener('click', salvarMovimentacao);

  document.getElementById('modalMov').addEventListener('click', e => {
    if (e.target === document.getElementById('modalMov')) fecharModalMov();
  });

  // Toggle entrada/saída
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('movTipo').value = btn.dataset.tipo;
    });
  });

  // Filtros produtos
  document.getElementById('searchProduto').addEventListener('input', renderProdutos);
  document.getElementById('filterCategoria').addEventListener('change', renderProdutos);

  // Filtro movimentações
  document.getElementById('filterTipoMov').addEventListener('change', renderMovimentacoes);
}

document.addEventListener('DOMContentLoaded', () => {
  init().catch((error) => console.error("Erro ao iniciar aplicação: ", error));
});
