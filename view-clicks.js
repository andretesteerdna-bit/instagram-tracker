const fs = require('fs');

const CLICKS_FILE = 'clicks.json';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('pt-BR');
}

function displayClicks() {
  if (!fs.existsSync(CLICKS_FILE)) {
    console.log(`${colors.yellow}⚠️  Nenhum arquivo de cliques encontrado.${colors.reset}`);
    return;
  }

  const data = fs.readFileSync(CLICKS_FILE, 'utf8');
  const clicks = JSON.parse(data);

  console.clear();
  console.log(`${colors.bright}${colors.cyan}╔════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║     📊 RASTREADOR DE CLIQUES - INSTAGRAM          ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚════════════════════════════════════════════════════╝${colors.reset}\n`);

  if (clicks.length === 0) {
    console.log(`${colors.yellow}📭 Nenhum clique registrado ainda.\n${colors.reset}`);
    return;
  }

  console.log(`${colors.bright}${colors.green}📈 ESTATÍSTICAS:${colors.reset}`);
  console.log(`${colors.bright}Total de cliques:${colors.reset} ${clicks.length}`);
  
  const today = new Date().toDateString();
  const todayClicks = clicks.filter(click => 
    new Date(click.timestamp).toDateString() === today
  );
  console.log(`${colors.bright}Cliques hoje:${colors.reset} ${todayClicks.length}`);
  
  const uniqueIPs = new Set(clicks.map(click => click.ip));
  console.log(`${colors.bright}Visitantes únicos:${colors.reset} ${uniqueIPs.size}\n`);

  console.log(`${colors.bright}${colors.blue}📋 ÚLTIMOS CLIQUES:${colors.reset}\n`);
  
  const reversedClicks = [...clicks].reverse().slice(0, 20);
  
  reversedClicks.forEach((click, index) => {
    const isInstagram = click.userAgent.toLowerCase().includes('instagram');
    const icon = isInstagram ? '📸' : '🌐';
    
    console.log(`${colors.bright}${icon} Clique #${clicks.length - index}${colors.reset}`);
    console.log(`   ${colors.cyan}⏰ Data:${colors.reset} ${formatDate(click.timestamp)}`);
    console.log(`   ${colors.cyan}🌐 IP:${colors.reset} ${click.ip}`);
    
    if (isInstagram) {
      console.log(`   ${colors.green}✅ ORIGEM: INSTAGRAM${colors.reset}`);
    }
    
    console.log(`   ${colors.cyan}🔗 Referer:${colors.reset} ${click.referer}`);
    console.log('');
  });
}

displayClicks();
