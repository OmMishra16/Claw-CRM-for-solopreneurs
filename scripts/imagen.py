#!/usr/bin/env python3
"""
Vendored from the sos-mobile repo (.agents/skills/imagen/imagen.py) so this
repo is self-contained — teammates do not need that checkout. The only change
is where the API key is looked up; see load_api_key().
Generate or edit images using Gemini APIs.

Supports two modes:
  1. Text-to-image (Imagen 4) — generate from a text prompt
  2. Image editing (Gemini Flash) — edit a reference image with a text prompt

Usage:
    # Text-to-image
    python3 imagen.py --prompt "a watercolor fox" --output fox.png

    # With style prefix
    python3 imagen.py --prompt "a cute owl" --style "soft watercolor" --output owl.png

    # Multiple candidates
    python3 imagen.py --prompt "a dragon" --output dragon.png --candidates 3

    # With background removal
    python3 imagen.py --prompt "a cat" --output cat.png --remove-bg

    # Image editing — provide a reference image
    python3 imagen.py --edit ref.png --prompt "change the hat to a crown" --output edited.png

    # Image editing with multiple reference images (e.g. character + outfit)
    python3 imagen.py --edit character.png --edit outfit.png --prompt "put the character in the outfit" --output result.png

    # Image editing with multiple candidates
    python3 imagen.py --edit ref.png --prompt "add sunglasses" --output edited.png --candidates 3

    # Batch mode
    python3 imagen.py --batch batch.json
"""

import argparse
import base64
import json
import os
import sys
import time
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

DEFAULT_IMAGEN_MODEL = "imagen-4.0-generate-001"
DEFAULT_GEMINI_EDIT_MODEL = "gemini-3-pro-image-preview"

# Other valid choices at time of writing:
#   imagen-4.0-generate-001        — quality (sometimes overloaded → 503)
#   imagen-4.0-fast-generate-001   — fast, cheaper, less contended
#   imagen-4.0-ultra-generate-001  — highest quality, low quota


def _imagen_url(model: str) -> str:
    return (
        "https://generativelanguage.googleapis.com/v1beta/"
        f"models/{model}:predict"
    )


def _gemini_url(model: str) -> str:
    return (
        "https://generativelanguage.googleapis.com/v1beta/"
        f"models/{model}:generateContent"
    )


def load_api_key() -> str:
    """Resolve GEMINI_API_KEY without ever touching $HOME.

    Lookup order:
      1. $GEMINI_API_KEY in the current environment.
      2. The repo's .env, located by walking up from this script
         (`.agents/skills/imagen/imagen.py` → repo root). This is the
         shared, team-visible location.
      3. A `.env` in the current working directory (lets the skill
         work when copied standalone into another project).

    Reading from `~/.env` is deliberately not supported: anything
    that lives only in the maintainer's home dir is invisible to
    teammates and CI."""
    key = os.environ.get("GEMINI_API_KEY")
    if key:
        return key

    here = Path(__file__).resolve()
    candidates = []
    # Vendored into this repo at scripts/imagen.py, so the repo root is one
    # level up. Both .env and .env.local are checked — .env.local is where
    # per-machine overrides live and is gitignored the same way.
    repo_root = here.parents[1]
    candidates.append(repo_root / ".env")
    candidates.append(repo_root / ".env.local")
    candidates.append(Path.cwd() / ".env")

    for env_path in candidates:
        if env_path.exists():
            for line in env_path.read_text().splitlines():
                line = line.strip()
                if line.startswith("GEMINI_API_KEY="):
                    return line.split("=", 1)[1].strip().strip("\"'")

    tried = ", ".join(str(p) for p in candidates)
    print(
        f"Error: GEMINI_API_KEY not found in environment or in any of: {tried}",
        file=sys.stderr,
    )
    sys.exit(1)


def generate_image(
    prompt: str,
    api_key: str,
    aspect_ratio: str = "1:1",
    model: str = DEFAULT_IMAGEN_MODEL,
) -> bytes:
    """Call Imagen API and return raw PNG bytes."""
    url = f"{_imagen_url(model)}?key={api_key}"
    payload = json.dumps({
        "instances": [{"prompt": prompt}],
        "parameters": {"sampleCount": 1, "aspectRatio": aspect_ratio},
    }).encode()

    req = Request(url, data=payload, headers={"Content-Type": "application/json"})

    try:
        with urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read())
    except HTTPError as e:
        body = e.read().decode()
        print(f"Error: Imagen API returned {e.code}: {body}", file=sys.stderr)
        sys.exit(1)

    b64 = data["predictions"][0]["bytesBase64Encoded"]
    return base64.b64decode(b64)


MIME_MAP = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
}


def edit_image(
    reference_paths: list[str],
    prompt: str,
    api_key: str,
    temperature: float = 1.0,
    model: str = DEFAULT_GEMINI_EDIT_MODEL,
    aspect_ratio: str | None = None,
    image_size: str | None = None,
) -> bytes:
    """Call a Gemini multimodal model with reference images + prompt; return PNG bytes.

    [reference_paths] may be empty: Gemini image models also do plain
    text-to-image through generateContent, which is the fallback now that
    the Imagen 4 predict endpoint is retired for some keys. [aspect_ratio]
    is forwarded as generationConfig.imageConfig when given."""
    parts = []
    for ref_path in reference_paths or []:
        ref_bytes = Path(ref_path).read_bytes()
        ref_b64 = base64.b64encode(ref_bytes).decode()
        mime_type = MIME_MAP.get(Path(ref_path).suffix.lower(), 'image/png')
        parts.append({"inlineData": {"mimeType": mime_type, "data": ref_b64}})
    parts.append({"text": prompt})

    generation_config: dict = {
        "responseModalities": ["TEXT", "IMAGE"],
        "temperature": temperature,
    }
    image_config: dict = {}
    if aspect_ratio:
        image_config["aspectRatio"] = aspect_ratio
    if image_size:
        # "1K" / "2K" / "4K" on the models that support it (gemini-3-pro-image,
        # gemini-3.1-flash-image); older Gemini image models ignore or reject it.
        image_config["imageSize"] = image_size
    if image_config:
        generation_config["imageConfig"] = image_config

    url = f"{_gemini_url(model)}?key={api_key}"
    payload = json.dumps({
        "contents": [{"parts": parts}],
        "generationConfig": generation_config,
    }).encode()

    req = Request(url, data=payload, headers={"Content-Type": "application/json"})

    try:
        with urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read())
    except HTTPError as e:
        body = e.read().decode()
        print(f"Error: Gemini API returned {e.code}: {body}", file=sys.stderr)
        sys.exit(1)

    # Find the image part in the response
    parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    for part in parts:
        inline = part.get("inlineData", {})
        if inline.get("mimeType", "").startswith("image/"):
            return base64.b64decode(inline["data"])

    # If no image, check for text response (might be a refusal)
    for part in parts:
        if "text" in part:
            print(f"Gemini returned text instead of image: {part['text']}", file=sys.stderr)

    print("Error: Gemini did not return an image", file=sys.stderr)
    sys.exit(1)


def remove_background(image_bytes: bytes) -> bytes:
    """Remove background from image, returning PNG with transparency."""
    from rembg import remove
    return remove(image_bytes)


# ─── Smart transparency pipeline ─────────────────────────────────────
#
# Asking Gemini directly for "transparent background" doesn't work — the
# response format has no alpha channel anyway. Asking for "white
# background" + rembg works for some subjects but mangles anything with
# white tones (teeth, shirts, fur). The reliable path is:
#
#   1. Prompt-engineer Gemini to fill the background with a pure
#      #00FF00 chroma green.
#   2. Generate normally.
#   3. Chroma-key the green to alpha (clean hard matte, single-pixel
#      edge feather, optional green-spill suppression on subject edges).
#   4. Fall back to rembg only if Gemini ignored the chroma instruction.
#   5. Optionally polish with BiRefNet for halo-prone subjects (fur,
#      hair).
#
# Exposed via `--transparent` on the CLI. Keep `--remove-bg` for callers
# that explicitly want the plain rembg path.

_CHROMA_BG_CLAUSE = (
    "Background: solid uniform pure chroma key green (#00FF00) filling "
    "100 percent of the canvas behind the subject. No gradient, no "
    "shadow, no scenery, no second character, no props that touch the "
    "edge of the canvas. The subject must be fully separated from the "
    "edge of the canvas by at least one full subject-width of pure "
    "chroma green so the key-out leaves no halos."
)


def _save_rgba(img: "Image.Image", path: Path) -> None:
    """Save an RGBA PIL image at [path], picking the encoder from
    the file's suffix. PNG and WebP are both lossless-with-alpha
    surfaces here; WebP is the project's preferred shipping format
    because it ships ~30% smaller for the same alpha quality."""
    suffix = path.suffix.lower()
    if suffix == ".webp":
        # quality=95 + method=6 matches the encoding the dialogue
        # manager runs when promoting accepted candidates — keeping
        # the encoder consistent means the on-disk bytes don't
        # change at accept time (no spurious git diffs).
        img.save(path, format="WEBP", quality=95, method=6)
    else:
        img.save(path, format="PNG")


def chroma_key_to_alpha(
    image_path: Path,
    *,
    green_dominance_threshold: int = 35,
    spill_suppression: bool = True,
) -> bool:
    """Replace a #00FF00 chroma-key background with transparent alpha.

    Returns True when the image actually had a chroma background (>= 5%
    of pixels matched), False when it looks like Gemini ignored the
    instruction and the caller should fall back to rembg. Edits the
    file in place; the encoder is chosen by the output extension
    (PNG vs WebP) — both preserve the RGBA channel."""
    from PIL import Image, ImageFilter
    import numpy as np

    img = Image.open(image_path).convert("RGBA")
    arr = np.array(img)
    r = arr[..., 0].astype(np.int16)
    g = arr[..., 1].astype(np.int16)
    b = arr[..., 2].astype(np.int16)

    bg_mask = (
        (g - r > green_dominance_threshold)
        & (g - b > green_dominance_threshold)
        & (g > 100)
    )
    if int(bg_mask.sum()) < bg_mask.size * 0.05:
        return False

    alpha = np.where(bg_mask, 0, 255).astype(np.uint8)
    arr[..., 3] = alpha

    if spill_suppression:
        spill = (alpha > 0) & (g - r > 15) & (g - b > 15)
        clamped_g = np.minimum(
            arr[..., 1],
            ((arr[..., 0] + arr[..., 2]) // 2 + 20).astype(np.uint8),
        )
        arr[..., 1] = np.where(spill, clamped_g, arr[..., 1])

    img_out = Image.fromarray(arr)
    # 1-px alpha feather so the cutout edge doesn't shimmer.
    a = img_out.getchannel("A").filter(ImageFilter.GaussianBlur(radius=0.6))
    img_out.putalpha(a)
    _save_rgba(img_out, image_path)
    return True


def rembg_to_alpha(image_path: Path) -> None:
    """Run rembg in place — used as the fallback when chroma-key fails
    (Gemini gave us a non-green background) and as the plain
    `--remove-bg` mode."""
    from rembg import remove
    from PIL import Image
    import io

    data = image_path.read_bytes()
    cut = remove(data)
    _save_rgba(
        Image.open(io.BytesIO(cut)).convert("RGBA"),
        image_path,
    )


def birefnet_polish(image_path: Path) -> bool:
    """Refine an existing cutout's alpha matte with BiRefNet (via the
    `transparent-background` package). Returns True on success, False
    when the dependency isn't installed. Slow — meant for reviewer
    polish on accepted assets, not every candidate."""
    try:
        from transparent_background import Remover
        from PIL import Image
    except ImportError:
        return False

    remover = Remover()
    img = Image.open(image_path).convert("RGB")
    out = remover.process(img, type="rgba")
    _save_rgba(out, image_path)
    return True


def save_image(
    image_bytes: bytes,
    output_path: str,
    bg_remove: bool = False,
    transparent: bool = False,
) -> str:
    """Save image bytes to disk, creating directories as needed.

    [bg_remove] runs plain rembg. [transparent] runs the smart chroma
    pipeline (chroma key → rembg fallback). Pass at most one — if both
    are set, [transparent] wins.

    The encoder is chosen by the output path's extension:
    `.webp` → WebP, anything else → PNG. The Gemini / Imagen API
    always returns PNG bytes, so when the caller asks for `.webp` we
    decode and re-encode. The bg_remove / transparent steps preserve
    the chosen encoder via [_save_rgba]."""
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    if path.suffix.lower() == ".webp" and not (transparent or bg_remove):
        # No alpha pass to follow — re-encode the PNG bytes as WebP
        # directly. With transparent/bg_remove on, the alpha pass
        # later in this function rewrites the file via _save_rgba
        # which picks the encoder from the extension, so we just
        # need to land the raw bytes first.
        import io
        from PIL import Image as _PILImage
        _save_rgba(_PILImage.open(io.BytesIO(image_bytes)).convert("RGBA"), path)
    else:
        path.write_bytes(image_bytes)

    if transparent:
        print("  Keying chroma background...", flush=True)
        if not chroma_key_to_alpha(path):
            print("  Chroma key low confidence, falling back to rembg.", flush=True)
            rembg_to_alpha(path)
    elif bg_remove:
        print("  Removing background...", flush=True)
        rembg_to_alpha(path)
    return str(path.resolve())


def run_single(
    prompt: str,
    output: str,
    api_key: str,
    candidates: int = 1,
    aspect_ratio: str = "1:1",
    bg_remove: bool = False,
    edit_refs: list[str] | None = None,
    temperature: float = 1.0,
    transparent: bool = False,
    model: str = DEFAULT_IMAGEN_MODEL,
    edit_model: str = DEFAULT_GEMINI_EDIT_MODEL,
    image_size: str | None = None,
) -> list[str]:
    """Generate or edit one or more candidates. Returns list of saved paths.

    When [transparent] is set, the chroma-key clause is appended to the
    prompt before generation and the smart chroma pipeline runs on
    each saved file. See [save_image] / [chroma_key_to_alpha]."""
    if transparent:
        prompt = f"{prompt}\n\n{_CHROMA_BG_CLAUSE}"
    saved = []
    for i in range(candidates):
        if candidates > 1:
            stem = Path(output).stem
            suffix = Path(output).suffix
            out = str(Path(output).parent / f"{stem}-{i + 1}{suffix}")
        else:
            out = output

        print(f"{'Editing' if edit_refs else 'Generating'}: {out}...", flush=True)

        if edit_refs:
            img = edit_image(
                edit_refs, prompt, api_key, temperature=temperature,
                model=edit_model, aspect_ratio=aspect_ratio,
                image_size=image_size,
            )
        elif model.startswith("gemini"):
            # Text-to-image through a Gemini image model (no reference).
            img = edit_image(
                [], prompt, api_key, temperature=temperature,
                model=model, aspect_ratio=aspect_ratio,
                image_size=image_size,
            )
        else:
            img = generate_image(prompt, api_key, aspect_ratio, model=model)

        abs_path = save_image(img, out, bg_remove=bg_remove, transparent=transparent)
        saved.append(abs_path)
        print(f"  Saved: {abs_path}")

        if i < candidates - 1:
            time.sleep(1)

    return saved


def run_batch(
    batch_file: str,
    api_key: str,
    default_model: str = DEFAULT_IMAGEN_MODEL,
    default_edit_model: str = DEFAULT_GEMINI_EDIT_MODEL,
) -> list[str]:
    """Generate/edit images from a JSON batch file. Per-item `model` and
    `editModel` keys override the defaults."""
    with open(batch_file) as f:
        items = json.load(f)

    all_saved = []
    for i, item in enumerate(items):
        prompt = item["prompt"]
        output = item["output"]
        candidates = item.get("candidates", 1)
        aspect_ratio = item.get("aspectRatio", "1:1")
        bg_remove = item.get("removeBg", False)
        transparent = item.get("transparent", False)
        item_model = item.get("model", default_model)
        item_edit_model = item.get("editModel", default_edit_model)
        raw_edit = item.get("edit", None)
        if raw_edit is None:
            edit_refs = None
        elif isinstance(raw_edit, str):
            edit_refs = [raw_edit]
        else:
            edit_refs = list(raw_edit)

        saved = run_single(
            prompt, output, api_key, candidates, aspect_ratio,
            bg_remove, edit_refs, transparent=transparent,
            model=item_model, edit_model=item_edit_model,
        )
        all_saved.extend(saved)

        if i < len(items) - 1:
            time.sleep(1)

    return all_saved


def main():
    parser = argparse.ArgumentParser(description="Generate or edit images via Gemini APIs")
    parser.add_argument("--prompt", help="Text prompt")
    parser.add_argument("--edit", metavar="IMAGE", action="append", help="Reference image path for editing (uses Gemini Flash instead of Imagen). Repeat to send multiple reference images.")
    parser.add_argument("--style", help="Style prefix to prepend to prompt")
    parser.add_argument("--output", "-o", help="Output file path")
    parser.add_argument("--candidates", type=int, default=1, help="Number of candidates (default: 1)")
    parser.add_argument("--aspect-ratio", default="1:1", help="Aspect ratio for text-to-image (default: 1:1)")
    parser.add_argument("--batch", help="Path to JSON batch file")
    parser.add_argument("--remove-bg", action="store_true", help="Plain rembg pass on the output (requires rembg). Works on any image but mangles white tones (teeth, fur).")
    parser.add_argument("--transparent", action="store_true", help="Smart cutout: prompt Gemini for a #00FF00 chroma fill, then key it to alpha (rembg fallback if Gemini ignored). Better for characters / props than plain --remove-bg.")
    parser.add_argument("--polish-birefnet", metavar="IMG", help="Skip generation, run BiRefNet polish on an existing PNG in place. Refines halos around fur/hair on already-cut-out subjects.")
    parser.add_argument("--no-text", action="store_true", help="Append 'No text or words' to prompt")
    parser.add_argument("--temperature", type=float, default=1.0, help="Sampling temperature for edit mode (default: 1.0). Higher → more variation between candidates with the same prompt.")
    parser.add_argument("--model", default=DEFAULT_IMAGEN_MODEL, help=f"Text-to-image model id (default: {DEFAULT_IMAGEN_MODEL}). Try imagen-4.0-fast-generate-001 if the default returns 503. A gemini-* id (e.g. gemini-3.1-flash-image) routes through generateContent instead, for keys where Imagen 4 has been retired.")
    parser.add_argument("--edit-model", default=DEFAULT_GEMINI_EDIT_MODEL, help=f"Gemini model id for --edit mode (default: {DEFAULT_GEMINI_EDIT_MODEL}).")
    parser.add_argument("--image-size", help="Gemini imageConfig.imageSize for gemini-* routes: 1K, 2K or 4K (default: model default). Ignored by Imagen.")

    args = parser.parse_args()

    if args.polish_birefnet:
        target = Path(args.polish_birefnet)
        if not target.exists():
            parser.error(f"--polish-birefnet target not found: {target}")
        ok = birefnet_polish(target)
        if not ok:
            print(
                "BiRefNet not installed. Run: uv pip install transparent-background",
                file=sys.stderr,
            )
            sys.exit(1)
        print(f"Polished: {target.resolve()}")
        return

    api_key = load_api_key()

    if args.batch:
        saved = run_batch(args.batch, api_key, args.model, args.edit_model)
        print(f"\nBatch complete: {len(saved)} images generated.")
        return

    if not args.output:
        parser.error("--output is required when not using --batch")
    if not args.prompt:
        parser.error("--prompt is required")

    prompt = args.prompt
    if args.style:
        prompt = f"{args.style} {prompt}"
    if args.no_text:
        prompt = f"{prompt} No text or words in the image."

    edit_refs = args.edit if args.edit else None
    saved = run_single(
        prompt, args.output, api_key, args.candidates, args.aspect_ratio,
        args.remove_bg, edit_refs, temperature=args.temperature,
        transparent=args.transparent,
        model=args.model, edit_model=args.edit_model,
        image_size=args.image_size,
    )
    print(f"\nDone: {len(saved)} image(s) {'edited' if edit_refs else 'generated'}.")


if __name__ == "__main__":
    main()
