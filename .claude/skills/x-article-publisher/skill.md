# X Article Publisher

Prepare Markdown content for publishing to X (Twitter) Articles with rich text formatting.

## Overview

This skill extracts content from Markdown files or URLs and prepares it for manual publishing to X Articles. It does NOT automate the browser—you'll copy the prepared content to X Articles yourself.

## Prerequisites

- Python 3.9+ with dependencies:
  - macOS: `pip install Pillow pyobjc-framework-Cocoa markdown`
  - Windows: `pip install Pillow pywin32 clip-util markdown`

## Workflow

### Step 1: Generate article ID and fetch content

Generate a short article ID from the title or URL slug (e.g., `redesigning-lasers`, `my-article`). Use kebab-case, max 30 characters. Create the directory `.x-article-temp/<article-id>/`.

If the user provides a URL instead of a local file, use WebFetch or browser tools to extract the article content and save it as a Markdown file in `.x-article-temp/<article-id>/`.

### Step 2: Download media

Download all images and videos referenced in the article to `.x-article-temp/<article-id>/`. Use parallel downloads for efficiency.

### Step 3: Parse Markdown

```bash
python3 .claude/skills/x-article-publisher/scripts/parse_markdown.py .x-article-temp/<article-id>/article.md
```

This outputs JSON with:

- `title`: Article title (from H1)
- `cover_image`: Path to first image/video (use as cover)
- `content_images`: Array of media with `path`, `block_index`, `after_text`
- `html`: Rich text HTML content
- `total_blocks`: Number of block elements

Save HTML to file:

```bash
python3 .claude/skills/x-article-publisher/scripts/parse_markdown.py .x-article-temp/<article-id>/article.md --html-only > .x-article-temp/<article-id>/article.html
```

### Step 4: Report to user

After all preparation is complete, report to the user:

1. **Title** of the article
2. **Cover media** file path
3. **Number of content images/videos** and their file paths

### Step 5: Prompt for clipboard copy

**IMPORTANT**: Ask the user for confirmation before running the clipboard command.

Use AskUserQuestion to ask:

> "Ready to copy the rich text content to your clipboard. After copying, paste (Cmd+V) into the X Articles editor body. Copy now?"

Only after user confirms, run:

```bash
python3 .claude/skills/x-article-publisher/scripts/copy_to_clipboard.py html --file .x-article-temp/<article-id>/article.html
```

Then tell the user: "Content copied! Paste into the X Articles editor now."

### Step 6: Guide media insertion

After the user pastes the text, guide them to insert media at the correct positions:

For each content image/video (in order of appearance):

1. Tell them the `after_text` context so they know where to place cursor
2. Provide the file path to upload
3. They can drag-drop or use Insert > Media

## File structure

All temporary files go in `.x-article-temp/<article-id>/` in the current working directory:

```
.x-article-temp/<article-id>/
├── article.md      # Source markdown
├── article.html    # Generated HTML for clipboard
├── video1.mp4      # Downloaded media
├── video2.mp4
├── image1.png
└── ...
```

## Scripts

### parse_markdown.py

Parse Markdown and extract structured data:

```bash
python3 scripts/parse_markdown.py <markdown_file> [--output json|html] [--html-only]
```

### copy_to_clipboard.py

Copy HTML to system clipboard as rich text:

```bash
python3 scripts/copy_to_clipboard.py html --file <html_file>
```

Copy image to clipboard:

```bash
python3 scripts/copy_to_clipboard.py image <image_path> [--quality 85]
```

## Supported formatting

| Element           | Support   | Notes              |
| ----------------- | --------- | ------------------ |
| H2 (`##`)         | Native    | Section headers    |
| Bold (`**`)       | Native    | Strong emphasis    |
| Italic (`*`)      | Native    | Emphasis           |
| Links (`[](url)`) | Native    | Hyperlinks         |
| Ordered lists     | Native    | 1. 2. 3.           |
| Unordered lists   | Native    | - bullets          |
| Blockquotes (`>`) | Native    | Quoted text        |
| Code blocks       | Converted | → Blockquotes      |
| Images            | Manual    | Upload after paste |
| Videos            | Manual    | Upload after paste |

## Example session

**User**: "Publish https://example.com/blog/my-article to X"

**Claude**:

1. Generates article ID: `my-article`
2. Fetches article content from URL
3. Saves markdown to `.x-article-temp/my-article/article.md`
4. Downloads all media to `.x-article-temp/my-article/`
5. Parses markdown, generates HTML
6. Reports:

   ```
   Article prepared for X publishing:

   Title: "My Article Title"
   Cover: .x-article-temp/my-article/hero.jpg
   Content media: 3 images

   To publish:
   1. Go to https://x.com/compose/articles
   2. Click "create"
   3. Upload cover image: .x-article-temp/my-article/hero.jpg
   4. Enter title: "My Article Title"
   5. Click in the editor body
   ```

6. Asks: "Ready to copy rich text to clipboard?"
7. User confirms
8. Runs clipboard copy command
9. Says: "Content copied! Paste (Cmd+V) into the editor now."
10. Guides media insertion with file paths and placement hints

## Critical rules

1. **NEVER attempt browser login** - This skill prepares content only
2. **Always use `.x-article-temp/<article-id>/`** - Keep all temp files in article-specific subdirectories
3. **Always ask before clipboard copy** - User must confirm
4. **H1 = title only** - First H1 becomes article title, not body content
5. **Guide media insertion** - Provide clear file paths and context for placement
