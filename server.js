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

// Busca localização por IP (SEMPRE funciona)
async function getLocationByIP(ip) {
  try {
    let ipClean = ip.replace('::ffff:', '').replace('::1', '').trim();
    
    // Se for IP local, busca IP público
    if (ipClean === '127.0.0.1' || ipClean === '' || ipClean.startsWith('192.168') || ipClean.startsWith('10.')) {
      try {
        const ipData = await fetchJSON('https://api.ipify.org?format=json');
        ipClean = ipData.ip;
      } catch (e) {
        console.log('⚠ Não foi possível obter IP público, usando local');
      }
    }
    
    // Busca localização (API gratuita, sem limite)
    const ipData = await fetchJSON(`http://ip-api.com/json/${ipClean}?lang=pt&fields=status,country,regionName,city,lat,lon`);
    
    if (ipData.status === 'success') {
      return {
        cidade: ipData.city || 'Desconhecida',
        estado: ipData.regionName || 'Desconhecido',
        pais: ipData.country || 'Brasil',
        coordenadas: ipData.lat && ipData.lon ? `${ipData.lat}, ${ipData.lon}` : null,
        tipo: 'IP'
      };
    }
    
    // Fallback se a API falhar
    return {
      cidade: 'Não identificada',
      estado: 'Não identificado',
      pais: 'Brasil',
      tipo: 'IP'
    };
  } catch (error) {
    return {
      cidade: 'Não identificada',
      estado: 'Não identificado',
      pais: 'Brasil',
      tipo: 'IP',
      erro: error.message
    };
  }
}

// Dashboard principal
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
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
        .location-badge {
          display: inline-block;
          background: #28a745;
          color: white;
          padding: 5px 12px;
          border-radius: 15px;
          font-size: 0.85em;
          font-weight: bold;
          margin: 10px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📍 Rastreador de Localização</h1>
          <p>Captura <strong>cidade, estado e horário</strong> de quem clica no link</p>
          <div class="link-box">
            <strong>🔗 Seu Link de Rastreamento:</strong>
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
            <div class="stat-number" id="uniqueIPs">0</div>
            <div class="stat-label">IPs Únicos</div>
          </div>
        </div>
        
        <div class="clicks-container">
          <button class="btn" onclick="loadData()">🔄 Atualizar Dados</button>
          <h2 style="margin:20px 0;">📋 Últimos Cliques</h2>
          <div id="clicksList">Carregando...</div>
        </div>
      </div>
      
      <script>
        const trackingUrl = window.location.origin + '/track';
        document.getElementById('trackingLink').textContent = trackingUrl;
        
        function copyLink() {
          navigator.clipboard.writeText(trackingUrl);
          alert('✅ Link copiado para área de transferência!');
        }
        
        async function loadData() {
          try {
            const res = await fetch('/api/stats');
            const data = await res.json();
            
            document.getElementById('totalClicks').textContent = data.total;
            
            const uniqueIPs = new Set(data.clicks.map(c => c.ip));
            document.getElementById('uniqueIPs').textContent = uniqueIPs.size;
            
            const container = document.getElementById('clicksList');
            
            if (data.clicks.length === 0) {
              container.innerHTML = '<p style="text-align:center; color:#999; padding:40px;">📭 Nenhum clique registrado ainda</p>';
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
              
              const loc = c.location;
              
              return \`
                <div class="click-item">
                  <div class="click-time">⏰ \${date}</div>
                  <div class="click-info">🌐 <strong>IP:</strong> \${c.ip}</div>
                  \${loc ? \`
                    <div class="location-badge">✅ Localização Capturada</div>
                    <div class="click-info">🏙️ <strong>Cidade:</strong> \${loc.cidade}</div>
                    <div class="click-info">📍 <strong>Estado:</strong> \${loc.estado}</div>
                    <div class="click-info">🌎 <strong>País:</strong> \${loc.pais}</div>
                    \${loc.coordenadas ? \`
                      <div class="click-info">📌 <strong>Coordenadas:</strong> \${loc.coordenadas}</div>
                      <div class="click-info">
                        <a href="https://www.google.com/maps?q=\${loc.coordenadas}" target="_blank" style="color:#667eea; font-weight:bold;">
                          🗺️ Ver no Google Maps
                        </a>
                      </div>
                    \` : ''}
                  \` : \`
                    <div class="click-info" style="color:#ff6b6b;">❌ Localização não disponível</div>
                  \`}
                </div>
              \`;
            }).join('');
          } catch (error) {
            console.error('Erro:', error);
          }
        }
        
        // Carrega dados ao abrir e atualiza a cada 5 segundos
        loadData();
        setInterval(loadData, 5000);
      </script>
    </body>
    </html>
  `);
});

// Página de rastreamento (onde a vítima clica)
app.get('/track', async (req, res) => {
  const ip = getIP(req);
  const userAgent = req.headers['user-agent'] || 'Desconhecido';
  
  // Cria o registro do clique
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
  console.log('IP:', ip);
  console.log('Hora:', new Date().toLocaleString('pt-BR'));
  
  // Busca localização por IP IMEDIATAMENTE (em background)
  getLocationByIP(ip).then(location => {
    clickData.location = location;
    console.log('✅ Localização:', location.cidade, '-', location.estado);
  }).catch(err => {
    console.log('❌ Erro ao buscar localização:', err.message);
  });
  
  // Responde com página de redirecionamento
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Carregando...</title>
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
          font-size: 80px;
          font-weight: bold;
          margin-bottom: 20px;
        }
        h2 {
          font-size: 18px;
          font-weight: 400;
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
        <h2>Redirecionando...</h2>
        <div class="loader"></div>
      </div>
      
      <script>
        // Redireciona após 1 segundo
        setTimeout(() => {
          window.location.href = 'https://www.facebook.com/';
        }, 1000);
      </script>
    </body>
    </html>
  `);
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
  console.log('✅ SERVIDOR RASTREADOR ONLINE');
  console.log('========================================');
  console.log('🌐 Porta:', PORT);
  console.log('📍 Captura: Cidade, Estado e Horário');
  console.log('🔗 Redirect: Facebook');
  console.log('========================================');
  console.log('');
});
