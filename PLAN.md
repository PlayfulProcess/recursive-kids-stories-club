# Recursive Kids Stories Club — Plan

## What This Is

A single GitHub repo containing multiple illustrated audiobooks from public domain literature. Each book is a self-contained folder with its grammar (text), illustrations (CSV), and audio (karaoke manifests). A GitHub Action auto-generates the HTML books. GitHub Pages serves them.

**No app server. No database. No framework. Just GitHub.**

## Architecture

```
GitHub Repo (THIS REPO)          GPT+ Editor              GitHub Pages
┌─────────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ books/               │     │ "Edit Alice ch3  │     │ Landing page     │
│   alice-in-wonderland│◄────│  illustration"   │     │ with all books   │
│   winnie-the-pooh    │     │                  │     │                  │
│   [future books...]  │     │ Edits go to a    │     │ Each book is a   │
│                      │     │ preview branch   │────►│ full HTML page   │
│ scripts/             │     │ you can review   │     │ with karaoke     │
│ index.html (library) │     └──────────────────┘     └──────────────────┘
└─────────────────────┘
```

## Repo Structure

```
recursive-kids-stories-club/
├── index.html                    ← Library homepage (GitHub Pages root)
├── PLAN.md                       ← This file
├── CONTRIBUTING.md               ← How to fork/edit/contribute
├── package.json                  ← Build scripts
├── scripts/
│   ├── generate-book.mjs         ← Shared book generator (all books use this)
│   ├── generate-whisper-timestamps.mjs  ← Whisper pipeline
│   ├── merge-audio.mjs           ← MP3 merge pipeline
│   └── build-all.sh              ← Build every book at once
├── books/
│   ├── alice-in-wonderland/
│   │   ├── grammar.json          ← Text content (59 items, 12 chapters)
│   │   ├── book.json             ← Config (title, audio URL, cover, etc.)
│   │   ├── illustrations.csv     ← Image map (194 entries, 125 with URLs)
│   │   ├── audio/                ← Karaoke manifest + audio config
│   │   └── booklets/book.html    ← Generated output
│   ├── winnie-the-pooh/
│   │   ├── grammar.json          ← Text content (41 items, 10 chapters)
│   │   ├── book.json             ← Config
│   │   ├── illustrations.csv     ← Blank (ready for your art!)
│   │   └── booklets/book.html    ← Generated output
│   └── [future-book]/
│       ├── grammar.json
│       ├── book.json
│       ├── illustrations.csv
│       └── booklets/book.html
└── .github/workflows/
    └── build-books.yml           ← Auto-rebuild on push
```

## GPT+ Integration

### What the GPT Does
A Custom GPT ("Stories Club Editor") connected via GitHub Actions:

1. **Import books**: Copy grammar.json from recursive.eco-schemas repo
2. **Edit text**: Modify grammar sections, fix typos, add "For Young Readers" content
3. **Swap illustrations**: Update illustrations.csv with new image URLs
4. **Add audio**: Call Whisper API for timestamps, write karaoke manifests
5. **Guide users**: Walk them through forking, GitHub tokens, image uploads

### GPT Edits Go to a Preview Branch

This is KEY to keeping the main book safe while letting the GPT (or users) experiment:

```
main branch          ← Published books (GitHub Pages serves this)
  │
  └── gpt/preview    ← GPT writes all edits here
        │
        └── You review → merge to main when happy
```

**Flow:**
1. User talks to GPT: "Replace chapter 5 illustration with this drawing"
2. GPT creates/updates branch `gpt/preview`
3. GPT commits the change to `gpt/preview`
4. GitHub Action builds the book on that branch
5. User can preview at a deploy-preview URL (or locally)
6. You (or user) merges `gpt/preview` → `main` when satisfied

**Why a branch (not a fork)?**
- Branches are simpler for a GPT to manage (one repo, one token)
- Forks are better for independent users who want their own copy
- The GPT uses branches; humans use forks

### GitHub Token Guide for Users

The GPT will guide users through creating a Personal Access Token:

1. GPT sends link: `https://github.com/settings/tokens/new`
2. Tells user to check "repo" scope
3. User pastes token back to GPT
4. GPT stores it for the session (not permanently)
5. For confused users: GPT asks for screenshots and walks them through step-by-step

**Alternative: "Ask ChatGPT" link**
We can embed a link in the book's UI:
```
https://chatgpt.com/g/g-[GPT_ID]?q=Help+me+set+up+my+GitHub+token+for+the+Stories+Club
```
This pre-fills the GPT conversation with the right context.

## Audio Pipeline via GitHub Actions

### For books WITH existing LibriVox audio:

```yaml
# In .github/workflows/build-books.yml
- name: Download LibriVox chapters
  run: |
    cd books/$BOOK/audio/librivox
    for i in $(seq -w 1 $CHAPTERS); do
      curl -L -o "chapter_${i}.mp3" "$LIBRIVOX_URL_PATTERN"
    done

- name: Whisper timestamps
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
  run: node scripts/generate-whisper-timestamps.mjs --config books/$BOOK/audio/audio-config.json

- name: Merge audio
  run: node scripts/merge-audio.mjs --config books/$BOOK/audio/audio-config.json

- name: Generate book
  run: node scripts/generate-book.mjs books/$BOOK/book.json
```

### Cost per book:
- Whisper API: ~$0.30–0.80 depending on length
- GitHub Actions: free (public repo)
- GitHub Pages: free
- Total: **under $1 per book**

## Books Pipeline

### Ready Now (grammar exists in schemas repo)
| Book | Chapters | Scenes | Audio? | Illustrations? |
|------|----------|--------|--------|---------------|
| Alice in Wonderland | 12 | 47 | YES (LibriVox) | YES (120+) |
| Winnie-the-Pooh | 10 | 31 | needs LibriVox | needs Shepard PD art |
| Through the Looking-Glass | 12 | 45 | needs LibriVox | YES (77 in schemas) |
| Aesop's Fables | 12 groups | 284 | maybe | needs PD art |

### Easy to Build (grammar in schemas repo, just need book.json)
- Grimm's Fairy Tales
- Celtic Fairy Tales
- Greek Myths for Kids
- Norse Myths for Kids
- Homer for Kids
- West African Tales
- King Arthur for Kids
- Biblical Stories for Kids

### Future (need grammar + audio + illustrations)
- Peter Pan (J. M. Barrie, PD)
- The Jungle Book (Kipling, PD)
- Just So Stories (Kipling, PD)
- Wind in the Willows (Kenneth Grahame, PD)
- The Secret Garden (Frances Hodgson Burnett, PD)
- Anne of Green Gables (L. M. Montgomery, PD)
- Treasure Island (Stevenson, PD)

## Homepage (index.html)

The root `index.html` is the library landing page:
- Dark theme, card grid showing each book
- Cover image, title, author, stats (chapters, illustrations, audio)
- "Read the Book" → links to `books/{slug}/booklets/book.html`
- "Source Files" → links to GitHub folder
- "Fork & Customize" → GitHub fork button
- "Coming Soon" section for planned books

### Updating the homepage
When a new book is added, update `index.html` with a new card. Could be automated later with a manifest.json → homepage generator.

## Workshop Plan (Palo Alto Library)

### Session 1: "Make Alice Yours" (1.5 hours)
1. Fork the repo (15 min — with GPT help link for stuck people)
2. Draw an illustration for your favorite scene (30 min)
3. Upload drawing, update illustrations.csv (15 min)
4. Push and see your book live (15 min)
5. Share your version with the group (15 min)

### Session 2: "Record Your Own Audiobook" (1.5 hours)
1. Pick a chapter to read aloud (5 min)
2. Record on phone → upload MP3 (10 min)
3. Run Whisper + merge pipeline (with GPT assistance) (30 min)
4. See karaoke sync with your voice (15 min)
5. Group listening party (30 min)

### Session 3: "Build a New Book" (2 hours)
1. Pick a public domain text (Gutenberg) (10 min)
2. Build grammar.json with GPT help (40 min)
3. Create illustrations.csv with drawings (30 min)
4. Generate and publish the book (20 min)
5. Add it to the library homepage (20 min)

## Course Structure (recursive.eco integration)

Eventually, a course page on recursive.eco that teaches:
1. **What is a grammar?** (The protocol behind the books)
2. **GitHub for creators** (Fork, edit, push — no command line)
3. **Vibe coding** (Use ChatGPT/Claude to build things)
4. **Digital ownership** (Your fork = your data, forever)

This could itself be a grammar! A "course grammar" with:
- L1 = individual lessons
- L2 = modules (Getting Started, Making Art, Recording Audio, Publishing)
- L3 = the full course

## Open Questions

1. **Should the GPT manage the preview branch automatically, or should we use GitHub's draft PR system?** Draft PRs would give a nice review UI but add complexity.

2. **Image hosting for user uploads**: GitHub Issues (free, no setup) vs. Cloudflare R2 (better URLs, needs setup). Start with GitHub Issues, migrate later if needed.

3. **Multiple audio tracks per book**: Different readers, different languages. The karaoke manifest format supports this (one manifest per track), but the book.html UI needs a track selector.

4. **Mobile recording**: Can the book.html itself have a "Record" button that captures audio from the phone's microphone? This would be amazing for workshops.

5. **Accessibility**: Screen reader support, high contrast mode, dyslexia-friendly fonts. Should be built into the generator from the start.
