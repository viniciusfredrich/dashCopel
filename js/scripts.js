// scripts.js
// Dashboard interativo: Gráfico Principal, Execução Física e Comparativo Físico x Financeiro



function mostrarAbaDropdown(id) {
  document.querySelectorAll('.aba').forEach(aba => aba.classList.remove('ativa'));
  const alvo = document.getElementById(id);
  if (alvo) {
    alvo.classList.add('ativa');

    // Esconde filtros do COPEL se não for a aba copel
    const filtrosCopel = document.getElementById('filtros-copel');
    filtrosCopel.style.display = id === 'aba-copel' ? 'flex' : 'none';

    if (id === 'aba-copel' && tabelaProjetos) {
      setTimeout(() => tabelaProjetos.redraw(true), 50);
    }

    // 🔧 Força redimensionamento do gráfico histórico ao mostrar a aba
    if (id === 'aba-historico') {
      // Aguarda a aba estar visível e depois redesenha o gráfico completamente
      setTimeout(() => {
        plotarGraficoHistorico(dadosHistoricoGlobal);  // re-renderiza com os dados
      }, 50);
    }
  }
}

const CORES = [
  '#3E8ACC', // Azul (hue 210°)
  '#C53D3D', // Vermelho-terra (hue 0°) - Mais puro e escuro
  '#48A14D', // Verde (hue 120°)
  '#CC9C33', // Amarelo queimado (novo, hue 45°)
  '#E67D3E', // Laranja (hue 25°)
  '#5EC0B1', // Turquesa (hue 170°)
  '#D44D9A', // Rosa-berry (hue 315°) - Movido para longe do vermelho
  '#7C7D36', // Verde-oliva (hue 60°)
  '#AA6D2E', // Marrom (hue 30°)
  '#6884C8', // Azul-lavanda (hue 225°)
  '#A35EB0', // Lilás (hue 285°) - Substitui o rosa claro
  '#3BAF7F'  // Verde-jade (hue 150°)
];

// Dados e estados globais\let dadosSetores = [];
let dadosProjetos = [];
let tabelaProjetos = null;
let ativoFiltro = null;       // Label ativo para filtrar (setor ou órgão)
let linhaSelecionada = null;   // Linha selecionada na tabela
let dadosHistoricoGlobal = [];
let dadosSaidasConta = [];
let dadosFluxoMensal = [];


// Aplica transparência a cor em hex
function aplicarTransparencia(hex) {
  const bigint = parseInt(hex.replace('#',''), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},0.4)`;
}

// Desenha o gráfico principal (donut ou barras comparativas)
function drawMainChart() {
  const tipo = document.getElementById('tipo-grafico').value;
  const container = 'grafico-principal';
  document.getElementById(container).innerHTML = '';

  if (tipo === 'comparacao1') {
    const gov = {}, plan = {}, pago = {};
  
    // Agrupar valores
    dadosSetores.forEach(r => {
      const setor = r['SETORES'];
      gov[setor] = parseFloat(r['VALOR PREVISTO']) || 0;
    });
  
    dadosProjetos.forEach(r => {
      const setor = r['SETORES'];
      const orgao = r['ÓRGÃO'];
      const tv = parseFloat((r['VALOR TOTAL DO PROJETO'] || '0').replace(/\./g, '').replace(',', '.')) || 0;
      const tp = parseFloat((r['VALOR PAGO'] || '0').replace(/\./g, '').replace(',', '.')) || 0;
  
      // Planejamento por órgão
      if (!plan[setor]) plan[setor] = {};
      if (!plan[setor][orgao]) plan[setor][orgao] = 0;
      plan[setor][orgao] += tv;
  
      // Pagamento por órgão
      if (!pago[setor]) pago[setor] = {};
      if (!pago[setor][orgao]) pago[setor][orgao] = 0;
      pago[setor][orgao] += tp;
    });
  
    let traces = [];
    const coresBase = CORES;
  
    if (!ativoFiltro) {
      // NENHUM FILTRO ATIVO — total geral
      const totalGov = Object.values(gov).reduce((a, b) => a + b, 0);
      const totalPlan = Object.values(plan).flatMap(p => Object.values(p)).reduce((a, b) => a + b, 0);
      const totalPago = Object.values(pago).flatMap(p => Object.values(p)).reduce((a, b) => a + b, 0);
  
      traces = [{
        x: ['Governo', 'Planejado', 'Pago'],
        y: [totalGov, totalPlan, totalPago],
        type: 'bar',
        marker: { color: [CORES[0], CORES[1], CORES[2]] }
      }];
    } else {
      // FILTRO ATIVO — setor selecionado
      const setor = ativoFiltro;
      const govValor = gov[setor] || 0;
  
      const orgaosPlan = plan[setor] || {};
      const orgaosPago = pago[setor] || {};
      const orgaos = Array.from(new Set([...Object.keys(orgaosPlan), ...Object.keys(orgaosPago)]));
  
      traces = [
        {
          x: [setor],
          y: [govValor],
          name: 'Previsto pelo governador',
          type: 'bar',
          marker: { color: CORES[0] }
        },
        {
          x: orgaos,
          y: orgaos.map(o => orgaosPlan[o] || 0),
          name: 'Valor planejado',
          type: 'bar',
          marker: { color: CORES[1] }
        },
        {
          x: orgaos,
          y: orgaos.map(o => orgaosPago[o] || 0),
          name: 'Valor pago',
          type: 'bar',
          marker: { color: CORES[2] }
        }
      ];
    }
  
    const layoutBar = {
      barmode: 'group',
      title: 'Govenador X Órgãos',
      autosize: true,
      responsive: true,
      margin: { t: 40, b: 50, l: 20, r: 20 },
      xaxis: { automargin: true },
      yaxis: { automargin: true },
    };
  
    Plotly.newPlot(container, traces, layoutBar).then(() => attachMainClick(Object.keys(gov)));
  } else {
    const mapFonte = tipo === 'orgaos'
      ? dadosProjetos.reduce((acc, r) => {
        const org = r['ÓRGÃO'];
        const v = parseFloat((r['VALOR TOTAL DO PROJETO'] || '0').replace(/\./g, '').replace(',', '.')) || 0;
        acc[org] = (acc[org] || 0) + v;
        return acc;
      }, {})
      : dadosSetores.reduce((acc, r) => {
        acc[r['SETORES']] = parseFloat(r['VALOR PREVISTO']);
        return acc;
      }, {});

    const labels = Object.keys(mapFonte);
    const values = Object.values(mapFonte);
    const cores = labels.map((lab, i) => {
      const c = CORES[i % CORES.length];
      return ativoFiltro && lab !== ativoFiltro ? aplicarTransparencia(c) : c;
    });

    const title = tipo === 'orgaos'
      ? 'Valores planejados pelos Órgãos'
      : 'Valores definidos pelo Governador';

    const layoutPie = {
      title: title,
      responsive: true,
      showlegend: false,
      margin: { t: 35, b: 20, l: 10, r: 10 },
    };

    const pie = {
      type: 'pie',
      hole: 0.5,
      rotation: 40,
      labels,
      values,
      marker: { colors: cores },
      hovertemplate: '%{label}: %{value}<extra></extra>',
      texttemplate: '%{label}<br>R$ %{value}',
      textposition: 'outside',
      domain: {
        x: [0.1, 0.9], // ocupa 80% da largura do container
        y: [0.1, 0.85]  // ocupa 80% da altura do container
      },
    };

    Plotly.newPlot(container, [pie], layoutPie, {    displayModeBar: false,
      displaylogo: false,}).then(() => attachMainClick(labels));
  }
}

// Anexa evento de toggle ao gráfico principal
function attachMainClick(labels) {
  const gd = document.getElementById('grafico-principal');
  if (gd.removeAllListeners) gd.removeAllListeners('plotly_click');
  gd.on('plotly_click', data => {
    if (!data.points.length) return;
    const lab = data.points[0].label;

    if (ativoFiltro === lab) {
      ativoFiltro = null;
      document.getElementById('filtro-setor').value = '';
      document.getElementById('filtro-orgao').value = '';
      atualizarDropdownOrgaos(null);
      tabelaProjetos.clearFilter();
      linhaSelecionada = null;
    } else {
      ativoFiltro = lab;
      linhaSelecionada = null;
    
      const tipo = document.getElementById('tipo-grafico').value;
      if (tipo === 'orgaos') {
        document.getElementById('filtro-orgao').value = lab;
      } else {
        document.getElementById('filtro-setor').value = lab;
        atualizarDropdownOrgaos(lab);
      }
    
      applyFilters();
    }

    drawMainChart();
    drawAuxCharts();
  });
}

let execFisicaRenderizado = false;

function drawExecucaoFisicaChart() {
  let dados = tabelaProjetos?.getData?.();

  if (!Array.isArray(dados) || dados.length === 0) {
    console.warn("⚠️ Nenhum dado disponível para o gráfico de execução física.");
    return;
  }

  const s = document.getElementById('filtro-setor').value;
  const o = document.getElementById('filtro-orgao').value;

  if (s) dados = dados.filter(r => r['SETORES'] === s);
  if (o) dados = dados.filter(r => r['ÓRGÃO'] === o);

  const exec = dados.map(r => Number(r['EXECUÇÃO FÍSICA']) / 100);

  const labels = ['0%', 'Até 25%', 'Até 50%', 'Até 75%', 'Até 100%'];
  const cont = Object.fromEntries(labels.map(l => [l, 0]));

  exec.forEach(v => {
    if (v === 0) cont['0%']++;
    else if (v <= 0.25) cont['Até 25%']++;
    else if (v <= 0.5) cont['Até 50%']++;
    else if (v <= 0.75) cont['Até 75%']++;
    else cont['Até 100%']++;
  });

  const y = labels.map(l => cont[l]);
  const text = y.map(v => `${v}`);

  const layout = {
    title: `Distribuição Física (${dados.length} itens)`,
    responsive: true,
    autosize: true,
    margin: { t: 40, b: 50, l: 20, r: 20 },
    xaxis: { automargin: true },
    yaxis: { range: [0, 60], automargin: true }
  };

  const trace = [{
    x: labels,
    y: y,
    type: 'bar',
    text: text,
    textposition: 'outside',
    marker: { color: '#1f77b4' }
  }];

  if (!execFisicaRenderizado) {
    Plotly.newPlot('grafico-distribuicao', trace, layout, {
      displayModeBar: false,
      displaylogo: false
    });
    execFisicaRenderizado = true;
  } else {
    Plotly.animate('grafico-distribuicao', {
      data: [{ y, text }]
    }, {
      transition: {
        duration: 500,
        easing: 'cubic-in-out'
      },
      frame: {
        duration: 500
      }
    });
  }
}

// Desenha Comparativo Física vs Financeira
let comparativoRenderizado = false;

function drawComparativoFisicoFinanceiroChart() {
  const layout = {
    title: 'Física vs Financeira',
    responsive: true,
    autosize: true,
    margin: { t: 40, b: 50, l: 20, r: 20 },
    yaxis: { range: [0, 110], ticksuffix: '%', automargin: true },
    xaxis: { automargin: true }
  };

  let f = 0;
  let fi = 0;
  let text = ['Selecione um projeto', 'Selecione um projeto'];
  let color = ['#CC9C33', '#5EC0B1'];

  if (linhaSelecionada) {
    f = Number(linhaSelecionada['EXECUÇÃO FÍSICA']);
    fi = Number(linhaSelecionada['EXECUÇÃO FINANCEIRA']);
    text = [`${f}%`, `${fi}%`];
    color = ['#CC9C33', '#5EC0B1'];
  }

  const data = [{
    x: ['Física', 'Financeira'],
    y: [f, fi],
    type: 'bar',
    text: text,
    textposition: 'outside',
    marker: { color }
  }];

  if (!comparativoRenderizado) {
    Plotly.newPlot('grafico-comparativo', data, layout, {
      displayModeBar: false,
      displaylogo: false
    });
    comparativoRenderizado = true;
  } else {
    Plotly.animate('grafico-comparativo', {
      data: [{ y: [f, fi], text }]
    }, {
      transition: {
        duration: 500,
        easing: 'cubic-in-out'
      },
      frame: {
        duration: 500
      }
    });
  }
}

// Chama ambos os gráficos auxiliares
function drawAuxCharts() {
  drawExecucaoFisicaChart();
  drawComparativoFisicoFinanceiroChart();
}

// Aplica filtros pelos dropdowns e redesenha
function applyFilters() {
  const setorSelecionado = document.getElementById('filtro-setor').value;
  const orgaoSelecionado = document.getElementById('filtro-orgao').value;

  tabelaProjetos.clearFilter();

  if (setorSelecionado && orgaoSelecionado) {
    tabelaProjetos.setFilter([
      { field: 'SETORES', type: '=', value: setorSelecionado },
      { field: 'ÓRGÃO', type: '=', value: orgaoSelecionado }
    ]);
  } else if (setorSelecionado) {
    tabelaProjetos.setFilter('SETORES', '=', setorSelecionado);
  } else if (orgaoSelecionado) {
    tabelaProjetos.setFilter('ÓRGÃO', '=', orgaoSelecionado);
  }

  ativoFiltro = setorSelecionado || orgaoSelecionado || null;
  drawMainChart();
  drawAuxCharts();
}

// Preenche os dropdowns de filtro
function fillDropdowns() {
  const fs = document.getElementById('filtro-setor');
  new Set(dadosProjetos.map(r => r['SETORES'])).forEach(s => fs.appendChild(new Option(s, s)));
  atualizarDropdownOrgaos(null); // inicializa com todos os órgãos
}

// Atualiza dropdown de órgãos com base no setor selecionado
function atualizarDropdownOrgaos(setorSelecionado) {
  const fo = document.getElementById('filtro-orgao');
  fo.innerHTML = '<option value="">Todos</option>';

  const orgaosFiltrados = dadosProjetos
    .filter(r => !setorSelecionado || r['SETORES'] === setorSelecionado)
    .map(r => r['ÓRGÃO']);

  const orgaosUnicos = Array.from(new Set(orgaosFiltrados));
  orgaosUnicos.forEach(o => fo.appendChild(new Option(o, o)));
}

function renderTabelaHistorico(dados) {
  // destrói instância anterior, se existir
  const inst = Tabulator.findTable('#tabela-historico')[0];
  if (inst) inst.destroy();

  new Tabulator('#tabela-historico', {
    data: dados,            // seu array completo
    layout: 'fitColumns',   // ajuste automático das colunas
    pagination: false,      // sem paginação

    // preenche 100% do wrapper (#dashboard-historico-tabela)
    height: '80%',

    // === DESLIGANDO RENDERIZAÇÃO PROGRESSIVA ===
    virtualDom: false,        // renderiza todas as linhas de uma vez
    progressiveRender: false, // desativa o “progressive render”

    // wrap de header e conteúdo
    headerWordWrap: true,
    cellVertAlign: 'top',

    columns: [
      { title: 'Órgão',      field: 'Órgão' },
      { title: 'Vinculada',  field: 'Vinculada' },
      { title: 'Data',       field: 'Data' },
      { title: 'Fonte',      field: 'Fonte' },
      { title: 'Descrição',  field: 'Descrição' },
      { title: 'Função',     field: 'Função' },
      { title: 'Valor Repassado', field: 'Valor Repassado', hozAlign:'right' },
      { title: 'No Plano?',  field: 'Despesa presente no plano de aplicação' }
    ]
  });
}

function plotarGraficoHistorico(dados) {
  const datas = [];
  const saldoFinal = [];
  const repassesAcumulados = [];

  dados.forEach(linha => {
    datas.push(linha['DATA']);
    saldoFinal.push(parseFloat(linha['SALDO FINAL'] || 0) / 1e9);
    repassesAcumulados.push(parseFloat(linha['TOTAL REPASSE'] || 0) / 1e9);
  });

  const formatarValor = v => v >= 1e9
    ? `R$ ${(v/1e9).toFixed(2)} bi`
    : `R$ ${(v/1e6).toFixed(0)} mi`;

  const traceSaldo = {
    x: datas,
    y: saldoFinal,
    name: 'Saldo Final',
    type: 'scatter',
    mode: 'lines+markers',
    line: { color: '#3E8ACC', width: 3 },
    hovertemplate: '%{x}<br>Saldo: %{customdata}<extra></extra>',
    customdata: saldoFinal.map(v => formatarValor(v*1e9))
  };

  const traceRepasse = {
    x: datas,
    y: repassesAcumulados,
    name: 'Repasses Acumulados',
    type: 'scatter',
    mode: 'lines+markers',
    line: { color: '#CC9C33', width: 3 },
    hovertemplate: '%{x}<br>Repasse: %{customdata}<extra></extra>',
    customdata: repassesAcumulados.map(v => formatarValor(v*1e9))
  };

  const layout = {
    title: 'Evolução do Saldo e Repasses',
    autosize: true,
    hovermode: 'x unified',    // <— agrupa hover em um único label
    xaxis: {
      automargin: true,
      showspikes: true,        // linha vertical no ponto
      spikemode: 'across',     // spike atravessa todo o gráfico
      spikecolor: '#999',
      spikesnap: 'cursor',
    },
    yaxis: {
      automargin: true,
      tickvals: [0,0.5,1,1.5,2,2.5,3,3.5],
      ticktext: ['R$ 0','R$ 0,5 bi','R$ 1 bi','R$ 1,5 bi','R$ 2 bi','R$ 2,5 bi','R$ 3 bi','R$ 3,5 bi'],
    },
    margin: { t: 50, b: 50, l: 60, r: 30 },
    legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: -0.2 }
  };

  const config = {
    responsive: true,
    displayModeBar: false,
    displaylogo: false
  };

  const el = document.getElementById('grafico-historico');
  Plotly.react(el, [traceSaldo, traceRepasse], layout, config);

  // Garante o resize se o container mudar de tamanho
  setTimeout(() => Plotly.Plots.resize(el), 150);
}

function renderKpisHistoricoTop(anoSelecionado, mesSelecionado) {
  const container = document.getElementById('kpis-historico-top');
  if (!container || !dadosFluxoMensal || !dadosFluxoMensal.length) return;
  container.innerHTML = '';

  const registros = dadosFluxoMensal.filter(r => {
    if (typeof r['DATA'] !== 'string') return false;
    const [dia, mes, ano] = r['DATA'].split('/'); 
    return ano === anoSelecionado && (!mesSelecionado || mes === mesSelecionado);
  });

  if (!registros.length) {
    console.warn('⚠️ Nenhum registro encontrado para os KPIs.');
    return;
  }

  registros.sort((a, b) => {
    const [da, ma, aa] = a['DATA'].split('/');
    const [db, mb, ab] = b['DATA'].split('/');
    return new Date(`${aa}-${ma}-${da}`) - new Date(`${ab}-${mb}-${db}`);
  });

  const ultimo = registros[registros.length - 1];

  const parseBRL = s => parseFloat(String(s).replace(/\./g, '').replace(',', '.')) || 0;
  const formatBRL = n => n.toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL', minimumFractionDigits: 2
  });

  const campos = [
    'SALDO INICIAL',
    'ENTRADAS',
    'RENTABILIDADE',
    'TOTAL REPASSE',
    'SALDO FINAL'
  ];

  const items = campos.map(label => {
    const bruto = ultimo[label];
    const convertido = parseBRL(bruto);
    console.log(`🔍 Campo: ${label} | Valor bruto: ${bruto} | Valor convertido: ${convertido}`);
    return { label, valor: formatBRL(convertido) };
  });

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'kpi-card';
    card.innerHTML = `
      <div class="valor">${item.valor}</div>
      <div class="descricao">${item.label}</div>
    `;
    container.appendChild(card);
  });
}

function filtrarTabelaHistoricoPorAno(anoSelecionado, dados) {
  const selectMes = document.getElementById('mes-historico');
  const mesAnterior = selectMes.value;
  selectMes.innerHTML = '<option value="">Todos</option>';

  const registrosAno = dados.filter(r => {
    const d = r['Data'];
    return typeof d === 'string' && d.split('/')[2] === anoSelecionado;
  });

  const hoje = new Date();
  const anoAtual = String(hoje.getFullYear());
  const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');

  const mesesDisponiveis = Array.from(
    new Set(registrosAno.map(r => r['Data'].split('/')[1]))
  )
    .filter(m => anoSelecionado < anoAtual || m <= mesAtual)
    .sort();

  const nomesMeses = {
    '01': 'Janeiro','02': 'Fevereiro','03': 'Março','04': 'Abril',
    '05': 'Maio','06': 'Junho','07': 'Julho','08': 'Agosto',
    '09': 'Setembro','10': 'Outubro','11': 'Novembro','12': 'Dezembro'
  };
  mesesDisponiveis.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = nomesMeses[m] || m;
    selectMes.appendChild(opt);
  });

  if (mesAnterior && Array.from(selectMes.options).some(o => o.value === mesAnterior)) {
    selectMes.value = mesAnterior;
  }

  const tabela = Tabulator.findTable('#tabela-historico')[0];
  if (!tabela) {
    console.error('Tabela de histórico não inicializada!');
    return;
  }

  tabela.clearFilter(true);
  tabela.setFilter('Data', 'like', `/${anoSelecionado}`);
  if (selectMes.value) {
    tabela.addFilter('Data', 'like', `/${selectMes.value}/`);
  }

  const mesFinal = selectMes.value.padStart(2, '0'); // <- pad aqui também
  renderKpisHistoricoTop(anoSelecionado, mesFinal);
}

function criarAnoToggleGroup(dadosSaidasConta) {
  const anos = [...new Set(dadosSaidasConta.map(r => r['Data'].split('/')[2]))].sort();
  const container = document.getElementById('ano-toggle-group');
  container.innerHTML = '';

  anos.forEach(ano => {
    const btn = document.createElement('button');
    btn.textContent = ano;
    btn.className = 'toggle-button';
    btn.dataset.ano = ano;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.toggle-button').forEach(b => b.classList.remove('ativo'));
      btn.classList.add('ativo');
      filtrarTabelaHistoricoPorAno(ano, dadosSaidasConta);
    });
    container.appendChild(btn);
  });

  // Dispara o filtro inicial com o último ano
  if (anos.length) {
    const ultimoAno = anos[anos.length - 1];
    const botaoInicial = container.querySelector(`.toggle-button[data-ano="${ultimoAno}"]`);
    if (botaoInicial) {
      botaoInicial.classList.add('ativo');
      filtrarTabelaHistoricoPorAno(ultimoAno, dadosSaidasConta);
    }
  }
}

function init() {
  Promise.all([
    fetch('data/setores_gov.csv').then(r => r.text()),
    fetch('data/dia12082025.csv').then(r => r.text()),
    fetch('data/fluxomensal.csv').then(r => r.text()),
    fetch('data/saidasconta.csv').then(r => r.text()),
  ])
  .then(([ts, tp, tf, tc]) => {
    // Dados principais
    dadosSetores = Papa.parse(ts, { header: true, delimiter: ';' })
                     .data.filter(r => r['SETORES'] && r['VALOR PREVISTO']);

    dadosProjetos = Papa.parse(tp, { header: true, delimiter: ';' })
                     .data.filter(r => r['SETORES']);

    dadosFluxoMensal = Papa.parse(tf, { header: true, delimiter: ';' })
                            .data.filter(r => r['DATA'] && r['SALDO FINAL']);

    console.log('🧾 Fluxo mensal carregado:', dadosFluxoMensal);

    // Tabela principal
    tabelaProjetos = new Tabulator('#tabela-container', {
      data: dadosProjetos,
      layout: 'fitColumns',
      pagination: false,
      height: '100%',
      columns: [
        { title: 'SETORES', field: 'SETORES' },
        { title: 'ÓRGÃO', field: 'ÓRGÃO' },
        { title: 'MUNICÍPIO', field: 'MUNICÍPIO' },
        { title: 'PROJETO', field: 'PROJETO' },
        { title: 'VALOR TOTAL DO PROJETO', field: 'VALOR TOTAL DO PROJETO' },
        { title: 'ORÇAMENTO DISPONIBILIZADO', field: 'ORÇAMENTO DISPONIBILIZADO' },
        { title: 'VALOR EMPENHADO', field: 'VALOR EMPENHADO' },
        { title: 'VALOR LIQUIDADO', field: 'VALOR LIQUIDADO' },
        { title: 'VALOR PAGO', field: 'VALOR PAGO' },
        { title: 'SALDO', field: 'SALDO' },
        {
          title: "EXECUÇÃO FÍSICA",
          field: "EXECUÇÃO FÍSICA",
          sorter: "number",
          mutator: (value) => parseFloat((value || '0').replace('%','').replace(',', '.')),
          formatter: (cell) => cell.getValue() + "%"
        },
        {
          title: "EXECUÇÃO FINANCEIRA",
          field: "EXECUÇÃO FINANCEIRA",
          sorter: "number",
          mutator: (value) => parseFloat((value || '0').replace('%','').replace(',', '.')),
          formatter: (cell) => cell.getValue() + "%"
        },
        { title: 'STATUS', field: 'STATUS' },
        { title: 'OBSERVAÇÃO', field: 'OBSERVAÇÃO' }
      ]
    });

    // Espera a tabela estar pronta para desenhar o gráfico corretamente
    tabelaProjetos.on("tableBuilt", function () {
      drawMainChart();
      drawAuxCharts();
    });

    tabelaProjetos.on('rowClick', (_, row) => {
      const data = row.getData();
      linhaSelecionada = JSON.stringify(linhaSelecionada) === JSON.stringify(data) ? null : data;
      drawAuxCharts();
    });

    fillDropdowns();

    document.getElementById('tipo-grafico').addEventListener('change', () => {
      document.getElementById('filtro-setor').value = '';
      document.getElementById('filtro-orgao').value = '';
      ativoFiltro = null;
      tabelaProjetos.clearFilter();
      drawMainChart();
      drawAuxCharts();
    });

    document.getElementById('filtro-setor').addEventListener('change', () => {
      const setor = document.getElementById('filtro-setor').value;
      atualizarDropdownOrgaos(setor);
      document.getElementById('filtro-orgao').value = '';
      linhaSelecionada = null;
      applyFilters();
    });

    document.getElementById('filtro-orgao').addEventListener('change', () => {
      linhaSelecionada = null;
      applyFilters();
    });

    // Histórico bancário
    const parsedFluxo = Papa.parse(tf, {
      header: true,
      delimiter: ';',
      skipEmptyLines: true,
      transformHeader: h => h.trim(),
    }).data;
    dadosHistoricoGlobal = parsedFluxo.filter(r => r['DATA']);

    const parsedSaidas = Papa.parse(tc, {
      header: true,
      delimiter: ';',
      skipEmptyLines: true,
      transformHeader: h => h.trim(),
    }).data;
    dadosSaidasConta = parsedSaidas.filter(r => r['Data']);

    renderTabelaHistorico(dadosSaidasConta);

    // Criação dos botões de ano
    const anos = [...new Set(dadosSaidasConta.map(r => r['Data'].split('/')[2]))].sort();
    const container = document.getElementById('ano-toggle-group');
    container.innerHTML = '';

    anos.forEach(ano => {
      const btn = document.createElement('button');
      btn.textContent = ano;
      btn.className = 'toggle-button';
      btn.dataset.ano = ano;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.toggle-button').forEach(b => b.classList.remove('ativo'));
        btn.classList.add('ativo');
        filtrarTabelaHistoricoPorAno(ano, dadosSaidasConta);
      });
      container.appendChild(btn);
    });

    // Filtro inicial com o último ano disponível
    if (anos.length) {
      const ultimoAno = anos[anos.length - 1];
      const botaoInicial = container.querySelector(`.toggle-button[data-ano="${ultimoAno}"]`);
      if (botaoInicial) {
        botaoInicial.classList.add('ativo');
        filtrarTabelaHistoricoPorAno(ultimoAno, dadosSaidasConta);
      }
    }

    // Filtro de mês
    document.getElementById('mes-historico').addEventListener('change', () => {
      const anoSelecionado = document.querySelector('.toggle-button.ativo')?.dataset.ano;
      const mesSelecionado = document.getElementById('mes-historico').value;
      if (!anoSelecionado || !mesSelecionado) return;

      const dadosFiltrados = dadosSaidasConta.filter(r => {
        const [dia, mes, ano] = r['Data'].split('/');
        return ano === anoSelecionado && mes === mesSelecionado;
      });

      renderTabelaHistorico(dadosFiltrados);
      renderKpisHistoricoTop(anoSelecionado, mesSelecionado);
    });
  })
  .catch(console.error);
}

document.addEventListener('DOMContentLoaded', init);
