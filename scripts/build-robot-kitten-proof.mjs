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

function robot({ brow = 'kind', reach = true } = {}) {
  const brows = {
    kind: 'M-88 -372q18 -13 36 -5M6 -377q18 -8 36 5',
    worried: 'M-88 -362q18 -20 38 -18M6 -380q20 -2 38 18',
    glad: 'M-88 -378q18 -10 36 -2M6 -380q18 -8 36 2',
  }[brow];
  const arm = reach
    ? { d: 'M-82 -190C-112 -160 -128 -120 -160 -96', x: -166, y: -90 }
    : { d: 'M-82 -190C-104 -160 -112 -130 -116 -100', x: -118, y: -92 };
  return `<g class="robot">
  ${tube('M-34 -128C-30 -90 -50 -60 -44 -22')}${tube('M36 -128C44 -90 28 -60 40 -22')}
  <path d="M-84 -2l6 -26h58l4 26zM6 -2l6 -26h58l6 26z" fill="${BLUE2}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
  ${tube('M92 -194C122 -176 128 -140 122 -104')}${ringHand(120, -94)}
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
    <g class="eyes">
      <ellipse cx="-70" cy="-330" rx="18" ry="24" fill="${INK}"/><circle cx="-76" cy="-340" r="6" fill="#fff"/>
      <ellipse cx="24" cy="-330" rx="18" ry="24" fill="${INK}"/><circle cx="18" cy="-340" r="6" fill="#fff"/>
    </g>
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
