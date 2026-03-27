import { readFileSync } from 'fs';
const csv = readFileSync('books/alice-in-wonderland/illustrations.csv', 'utf8');
const lines = csv.split('\n');
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  const parts = [];
  let field = '', inQ = false;
  for (const c of line) {
    if (c === '"') { inQ = !inQ; }
    else if (c === ',' && !inQ) { parts.push(field); field = ''; }
    else { field += c; }
  }
  parts.push(field);
  const note = (parts[4] || '').trim();
  if (note) console.log(`Ch${parts[0]} p${parts[1]}: ${note}`);
}
