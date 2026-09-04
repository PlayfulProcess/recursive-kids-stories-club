import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// Load env from recursive-eco
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../recursive-eco/.env.local') });

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://pub-71ebbc217e6247ecacb85126a6616699.r2.dev';

if (!OPENAI_KEY) { console.error('Missing OPENAI_API_KEY'); process.exit(1); }
if (!R2_ACCESS_KEY) { console.error('Missing R2 credentials'); process.exit(1); }

// ── DALL-E Generation ──

async function generateImage(prompt, size = '1024x1024') {
  console.log('\n🎨 Generating:', prompt.substring(0, 100) + '...');
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size,
      quality: 'hd',
      style: 'natural',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DALL-E error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const imageUrl = data.data[0].url;
  const revisedPrompt = data.data[0].revised_prompt;
  console.log('  Revised prompt:', revisedPrompt?.substring(0, 120));
  return { imageUrl, revisedPrompt };
}

// ── R2 Upload ──

async function uploadToR2(imageUrl, r2Key) {
  console.log('  Downloading image...');
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Failed to download: ${imgRes.status}`);
  const buffer = Buffer.from(await imgRes.arrayBuffer());
  console.log(`  Downloaded ${(buffer.length / 1024).toFixed(0)}KB, uploading to R2: ${r2Key}`);

  // Use S3-compatible API
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY,
      secretAccessKey: R2_SECRET_KEY,
    },
  });

  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: r2Key,
    Body: buffer,
    ContentType: 'image/png',
  }));

  const publicUrl = `${R2_PUBLIC_URL}/${r2Key}`;
  console.log('  Uploaded:', publicUrl);
  return publicUrl;
}

// ── Illustrations to generate ──

const illustrations = [
  {
    chapter: 0,
    page: 0,
    r2Key: 'grammar-illustrations/alice-in-wonderland/generated/dall-e-golden-afternoon-v3.png',
    prompt: `A Pre-Raphaelite watercolor painting in the style of Arthur Rackham's 1907 book illustrations. A wooden rowing boat on a calm river on a golden summer afternoon near Oxford, England, 1862. A thin Victorian gentleman in a dark coat rows the boat. Three passengers in white Victorian summer dresses sit listening to a story. Trailing willow trees, warm late-afternoon sunlight filtering through leaves, dragonflies hovering over water lilies. Muted earth tones — amber, olive, dusty gold — with Rackham's characteristic gnarled organic linework. Atmospheric, dreamy, nostalgic mood. Absolutely no text, no writing, no words, no letters anywhere in the image.`,
    description: 'DALL-E 3 (Rackham style) \u2014 The golden afternoon boat trip, July 4 1862',
  },
  {
    chapter: 1,
    page: 8,
    r2Key: 'grammar-illustrations/alice-in-wonderland/generated/dall-e-ch1-hall-of-doors-v3.png',
    prompt: `A watercolor illustration in the style of Arthur Rackham's 1907 Alice in Wonderland plates. The scene shows a long low hall lit by a row of lamps hanging from the ceiling. A dark-haired girl of about 10 (inspired by Alice Liddell — short dark bob, bangs, large wondering eyes) stands beside a three-legged glass table. On the table sits a tiny golden key. Around the hall are many locked doors of all sizes. The girl gazes at a tiny door, only about fifteen inches high, through which we glimpse the most beautiful garden with bright flowers and cool fountains. The mood is wonder and longing. Rackham's characteristic gnarled linework, muted watercolor washes of amber, olive, and dusty rose. Absolutely no text, no writing, no words anywhere in the image.`,
    description: 'DALL-E 3 (Rackham style) \u2014 The hall of doors and the tiny golden key',
  },
  {
    chapter: 2,
    page: 2,
    r2Key: 'grammar-illustrations/alice-in-wonderland/generated/dall-e-ch2-nine-feet-tall-v3.png',
    prompt: `A watercolor book illustration in the style of classic Victorian fairy tale art, reminiscent of John Tenniel's Alice engravings with added color washes. A dark-haired character in a blue dress has magically grown enormously tall — nine feet — and is crammed into a tiny hallway. The figure's head presses sideways against the low ceiling, body crouched and folded awkwardly because the room is far too small. One comically elongated arm reaches down toward a tiny three-legged glass table with a golden key on it. Near the baseboard, a tiny fifteen-inch door is visible. The proportions are absurd and whimsical — like a giant squeezed into a dollhouse. Soft watercolor washes over delicate crosshatched linework. Warm sepia and blue tones. Absolutely no text, no writing, no words, no letters anywhere in the image.`,
    description: 'DALL-E 3 (Tenniel style) \u2014 Nine feet tall, head striking the roof',
  },
];

// ── Main ──

async function main() {
  const csvPath = resolve(__dirname, '../books/alice-in-wonderland/illustrations.csv');
  let csv = readFileSync(csvPath, 'utf8');

  for (const ill of illustrations) {
    try {
      const { imageUrl } = await generateImage(ill.prompt);
      const publicUrl = await uploadToR2(imageUrl, ill.r2Key);

      // Update CSV — find matching chapter,page with empty url or note-only entry
      const lines = csv.split('\n');
      let found = false;
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        // Simple parse
        const parts = [];
        let field = '', inQ = false;
        for (const c of line) {
          if (c === '"') { inQ = !inQ; }
          else if (c === ',' && !inQ) { parts.push(field); field = ''; }
          else { field += c; }
        }
        parts.push(field);

        const ch = parseInt(parts[0]);
        const pg = parseInt(parts[1]);
        const url = (parts[2] || '').trim();
        const note = (parts[4] || '').trim();

        // Match: same chapter+page, either no url or existing DALL-E url, with a note
        if (ch === ill.chapter && pg === ill.page && (!url || url.includes('/generated/dall-e')) && note) {
          parts[2] = publicUrl;
          parts[3] = ill.description;
          // Keep the note but mark as done
          parts[4] = note;
          lines[i] = parts.map((p, idx) => {
            if (p.includes(',') || p.includes('"')) return '"' + p.replace(/"/g, '""') + '"';
            return p;
          }).join(',');
          found = true;
          console.log(`  Updated CSV line ${i}: Ch${ch} p${pg}`);
          break;
        }
      }

      if (!found) {
        console.log(`  Warning: no matching CSV entry for Ch${ill.chapter} p${ill.page}, appending`);
      }

      csv = lines.join('\n');
    } catch (err) {
      console.error(`  ERROR for Ch${ill.chapter} p${ill.page}:`, err.message);
    }
  }

  writeFileSync(csvPath, csv);
  console.log('\nCSV updated. Run generate-book.mjs to rebuild.');
}

main().catch(console.error);
