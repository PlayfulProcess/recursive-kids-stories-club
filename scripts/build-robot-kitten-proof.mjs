// Animated picture-book pages: vector characters + CSS motion, no words, no sound.
// The words live in the grammar node beside the embed, so they can change without a rebuild.
// Run: node scripts/build-robot-kitten-proof.mjs
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'stories/robot-and-kitten';
const INK = '#3d2723', BLUE = '#b4e0f8', BLUE2 = '#7fc4ee', PINK = '#f7cdf0', PINK2 = '#f0a2dc';
const ORANGE = '#f8b83a', ORANGE2 = '#ea8f22', CREAM = '#fde3a0', LIME = '#d6ec5e', ROSE = '#f9d3cb';

const tube = (d, w = 15) =>
  `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + 7}" stroke-linecap="round"/>` +
  `<path d="${d}" fill="none" stroke="${BLUE}" stroke-width="${w}" stroke-linecap="round"/>` +
  `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-dasharray="2 13" opacity=".55"/>`;
const ringHand = (x, y) =>
  `<circle cx="${x}" cy="${y}" r="13" fill="${PINK}" stroke="${INK}" stroke-width="4"/><circle cx="${x}" cy="${y}" r="4.5" fill="${INK}"/>`;

function robot({ brow = 'kind', reach = true, arms = '', face = 'open', sit = false, gap = false, glow = false } = {}) {
  const brows = {
    kind: 'M-88 -372q18 -13 36 -5M6 -377q18 -8 36 5',
    worried: 'M-88 -362q18 -20 38 -18M6 -380q20 -2 38 18',
    glad: 'M-88 -378q18 -10 36 -2M6 -380q18 -8 36 2',
    cross: 'M-92 -384q20 8 40 16M4 -368q20 -8 40 -16',
  }[brow];
  const shut = face === 'shut';
  const arm = arms === 'up'
    ? { d: 'M-82 -190C-120 -210 -140 -240 -158 -282', x: -162, y: -294 }
    : arms === 'touch' ? { d: 'M-82 -190C-70 -160 -30 -140 40 -160', x: 50, y: -162 }
    : reach ? { d: 'M-82 -190C-112 -160 -128 -120 -160 -96', x: -166, y: -90 }
    : { d: 'M-82 -190C-104 -160 -112 -130 -116 -100', x: -118, y: -92 };
  const right = arms === 'up'
    ? tube('M92 -194C130 -214 150 -244 166 -282') + ringHand(170, -294)
    : tube('M92 -194C122 -176 128 -140 122 -104') + ringHand(120, -94);
  const legs = sit
    ? tube('M-34 -128C-70 -118 -110 -110 -150 -116') + tube('M36 -128C0 -106 -40 -96 -86 -100')
      + `<path d="M-176 -148h26l6 44h-26zM-112 -132h26l6 44h-26z" fill="${BLUE2}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`
    : tube('M-34 -128C-30 -90 -50 -60 -44 -22') + tube('M36 -128C44 -90 28 -60 40 -22')
      + `<path d="M-84 -2l6 -26h58l4 26zM6 -2l6 -26h58l6 26z" fill="${BLUE2}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
  const eyes = shut
    ? `<path d="M-92 -344l26 14l-26 12M48 -344l-26 14l26 12" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`
    : `<g class="eyes"><ellipse cx="-70" cy="-330" rx="18" ry="24" fill="${INK}"/><circle cx="-76" cy="-340" r="6" fill="#fff"/><ellipse cx="24" cy="-330" rx="18" ry="24" fill="${INK}"/><circle cx="18" cy="-340" r="6" fill="#fff"/></g>`;
  return `<g class="robot"${sit ? ' transform="translate(0 100)"' : ''}>
  ${legs}
  ${right}${gap ? `<circle cx="128" cy="-140" r="7" fill="#fff" stroke="${INK}" stroke-width="3.5"/>` : ''}${glow ? `<circle class="glow" cx="0" cy="-490" r="26" fill="#ffd877" opacity=".6"/>` : ''}
  <g class="arm">${tube(arm.d)}${ringHand(arm.x, arm.y)}</g>
  <ellipse cx="0" cy="-226" rx="52" ry="14" fill="${BLUE2}" stroke="${INK}" stroke-width="5"/>
  <path d="M-102 -216Q0 -240 102 -216L80 -132Q0 -112 -80 -132Z" fill="${BLUE}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
  <path d="M40 -222Q80 -220 102 -216L80 -132Q60 -124 30 -120Q60 -170 40 -222Z" fill="${BLUE2}" opacity=".5"/>
  <path d="M-30 -146a30 30 0 0 1 60 0M-15 -146a15 15 0 0 1 30 0" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
  <path d="M-66 -192v36M-52 -194v42M52 -194v42M66 -192v36" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
  <circle cx="98" cy="-196" r="13" fill="${INK}"/>
  <g class="head">
    <path d="M0 -436v-44" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>
    <circle class="beacon" cx="0" cy="-490" r="11" fill="${PINK}" stroke="${INK}" stroke-width="5"/>
    <ellipse cx="146" cy="-334" rx="30" ry="58" fill="${PINK2}" stroke="${INK}" stroke-width="6"/>
    <rect x="-150" y="-438" width="296" height="214" rx="102" fill="${BLUE}" stroke="${INK}" stroke-width="7"/>
    <path d="M70 -432c50 14 76 56 76 106s-30 92 -76 100c30 -30 44 -66 44 -104s-14 -74 -44 -102z" fill="${BLUE2}" opacity=".55"/>
    <path d="M-132 -312c0 -60 40 -104 100 -110" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" opacity=".75"/>
    <rect x="-122" y="-392" width="212" height="128" rx="46" fill="${PINK}" stroke="${INK}" stroke-width="6"/>
    <path d="M-116 -292q90 34 200 -6v-10q-4 40 -44 40h-112q-30 0 -44 -24z" fill="${PINK2}" opacity=".7"/>
    <path d="${brows}" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    ${eyes}
    <path d="M-34 -300q11 22 22 0z" fill="#fff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
  </g>
</g>`;
}

// Bottom centre at 0,0, about 150 tall, looking up and to the right.
function kitten({ shut = false } = {}) {
  const eyes = shut
    ? `<path d="M-30 -96l14 8l-14 7M30 -96l-14 8l14 7" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`
    : `<g class="k-eyes"><circle cx="-14" cy="-98" r="12" fill="#fff" stroke="${INK}" stroke-width="3"/><circle cx="24" cy="-98" r="12" fill="#fff" stroke="${INK}" stroke-width="3"/><circle cx="-10" cy="-102" r="6.5" fill="${INK}"/><circle cx="28" cy="-102" r="6.5" fill="${INK}"/></g>`;
  return `<g class="kitten">
  <path class="tail" d="M-30 -14C-78 -8 -86 -46 -70 -64" fill="none" stroke="${INK}" stroke-width="20" stroke-linecap="round"/>
  <path class="tail" d="M-30 -14C-78 -8 -86 -46 -70 -64" fill="none" stroke="${ORANGE}" stroke-width="13" stroke-linecap="round"/>
  <path d="M-42 -2C-54 -44 -32 -76 2 -76S54 -42 40 -2Z" fill="${ORANGE}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M-40 -6C-50 -40 -34 -70 -8 -75C-24 -50 -26 -28 -18 -3Z" fill="${ORANGE2}" opacity=".5"/>
  <path d="M-6 -66c16 12 22 34 16 60" fill="none" stroke="${CREAM}" stroke-width="16" stroke-linecap="round"/>
  <path d="M-24 -2v-22M26 -2v-22" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
  <g class="k-head">
    <path d="M-44 -116l-6 -42l34 18ZM46 -116l6 -42l-34 18Z" fill="${ORANGE}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <ellipse cx="2" cy="-98" rx="52" ry="42" fill="${ORANGE}" stroke="${INK}" stroke-width="5"/>
    <path d="M-10 -138v14M4 -140v16M18 -138v14" stroke="${ORANGE2}" stroke-width="6" stroke-linecap="round"/>
    ${eyes}
    <ellipse class="mouth" cx="5" cy="-74" rx="6" ry="8" fill="#d0402f" stroke="${INK}" stroke-width="3"/>
    <path d="M-48 -86l-30 -6M-48 -76l-30 4M54 -86l30 -6M54 -76l30 4" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>
  </g>
</g>`;
}

const tuft = (x, y, s = 1) =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M0 0q-6 -24 -14 -36M8 0q0 -30 6 -46M18 0q6 -18 18 -28" fill="none" stroke="${LIME}" stroke-width="6" stroke-linecap="round"/>`;
const cloud = (x, y) =>
  `<path transform="translate(${x} ${y})" d="M0 0q8 -30 36 -20q16 -24 42 -8q24 -8 30 20" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`;
const meow = (x, y) => `<g class="meow" transform="translate(${x} ${y})" fill="none" stroke="${ORANGE2}" stroke-width="5" stroke-linecap="round">
  <path class="w1" d="M0 -14a20 20 0 0 1 0 28"/><path class="w2" d="M14 -24a36 36 0 0 1 0 48"/><path class="w3" d="M28 -34a52 52 0 0 1 0 68"/></g>`;
const ground = (cx, rx) => `<ellipse cx="${cx}" cy="486" rx="${rx}" ry="30" fill="${ROSE}"/>`;

const thought = (x, y, r, dots, inner, i) => `<g class="thought t${i}" style="--x:${x}px;--y:${y}px">
  ${dots.map(([a, b, c]) => `<circle cx="${a}" cy="${b}" r="${c}" fill="#fff" stroke="${INK}" stroke-width="3.5"/>`).join('')}
  <circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="${INK}" stroke-width="5"/>
  <g transform="translate(${x} ${y})">${inner}</g></g>`;
const MILK = `<path d="M-22 34V-14L-10 -34H14L24 -14V34Z" fill="#fff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M-22 -14H24" stroke="${INK}" stroke-width="3"/><path d="M-22 12q12 -10 23 0t23 0V34H-22Z" fill="${BLUE2}" stroke="${INK}" stroke-width="3"/>`;
const YARN = `<circle cy="-6" r="28" fill="#d94a3a" stroke="${INK}" stroke-width="4"/><path d="M-22 -16q22 -10 42 10M-26 2q24 -12 50 2M-8 -32q-10 22 8 52" fill="none" stroke="#fff" stroke-width="2.5" opacity=".7"/><path d="M14 18q18 18 -4 22" fill="none" stroke="#d94a3a" stroke-width="5" stroke-linecap="round"/>`;
const BOWL = `<path d="M-30 -2q30 -26 60 0z" fill="${CREAM}" stroke="${INK}" stroke-width="3"/><path d="M-36 -4H36L28 24H-28Z" fill="#c0492f" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
const BOX = `<path d="M-36 -12H36L30 20H-30Z" fill="#b83a2a" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M-26 -6H26L22 6H-22Z" fill="${CREAM}"/><path d="M2 -18l22 -18" stroke="#c0492f" stroke-width="6" stroke-linecap="round"/>`;

const say = (x, y, tailX, tailY, inner, cls) => `<g class="say ${cls}">
  <path d="M${x - 8} ${y + 34}L${tailX} ${tailY}L${x + 18} ${y + 36}" fill="#fff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
  <ellipse cx="${x}" cy="${y}" rx="48" ry="40" fill="#fff" stroke="${INK}" stroke-width="4.5"/>${inner.replace('@', `translate(${x} ${y})`)}</g>`;

const SCENES = [
  {
    file: 'page-1.html',
    alt: 'A blue robot hugging an orange kitten, wondering about milk, yarn, a food bowl and a litter box.',
    art: `${ground(480, 250)}${tuft(120, 500)}${tuft(780, 505, 1.1)}${tuft(240, 520, .8)}
      ${thought(160, 150, 70, [[248, 214, 8], [268, 236, 12]], MILK, 1)}
      ${thought(800, 140, 70, [[712, 206, 8], [690, 232, 12]], YARN, 2)}
      ${thought(130, 345, 64, [[214, 340, 7], [242, 346, 11]], BOX, 3)}
      ${thought(830, 340, 64, [[746, 340, 7], [718, 346, 11]], BOWL, 4)}
      <g transform="translate(480 498) scale(.92)">${robot({ brow: 'glad', reach: false })}</g>
      <g class="hug" transform="translate(470 440) scale(1.25)">${kitten({ shut: true })}</g>`,
  },
  {
    file: 'page-2.html',
    alt: 'A blue robot leans toward a small orange kitten sitting on the path, reaching out a hand. The kitten looks up and meows.',
    art: `${ground(470, 330)}${cloud(150, 150)}${cloud(720, 190)}${tuft(90, 510)}${tuft(800, 500, 1.2)}${tuft(690, 524, .8)}
      <g transform="translate(610 490) scale(.92)">${robot({ brow: 'kind' })}</g>
      <g transform="translate(300 488)">${kitten()}${meow(62, -72)}</g>`,
  },
  {
    file: 'page-3.html',
    alt: 'The same robot and kitten. A question mark floats over the robot and a meow over the kitten: they do not share a language.',
    art: `${ground(470, 330)}${cloud(120, 190)}${cloud(740, 210)}${tuft(90, 510)}${tuft(810, 500, 1.2)}${tuft(700, 524, .8)}
      <g transform="translate(610 490) scale(.92)">${robot({ brow: 'worried' })}</g>
      <g transform="translate(300 488)">${kitten()}${meow(62, -72)}</g>
      ${say(404, 130, 444, 208, `<text transform="@" y="20" text-anchor="middle" font-family="Georgia,serif" font-size="56" font-weight="700" fill="${INK}">?</text>`, 's1')}
      ${say(150, 250, 230, 342, `<path transform="@" d="M-30 0q10 -20 20 0t20 0t20 0" fill="none" stroke="${ORANGE2}" stroke-width="7" stroke-linecap="round"/>`, 's2')}`,
  },
];

// Props and the rest of the book. Each scene is one line, so a new page costs little.
const at = (x, y, sc, svg, flip = false) => `<g transform="translate(${x} ${y}) scale(${flip ? -sc : sc} ${sc})">${svg}</g>`;
const bot = (x, o = {}, sc = .78, y = 490, flip = false) => at(x, y, sc, robot(o), flip);
const cat = (x, o = {}, sc = 1, y = 488, flip = false) => at(x, y, sc, kitten(o), flip);
const WOOD = '#d9a66c', WOOD2 = '#b57f47', COPPER = '#d98a4b', SOIL = '#a97c58', LEAF = '#8fc95a', LEAF2 = '#5fa346';

// Anon can look like anybody, so Anon is an outline with a warm wash: no face, no hair, no age.
const anonBody = (kneel) => kneel
  ? `<g class="sway" fill="#fff4dc" stroke="${INK}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">
      <path d="M-46 0C-58 -40 -50 -96 -30 -130H34C56 -96 60 -40 66 0Z"/><path d="M-20 -110C-60 -90 -80 -66 -104 -50" fill="none"/><circle cx="2" cy="-168" r="40"/><path d="M-10 -150q12 10 24 0" fill="none"/></g>`
  : `<g class="sway" fill="#fff4dc" stroke="${INK}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">
      <path d="M-24 0L-20 -120H24L30 0H8L2 -80L-4 0Z"/><path d="M-44 -116C-46 -170 -30 -200 0 -200S46 -170 44 -116Z"/><path d="M-40 -180C-70 -160 -82 -130 -92 -100" fill="none"/><path d="M40 -180C60 -160 66 -130 70 -104" fill="none"/><circle cx="0" cy="-240" r="42"/><path d="M-12 -222q12 10 24 0" fill="none"/></g>`;
const anon = (x, { kneel = false, y = 490, sc = 1, flip = false } = {}) => at(x, y, sc, anonBody(kneel), flip);

const curl = () => `<g><path d="M-62 -6C-74 -44 -28 -66 18 -58C58 -52 72 -22 56 -4C24 8 -40 8 -62 -6Z" fill="${ORANGE}" stroke="${INK}" stroke-width="5"/><path d="M50 -8C20 6 -30 8 -56 -8" fill="none" stroke="${ORANGE2}" stroke-width="11" stroke-linecap="round"/><g class="pulse"><path d="M-54 -46l-8 -26l24 12ZM-12 -50l10 -24l14 18Z" fill="${ORANGE}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><ellipse cx="-30" cy="-34" rx="32" ry="24" fill="${ORANGE}" stroke="${INK}" stroke-width="5"/><path d="M-46 -38q6 6 12 0M-24 -38q6 6 12 0" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/></g></g>`;
const curled = (x, sc = 1, y = 488) => at(x, y, sc, curl());

const table = (x, w = 340, y = 330) => `<rect x="${x}" y="${y}" width="${w}" height="16" rx="5" fill="${WOOD}" stroke="${INK}" stroke-width="5"/><path d="M${x + 24} ${y + 16}V490M${x + w - 24} ${y + 16}V490" stroke="${INK}" stroke-width="12"/><path d="M${x + 24} ${y + 16}V490M${x + w - 24} ${y + 16}V490" stroke="${WOOD2}" stroke-width="6"/>`;
const cupG = `<path d="M-20 -38H20L15 0H-15Z" fill="#fff" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><path d="M20 -30q16 2 12 16q-3 8 -14 6" fill="none" stroke="${INK}" stroke-width="4.5"/>`;
const cup = (x, y, cls = '') => `<g transform="translate(${x} ${y})"><g class="${cls}">${cupG}</g></g>`;
const spill = (x, y = 488) => `<path class="grow" d="M${x - 66} ${y}q24 -20 62 -12t72 12q-34 16 -68 10t-66 -10z" fill="${BLUE}" stroke="${BLUE2}" stroke-width="3"/>`;
const shards = (x, y = 482) => `<path d="M${x} ${y}l16 -12l10 14zM${x + 34} ${y + 4}l10 -14l14 12zM${x - 26} ${y + 5}l12 -10l6 12z" fill="#fff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path class="grow" d="M${x - 50} ${y + 8}q40 -14 110 -2q-44 12 -110 2z" fill="#d6a56c" opacity=".7"/>`;
const windowG = (x, y = 70, night = false) => `<rect x="${x}" y="${y}" width="170" height="180" rx="8" fill="${night ? '#6c7fb8' : '#dff3fb'}" stroke="${INK}" stroke-width="6"/>${night ? `<circle cx="${x + 120}" cy="${y + 50}" r="20" fill="#fdf0b0"/><circle cx="${x + 40}" cy="${y + 40}" r="3" fill="#fff"/><circle cx="${x + 70}" cy="${y + 110}" r="3" fill="#fff"/>` : `<circle class="pulse" cx="${x + 120}" cy="${y + 50}" r="24" fill="#fde98a"/>`}<path d="M${x + 85} ${y}V${y + 180}M${x} ${y + 90}H${x + 170}" stroke="${INK}" stroke-width="5"/>`;
const pot = (x, y = 250) => `<g class="sway"><path d="M${x} ${y - 20}C${x - 6} ${y - 50} ${x + 10} ${y - 70} ${x + 2} ${y - 96}" fill="none" stroke="${LEAF2}" stroke-width="6" stroke-linecap="round"/><path d="M${x} ${y - 50}q-34 -24 -44 -2q18 14 44 2zM${x + 4} ${y - 70}q30 -24 44 -4q-20 16 -44 4z" fill="${LEAF}" stroke="${INK}" stroke-width="4"/></g><path d="M${x - 26} ${y - 22}H${x + 26}L${x + 18} ${y + 12}H${x - 18}Z" fill="#d9744e" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
const kitchen = (win = 90, night = false) => `<rect x="-20" y="430" width="1000" height="130" fill="#f8e6c8" opacity=".85"/><path d="M-20 430H980" stroke="${INK}" stroke-width="5"/>${windowG(win, 70, night)}`;
const fence = (y = 340) => { let p = ''; for (let x = 20; x < 960; x += 62) p += `<path d="M${x} 450V${y}l20 -22l20 22V450Z" fill="#f1dcc0" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>`; return p + `<path d="M0 ${y + 34}H960M0 ${y + 80}H960" stroke="${WOOD2}" stroke-width="8"/>`; };
const lawn = () => `<path d="M-20 440q240 -24 500 -6t500 -6V560H-20Z" fill="#d9efa6" stroke="${INK}" stroke-width="4"/>`;
const tufts = (...xs) => xs.map((x, i) => tuft(x, 500 + (i % 2) * 20, .9 + (i % 3) * .15)).join('');
const garden = (fenceOn = true) => `${fenceOn ? fence() : ''}${lawn()}${tufts(60, 870, 700, 220)}`;
const bigPlant = (x, y = 470) => `<g class="sway"><path d="M${x} ${y}C${x - 10} ${y - 80} ${x + 10} ${y - 170} ${x} ${y - 260}" fill="none" stroke="${LEAF2}" stroke-width="10" stroke-linecap="round"/><path d="M${x} ${y - 90}q-80 -40 -110 0q40 36 110 0zM${x} ${y - 150}q80 -44 110 0q-40 36 -110 0zM${x} ${y - 210}q-74 -44 -100 -4q40 34 100 4zM${x} ${y - 258}q50 -50 84 -16q-30 34 -84 16z" fill="${LEAF}" stroke="${INK}" stroke-width="5"/></g>`;
const tomato = (x, y = 480, ripe = false) => `<g class="sway"><path d="M${x} ${y}V${y - 130}" stroke="${LEAF2}" stroke-width="8"/><path d="M${x} ${y - 70}q-50 -30 -66 0q26 22 66 0zM${x} ${y - 110}q50 -30 66 0q-26 22 -66 0z" fill="${LEAF}" stroke="${INK}" stroke-width="4.5"/><circle class="pulse" cx="${x + 26}" cy="${y - 54}" r="20" fill="${ripe ? '#e24f3a' : '#b6d95e'}" stroke="${INK}" stroke-width="5"/></g>`;
const can = (x, y, drops = true) => `<g transform="translate(${x} ${y})"><path d="M-30 -40H34V10H-30Z" fill="${BLUE2}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><path d="M-30 -24L-74 -46l-10 8" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M-10 -40q14 -30 30 0" fill="none" stroke="${INK}" stroke-width="5"/>${drops ? `<path class="pour" d="M-84 -34C-96 -6 -100 20 -104 56M-74 -30C-80 -6 -82 20 -84 56" fill="none" stroke="${BLUE2}" stroke-width="5" stroke-dasharray="8 10" stroke-linecap="round"/>` : ''}</g>`;
const bug = (x, y) => `<g transform="translate(${x} ${y})" class="pulse"><ellipse rx="10" ry="7" fill="#e24f3a" stroke="${INK}" stroke-width="3"/><path d="M-4 -6l-4 -8M4 -6l4 -8" stroke="${INK}" stroke-width="2.5"/></g>`;
const leaf = (x, y) => `<path class="sway" d="M${x - 24} ${y}q24 -32 50 -8q-22 26 -50 8z" fill="${LEAF}" stroke="${INK}" stroke-width="4"/>`;
const sunspot = (x) => `<ellipse class="pulse" cx="${x}" cy="492" rx="110" ry="24" fill="#fdf0a0"/>`;
const bowl = (x, y = 488) => `<path d="M${x - 34} ${y - 26}H${x + 34}L${x + 26} ${y}H${x - 26}Z" fill="#c0492f" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><path d="M${x - 28} ${y - 24}q28 -12 56 0" fill="#fff" stroke="${INK}" stroke-width="3"/>`;
const fridge = (x) => `<rect x="${x}" y="110" width="180" height="370" rx="10" fill="#c9eaf8" stroke="${INK}" stroke-width="6"/><path d="M${x} 240H${x + 180}M${x + 22} 150v50M${x + 22} 270v70" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`;
const door = (x) => `<rect x="${x}" y="130" width="170" height="350" rx="8" fill="${WOOD}" stroke="${INK}" stroke-width="6"/><circle cx="${x + 24}" cy="310" r="9" fill="${INK}"/>`;
const heat = (x, y) => `<g fill="none" stroke="#e8624a" stroke-width="6" stroke-linecap="round"><path class="steam" d="M${x} ${y}q-10 -14 0 -28t0 -28"/><path class="steam" style="animation-delay:.7s" d="M${x + 30} ${y}q-10 -14 0 -28t0 -28"/><path class="steam" style="animation-delay:1.4s" d="M${x - 30} ${y}q-10 -14 0 -28t0 -28"/></g>`;
const scratch = (x, y) => `<path class="shake" d="M${x} ${y}l40 44M${x + 18} ${y - 8}l40 44M${x + 36} ${y - 14}l34 40" stroke="#e24f3a" stroke-width="6" stroke-linecap="round"/>`;
const heart = (x, y, sc = 1) => `<g transform="translate(${x} ${y}) scale(${sc})"><path class="pulse" d="M0 14C-30 -8 -20 -30 0 -16C20 -30 30 -8 0 14Z" fill="#e8524a" stroke="${INK}" stroke-width="4"/></g>`;
const bird = (x, y) => `<g class="fly"><g transform="translate(${x} ${y})"><ellipse rx="28" ry="20" fill="#f7cdf0" stroke="${INK}" stroke-width="5"/><circle cx="-22" cy="-16" r="14" fill="#f7cdf0" stroke="${INK}" stroke-width="5"/><path d="M-36 -18l-14 4l14 4z" fill="${ORANGE}" stroke="${INK}" stroke-width="3"/><circle cx="-26" cy="-20" r="3" fill="${INK}"/><path d="M10 -10q24 -8 30 10q-22 8 -30 -10z" fill="${PINK2}" stroke="${INK}" stroke-width="4"/></g></g>`;
const notes = (x, y) => `<g class="steam" stroke="${INK}" stroke-width="4" fill="${INK}"><path d="M${x} ${y}v-28l18 -6v28" fill="none"/><circle cx="${x - 5}" cy="${y}" r="5"/><circle cx="${x + 13}" cy="${y - 6}" r="5"/></g>`;
const oven = (x) => `<rect x="${x}" y="250" width="190" height="230" rx="8" fill="#e6ddd0" stroke="${INK}" stroke-width="6"/><rect x="${x + 22}" y="300" width="146" height="110" rx="8" fill="#f6b86a" stroke="${INK}" stroke-width="5"/><path class="glow" d="M${x + 40} 390q55 -66 110 0z" fill="#d99a57" stroke="${INK}" stroke-width="4"/><circle cx="${x + 50}" cy="276" r="9" fill="${INK}"/><circle cx="${x + 140}" cy="276" r="9" fill="${INK}"/>`;
const bread = (x, y) => `<path d="M${x - 50} ${y}q0 -44 50 -44t50 44z" fill="#e0a860" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>${[-20, 8].map((d, i) => `<path class="steam" style="animation-delay:${i * .9}s" d="M${x + d} ${y - 54}q-8 -14 0 -26" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/>`).join('')}`;
const soilBand = (y = 400) => `<rect x="-20" y="${y}" width="1000" height="${560 - y}" fill="${SOIL}"/><path d="M-20 ${y}q240 -14 500 0t500 0" fill="none" stroke="${INK}" stroke-width="5"/>`;
const roots = (x, y = 400, sc = 1) => `<g transform="translate(${x} ${y}) scale(${sc})" fill="none" stroke="#f5ead8" stroke-width="7" stroke-linecap="round"><path d="M0 0C-10 40 -60 60 -90 110M0 0C6 50 40 80 26 130M0 0C-30 30 -120 30 -170 60M0 0C30 24 110 30 150 74"/><path d="M-50 56q-20 10 -40 8M30 70q30 6 50 -10M-110 36q-10 20 -26 28"/></g>`;
const boltG = (sc = 1) => `<g transform="scale(${sc})"><path d="M-16 -36H16L24 -22L16 -8H-16L-24 -22Z" fill="${COPPER}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><rect x="-9" y="-8" width="18" height="50" fill="#e7a56f" stroke="${INK}" stroke-width="5"/><path d="M-9 4h18M-9 16h18M-9 28h18" stroke="${INK}" stroke-width="3"/></g>`;
const bolt = (x, y, sc = 1) => `<g transform="translate(${x} ${y})"><g class="pulse">${boltG(sc)}</g></g>`;
const say2 = (x, y, tx, ty, ch) => say(x, y, tx, ty, `<text transform="@" y="18" text-anchor="middle" font-family="Georgia,serif" font-size="50" font-weight="700" fill="${INK}">${ch}</text>`, 's1');
const sayHeart = (x, y, tx, ty) => say(x, y, tx, ty, `<g transform="@">${heart(0, -2, 1.2)}</g>`, 's1');
const sayStar = (x, y, tx, ty) => say(x, y, tx, ty, `<path transform="@" d="M0 -26L8 -8L28 -6L13 8L17 28L0 18L-17 28L-13 8L-28 -6L-8 -8Z" fill="#fde98a" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`, 's1');
const walking = (x, go, svg) => `<g class="walk" style="--go:${go}px">${svg}</g>`;

const BOOK = {
  // The rhyming Little Kitten, pages 4 to 8.
  'kitten-4': [`Shiryo runs to Anon for help; a thought of milk and of a cuddle floats above.`, `${ground(480, 340)}${thought(420, 110, 66, [[470, 186, 8], [500, 214, 12]], MILK, 1)}${thought(610, 90, 58, [[580, 160, 7], [560, 190, 11]], heart(0, 0, 1.6), 2)}${bot(300, { brow: 'worried', arms: 'up' }, .76)}${anon(720, {})}`],
  'kitten-5': [`The kitten scratches the robot, who stomps home with hot circuits and shuts the door.`, `${ground(450, 340)}${door(720)}${bot(500, { brow: 'cross', face: 'shut', reach: false }, .78)}${heat(500, 90)}${scratch(330, 300)}${cat(190, { shut: true }, 1.3)}${meow(270, 400)}`],
  'kitten-6': [`Shiryo sits, still cross. Anon kneels close by and listens, holding a bowl of milk.`, `${kitchen(80)}${bot(420, { brow: 'worried', sit: true, reach: false }, .7, 494)}${anon(720, { kneel: true })}${bowl(640)}`],
  'kitten-7': [`A grown cat taps the fridge and Shiryo comes running, happy.`, `${kitchen(30)}${fridge(520)}<g class="wob">${cat(470, {}, 1.35)}</g>${walking(200, 60, bot(200, { face: 'shut', brow: 'glad', arms: 'up' }, .72))}${heart(420, 120)}`],
  'kitten-8': [`Shiryo, Anon and the cat together, the cat curled and purring between them.`, `${kitchen(390)}${bot(250, { brow: 'glad', face: 'shut', reach: false }, .74)}${curled(480, 1.3)}${anon(720, {})}${heart(480, 330, 1.2)}`],

  // Story 1: asking.
  'ask-1': [`A figure tightens the last bolt on a new blue robot, whose light comes on.`, `${kitchen(720)}${bot(420, { glow: true, reach: false }, .8)}${anon(170, {})}${bolt(290, 250, .7)}`],
  'ask-2': [`The robot and a kitten meet, the kitten sniffing its hand.`, `${kitchen(80)}${bot(610, { brow: 'kind' }, .86)}${cat(370)}`],
  'ask-3': [`The kitten on the table knocks a cup off, and water spills on the floor.`, `${kitchen(80)}${table(360)}${at(470, 330, 1, kitten({ shut: true }))}${cup(620, 330, 'fall')}${spill(700)}`],
  'ask-4': [`The robot leans in, arms up, frowning at the kitten beside the puddle.`, `${kitchen(740)}${bot(540, { brow: 'cross', arms: 'up' }, .84)}${cat(240)}${spill(370)}${say2(420, 110, 460, 190, '!')}`],
  'ask-5': [`The kitten walks away. The robot stands alone by the spilled water.`, `${kitchen(80)}${bot(640, { brow: 'worried', reach: false }, .84)}${spill(480)}${walking(280, -260, cat(280, {}, 1, 488, true))}`],
  'ask-6': [`Anon kneels and asks a question; the robot looks up.`, `${kitchen(420)}${bot(300, { brow: 'kind', reach: false }, .78)}${anon(690, { kneel: true })}${say2(590, 180, 640, 270, '?')}`],
  'ask-7': [`The robot looks at its own hand, thinking.`, `${kitchen(720)}${bot(420, { brow: 'worried', arms: 'touch' }, .9)}${thought(170, 130, 70, [[250, 200, 8], [280, 226, 12]], `<text y="18" text-anchor="middle" font-family="Georgia,serif" font-size="56" font-weight="700" fill="${INK}">?</text>`, 1)}`],
  'ask-8': [`The kitten on the table beside a wobbling cup; the robot leans in, soft.`, `${kitchen(80)}${table(250)}${at(330, 330, 1, kitten())}${cup(490, 330, 'wob')}${bot(740, { brow: 'kind', arms: 'touch' }, .84)}${sayHeart(610, 120, 650, 190)}`],
  'ask-9': [`The kitten walks around the cup. The cup stays.`, `${kitchen(80)}${table(240, 420)}${cup(450, 330)}<g class="walk" style="--go:230px">${at(290, 330, .9, kitten())}</g>`],
  'ask-10': [`The kitten and robot close together, the robot's light blinking; Anon by the window smiles.`, `${kitchen(650)}${bot(350, { brow: 'glad', glow: true, reach: false }, .82)}${cat(520)}${anon(780, { sc: .86 })}`],

  // Story 2: thank you.
  'thanks-1': [`The robot and the kitten in a sunny garden by a fence.`, `${garden()}${bot(600, { brow: 'glad', reach: false })}${cat(330)}`],
  'thanks-2': [`The kitten crouched and still, watching a bug in the grass.`, `${garden()}${bot(760, { brow: 'kind', reach: false }, .6)}${cat(320, {}, 1.2)}${bug(520, 470)}${tufts(480, 560)}`],
  'thanks-3': [`The kitten pounces on the bug.`, `${garden()}<g class="leap">${cat(240, {}, 1.2)}</g>${bug(480, 472)}`],
  'thanks-4': [`The robot cheers with both arms up and stars in a speech bubble.`, `${garden()}${bot(560, { brow: 'glad', face: 'shut', arms: 'up' }, .8)}${cat(260)}${bug(340, 490)}${sayStar(380, 110, 430, 190)}`],
  'thanks-5': [`The kitten walks off to a sunny spot, the robot left with arms half raised.`, `${garden()}${sunspot(190)}${bot(620, { brow: 'worried', arms: 'up' }, .8)}${walking(420, -220, cat(420, {}, 1, 488, true))}`],
  'thanks-6': [`Anon kneels with a watering can at a plant. The robot wonders, the cat rests in the sun.`, `${garden()}${sunspot(130)}${curled(130)}${bot(420, { brow: 'worried', reach: false }, .74)}${anon(770, { kneel: true })}${can(660, 400)}${tomato(570, 490)}`],
  'thanks-7': [`Anon waters a small tomato plant while the robot watches.`, `${garden()}${bot(240, { brow: 'kind', reach: false }, .78)}${tomato(530, 490, true)}${anon(790, { kneel: true })}${can(680, 390)}${sayHeart(600, 150, 640, 230)}`],
  'thanks-8': [`The robot sits in the grass, thinking, while the garden moves around it.`, `${garden()}${bigPlant(780)}${bot(430, { brow: 'kind', sit: true, reach: false }, .78, 494)}${bug(160, 300)}`],
  'thanks-9': [`The kitten lays a leaf at the robot's foot; the robot brings a bowl of water.`, `${garden(false)}${door(30)}${bot(570, { brow: 'glad', reach: true }, .82)}${cat(350)}${leaf(470, 480)}${bowl(240)}${sayHeart(420, 130, 470, 210)}`],
  'thanks-10': [`The kitten curled against the robot; Anon watches through the window.`, `${kitchen(90)}${bot(560, { brow: 'glad', sit: true, reach: false }, .8, 494)}${curled(740, 1.1)}<g transform="translate(175 240)">${anonBody(true).replace(/class="sway"/, '')}</g>`],

  // Story 6: just be.
  'be-1': [`A careful robot crosses the kitchen with slow, exact steps.`, `${kitchen(80)}${walking(340, 200, bot(340, { brow: 'kind', reach: false }, .82))}${pot(180)}`],
  'be-2': [`A sun, then a plant, then a moon: the robot does each part of the day just so.`, `${kitchen(700, true)}${thought(150, 130, 60, [[220, 190, 7], [240, 212, 11]], `<circle r="28" fill="#fde98a" stroke="${INK}" stroke-width="4"/>`, 1)}${thought(370, 100, 60, [[370, 176, 7], [370, 204, 11]], leafIcon(), 2)}${bot(370, { brow: 'kind', reach: false }, .72)}`],
  'be-3': [`The kitten sits on a high shelf, far across the room from the robot.`, `${kitchen(420)}<rect x="60" y="250" width="240" height="14" fill="${WOOD}" stroke="${INK}" stroke-width="5"/>${at(160, 250, .9, kitten())}${bot(740, { brow: 'worried', reach: false }, .8)}`],
  'be-4': [`The robot tiptoes and waits; the kitten yawns and looks out of the window.`, `${kitchen(80)}<rect x="60" y="250" width="240" height="14" fill="${WOOD}" stroke="${INK}" stroke-width="5"/>${at(180, 250, .9, kitten())}${bot(650, { brow: 'worried', arms: 'touch' }, .84)}`],
  'be-5': [`Anon's cup falls and breaks on the kitchen floor.`, `${kitchen(80)}${anon(560, {})}${cup(470, 340, 'fall')}${shards(560, 482)}`],
  'be-6': [`The kitten rubs against Anon's ankle beside the broken cup.`, `${kitchen(80)}${anon(600, {})}${shards(380)}${walking(240, 230, cat(240))}`],
  'be-7': [`The robot watches Anon and the kitten from across the room.`, `${kitchen(390)}${bot(230, { brow: 'worried', reach: false }, .82)}${anon(740, {})}${cat(630)}${shards(540)}`],
  'be-8': [`The robot sits down on the kitchen floor, nothing more.`, `${kitchen(90)}${bot(560, { brow: 'kind', sit: true, reach: false }, .86, 500)}`],
  'be-9': [`The kitten climbs into the sitting robot's lap.`, `${kitchen(90)}${bot(590, { brow: 'glad', sit: true, reach: false }, .86, 500)}${curled(500, 1.1, 450)}${heart(330, 230)}`],
  'be-10': [`Robot, kitten and Anon all sit on the floor by a tea stain.`, `${kitchen(390)}${bot(280, { brow: 'glad', sit: true, reach: false }, .74, 500)}${curled(490)}${anon(730, { kneel: true })}${shards(610)}`],

  // Story 7: the bolt.
  'bolt-1': [`The robot sits in its spot beside a big plant by the fence.`, `${garden()}${bigPlant(690)}${bot(380, { brow: 'kind', sit: true, reach: false }, .8, 494)}`],
  'bolt-2': [`A small bit of metal pokes up from the soil near the roots.`, `${fence(160)}${soilBand(360)}${bigPlant(720, 370)}${bolt(470, 340, .8)}${bot(240, { brow: 'kind', arms: 'touch' }, .6, 370)}`],
  'bolt-3': [`Close up: a copper bolt in the soil with pale roots wrapped around it.`, `${soilBand(90)}${bolt(480, 280, 2.4)}${roots(480, 150, 1.5)}`],
  'bolt-4': [`The robot touches the gap on its arm and looks down at the bolt in the ground.`, `${garden()}${bigPlant(800)}${bot(370, { brow: 'worried', arms: 'touch', gap: true }, .84)}${bolt(620, 480, .8)}`],
  'bolt-5': [`Anon and the robot talk in the garden; a thought of the ground floats above the robot.`, `${garden()}${bot(320, { brow: 'kind', reach: false, gap: true }, .78)}${anon(690, { kneel: true })}${thought(560, 110, 62, [[510, 180, 7], [480, 206, 11]], boltG(.9), 1)}`],
  'bolt-6': [`Under the garden, roots reach and hold, with small glints of copper in the dark.`, `${soilBand(70)}${roots(240, 70, 1.5)}${roots(680, 70, 1.8)}${bolt(380, 300, .8)}${[[120, 420], [600, 460], [830, 380]].map(([x, y]) => `<circle class="glow" cx="${x}" cy="${y}" r="8" fill="${COPPER}"/>`).join('')}`],
  'bolt-7': [`Robot and Anon sit side by side, not doing anything, above the roots.`, `${fence(150)}${soilBand(370)}${bot(320, { brow: 'kind', sit: true, reach: false }, .62, 376)}${anon(620, { kneel: true, y: 372, sc: .85 })}${roots(460, 372, .9)}${bolt(460, 450, .6)}`],
  'bolt-8': [`Close to the arm: the small gap where the bolt once was, shining like a door.`, `${garden(false)}${at(150, 640, 2.4, robot({ brow: 'kind', arms: 'touch', gap: true }))}<circle class="glow" cx="457" cy="304" r="40" fill="#fde98a"/>`],
  'bolt-9': [`The kitten curled up between the robot and the plant.`, `${garden()}${bigPlant(760)}${bot(240, { brow: 'glad', sit: true, reach: false, gap: true }, .72, 494)}${curled(500, 1.3)}`],
  'bolt-10': [`A robot, a cat and a plant, with Anon watching from the path.`, `${garden()}${bigPlant(420)}${bot(230, { brow: 'glad', reach: false, gap: true }, .7)}${cat(560)}${anon(800, { sc: .9 })}`],

  // Story 8: a day.
  'day-1': [`Morning in the empty kitchen: sun at the window and a plant on the sill.`, `${kitchen(390)}${pot(475, 252)}<path class="pulse" d="M390 250L250 430H700L560 250Z" fill="#fdf0a0" opacity=".55"/>`],
  'day-2': [`The kitten walks around a wobbling cup while the robot asks gently.`, `${kitchen(80)}${table(240, 400)}${cup(440, 330, 'wob')}<g class="walk" style="--go:210px">${at(290, 330, .9, kitten())}</g>${bot(780, { brow: 'kind', reach: true }, .78)}`],
  'day-3': [`The robot waters a grown tomato plant.`, `${garden()}${tomato(350, 490, true)}${can(470, 390)}${bot(640, { brow: 'glad' }, .8)}${heart(350, 290)}`],
  'day-4': [`Anon kneels pulling weeds.`, `${garden()}${anon(480, { kneel: true })}${[300, 340, 650].map((x) => tuft(x, 490, 1.1)).join('')}`],
  'day-5': [`A bird on the fence sings, then flies away while everyone watches.`, `${garden()}${bird(480, 290)}${notes(530, 250)}${cat(210)}${bot(730, { brow: 'kind', reach: false }, .7)}${anon(420, { kneel: true, sc: .8 })}`],
  'day-6': [`Bread in the glowing oven; Anon and the robot wait.`, `${kitchen(60)}${oven(330)}${anon(650, {})}${bot(820, { brow: 'kind', reach: false }, .62)}`],
  'day-7': [`The robot sits on the kitchen floor, just because.`, `${kitchen(90)}${bot(540, { brow: 'kind', sit: true, reach: false }, .84, 500)}${curled(160, .9)}`],
  'day-8': [`The robot touches the place on its arm; its light glows warm.`, `${kitchen(90)}${bot(580, { brow: 'glad', arms: 'touch', gap: true, glow: true }, .92)}`],
  'day-9': [`Evening: warm bread on the table, the cat in the middle, Anon and robot beside.`, `${kitchen(560, true)}${table(260, 420)}${bread(470, 330)}${at(600, 330, .8, kitten())}${anon(130, {})}${bot(840, { brow: "glad", reach: false }, .66)}`],
  'day-10': [`Anon, the robot and the cat together in the warm kitchen at night.`, `${kitchen(390, true)}${table(90, 300)}${bread(240, 330)}${anon(640, {})}${bot(840, { brow: 'glad', reach: false, glow: true }, .66)}${curled(470, 1.1)}${heart(470, 340)}`],
};
function leafIcon() { return `<path d="M-26 8q24 -40 54 -14q-22 30 -54 14z" fill="${LEAF}" stroke="${INK}" stroke-width="4"/>`; }
for (const [slug, [alt, art]] of Object.entries(BOOK)) SCENES.push({ file: `${slug}.html`, alt, art });

const CSS = `
html,body{margin:0;height:100%;background:#fffdf7}
svg{display:block;width:100%;height:100%}
.robot{animation:bob 4s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}
.head{animation:tilt 5s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}
.beacon{animation:beacon 2.4s ease-in-out infinite}
.eyes,.k-eyes{animation:blink 5.2s linear infinite;transform-box:fill-box;transform-origin:50% 50%}
.arm{animation:reach 3.6s ease-in-out infinite;transform-box:fill-box;transform-origin:100% 0}
.tail{animation:tail 2.6s ease-in-out infinite;transform-box:fill-box;transform-origin:100% 100%}
.k-head{animation:nod 2.2s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}
.mouth{animation:meow 2.2s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 0}
.w1,.w2,.w3{animation:wave 2.2s ease-out infinite}
.w2{animation-delay:.14s}.w3{animation-delay:.28s}
.thought{animation:pop .7s cubic-bezier(.3,1.5,.5,1) both,drift 5s ease-in-out .7s infinite;transform-box:fill-box;transform-origin:50% 50%}
.t2{animation-delay:.7s,1.4s}.t3{animation-delay:1.4s,2.1s}.t4{animation-delay:2.1s,2.8s}
.say{animation:pop .7s cubic-bezier(.3,1.5,.5,1) both;transform-box:fill-box;transform-origin:50% 100%}
.s1{animation-delay:.6s}.s2{animation-delay:1.8s}
@keyframes bob{50%{transform:translateY(-5px)}}
@keyframes tilt{50%{transform:rotate(-2deg)}}
@keyframes beacon{50%{fill:${PINK2}}}
@keyframes blink{0%,94%,100%{transform:scaleY(1)}97%{transform:scaleY(.1)}}
@keyframes reach{50%{transform:rotate(-4deg)}}
@keyframes tail{50%{transform:rotate(9deg)}}
@keyframes nod{50%{transform:translateY(-3px) rotate(1.5deg)}}
@keyframes meow{0%,55%,100%{transform:scaleY(.7)}20%,35%{transform:scaleY(1.5)}}
@keyframes wave{0%,12%{opacity:0}30%{opacity:1}70%,100%{opacity:0}}
@keyframes pop{from{opacity:0;transform:scale(.5)}to{opacity:1;transform:scale(1)}}
@keyframes drift{50%{transform:translateY(-6px)}}
.sway{animation:sway 4s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}
.wob{animation:wob 1.1s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}
.fall{animation:fall 2.4s ease-in 1 both;transform-box:fill-box;transform-origin:50% 50%}
.grow{animation:grow 1.6s ease-out both;transform-box:fill-box;transform-origin:50% 100%}
.walk{animation:walk 7s ease-in-out both}
.leap{animation:leap 2.4s ease-in-out infinite}
.fly{animation:fly 6s ease-in 2s both}
.pulse{animation:pulse 2.4s ease-in-out infinite}
.glow{animation:glow 2.4s ease-in-out infinite}
.steam{animation:steam 3s ease-in-out infinite}
.shake{animation:shake .5s linear infinite}
.pour{animation:pour 1.2s linear infinite}
@keyframes sway{50%{transform:rotate(2.5deg)}}
@keyframes wob{25%{transform:rotate(-7deg)}75%{transform:rotate(7deg)}}
@keyframes fall{0%{transform:none}60%{transform:translate(50px,120px) rotate(200deg)}100%{transform:translate(58px,146px) rotate(250deg)}}
@keyframes grow{from{opacity:0;transform:scale(.3)}to{opacity:1;transform:scale(1)}}
@keyframes walk{from{transform:translateX(0)}to{transform:translateX(var(--go,160px))}}
@keyframes leap{0%,100%{transform:translate(0,0)}45%{transform:translate(70px,-90px) rotate(8deg)}80%{transform:translate(120px,0)}}
@keyframes fly{to{transform:translate(220px,-190px);opacity:0}}
@keyframes pulse{50%{transform:scale(1.06)}}
@keyframes glow{50%{opacity:.15}}
@keyframes steam{0%{opacity:0;transform:translateY(8px)}50%{opacity:.8}100%{opacity:0;transform:translateY(-22px)}}
@keyframes shake{25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}
@keyframes pour{from{stroke-dashoffset:0}to{stroke-dashoffset:-24}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
`;

const page = ({ alt, art }) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Robot and kitten</title>
<style>${CSS}</style></head>
<body><svg viewBox="0 0 960 540" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${alt}">
<defs>
<filter id="pencil" filterUnits="userSpaceOnUse" x="0" y="0" width="960" height="540"><feTurbulence type="fractalNoise" baseFrequency=".04" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="5" xChannelSelector="R" yChannelSelector="G"/></filter>
<filter id="blot" filterUnits="userSpaceOnUse" x="-100" y="-100" width="1160" height="740"><feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="3" seed="9"/><feDisplacementMap in="SourceGraphic" scale="70" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur stdDeviation="14"/></filter>
</defs>
<rect width="960" height="540" fill="#fffdf9"/>
<g filter="url(#blot)"><ellipse cx="470" cy="290" rx="370" ry="190" fill="#c8ebf9" opacity=".6"/><ellipse cx="400" cy="270" rx="170" ry="130" fill="#fdf4b4" opacity=".7"/></g>
<g filter="url(#pencil)">${art}</g>
</svg></body></html>
`;

mkdirSync(OUT, { recursive: true });
for (const s of SCENES) writeFileSync(`${OUT}/${s.file}`, page(s));
