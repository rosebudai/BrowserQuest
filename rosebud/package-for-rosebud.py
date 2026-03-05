#!/usr/bin/env python3
"""
Package BrowserQuest client into a zip file compatible with Rosebud's
import_theme_from_zip command (visuals-first template import).

Zip structure rules (matching _zip_import_utils.py):
  - Files under `assets/` top-level directory -> treated as binary assets
    (uploaded to GCS as MediaFile/Asset).
  - Everything else -> treated as UTF-8 text project files
    (stored as GenericFile records in DB).

Binary files (images, audio, fonts) are flattened under assets/ with
directory separators replaced by hyphens:
  img/1/rat.png  -> assets/img-1-rat.png
  audio/music/village.mp3 -> assets/audio-music-village.mp3

This ensures unique stems for Rosebud's import_theme_from_zip rewriter,
which uses Path(filename).stem as the asset name.

manifest.js is rewritten to replace dev paths with flattened assets/ paths.
All paths are complete quoted strings so the rewriter regex can match them:
  "img/1/rat.png" -> "assets/img-1-rat.png"

The rewriter then replaces those with absolute Rosebud URLs:
  "assets/img-1-rat.png" -> "{FRONTEND_URL}/assets/img-1-rat.png?{shortId}"

Usage:
    python package-for-rosebud.py [--dist-dir DIR] [--output FILE]
"""

import argparse
import base64
import os
import re
import sys
import zipfile
from pathlib import Path

# Extensions considered binary -> placed under assets/ in the zip
BINARY_EXTENSIONS = frozenset({
    ".woff2", ".woff", ".ttf", ".otf", ".eot",   # fonts
    ".ogg", ".mp3", ".wav", ".flac", ".aac",      # audio
    ".png", ".jpg", ".jpeg", ".gif", ".webp",     # images
    ".svg", ".ico", ".cur",                           # icons/vector/cursors
    ".mp4", ".webm",                                # video
})

# Text file extensions that may contain asset path references in CSS/HTML
CSS_HTML_EXTENSIONS = frozenset({".html", ".htm", ".css"})

# MIME types for data URI embedding
MIME_TYPES = {
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
    ".ico": "image/x-icon", ".cur": "image/x-icon",
    ".woff2": "font/woff2", ".woff": "font/woff",
    ".ttf": "font/ttf", ".otf": "font/otf",
    ".eot": "application/vnd.ms-fontobject",
    ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav",
    ".mp4": "video/mp4", ".webm": "video/webm",
}

# Directories/files to skip
SKIP_DIRS = frozenset({"node_modules", ".git", "tests"})
SKIP_FILES = frozenset({
    ".DS_Store", "index_original.html", "build.js",
    "README.md", "require-jquery.js", "home.js",
})
SKIP_SUFFIXES = frozenset({".json-dist"})

# Audio fallback formats to exclude from zip (MP3 is primary, OGG is fallback)
SKIP_BINARY_EXTENSIONS = frozenset({".ogg"})


def is_binary_file(file_path: Path) -> bool:
    return file_path.suffix.lower() in BINARY_EXTENSIONS


def is_skipped_binary(file_path: Path) -> bool:
    return file_path.suffix.lower() in SKIP_BINARY_EXTENSIONS


def flatten_path(rel_path: str) -> str:
    """Flatten a relative path into a single filename with hyphens.

    img/1/rat.png -> img-1-rat.png
    audio/sounds/hit1.mp3 -> audio-sounds-hit1.mp3
    """
    return rel_path.replace("/", "-").replace("\\", "-")


def rewrite_manifest(content: str, path_map: dict[str, str], dist_dir: Path) -> str:
    """
    Rewrite manifest.js:
    1. Replace dev paths with flattened assets/ paths
    2. Inline sprite JSON data (eliminates 71 HTTP fetches in Rosebud)

    path_map: { "img/1/rat.png": "assets/img-1-rat.png", ... }
    """
    import json as _json

    result = content

    # Replace binary asset paths with flattened assets/ paths
    for original, flattened in sorted(path_map.items(), key=lambda x: -len(x[0])):
        result = result.replace(f'"{original}"', f'"{flattened}"')
        result = result.replace(f"'{original}'", f"'{flattened}'")

    # Inline sprite JSON data: replace "sprites/foo.json" paths with the
    # actual JSON content so sprites.js doesn't need to fetch them.
    sprite_pattern = re.compile(r'"(sprites/[^"]+\.json)"')
    def inline_sprite(match: re.Match) -> str:
        rel_path = match.group(1)
        fs_path = dist_dir / rel_path
        if fs_path.is_file():
            try:
                data = _json.loads(fs_path.read_text(encoding="utf-8"))
                # Compact JSON, no extra whitespace
                return _json.dumps(data, separators=(",", ":"))
            except Exception:
                pass
        return match.group(0)  # keep original on failure

    result = sprite_pattern.sub(inline_sprite, result)

    return result


def make_data_uri(fs_path: Path) -> str:
    """Read a binary file and return a base64 data URI."""
    mime = MIME_TYPES.get(fs_path.suffix.lower(), "application/octet-stream")
    data = fs_path.read_bytes()
    b64 = base64.b64encode(data).decode("ascii")
    return f"data:{mime};base64,{b64}"


def embed_data_uris(content: str, dist_dir: Path) -> str:
    """
    Replace binary asset references in CSS/HTML with inline data URIs.

    The Rosebud rewriter only processes JS files, so CSS url() and HTML
    src/href references to binary assets must be self-contained.

    Handles CSS patterns like:
      url('../img/2/wood.png')
      url('../fonts/font.eot?#iefix')
      url('../fonts/font.svg#FontName')
    And HTML patterns like:
      src="img/common/spinner.gif"
      href="img/common/favicon.png"
    """
    def resolve_and_embed(raw_path: str) -> str | None:
        """Try to resolve a path to a data URI. Returns None if not a binary asset."""
        # Strip ../ prefixes (CSS files are in css/ subdirectory)
        clean = raw_path
        while clean.startswith("../"):
            clean = clean[3:]
        # Strip query string and fragment
        clean = clean.split("?")[0].split("#")[0]
        fs_path = dist_dir / clean
        if fs_path.is_file() and is_binary_file(fs_path):
            return make_data_uri(fs_path)
        return None

    # CSS: url('path') or url("path") or url(path)
    def replace_css_url(match: re.Match) -> str:
        quote = match.group(1) or ""
        raw_path = match.group(2)
        data_uri = resolve_and_embed(raw_path)
        if data_uri:
            return f"url({quote}{data_uri}{quote})"
        return match.group(0)

    result = re.sub(
        r"""url\(\s*(['"]?)((?:\.\./|[a-zA-Z])[^'"\s)]*?)\1\s*\)""",
        replace_css_url,
        content,
    )

    # HTML: src="path" or href="path" (only for binary asset paths)
    def replace_html_attr(match: re.Match) -> str:
        attr = match.group(1)
        quote = match.group(2)
        raw_path = match.group(3)
        data_uri = resolve_and_embed(raw_path)
        if data_uri:
            return f"{attr}={quote}{data_uri}{quote}"
        return match.group(0)

    result = re.sub(
        r"""(src|href)=(['"])((?:img|fonts)/[^'"]*?)\2""",
        replace_html_attr,
        result,
    )

    return result


def package_dist(dist_dir: Path, output_path: Path) -> None:
    if not dist_dir.is_dir():
        print(f"Error: source directory does not exist: {dist_dir}", file=sys.stderr)
        sys.exit(1)

    # Extra files from project root to include at zip root
    project_root = dist_dir.parent
    EXTRA_ROOT_FILES = ["agents.md"]

    text_files: list[tuple[Path, str]] = []   # (fs_path, zip_path)
    binary_files: list[tuple[Path, str]] = []  # (fs_path, zip_path)
    # Track path changes: original_rel -> flattened assets/ path
    path_rewrites: dict[str, str] = {}

    for root, dirs, files in os.walk(dist_dir):
        # Skip unwanted directories
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]

        for filename in sorted(files):
            if filename in SKIP_FILES:
                continue
            if any(filename.endswith(suffix) for suffix in SKIP_SUFFIXES):
                continue

            fs_path = Path(root) / filename
            rel_path = fs_path.relative_to(dist_dir)
            rel_str = str(rel_path)

            # Skip the output zip itself
            if fs_path.resolve() == output_path.resolve():
                continue

            if is_skipped_binary(fs_path):
                continue

            if is_binary_file(fs_path):
                # Flatten: img/1/rat.png -> assets/img-1-rat.png
                flat_name = flatten_path(rel_str)
                zip_path = f"assets/{flat_name}"
                binary_files.append((fs_path, zip_path))
                path_rewrites[rel_str] = zip_path
            else:
                # Text files keep their relative path
                text_files.append((fs_path, rel_str))

    # Include extra files from project root
    for filename in EXTRA_ROOT_FILES:
        extra_path = project_root / filename
        if extra_path.is_file():
            text_files.append((extra_path, filename))

    total = len(text_files) + len(binary_files)
    if total == 0:
        print(f"Error: no files found in {dist_dir}", file=sys.stderr)
        sys.exit(1)

    # Check for duplicate stems (would cause the rewriter to collide)
    # Font files naturally have multiple formats (.woff, .ttf, .eot) sharing
    # the same stem — these are referenced in CSS, not manifest.js, so they're safe.
    FONT_EXTENSIONS = frozenset({".woff2", ".woff", ".ttf", ".otf", ".eot", ".svg"})
    stems: dict[str, list[str]] = {}
    for _, zip_path in binary_files:
        stem = Path(zip_path).stem
        stems.setdefault(stem, []).append(zip_path)
    dupes = {s: paths for s, paths in stems.items() if len(paths) > 1}
    if dupes:
        # Allow dupes where ALL files are font formats
        real_dupes = {}
        for stem, paths in dupes.items():
            if all(Path(p).suffix.lower() in FONT_EXTENSIONS for p in paths):
                continue  # All fonts — expected
            real_dupes[stem] = paths
        if real_dupes:
            print("ERROR: Duplicate asset stems detected!", file=sys.stderr)
            for stem, paths in sorted(real_dupes.items()):
                print(f"  stem '{stem}': {paths}", file=sys.stderr)
            sys.exit(1)
        else:
            print(f"Note: {len(dupes)} font stem collisions (expected, fonts use CSS not manifest)")

    # Create the zip
    output_path.parent.mkdir(parents=True, exist_ok=True)
    rewrite_count = 0
    manifest_rewritten = False

    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        print(f"Packaging {len(text_files)} text files and {len(binary_files)} binary files...")
        print()

        print("Text files (-> GenericFile records):")
        for fs_path, zip_path in sorted(text_files, key=lambda x: x[1]):
            size = fs_path.stat().st_size

            try:
                content = fs_path.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                print(f"  {zip_path:<60} ({size:>10,} bytes)")
                zf.write(fs_path, zip_path)
                continue

            rewritten = content

            # Manifest gets path rewriting: dev paths -> flattened assets/ paths
            if fs_path.name == "manifest.js" and zip_path.endswith("manifest.js"):
                rewritten = rewrite_manifest(content, path_rewrites, dist_dir)
                if rewritten != content:
                    manifest_rewritten = True
                    rewrite_count += 1
                    print(f"  {zip_path:<60} ({len(rewritten):>10,} bytes) [manifest paths rewritten]")
                    zf.writestr(zip_path, rewritten)
                    continue

            # CSS/HTML: embed binary asset references as data URIs.
            # The Rosebud rewriter only processes JS files, so CSS url()
            # and HTML src/href must be self-contained.
            if fs_path.suffix.lower() in CSS_HTML_EXTENSIONS:
                rewritten = embed_data_uris(content, dist_dir)
                if rewritten != content:
                    rewrite_count += 1
                    orig_size = len(content.encode("utf-8"))
                    new_size = len(rewritten.encode("utf-8"))
                    print(f"  {zip_path:<60} ({new_size:>10,} bytes) [data URIs embedded, was {orig_size:,}]")
                    zf.writestr(zip_path, rewritten)
                    continue

            # All other text files — no rewriting needed
            print(f"  {zip_path:<60} ({size:>10,} bytes)")
            zf.write(fs_path, zip_path)

        print()
        print("Binary files (-> GCS assets):")
        for fs_path, zip_path in sorted(binary_files, key=lambda x: x[1]):
            size = fs_path.stat().st_size
            print(f"  {zip_path:<60} ({size:>10,} bytes)")
            zf.write(fs_path, zip_path)

    zip_size = output_path.stat().st_size
    print()
    print(f"Created: {output_path}")
    print(f"Zip size: {zip_size:,} bytes ({zip_size / 1024 / 1024:.2f} MB)")
    print(f"Total entries: {total} ({len(text_files)} text, {len(binary_files)} binary)")
    print(f"Unique asset stems: {len(stems)}")
    if rewrite_count:
        print(f"Files with rewritten paths: {rewrite_count}")
    if manifest_rewritten:
        print("manifest.js rewritten with flattened assets/ paths")
    else:
        print("WARNING: manifest.js was not found or not rewritten!")


def main():
    parser = argparse.ArgumentParser(
        description="Package BrowserQuest client for Rosebud import"
    )
    parser.add_argument(
        "--dist-dir",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "client",
        help="Path to client source directory (default: ../client)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Output zip file path (default: dist/browserquest-rosebud.zip)",
    )
    args = parser.parse_args()

    dist_dir = args.dist_dir.resolve()
    output = args.output
    if output is None:
        output = Path(__file__).resolve().parent.parent / "dist" / "browserquest-rosebud.zip"
    output = output.resolve()

    print(f"Source: {dist_dir}")
    print(f"Output: {output}")
    print()

    package_dist(dist_dir, output)


if __name__ == "__main__":
    main()
