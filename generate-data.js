/**
 * generate-data.js
 *
 * Run by GitHub Actions every 2 hours.
 * Fetches WC26 scorers from openfootball, asks Claude to attribute
 * them to their senior clubs, and writes the result to data.json.
 *
 * Requires Node 18+ (built-in fetch). No npm install needed.
 * Needs env var: ANTHROPIC_API_KEY
 */

const fs = require('fs');

const OPENFOOTBALL_URL =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';

const KNOWN_LOGOS = {
  'Arsenal': 'https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg',
  'Manchester City': 'https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg',
  'Manchester United': 'https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg',
  'Liverpool': 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg',
  'Chelsea': 'https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg',
  'Tottenham Hotspur': 'https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg',
  'Tottenham': 'https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg',
  'Barcelona': 'https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg',
  'Real Madrid': 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg',
  'Atlético Madrid': 'https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg',
  'Atletico Madrid': 'https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg',
  'Bayern Munich': 'https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282002%E2%80%932017%29.svg',
  'Borussia Dortmund': 'https://upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg',
  'Juventus': 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Juventus_FC_2017_icon_%28black%29.svg',
  'Inter Milan': 'https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg',
  'AC Milan': 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg',
  'Paris Saint-Germain': 'https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg',
  'PSG': 'https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg',
  'Ajax': 'https://upload.wikimedia.org/wikipedia/en/7/79/Ajax_Amsterdam.svg',
  'Porto': 'https://upload.wikimedia.org/wikipedia/en/f/f1/FC_Porto.svg',
  'Benfica': 'https://upload.wikimedia.org/wikipedia/en/a/a2/SL_Benfica_logo.svg',
  'Sporting CP': 'https://upload.wikimedia.org/wikipedia/en/f/f7/Sporting_CP.svg',
  'Napoli': 'https://upload.wikimedia.org/wikipedia/commons/2/2d/SSC_Napoli_badge_%28New%29.svg',
  'Roma': 'https://upload.wikimedia.org/wikipedia/en/f/f7/AS_Roma_logo_%282013%29.svg',
  'Sevilla': 'https://upload.wikimedia.org/wikipedia/en/3/3b/Sevilla_fc_logo.svg',
  'Valencia': 'https://upload.wikimedia.org/wikipedia/en/c/ce/Valenciacf.svg',
  'Leicester City': 'https://upload.wikimedia.org/wikipedia/en/2/2d/Leicester_City_crest.svg',
  'Aston Villa': 'https://upload.wikimedia.org/wikipedia/en/9/9f/Aston_Villa_FC_crest_%282016%29.svg',
  'Newcastle United': 'https://upload.wikimedia.org/wikipedia/en/5/56/Newcastle_United_Logo.svg',
  'West Ham United': 'https://upload.wikimedia.org/wikipedia/en/c/c2/West_Ham_United_FC_logo.svg',
  'Bayer Leverkusen': 'https://upload.wikimedia.org/wikipedia/en/5/59/Bayer_04_Leverkusen_logo.svg',
  'RB Leipzig': 'https://upload.wikimedia.org/wikipedia/en/0/04/RB_Leipzig_2014_logo.svg',
  'Borussia Mönchengladbach': 'https://upload.wikimedia.org/wikipedia/en/8/81/Borussia_Monchengladbach_logo.svg',
  'Borussia Monchengladbach': 'https://upload.wikimedia.org/wikipedia/en/8/81/Borussia_Monchengladbach_logo.svg',
  'Schalke': 'https://upload.wikimedia.org/wikipedia/commons/6/6d/FC_Schalke_04_Logo.svg',
  'Wolfsburg': 'https://upload.wikimedia.org/wikipedia/commons/f/f3/VfL_Wolfsburg_Logo.svg',
  'Lyon': 'https://upload.wikimedia.org/wikipedia/en/8/87/Olympique_Lyonnais.svg',
  'Marseille': 'https://upload.wikimedia.org/wikipedia/commons/d/d8/Olympique_Marseille_logo.svg',
  'Lille': 'https://upload.wikimedia.org/wikipedia/en/9/94/LOSC_Lille_2011_logo.svg',
  'Monaco': 'https://upload.wikimedia.org/wikipedia/en/e/e1/AS_Monaco_FC.svg',
  'Nice': 'https://upload.wikimedia.org/wikipedia/en/e/e2/OGC_Nice_logo.svg',
  'Celtic': 'https://upload.wikimedia.org/wikipedia/en/a/a4/Celtic_FC_crest.svg',
  'Rangers': 'https://upload.wikimedia.org/wikipedia/en/a/a0/Rangers_FC_logo_2003.svg',
  'Galatasaray': 'https://upload.wikimedia.org/wikipedia/commons/4/44/Galatasaray.svg',
  'PSV': 'https://upload.wikimedia.org/wikipedia/en/0/05/PSV_Eindhoven.svg',
  'Feyenoord': 'https://upload.wikimedia.org/wikipedia/en/d/de/Feyenoord_logo.svg',
  'Flamengo': 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Flamengo_braz_logo.svg',
  'Palmeiras': 'https://upload.wikimedia.org/wikipedia/commons/1/10/Palmeiras_logo.svg',
  'River Plate': 'https://upload.wikimedia.org/wikipedia/en/4/43/Escudo_del_Club_Atl%C3%A9tico_River_Plate.svg',
  'Boca Juniors': 'https://upload.wikimedia.org/wikipedia/commons/1/13/Boca_Juniors.svg',
  'Inter Miami': 'https://upload.wikimedia.org/wikipedia/en/4/42/Inter_Miami_CF_crest.svg',
  'LA Galaxy': 'https://upload.wikimedia.org/wikipedia/commons/a/a3/LA_Galaxy_logo.svg',
  'LAFC': 'https://upload.wikimedia.org/wikipedia/en/d/df/LAFC_Primary_Logo_2.svg',
  'Real Sociedad': 'https://upload.wikimedia.org/wikipedia/en/f/f1/Real_Sociedad_logo.svg',
  'Athletic Bilbao': 'https://upload.wikimedia.org/wikipedia/en/9/98/Club_Athletic_de_Bilbao_logo.svg',
  'Villarreal': 'https://upload.wikimedia.org/wikipedia/en/b/b9/Villarreal_CF_logo-en.svg',
  'Real Betis': 'https://upload.wikimedia.org/wikipedia/en/1/13/Real_betis_logo.svg',
  'Lazio': 'https://upload.wikimedia.org/wikipedia/en/b/b5/S.S._Lazio_badge.svg',
  'Atalanta': 'https://upload.wikimedia.org/wikipedia/de/0/04/Bergamo_Calcio_Atalanta_crest.svg',
  'Fiorentina': 'https://upload.wikimedia.org/wikipedia/commons/9/93/ACF_Fiorentina.svg',
  'Brighton': 'https://upload.wikimedia.org/wikipedia/en/f/fd/Brighton_%26_Hove_Albion_logo.svg',
  'Everton': 'https://upload.wikimedia.org/wikipedia/en/7/7c/Everton_FC_logo.svg',
  'Fulham': 'https://upload.wikimedia.org/wikipedia/en/e/eb/Fulham_FC_%28shield%29.svg',
  'Brentford': 'https://upload.wikimedia.org/wikipedia/en/2/2a/Brentford_FC_crest.svg',
  'Crystal Palace': 'https://upload.wikimedia.org/wikipedia/en/a/a2/Crystal_Palace_FC_logo_%282022%29.svg',
  'Wolves': 'https://upload.wikimedia.org/wikipedia/en/f/fc/Wolverhampton_Wanderers.svg',
  'Wolverhampton Wanderers': 'https://upload.wikimedia.org/wikipedia/en/f/fc/Wolverhampton_Wanderers.svg',
  'Nottingham Forest': 'https://upload.wikimedia.org/wikipedia/en/e/e5/Nottingham_Forest_F.C._logo.svg',
  'Club America': 'https://upload.wikimedia.org/wikipedia/en/2/23/Club_America_badge.svg',
  'Chivas': 'https://upload.wikimedia.org/wikipedia/en/2/29/CD_Guadalajara.svg',
  'Seattle Sounders': 'https://upload.wikimedia.org/wikipedia/en/b/bc/Seattle_Sounders_FC_logo_2016.svg',
};

// ── Step 1: fetch scorers from openfootball ────────────────────────────────
async function fetchScorers() {
  console.log('Fetching match data from openfootball…');
  const resp = await fetch(OPENFOOTBALL_URL);
  if (!resp.ok) throw new Error(`openfootball returned ${resp.status}`);
  const data = await resp.json();

  const map = {};
  for (const match of (data.matches || [])) {
    for (const [arr, nat] of [
      [match.goals1 || [], match.team1 || ''],
      [match.goals2 || [], match.team2 || ''],
    ]) {
      for (const g of arr) {
        if (g.owngoal) continue;
        const name = (g.name || '').trim();
        if (!name) continue;
        const key = `${name}|${nat}`;
        if (!map[key]) map[key] = { name, nat, goals: 0 };
        map[key].goals++;
      }
    }
  }

  const scorers = Object.values(map).filter(s => s.goals > 0);
  console.log(`Found ${scorers.length} scorers.`);
  return scorers;
}

// ── Step 2: ask Claude to attribute goals to clubs (in batches of 15) ───────
async function attributeToClubs(scorers) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY environment variable not set');

  // Split into batches of 15 to stay well within token limits
  const BATCH_SIZE = 15;
  const batches = [];
  for (let i = 0; i < scorers.length; i += BATCH_SIZE) {
    batches.push(scorers.slice(i, i + BATCH_SIZE));
  }

  console.log(`Processing ${scorers.length} scorers in ${batches.length} batches…`);

  const allPlayers = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`  Batch ${i + 1}/${batches.length} (${batch.length} scorers)…`);

    const list = batch
      .map(s => `${s.name} (${s.nat}, ${s.goals} goal${s.goals !== 1 ? 's' : ''})`)
      .join('\n');

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: `You are a football historian. For each WC26 scorer below, list ALL their senior clubs (current + all former clubs, including significant loans).

${list}

Reply ONLY with a JSON array, no markdown fences, no explanation:
[{"player":"Name","nat":"Nation","goals":2,"clubs":[{"name":"Club","nation":"Country","league":"League","current":true,"logo":"https://upload.wikimedia.org/wikipedia/..."}]}]

For the "logo" field, provide the exact Wikimedia Commons or Wikipedia SVG URL for the club's official crest/badge. Use URLs in this format:
- https://upload.wikimedia.org/wikipedia/en/x/xx/Club_Name.svg
- https://upload.wikimedia.org/wikipedia/commons/x/xx/Club_Name.svg
If you are not confident of the exact URL, set logo to null.

Be comprehensive with clubs. If unsure of a club, include at minimum their current club.`,
        }],
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error((err.error && err.error.message) || `Anthropic API returned ${resp.status}`);
    }

    const data = await resp.json();
    const text = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error(`Batch ${i + 1}: Claude returned unexpected format:\n` + text.slice(0, 300));

    const players = JSON.parse(match[0]);
    allPlayers.push(...players);

    // Small delay between batches to avoid rate limiting
    if (i < batches.length - 1) await new Promise(r => setTimeout(r, 1000));
  }

  return allPlayers;
}


// ── Step 3: build club map ─────────────────────────────────────────────────
function buildClubs(players) {
  const map = {};
  for (const p of players) {
    for (const c of (p.clubs || [])) {
      if (!map[c.name]) {
        map[c.name] = {
          club: c.name,
          nation: c.nation || '',
          league: c.league || '',
          logo: c.logo || KNOWN_LOGOS[c.name] || null,
          goals: 0,
          players: [],
        };
      }
      map[c.name].goals += (p.goals || 0);
      map[c.name].players.push({
        name: p.player,
        nat: p.nat || '',
        goals: p.goals || 0,
        current: c.current || false,
      });
    }
  }
  return Object.values(map).sort((a, b) => b.goals - a.goals);
}

// ── Main ───────────────────────────────────────────────────────────────────
(async () => {
  try {
    const scorers = await fetchScorers();

    if (!scorers.length) {
      console.log('No goals yet — writing empty data.json');
      fs.writeFileSync('data.json', JSON.stringify({
        updatedAt: new Date().toISOString(),
        totalGoals: 0,
        scorers: 0,
        nations: 0,
        clubs: [],
      }, null, 2));
      return;
    }

    const players  = await attributeToClubs(scorers);
    const clubs    = buildClubs(players);
    const nations  = new Set(scorers.map(s => s.nat).filter(Boolean));

    const output = {
      updatedAt:  new Date().toISOString(),
      totalGoals: scorers.reduce((s, p) => s + p.goals, 0),
      scorers:    scorers.length,
      nations:    nations.size,
      clubs,
    };

    fs.writeFileSync('data.json', JSON.stringify(output, null, 2));
    console.log(`Done. ${clubs.length} clubs written to data.json.`);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
