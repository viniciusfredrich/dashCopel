// scripts.js
// Dashboard interativo: Gráfico Principal, Execução Física e Comparativo Físico x Financeiro

// Cores principais
const CORES = ['#1f77b4','#ff7f0e','#2ca02c','#d62728','#9467bd','#8c564b','#e377c2','#7f7f7f','#bcbd22','#17becf'];

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
    dadosSetores.forEach(r => gov[r['SETORES']] = parseFloat(r['VALOR PREVISTO']));
    dadosProjetos.forEach(r => {
      const s = r['SETORES'];
      const tv = parseFloat((r['VALOR TOTAL DO PROJETO'] || '0').replace(/\./g, '').replace(',', '.')) || 0;
      const tp = parseFloat((r['VALOR PAGO'] || '0').replace(/\./g, '').replace(',', '.')) || 0;
      plan[s] = (plan[s] || 0) + tv;
      pago[s] = (pago[s] || 0) + tp;
    });

    const labels = [...new Set([...Object.keys(gov), ...Object.keys(plan), ...Object.keys(pago)])];
    const coresBase = labels.map((_, i) => CORES[i % CORES.length]);
    const colors = coresBase.map((c, i) => ativoFiltro && labels[i] !== ativoFiltro ? aplicarTransparencia(c) : c);

    const traces = [
      {
        x: labels,
        y: labels.map(s => gov[s] || 0),
        name: 'Previsto Governador',
        type: 'bar',
        marker: { color: colors }
      },
      {
        x: labels,
        y: labels.map(s => plan[s] || 0),
        name: 'Planejado Órgãos',
        type: 'bar',
        marker: { color: colors }
      },
      {
        x: labels,
        y: labels.map(s => pago[s] || 0),
        name: 'Pago Órgãos',
        type: 'bar',
        marker: { color: colors }
      }
    ];

    const layoutBar = {
      barmode: 'group',
      title: 'Comparação Governador x Órgãos',
      autosize: true,
      responsive: true,
      margin: { t: 40, b: 50, l: 20, r: 20 },
      xaxis: { automargin: true },
      yaxis: { automargin: true }
    };

    Plotly.newPlot(container, traces, layoutBar).then(() => attachMainClick(labels));
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
      margin: { t: 35, b: 40, l: 10, r: 10 }
    };

    const pie = {
      type: 'pie',
      hole: 0.5,
      labels,
      values,
      marker: { colors: cores },
      hovertemplate: '%{label}: %{value}<extra></extra>',
      texttemplate: '%{label}<br>%{value}',
      textposition: 'outside',
      domain: {
        x: [0.1, 0.9], // ocupa 80% da largura do container
        y: [0.1, 0.9]  // ocupa 80% da altura do container
      }
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
      tabelaProjetos.clearFilter();
      linhaSelecionada = null;
    } else {
      ativoFiltro = lab;
      const tipo = document.getElementById('tipo-grafico').value;
      if (tipo === 'orgaos') document.getElementById('filtro-orgao').value = lab;
      else document.getElementById('filtro-setor').value = lab;
      applyFilters();
    }
    drawMainChart();
    drawAuxCharts();
  });
}

function drawExecucaoFisicaChart() {
  let dados = dadosProjetos;

  const s = document.getElementById('filtro-setor').value;
  const o = document.getElementById('filtro-orgao').value;

  if (s) dados = dados.filter(r => r['SETORES'] === s);
  else if (o) dados = dados.filter(r => r['ÓRGÃO'] === o);

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

  Plotly.newPlot('grafico-distribuicao', [{
    x: labels,
    y: labels.map(l => cont[l]),
    type: 'bar',
    text: labels.map(l => cont[l]),
    textposition: 'outside',
    marker: { color: '#1f77b4' }
  }], {
    title: `Distribuição Física (${dados.length} itens)`,
    responsive: true,
    autosize: true,
    margin: { t: 40, b: 50, l: 20, r: 20 },
    xaxis: { automargin: true },
    yaxis: { range: [0, 60], automargin: true}
  },{    displayModeBar: false,
    displaylogo: false,});
}

// Desenha Comparativo Física vs Financeira
function drawComparativoFisicoFinanceiroChart() {
  let layout = {
    title: 'Física vs Financeira',
    responsive: true,
    autosize: true,
    margin: { t: 40, b: 50, l: 20, r: 20 },
    yaxis: { range: [0, 110], ticksuffix: '%', automargin: true },
    xaxis: { automargin: true }
  };

  if (!linhaSelecionada) {
    Plotly.newPlot('grafico-comparativo', [{
      type: 'bar',
      x: ['Física', 'Financeira'],
      y: [0, 0],
      text: ['Selecione um projeto', 'Selecione um projeto'],
      textposition: 'auto',
      marker: { color: ['#ccc', '#ccc'] }
    }], layout,{    displayModeBar: false,
      displaylogo: false,});
    return;
  }

  const f = parseFloat((linhaSelecionada['EXECUÇÃO FÍSICA'] || '0').replace('%', '').replace(',', '.'));
  const fi = parseFloat((linhaSelecionada['EXECUÇÃO FINANCEIRA'] || '0').replace('%', '').replace(',', '.'));

  Plotly.newPlot('grafico-comparativo', [{
    x: ['Física', 'Financeira'],
    y: [f, fi],
    type: 'bar',
    text: [`${f}%`, `${fi}%`],
    textposition: 'outside',
    marker: { color: ['#2ca02c', '#d62728'] }
  }], layout, {    displayModeBar: false,
    displaylogo: false});
}

// Chama ambos os gráficos auxiliares
function drawAuxCharts() {
  drawExecucaoFisicaChart();
  drawComparativoFisicoFinanceiroChart();
}

// Aplica filtros pelos dropdowns e redesenha
function applyFilters() {
  const s = document.getElementById('filtro-setor').value;
  const o = document.getElementById('filtro-orgao').value;
  tabelaProjetos.clearFilter();
  if (s && o) tabelaProjetos.setFilter([{ field:'SETORES', type:'=', value:s }, { field:'ÓRGÃO', type:'=', value:o }]);
  else if (s) tabelaProjetos.setFilter('SETORES','=',s);
  else if (o) tabelaProjetos.setFilter('ÓRGÃO','=',o);
  ativoFiltro = s || o || null;
  drawMainChart();
  drawAuxCharts();
}

// Preenche os dropdowns de filtro
function fillDropdowns() {
  const fs = document.getElementById('filtro-setor');
  const fo = document.getElementById('filtro-orgao');
  new Set(dadosProjetos.map(r=>r['SETORES'])).forEach(s=>fs.appendChild(new Option(s,s)));
  new Set(dadosProjetos.map(r=>r['ÓRGÃO'])).forEach(o=>fo.appendChild(new Option(o,o)));
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
    document.getElementById('filtro-setor').addEventListener('change',applyFilters);
    document.getElementById('filtro-orgao').addEventListener('change',applyFilters);

    drawMainChart();
    drawAuxCharts();
  }).catch(console.error);
}

// Inicia tudo após carregamento do DOM
document.addEventListener('DOMContentLoaded', init);
