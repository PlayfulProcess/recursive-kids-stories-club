# Stories Club Editor — Custom GPT

This folder contains the configuration for the **Stories Club Editor** custom GPT.

## Files

| File | Purpose |
|------|---------|
| `system-prompt.md` | GPT Instructions (paste into GPT Builder) |
| `openapi-schema.json` | Action schema for GitHub API calls |

## Deploy Your Own

### 1. Fork the repo
Fork `PlayfulProcess/recursive-kids-stories-club` to your own GitHub account.

### 2. Create a GitHub token
- Go to **GitHub → Settings → Developer Settings → Fine-grained personal access tokens**
- Scope it to your fork (`yourname/recursive-kids-stories-club`)
- Permissions: **Contents: Read and write**
- Copy the token

### 3. Create the GPT
1. Go to [ChatGPT → Create a GPT](https://chat.openai.com/gpts/editor)
2. **Instructions**: Paste the contents of `system-prompt.md`
   - Change `PlayfulProcess` to your GitHub username in the defaults section
3. **Actions**: Upload `openapi-schema.json` as the action schema
   - Authentication: **API Key (Bearer)** → paste your GitHub token
4. **Privacy Policy URL**: `https://yourname.github.io/recursive-kids-stories-club/privacy.html`
   (enable GitHub Pages on your fork first)

### 4. Use it
The GPT will browse your books, generate DALL-E illustrations, and save them to a `gpt/preview` branch on your fork. Say "merge" when you're happy with the results.

---

## NOTE TO SELF: Before Publishing to GPT Store

The current setup uses a **read-write token** for private testing. Before making
this GPT public, you MUST make these changes:

### Security checklist

- [ ] **Switch to a read-only GitHub token** — Create a new fine-grained token
      scoped to `PlayfulProcess/recursive-kids-stories-club` with
      **Contents: Read-only** permission. Replace the current token in the GPT
      Action settings.

- [ ] **Add the read-only guard to the system prompt** — Add this section back
      after the "Defaults" section:

      ```
      ## IMPORTANT: Read-Only Default
      The default token is READ-ONLY on the main repo. You can browse books,
      read text, find missing illustrations, and explain pages — but you
      CANNOT write to PlayfulProcess/recursive-kids-stories-club.

      To generate and save illustrations, users MUST use their own fork:
      1. Tell them: "To save illustrations, fork the repo first, then say:
         use my fork: yourname/recursive-kids-stories-club"
      2. Only attempt writes (PUT, POST) after the user has provided their fork
      3. If a write fails with 403/404, remind them to fork and switch
      ```

- [ ] **Update the On First Message section** — Add step 3:
      `Tell them: "To save illustrations, fork the repo and say
      use my fork: yourname/recursive-kids-stories-club"`

- [ ] **Verify the privacy policy is live** at
      `https://playfulprocess.github.io/recursive-kids-stories-club/privacy.html`

- [ ] **Test with the read-only token** — Confirm browsing works, writes get
      blocked with a helpful fork message, and switching to a fork restores
      full functionality.

### Why this matters
Without a read-only token, any ChatGPT user could write illustrations and CSV
changes to your `gpt/preview` branch. The fork-required workflow keeps the main
repo clean and gives each family their own space.
