# Recursive Kids Stories Club

Public domain classics as illustrated audiobooks — powered by GitHub.

**[Visit the Library](https://playfulprocess.github.io/recursive-kids-stories-club/)**

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
Code is [CC-BY-SA-4.0](https://creativecommons.org/licenses/by-sa/4.0/).

Part of the [recursive.eco](https://recursive.eco) grammar ecosystem.
