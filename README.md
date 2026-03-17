# Recursive Kids Stories Club

An illustrated audiobook of **Alice's Adventures in Wonderland** by Lewis Carroll — with karaoke word highlighting, 120+ public domain illustrations from 10+ artists, and a solo LibriVox reading.

**Fork this repo to make it yours.** Swap illustrations with your own drawings. Change the text. Record your own narration. Share your version with friends and family.

## Quick Start

### Just want to read it?

Visit: **[your-username.github.io/recursive-kids-stories-club](https://your-username.github.io/recursive-kids-stories-club/book.html)** (after forking + enabling GitHub Pages)

### Want to customize it?

1. **Fork** this repo (click the Fork button above)
2. **Enable GitHub Pages**: Settings → Pages → Source: "GitHub Actions"
3. **Edit `illustrations.csv`** to swap images (see below)
4. **Push** your changes — the book rebuilds automatically!

## How to Add Your Own Illustrations

The file `illustrations.csv` controls which images appear on each page:

```csv
chapter,page,url,description
1,0,https://example.com/my-drawing.jpg,"chapter cover"
1,1,https://example.com/rabbit.png,"My drawing of the White Rabbit"
```

### Easiest way to upload your drawings:

1. Go to **Issues** in your forked repo
2. Create a new issue
3. **Drag and drop** your drawing into the comment box
4. GitHub gives you a URL like `https://github.com/user-attachments/assets/abc123...`
5. Copy that URL into `illustrations.csv` for the page you want
6. Commit and push — your drawing appears in the book!

### Page numbers

- **Page 0** = chapter cover illustration
- **Pages 1-20** = story pages (roughly in order of the text)
- Leave `url` empty for text-only pages: `1,14,,"text-only"`

## How to Record Your Own Narration

The audio pipeline uses OpenAI Whisper for word-level timestamps. You need:

1. **Record** one MP3 per chapter (or use any public domain recording)
2. **Run Whisper** to get word timestamps: `node scripts/generate-whisper-timestamps.mjs --config audio/audio-config.json`
3. **Merge** into one file: `node scripts/merge-audio.mjs --config audio/audio-config.json`
4. **Upload** the merged MP3 somewhere public (GitHub releases, R2, etc.)
5. **Update** `book.json` with the new audio URL
6. **Rebuild**: `npm run build`

See [audio-config.json](audio/audio-config.json) for the config format.

## Build Locally

```bash
# No dependencies needed! Pure Node.js (v18+)
npm run build

# Open the result
open booklets/book.html
# or on Windows:
start booklets/book.html
```

## File Structure

```
book.json              ← Book config (title, audio URL, cover image)
grammar.json           ← The text content (all 12 chapters, 59 scenes)
illustrations.csv      ← Which image goes on which page (EDIT THIS!)
audio/
  karaoke-manifest.json   ← Word-level timing for audio sync
  audio-config.json       ← Audio pipeline config
  poem-whisper.json       ← Preface poem timing
scripts/
  generate-book.mjs       ← Generates booklets/book.html
booklets/
  book.html               ← Generated output (auto-built, don't edit)
```

## What's Inside

- **12 chapters**, each paginated into spreads
- **120+ illustrations** from public domain artists:
  - Sir John Tenniel (1865) — the originals
  - Arthur Rackham (1907) — art nouveau watercolors
  - Gwynedd Hudson (1922) — rich color plates
  - Lewis Carroll's own manuscript drawings (1864)
  - Alice B. Woodward, William H. Walker, Brinsley Le Fanu, and more
- **Karaoke audio** — words highlight as the narrator reads (LibriVox solo reader, 162 minutes)
- **Preface** — Carroll's dedicatory poem "All in the Golden Afternoon" with its own audio

## For the Club

This repo is part of the **Recursive Kids Stories Club** — a community of families, teachers, and vibe coders who create illustrated audiobooks from public domain literature.

### How to contribute
- **Fork** and customize → share your version
- **Pull request** if you find a better illustration or fix a typo
- **Create a new book** by replacing grammar.json + illustrations.csv with a different story

### Ideas for your fork
- Replace all illustrations with YOUR drawings
- Record yourself reading (bedtime story version!)
- Translate the text into another language
- Add your own "For Young Readers" section to each scene
- Create a theater script version

## Credits

- **Text**: Lewis Carroll, *Alice's Adventures in Wonderland* (1865). Public domain via [Project Gutenberg](https://www.gutenberg.org/ebooks/11).
- **Audio**: LibriVox solo reader recording. Public domain.
- **Illustrations**: Multiple public domain artists (1864-1933). See descriptions in `illustrations.csv`.
- **Grammar system**: [recursive.eco](https://recursive.eco) — every story is a grammar, every grammar is a world.

## License

Content: **Public Domain** (text, audio, illustrations are all pre-1929)
Code: **CC-BY-SA-4.0** (scripts, book generator)
