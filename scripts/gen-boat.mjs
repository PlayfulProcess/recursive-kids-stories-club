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
  console.log('\nGenerating:', prompt.substring(0, 120) + '...');
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size: '1024x1024', quality: 'hd', style: 'natural' }),
  });
  if (!res.ok) { const err = await res.text(); throw new Error(`DALL-E ${res.status}: ${err}`); }
  const data = await res.json();
  console.log('  Revised:', data.data[0].revised_prompt?.substring(0, 180));
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

// Focus entirely on the landscape/boat scene with no people descriptions
const prompt = `A golden afternoon on the River Thames near Oxford, painted in the style of Arthur Rackham's watercolor illustrations from the early 1900s. A small wooden rowing boat drifts on still, mirror-like water reflecting trailing willow branches. The riverbank is lush with wildflowers, reeds, and ancient gnarled trees. Golden late-afternoon sunlight creates long shadows. Dragonflies skim the water, a kingfisher perches on a branch. The boat contains oars and a straw hat left on the seat. The mood is deeply nostalgic and magical — the very moment before a fairy tale begins. Rackham's signature muted palette: amber, sage green, dusty rose, warm gold. Detailed organic linework. Absolutely no text, no words, no writing, no letters anywhere.`;

async function main() {
  try {
    const r2Key = 'grammar-illustrations/alice-in-wonderland/generated/dall-e-golden-afternoon-v4.png';
    const imgUrl = await generateImage(prompt);
    const publicUrl = await uploadToR2(imgUrl, r2Key);

    const csvPath = resolve(__dirname, '../books/alice-in-wonderland/illustrations.csv');
    let csv = readFileSync(csvPath, 'utf8');
    const lines = csv.split('\n');
    for (let i = 1; i < lines.length; i++) {
      const parts = []; let field = '', inQ = false;
      for (const c of lines[i]) { if (c === '"') inQ = !inQ; else if (c === ',' && !inQ) { parts.push(field); field = ''; } else field += c; }
      parts.push(field);
      if (parseInt(parts[0]) === 0 && parseInt(parts[1]) === 0 && ((parts[2]||'').includes('/generated/dall-e') || (parts[4]||'').includes('generate'))) {
        parts[2] = publicUrl;
        parts[3] = 'DALL-E 3 (Rackham style) \u2014 The golden afternoon on the Thames';
        lines[i] = parts.map(p => (p.includes(',') || p.includes('"')) ? '"' + p.replace(/"/g, '""') + '"' : p).join(',');
        console.log(`  Updated CSV line ${i}`);
        break;
      }
    }
    writeFileSync(csvPath, lines.join('\n'));
    console.log('Done.');
  } catch (err) {
    console.error('ERROR:', err.message);
  }
}
main();
