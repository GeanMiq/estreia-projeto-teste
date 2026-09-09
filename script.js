// Estado da Aplicação
let configData = JSON.parse(localStorage.getItem('tm_config')) || null;
let comprasList = JSON.parse(localStorage.getItem('tm_compras')) || [];
let economiasList = JSON.parse(localStorage.getItem('tm_economias')) || [];
let itemAtual = null;

// Elementos da DOM
const configForm = document.getElementById('configForm');
const simularForm = document.getElementById('simularForm');
const userStatus = document.getElementById('userStatus');
const modalOverlay = document.getElementById('modalOverlay');

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  atualizarInterface();
});

// Evento: Salvar Configuração Financeira
configForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const tipo = document.getElementById('tipoRenda').value;
  const valor = parseFloat(document.getElementById('valorRenda').value);
  const horasMensais = parseFloat(document.getElementById('horasMensais').value);
  const diaPagamento = parseInt(document.getElementById('diaPagamento').value);

  const valorHora = valor / horasMensais;

  configData = {
    tipo,
    valor,
    horasMensais,
    diaPagamento,
    valorHora
  };

  localStorage.setItem('tm_config', JSON.stringify(configData));
  atualizarInterface();
  alert('Configurações financeiras salvas com sucesso!');
});

// Evento: Simular Compra
simularForm.addEventListener('submit', (e) => {
  e.preventDefault();

  if (!configData) {
    alert('Por favor, cadastre seus dados financeiros primeiro no Passo 1.');
    return;
  }

  const nome = document.getElementById('nomeProduto').value;
  const valor = parseFloat(document.getElementById('valorProduto').value);

  const horasNecessarias = valor / configData.valorHora;
  const diasNecessarios = horasNecessarias / (configData.horasMensais / 22); // considerando ~22 dias úteis
  const semanasNecessarias = horasNecessarias / (configData.horasMensais / 4.33);

  itemAtual = {
    nome,
    valor,
    horas: horasNecessarias,
    dias: diasNecessarios,
    data: new Date().toISOString()
  };

  // Preencher Pop-up Modal
  document.getElementById('modalNomeProd').innerText = nome;
  document.getElementById('modalValorProd').innerText = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  document.getElementById('modalHoras').innerText = horasNecessarias.toFixed(1) + 'h';
  document.getElementById('modalDias').innerText = diasNecessarios.toFixed(1);
  document.getElementById('modalSemanas').innerText = semanasNecessarias.toFixed(1);

  // Exibir Modal
  modalOverlay.classList.add('active');
});

// Ações do Modal
document.getElementById('btnValeAPena').addEventListener('click', () => {
  if (itemAtual) {
    comprasList.push(itemAtual);
    localStorage.setItem('tm_compras', JSON.stringify(comprasList));
    fecharModal();
    atualizarDashboard();
    simularForm.reset();
  }
});

document.getElementById('btnNaoValeAPena').addEventListener('click', () => {
  if (itemAtual) {
    economiasList.push(itemAtual);
    localStorage.setItem('tm_economias', JSON.stringify(economiasList));
    fecharModal();
    atualizarDashboard();
    simularForm.reset();
  }
});

function fecharModal() {
  modalOverlay.classList.remove('active');
  itemAtual = null;
}

// Atualizar Interface e Regra do Ciclo de Pagamento Mensal
function atualizarInterface() {
  if (configData) {
    userStatus.innerText = `Renda (${configData.tipo}): R$ ${configData.valorHora.toFixed(2)}/hora`;
    document.getElementById('tipoRenda').value = configData.tipo;
    document.getElementById('valorRenda').value = configData.valor;
    document.getElementById('horasMensais').value = configData.horasMensais;
    document.getElementById('diaPagamento').value = configData.diaPagamento;
  }
  atualizarDashboard();
}

function atualizarDashboard() {
  if (!configData) return;

  // Calcular Ciclo Financeiro (Do dia do pagamento atual até o próximo)
  const hoje = new Date();
  let inicioCiclo = new Date(hoje.getFullYear(), hoje.getMonth(), configData.diaPagamento);
  
  if (hoje.getDate() < configData.diaPagamento) {
    inicioCiclo.setMonth(inicioCiclo.getMonth() - 1);
  }

  let fimCiclo = new Date(inicioCiclo);
  fimCiclo.setMonth(fimCiclo.getMonth() + 1);

  document.getElementById('periodoCicloText').innerText = 
    `Ciclo Atual: ${inicioCiclo.toLocaleDateString('pt-BR')} até ${fimCiclo.toLocaleDateString('pt-BR')}`;

  // Filtrar itens apenas do ciclo atual
  const comprasCiclo = comprasList.filter(item => new Date(item.data) >= inicioCiclo && new Date(item.data) < fimCiclo);
  const economiasCiclo = economiasList.filter(item => new Date(item.data) >= inicioCiclo && new Date(item.data) < fimCiclo);

  // Renderizar Compras
  renderizarColuna('listaCompras', comprasCiclo, 'totalComprasVal', 'totalComprasHoras', 'totalComprasEquiv');
  
  // Renderizar Economias
  renderizarColuna('listaEconomia', economiasCiclo, 'totalEconomiaVal', 'totalEconomiaHoras', 'totalEconomiaEquiv');
}

function renderizarColuna(elementId, lista, valId, horasId, equivId) {
  const container = document.getElementById(elementId);
  container.innerHTML = '';

  let totalVal = 0;
  let totalHoras = 0;

  lista.forEach(item => {
    totalVal += item.valor;
    totalHoras += item.horas;

    const div = document.createElement('div');
    div.className = 'item-card';
    div.innerHTML = `
      <strong>${item.nome}</strong> - ${item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}<br>
      <small>Equivale a: ${item.horas.toFixed(1)}h de trabalho</small>
    `;
    container.appendChild(div);
  });

  const horasPorDiaUtil = configData.horasMensais / 22;
  const diasTotais = totalHoras / horasPorDiaUtil;
  const mesesTotais = totalHoras / configData.horasMensais;

  document.getElementById(valId).innerText = totalVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  document.getElementById(horasId).innerText = totalHoras.toFixed(1) + 'h';
  document.getElementById(equivId).innerText = `${diasTotais.toFixed(1)} dias úteis (~${mesesTotais.toFixed(2)} meses)`;
}

// Download em PDF
document.getElementById('downloadPdfBtn').addEventListener('click', () => {
  const element = document.getElementById('dashboardSection');
  const opt = {
    margin:       0.5,
    filename:     'relatorio-time-money.pdf',
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2 },
    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
  };
  html2pdf().set(opt).from(element).save();
});
