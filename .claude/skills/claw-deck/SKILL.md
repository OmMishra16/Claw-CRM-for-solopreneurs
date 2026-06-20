---
name: claw-deck
description: Build, edit or iterate on the Claw capstone viva presentation. Use when someone asks to work on the deck, slides, presentation, pptx, or viva — including changing slide content, rewriting speaker notes, swapping screenshots, adding a slide, or regenerating the deck after the report changes. Also use for generating illustrative images for slides.
---

# The viva deck

The deck is **generated, not hand-edited**. Content lives in `scripts/build_deck.py`; the
`.pptx` is an output. Editing the pptx directly means the next rebuild silently discards
your work.

```bash
python3 scripts/build_deck.py     # rebuild from the content spec
```

| File | Role |
|:--|:--|
| `docs/capstone/presentation.pptx` | The blank BITS course template. **Never modify or overwrite.** |
| `docs/capstone/Claw_Capstone_Viva.pptx` | The generated deck. Committed, but always reproducible. |
| `scripts/build_deck.py` | Content + layout. **This is the file you edit.** |
| `scripts/imagen.py` | Gemini image generation, for illustrative slide art. |

## Editing content

Everything is in two structures near the top of `build_deck.py`:

- `TITLE` — the four fields on slide 1.
- `SLIDES` — a dict keyed by slide number. Each entry is
  `(title, [bullets], "speaker notes", [(image_path, kind)])` where `kind` is `"right"`
  (image beside a narrowed body box) or `"below"`.

Change the tuple, re-run the script (~0.3s).

Layout numbers live in `LAYOUT` just above `SLIDES` — bullet sizes, the narrowed body width, and
image position/size for each placement. `TWEAKS` takes per-slide overrides, so one dense slide can
be shrunk without touching the rest:

```python
TWEAKS = {9: {"body_pt": 14}}      # slide 9 only
```

### What this handles well, and what it doesn't

| Change | How |
|:--|:--|
| Reword a bullet, retitle a slide | Edit the tuple |
| Rewrite speaker notes | Edit the tuple |
| Swap or add an image | Change the path in the tuple |
| Shrink text on one dense slide | `TWEAKS` |
| Move or resize an image | `LAYOUT` |
| **Add or remove a slide** | **Not supported.** The template has exactly 10 and the script fills them in place. Adding one means copying a layout — do it deliberately, and check the course still expects 10. |
| **Reorder slides** | Not supported; the template's order is the course's order. |

Only `Title Slide` and `Title and Content` are currently used, though the master carries 11
including `Two Content` and `Picture with Caption` if a new slide ever needs one.

## Rules

- **Content must come from the report**, `docs/capstone/Capstone_Final_Submission.md`. The
  slide-to-section map is in §5.3.3. Do not invent figures — every number on a slide should be
  traceable to a section. If the report and the deck disagree, the report wins.
- **Keep the template's identity.** 4:3, the BITS Pilani Digital watermark (`image3.png` on every
  content slide, `image4.png` on the title), and the brand purple `#9700FF` on slide 1. The
  examiner expects this format.
- **Slide 1 has no placeholders.** It is six free-floating shapes at hardcoded positions,
  addressed by name and vertical offset in `fill_title_slide()`. `slide.placeholders` returns
  nothing for it. Do not "fix" this by rebuilding the slide — the layout is the template's.
- **Watch density.** The 4:3 body box is 9.29 in wide with a 0.27 in right margin. Slides above
  about 90 words start wrapping badly. The build script's verification prints per-slide word
  counts.
- **Speaker notes carry what the slides omit.** The viva marks Q&A separately (5 of 15), so notes
  should hold the reasoning an examiner probes for — design trade-offs, known defects, why
  something was left out — not a script of the bullets.

## Generating images

Only for **illustrative** art. Anything evidential — screens, architecture — uses the real
assets already in `docs/capstone/screenshots/` (17) and `docs/capstone/figures/` (4, with `.svg`
sources that the build script rasterises with `rsvg-convert` for sharpness).

```bash
python3 scripts/imagen.py --prompt "..." --output docs/capstone/deck-assets/name.png \
  --aspect-ratio 4:3 --model gemini-3.1-flash-image
```

- Needs `GEMINI_API_KEY` in the repo's `.env` (gitignored). Without it the script exits with the
  paths it tried.
- **Pass `--model gemini-3.1-flash-image`.** Imagen 4 was retired on some keys in 2026-08; the
  default `imagen-4.0-generate-001` may 404.
- Useful flags: `--candidates 3` to pick from several, `--transparent` for a chroma-keyed cutout,
  `--edit ref.png` to steer from a reference image.

Generated art must not look like evidence. An examiner should never be unsure whether an image
is a screenshot of the real app.

## Checking the result

**There is no local pptx renderer** — no LibreOffice, no PowerPoint on this machine. So:

```bash
open docs/capstone/Claw_Capstone_Viva.pptx     # opens in Keynote
```

and look at every slide. Text overflow is the failure mode the script cannot detect. If automated
checking is wanted, `brew install --cask libreoffice` then
`soffice --headless --convert-to pdf`.

After any rebuild, confirm the template is untouched:

```bash
git status docs/capstone/presentation.pptx     # must be clean
```

## Sequence

The deck presents what the **signed** report says. Issue #21 comes after #20 (supervisor
sign-off). Building it before the report is signed risks presenting content the supervisor then
asks to change.
