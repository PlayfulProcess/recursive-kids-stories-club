/**
 * generate-book.mjs — Config-driven book generator
 *
 * Generates a single-page HTML book with:
 *   - Karaoke word-synced audio highlighting
 *   - Curated illustrations from CSV
 *   - Clean, reproducible output
 *
 * Usage:
 *   node scripts/generate-book.mjs grammars/alice-5-minute-stories/book.json
 *
 * Output: path specified in book.json "output" field
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse as csvParse } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config Loading ──────────────────────────────────────────────────

const configPath = process.argv[2];
if (!configPath) {
  console.error('Usage: node scripts/generate-book.mjs <book.json>');
  process.exit(1);
}

const configDir = dirname(resolve(configPath));
const config = JSON.parse(readFileSync(resolve(configPath), 'utf8'));

// GitHub config for edit mode (optional)
const githubConfig = config.github || null;
if (githubConfig) {
  console.log(`GitHub: ${githubConfig.owner}/${githubConfig.repo} (edit mode enabled)`);
}

function resolvePath(p) {
  return resolve(configDir, p);
}

// Load grammar
const grammar = JSON.parse(readFileSync(resolvePath(config.grammar), 'utf8'));
console.log(`Grammar: ${grammar.name} (${grammar.items.length} items)`);

// Load illustrations CSV
const illustrations = loadIllustrationsCsv(resolvePath(config.illustrations));
console.log(`Illustrations: ${illustrations.length} entries`);

// Load karaoke manifest (optional)
let karaokeManifest = null;
if (config.audio?.manifest) {
  const manifestPath = resolvePath(config.audio.manifest);
  if (existsSync(manifestPath)) {
    karaokeManifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    console.log(`Audio: unified manifest (${(karaokeManifest.total_duration_s / 60).toFixed(1)} min)`);
  }
}

// Load poem whisper timestamps (optional)
let poemWhisperWords = null;
if (config.preface?.poem) {
  const poemPath = resolvePath(config.preface.poem);
  if (existsSync(poemPath)) {
    const pw = JSON.parse(readFileSync(poemPath, 'utf8'));
    poemWhisperWords = pw.words || [];
    console.log(`Poem: ${poemWhisperWords.length} whisper words`);
  }
}

const MAX_CHARS_PER_PAGE = 1000;

// ── CSV Parser ──────────────────────────────────────────────────────

function loadIllustrationsCsv(csvPath) {
  const text = readFileSync(csvPath, 'utf8');
  const lines = text.trim().split('\n');
  const header = lines[0];
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length < 3) continue;
    rows.push({
      chapter: parseInt(row[0], 10),
      page: parseInt(row[1], 10),
      url: row[2] || '',
      description: row[3] || '',
    });
  }
  return rows;
}

function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuote = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"' && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuote = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuote = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

// ── HTML Helpers ────────────────────────────────────────────────────

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function transformText(text) {
  let t = text
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Break dialogue into separate paragraphs for readability
  t = t.replace(/(["'\u201D])\s+([^""\u201C]*?[.!?,])\s*\n?\s*([""\u201C])/g, '$1 $2\n\n$3');
  t = t.replace(/([.!?,]["'\u201D])\s*\n?\s*([""\u201C])/g, '$1\n\n$2');
  t = t.replace(/([.!?])\s+\n?\s*([""\u201C])/g, '$1\n\n$2');
  t = t.replace(/(;\s*)\n?\s*([""\u201C])/g, '$1\n\n$2');
  t = t.replace(/\n{3,}/g, '\n\n');

  return t;
}

function formatTextAsHtml(text) {
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  return paragraphs.map(p => {
    let cleaned = p.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    return `<p>${escapeHtml(cleaned)}</p>`;
  }).join('\n          ');
}

/**
 * Normalize a word for fuzzy comparison.
 */
function normWord(w) {
  return w.toLowerCase().replace(/[^a-z0-9']/g, '');
}

/**
 * Check if two normalized words match.
 * Strict enough to avoid false positives (e.g. "as" ≠ "asleep")
 * but flexible enough to handle Whisper quirks.
 */
function wordsMatch(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  // Possessives: "alice's" = "alice"
  if (a.replace(/'s$/, '') === b.replace(/'s$/, '')) return true;
  // Prefix match only if shorter word is 5+ chars (avoids "as"="asleep", "in"="into")
  const shorter = a.length < b.length ? a : b;
  const longer = a.length < b.length ? b : a;
  if (shorter.length >= 5 && longer.startsWith(shorter)) return true;
  return false;
}

/**
 * Format text as HTML with pre-baked karaoke word spans.
 * Uses fuzzy alignment: searches forward in the Whisper transcript for each
 * text word, skipping preamble/chapter announcements the reader speaks but
 * that aren't in the written text. This prevents cumulative drift.
 *
 * Returns { html, cursor } so cursor carries across pages.
 */
function formatTextAsKaraokeHtml(text, manifestWords, cursor) {
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  const htmlParts = [];

  // Collect all text words with paragraph info for bigram lookahead
  const allTextWords = [];
  for (const p of paragraphs) {
    const cleaned = p.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    const words = cleaned.split(/\s+/).filter(w => w);
    for (let i = 0; i < words.length; i++) {
      allTextWords.push({ word: words[i], paraIdx: htmlParts.length, wordIdx: i });
    }
    htmlParts.push([]); // placeholder for this paragraph's word HTMLs
  }

  const SEARCH_WINDOW = 20;

  for (let wi = 0; wi < allTextWords.length; wi++) {
    const { word, paraIdx, wordIdx } = allTextWords[wi];
    const norm = normWord(word);
    if (!norm) {
      htmlParts[paraIdx].push(escapeHtml(word));
      continue;
    }

    // Bigram lookahead: next text word's norm (for short-word disambiguation)
    const nextNorm = wi + 1 < allTextWords.length ? normWord(allTextWords[wi + 1].word) : null;

    let matched = false;
    for (let look = cursor; look < Math.min(cursor + SEARCH_WINDOW, manifestWords.length); look++) {
      const mNorm = normWord(manifestWords[look].word);
      if (!wordsMatch(norm, mNorm)) continue;

      // For short words (<=4 chars), require next word to also match (bigram)
      // This prevents "a" matching wrong "a", "the" matching wrong "the", etc.
      if (norm.length <= 4 && nextNorm && look + 1 < manifestWords.length) {
        const mNextNorm = normWord(manifestWords[look + 1].word);
        if (!wordsMatch(nextNorm, mNextNorm)) continue;
      }

      const mw = manifestWords[look];
      htmlParts[paraIdx].push(
        `<span class="k-word" data-start="${mw.start.toFixed(2)}" data-end="${mw.end.toFixed(2)}">${escapeHtml(word)}</span>`
      );
      cursor = look + 1;
      matched = true;
      break;
    }

    if (!matched) {
      htmlParts[paraIdx].push(escapeHtml(word));
    }
  }

  const html = htmlParts.map(words => `<p>${words.join(' ')}</p>`).join('\n          ');
  return { html, cursor };
}

// ── Sentence Splitter ───────────────────────────────────────────────

const ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'st', 'sr', 'jr', 'vs', 'etc', 'vol', 'fig', 'no', 'ch',
]);

const ATTRIBUTION_VERBS = new Set([
  'said', 'thought', 'cried', 'asked', 'replied', 'exclaimed', 'remarked',
  'whispered', 'shouted', 'continued', 'added', 'muttered', 'began',
  'answered', 'observed', 'repeated', 'returned', 'suggested', 'grumbled',
  'growled', 'sighed', 'sobbed', 'shrieked', 'screamed', 'panted',
  'interrupted', 'went', 'called', 'sang', 'recited', 'read', 'roared',
]);

function splitIntoSentences(text) {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  const sentences = [];
  let current = '';
  let i = 0;

  while (i < normalized.length) {
    current += normalized[i];

    if ('.!?'.includes(normalized[i])) {
      let j = i + 1;
      while (j < normalized.length && '"\u201d\u201c\'\u2019)'.includes(normalized[j])) {
        current += normalized[j];
        j++;
      }

      if (j >= normalized.length) {
        sentences.push(current.trim());
        current = '';
        i = j;
        continue;
      }

      if (/[\s\n]/.test(normalized[j])) {
        let k = j;
        while (k < normalized.length && /[\s\n]/.test(normalized[k])) k++;

        const hasParaBreak = normalized.slice(j, k).includes('\n\n');
        if (k >= normalized.length || hasParaBreak || /[A-Z\u201c"(]/.test(normalized[k])) {
          const match = current.match(/\b(\w+)[.!?][\u201d"'\u2019)]*$/);
          const word = match ? match[1].toLowerCase() : '';
          if (!ABBREVIATIONS.has(word)) {
            const nextWordMatch = normalized.slice(k).match(/^([a-zA-Z]+)/);
            const nextWord = nextWordMatch ? nextWordMatch[1].toLowerCase() : '';
            if (!ATTRIBUTION_VERBS.has(nextWord)) {
              sentences.push(current.trim());
              current = '';
              i = j;
              continue;
            }
          }
        }
      }
      i = j;
      continue;
    }
    i++;
  }
  if (current.trim()) sentences.push(current.trim());
  return sentences;
}

function splitTextIntoPages(text, targetChars) {
  const sentences = splitIntoSentences(text);
  if (sentences.length === 0) return [''];

  // Detect paragraph starts
  const paraStarts = new Set();
  let searchPos = 0;
  for (let si = 0; si < sentences.length; si++) {
    const snippet = sentences[si].substring(0, Math.min(30, sentences[si].length));
    const idx = text.indexOf(snippet, searchPos);
    if (idx > searchPos && si > 0) {
      const between = text.slice(searchPos, idx);
      if (/\n\s*\n/.test(between)) {
        paraStarts.add(si);
      }
    }
    if (idx >= 0) searchPos = idx + sentences[si].length;
  }

  const totalLen = sentences.reduce((sum, s) => sum + s.length, 0);
  const idealPageCount = Math.max(1, Math.round(totalLen / targetChars));
  const idealPerPage = totalLen / idealPageCount;

  const pages = [];
  let currentPage = '';

  for (let si = 0; si < sentences.length; si++) {
    const sentence = sentences[si];
    const joiner = currentPage ? (paraStarts.has(si) ? '\n\n' : ' ') : '';
    const wouldBe = currentPage.length + joiner.length + sentence.length;
    const remaining = sentences.slice(si).reduce((sum, s) => sum + s.length, 0);
    const pagesLeft = idealPageCount - pages.length;

    const shouldSplit = currentPage.length > 0 && pagesLeft > 1 && (
      (wouldBe > targetChars * 1.1) ||
      (wouldBe > idealPerPage * 0.85 && paraStarts.has(si)) ||
      (currentPage.length >= idealPerPage * 1.05 && remaining > idealPerPage * 0.5)
    );

    if (shouldSplit) {
      pages.push(currentPage.trim());
      currentPage = sentence;
    } else {
      currentPage = currentPage + joiner + sentence;
    }
  }
  if (currentPage.trim()) pages.push(currentPage.trim());

  // Safety: re-split oversized pages
  const result = [];
  for (const page of pages) {
    if (page.length <= targetChars * 1.15) {
      result.push(page);
    } else {
      const pageSentences = splitIntoSentences(page);
      let chunk = '';
      for (const s of pageSentences) {
        if (chunk && chunk.length + s.length + 1 > targetChars) {
          result.push(chunk.trim());
          chunk = s;
        } else {
          chunk = chunk ? chunk + ' ' + s : s;
        }
      }
      if (chunk.trim()) result.push(chunk.trim());
    }
  }

  // Merge very short last pages
  if (result.length > 1 && result[result.length - 1].length < idealPerPage * 0.3) {
    const lastPage = result.pop();
    result[result.length - 1] += '\n\n' + lastPage;
  }

  return result;
}

// ── Grammar Processing ──────────────────────────────────────────────

const textSection = config.textSection || 'Story (Original Text)';
const l1Items = grammar.items.filter(item => item.level === 1);
const l2Items = grammar.items.filter(item => item.level === 2);

const chapterMap = {};
for (const scene of l1Items) {
  const chNum = scene.metadata.chapter_number;
  if (!chapterMap[chNum]) chapterMap[chNum] = { scenes: [], l2: null };
  chapterMap[chNum].scenes.push(scene);
}
for (const ch of l2Items) {
  const chNum = ch.metadata.chapter_number;
  if (chapterMap[chNum]) chapterMap[chNum].l2 = ch;
}
for (const ch of Object.values(chapterMap)) {
  ch.scenes.sort((a, b) => a.metadata.scene_number - b.metadata.scene_number);
}

// ── Build Chapter Pages (text + illustrations from CSV) ─────────────

function getChapterIllustrations(chNum) {
  return illustrations.filter(ill => ill.chapter === chNum);
}

function buildChapterPages(chNum, chapter) {
  const chIlls = getChapterIllustrations(chNum);
  const coverIll = chIlls.find(ill => ill.page === 0);
  const coverImage = coverIll?.url || chapter.l2?.image_url || chapter.scenes[0]?.image_url || '';

  // Get page illustrations (page >= 1), indexed by page number
  const pageIlls = {};
  for (const ill of chIlls) {
    if (ill.page > 0) pageIlls[ill.page] = ill;
  }

  // Gather all text and split into pages
  let fullText = '';
  for (const scene of chapter.scenes) {
    const raw = scene.sections[textSection] || '';
    if (!raw.trim()) continue;
    if (fullText) fullText += '\n\n';
    fullText += raw;
  }

  const text = transformText(fullText);

  // Text determines page count — CSV illustrations are matched to text pages
  const textPages = splitTextIntoPages(text, MAX_CHARS_PER_PAGE);

  const pages = [];
  for (let i = 0; i < textPages.length; i++) {
    const pageNum = i + 1;
    const ill = pageIlls[pageNum] || null;
    pages.push({
      text: textPages[i],
      illustration: ill?.url ? { url: ill.url, description: ill.description } : null,
    });
  }

  // All chapter illustrations for filmstrip carousel
  const allChIlls = chIlls.map(ill => ({
    page: ill.page, url: ill.url, description: ill.description
  }));

  return { coverImage, pages, allChIlls };
}

// ── Preface Poem ────────────────────────────────────────────────────

const poemStanzas = [
  ['All in the golden afternoon', 'Full leisurely we glide;', 'For both our oars, with little skill,', 'By little arms are plied,', 'While little hands make vain pretence', 'Our wanderings to guide.'],
  ['Ah, cruel Three! In such an hour,', 'Beneath such dreamy weather,', 'To beg a tale of breath too weak', 'To stir the tiniest feather!', 'Yet what can one poor voice avail', 'Against three tongues together?'],
  ['Imperious Prima flashes forth', "Her edict 'to begin it' \u2013", 'In gentler tone Secunda hopes', "'There will be nonsense in it!' \u2013", 'While Tertia interrupts the tale', 'Not more than once a minute.'],
  ['Anon, to sudden silence won,', 'In fancy they pursue', 'The dream-child moving through a land', 'Of wonders wild and new,', 'In friendly chat with bird or beast \u2013', 'And half believe it true.'],
  ['And ever, as the story drained', 'The wells of fancy dry,', 'And faintly strove that weary one', 'To put the subject by,', '\u201cThe rest next time \u2013\u201d \u201cIt is next time!\u201d', 'The happy voices cry.'],
  ['Thus grew the tale of Wonderland:', 'Thus slowly, one by one,', 'Its quaint events were hammered out \u2013', 'And now the tale is done,', 'And home we steer, a merry crew,', 'Beneath the setting sun.'],
  ['Alice! a childish story take,', 'And with a gentle hand', "Lay it where Childhood's dreams are twined", "In Memory's mystic band,", "Like pilgrim's wither'd wreath of flowers", "Pluck'd in a far-off land."],
];

function alignPoemWord(displayWord, whisperWords, cursor) {
  const clean = displayWord.toLowerCase().replace(/[^a-z']/g, '');
  if (!clean) return { start: 0, end: 0, cursor };
  for (let i = cursor; i < Math.min(cursor + 10, whisperWords.length); i++) {
    const wClean = whisperWords[i].word.toLowerCase().replace(/[^a-z']/g, '');
    if (wClean === clean || wClean.startsWith(clean) || clean.startsWith(wClean)) {
      return { start: whisperWords[i].start, end: whisperWords[i].end, cursor: i + 1 };
    }
  }
  return { start: 0, end: 0, cursor };
}

function buildPoemAligned() {
  let cursor = 0;
  const aligned = [];
  for (let si = 0; si < poemStanzas.length; si++) {
    aligned[si] = [];
    for (let li = 0; li < poemStanzas[si].length; li++) {
      const lineWords = poemStanzas[si][li].split(/\s+/);
      aligned[si][li] = [];
      for (const w of lineWords) {
        if (poemWhisperWords) {
          const result = alignPoemWord(w, poemWhisperWords, cursor);
          aligned[si][li].push({ word: w, start: result.start, end: result.end });
          if (result.cursor > cursor) cursor = result.cursor;
        } else {
          aligned[si][li].push({ word: w, start: 0, end: 0 });
        }
      }
    }
  }
  return aligned;
}

// ── HTML Generation ─────────────────────────────────────────────────

const chapterNums = Object.keys(chapterMap).map(Number).sort((a, b) => a - b);
const allChaptersData = [];
let globalPageNum = 0;
let totalIll = 0;
let totalContentPages = 0;

// Book cover spread
globalPageNum++;
let spreadsHtml = `
    <div class="spread cover-spread book-cover" data-spread="book-cover" id="book-cover">
      <div class="page-left cover-image" data-page="${globalPageNum}">
        <img src="${config.cover.image}" alt="${escapeHtml(config.title)}">
      </div>`;
globalPageNum++;
spreadsHtml += `
      <div class="page-right cover-title" data-page="${globalPageNum}">
        <div class="title-block">
          <div class="ornament">&#10048; &#10048; &#10048;</div>
          <h1>${escapeHtml(config.title.toUpperCase()).replace(/ /g, '<br>')}</h1>
          <div class="author">${escapeHtml(config.author.toUpperCase())}</div>
          <div class="edition">ILLUSTRATED CHAPTER BOOKS<br>${escapeHtml(config.cover.illustrators)}</div>
        </div>
        <div class="page-number page-number-right">${globalPageNum}</div>
      </div>
    </div>`;

// ── Preface Poem Spreads ────────────────────────────────────────────

if (config.preface) {
  const poemAligned = buildPoemAligned();
  const poemGroups = [
    { stanzas: [0, 1], title: 'ALL IN THE GOLDEN AFTERNOON' },
    { stanzas: [2, 3] },
    { stanzas: [4, 5, 6] },
  ];

  for (let gi = 0; gi < poemGroups.length; gi++) {
    const group = poemGroups[gi];
    const stanzaHtml = group.stanzas.map(si => {
      return '<div class="poem-stanza">' +
        poemStanzas[si].map((line, li) => {
          if (poemWhisperWords) {
            const wordSpans = poemAligned[si][li].map(w => {
              if (w.start > 0 || w.end > 0) {
                return `<span class="k-word" data-start="${w.start.toFixed(2)}" data-end="${w.end.toFixed(2)}">${escapeHtml(w.word)}</span>`;
              }
              return escapeHtml(w.word);
            }).join(' ');
            return `<div class="poem-line">${wordSpans}</div>`;
          }
          return `<div class="poem-line">${escapeHtml(line)}</div>`;
        }).join('\n') +
        '</div>';
    }).join('\n');

    globalPageNum++;
    if (gi === 0) {
      spreadsHtml += `
    <div class="spread preface-spread" data-spread="preface-${gi + 1}" id="preface">
      <div class="page-left cover-image" data-page="${globalPageNum}">
        <img src="${config.preface.image}" alt="Preface illustration" loading="lazy">
        <div class="page-number page-number-left">${globalPageNum}</div>
      </div>`;
    } else {
      spreadsHtml += `
    <div class="spread preface-spread" data-spread="preface-${gi + 1}">
      <div class="page-left decorative-panel" data-page="${globalPageNum}">
        <div class="chapter-ornament"><div class="ornament-star">&#10048;</div></div>
        <div class="page-number page-number-left">${globalPageNum}</div>
      </div>`;
    }

    globalPageNum++;
    const titleHtml = group.title ? `<div class="poem-title">${escapeHtml(group.title)}</div>` : '';
    const playHint = gi === 0 ? '<div class="poem-play-hint" id="poemPlayHint">&#9835; click to play song</div>' : '';

    spreadsHtml += `
      <div class="page-right preface-text" data-page="${globalPageNum}">
        <div class="poem-block">
          ${titleHtml}
          ${stanzaHtml}
          ${playHint}
        </div>
        <div class="page-number page-number-right">${globalPageNum}</div>
      </div>
    </div>`;
  }
}

// ── Chapter Spreads ─────────────────────────────────────────────────

for (const chNum of chapterNums) {
  const chapter = chapterMap[chNum];
  const { coverImage, pages, allChIlls } = buildChapterPages(chNum, chapter);

  const chName = chapter.l2?.metadata?.original_title || chapter.scenes[0]?.metadata?.chapter_name || `Chapter ${chNum}`;
  const illCount = pages.filter(p => p.illustration).length;
  const chIllsJson = JSON.stringify(allChIlls).replace(/'/g, '&#39;').replace(/</g, '\\u003c');

  // Flatten manifest words for this chapter (for pre-baked karaoke)
  const chManifest = karaokeManifest?.chapters?.[chNum];
  const chManifestWords = chManifest
    ? (chManifest.words || chManifest.pages?.flatMap(p => p.words) || [])
    : [];
  let karaokeCursor = 0;

  // Chapter divider spread
  globalPageNum++;
  spreadsHtml += `
    <div class="spread cover-spread chapter-divider" data-spread="ch${chNum}-cover" id="ch${chNum}">
      <div class="page-left cover-image" data-page="${globalPageNum}">
        <img src="${coverImage}" alt="Chapter ${chNum} cover" loading="lazy">
        <div class="page-number page-number-left">${globalPageNum}</div>
      </div>`;
  globalPageNum++;
  spreadsHtml += `
      <div class="page-right cover-title" data-page="${globalPageNum}">
        <div class="title-block">
          <div class="series-name">${escapeHtml(config.title.toUpperCase())}</div>
          <div class="book-number">CHAPTER ${chNum}</div>
          <h1>${escapeHtml(chName.toUpperCase())}</h1>
          <div class="author">BY ${escapeHtml(config.author.toUpperCase())}</div>
          <div class="page-info">${pages.length} PAGES</div>
        </div>
        <div class="page-number page-number-right">${globalPageNum}</div>
      </div>
    </div>`;

  // Content spreads
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const spreadIdx = `ch${chNum}-${i + 1}`;

    // Generate text HTML — use karaoke-aware formatter if we have manifest words
    let textHtml;
    if (chManifestWords.length > 0) {
      const result = formatTextAsKaraokeHtml(page.text, chManifestWords, karaokeCursor);
      textHtml = result.html;
      karaokeCursor = result.cursor;
    } else {
      textHtml = formatTextAsHtml(page.text);
    }

    // Build filmstrip HTML for this spread (all chapter illustrations as thumbnails)
    let filmstripHtml = '';
    if (allChIlls.length > 0) {
      const thumbs = allChIlls.filter(ill => ill.url).map(ill => {
        const isActive = page.illustration && ill.url === page.illustration.url && ill.page === (i + 1);
        const activeClass = isActive ? ' active' : '';
        const desc = escapeHtml(ill.description || '').replace(/'/g, '&#39;');
        return `<div class="filmstrip-thumb${activeClass}" data-ill-chapter="${chNum}" data-ill-page="${ill.page}" data-url="${ill.url}" data-description="${desc}"><img src="${ill.url}" alt="" loading="lazy"></div>`;
      }).join('');
      filmstripHtml = `<div class="filmstrip">${thumbs}<div class="filmstrip-add" title="Add illustration">+</div></div>`;
    }

    // Left page: illustration or decorative
    globalPageNum++;
    if (page.illustration) {
      const caption = page.illustration.description ? `<div class="ill-caption">${escapeHtml(page.illustration.description)}</div>` : '';
      spreadsHtml += `
    <div class="spread" data-spread="${spreadIdx}" data-ch="${chNum}" data-ch-ills='${chIllsJson}'>
      <div class="page-left" data-page="${globalPageNum}" data-ch="${chNum}" data-local-page="${i + 1}">
        ${filmstripHtml}
        <div class="ill-main"><img src="${page.illustration.url}" alt="${escapeHtml(page.illustration.description || '')}" loading="lazy"></div>
        ${caption}
        <div class="page-number page-number-left">${globalPageNum}</div>
      </div>`;
    } else {
      spreadsHtml += `
    <div class="spread text-only" data-spread="${spreadIdx}" data-ch="${chNum}" data-ch-ills='${chIllsJson}'>
      <div class="page-left decorative-panel" data-page="${globalPageNum}" data-ch="${chNum}" data-local-page="${i + 1}">
        ${filmstripHtml}
        <div class="chapter-ornament"><div class="ornament-number">${chNum}</div></div>
        <div class="page-number page-number-left">${globalPageNum}</div>
      </div>`;
    }

    // Right page: text
    globalPageNum++;

    spreadsHtml += `
      <div class="page-right" data-page="${globalPageNum}" data-ch="${chNum}" data-local-page="${i + 1}">
        <div class="text-block">
          ${textHtml}
        </div>
        <div class="page-number page-number-right">${globalPageNum}</div>
      </div>
    </div>`;
  }

  if (chManifestWords.length > 0 && karaokeCursor < chManifestWords.length) {
    console.log(`  ⚠ Ch${chNum}: ${chManifestWords.length - karaokeCursor} manifest words unused (${karaokeCursor}/${chManifestWords.length})`);
  }

  totalIll += illCount;
  totalContentPages += pages.length;

  allChaptersData.push({
    chNum, chName, coverImage,
    pageCount: pages.length, illCount, pages,
  });
}

// THE END spread
globalPageNum++;
spreadsHtml += `
    <div class="spread back-cover" data-spread="the-end" id="the-end">
      <div class="page-left decorative-panel" data-page="${globalPageNum}">
        <div class="chapter-ornament"><div class="ornament-star">&#10038;</div></div>
        <div class="page-number page-number-left">${globalPageNum}</div>
      </div>`;
globalPageNum++;
spreadsHtml += `
      <div class="page-right back-text" data-page="${globalPageNum}">
        <div class="back-block">
          <div class="the-end">THE END</div>
          <div class="back-info">
            <p>${escapeHtml(config.title.toUpperCase())}</p>
            <p class="small">WORDS BY ${escapeHtml(config.author.toUpperCase())}</p>
            <p class="small">${totalIll} ILLUSTRATIONS &middot; ALL PUBLIC DOMAIN</p>
            <p class="small">${escapeHtml(config.cover.illustrators)}</p>
            <p class="small">MADE WITH LOVE AT RECURSIVE.ECO</p>
          </div>
        </div>
        <div class="page-number page-number-right">${globalPageNum}</div>
      </div>
    </div>`;

// ── Build Audio Data JSON ───────────────────────────────────────────

let audioDataJson = 'null';

if (karaokeManifest && config.audio?.url) {
  const chapterOffsets = Object.values(karaokeManifest.chapters).map(ch => ({
    chapter: ch.chapter,
    offset: ch.offset,
    duration: ch.duration,
  }));

  // Add cache buster to audio URL to force browsers to fetch the latest version
  // (old merged MP3 had Xing header bug declaring only chapter 1 duration)
  const audioCacheBuster = config.audio.url + (config.audio.url.includes('?') ? '&' : '?') + 'v=2';
  audioDataJson = JSON.stringify({
    url: audioCacheBuster,
    totalDuration: karaokeManifest.total_duration_s,
    chapters: chapterOffsets,
  });
}

// ── Chapter Nav Data ────────────────────────────────────────────────

const chapterNavJson = JSON.stringify(allChaptersData.map(ch => ({
  num: ch.chNum, name: ch.chName, id: `ch${ch.chNum}`,
  pages: ch.pageCount, ills: ch.illCount,
})));

// ── Assemble Final HTML ─────────────────────────────────────────────

const bookHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(config.title)} \u2014 Complete Illustrated Book</title>
  <style>
${generateCSS()}
  </style>
</head>
<body>

${generateToolbarHTML()}

<div class="chapter-nav" id="chapterNav">
  <h2>CHAPTERS</h2>
  <a class="nav-item" onclick="scrollToId('book-cover')">
    <span class="nav-num">BOOK</span>
    <span class="nav-name">Cover</span>
  </a>
${config.preface ? `  <a class="nav-item" onclick="scrollToId('preface')">
    <span class="nav-num">PREFACE</span>
    <span class="nav-name">All in the Golden Afternoon</span>
  </a>` : ''}
</div>

<div class="zoom-overlay" id="zoomOverlay">
  <img id="zoomImg">
  <div class="zoom-hint">Press <kbd>Esc</kbd> or click to close</div>
</div>

<div class="metadata-overlay" id="metadataOverlay">
  <div class="metadata-content">
    <div class="metadata-img"><img id="metaImg"></div>
    <div class="metadata-info" id="metaInfo"></div>
    <button class="metadata-close" id="metaClose">&times; Close</button>
  </div>
</div>

${githubConfig ? `<div class="edit-modal" id="editModal">
  <div class="edit-modal-inner">
    <h3>GitHub Editor Setup</h3>
    <label>GitHub Token
      <div style="display:flex;align-items:center;gap:6px;margin:4px 0 8px">
        <input type="password" id="ghTokenInput" placeholder="ghp_..." style="flex:1">
        <span class="token-help-icon" id="tokenHelpIcon" title="How to get a token">&#9432;</span>
      </div>
    </label>
    <div class="token-help-popup" id="tokenHelpPopup">
      <div class="token-help-close" id="tokenHelpClose">&times;</div>
      <h4>How to get a GitHub Token</h4>
      <ol>
        <li>Click the link below to open GitHub token settings</li>
        <li>Make sure <strong>repo</strong> scope is checked</li>
        <li>Set expiration (90 days recommended)</li>
        <li>Click <strong>Generate token</strong></li>
        <li>Copy the token (starts with <code>ghp_</code>)</li>
        <li>Paste it in the field above</li>
      </ol>
      <p style="margin:8px 0 4px">Your token stays in your browser only. It is never sent anywhere except GitHub&rsquo;s API.</p>
      <a href="https://github.com/settings/tokens/new?scopes=repo&description=Stories+Club+Editor" target="_blank" class="token-help-link">Open GitHub Token Settings &rarr;</a>
    </div>
    <label>Owner<br><input type="text" id="ghOwnerInput" value="${escapeHtml(githubConfig.owner || '')}" style="width:100%;margin:4px 0 8px"></label>
    <label>Repo<br><input type="text" id="ghRepoInput" value="${escapeHtml(githubConfig.repo || '')}" style="width:100%;margin:4px 0 8px"></label>
    <div style="display:flex;gap:8px;margin-top:12px">
      <button id="ghSaveBtn">Save & Enable</button>
      <button id="ghCancelBtn">Cancel</button>
    </div>
  </div>
</div>` : ''}

<div class="save-flash" id="saveFlash">Saved!</div>

${spreadsHtml}

<script>
var AUDIO_DATA = ${audioDataJson};
var CHAPTER_NAV = ${chapterNavJson};
var GITHUB_CONFIG = ${githubConfig ? JSON.stringify(githubConfig) : 'null'};

${generateJS()}
</script>
</body>
</html>`;

// ── Write Output ────────────────────────────────────────────────────

const outputPath = resolvePath(config.output);
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, bookHtml);

console.log(`\nOutput: ${outputPath}`);
console.log(`  ${chapterNums.length} chapters, ${totalContentPages} content pages, ${totalIll} illustrations`);
console.log(`  ${globalPageNum} total pages, ${(bookHtml.length / 1024 / 1024).toFixed(1)} MB`);

// ── CSS Template ────────────────────────────────────────────────────

function generateCSS() {
  return `
    @page { size: landscape; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Georgia', 'Cambria', 'Times New Roman', serif;
      background: white;
      color: #1a1a1a;
    }

    /* ── Spreads ── */
    .spread {
      width: 100vw; height: 100vh;
      display: flex;
      page-break-after: always; break-after: page;
      overflow: hidden;
    }
    .spread:last-child { page-break-after: avoid; break-after: avoid; }

    /* ── Left page: illustration ── */
    .page-left {
      width: 50%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      background: #f8f5f0; padding: 16px;
      overflow: hidden; position: relative;
      border-right: 2px solid #d0c8b8;
    }
    .page-left img {
      max-width: 100%; max-height: 100%;
      object-fit: contain; border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      cursor: pointer;
    }

    /* ── Right page: text ── */
    .page-right {
      width: 50%; height: 100%;
      display: flex; flex-direction: column;
      align-items: flex-start; justify-content: center;
      padding: 32px 5%; background: white;
      position: relative; overflow: hidden;
      border-left: 2px solid #d0c8b8;
    }

    /* ── Text block ── */
    .text-block {
      flex: 1 1 0; min-height: 0;
      display: flex; flex-direction: column;
      justify-content: center; width: 100%; overflow: hidden;
    }
    .text-block p {
      font-size: 18px; line-height: 1.7;
      font-weight: 400; text-align: justify; text-align-last: left;
      hyphens: auto; -webkit-hyphens: auto;
      word-break: break-word; margin-bottom: 0.8em;
      text-indent: 1.5em;
    }
    .text-block p:last-child { margin-bottom: 0; }

    /* ── Illustration caption ── */
    .ill-caption {
      position: absolute; bottom: 20px; left: 16px; right: 16px;
      font-size: 9px; color: #8a7a6a; text-align: center;
      letter-spacing: 0.5px; line-height: 1.4;
      font-family: 'Georgia', serif; font-style: italic;
      opacity: 0.7;
    }

    /* ── Page numbers ── */
    .page-number {
      font-size: 11px; color: #999;
      position: absolute; bottom: 8px;
    }
    .page-number-left { left: 16px; }
    .page-number-right { right: 16px; }

    /* ── Decorative panel (text-only pages) ── */
    .decorative-panel {
      background: #2c1810; border-right-color: #5a4030;
    }
    .decorative-panel .page-number { color: #5a4030; }
    .chapter-ornament { text-align: center; color: #d4a76a; }
    .ornament-number {
      font-size: clamp(48px, 8vw, 96px); font-weight: 800;
      letter-spacing: 4px; opacity: 0.3; font-family: 'Georgia', serif;
    }
    .ornament-star { font-size: clamp(36px, 6vw, 72px); opacity: 0.3; }

    /* ── Cover & chapter dividers ── */
    .cover-title { background: #2c1810; color: white; }
    .title-block { text-align: center; font-family: 'Georgia', serif; }
    .series-name {
      font-size: clamp(11px, 1.5vw, 16px); letter-spacing: 4px;
      color: #d4a76a; margin-bottom: 12px;
    }
    .book-number {
      font-size: clamp(13px, 1.8vw, 20px); letter-spacing: 3px;
      color: #d4a76a; margin-bottom: 20px;
    }
    .title-block h1 {
      font-size: clamp(20px, 3.8vw, 42px); line-height: 1.2;
      margin-bottom: 25px; font-weight: 800; letter-spacing: 1px;
    }
    .author {
      font-size: clamp(11px, 1.3vw, 14px); letter-spacing: 3px;
      color: #d4a76a; margin-bottom: 8px;
    }
    .page-info {
      font-size: clamp(9px, 1vw, 11px); letter-spacing: 2px;
      color: #a08060; margin-top: 5px;
    }
    .edition {
      font-size: clamp(10px, 1.2vw, 14px); letter-spacing: 2px;
      color: #a08060; line-height: 1.8;
    }
    .ornament { font-size: 24px; color: #d4a76a; margin-bottom: 30px; letter-spacing: 8px; }
    .cover-image { background: #2c1810; border-right-color: #5a4030; }
    .cover-image img { border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.3); }
    .cover-title { border-left-color: #5a4030; }
    .cover-title .page-number { color: #5a4030; }
    .cover-image .page-number { color: #5a4030; }

    /* ── Back cover ── */
    .back-text { background: #2c1810; color: white; border-left-color: #5a4030; }
    .back-text .page-number { color: #5a4030; }
    .back-block { text-align: center; font-family: 'Georgia', serif; }
    .the-end {
      font-size: clamp(24px, 4vw, 44px); font-weight: 800;
      letter-spacing: 6px; margin-bottom: 30px; color: #d4a76a;
    }
    .back-info p {
      font-size: clamp(10px, 1.2vw, 13px); letter-spacing: 2px;
      margin-bottom: 6px; color: #d4a76a;
    }
    .back-info .small { font-size: clamp(8px, 0.9vw, 10px); color: #a08060; }

    /* ── Toolbar ── */
    .toolbar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      display: flex; align-items: center; gap: 10px;
      padding: 8px 16px; background: #2c1810; color: #d4a76a;
      font-family: 'Georgia', serif; font-size: 13px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      transition: opacity 0.5s ease, transform 0.5s ease;
    }
    .toolbar.toolbar-hidden {
      opacity: 0; transform: translateY(-100%); pointer-events: none;
    }
    .toolbar input[type="text"] {
      padding: 5px 10px; border: 1px solid #d4a76a; border-radius: 4px;
      background: #1a0f08; color: #f0e6d6; font-size: 13px;
      font-family: 'Georgia', serif; width: 120px;
    }
    .toolbar input::placeholder { color: #8a7060; }
    .toolbar button {
      padding: 5px 12px; border: 1px solid #d4a76a; border-radius: 4px;
      background: #1a0f08; color: #d4a76a; font-size: 12px;
      cursor: pointer; font-family: 'Georgia', serif;
    }
    .toolbar button:hover { background: #3c2820; }
    .toolbar button.active { background: #d4a76a; color: #2c1810; }
    .toolbar select {
      padding: 4px 6px; border: 1px solid #d4a76a; border-radius: 4px;
      background: #1a0f08; color: #d4a76a; font-size: 11px;
      font-family: 'Georgia', serif; cursor: pointer;
    }
    .toolbar .match-count { font-size: 11px; color: #a08060; min-width: 60px; }
    .toolbar .spacer { flex: 1; }
    .toolbar .ch-title { font-size: 12px; letter-spacing: 1px; }

    /* ── Search highlight ── */
    .search-match { background: #ffd700 !important; color: #1a1a1a !important; border-radius: 2px; padding: 0 1px; }
    .search-current { background: #ff6b00 !important; color: white !important; border-radius: 2px; padding: 0 1px; }

    /* ── Karaoke ── */
    .k-word { transition: color 2.5s ease; cursor: pointer; }
    .k-word:hover { text-decoration-line: underline; text-decoration-style: dotted; text-underline-offset: 3px; }
    .k-word.k-spoken { color: #9a8a7a; transition: color 3s ease; }
    .k-word.k-active { color: #b89060; transition: color 1.5s ease; }
    .k-word.k-near { color: #8a7560; transition: color 2s ease; }

    /* ── Audio progress bar ── */
    .audio-progress {
      flex: 1; min-width: 80px; height: 6px;
      background: rgba(255,255,255,0.15); border-radius: 3px;
      cursor: pointer; position: relative;
    }
    .audio-progress-bar {
      height: 100%; background: #d4a76a; width: 0%;
      transition: width 0.3s linear; border-radius: 3px;
    }
    .audio-progress:hover { height: 8px; }

    /* ── Chapter Navigation Sidebar ── */
    .chapter-nav {
      position: fixed; right: 0; top: 44px; bottom: 0; width: 280px;
      background: rgba(44, 24, 16, 0.95); color: #d4a76a;
      font-family: 'Georgia', serif; z-index: 90;
      overflow-y: auto; transform: translateX(100%);
      transition: transform 0.3s ease; padding: 20px 16px;
      box-shadow: -4px 0 20px rgba(0,0,0,0.3);
    }
    .chapter-nav.open { transform: translateX(0); }
    .chapter-nav h2 { font-size: 13px; letter-spacing: 2px; margin-bottom: 16px; color: #a08060; }
    .chapter-nav .nav-item {
      display: block; padding: 10px 12px; margin-bottom: 4px;
      border-radius: 6px; text-decoration: none; color: #d4a76a;
      font-size: 13px; transition: background 0.2s; cursor: pointer;
    }
    .chapter-nav .nav-item:hover { background: rgba(255,255,255,0.08); }
    .chapter-nav .nav-item.active { background: rgba(212,167,106,0.2); }
    .chapter-nav .nav-item .nav-num { font-size: 10px; letter-spacing: 2px; color: #a08060; display: block; margin-bottom: 2px; }
    .chapter-nav .nav-item .nav-name { font-weight: 700; font-size: 14px; }
    .chapter-nav .nav-item .nav-meta { font-size: 10px; color: #7a6050; margin-top: 2px; }

    /* ── Image zoom overlay ── */
    .zoom-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.97);
      z-index: 999; display: none; flex-direction: column;
      align-items: center; justify-content: center;
      cursor: pointer;
    }
    .zoom-overlay.active { display: flex; }
    .zoom-overlay img { max-width: 95vw; max-height: 90vh; object-fit: contain; }
    .zoom-hint {
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      color: #555; font-size: 11px; letter-spacing: 1px;
    }
    .zoom-hint kbd {
      background: #333; color: #ccc; padding: 1px 6px; border-radius: 3px;
      font-size: 10px; font-family: monospace;
    }

    /* ── Preface / Poem ── */
    .preface-spread { position: relative; z-index: 51; }
    .preface-spread .preface-text {
      background: #2c1810; color: #f0e6d6; border-left-color: #5a4030;
      display: flex; align-items: center; justify-content: center;
    }
    .preface-spread .preface-text .page-number { color: #5a4030; }
    .poem-block { text-align: center; font-family: 'Georgia', serif; max-width: 420px; }
    .poem-title {
      font-size: clamp(14px, 2vw, 20px); letter-spacing: 3px;
      color: #d4a76a; margin-bottom: 28px; font-weight: 800;
    }
    .poem-stanza { margin-bottom: 20px; }
    .poem-line {
      font-size: clamp(12px, 1.4vw, 16px); line-height: 1.8;
      font-style: italic; color: #e0d4c4; letter-spacing: 0.3px;
    }
    .preface-spread .k-word { transition: color 0.3s; }
    .preface-spread .k-word.k-active { color: #d4a76a; font-weight: bold; }
    .preface-spread .k-word.k-spoken { color: #7a6050; }
    .preface-spread .k-word.k-near { color: #c0a888; }
    .poem-play-hint {
      margin-top: 24px; font-size: 12px; color: #7a6050;
      letter-spacing: 1px; cursor: pointer; transition: color 0.3s;
      position: relative; z-index: 60;
    }
    .poem-play-hint:hover { color: #d4a76a; }
    .poem-play-hint.playing { color: #d4a76a; }
    .poem-progress {
      margin-top: 8px; width: 200px; height: 3px;
      background: rgba(255,255,255,0.1); border-radius: 2px;
      margin-left: auto; margin-right: auto; overflow: hidden;
      position: relative; z-index: 60;
    }
    .poem-progress-bar { height: 100%; background: #d4a76a; width: 0%; transition: width 0.3s linear; }

    /* ── Screen mode ── */
    @media screen {
      .spread { border-bottom: 3px dashed #ccc; min-height: 100vh; }
      .spread:last-child { border-bottom: none; }
      body { background: #e8e8e8; padding-top: 44px; }
    }

    /* ── Filmstrip Carousel ── */
    .filmstrip {
      position: absolute; left: 0; top: 0; width: 62px; height: 100%;
      background: rgba(44, 24, 16, 0.85); z-index: 10;
      overflow-y: scroll; overflow-x: hidden;
      display: flex; flex-direction: column; align-items: center;
      padding: 6px 4px; gap: 4px;
      scrollbar-width: thin; scrollbar-color: #5a4030 transparent;
      opacity: 0.4; transition: opacity 0.3s ease;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
    }
    .filmstrip:hover { opacity: 1; }
    .filmstrip-thumb {
      width: 52px; height: 52px; flex-shrink: 0;
      border: 2px solid transparent; border-radius: 4px;
      overflow: hidden; position: relative;
      transition: border-color 0.2s ease, transform 0.15s ease;
    }
    .filmstrip-thumb img {
      width: 100%; height: 100%; object-fit: cover;
      pointer-events: none;
    }
    .filmstrip-thumb.active {
      border-color: #d4a76a; box-shadow: 0 0 6px rgba(212,167,106,0.5);
    }
    .filmstrip-add {
      width: 52px; height: 32px; flex-shrink: 0;
      border: 2px dashed #5a4030; border-radius: 4px;
      color: #5a4030; font-size: 20px; font-weight: bold;
      display: none; align-items: center; justify-content: center;
      cursor: pointer; transition: border-color 0.2s, color 0.2s;
    }
    .filmstrip-add:hover { border-color: #d4a76a; color: #d4a76a; }
    .ill-main {
      display: flex; align-items: center; justify-content: center;
      flex: 1; width: 100%; height: 100%;
      padding-left: 62px;
    }
    .ill-main img {
      max-width: 100%; max-height: 100%;
      object-fit: contain; border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      cursor: pointer;
    }
    .text-only .filmstrip { background: rgba(44, 24, 16, 0.6); }

    /* ── Edit Mode ── */
    body.edit-mode .filmstrip { opacity: 1; }
    body.edit-mode .filmstrip-thumb { cursor: pointer; }
    body.edit-mode .filmstrip-thumb:hover {
      border-color: #f0d090; transform: scale(1.08);
    }
    body.edit-mode .filmstrip-add { display: flex; }
    .edit-indicator {
      font-size: 10px; letter-spacing: 1px; color: #ff9040;
      margin-left: 4px; display: none;
    }
    body.edit-mode .edit-indicator { display: inline; }

    /* ── Edit Modal ── */
    .edit-modal {
      position: fixed; inset: 0; background: rgba(0,0,0,0.8);
      z-index: 1000; display: none; align-items: center; justify-content: center;
    }
    .edit-modal.active { display: flex; }
    .edit-modal-inner {
      background: #2c1810; border: 1px solid #d4a76a; border-radius: 8px;
      padding: 24px; width: 340px; color: #f0e6d6;
      font-family: 'Georgia', serif; font-size: 13px;
    }
    .edit-modal-inner h3 {
      color: #d4a76a; margin-bottom: 16px; font-size: 16px; letter-spacing: 1px;
    }
    .edit-modal-inner label { color: #a08060; font-size: 11px; letter-spacing: 0.5px; }
    .edit-modal-inner input {
      padding: 6px 10px; border: 1px solid #5a4030; border-radius: 4px;
      background: #1a0f08; color: #f0e6d6; font-size: 13px;
      font-family: 'Georgia', serif;
    }
    .edit-modal-inner button {
      padding: 6px 14px; border: 1px solid #d4a76a; border-radius: 4px;
      background: #1a0f08; color: #d4a76a; font-size: 12px;
      cursor: pointer; font-family: 'Georgia', serif;
    }
    .edit-modal-inner button:hover { background: #3c2820; }

    /* ── Token Help ── */
    .token-help-icon {
      width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
      border: 1px solid #5a4030; border-radius: 50%; background: #1a0f08;
      color: #d4a76a; font-size: 16px; cursor: pointer; flex-shrink: 0;
      transition: background 0.2s, border-color 0.2s;
    }
    .token-help-icon:hover { background: #3c2820; border-color: #d4a76a; }
    .token-help-popup {
      display: none; background: #1a0f08; border: 1px solid #d4a76a;
      border-radius: 8px; padding: 16px 18px; margin: 10px 0;
      color: #f0e6d6; font-size: 12px; line-height: 1.6; position: relative;
    }
    .token-help-popup.active { display: block; }
    .token-help-popup h4 {
      color: #d4a76a; font-size: 13px; margin-bottom: 10px; letter-spacing: 0.5px;
    }
    .token-help-popup ol {
      padding-left: 20px; margin: 0;
    }
    .token-help-popup li {
      margin-bottom: 4px; color: #c8b8a4;
    }
    .token-help-popup code {
      background: #2c1810; padding: 1px 5px; border-radius: 3px;
      font-family: monospace; font-size: 11px; color: #d4a76a;
    }
    .token-help-link {
      display: inline-block; margin-top: 8px; padding: 6px 14px;
      background: #238636; color: #fff; border-radius: 6px;
      text-decoration: none; font-size: 12px; font-weight: 600;
      transition: background 0.2s;
    }
    .token-help-link:hover { background: #2ea043; }
    .token-help-close {
      position: absolute; top: 8px; right: 12px; cursor: pointer;
      color: #8a7060; font-size: 18px; line-height: 1;
    }
    .token-help-close:hover { color: #d4a76a; }

    /* ── Metadata Overlay ── */
    .metadata-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.92);
      z-index: 998; display: none; align-items: center; justify-content: center;
    }
    .metadata-overlay.active { display: flex; }
    .metadata-content {
      background: #2c1810; border: 1px solid #5a4030; border-radius: 8px;
      padding: 20px; max-width: 500px; width: 90%; color: #f0e6d6;
      font-family: 'Georgia', serif; text-align: center;
    }
    .metadata-img { margin-bottom: 12px; }
    .metadata-img img { max-width: 100%; max-height: 300px; object-fit: contain; border-radius: 4px; }
    .metadata-info { font-size: 13px; line-height: 1.6; color: #d4a76a; margin-bottom: 12px; }
    .metadata-close {
      padding: 6px 16px; border: 1px solid #5a4030; border-radius: 4px;
      background: #1a0f08; color: #a08060; font-size: 12px;
      cursor: pointer; font-family: 'Georgia', serif;
    }
    .metadata-close:hover { background: #3c2820; color: #d4a76a; }

    /* ── Save Flash ── */
    .save-flash {
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: #2c1810; border: 2px solid #d4a76a; border-radius: 8px;
      padding: 16px 32px; color: #d4a76a; font-size: 18px;
      font-family: 'Georgia', serif; letter-spacing: 2px; z-index: 1001;
      display: none; opacity: 0; transition: opacity 0.3s ease;
    }
    .save-flash.active { display: block; opacity: 1; }

    /* ── Print ── */
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding-top: 0 !important; background: white !important; }
      .spread { height: 100vh; border-bottom: none !important; min-height: auto !important; page-break-inside: avoid; break-inside: avoid; }
      .page-left img { box-shadow: none; }
      .cover-image img { box-shadow: none; }
      .toolbar, .chapter-nav, .audio-progress, .zoom-overlay, .filmstrip, .edit-modal, .metadata-overlay, .save-flash { display: none !important; }
      .ill-main { padding-left: 0 !important; }
      mark.search-match { background: transparent !important; color: inherit !important; }
    }
`;
}

// ── Toolbar HTML ────────────────────────────────────────────────────

function generateToolbarHTML() {
  return `
<div class="toolbar">
  <span class="ch-title" id="currentChLabel">${escapeHtml(config.title.toUpperCase())}</span>
  <button id="playBtn">&#9654; Play</button>
  <select id="speedCtrl" title="Playback speed">
    <option value="0.5">0.5x</option>
    <option value="0.75">0.75x</option>
    <option value="1" selected>1x</option>
    <option value="1.25">1.25x</option>
    <option value="1.5">1.5x</option>
    <option value="2">2x</option>
  </select>
  <div class="audio-progress" id="progressTrack">
    <div class="audio-progress-bar" id="progressBar"></div>
  </div>
  <span class="ch-title" style="color:#a08060" id="audioTime"></span>
  <input type="text" id="searchInput" placeholder="Search..." autocomplete="off">
  <span class="match-count" id="matchCount"></span>
  <button id="caseToggle" title="Toggle uppercase/lowercase">Aa</button>
  <button id="fullscreenBtn">&#x26F6; Fullscreen</button>
  <button id="navToggle" title="Chapter list">&#9776; Chapters</button>
${githubConfig ? '  <button id="editToggle" title="Toggle edit mode">&#128274; Edit</button><span class="edit-indicator" id="editIndicator"></span>' : ''}
</div>`;
}

// ── Client JavaScript ───────────────────────────────────────────────

function generateJS() {
  return `
// ── Chapter Navigation ──
(function() {
  var navEl = document.getElementById('chapterNav');
  for (var i = 0; i < CHAPTER_NAV.length; i++) {
    var ch = CHAPTER_NAV[i];
    var a = document.createElement('a');
    a.className = 'nav-item';
    a.dataset.ch = ch.num;
    a.onclick = (function(id) { return function() { scrollToId(id); }; })(ch.id);
    a.innerHTML = '<span class="nav-num">CHAPTER ' + ch.num + '</span>'
      + '<span class="nav-name">' + ch.name + '</span>'
      + '<span class="nav-meta">' + ch.pages + ' pages \\u00b7 ' + ch.ills + ' illustrations</span>';
    navEl.appendChild(a);
  }
  var endA = document.createElement('a');
  endA.className = 'nav-item';
  endA.onclick = function() { scrollToId('the-end'); };
  endA.innerHTML = '<span class="nav-num">BOOK</span><span class="nav-name">The End</span>';
  navEl.appendChild(endA);
})();

function scrollToId(id) {
  var el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
  document.getElementById('chapterNav').classList.remove('open');
}

document.getElementById('navToggle').addEventListener('click', function() {
  document.getElementById('chapterNav').classList.toggle('open');
});

// ── Update chapter label on scroll ──
(function() {
  var chapterDividers = document.querySelectorAll('.chapter-divider');
  var label = document.getElementById('currentChLabel');
  var navItems = document.querySelectorAll('.chapter-nav .nav-item');

  function updateChapter() {
    var scrollY = window.scrollY + window.innerHeight / 2;
    var current = null;
    chapterDividers.forEach(function(div) {
      if (div.offsetTop <= scrollY) current = div;
    });
    if (current) {
      var id = current.id;
      var chNum = id.replace('ch', '');
      var ch = CHAPTER_NAV.find(function(c) { return c.num == chNum; });
      if (ch) {
        label.textContent = 'CH ' + ch.num + ': ' + ch.name.toUpperCase();
        navItems.forEach(function(ni) {
          ni.classList.toggle('active', ni.dataset.ch == chNum);
        });
      }
    } else {
      label.textContent = ${JSON.stringify(config.title.toUpperCase())};
    }
  }

  var scrollTimer;
  window.addEventListener('scroll', function() {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(updateChapter, 100);
  });
})();

// ── Preface Song Player ──
(function() {
  var hint = document.getElementById('poemPlayHint');
  if (!hint) return;

  var poemAudio = document.createElement('audio');
  poemAudio.src = ${JSON.stringify(config.preface?.songUrl || '')};
  poemAudio.preload = 'metadata';
  document.body.appendChild(poemAudio);

  var isPlayingPoem = false;

  poemAudio.addEventListener('error', function() {
    hint.innerHTML = '\\u26a0 song file not found';
    hint.style.color = '#cc6644';
    hint.style.cursor = 'default';
  });

  // Progress bar
  var progDiv = document.createElement('div');
  progDiv.className = 'poem-progress';
  progDiv.innerHTML = '<div class="poem-progress-bar" id="poemProgressBar"></div>';
  hint.parentElement.appendChild(progDiv);
  var poemProgBar = document.getElementById('poemProgressBar');

  hint.addEventListener('click', function(e) {
    e.stopPropagation();
    if (isPlayingPoem) {
      poemAudio.pause();
      isPlayingPoem = false;
      hint.innerHTML = '\\u266b click to play song';
      hint.classList.remove('playing');
    } else {
      hint.innerHTML = '\\u266a loading...';
      poemAudio.play().then(function() {
        isPlayingPoem = true;
        hint.innerHTML = '\\u25ae\\u25ae pause song';
        hint.classList.add('playing');
      }).catch(function() {
        hint.innerHTML = '\\u26a0 audio not found';
        hint.style.color = '#cc6644';
      });
    }
  });

  // Poem karaoke highlighting
  var poemKWords = Array.from(document.querySelectorAll('.preface-spread .k-word'));

  poemAudio.addEventListener('timeupdate', function() {
    var t = poemAudio.currentTime;
    if (poemAudio.duration) poemProgBar.style.width = ((t / poemAudio.duration) * 100) + '%';
    for (var i = 0; i < poemKWords.length; i++) {
      var s = parseFloat(poemKWords[i].dataset.start);
      var e = parseFloat(poemKWords[i].dataset.end);
      poemKWords[i].classList.remove('k-active', 'k-near', 'k-spoken');
      if (s === 0 && e === 0) continue;
      if (t >= s && t <= e) poemKWords[i].classList.add('k-active');
      else if (t > e) poemKWords[i].classList.add('k-spoken');
      else if (t >= s - 2) poemKWords[i].classList.add('k-near');
    }
  });

  poemAudio.addEventListener('ended', function() {
    isPlayingPoem = false;
    hint.innerHTML = '\\u266b click to play song';
    hint.classList.remove('playing');
    poemProgBar.style.width = '0%';
    for (var i = 0; i < poemKWords.length; i++) {
      poemKWords[i].classList.remove('k-active', 'k-near', 'k-spoken');
    }
  });
})();

// ── Toolbar auto-hide ──
(function() {
  var toolbar = document.querySelector('.toolbar');
  var hideTimer = null;
  var HIDE_DELAY = 3000;

  function showToolbar() {
    toolbar.classList.remove('toolbar-hidden');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function() { toolbar.classList.add('toolbar-hidden'); }, HIDE_DELAY);
  }

  document.addEventListener('mousemove', showToolbar);
  document.addEventListener('click', showToolbar);
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') showToolbar(); });
  hideTimer = setTimeout(function() { toolbar.classList.add('toolbar-hidden'); }, HIDE_DELAY);
})();

// ── Auto-fit text ──
// Priority: reduce spacing first (line-height, margins, padding), then font size last
(function() {
  var BASE_FONT = 18, MIN_FONT = 11, FONT_STEP = 0.5;
  var MAX_LH = 1.7, MIN_LH = 1.15, LH_STEP = 0.05;
  var MAX_MB = 0.8, MIN_MB = 0.05, MB_STEP = 0.05;
  var MAX_PAD = 32, MIN_PAD = 8, PAD_STEP = 2;

  function overflows(block) {
    // Compare the text-block's content height against its own visible height
    // (flex: 1 + min-height: 0 means the block is bounded by the flex container)
    return block.scrollHeight > block.clientHeight + 1;
  }

  function fitAll() {
    document.querySelectorAll('.text-block').forEach(function(block) {
      var container = block.parentElement;
      var ps = block.querySelectorAll('p');
      if (!ps.length) return;

      var size = BASE_FONT, lh = MAX_LH, mb = MAX_MB, pad = MAX_PAD;

      function applyStyle() {
        container.style.paddingTop = pad + 'px';
        container.style.paddingBottom = pad + 'px';
        ps.forEach(function(p) {
          p.style.fontSize = size + 'px';
          p.style.lineHeight = lh.toFixed(2);
          p.style.marginBottom = mb.toFixed(2) + 'em';
        });
      }

      applyStyle();

      // 1. Reduce line-height first (keeps font readable, just tighter)
      while (overflows(block) && lh > MIN_LH) { lh -= LH_STEP; applyStyle(); }
      // 2. Reduce paragraph margins
      while (overflows(block) && mb > MIN_MB) { mb -= MB_STEP; applyStyle(); }
      // 3. Reduce container padding
      while (overflows(block) && pad > MIN_PAD) { pad -= PAD_STEP; applyStyle(); }
      // 4. Last resort: reduce font size
      while (overflows(block) && size > MIN_FONT) { size -= FONT_STEP; applyStyle(); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fitAll);
  else fitAll();
  window.addEventListener('beforeprint', fitAll);
  window.addEventListener('resize', fitAll);
})();

// ── Word Search ──
(function() {
  var input = document.getElementById('searchInput');
  var countEl = document.getElementById('matchCount');
  if (!input) return;

  var matchGroups = [];
  var currentMatchIdx = -1;

  function clearSearch() {
    document.querySelectorAll('.search-match, .search-current').forEach(function(el) {
      el.classList.remove('search-match', 'search-current');
    });
    countEl.textContent = '';
    matchGroups = [];
    currentMatchIdx = -1;
  }

  function scrollToMatch(idx) {
    if (idx < 0 || idx >= matchGroups.length) return;
    document.querySelectorAll('.search-current').forEach(function(el) {
      el.classList.remove('search-current');
    });
    currentMatchIdx = idx;
    var group = matchGroups[idx];
    group.forEach(function(span) { span.classList.add('search-current'); });
    var spread = group[0].closest('.spread');
    if (spread) spread.scrollIntoView({ behavior: 'smooth', block: 'center' });
    countEl.textContent = (idx + 1) + ' / ' + matchGroups.length;
  }

  function doSearch() {
    clearSearch();
    var query = input.value.trim();
    if (query.length < 2) return;

    var queryWords = query.toLowerCase().split(/\\s+/);
    var kWords = Array.from(document.querySelectorAll('.k-word'));

    if (kWords.length > 0 && queryWords.length > 1) {
      for (var i = 0; i <= kWords.length - queryWords.length; i++) {
        var match = true;
        for (var j = 0; j < queryWords.length; j++) {
          var spanText = kWords[i + j].textContent.toLowerCase().replace(/[^a-z0-9']/g, '');
          if (spanText !== queryWords[j].replace(/[^a-z0-9']/g, '')) { match = false; break; }
        }
        if (match) {
          var group = [];
          for (var j = 0; j < queryWords.length; j++) {
            kWords[i + j].classList.add('search-match');
            group.push(kWords[i + j]);
          }
          matchGroups.push(group);
        }
      }
    } else if (kWords.length > 0) {
      var q = queryWords[0].replace(/[^a-z0-9']/g, '');
      kWords.forEach(function(span) {
        var spanText = span.textContent.toLowerCase().replace(/[^a-z0-9']/g, '');
        if (spanText === q || spanText.indexOf(q) >= 0) {
          span.classList.add('search-match');
          matchGroups.push([span]);
        }
      });
    }

    if (matchGroups.length > 0) scrollToMatch(0);
    else countEl.textContent = 'no matches';
  }

  var debounceTimer;
  input.addEventListener('input', function() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(doSearch, 300);
  });

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') { input.value = ''; clearSearch(); input.blur(); }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (matchGroups.length === 0) { doSearch(); return; }
      var next = e.shiftKey ? currentMatchIdx - 1 : currentMatchIdx + 1;
      if (next >= matchGroups.length) next = 0;
      if (next < 0) next = matchGroups.length - 1;
      scrollToMatch(next);
    }
  });

  // Ctrl+F opens in-app search
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      input.focus();
      input.select();
    }
  });
})();

// ── Image Zoom (single-click on main image) ──
(function() {
  var overlay = document.getElementById('zoomOverlay');
  var zoomImg = document.getElementById('zoomImg');

  document.addEventListener('click', function(e) {
    // Only zoom on main illustration images, not filmstrip thumbs
    var img = e.target.closest('.ill-main img, .cover-image img');
    if (!img) return;
    // Don't zoom if clicking a karaoke word
    if (e.target.closest('.k-word')) return;
    zoomImg.src = img.src;
    overlay.classList.add('active');
  });

  overlay.addEventListener('click', function() {
    overlay.classList.remove('active');
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && overlay.classList.contains('active')) {
      overlay.classList.remove('active');
    }
  });
})();

// ── Image Metadata (double-click) ──
(function() {
  var metaOverlay = document.getElementById('metadataOverlay');
  var metaImg = document.getElementById('metaImg');
  var metaInfo = document.getElementById('metaInfo');
  var metaClose = document.getElementById('metaClose');
  if (!metaOverlay) return;

  function showMeta(url, description) {
    metaImg.src = url;
    metaInfo.textContent = description || '(no description)';
    metaOverlay.classList.add('active');
  }

  // Double-click on main images or filmstrip thumbs shows metadata
  document.addEventListener('dblclick', function(e) {
    var thumb = e.target.closest('.filmstrip-thumb');
    if (thumb) {
      showMeta(thumb.dataset.url, thumb.dataset.description);
      return;
    }
    var img = e.target.closest('.ill-main img');
    if (img) {
      var spread = img.closest('.spread');
      var localPage = img.closest('[data-local-page]');
      var lp = localPage ? parseInt(localPage.dataset.localPage) : 0;
      var chIlls = [];
      try { chIlls = JSON.parse(spread.dataset.chIlls || '[]'); } catch(ex) {}
      var match = chIlls.find(function(ill) { return ill.page === lp; });
      showMeta(img.src, match ? match.description : '');
      return;
    }
  });

  metaClose.addEventListener('click', function() {
    metaOverlay.classList.remove('active');
  });
  metaOverlay.addEventListener('click', function(e) {
    if (e.target === metaOverlay) metaOverlay.classList.remove('active');
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && metaOverlay.classList.contains('active')) {
      metaOverlay.classList.remove('active');
    }
  });
})();

// ── Aa Case Toggle ──
(function() {
  var btn = document.getElementById('caseToggle');
  if (!btn) return;
  var isUpper = false;

  btn.addEventListener('click', function() {
    isUpper = !isUpper;
    btn.textContent = isUpper ? 'Aa' : 'AA';
    document.querySelectorAll('.text-block p').forEach(function(p) {
      p.style.textTransform = isUpper ? 'uppercase' : 'none';
      p.style.fontWeight = isUpper ? '700' : '400';
      p.style.letterSpacing = isUpper ? '0.3px' : '0';
    });
  });
})();

// ── Fullscreen toggle ──
(function() {
  var fsBtn = document.getElementById('fullscreenBtn');
  if (!fsBtn) return;
  fsBtn.addEventListener('click', function() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(function() {});
      fsBtn.textContent = '\\u2715 Exit FS';
    } else {
      document.exitFullscreen();
      fsBtn.textContent = '\\u26f6 Fullscreen';
    }
  });
  document.addEventListener('fullscreenchange', function() {
    if (!document.fullscreenElement) fsBtn.textContent = '\\u26f6 Fullscreen';
  });
})();

// ── Unified Karaoke Audio Player ──
(function() {
  if (!AUDIO_DATA || !AUDIO_DATA.url) {
    var playBtn = document.getElementById('playBtn');
    if (playBtn) playBtn.style.display = 'none';
    return;
  }

  var audio = document.createElement('audio');
  audio.preload = 'auto';
  // If on localhost, use local audio path for instant loading (no R2 dependency)
  // Otherwise use the R2 CDN URL
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    // Extract relative path: the audio file lives under the same directory tree as the book
    var localPath = '/audio/librivox/wonderland-complete.mp3';
    audio.src = localPath;
    // If local fails, fall back to R2
    audio.addEventListener('error', function fallbackToR2() {
      audio.removeEventListener('error', fallbackToR2);
      console.log('Local audio not found, falling back to R2 CDN');
      audio.src = AUDIO_DATA.url;
    }, { once: false });
  } else {
    audio.src = AUDIO_DATA.url;
  }
  document.body.appendChild(audio);

  var playBtn = document.getElementById('playBtn');
  var timeEl = document.getElementById('audioTime');
  var progEl = document.getElementById('progressBar');
  var progressTrack = document.getElementById('progressTrack');
  var isPlaying = false;
  var totalDuration = AUDIO_DATA.totalDuration || 0;
  var chapters = AUDIO_DATA.chapters || [];

  // ── Collect pre-baked karaoke word spans ──
  // k-word spans are embedded in the HTML at generation time (no tree walker needed)
  var allPrebaked = document.querySelectorAll('.k-word[data-start]');
  var allKWords = [];
  var allStarts = [];
  var allEnds = [];

  for (var i = 0; i < allPrebaked.length; i++) {
    var el = allPrebaked[i];
    // Skip preface poem words (they use separate audio)
    // Use closest() to catch ALL preface-spread elements (there are multiple)
    if (el.closest('.preface-spread')) continue;
    var s = parseFloat(el.dataset.start);
    var e = parseFloat(el.dataset.end);
    if (isNaN(s)) continue;
    allKWords.push(el);
    allStarts.push(s);
    allEnds.push(e);
  }

  console.log('Karaoke: ' + allKWords.length + ' pre-baked words, unified audio (' + (totalDuration / 60).toFixed(0) + ' min)');

  // ── Helpers ──
  function getChapterAt(t) {
    for (var i = chapters.length - 1; i >= 0; i--) {
      if (t >= chapters[i].offset) return i;
    }
    return 0;
  }

  function formatTime(s) {
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function updateProgressDisplay(t) {
    var dur = audio.duration || totalDuration;
    if (dur > 0) {
      progEl.style.width = ((t / dur) * 100) + '%';
      var ci = getChapterAt(t);
      var localTime = t - chapters[ci].offset;
      timeEl.textContent = 'Ch' + chapters[ci].chapter + ' ' + formatTime(localTime) + ' \\u2014 ' + formatTime(t) + '/' + formatTime(dur);
    }
  }

  function togglePlayPause() {
    if (isPlaying) {
      audio.pause();
      isPlaying = false;
      playBtn.innerHTML = '\\u25b6 Play';
      playBtn.classList.remove('active');
    } else {
      // Pause poem if playing
      try {
        var poemHint = document.getElementById('poemPlayHint');
        if (poemHint && poemHint.classList.contains('playing')) poemHint.click();
      } catch(ex) {}
      audio.play();
      isPlaying = true;
      playBtn.innerHTML = '\\u25ae\\u25ae Pause';
      playBtn.classList.add('active');
    }
  }

  playBtn.addEventListener('click', togglePlayPause);

  // ── Keyboard: Space = play/pause ──
  document.addEventListener('keydown', function(e) {
    if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT') {
      e.preventDefault();
      togglePlayPause();
    }
  });

  // ── Click-to-seek on any word ──
  document.addEventListener('click', function(e) {
    var wordEl = e.target.closest('.k-word');
    if (!wordEl) return;
    if (wordEl.closest('.preface-spread')) return;
    if (document.querySelector('.zoom-overlay.active')) return;

    var targetStart = parseFloat(wordEl.dataset.start);
    if (isNaN(targetStart)) return;

    // Visual feedback immediately
    wordEl.style.background = 'rgba(184, 144, 96, 0.3)';
    wordEl.style.borderRadius = '3px';
    setTimeout(function() { wordEl.style.background = ''; wordEl.style.borderRadius = ''; }, 800);

    // If audio is loaded, seek immediately
    if (audio.readyState >= 1) {
      audio.currentTime = targetStart;
      updateProgressDisplay(targetStart);
      if (!isPlaying) togglePlayPause();
    } else {
      // Audio not ready — queue seek until loaded
      console.log('Audio loading... will seek to ' + targetStart.toFixed(1) + 's when ready');
      playBtn.innerHTML = '\\u23f3 Loading...';
      audio.addEventListener('loadedmetadata', function onReady() {
        audio.removeEventListener('loadedmetadata', onReady);
        audio.currentTime = targetStart;
        updateProgressDisplay(targetStart);
        if (!isPlaying) togglePlayPause();
        console.log('Audio ready, seeking to ' + targetStart.toFixed(1) + 's');
      });
      // Trigger load in case it hasn't started
      audio.load();
    }
  });

  // ── Audio ended ──
  audio.addEventListener('ended', function() {
    for (var i = 0; i < allKWords.length; i++) {
      allKWords[i].classList.add('k-spoken');
      allKWords[i].classList.remove('k-active', 'k-near');
    }
    isPlaying = false;
    playBtn.innerHTML = '\\u25b6 Play';
    playBtn.classList.remove('active');
    scrollToId('the-end');
  });

  // ── Karaoke Update Loop ──
  var NEAR_RANGE = 8;
  var lastActiveIdx = -1;
  var lastScrollPage = -1;
  var lastUpdateTime = 0;

  function findWordAt(t) {
    var lo = 0, hi = allStarts.length - 1;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      if (t < allStarts[mid]) hi = mid - 1;
      else if (t > allEnds[mid] + 0.3) lo = mid + 1;
      else return mid;
    }
    if (lo < allStarts.length && t < allStarts[lo]) return lo;
    return lo > 0 ? lo - 1 : 0;
  }

  function updateKaraoke() {
    if (!isPlaying) return;
    var t = audio.currentTime;

    updateProgressDisplay(t);

    if (allStarts.length === 0 || t < allStarts[0] - 0.1) {
      requestAnimationFrame(updateKaraoke);
      return;
    }

    var idx = findWordAt(t);

    if (idx !== lastActiveIdx) {
      if (lastActiveIdx >= 0) {
        var clearFrom = Math.max(0, lastActiveIdx - NEAR_RANGE - 1);
        var clearTo = Math.min(allKWords.length - 1, lastActiveIdx + NEAR_RANGE + 1);
        for (var c = clearFrom; c <= clearTo; c++) {
          allKWords[c].classList.remove('k-active', 'k-near');
        }
      }

      if (lastActiveIdx >= 0 && lastActiveIdx < idx) {
        for (var s = lastActiveIdx; s < idx; s++) {
          allKWords[s].classList.add('k-spoken');
          allKWords[s].classList.remove('k-active', 'k-near');
        }
      }

      allKWords[idx].classList.add('k-active');
      allKWords[idx].classList.remove('k-spoken', 'k-near');

      for (var n = 1; n <= NEAR_RANGE; n++) {
        var ni = idx + n;
        if (ni < allKWords.length) {
          allKWords[ni].classList.add('k-near');
          allKWords[ni].classList.remove('k-spoken', 'k-active');
        }
      }

      lastActiveIdx = idx;

      var pageEl = allKWords[idx].closest('[data-page]');
      var pageNum = pageEl ? pageEl.getAttribute('data-page') : '';
      if (pageNum !== lastScrollPage) {
        lastScrollPage = pageNum;
        if (pageEl) {
          var spread = pageEl.closest('.spread');
          if (spread) spread.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }

    requestAnimationFrame(updateKaraoke);
  }

  audio.addEventListener('play', function() {
    lastUpdateTime = 0;
    requestAnimationFrame(updateKaraoke);
  });

  // ── Click progress bar to seek ──
  progressTrack.addEventListener('click', function(e) {
    var rect = progressTrack.getBoundingClientRect();
    var pct = (e.clientX - rect.left) / rect.width;
    var dur = audio.duration || totalDuration;
    if (dur <= 0) return;
    audio.currentTime = pct * dur;
    updateProgressDisplay(pct * dur);
    lastUpdateTime = 0;
    if (isPlaying) requestAnimationFrame(updateKaraoke);
  });

  // ── Handle seek — reset highlights ──
  audio.addEventListener('seeked', function() {
    var t = audio.currentTime;
    for (var i = 0; i < allKWords.length; i++) {
      allKWords[i].classList.remove('k-active', 'k-spoken', 'k-near');
    }
    if (allStarts.length > 0 && t >= allStarts[0]) {
      var seekIdx = findWordAt(t);
      for (var i = 0; i < seekIdx; i++) {
        allKWords[i].classList.add('k-spoken');
      }
    }
    lastActiveIdx = -1;
    lastScrollPage = -1;
    lastUpdateTime = 0;
    if (isPlaying) requestAnimationFrame(updateKaraoke);
  });

  // Safety net
  setInterval(function() {
    if (isPlaying && !audio.paused) {
      lastUpdateTime = 0;
      requestAnimationFrame(updateKaraoke);
    }
  }, 2000);

  // Speed control
  var speedCtrl = document.getElementById('speedCtrl');
  if (speedCtrl) {
    speedCtrl.addEventListener('change', function() {
      audio.playbackRate = parseFloat(speedCtrl.value);
    });
  }
})();

// ── Edit Mode + Illustration Carousel ──
(function() {
  if (!GITHUB_CONFIG) return;

  var editMode = false;
  var token = localStorage.getItem('rksc_github_token');
  var repoOwner = GITHUB_CONFIG.owner || '';
  var repoName = GITHUB_CONFIG.repo || '';
  var bookPath = GITHUB_CONFIG.bookPath || '';
  var csvSha = null;
  var pendingChanges = {};
  var editToggle = document.getElementById('editToggle');
  var editIndicator = document.getElementById('editIndicator');
  var editModal = document.getElementById('editModal');
  var saveFlash = document.getElementById('saveFlash');

  if (!editToggle) return;

  function setEditMode(on) {
    editMode = on;
    document.body.classList.toggle('edit-mode', on);
    editToggle.innerHTML = on ? '\\u270f\\ufe0f Editing' : '\\ud83d\\udd12 Edit';
    editToggle.classList.toggle('active', on);
    if (editIndicator) {
      editIndicator.textContent = on ? 'EDIT MODE' : '';
    }
  }

  // Show modal for token input
  function showModal() {
    if (!editModal) return;
    var tokenInput = document.getElementById('ghTokenInput');
    var ownerInput = document.getElementById('ghOwnerInput');
    var repoInput = document.getElementById('ghRepoInput');
    if (token) tokenInput.value = token;
    if (repoOwner) ownerInput.value = repoOwner;
    if (repoName) repoInput.value = repoName;
    editModal.classList.add('active');
  }

  function hideModal() {
    if (editModal) editModal.classList.remove('active');
  }

  editToggle.addEventListener('click', function() {
    if (editMode) {
      setEditMode(false);
      return;
    }
    if (!token) {
      showModal();
    } else {
      setEditMode(true);
    }
  });

  // Modal save/cancel
  var ghSaveBtn = document.getElementById('ghSaveBtn');
  var ghCancelBtn = document.getElementById('ghCancelBtn');
  if (ghSaveBtn) {
    ghSaveBtn.addEventListener('click', function() {
      var t = document.getElementById('ghTokenInput').value.trim();
      var o = document.getElementById('ghOwnerInput').value.trim();
      var r = document.getElementById('ghRepoInput').value.trim();
      if (!t) { alert('Token is required'); return; }
      token = t;
      repoOwner = o || repoOwner;
      repoName = r || repoName;
      localStorage.setItem('rksc_github_token', token);
      hideModal();
      setEditMode(true);
    });
  }
  if (ghCancelBtn) {
    ghCancelBtn.addEventListener('click', hideModal);
  }

  // ── Token help popup ──
  var tokenHelpIcon = document.getElementById('tokenHelpIcon');
  var tokenHelpPopup = document.getElementById('tokenHelpPopup');
  var tokenHelpClose = document.getElementById('tokenHelpClose');
  if (tokenHelpIcon && tokenHelpPopup) {
    tokenHelpIcon.addEventListener('click', function(e) {
      e.stopPropagation();
      tokenHelpPopup.classList.toggle('active');
    });
  }
  if (tokenHelpClose && tokenHelpPopup) {
    tokenHelpClose.addEventListener('click', function() {
      tokenHelpPopup.classList.remove('active');
    });
  }

  // ── Filmstrip: trap scroll events so page doesn't scroll ──
  document.querySelectorAll('.filmstrip').forEach(function(fs) {
    fs.addEventListener('wheel', function(e) {
      var maxScroll = fs.scrollHeight - fs.clientHeight;
      if (maxScroll <= 0) return; // nothing to scroll
      // Prevent page scroll when filmstrip reaches top/bottom
      if ((e.deltaY < 0 && fs.scrollTop <= 0) ||
          (e.deltaY > 0 && fs.scrollTop >= maxScroll)) {
        e.preventDefault();
      }
      e.stopPropagation();
    }, { passive: false });
  });

  // ── Filmstrip click: set as primary (edit mode only) ──
  document.addEventListener('click', function(e) {
    if (!editMode) return;
    var thumb = e.target.closest('.filmstrip-thumb');
    if (!thumb) return;
    e.stopPropagation();

    var spread = thumb.closest('.spread');
    if (!spread) return;
    var ch = spread.dataset.ch;
    var pageLeft = spread.querySelector('.page-left');
    var localPage = pageLeft ? pageLeft.dataset.localPage : '1';
    var url = thumb.dataset.url;
    var desc = thumb.dataset.description || '';

    // Update main image
    var mainImg = spread.querySelector('.ill-main img');
    if (mainImg) {
      mainImg.src = url;
      mainImg.alt = desc;
    } else {
      // Convert decorative panel to illustrated
      var decoPanel = spread.querySelector('.decorative-panel');
      if (decoPanel) {
        var illMain = document.createElement('div');
        illMain.className = 'ill-main';
        var img = document.createElement('img');
        img.src = url;
        img.alt = desc;
        img.loading = 'lazy';
        illMain.appendChild(img);
        var ornament = decoPanel.querySelector('.chapter-ornament');
        if (ornament) ornament.style.display = 'none';
        decoPanel.insertBefore(illMain, decoPanel.querySelector('.page-number'));
        decoPanel.classList.remove('decorative-panel');
        spread.classList.remove('text-only');
      }
    }

    // Update caption
    var caption = spread.querySelector('.ill-caption');
    if (desc && !caption) {
      caption = document.createElement('div');
      caption.className = 'ill-caption';
      pageLeft.appendChild(caption);
    }
    if (caption) caption.textContent = desc;

    // Update active state in filmstrip
    var allThumbs = spread.querySelectorAll('.filmstrip-thumb');
    allThumbs.forEach(function(t) { t.classList.remove('active'); });
    thumb.classList.add('active');

    // Track change
    var key = 'ch' + ch + '_p' + localPage;
    pendingChanges[key] = { chapter: parseInt(ch), page: parseInt(localPage), url: url, description: desc };

    console.log('Pending change:', key, url.substring(0, 60) + '...');
  });

  // ── +Add button (edit mode only) ──
  document.addEventListener('click', function(e) {
    if (!editMode) return;
    var addBtn = e.target.closest('.filmstrip-add');
    if (!addBtn) return;
    e.stopPropagation();

    var url = prompt('Image URL:');
    if (!url || !url.trim()) return;
    url = url.trim();
    var desc = prompt('Description (optional):') || '';

    var spread = addBtn.closest('.spread');
    if (!spread) return;
    var ch = spread.dataset.ch;
    var pageLeft = spread.querySelector('.page-left');
    var localPage = pageLeft ? pageLeft.dataset.localPage : '1';

    // Add thumbnail to filmstrip
    var filmstrip = addBtn.parentElement;
    var newThumb = document.createElement('div');
    newThumb.className = 'filmstrip-thumb';
    newThumb.dataset.illChapter = ch;
    newThumb.dataset.illPage = localPage;
    newThumb.dataset.url = url;
    newThumb.dataset.description = desc;
    var img = document.createElement('img');
    img.src = url;
    img.loading = 'lazy';
    newThumb.appendChild(img);
    filmstrip.insertBefore(newThumb, addBtn);

    // Track as pending
    var key = 'ch' + ch + '_p' + localPage + '_add' + Date.now();
    pendingChanges[key] = { chapter: parseInt(ch), page: parseInt(localPage), url: url, description: desc };

    console.log('Added illustration:', url.substring(0, 60) + '...');
  });

  // ── Flash message ──
  function flash(msg) {
    if (!saveFlash) return;
    saveFlash.textContent = msg;
    saveFlash.classList.add('active');
    setTimeout(function() { saveFlash.classList.remove('active'); }, 1500);
  }

  // ── Ctrl+S: Save to GitHub ──
  document.addEventListener('keydown', function(e) {
    if (!editMode) return;
    if (!(e.ctrlKey && e.key === 's')) return;
    e.preventDefault();

    var changeKeys = Object.keys(pendingChanges);
    if (changeKeys.length === 0) {
      flash('No changes to save');
      return;
    }

    if (!token || !repoOwner || !repoName || !bookPath) {
      alert('GitHub config incomplete. Toggle edit mode off and on to reconfigure.');
      return;
    }

    flash('Saving...');

    // 1. Fetch current CSV from GitHub to get SHA
    var apiBase = 'https://api.github.com/repos/' + repoOwner + '/' + repoName + '/contents/';
    var csvApiPath = bookPath + '/illustrations.csv';
    fetch(apiBase + csvApiPath, {
      headers: { 'Authorization': 'token ' + token, 'Accept': 'application/vnd.github.v3+json' }
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      csvSha = data.sha;
      var content = atob(data.content.replace(/\\n/g, ''));
      var lines = content.split('\\n');
      var header = lines[0];
      var rows = [];
      for (var i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        rows.push(lines[i]);
      }

      // Parse existing rows into objects
      var existing = {};
      for (var i = 0; i < rows.length; i++) {
        var cols = rows[i].split(',');
        var ch = cols[0]; var pg = cols[1];
        existing['ch' + ch + '_p' + pg] = rows[i];
      }

      // Apply pending changes
      for (var key in pendingChanges) {
        var c = pendingChanges[key];
        var rowKey = 'ch' + c.chapter + '_p' + c.page;
        var desc = c.description.replace(/"/g, '""');
        if (desc.indexOf(',') >= 0 || desc.indexOf('"') >= 0) desc = '"' + desc + '"';
        existing[rowKey] = c.chapter + ',' + c.page + ',' + c.url + ',' + desc;
      }

      // Rebuild CSV
      var newRows = Object.values(existing);
      newRows.sort(function(a, b) {
        var ca = parseInt(a.split(',')[0]); var cb = parseInt(b.split(',')[0]);
        if (ca !== cb) return ca - cb;
        var pa = parseInt(a.split(',')[1]); var pb = parseInt(b.split(',')[1]);
        return pa - pb;
      });
      var newCsv = header + '\\n' + newRows.join('\\n') + '\\n';
      var encoded = btoa(unescape(encodeURIComponent(newCsv)));

      // 2. PUT updated CSV
      return fetch(apiBase + csvApiPath, {
        method: 'PUT',
        headers: {
          'Authorization': 'token ' + token,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Update illustrations via book editor',
          content: encoded,
          sha: csvSha
        })
      });
    })
    .then(function(r) { return r.json(); })
    .then(function(result) {
      if (result.content) {
        pendingChanges = {};
        csvSha = result.content.sha;
        flash('Saved! \\u2714');
        console.log('Saved to GitHub:', result.content.html_url);
      } else {
        flash('Error: ' + (result.message || 'unknown'));
        console.error('GitHub save error:', result);
      }
    })
    .catch(function(err) {
      flash('Error: ' + err.message);
      console.error('Save failed:', err);
    });
  });
})();
`;
}
