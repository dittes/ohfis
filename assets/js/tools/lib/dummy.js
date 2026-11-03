// dummy.js — realistic fake data for testing. Deterministic when given a seed.
export function rng(seed) { // mulberry32
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const DATA = {
  en: { first: 'Olivia Liam Emma Noah Ava Oliver Sophia Elijah Isabella James Mia Benjamin Amelia Lucas Harper Henry Evelyn Alexander Priya Wei Carlos Fatima Hannah Daniel Grace Samuel Chloe Nathan'.split(' '),
    last: 'Smith Johnson Williams Brown Jones Garcia Miller Davis Wilson Anderson Taylor Thomas Moore Martin Jackson Thompson White Harris Clark Lewis Patel Nguyen Kim Khan Walker Young Allen King Wright Scott'.split(' '),
    street: 'Maple Oak Cedar Elm Pine Lake Hill Park Church Mill River Sunset Highland Willow Meadow'.split(' '), kind: 'Street Avenue Road Lane Drive Way Court Place'.split(' '),
    city: [['Springfield', 'IL', '627'], ['Riverton', 'WY', '825'], ['Fairview', 'OR', '970'], ['Georgetown', 'TX', '786'], ['Madison', 'WI', '537'], ['Clinton', 'NC', '283'], ['Salem', 'MA', '019'], ['Franklin', 'TN', '370']], country: 'United States' },
  de: { first: 'Anna Lukas Marie Leon Sophie Felix Laura Jonas Lena Paul Hannah Elias Mia Finn Emilia Noah Clara Ben Johanna Max Katharina Tobias Julia Moritz Sabine Jan Petra Stefan Nina Tim'.split(' '),
    last: 'Müller Schmidt Schneider Fischer Weber Meyer Wagner Becker Schulz Hoffmann Schäfer Koch Bauer Richter Klein Wolf Schröder Neumann Schwarz Zimmermann Braun Krüger Hofmann Hartmann Lange Schmitt Werner Krause Meier Lehmann'.split(' '),
    street: 'Haupt Bahnhof Garten Schul Linden Berg Wald Kirch Mühlen Rosen Birken Feld Wiesen Dorf Park'.split(' '), kind: ['straße', 'weg', 'allee', 'platz'],
    city: [['Berlin', '', '101'], ['Hamburg', '', '203'], ['München', '', '803'], ['Köln', '', '505'], ['Leipzig', '', '041'], ['Dresden', '', '010'], ['Stuttgart', '', '701'], ['Bremen', '', '282']], country: 'Deutschland' },
};
const COMPANY = ['Northwind', 'Contoso', 'Acme', 'Globex', 'Initech', 'Umbrella', 'Hooli', 'Vandelay', 'Stark', 'Wayne', 'Soylent', 'Wonka', 'Tyrell', 'Aperture', 'Cyberdyne', 'Massive'];
const SUFFIX = ['Ltd', 'GmbH', 'Inc.', 'LLC', 'Group', 'Partners', 'Systems', 'Labs'];
const DOMAINS_SAFE = ['example.com', 'example.org', 'example.net']; // reserved for documentation, never real inboxes
export function generate({ locale = 'en', count = 10, fields = ['name', 'email'], seed = Date.now(), corporate = true } = {}) {
  const r = rng(seed); const D = DATA[locale] || DATA.en; const pick = a => a[Math.floor(r() * a.length)];
  const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').toLowerCase();
  return Array.from({ length: count }, () => {
    const first = pick(D.first), last = pick(D.last), company = pick(COMPANY), c = pick(D.city);
    const num = 1 + Math.floor(r() * 180), st = pick(D.street) + (locale === 'de' ? '' : ' ') + pick(D.kind);
    const zip = locale === 'de' ? `${c[2]}${String(10 + Math.floor(r() * 89))}`.slice(0, 5) : c[2] + String(10 + Math.floor(r() * 89));
    const rec = {
      name: `${first} ${last}`, first, last,
      email: corporate ? `${fold(first)}.${fold(last)}@${fold(company)}.example.com` : `${fold(first)}.${fold(last)}@${pick(DOMAINS_SAFE)}`,
      company: `${company} ${pick(SUFFIX)}`, title: pick(['Account Manager', 'Software Engineer', 'Project Lead', 'Data Analyst', 'Office Manager', 'Product Designer', 'Sales Director', 'HR Partner']),
      phone: locale === 'de' ? `+49 ${30 + Math.floor(r() * 60)} ${String(1000000 + Math.floor(r() * 8999999))}` : `+1 555 01${String(Math.floor(r() * 100)).padStart(2, '0')}`,
      street: locale === 'de' ? `${st} ${num}` : `${num} ${st}`, city: c[0], state: c[1], zip, country: D.country,
      date: new Date(Date.UTC(2020 + Math.floor(r() * 6), Math.floor(r() * 12), 1 + Math.floor(r() * 28))).toISOString().slice(0, 10),
      amount: (Math.round(r() * 500000) / 100).toFixed(2), id: String(100000 + Math.floor(r() * 899999)),
    };
    return Object.fromEntries(fields.map(f => [f, rec[f]]));
  });
}
