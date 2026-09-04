#!/usr/bin/env node
/**
 * generate-pages-grammar.mjs
 *
 * Reads the generated HTML book for Alice in Wonderland and creates a new
 * grammar JSON file where each page/spread from the book is a separate item,
 * with its illustration link and text content.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const bookDir = join(__dirname, '..', 'books', 'alice-in-wonderland');

// ── Read source files ──
const html = readFileSync(join(bookDir, 'booklets', 'book.html'), 'utf8');
const illustrationsRaw = readFileSync(join(bookDir, 'illustrations.csv'), 'utf8');
const existingGrammar = JSON.parse(readFileSync(join(bookDir, 'grammar.json'), 'utf8'));

// ── Chapter names from existing grammar ──
const chapterNames = {};
for (const item of existingGrammar.items) {
  const cn = item.metadata?.chapter_number;
  const name = item.metadata?.chapter_name;
  if (cn && name && !chapterNames[cn]) {
    chapterNames[cn] = name;
  }
}

// ── Parse illustrations.csv into a lookup: { "ch-page": { url, description } } ──
const illLookup = {};
for (const line of illustrationsRaw.split('\n').slice(1)) {
  if (!line.trim()) continue;
  // CSV: chapter,page,url,description
  const match = line.match(/^(\d+),(\d+),(.*?),(".*"|.*)$/);
  if (!match) continue;
  const ch = match[1];
  const page = match[2];
  const url = match[3].trim();
  let desc = match[4].trim();
  if (desc.startsWith('"') && desc.endsWith('"')) desc = desc.slice(1, -1);
  illLookup[`${ch}-${page}`] = { url, description: desc };
}

// ── Extract text from HTML elements (strip tags) ──
function stripHtml(str) {
  return str
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── Split HTML into spreads ──
// Find all spread divs and extract their content
const spreadPositions = [];
const spreadStartRegex = /<div class="spread[^"]*"[^>]*data-spread="([^"]+)"[^>]*>/g;
let m;
while ((m = spreadStartRegex.exec(html)) !== null) {
  spreadPositions.push({ spread: m[1], start: m.index });
}

// For each spread, extract the content until the next spread
const spreads = [];
for (let i = 0; i < spreadPositions.length; i++) {
  const start = spreadPositions[i].start;
  const end = i + 1 < spreadPositions.length ? spreadPositions[i + 1].start : html.length;
  const chunk = html.substring(start, end);
  spreads.push({ id: spreadPositions[i].spread, html: chunk });
}

// ── Process each spread into a grammar item ──
const items = [];
let sortOrder = 0;

for (const spread of spreads) {
  sortOrder++;
  const { id, html: spreadHtml } = spread;

  // Determine chapter number and local page
  const chMatch = spreadHtml.match(/data-ch="(\d+)"/);
  const localPageMatch = spreadHtml.match(/data-local-page="(\d+)"/);
  const ch = chMatch ? parseInt(chMatch[1]) : null;
  const localPage = localPageMatch ? parseInt(localPageMatch[1]) : null;

  // Determine page type
  let pageType = 'content';
  if (id === 'book-cover') pageType = 'cover';
  else if (id.startsWith('preface')) pageType = 'preface';
  else if (id.endsWith('-cover')) pageType = 'chapter-cover';
  else if (/class="spread[^"]*text-only/.test(spreadHtml)) pageType = 'text-only';

  // Extract illustration URL from the left page img
  let imageUrl = '';
  let imageCaption = '';
  const imgMatch = spreadHtml.match(/<img[^>]*src="([^"]+)"[^>]*>/);
  if (imgMatch) imageUrl = imgMatch[1];

  // Extract caption
  const captionMatch = spreadHtml.match(/class="ill-caption"[^>]*>(.*?)<\/div>/s);
  if (captionMatch) imageCaption = stripHtml(captionMatch[1]);

  // Extract text content from the right page
  const rightPageMatch = spreadHtml.match(/class="page-right"[^>]*>([\s\S]*?)(?=<\/div>\s*$)/);
  let textContent = '';

  // For text blocks, extract paragraphs
  const textBlockMatch = spreadHtml.match(/class="text-block"[^>]*>([\s\S]*?)<\/div>\s*<span/);
  if (textBlockMatch) {
    textContent = stripHtml(textBlockMatch[1]);
  } else {
    // Try broader extraction of right page content
    const rightMatch = spreadHtml.match(/page-right[^>]*>([\s\S]*)/);
    if (rightMatch) {
      // Remove page numbers and nested divs markup, keep text
      const rightContent = rightMatch[1];
      // Extract text from paragraphs
      const paragraphs = [];
      const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;
      let pMatch;
      while ((pMatch = pRegex.exec(rightContent)) !== null) {
        paragraphs.push(stripHtml(pMatch[1]));
      }
      if (paragraphs.length) textContent = paragraphs.join('\n\n');
    }
  }

  // For covers, extract title info
  if (pageType === 'cover' || pageType === 'chapter-cover') {
    const titleParts = [];
    // series name
    const seriesMatch = spreadHtml.match(/class="series-name"[^>]*>(.*?)<\//s);
    if (seriesMatch) titleParts.push(stripHtml(seriesMatch[1]));
    // book title
    const bookTitleMatch = spreadHtml.match(/class="book-title"[^>]*>(.*?)<\//s);
    if (bookTitleMatch) titleParts.push(stripHtml(bookTitleMatch[1]));
    // author
    const authorMatch = spreadHtml.match(/class="author-name"[^>]*>(.*?)<\//s);
    if (authorMatch) titleParts.push(stripHtml(authorMatch[1]));
    // chapter title
    const chTitleMatch = spreadHtml.match(/class="chapter-title"[^>]*>(.*?)<\//s);
    if (chTitleMatch) titleParts.push(stripHtml(chTitleMatch[1]));
    // chapter number
    const chNumMatch = spreadHtml.match(/class="chapter-number"[^>]*>(.*?)<\//s);
    if (chNumMatch) titleParts.push(stripHtml(chNumMatch[1]));

    if (titleParts.length && !textContent) {
      textContent = titleParts.join('\n');
    }
  }

  // For preface, extract poem content
  if (pageType === 'preface') {
    const poemLines = [];
    const lineRegex = /class="poem-line"[^>]*>([\s\S]*?)<\/div>/g;
    let lineMatch;
    while ((lineMatch = lineRegex.exec(spreadHtml)) !== null) {
      poemLines.push(stripHtml(lineMatch[1]));
    }
    if (poemLines.length) {
      textContent = poemLines.join('\n');
    }
  }

  // Determine illustration from CSV if we don't have one from HTML
  if (!imageUrl && ch && localPage !== null) {
    const illKey = `${ch}-${localPage}`;
    if (illLookup[illKey] && illLookup[illKey].url) {
      imageUrl = illLookup[illKey].url;
      if (!imageCaption) imageCaption = illLookup[illKey].description;
    }
  }

  // Also try to get description from CSV for chapter covers
  if (pageType === 'chapter-cover') {
    const chNum = id.replace('ch', '').replace('-cover', '');
    const illKey = `${chNum}-0`;
    if (illLookup[illKey]) {
      if (!imageUrl && illLookup[illKey].url) imageUrl = illLookup[illKey].url;
      if (!imageCaption) imageCaption = illLookup[illKey].description;
    }
  }

  // Build item name
  let name;
  const chName = ch ? (chapterNames[ch] || `Chapter ${ch}`) : '';

  if (pageType === 'cover') {
    name = 'Book Cover';
  } else if (pageType === 'preface') {
    const prefaceNum = id.replace('preface-', '');
    name = `Preface — Stanza ${prefaceNum}`;
  } else if (pageType === 'chapter-cover') {
    const chNum = id.replace('ch', '').replace('-cover', '');
    name = `Chapter ${chNum} Cover — ${chapterNames[chNum] || ''}`;
  } else {
    const pageInCh = id.split('-').pop();
    name = `Ch. ${ch}, Page ${pageInCh} — ${chName}`;
  }

  const item = {
    id: id,
    name: name,
    sort_order: sortOrder,
    level: 1,
    category: pageType === 'chapter-cover' ? 'chapter-divider' : pageType,
    sections: {
      "Page Text": textContent || "(illustration only)"
    },
    keywords: [],
    image_url: imageUrl || '',
    metadata: {
      page_type: pageType,
      book_page_number: sortOrder,
      ...(ch ? { chapter_number: ch, chapter_name: chapterNames[ch] || '' } : {}),
      ...(localPage !== null ? { page_in_chapter: localPage } : {}),
      ...(imageCaption ? { illustration_description: imageCaption } : {})
    }
  };

  items.push(item);
}

// ── Build the grammar ──
const grammar = {
  _grammar_commons: {
    schema_version: "1.0",
    license: "CC-BY-SA-4.0",
    license_url: "https://creativecommons.org/licenses/by-sa/4.0/",
    attribution: [
      {
        name: "Lewis Carroll (Charles Lutwidge Dodgson)",
        date: "1865",
        note: "Original author"
      },
      {
        name: "Sir John Tenniel",
        date: "1865",
        note: "Original illustrator"
      },
      {
        name: "PlayfulProcess",
        date: "2025",
        note: "Grammar compilation, illustration curation"
      }
    ]
  },
  name: "Alice's Adventures in Wonderland — Page-by-Page Illustrated Grammar",
  description: "A page-level grammar of Alice's Adventures in Wonderland, where each item corresponds to one page (spread) from the illustrated HTML book. Every page includes its text content and the illustration displayed alongside it. Useful for page-by-page navigation, illustration cataloguing, and granular reading. 187 pages across 12 chapters, with public domain artwork from 10+ illustrators spanning 1864–1933.",
  grammar_type: "custom",
  creator_name: "PlayfulProcess",
  cover_image_url: "https://pub-71ebbc217e6247ecacb85126a6616699.r2.dev/grammar-illustrations/alice-in-wonderland/ch01-the-white-rabbit-appears/gwynedd-hudson-1922.jpg",
  tags: [
    "children",
    "classic",
    "illustrated",
    "page-by-page",
    "public-domain",
    "lewis-carroll",
    "alice",
    "full-text",
    "picture-book"
  ],
  attribution: {
    source_name: "Alice's Adventures in Wonderland",
    source_author: "Lewis Carroll (Charles Lutwidge Dodgson)",
    source_year: "1865",
    license: "Public Domain",
    illustrator: "Sir John Tenniel + 10 public domain illustrators",
    source_url: "https://www.gutenberg.org/ebooks/11",
    note: "Page-level grammar generated from the illustrated HTML book. Each item is one page spread with its paired illustration. Illustrations from Lewis Carroll (1864), Tenniel (1865), Rackham (1907), Gutmann (1933), Hudson (1922), and others."
  },
  items: items
};

// ── Write output ──
const outPath = join(bookDir, 'grammar-pages.json');
writeFileSync(outPath, JSON.stringify(grammar, null, 2) + '\n');
console.log(`Wrote ${items.length} page items to ${outPath}`);
console.log(`Pages by type:`, items.reduce((acc, item) => {
  acc[item.category] = (acc[item.category] || 0) + 1;
  return acc;
}, {}));
console.log(`Pages with illustrations:`, items.filter(i => i.image_url).length);
console.log(`Pages with text:`, items.filter(i => i.sections['Page Text'] !== '(illustration only)').length);
