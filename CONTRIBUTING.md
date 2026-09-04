# Contributing to the Kids Stories Club

## For Families & Kids

The easiest way to contribute is to **fork this repo** and make it your own:

1. Click "Fork" on GitHub
2. Edit `illustrations.csv` to swap images with your own drawings
3. Push your changes
4. Enable GitHub Pages (Settings → Pages → Source: "GitHub Actions")
5. Your personalized book appears at `your-username.github.io/recursive-kids-stories-club/book.html`

### Upload your drawings

The simplest way to get a URL for your drawing:

1. Open an Issue in your forked repo
2. Drag your image into the comment box
3. GitHub gives you a permanent URL
4. Paste that URL into `illustrations.csv`

### Share your version

Post your GitHub Pages link in the Discussions tab! We'd love to see your illustrations.

## For Vibe Coders

Want to add a completely new book? Here's how:

1. Fork this repo
2. Replace `grammar.json` with your book's text (follow the grammar format)
3. Replace `illustrations.csv` with your illustrations
4. Update `book.json` with your book's title and config
5. Run `npm run build` to test locally
6. Push — GitHub Pages deploys automatically

### Adding audio

You'll need an OpenAI API key for Whisper ($0.50 per book):

1. Record one MP3 per chapter (or find a LibriVox recording)
2. Edit `audio/audio-config.json` with your file names
3. Run `node scripts/generate-whisper-timestamps.mjs --config audio/audio-config.json`
4. Run `node scripts/merge-audio.mjs --config audio/audio-config.json`
5. Upload the merged MP3 somewhere public
6. Update `book.json` with the audio URL
7. Rebuild: `npm run build`

## For Developers

### Architecture

This is a **static site generator** for illustrated audiobooks:

- `grammar.json` = structured text data (chapters → scenes → paragraphs)
- `illustrations.csv` = image mapping (chapter, page, URL, description)
- `audio/karaoke-manifest.json` = word-level timestamps from Whisper
- `scripts/generate-book.mjs` = generates a single HTML file with everything embedded

The generated `book.html` is fully self-contained — no server needed, no JavaScript frameworks, no build tools beyond Node.js.

### Integration with recursive.eco

This repo can be loaded as a "grammar" in [recursive.eco](https://recursive.eco):

```
https://recursive.eco/book?repo=your-username/recursive-kids-stories-club
```

recursive.eco fetches `book.json` from your repo's raw URL and renders the book. Your GitHub repo IS the data — recursive.eco is just a viewer.

## Code of Conduct

This is a kids-inclusive space. Be kind, be creative, be respectful.
