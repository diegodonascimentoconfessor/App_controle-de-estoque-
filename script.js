/* ===== ESTADO ===== */
const state = {
  produtos: [],
  movimentacoes: [],
};

/* ===== LOCAL STORAGE ===== */
function salvar() {
  localStorage.setItem('estoqueapp_produtos', JSON.stringify(state.produtos));
  localStorage.setItem('estoqueapp_movimentacoes', JSON.stringify(state.movimentacoes));
}

function carregar() {
  state.produtos = JSON.parse(localStorage.getItem('estoqueapp_produtos') || '[]');
  state.movimentacoes = JSON.parse(localStorage.getItem('estoqueapp_movimentacoes') || '[]');
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
        <td>${m.produtoNome}</td>
        <td><span class="tag tag--${m.tipo}">${m.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída'}</span></td>
        <td>${m.quantidade}</td>
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

  // Categorias únicas
  const cats = [...new Set(state.produtos.map(p => p.categoria))].sort();
  const catAtual = filterCat.value;
  filterCat.innerHTML = '<option value="">Todas as categorias</option>' +
    cats.map(c => `<option value="${c}" ${c === catAtual ? 'selected' : ''}>${c}</option>`).join('');

  if (lista.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    tbody.innerHTML = lista.map(p => {
      const critico = p.quantidade <= p.minimo;
      return `
        <tr>
          <td><strong>${p.nome}</strong><br><small style="color:var(--text2)">${p.descricao || ''}</small></td>
          <td>${p.categoria}</td>
          <td>
            <span class="tag tag--${critico ? 'critico' : 'ok'}">${p.quantidade}</span>
          </td>
          <td>${p.minimo}</td>
          <td>${formatarPreco(p.preco)}</td>
          <td>
            <button class="action-btn" onclick="abrirModalMov('${p.id}')">⇅ Mov.</button>
            <button class="action-btn" onclick="editarProduto('${p.id}')">✎ Editar</button>
            <button class="action-btn danger" onclick="excluirProduto('${p.id}')">✕</button>
          </td>
        </tr>
      `;
    }).join('');
  }
}

function editarProduto(id) {
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

function excluirProduto(id) {
  if (!confirm('Tem certeza que deseja excluir este produto?')) return;
  state.produtos = state.produtos.filter(p => p.id !== id);
  salvar();
  renderProdutos();
  atualizarBadgeAlertas();
  toast('Produto excluído.');
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
        <td>${m.produtoNome}</td>
        <td><span class="tag tag--${m.tipo}">${m.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída'}</span></td>
        <td>${m.quantidade}</td>
        <td>${m.observacao || '—'}</td>
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
          <div class="alerta-nome">${p.nome}</div>
          <div class="alerta-detalhe">
            Categoria: ${p.categoria} · Estoque atual: <strong>${p.quantidade}</strong> · Mínimo: <strong>${p.minimo}</strong>
          </div>
        </div>
        <button class="btn-primary" onclick="abrirModalMov('${p.id}')">+ Entrada</button>
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

  // Atualizar datalist categorias
  const cats = [...new Set(state.produtos.map(p => p.categoria))].sort();
  document.getElementById('categoriasList').innerHTML =
    cats.map(c => `<option value="${c}">`).join('');

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
  const id = document.getElementById('produtoId').value;

  if (!nome) { toast('Informe o nome do produto.', 'error'); return; }
  if (!categoria) { toast('Informe a categoria.', 'error'); return; }

  if (id) {
    const idx = state.produtos.findIndex(p => p.id === id);
    if (idx >= 0) {
      state.produtos[idx] = { ...state.produtos[idx], nome, categoria, quantidade, minimo, preco, descricao };
    }
    toast('Produto atualizado!');
  } else {
    state.produtos.push({ id: gerarId(), nome, categoria, quantidade, minimo, preco, descricao });
    toast('Produto cadastrado!');
  }

  salvar();
  fecharModalProduto();
  renderizarPagina(paginaAtiva());
  atualizarBadgeAlertas();
}

/* ===== MODAL MOVIMENTAÇÃO ===== */
function abrirModalMov(produtoId) {
  const produto = state.produtos.find(p => p.id === produtoId);
  if (!produto) return;

  document.getElementById('movProdutoId').value = produtoId;
  document.getElementById('movProdutoNome').textContent = produto.nome;
  document.getElementById('movQtd').value = '1';
  document.getElementById('movObs').value = '';

  // Reset toggle
  document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.toggle-btn[data-tipo="entrada"]').classList.add('active');
  document.getElementById('movTipo').value = 'entrada';

  document.getElementById('modalMov').classList.add('open');
  setTimeout(() => document.getElementById('movQtd').focus(), 100);
}

function fecharModalMov() {
  document.getElementById('modalMov').classList.remove('open');
}

function salvarMovimentacao() {
  const produtoId = document.getElementById('movProdutoId').value;
  const tipo = document.getElementById('movTipo').value;
  const quantidade = parseInt(document.getElementById('movQtd').value) || 0;
  const observacao = document.getElementById('movObs').value.trim();

  if (!quantidade || quantidade <= 0) { toast('Informe uma quantidade válida.', 'error'); return; }

  const idx = state.produtos.findIndex(p => p.id === produtoId);
  if (idx < 0) return;

  const produto = state.produtos[idx];

  if (tipo === 'saida' && produto.quantidade < quantidade) {
    toast(`Estoque insuficiente! Disponível: ${produto.quantidade}`, 'error');
    return;
  }

  if (tipo === 'entrada') {
    state.produtos[idx].quantidade = produto.quantidade + quantidade;
  } else {
    state.produtos[idx].quantidade = produto.quantidade - quantidade;
  }

  state.movimentacoes.push({
    id: gerarId(),
    produtoId,
    produtoNome: produto.nome,
    tipo,
    quantidade,
    observacao,
    data: new Date().toISOString()
  });

  salvar();
  fecharModalMov();
  renderizarPagina(paginaAtiva());
  atualizarBadgeAlertas();
  toast(`${tipo === 'entrada' ? 'Entrada' : 'Saída'} registrada com sucesso!`);
}

/* ===== HELPERS ===== */
function paginaAtiva() {
  const page = document.querySelector('.page.active');
  return page ? page.id.replace('page-', '') : 'dashboard';
}

/* ===== INICIALIZAÇÃO ===== */
function init() {
  carregar();

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

  // Fechar modal clicando fora
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

  // Render inicial
  renderDashboard();
}

document.addEventListener('DOMContentLoaded', init);