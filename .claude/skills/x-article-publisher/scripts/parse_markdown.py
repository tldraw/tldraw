#!/usr/bin/env python3
"""
Parse Markdown for X Articles publishing.

Extracts:
- Title (from first H1/H2 or first line)
- Cover image (first image)
- Content images with block index for precise positioning
- Dividers (---) with block index for menu insertion
- HTML content (images and dividers stripped)

Usage:
    python parse_markdown.py <markdown_file> [--output json|html]

Output (JSON):
{
    "title": "Article Title",
    "cover_image": "/path/to/cover.jpg",
    "content_images": [
        {"path": "/path/to/img.jpg", "block_index": 3, "after_text": "context..."},
        ...
    ],
    "dividers": [
        {"block_index": 7, "after_text": "context..."},
        ...
    ],
    "html": "<p>Content...</p><h2>Section</h2>...",
    "total_blocks": 25
}

The block_index indicates which block element (0-indexed) the image/divider should follow.
This allows precise positioning without relying on text matching.

Note: Dividers must be inserted via X Articles' Insert > Divider menu, not HTML <hr> tags.
"""

import argparse
import json
import os
import re
import sys
import urllib.parse
from pathlib import Path


# Common search directories for missing images
SEARCH_DIRS = [
    Path.home() / "Downloads",
    Path.home() / "Desktop",
    Path.home() / "Pictures",
]


def find_image_file(original_path: str, filename: str) -> tuple[str, bool]:
    """Find an image file, searching common directories if not found at original path.
    
    Args:
        original_path: The resolved absolute path from markdown
        filename: Just the filename to search for
    
    Returns:
        (found_path, exists): The path to use and whether file exists
    """
    if os.path.isfile(original_path):
        return original_path, True
    
    for search_dir in SEARCH_DIRS:
        candidate = search_dir / filename
        if candidate.is_file():
            print(f"[parse_markdown] Image not found at '{original_path}', using '{candidate}' instead", file=sys.stderr)
            return str(candidate), True
    
    print(f"[parse_markdown] WARNING: Image not found: '{original_path}' (also searched {[str(d) for d in SEARCH_DIRS]})", file=sys.stderr)
    return original_path, False


def split_into_blocks(markdown: str) -> list[str]:
    """Split markdown into logical blocks (paragraphs, headers, quotes, code blocks, etc.)."""
    blocks = []
    current_block = []
    in_code_block = False
    code_block_lines = []

    lines = markdown.split('\n')

    for line in lines:
        stripped = line.strip()

        # Handle code block boundaries
        if stripped.startswith('```'):
            if in_code_block:
                # End of code block
                in_code_block = False
                if code_block_lines:
                    # Mark as code block with special prefix for later processing
                    # Use ___CODE_BLOCK_START___ and ___CODE_BLOCK_END___ to preserve content
                    blocks.append('___CODE_BLOCK_START___' + '\n'.join(code_block_lines) + '___CODE_BLOCK_END___')
                code_block_lines = []
            else:
                # Start of code block
                if current_block:
                    blocks.append('\n'.join(current_block))
                    current_block = []
                in_code_block = True
            continue

        # If inside code block, collect ALL lines (including empty lines)
        if in_code_block:
            code_block_lines.append(line)
            continue

        # Empty line signals end of block
        if not stripped:
            if current_block:
                blocks.append('\n'.join(current_block))
                current_block = []
            continue

        # Horizontal rule (divider) is its own block
        if re.match(r'^---+$', stripped):
            if current_block:
                blocks.append('\n'.join(current_block))
                current_block = []
            blocks.append('___DIVIDER___')
            continue

        # Headers, blockquotes are their own blocks
        if stripped.startswith(('#', '>')):
            if current_block:
                blocks.append('\n'.join(current_block))
                current_block = []
            blocks.append(stripped)
            continue

        # Image on its own line is its own block
        if re.match(r'^!\[.*\]\(.*\)$', stripped):
            if current_block:
                blocks.append('\n'.join(current_block))
                current_block = []
            blocks.append(stripped)
            continue

        current_block.append(line)

    if current_block:
        blocks.append('\n'.join(current_block))

    # Handle unclosed code block
    if code_block_lines:
        blocks.append('___CODE_BLOCK_START___' + '\n'.join(code_block_lines) + '___CODE_BLOCK_END___')

    return blocks


def extract_images_and_dividers(markdown: str, base_path: Path) -> tuple[list[dict], list[dict], str, int]:
    """Extract images and dividers with their block index positions.

    Returns:
        (image_list, divider_list, markdown_without_images_and_dividers, total_blocks)
    """
    blocks = split_into_blocks(markdown)
    images = []
    dividers = []
    clean_blocks = []

    img_pattern = re.compile(r'^!\[([^\]]*)\]\(([^)]+)\)$')

    for i, block in enumerate(blocks):
        block_stripped = block.strip()

        # Check for divider
        if block_stripped == '___DIVIDER___':
            block_index = len(clean_blocks)
            after_text = ""
            if clean_blocks:
                prev_block = clean_blocks[-1].strip()
                lines = [l for l in prev_block.split('\n') if l.strip()]
                after_text = lines[-1][:80] if lines else ""
            dividers.append({
                "block_index": block_index,
                "after_text": after_text
            })
            continue

        match = img_pattern.match(block_stripped)
        if match:
            alt_text = match.group(1)
            img_path = match.group(2)

            if not os.path.isabs(img_path):
                resolved_path = str(base_path / img_path)
            else:
                resolved_path = img_path

            filename = os.path.basename(urllib.parse.unquote(img_path))
            full_path, exists = find_image_file(resolved_path, filename)

            block_index = len(clean_blocks)

            after_text = ""
            if clean_blocks:
                prev_block = clean_blocks[-1].strip()
                lines = [l for l in prev_block.split('\n') if l.strip()]
                after_text = lines[-1][:80] if lines else ""

            images.append({
                "path": full_path,
                "original_path": resolved_path,
                "exists": exists,
                "alt": alt_text,
                "block_index": block_index,
                "after_text": after_text
            })
        else:
            clean_blocks.append(block)

    clean_markdown = '\n\n'.join(clean_blocks)
    return images, dividers, clean_markdown, len(clean_blocks)


def extract_title(markdown: str) -> tuple[str, str]:
    """Extract title from first H1, H2, or first non-empty line.

    Returns:
        (title, markdown_without_title): Title string and markdown with H1 title removed.
        If title is from H1, it's removed from markdown to avoid duplication.
    """
    lines = markdown.strip().split('\n')
    title = "Untitled"
    title_line_idx = None

    for idx, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            continue
        # H1 - use as title and mark for removal
        if stripped.startswith('# '):
            title = stripped[2:].strip()
            title_line_idx = idx
            break
        # H2 - use as title but don't remove (it's a section header)
        if stripped.startswith('## '):
            title = stripped[3:].strip()
            break
        # First non-empty, non-image line
        if not stripped.startswith('!['):
            title = stripped[:100]
            break

    # Remove H1 title line from markdown to avoid duplication
    if title_line_idx is not None:
        lines.pop(title_line_idx)
        markdown = '\n'.join(lines)

    return title, markdown


def markdown_to_html(markdown: str) -> str:
    """Convert markdown to HTML for X Articles rich text paste."""
    html = markdown

    # Process code blocks first (marked with ___CODE_BLOCK_START___ and ___CODE_BLOCK_END___)
    # Convert to blockquote format since X Articles doesn't support <pre><code>
    def convert_code_block(match):
        code_content = match.group(1)
        lines = code_content.strip().split('\n')
        # Join non-empty lines with <br> for display
        formatted = '<br>'.join(line for line in lines if line.strip())
        return f'<blockquote>{formatted}</blockquote>'

    html = re.sub(r'___CODE_BLOCK_START___(.*?)___CODE_BLOCK_END___', convert_code_block, html, flags=re.DOTALL)

    # Headers (H2 only, H1 is title)
    html = re.sub(r'^## (.+)$', r'<h2>\1</h2>', html, flags=re.MULTILINE)
    html = re.sub(r'^### (.+)$', r'<h3>\1</h3>', html, flags=re.MULTILINE)

    # Bold
    html = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', html)

    # Italic
    html = re.sub(r'\*([^*]+)\*', r'<em>\1</em>', html)

    # Links
    html = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', html)

    # Blockquotes (regular markdown blockquotes, not code blocks)
    html = re.sub(r'^> (.+)$', r'<blockquote>\1</blockquote>', html, flags=re.MULTILINE)

    # Unordered lists
    html = re.sub(r'^- (.+)$', r'<li>\1</li>', html, flags=re.MULTILINE)

    # Ordered lists
    html = re.sub(r'^\d+\. (.+)$', r'<li>\1</li>', html, flags=re.MULTILINE)

    # Wrap consecutive <li> in <ul>
    html = re.sub(r'((?:<li>.*?</li>\n?)+)', r'<ul>\1</ul>', html)

    # Paragraphs - split by double newlines
    parts = html.split('\n\n')
    processed_parts = []

    for part in parts:
        part = part.strip()
        if not part:
            continue
        # Skip if already a block element
        if part.startswith(('<h2>', '<h3>', '<blockquote>', '<ul>', '<ol>')):
            processed_parts.append(part)
        else:
            # Wrap in paragraph, convert single newlines to <br>
            part = part.replace('\n', '<br>')
            processed_parts.append(f'<p>{part}</p>')

    return ''.join(processed_parts)


def parse_markdown_file(filepath: str) -> dict:
    """Parse a markdown file and return structured data."""
    path = Path(filepath)
    base_path = path.parent

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Skip YAML frontmatter if present
    if content.startswith('---'):
        end_marker = content.find('---', 3)
        if end_marker != -1:
            content = content[end_marker + 3:].strip()

    # Extract title first (and remove H1 from markdown)
    title, content = extract_title(content)

    # Extract images and dividers with block indices
    images, dividers, clean_markdown, total_blocks = extract_images_and_dividers(content, base_path)

    # Convert to HTML
    html = markdown_to_html(clean_markdown)

    cover_image = images[0]["path"] if images else None
    cover_exists = images[0]["exists"] if images else True
    content_images = images[1:] if len(images) > 1 else []

    missing = [img for img in images if not img["exists"]]
    if missing:
        print(f"[parse_markdown] WARNING: {len(missing)} image(s) not found", file=sys.stderr)

    return {
        "title": title,
        "cover_image": cover_image,
        "cover_exists": cover_exists,
        "content_images": content_images,
        "dividers": dividers,
        "html": html,
        "total_blocks": total_blocks,
        "source_file": str(path.absolute()),
        "missing_images": len(missing)
    }


def main():
    parser = argparse.ArgumentParser(description='Parse Markdown for X Articles')
    parser.add_argument('file', help='Markdown file to parse')
    parser.add_argument('--output', choices=['json', 'html'], default='json',
                       help='Output format (default: json)')
    parser.add_argument('--html-only', action='store_true',
                       help='Output only HTML content')

    args = parser.parse_args()

    if not os.path.exists(args.file):
        print(f"Error: File not found: {args.file}", file=sys.stderr)
        sys.exit(1)

    result = parse_markdown_file(args.file)

    if args.html_only:
        print(result['html'])
    elif args.output == 'json':
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(result['html'])


if __name__ == '__main__':
    main()
