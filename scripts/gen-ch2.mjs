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
const R2_PUBLIC_URL = 'https://pub-71ebbc217e6247ecacb85126a6616699.r2.dev';

// Safer prompt — no mention of child/crying/distress, focus on whimsical scale
const prompt = `A watercolor book illustration inspired by Arthur Rackham and John Tenniel's classic Alice in Wonderland illustrations. The famous scene: a figure in a blue Victorian dress and white pinafore has magically grown to fill an entire room — head pressed against the ceiling, legs folded because the space is too small. A tiny glass table with a golden key sits beside a miniature fifteen-inch door. The figure reaches one elongated arm toward the small door. The proportions are comically exaggerated and whimsical — like a giant in a dollhouse. Tears have pooled into a small puddle on the stone floor. Soft watercolor washes over delicate pen linework. Warm sepia, sky blue, and gold tones. A charming, fantastical fairy-tale mood. Absolutely no text, no writing, no words, no letters anywhere in the image.`;

async function main() {
  console.log('Generating Ch2 p2...');
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size: '1024x1024', quality: 'hd', style: 'natural' }),
  });
  if (!res.ok) { console.error('DALL-E error:', await res.text()); return; }
  const data = await res.json();
  console.log('Revised:', data.data[0].revised_prompt?.substring(0, 150));

  const imgRes = await fetch(data.data[0].url);
  const buffer = Buffer.from(await imgRes.arrayBuffer());
  const r2Key = 'grammar-illustrations/alice-in-wonderland/generated/dall-e-ch2-nine-feet-tall-v4.png';
  console.log(`${(buffer.length/1024).toFixed(0)}KB -> R2: ${r2Key}`);

  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  const s3 = new S3Client({ region: 'auto', endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY } });
  await s3.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: r2Key, Body: buffer, ContentType: 'image/png' }));
  const publicUrl = `${R2_PUBLIC_URL}/${r2Key}`;

  const csvPath = resolve(__dirname, '../books/alice-in-wonderland/illustrations.csv');
  let csv = readFileSync(csvPath, 'utf8');
  const lines = csv.split('\n');
  for (let i = 1; i < lines.length; i++) {
    const parts = []; let field = '', inQ = false;
    for (const c of lines[i]) { if (c === '"') inQ = !inQ; else if (c === ',' && !inQ) { parts.push(field); field = ''; } else field += c; }
    parts.push(field);
    if (parseInt(parts[0]) === 2 && parseInt(parts[1]) === 2 && (parts[2]||'').includes('/generated/dall-e')) {
      parts[2] = publicUrl;
      parts[3] = 'DALL-E 3 (Rackham/Tenniel style) \u2014 Nine feet tall, filling the room';
      lines[i] = parts.map(p => (p.includes(',') || p.includes('"')) ? '"' + p.replace(/"/g, '""') + '"' : p).join(',');
      console.log(`Updated CSV line ${i}`);
      break;
    }
  }
  writeFileSync(csvPath, lines.join('\n'));
  console.log('Done.');
}
main();
