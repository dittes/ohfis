// canvas.js — definitions and pure helpers for the sticky-note canvases (business model canvas, lean canvas, Eisenhower matrix …).
// No DOM here; the board UI is in ../canvasboard.js. Unit-tested in tests/canvas.test.mjs.
// Each section: key, title, hint (a guiding question), at: [column, row, columnSpan, rowSpan] on the board grid.

/** Where each canvas comes from; shown under the board. */
export const CREDITS = {
  bmc: { text: 'The Business Model Canvas was created by Alexander Osterwalder and Yves Pigneur (Strategyzer AG) and is licensed under Creative Commons Attribution-ShareAlike (CC BY-SA). This board is an adapted, re-drawn version.', url: 'https://creativecommons.org/licenses/by-sa/3.0/', link: 'CC BY-SA' },
  lean: { text: 'The Lean Canvas was created by Ash Maurya as an adaptation of the Business Model Canvas of Alexander Osterwalder (CC BY-SA). This board is a re-drawn version.', url: 'https://creativecommons.org/licenses/by-sa/3.0/', link: 'CC BY-SA' },
  team: { text: 'The Team Canvas was created by Alex Ivanov (theteamcanvas.com) and is licensed under CC BY-SA 4.0. This board is an adapted, re-drawn version.', url: 'https://creativecommons.org/licenses/by-sa/4.0/', link: 'CC BY-SA 4.0' },
  empathy: { text: 'The empathy map goes back to Dave Gray and XPLANE (Gamestorming). Only the general idea is used here; the layout and wording are our own.', url: '', link: '' },
  generic: { text: 'A generic planning method; the layout and wording are our own.', url: '', link: '' },
};

export const BOARDS = {
  'eisenhower-matrix-board': {
    grid: [2, 2], axes: { top: ['Urgent', 'Not urgent'], left: ['Important', 'Not important'] }, credit: 'generic',
    sections: [
      { key: 'do', title: 'Do first', hint: 'Urgent and important: handle it now.', at: [1, 1, 1, 1] },
      { key: 'schedule', title: 'Schedule', hint: 'Important, not urgent: plan a date.', at: [2, 1, 1, 1] },
      { key: 'delegate', title: 'Delegate', hint: 'Urgent, not important: hand it over.', at: [1, 2, 1, 1] },
      { key: 'drop', title: 'Drop', hint: 'Neither: stop doing it.', at: [2, 2, 1, 1] },
    ],
    sample: { do: ['Fix the checkout bug', 'Send the tax documents'], schedule: ['Plan next quarter', 'Learn the new tool'], delegate: ['Book the meeting room'], drop: ['Check social media'] },
  },
  'business-model-canvas': {
    grid: [10, 6], credit: 'bmc',
    sections: [
      { key: 'partners', title: 'Key partners', hint: 'Who are our key partners and suppliers?', at: [1, 1, 2, 4] },
      { key: 'activities', title: 'Key activities', hint: 'What must we do to deliver the value?', at: [3, 1, 2, 2] },
      { key: 'resources', title: 'Key resources', hint: 'Which assets do we need?', at: [3, 3, 2, 2] },
      { key: 'value', title: 'Value propositions', hint: 'What value do we deliver, which problem do we solve?', at: [5, 1, 2, 4] },
      { key: 'relationships', title: 'Customer relationships', hint: 'How do we get, keep and grow customers?', at: [7, 1, 2, 2] },
      { key: 'channels', title: 'Channels', hint: 'How do we reach our customers?', at: [7, 3, 2, 2] },
      { key: 'segments', title: 'Customer segments', hint: 'Who are we creating value for?', at: [9, 1, 2, 4] },
      { key: 'costs', title: 'Cost structure', hint: 'What are the most important costs?', at: [1, 5, 5, 2] },
      { key: 'revenue', title: 'Revenue streams', hint: 'For what do customers really pay, and how?', at: [6, 5, 5, 2] },
    ],
    sample: { partners: ['Payment provider', 'Roasters'], activities: ['Roasting', 'Online shop'], resources: ['Roastery', 'Brand'], value: ['Fresh coffee delivered monthly', 'Fair trade'], relationships: ['Subscription', 'Newsletter'], channels: ['Website', 'Farmers market'], segments: ['Home coffee lovers', 'Small offices'], costs: ['Beans', 'Shipping', 'Staff'], revenue: ['Monthly subscriptions', 'One-off orders'] },
  },
  'lean-canvas': {
    grid: [10, 6], credit: 'lean',
    sections: [
      { key: 'problem', title: 'Problem', hint: 'Top 1–3 problems. Existing alternatives?', at: [1, 1, 2, 4] },
      { key: 'solution', title: 'Solution', hint: 'Top 3 features that solve them.', at: [3, 1, 2, 2] },
      { key: 'metrics', title: 'Key metrics', hint: 'Which numbers show that it works?', at: [3, 3, 2, 2] },
      { key: 'uvp', title: 'Unique value proposition', hint: 'Single, clear, compelling message. High-level concept?', at: [5, 1, 2, 4] },
      { key: 'advantage', title: 'Unfair advantage', hint: 'What cannot easily be copied or bought?', at: [7, 1, 2, 2] },
      { key: 'channels', title: 'Channels', hint: 'Path to customers.', at: [7, 3, 2, 2] },
      { key: 'segments', title: 'Customer segments', hint: 'Target customers and early adopters.', at: [9, 1, 2, 4] },
      { key: 'costs', title: 'Cost structure', hint: 'Customer acquisition, distribution, hosting, people.', at: [1, 5, 5, 2] },
      { key: 'revenue', title: 'Revenue streams', hint: 'Revenue model, lifetime value, margin.', at: [6, 5, 5, 2] },
    ],
    sample: { problem: ['Meal planning takes too long', 'Food gets wasted'], solution: ['Weekly plan from what is in the fridge', 'Shopping list'], metrics: ['Weekly active users', 'Plans cooked'], uvp: ['Cook tonight with what you already have'], advantage: ['Recipe data from 10 000 users'], channels: ['App store', 'Food blogs'], segments: ['Busy parents', 'Students'], costs: ['Developers', 'Hosting'], revenue: ['Premium plan 4 € a month'] },
  },
  'team-canvas': {
    grid: [6, 4], credit: 'team',
    sections: [
      { key: 'purpose', title: 'Purpose', hint: 'Why are we here? What is our reason to exist?', at: [1, 1, 2, 1] },
      { key: 'goals', title: 'Goals and success criteria', hint: 'What do we want to achieve and how do we know?', at: [3, 1, 2, 1] },
      { key: 'values', title: 'Values', hint: 'What do we stand for, how do we treat each other?', at: [5, 1, 2, 1] },
      { key: 'roles', title: 'Roles and skills', hint: 'Who does what, which skills do we have?', at: [1, 2, 2, 1] },
      { key: 'personal', title: 'Personal goals and needs', hint: 'What does each person want and need from the team?', at: [3, 2, 2, 1] },
      { key: 'strengths', title: 'Strengths and assets', hint: 'What are we good at, which resources do we have?', at: [5, 2, 2, 1] },
      { key: 'weaknesses', title: 'Weaknesses and risks', hint: 'What could stop us?', at: [1, 3, 3, 1] },
      { key: 'rules', title: 'Rules and activities', hint: 'How do we work together: meetings, communication, decisions?', at: [4, 3, 3, 1] },
    ],
    sample: { purpose: ['Make onboarding painless for new customers'], goals: ['Cut setup time to 10 minutes by June'], values: ['Honest feedback', 'Ship small'], roles: ['Ann: design', 'Ben: backend'], personal: ['Cleo wants to learn data work'], strengths: ['Fast decisions'], weaknesses: ['Only one person knows billing'], rules: ['Daily stand-up at 9:30', 'Decisions are written down'] },
  },
  'empathy-map-canvas': {
    grid: [6, 4], credit: 'empathy',
    sections: [
      { key: 'thinks', title: 'Thinks and feels', hint: 'What matters to them? Worries and dreams?', at: [3, 1, 2, 1] },
      { key: 'sees', title: 'Sees', hint: 'What do they see in their environment?', at: [1, 1, 2, 2] },
      { key: 'hears', title: 'Hears', hint: 'What do friends, bosses and media tell them?', at: [5, 1, 2, 2] },
      { key: 'says', title: 'Says and does', hint: 'What do they say, how do they behave?', at: [3, 2, 2, 1] },
      { key: 'pains', title: 'Pains', hint: 'Fears, frustrations, obstacles.', at: [1, 3, 3, 2] },
      { key: 'gains', title: 'Gains', hint: 'Wants, needs, measures of success.', at: [4, 3, 3, 2] },
    ],
    sample: { thinks: ['I never have enough time'], sees: ['Colleagues using many tools'], hears: ['“Just use a spreadsheet”'], says: ['“I will do it tomorrow”'], pains: ['Switching between apps', 'Losing files'], gains: ['One place for everything', 'Feeling in control'] },
  },
  'pestel-analysis-board': {
    grid: [3, 2], credit: 'generic',
    sections: [
      { key: 'political', title: 'Political', hint: 'Government, taxes, trade rules, stability.', at: [1, 1, 1, 1] },
      { key: 'economic', title: 'Economic', hint: 'Growth, inflation, interest rates, spending power.', at: [2, 1, 1, 1] },
      { key: 'social', title: 'Social', hint: 'Demographics, values, lifestyle, trends.', at: [3, 1, 1, 1] },
      { key: 'technological', title: 'Technological', hint: 'New technology, automation, research.', at: [1, 2, 1, 1] },
      { key: 'environmental', title: 'Environmental', hint: 'Climate, resources, sustainability rules.', at: [2, 2, 1, 1] },
      { key: 'legal', title: 'Legal', hint: 'Laws, data protection, employment, standards.', at: [3, 2, 1, 1] },
    ],
    sample: { political: ['Election in the main market'], economic: ['Rising interest rates'], social: ['More remote work'], technological: ['AI tools lower costs'], environmental: ['Packaging rules tighten'], legal: ['New data protection rules'] },
  },
  'porters-five-forces-board': {
    grid: [3, 3], credit: 'generic',
    sections: [
      { key: 'entrants', title: 'Threat of new entrants', hint: 'How easy is it to enter the market?', at: [2, 1, 1, 1] },
      { key: 'suppliers', title: 'Bargaining power of suppliers', hint: 'How much can suppliers dictate terms?', at: [1, 2, 1, 1] },
      { key: 'rivalry', title: 'Industry rivalry', hint: 'How intense is the competition?', at: [2, 2, 1, 1] },
      { key: 'buyers', title: 'Bargaining power of buyers', hint: 'How much can customers push prices down?', at: [3, 2, 1, 1] },
      { key: 'substitutes', title: 'Threat of substitutes', hint: 'What else solves the same need?', at: [2, 3, 1, 1] },
    ],
    sample: { entrants: ['Low capital needed'], suppliers: ['Few specialised suppliers'], rivalry: ['Three big players, price wars'], buyers: ['Customers can switch easily'], substitutes: ['Do-it-yourself kits'] },
  },
};

export const COLORS = ['#fff3a3', '#ffd0a8', '#ffc2d4', '#c9e7ff', '#cdf2c0', '#e3d4ff'];
let seq = 0;
export const newId = () => `n${Date.now().toString(36)}${(seq++).toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
export const newNote = (sec, text = '', color = COLORS[0]) => ({ id: newId(), sec, text, color });

/** A board built from the sample notes of a canvas. */
export function sampleBoard(boardId, tr = s => s) {
  const spec = BOARDS[boardId]; let c = 0;
  return { title: '', notes: spec.sections.flatMap(s => (spec.sample[s.key] || []).map(t => newNote(s.key, tr(t), COLORS[c++ % COLORS.length]))) };
}

/** Keep only well-formed notes that belong to a section of this canvas. Throws on text that is not a board. */
export function parseBoard(boardId, text) {
  const spec = BOARDS[boardId]; let data; try { data = JSON.parse(text); } catch { throw new Error('This file is not a saved board.'); }
  if (!data || !Array.isArray(data.notes)) throw new Error('This file is not a saved board.');
  const keys = new Set(spec.sections.map(s => s.key));
  return { title: String(data.title || '').slice(0, 120), notes: data.notes.filter(n => n && keys.has(n.sec) && typeof n.text === 'string').slice(0, 500).map(n => ({ id: typeof n.id === 'string' ? n.id : newId(), sec: n.sec, text: n.text.slice(0, 600), color: COLORS.includes(n.color) ? n.color : COLORS[0] })) };
}

/** Markdown outline: one heading per section with its notes as bullets. */
export function toMarkdown(boardId, board, tr = s => s) {
  const spec = BOARDS[boardId];
  return `${board.title ? `# ${board.title}\n\n` : ''}${spec.sections.map(s => `## ${tr(s.title)}\n${board.notes.filter(n => n.sec === s.key && n.text.trim()).map(n => `- ${n.text.trim().replace(/\n+/g, ' ')}`).join('\n') || '-'}`).join('\n\n')}\n`;
}

/** Lay notes out as small boxes inside a rectangle (for the PNG export): returns [{ note, x, y, w, h }]. Boxes shrink to fit. */
export function placeNotes(rect, notes, { gap = 8, minW = 120, aspect = 0.62 } = {}) {
  if (!notes.length) return [];
  const { x, y, w, h } = rect; const inner = { x: x + gap, y: y + gap, w: w - 2 * gap, h: h - 2 * gap };
  for (let bw = Math.min(260, inner.w); bw >= 40; bw -= 6) {
    const bh = Math.max(24, Math.round(bw * aspect)); const perRow = Math.max(1, Math.floor((inner.w + gap) / (bw + gap))); const rows = Math.ceil(notes.length / perRow);
    if (rows * (bh + gap) - gap <= inner.h || bw <= 44) { const realW = Math.floor((inner.w - gap * (perRow - 1)) / perRow); return notes.map((note, i) => ({ note, x: inner.x + (i % perRow) * (realW + gap), y: inner.y + Math.floor(i / perRow) * (bh + gap), w: realW, h: bh })); }
  }
  return [];
}
