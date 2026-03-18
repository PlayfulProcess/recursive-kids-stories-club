import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../recursive-eco/.env.local') });

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://pub-71ebbc217e6247ecacb85126a6616699.r2.dev';

async function generateImage(prompt) {
  console.log('\n Generating:', prompt.substring(0, 120) + '...');
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size: '1024x1024', quality: 'hd', style: 'natural' }),
  });
  if (!res.ok) { const err = await res.text(); throw new Error(`DALL-E ${res.status}: ${err}`); }
  const data = await res.json();
  console.log('  Revised:', data.data[0].revised_prompt?.substring(0, 150));
  return data.data[0].url;
}

async function uploadToR2(imageUrl, r2Key) {
  const imgRes = await fetch(imageUrl);
  const buffer = Buffer.from(await imgRes.arrayBuffer());
  console.log(`  ${(buffer.length/1024).toFixed(0)}KB -> R2: ${r2Key}`);
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  const s3 = new S3Client({ region: 'auto', endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY } });
  await s3.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: r2Key, Body: buffer, ContentType: 'image/png' }));
  return `${R2_PUBLIC_URL}/${r2Key}`;
}

const tasks = [
  {
    ch: 1, pg: 8,
    r2Key: 'grammar-illustrations/alice-in-wonderland/generated/dall-e-ch1-lovely-garden-v4.png',
    desc: 'DALL-E 3 (Rackham style) \u2014 The loveliest garden, seen through the tiny door',
    prompt: `A watercolor book illustration for "Alice's Adventures in Wonderland" by Lewis Carroll, in the style of Arthur Rackham's 1907 edition. The scene: Alice is kneeling on the floor of a long dark hallway, peering through a tiny door only fifteen inches high. Through that tiny open door, we see the LOVELIEST GARDEN imaginable — bright flowers in every color, sparkling fountains, rose bushes in full bloom, winding paths through emerald grass, butterflies and songbirds in golden sunlight. The garden is radiant and magical, like paradise glimpsed through a keyhole. Alice cannot fit through the door — she can only look longingly at this beautiful world beyond her reach. The contrast between the dark, cramped hallway and the luminous garden is the heart of the image. Rackham's delicate pen-and-ink linework with soft watercolor washes. Warm golds, rose pinks, soft greens for the garden; muted browns for the hallway. Absolutely no text, no writing, no words, no letters anywhere in the image.`,
  },
  {
    ch: 2, pg: 2,
    r2Key: 'grammar-illustrations/alice-in-wonderland/generated/dall-e-ch2-crying-v4.png',
    desc: 'DALL-E 3 (Rackham style) \u2014 Alice grown nine feet tall, weeping by the tiny door',
    prompt: `A watercolor book illustration for "Alice's Adventures in Wonderland" by Lewis Carroll, inspired by the classic illustrations by Arthur Rackham (1907) and John Tenniel (1865). The famous scene from Chapter 2: Alice has drunk from the bottle and grown enormously — nine feet tall — and now sits crumpled on the floor of the tiny hallway, her head nearly touching the ceiling. She is weeping because she is too large to fit through the little door to reach the beautiful garden. Her tears pool on the stone floor around her. She wears a blue dress with a white pinafore, has dark hair with a ribbon — the classic Alice look inspired by the real Alice Liddell. Despite crying, she should look beautiful and sympathetic, not grotesque — a lovely Victorian illustration of a child in distress. Soft watercolor washes, delicate linework, muted warm tones. The mood is poignant and whimsical, not scary. Absolutely no text, no writing, no words, no letters anywhere in the image.`,
  },
];

async function main() {
  const csvPath = resolve(__dirname, '../books/alice-in-wonderland/illustrations.csv');
  let csv = readFileSync(csvPath, 'utf8');

  for (const t of tasks) {
    try {
      const imgUrl = await generateImage(t.prompt);
      const publicUrl = await uploadToR2(imgUrl, t.r2Key);

      const lines = csv.split('\n');
      for (let i = 1; i < lines.length; i++) {
        const parts = []; let field = '', inQ = false;
        for (const c of lines[i]) { if (c === '"') inQ = !inQ; else if (c === ',' && !inQ) { parts.push(field); field = ''; } else field += c; }
        parts.push(field);
        const ch = parseInt(parts[0]), pg = parseInt(parts[1]), url = (parts[2]||'').trim();
        if (ch === t.ch && pg === t.pg && url.includes('/generated/dall-e')) {
          parts[2] = publicUrl;
          parts[3] = t.desc;
          lines[i] = parts.map(p => (p.includes(',') || p.includes('"')) ? '"' + p.replace(/"/g, '""') + '"' : p).join(',');
          console.log(`  Updated CSV line ${i}`);
          break;
        }
      }
      csv = lines.join('\n');
    } catch (err) {
      console.error(`  ERROR Ch${t.ch} p${t.pg}:`, err.message);
    }
  }
  writeFileSync(csvPath, csv);
  console.log('\nDone.');
}
main();
