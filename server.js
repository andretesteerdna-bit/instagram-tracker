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

app.get('/track', (req, res) => {
  const clickData = {
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent'],
    referer: req.headers['referer'] || 'Direct',
    ip: req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress,
    headers: {
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'accept-language': req.headers['accept-language']
    }
  };

  saveClick(clickData);
  res.redirect('https://google.com');
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
