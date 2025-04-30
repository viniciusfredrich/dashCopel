// scripts.js
// Dashboard interativo: Gráfico Principal, Execução Física e Comparativo Físico x Financeiro

function mostrarAbaDropdown(id) {
  document.querySelectorAll('.aba').forEach(aba => aba.classList.remove('ativa'));
  const alvo = document.getElementById(id);
  if (alvo) {
    alvo.classList.add('ativa');

    if (id === 'aba-copel' && tabelaProjetos) {
      setTimeout(() => {
        tabelaProjetos.redraw(true); // Força redesenho do layout da tabela
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
  let dados = dadosProjetos;

  const s = document.getElementById('filtro-setor').value;
  const o = document.getElementById('filtro-orgao').value;

  if (s) dados = dados.filter(r => r['SETORES'] === s);
  if (o) dados = dados.filter(r => r['ÓRGÃO'] === o);

  const exec = dados.map(r => parseFloat((r['EXECUÇÃO FÍSICA'] || '0').replace('%', '').replace(',', '.')) / 100);

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
    f = parseFloat((linhaSelecionada['EXECUÇÃO FÍSICA'] || '0').replace('%', '').replace(',', '.'));
    fi = parseFloat((linhaSelecionada['EXECUÇÃO FINANCEIRA'] || '0').replace('%', '').replace(',', '.'));
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

// Inicializa o dashboard
function init() {
  Promise.all([fetch('data/setores_gov.csv').then(r=>r.text()),fetch('data/detalhado.csv').then(r=>r.text())])
  .then(([ts,tp]) => {
    dadosSetores = Papa.parse(ts,{header:true,delimiter:';'}).data.filter(r=>r['SETORES']&&r['VALOR PREVISTO']);
    dadosProjetos = Papa.parse(tp,{header:true,delimiter:';'}).data.filter(r=>r['SETORES']);

    tabelaProjetos = new Tabulator('#tabela-container',{data:dadosProjetos,layout:'fitColumns',pagination:false,height:'100%',
      columns:[{title:'SETORES',field:'SETORES'},{title:'ÓRGÃO',field:'ÓRGÃO'},{title:'MUNICÍPIO',field:'MUNICÍPIO'},{title:'PROJETO',field:'PROJETO'},{title:'VALOR TOTAL DO PROJETO',field:'VALOR TOTAL DO PROJETO'},{title:'ORÇAMENTO DISPONIBILIZADO',field:'ORÇAMENTO DISPONIBILIZADO'},{title:'VALOR EMPENHADO',field:'VALOR EMPENHADO'},{title:'VALOR LIQUIDADO',field:'VALOR LIQUIDADO'},{title:'VALOR PAGO',field:'VALOR PAGO'},{title:'SALDO',field:'SALDO'},{title:'EXECUÇÃO FÍSICA',field:'EXECUÇÃO FÍSICA'},{title:'EXECUÇÃO FINANCEIRA',field:'EXECUÇÃO FINANCEIRA'},{title:'STATUS',field:'STATUS'},{title:'OBSERVAÇÃO',field:'OBSERVAÇÃO'}]
    });

    tabelaProjetos.on('rowClick',(_,row) => {
      const data = row.getData();
      if (JSON.stringify(linhaSelecionada) === JSON.stringify(data)) {
        linhaSelecionada = null;
      } else {
        linhaSelecionada = data;
      }
      drawAuxCharts();
    });

    fillDropdowns();
    document.getElementById('tipo-grafico').addEventListener('change',() => {document.getElementById('filtro-setor').value='';document.getElementById('filtro-orgao').value='';ativoFiltro=null;tabelaProjetos.clearFilter();drawMainChart();drawAuxCharts();});
    document.getElementById('filtro-setor').addEventListener('change', () => {
      const setor = document.getElementById('filtro-setor').value;
      atualizarDropdownOrgaos(setor);
      document.getElementById('filtro-orgao').value = '';
    
      linhaSelecionada = null; // <-- limpa seleção de linha
      applyFilters();
    });
    document.getElementById('filtro-orgao').addEventListener('change', () => {
      linhaSelecionada = null;
      applyFilters();
    });

    drawMainChart();
    drawAuxCharts();
  }).catch(console.error);
}

// Inicia tudo após carregamento do DOM
document.addEventListener('DOMContentLoaded', init);
