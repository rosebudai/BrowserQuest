#!/usr/bin/env python3
"""
Package BrowserQuest client into a zip file compatible with Rosebud's
import_project_from_zip / import_project_from_local_zip commands.

Zip structure rules (matching _zip_import_utils.py):
  - Files under `assets/` top-level directory -> treated as binary assets
    (uploaded to GCS as MediaFile/Asset).
  - Everything else -> treated as UTF-8 text project files
    (stored as GenericFile records in DB).

Binary files (images, audio, fonts) are placed under assets/ preserving
their subdirectory structure to avoid filename collisions across scale
directories (img/1/, img/2/, img/3/).

Text files (HTML, JS, CSS, JSON) keep their relative path from the source
directory. Asset references are rewritten to point to their new assets/ paths.

Usage:
    python package-for-rosebud.py [--dist-dir DIR] [--output FILE]
"""

import argparse
import os
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

# Text file extensions that may contain asset path references
REWRITABLE_EXTENSIONS = frozenset({".html", ".htm", ".js", ".css", ".json"})

# Directories/files to skip
SKIP_DIRS = frozenset({"node_modules", ".git"})
SKIP_FILES = frozenset({".DS_Store", "index_original.html", "build.js"})


def is_binary_file(file_path: Path) -> bool:
    return file_path.suffix.lower() in BINARY_EXTENSIONS


def rewrite_asset_paths(content: str, path_rewrites: dict[str, str]) -> str:
    """
    Rewrite asset paths in file content.

    Binary files are moved from their original relative path (e.g., img/2/tilesheet.png)
    to assets/ prefixed paths (e.g., assets/img/2/tilesheet.png). References in text
    files must be updated.
    """
    result = content
    # Sort by longest path first to avoid partial replacements
    for original, new_path in sorted(path_rewrites.items(), key=lambda x: -len(x[0])):
        result = result.replace(original, new_path)
    return result


def package_dist(dist_dir: Path, output_path: Path) -> None:
    if not dist_dir.is_dir():
        print(f"Error: source directory does not exist: {dist_dir}", file=sys.stderr)
        sys.exit(1)

    text_files: list[tuple[Path, str]] = []   # (fs_path, zip_path)
    binary_files: list[tuple[Path, str]] = []  # (fs_path, zip_path)
    # Track path changes for rewriting references
    path_rewrites: dict[str, str] = {}  # original_rel -> new_rel (with assets/ prefix)

    for root, dirs, files in os.walk(dist_dir):
        # Skip unwanted directories
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]

        for filename in sorted(files):
            if filename in SKIP_FILES:
                continue

            fs_path = Path(root) / filename
            rel_path = fs_path.relative_to(dist_dir)
            rel_str = str(rel_path)

            # Skip the output zip itself
            if fs_path.resolve() == output_path.resolve():
                continue

            if is_binary_file(fs_path):
                # Binary files go under assets/ preserving subdirectory structure
                zip_path = f"assets/{rel_str}"
                binary_files.append((fs_path, zip_path))
                # Track the path change for rewriting
                path_rewrites[rel_str] = zip_path
            else:
                # Text files keep their relative path
                text_files.append((fs_path, rel_str))

    total = len(text_files) + len(binary_files)
    if total == 0:
        print(f"Error: no files found in {dist_dir}", file=sys.stderr)
        sys.exit(1)

    # Create the zip
    output_path.parent.mkdir(parents=True, exist_ok=True)
    rewrite_count = 0

    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        print(f"Packaging {len(text_files)} text files and {len(binary_files)} binary files...")
        print()

        print("Text files (-> GenericFile records):")
        for fs_path, zip_path in sorted(text_files, key=lambda x: x[1]):
            size = fs_path.stat().st_size

            if fs_path.suffix.lower() in REWRITABLE_EXTENSIONS and path_rewrites:
                try:
                    content = fs_path.read_text(encoding="utf-8")
                    rewritten = rewrite_asset_paths(content, path_rewrites)
                    if rewritten != content:
                        rewrite_count += 1
                        print(f"  {zip_path:<60} ({len(rewritten):>10,} bytes) [paths rewritten]")
                        zf.writestr(zip_path, rewritten)
                        continue
                except UnicodeDecodeError:
                    pass  # Fall through to binary write

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
    if rewrite_count:
        print(f"Files with rewritten asset paths: {rewrite_count}")


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
