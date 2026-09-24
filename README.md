# Recursive Kids Stories Club

Public domain classics as illustrated audiobooks — powered by GitHub.

**[Visit the Library](https://playfulprocess.github.io/recursive-kids-stories-club/)**

## Work in progress

This is a work in progress, made for families. I published it mainly so the pages could be
served, and it isn't finished. Contributors are welcome, families especially: open an issue or
send a pull request, however small.

The idea behind [recursive.eco](https://recursive.eco) is a hypothesis, not a claim: that we may
need to learn together, children and grown-ups, how to create the conditions for recursive
eco-improvement, rather than race toward recursive self-improvement.

If your work appears here and you'd like it featured differently, removed, or given a shelf of
your own, please write to pp@playfulprocess.com.

## The Books

| Book | Author | Status |
|------|--------|--------|
| [Alice's Adventures in Wonderland](books/alice-in-wonderland/) | Lewis Carroll (1865) | 12 chapters, 125 illustrations, karaoke audio |
| [Winnie-the-Pooh](books/winnie-the-pooh/) | A. A. Milne (1926) | 10 chapters, text only — illustrations welcome! |

## How It Works

Each book is a folder with three files:
- `grammar.json` — the text (chapters, scenes, paragraphs)
- `illustrations.csv` — which image goes on which page
- `book.json` — configuration (title, audio URL, cover)

A shared script (`scripts/generate-book.mjs`) reads these and produces a single self-contained HTML page with karaoke audio highlighting.

## Make It Yours

1. **Fork** this repo
2. **Edit** `books/{book}/illustrations.csv` — swap image URLs with your own drawings
3. **Push** — GitHub Action auto-rebuilds the books
4. **View** at `your-username.github.io/recursive-kids-stories-club/`

### Upload your drawings
- Open an Issue → drag your image into the comment → get a URL → paste into the CSV

## Build Locally

```bash
# Build one book
node scripts/generate-book.mjs books/alice-in-wonderland/book.json

# Build all books
for f in books/*/book.json; do node scripts/generate-book.mjs "$f"; done
```

No dependencies needed — pure Node.js (v18+).

## Add a New Book

1. Create a folder in `books/`
2. Add `grammar.json` (text), `book.json` (config), `illustrations.csv` (images)
3. Run the generator
4. Add a card to `index.html`
5. Push!

See [PLAN.md](PLAN.md) for the full roadmap and [CONTRIBUTING.md](CONTRIBUTING.md) for detailed instructions.

## Credits

All texts are public domain. All illustrations are public domain (pre-1929).
Neither is relicensed here.

## Licence

| What | Licence |
|------|---------|
| Code — `index.html`, `privacy.html`, `scripts/`, `gpt/` (the GPT's schema and prompt), `package.json` | [Apache-2.0](LICENSE) — see [NOTICE](NOTICE) |
| Public-domain texts and illustrations in `books/` | Public domain |
| Other content in `books/` (adaptations, page maps, audio manifests, the audio in `books/a-painful-playful-process-song/`) | Not covered by Apache-2.0. Where a file names a licence (e.g. `books/alice-in-wonderland/grammar-pages.json`: CC-BY-SA-4.0), that applies; otherwise no licence is granted yet |
| The names "recursive.eco" and "Recursive", and the spiral logo | Not licensed — see [TRADEMARKS.md](TRADEMARKS.md) |

The code was CC-BY-SA-4.0 until September 2026; copies taken before then keep that licence.

Part of the [recursive.eco](https://recursive.eco) grammar ecosystem.
