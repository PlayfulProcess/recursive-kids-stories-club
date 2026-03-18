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
    r2Key: 'grammar-illustrations/alice-in-wonderland/generated/dall-e-golden-afternoon-boat.png',
    prompt: `A manuscript-style pen and ink drawing with light sepia wash, in the style of Lewis Carroll's own 1864 illustrations for "Alice's Adventures Under Ground." The scene shows a man in Victorian clothing (resembling Charles Dodgson/Lewis Carroll) rowing a small boat on a calm river on a golden summer afternoon. Three young girls sit in the boat — the middle one has dark hair (like the real Alice Liddell). Willows trail in the water, dragonflies hover. The style should be delicate pen strokes with crosshatching, slightly naive and charming like Carroll's original manuscript drawings. Warm sepia tones. No modern elements.`,
    description: 'DALL-E 3 (manuscript style) \u2014 The golden afternoon boat trip where Carroll first told the story',
  },
  {
    chapter: 1,
    page: 8,
    r2Key: 'grammar-illustrations/alice-in-wonderland/generated/dall-e-ch1-dinah-and-bats.png',
    prompt: `A manuscript-style pen and ink drawing with light sepia wash, in the style of Lewis Carroll's own 1864 illustrations for "Alice's Adventures Under Ground." A young girl with dark hair (like the real Alice Liddell, age 10) falls slowly through a deep well shaft. Around her float jars of marmalade and maps. She has a dreamy, curious expression. A cat (Dinah) appears in a thought bubble above her head. Below her, small bats flutter. The walls of the well have bookshelves and cupboards. Delicate pen strokes with crosshatching, slightly naive and charming like Carroll's original manuscript drawings. Warm sepia tones.`,
    description: 'DALL-E 3 (manuscript style) \u2014 Alice falling down the rabbit-hole, thinking of Dinah',
  },
  {
    chapter: 2,
    page: 2,
    r2Key: 'grammar-illustrations/alice-in-wonderland/generated/dall-e-ch2-head-hitting-roof.png',
    prompt: `A manuscript-style pen and ink drawing with light sepia wash, in the style of Lewis Carroll's own 1864 illustrations for "Alice's Adventures Under Ground." A young girl with dark hair (like the real Alice Liddell) has grown enormously tall — her head is pressed against and crumpling into the ceiling of a small hall. She is crouched and bent, one arm reaching down toward a tiny golden key on a glass table far below. Her expression is distressed and uncomfortable. The proportions are exaggerated and whimsical. Delicate pen strokes with crosshatching, slightly naive and charming like Carroll's original manuscript drawings. Warm sepia tones.`,
    description: 'DALL-E 3 (manuscript style) \u2014 Alice grown too tall, head striking the roof',
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

        // Match: same chapter+page, no url, has a note (our instruction)
        if (ch === ill.chapter && pg === ill.page && !url && note) {
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
