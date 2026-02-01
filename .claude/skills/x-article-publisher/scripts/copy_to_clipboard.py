#!/usr/bin/env python3
"""
Copy image or HTML to system clipboard for X Articles publishing.

Supports:
- Image files (jpg, png, gif, webp) - copies as image data
- HTML content - copies as rich text for paste
- Optional image compression before copying

Usage:
    # Copy image to clipboard
    python copy_to_clipboard.py image /path/to/image.jpg

    # Copy image with compression (quality 0-100)
    python copy_to_clipboard.py image /path/to/image.jpg --quality 80

    # Copy HTML to clipboard
    python copy_to_clipboard.py html "<p>Hello</p>"

    # Copy HTML from file
    python copy_to_clipboard.py html --file /path/to/content.html

Requirements:
    macOS: pip install Pillow pyobjc-framework-Cocoa
    Windows: pip install Pillow pywin32 clip-util
"""

import argparse
import io
import os
import sys
from pathlib import Path


def compress_image(image_path: str, quality: int = 85, max_size: tuple = (2000, 2000)) -> bytes:
    """Compress image and return as bytes."""
    from PIL import Image

    img = Image.open(image_path)

    # Convert to RGB if necessary (for JPEG)
    if img.mode in ('RGBA', 'P'):
        img = img.convert('RGB')

    # Resize if too large
    img.thumbnail(max_size, Image.Resampling.LANCZOS)

    # Save to bytes
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG', quality=quality, optimize=True)
    return buffer.getvalue()


def copy_image_to_clipboard_macos(image_path: str, quality: int = None) -> bool:
    """Copy image to macOS clipboard using AppKit."""
    try:
        from AppKit import NSPasteboard, NSPasteboardTypePNG, NSPasteboardTypeTIFF
        from Foundation import NSData

        # Compress if quality specified, otherwise use original
        if quality:
            image_data = compress_image(image_path, quality)
        else:
            with open(image_path, 'rb') as f:
                image_data = f.read()

        # Create NSData from image bytes
        ns_data = NSData.dataWithBytes_length_(image_data, len(image_data))

        # Get pasteboard and clear it
        pasteboard = NSPasteboard.generalPasteboard()
        pasteboard.clearContents()

        # Determine type based on file extension
        ext = Path(image_path).suffix.lower()
        if ext in ('.png',):
            pasteboard.setData_forType_(ns_data, NSPasteboardTypePNG)
        else:
            # For JPEG and others, use TIFF (more compatible)
            from PIL import Image
            img = Image.open(io.BytesIO(image_data))
            tiff_buffer = io.BytesIO()
            img.save(tiff_buffer, format='TIFF')
            tiff_data = NSData.dataWithBytes_length_(tiff_buffer.getvalue(), len(tiff_buffer.getvalue()))
            pasteboard.setData_forType_(tiff_data, NSPasteboardTypeTIFF)

        return True

    except ImportError as e:
        print(f"Error: Missing dependency: {e}", file=sys.stderr)
        print("Install with: pip install Pillow pyobjc-framework-Cocoa", file=sys.stderr)
        return False
    except Exception as e:
        print(f"Error copying image: {e}", file=sys.stderr)
        return False


def copy_html_to_clipboard_macos(html: str) -> bool:
    """Copy HTML to macOS clipboard as rich text."""
    try:
        from AppKit import NSPasteboard, NSPasteboardTypeHTML, NSPasteboardTypeString
        from Foundation import NSData

        # Get pasteboard and clear it
        pasteboard = NSPasteboard.generalPasteboard()
        pasteboard.clearContents()

        # Set HTML content
        html_data = html.encode('utf-8')
        ns_data = NSData.dataWithBytes_length_(html_data, len(html_data))
        pasteboard.setData_forType_(ns_data, NSPasteboardTypeHTML)

        # Also set plain text version
        pasteboard.setString_forType_(html, NSPasteboardTypeString)

        return True

    except ImportError as e:
        print(f"Error: Missing dependency: {e}", file=sys.stderr)
        print("Install with: pip install pyobjc-framework-Cocoa", file=sys.stderr)
        return False
    except Exception as e:
        print(f"Error copying HTML: {e}", file=sys.stderr)
        return False


# ============================================================================
# Windows Implementation
# ============================================================================

def copy_image_to_clipboard_windows(image_path: str, quality: int = None) -> bool:
    """Copy image to Windows clipboard using CF_DIB format."""
    try:
        import win32clipboard
        from PIL import Image

        # Load and optionally compress image
        if quality:
            image_data = compress_image(image_path, quality)
            img = Image.open(io.BytesIO(image_data))
        else:
            img = Image.open(image_path)

        # Convert to RGB (required for BMP format)
        if img.mode in ('RGBA', 'P', 'LA'):
            img = img.convert('RGB')

        # Save as BMP to BytesIO, skip 14-byte BITMAPFILEHEADER
        output = io.BytesIO()
        img.save(output, format='BMP')
        data = output.getvalue()[14:]  # Skip BITMAPFILEHEADER
        output.close()

        # Copy to clipboard
        win32clipboard.OpenClipboard()
        try:
            win32clipboard.EmptyClipboard()
            win32clipboard.SetClipboardData(win32clipboard.CF_DIB, data)
        finally:
            win32clipboard.CloseClipboard()

        return True

    except ImportError as e:
        print(f"Error: Missing dependency: {e}", file=sys.stderr)
        print("Install with: pip install Pillow pywin32", file=sys.stderr)
        return False
    except Exception as e:
        print(f"Error copying image: {e}", file=sys.stderr)
        return False


def copy_html_to_clipboard_windows(html: str) -> bool:
    """Copy HTML to Windows clipboard using clip-util library."""
    try:
        from clipboard import Clipboard

        with Clipboard() as clipboard:
            clipboard["html"] = html

        return True

    except ImportError as e:
        print(f"Error: Missing dependency: {e}", file=sys.stderr)
        print("Install with: pip install clip-util", file=sys.stderr)
        return False
    except Exception as e:
        print(f"Error copying HTML: {e}", file=sys.stderr)
        return False


# ============================================================================
# Platform Detection
# ============================================================================

def copy_image_to_clipboard(image_path: str, quality: int = None) -> bool:
    """Copy image to clipboard (cross-platform)."""
    if sys.platform == 'darwin':
        return copy_image_to_clipboard_macos(image_path, quality)
    elif sys.platform == 'win32':
        return copy_image_to_clipboard_windows(image_path, quality)
    else:
        print(f"Error: Unsupported platform: {sys.platform}", file=sys.stderr)
        return False


def copy_html_to_clipboard(html: str) -> bool:
    """Copy HTML to clipboard (cross-platform)."""
    if sys.platform == 'darwin':
        return copy_html_to_clipboard_macos(html)
    elif sys.platform == 'win32':
        return copy_html_to_clipboard_windows(html)
    else:
        print(f"Error: Unsupported platform: {sys.platform}", file=sys.stderr)
        return False


def main():
    parser = argparse.ArgumentParser(description='Copy to clipboard for X Articles')
    subparsers = parser.add_subparsers(dest='type', required=True)

    # Image subcommand
    img_parser = subparsers.add_parser('image', help='Copy image to clipboard')
    img_parser.add_argument('path', help='Path to image file')
    img_parser.add_argument('--quality', type=int, default=None,
                           help='JPEG quality (1-100), enables compression')
    img_parser.add_argument('--max-width', type=int, default=2000,
                           help='Max width for resize')
    img_parser.add_argument('--max-height', type=int, default=2000,
                           help='Max height for resize')

    # HTML subcommand
    html_parser = subparsers.add_parser('html', help='Copy HTML to clipboard')
    html_parser.add_argument('content', nargs='?', help='HTML content')
    html_parser.add_argument('--file', '-f', help='Read HTML from file')

    args = parser.parse_args()

    if args.type == 'image':
        if not os.path.exists(args.path):
            print(f"Error: Image not found: {args.path}", file=sys.stderr)
            sys.exit(1)

        success = copy_image_to_clipboard(args.path, args.quality)
        if success:
            print(f"Image copied to clipboard: {args.path}")
            if args.quality:
                print(f"  (compressed with quality={args.quality})")
        sys.exit(0 if success else 1)

    elif args.type == 'html':
        if args.file:
            if not os.path.exists(args.file):
                print(f"Error: File not found: {args.file}", file=sys.stderr)
                sys.exit(1)
            with open(args.file, 'r', encoding='utf-8') as f:
                html = f.read()
        elif args.content:
            html = args.content
        else:
            # Read from stdin
            html = sys.stdin.read()

        success = copy_html_to_clipboard(html)
        if success:
            print(f"HTML copied to clipboard ({len(html)} chars)")
        sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
