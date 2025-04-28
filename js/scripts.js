const coresSobrias = [
    "#1f77b4", // Azul sóbrio
    "#ff7f0e", // Laranja elegante
    "#2ca02c", // Verde moderado
    "#d62728", // Vermelho escuro
    "#9467bd", // Roxo suave
    "#8c564b", // Marrom acinzentado
    "#e377c2", // Rosa queimado
    "#7f7f7f", // Cinza médio
    "#bcbd22", // Verde oliva discreto
    "#17becf"  // Azul claro elegante
  ];
  
  let dadosSetores = [];
  let dadosProjetos = [];
  let tabelaProjetos = null;
  let setorSelecionado = null;
  
  function aplicarTransparencia(cor) {
    if (cor.startsWith('#')) {
      const bigint = parseInt(cor.slice(1), 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `rgba(${r},${g},${b},0.4)`;
    }
    return cor;
  }
  
  function desenharGraficoDonut(labels, valores, labelAtivo = null, titulo = "", colunaFiltro = "SETORES") {
    const cores = labels.map((label, index) => {
      const corBase = coresSobrias[index % coresSobrias.length];
      if (labelAtivo && label !== labelAtivo) {
        return aplicarTransparencia(corBase);
      }
      return corBase;
    });
  
    Plotly.newPlot('grafico-container', [{
      type: "pie",
      labels: labels,
      values: valores,
      hole: 0.5,
      marker: { colors: cores },
      responsive: false,
      displayModeBar: false,
      hovertemplate: "%{label}: %{value}<extra></extra>",
      texttemplate: "%{label}<br>%{value}",
      textposition: "outside",
    }], {
      title: titulo,
      width: 450,
      height: 400,
      showlegend: false,
    });
  
    let graficoContainer = document.getElementById('grafico-container');
    graficoContainer.on('plotly_click', function(data) {
      if (data.points.length > 0) {
        const labelClicado = data.points[0].label;
    
        if (setorSelecionado === labelClicado) {
          setorSelecionado = null;
          tabelaProjetos.clearFilter();
          
          // Resetar dropdowns
          document.getElementById('filtro-setor').value = "";
          document.getElementById('filtro-orgao').value = "";
    
          desenharGraficoDonut(labels, valores, null, titulo, colunaFiltro);
        } else {
          setorSelecionado = labelClicado;
    
          if (colunaFiltro === "SETORES") {
            document.getElementById('filtro-setor').value = setorSelecionado;
            document.getElementById('filtro-orgao').value = ""; // Limpa órgão
          } else if (colunaFiltro === "ÓRGÃO") {
            document.getElementById('filtro-orgao').value = setorSelecionado;
            document.getElementById('filtro-setor').value = ""; // Limpa setor
          }
    
          aplicarFiltrosTabela(); // Aplica o filtro visualmente
          desenharGraficoDonut(labels, valores, setorSelecionado, titulo, colunaFiltro);
        }
      }
    });
  }
  
  function desenharGraficoGovernador() {
    const labels = dadosSetores.map(row => row['SETORES']);
    const valores = dadosSetores.map(row => parseFloat(row['VALOR PREVISTO']));
    desenharGraficoDonut(labels, valores, null, "Valores definidos pelo Governador", "SETORES");

  }
  
  function desenharGraficoOrgaos() {
    // Agrupar VALOR TOTAL DO PROJETO por ÓRGÃO
    const agrupado = {};
  
    dadosProjetos.forEach(row => {
      const orgao = row['ÓRGÃO'];
      const valor = parseFloat(row['VALOR TOTAL DO PROJETO'].replace(/\./g, '').replace(',', '.')) || 0;
      if (!agrupado[orgao]) agrupado[orgao] = 0;
      agrupado[orgao] += valor;
    });
  
    const labels = Object.keys(agrupado);
    const valores = Object.values(agrupado);
  
    desenharGraficoDonut(labels, valores, null, "Valores planejados pelos Órgãos", "ÓRGÃO");
  }
  
  function inicializarDashboard() {
    Promise.all([
      fetch('data/setores_gov.csv').then(res => res.text()),
      fetch('data/detalhado.csv').then(res => res.text())
    ])
    .then(([textoSetores, textoProjetos]) => {
      const parsedSetores = Papa.parse(textoSetores, { header: true, delimiter: ";" });
      dadosSetores = parsedSetores.data.filter(row => row['SETORES'] && row['VALOR PREVISTO']);
    
      const parsedProjetos = Papa.parse(textoProjetos, { header: true, delimiter: ";" });
      dadosProjetos = parsedProjetos.data.filter(row => row['SETORES']);
    
      const colunas = [
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
        { title: 'EXECUÇÃO FÍSICA', field: 'EXECUÇÃO FÍSICA' },
        { title: 'EXECUÇÃO FINANCEIRA', field: 'EXECUÇÃO FINANCEIRA' },
        { title: 'STATUS', field: 'STATUS' },
        { title: 'OBSERVAÇÃO', field: 'OBSERVAÇÃO' }
      ];
            

      tabelaProjetos = new Tabulator("#tabela-container", {
        data: dadosProjetos,
        layout: "fitColumns",
        pagination: false,
        columns: colunas,
        height: "340px",
        responsiveLayout: false,
        movableColumns: false,
    });
    
    // CORRETO: configurar clique só uma vez
    tabelaProjetos.on("rowClick", function(e, row){
      const linhaSelecionada = row.getData();
      desenharGraficosAuxiliares(linhaSelecionada);
    });

      preencherFiltros();
  
      const tipoSalvo = localStorage.getItem('tipoGraficoSelecionado') || 'governador';
      document.getElementById('tipo-grafico').value = tipoSalvo;
  
      // 🔥 Só UM lugar para desenhar o gráfico inicial
      if (tipoSalvo === "governador") {
        desenharGraficoGovernador();
      } else if (tipoSalvo === "orgaos") {
        desenharGraficoOrgaos();
      } else if (tipoSalvo === "comparacao1") {
        desenharGraficoComparacaoSetores();
      } else {
        desenharGraficoGovernador(); // Default
      }
  
      // 🔥 Configura o evento para trocar de gráfico
      document.getElementById('tipo-grafico').addEventListener('change', function() {
        const tipo = this.value;
        localStorage.setItem('tipoGraficoSelecionado', tipo);
  
        if (tipo === "governador") {
          desenharGraficoGovernador();
        } else if (tipo === "orgaos") {
          desenharGraficoOrgaos();
        } else if (tipo === "comparacao1") {
          desenharGraficoComparacaoSetores();
        } else {
          desenharGraficoGovernador();
        }
      });
  
      // 🔥 Configura os filtros de SETOR e ÓRGÃO
      document.getElementById('filtro-setor').addEventListener('change', aplicarFiltrosTabela);
      document.getElementById('filtro-orgao').addEventListener('change', aplicarFiltrosTabela);
      
      desenharGraficosAuxiliares();

    })
    .catch(error => {
      console.error('Erro ao carregar os dados:', error);
    });
  }

  function desenharGraficoComparacaoSetores() {
    // Preparar dados
  
    // 1. Valor previsto pelo Governador
    const dadosGovernador = {};
    dadosSetores.forEach(row => {
      const setor = row['SETORES'];
      const valor = parseFloat(row['VALOR PREVISTO'].replace(/\./g, '').replace(',', '.')) || 0;
      dadosGovernador[setor] = valor;
    });
  
    // 2. Valor planejado pelos Órgãos (somado por SETORES)
    const dadosPlanejado = {};
    dadosProjetos.forEach(row => {
      const setor = row['SETORES'];
      const valor = parseFloat(row['VALOR TOTAL DO PROJETO'].replace(/\./g, '').replace(',', '.')) || 0;
      if (!dadosPlanejado[setor]) dadosPlanejado[setor] = 0;
      dadosPlanejado[setor] += valor;
    });
  
    // 3. Valor pago pelos Órgãos (somado por SETORES)
    const dadosPago = {};
    dadosProjetos.forEach(row => {
      const setor = row['SETORES'];
      const valor = parseFloat(row['VALOR PAGO'].replace(/\./g, '').replace(',', '.')) || 0;
      if (!dadosPago[setor]) dadosPago[setor] = 0;
      dadosPago[setor] += valor;
    });
  
    // 4. Unificar os setores existentes
    const setores = [...new Set([
      ...Object.keys(dadosGovernador),
      ...Object.keys(dadosPlanejado),
      ...Object.keys(dadosPago),
    ])];
  
    // 5. Montar as barras
    const traceGovernador = {
      x: setores,
      y: setores.map(setor => dadosGovernador[setor] || 0),
      name: "Valor Previsto Governador",
      type: "bar"
    };
  
    const tracePlanejado = {
      x: setores,
      y: setores.map(setor => dadosPlanejado[setor] || 0),
      name: "Valor Planejado Órgãos",
      type: "bar"
    };
  
    const tracePago = {
      x: setores,
      y: setores.map(setor => dadosPago[setor] || 0),
      name: "Valor Gasto Órgãos",
      type: "bar"
    };
  
    // 6. Plotar
    Plotly.newPlot('grafico-container', [traceGovernador, tracePlanejado, tracePago], {
      barmode: 'group',
      title: "Comparação Governador x Órgãos",
      width: 800,
      height: 400,
      margin: { t: 40, b: 100, l: 60, r: 20 },
      xaxis: {
        tickangle: -45
      }
    });
  }

  function preencherFiltros() {
    const selectSetor = document.getElementById('filtro-setor');
    const selectOrgao = document.getElementById('filtro-orgao');
  
    const setoresUnicos = [...new Set(dadosProjetos.map(row => row['SETORES']))].sort();
    const orgaosUnicos = [...new Set(dadosProjetos.map(row => row['ÓRGÃO']))].sort();
  
    setoresUnicos.forEach(setor => {
      const option = document.createElement('option');
      option.value = setor;
      option.textContent = setor;
      selectSetor.appendChild(option);
    });
  
    orgaosUnicos.forEach(orgao => {
      const option = document.createElement('option');
      option.value = orgao;
      option.textContent = orgao;
      selectOrgao.appendChild(option);
    });
  }

  function aplicarFiltrosTabela() {
    const setorSelecionadoDropdown = document.getElementById('filtro-setor').value;
    const orgaoSelecionadoDropdown = document.getElementById('filtro-orgao').value;
  
    tabelaProjetos.clearFilter();
  
    if (setorSelecionadoDropdown && orgaoSelecionadoDropdown) {
      tabelaProjetos.setFilter([
        { field: "SETORES", type: "=", value: setorSelecionadoDropdown },
        { field: "ÓRGÃO", type: "=", value: orgaoSelecionadoDropdown }
      ]);
    } else if (setorSelecionadoDropdown) {
      tabelaProjetos.setFilter("SETORES", "=", setorSelecionadoDropdown);
    } else if (orgaoSelecionadoDropdown) {
      tabelaProjetos.setFilter("ÓRGÃO", "=", orgaoSelecionadoDropdown);
    }
  
    // 🔥 Atualizar variável interna
    if (setorSelecionadoDropdown) {
      setorSelecionado = setorSelecionadoDropdown;
    } else if (orgaoSelecionadoDropdown) {
      setorSelecionado = orgaoSelecionadoDropdown;
    } else {
      setorSelecionado = null;
    }
  
    // 🔥 Redesenhar gráfico para refletir a seleção
    const tipoGrafico = document.getElementById('tipo-grafico').value;
  
    if (tipoGrafico === "governador") {
      desenharGraficoGovernador();
    } else if (tipoGrafico === "orgaos") {
      desenharGraficoOrgaos();
    } else if (tipoGrafico === "comparacao1") {
      desenharGraficoComparacaoSetores();
    }
  }
  
  function desenharGraficosAuxiliares(dadosLinhaSelecionada = null) {
    // Gráfico de Distribuição de Execução Física
    const dfExecucao = dadosProjetos.map(row => ({
      "EXECUÇÃO FÍSICA": parseFloat((row['EXECUÇÃO FÍSICA'] || "0").replace('%', '').replace(',', '.')) / 100
    }));
  
    const valoresExecucao = dfExecucao.map(d => d["EXECUÇÃO FÍSICA"]);
  
    const bins = [0, 0.01, 0.25, 0.5, 0.75, 1.0];
    const labels = ["0%", "≥25%", "≥50%", "≥75%", "100%"];
    const categorias = valoresExecucao.map(v => {
      for (let i = 0; i < bins.length - 1; i++) {
        if (v >= bins[i] && v <= bins[i + 1]) return labels[i];
      }
      return "0%";
    });
    const contagem = {};
    labels.forEach(label => contagem[label] = 0);
    categorias.forEach(categoria => {
      contagem[categoria]++;
    });
  
    Plotly.newPlot('grafico-distribuicao', [{
      x: Object.keys(contagem),
      y: Object.values(contagem),
      type: 'bar',
      text: Object.values(contagem),
      textposition: 'outside'
    }], {
      title: 'Distribuição de Execução Física',
      width: 400,
      height: 400,
      margin: { t: 40, b: 40 }
    });
  
    // Gráfico Comparativo Física vs Financeira (se tiver uma linha selecionada)
    if (dadosLinhaSelecionada) {
      const execFisica = parseFloat((dadosLinhaSelecionada['EXECUÇÃO FÍSICA'] || "0").replace('%', '').replace(',', '.'));
      const execFinanceira = parseFloat((dadosLinhaSelecionada['EXECUÇÃO FINANCEIRA'] || "0").replace('%', '').replace(',', '.'));
  
      Plotly.newPlot('grafico-comparativo', [{
        x: ["Execução Física", "Execução Financeira"],
        y: [execFisica, execFinanceira],
        type: 'bar',
        text: [`${execFisica}%`, `${execFinanceira}%`],
        textposition: 'outside'
      }], {
        title: 'Execução Física vs Financeira',
        width: 400,
        height: 400,
        margin: { t: 40, b: 40 },
        yaxis: {
          range: [0, 100],      // 🔥 Isso fixa de 0 a 100!
          ticksuffix: "%"       // 🔥 Isso coloca o símbolo % no eixo
        }
      });
    } else {
      // Caso nada selecionado: limpa o gráfico
      document.getElementById('grafico-comparativo').innerHTML = '<div style="text-align:center;color:gray;">Selecione um projeto</div>';
    }
  } 

  inicializarDashboard({displayModeBar: false});
  