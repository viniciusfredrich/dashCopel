const mapaCores = {
    "Habitação": "#1f77b4",
    "Sustentabilidade": "#ff7f0e",
    "Cidades": "#2ca02c",
    "Educação": "#d62728",
    "Infraestrutura": "#9467bd",
    "Incentivo ao Crédito": "#8c564b",
    "A definir": "#e377c2",
  };
  
  function aplicarTransparencia(cor) {
    if (cor.startsWith('#')) {
      // Converter HEX para RGB primeiro
      const bigint = parseInt(cor.slice(1), 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `rgba(${r},${g},${b},0.4)`; // 0.4 = 40% opaco
    }
    return cor; // Se já for RGB, retorna direto
  }

  let dadosCarregados = [];
  let tabelaProjetos = null;
  let setorSelecionado = null;
  
  function desenharGraficoDonut(labels, valores, labelAtivo = null) {
    const cores = labels.map(label => {
      const corBase = mapaCores[label] || "gray";
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
      hovertemplate: "%{label}: %{value}<extra></extra>",
      texttemplate: "%{label}<br>%{value}",
      textposition: "outside",
    }], {
      title: "Valores definidos pelo Governador",
      width: 600,
      height: 400,
      margin: { t: 40, b: 0, l: 0, r: 0 },
      showlegend: false,
    });
  
    // Adicionar evento de clique no gráfico
    let graficoContainer = document.getElementById('grafico-container');
    graficoContainer.on('plotly_click', function(data) {
      if (data.points.length > 0) {
        const setorClicado = data.points[0].label;
  
        if (setorSelecionado === setorClicado) {
          // Clicou no mesmo setor → limpa seleção
          setorSelecionado = null;
          tabelaProjetos.clearFilter();
          desenharGraficoDonut(labels, valores, null); // Voltar tudo normal
        } else {
          setorSelecionado = setorClicado;
          tabelaProjetos.setFilter("SETORES", "=", setorSelecionado);
          desenharGraficoDonut(labels, valores, setorSelecionado); // Atualizar cores
        }
      }
    });
  }
  
  function desenharGraficoBarra(labels, valores) {
    const cores = labels.map(label => mapaCores[label] || "gray");
  
    Plotly.newPlot('grafico-container', [{
      type: "bar",
      x: valores,
      y: labels,
      orientation: 'h',
      marker: { color: cores },
      hovertemplate: "%{y}: %{x}<extra></extra>",
    }], {
      title: "Valores definidos pelo Governador - Barras",
      width: 600,
      height: 400,
      margin: { t: 40, b: 0, l: 0, r: 0 },
      showlegend: false,
    });
  }
  
  function inicializarDashboard() {
    // Carregar setores_gov.csv para o gráfico
    fetch('data/setores_gov.csv')
      .then(response => response.text())
      .then(text => {
        const parsed = Papa.parse(text, { header: true, delimiter: ";" });
        const dadosSetores = parsed.data.filter(row => row['SETORES'] && row['VALOR PREVISTO']);
  
        const labels = dadosSetores.map(row => row['SETORES']);
        const valores = dadosSetores.map(row => parseFloat(row['VALOR PREVISTO']));
  
        desenharGraficoDonut(labels, valores);
  
        // Configura os botões
        document.getElementById('btn-donut').addEventListener('click', () => {
          desenharGraficoDonut(labels, valores);
        });
  
        document.getElementById('btn-barra').addEventListener('click', () => {
          desenharGraficoBarra(labels, valores);
        });
      });
  
      fetch('data/detalhado.csv')
      .then(response => response.text())
      .then(text => {
        const parsed = Papa.parse(text, { 
          header: true,
          delimiter: ";"
        });
        const dadosProjetos = parsed.data.filter(row => row['SETORES']);
    
        tabelaProjetos = new Tabulator("#tabela-container", {
            data: dadosProjetos,
            autoColumns: true,
            layout: "fitDataStretch",
            pagination: true,
            paginationSize: 10,
            height: "500px",
          });
        });
  }
  
  inicializarDashboard();
  