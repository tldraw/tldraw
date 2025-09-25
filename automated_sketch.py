#!/usr/bin/env python3
"""Run the tldraw agent headlessly and render pen strokes onto an image.

This tool sends a single prompt to the Cloudflare worker used by the tldraw
agent template (see ``notes.md`` for how to run the worker locally). The worker
streams back drawing actions which we replay directly on top of the supplied
background image. Only the Python script is required – no browser automation or
web UI steps.

Example
-------
python automated_sketch.py background.jpg "draw a cat" output.png
"""

from __future__ import annotations

import argparse
import base64
import io
import json
import math
import sys
import uuid
from datetime import datetime
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

import requests
from PIL import Image, ImageDraw

DEFAULT_ENDPOINT = "http://localhost:8787/stream"
DEFAULT_MODEL = "claude-4-sonnet"
PEN_ALPHA = 255
MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024 - 2048

_COLOR_HEX: Dict[str, str] = {
    "black": "#1d1d1d",
    "grey": "#9fa8b2",
    "light-violet": "#e085f4",
    "violet": "#ae3ec9",
    "blue": "#4465e9",
    "light-blue": "#4ba1f1",
    "yellow": "#f5b000",
    "orange": "#e16919",
    "green": "#099268",
    "light-green": "#4cb05e",
    "light-red": "#f87777",
    "red": "#e03131",
    "white": "#ffffff",
}


def _hex_to_rgb(color: str) -> Tuple[int, int, int]:
    color = color.lstrip("#")
    return tuple(int(color[i : i + 2], 16) for i in (0, 2, 4))


COLOR_MAP: Dict[str, Tuple[int, int, int]] = {
    name: _hex_to_rgb(hex_value) for name, hex_value in _COLOR_HEX.items()
}
DEFAULT_COLOR = COLOR_MAP["red"]


def resolve_color(name: Optional[str]) -> Tuple[int, int, int]:
    if not name:
        return DEFAULT_COLOR
    normalized = name.lower()
    if normalized in COLOR_MAP:
        return COLOR_MAP[normalized]

    # Simple heuristics to catch truncated / approximate color names
    for key in COLOR_MAP:
        if normalized in key or key in normalized:
            return COLOR_MAP[key]
    if normalized.startswith("re"):
        return COLOR_MAP["red"]
    if normalized.startswith("bl"):
        return COLOR_MAP["blue"]
    if normalized.startswith("gr"):
        return COLOR_MAP["green"]
    if normalized.startswith("wh"):
        return COLOR_MAP["white"]
    return DEFAULT_COLOR


@dataclass
class PenAction:
    points: List[Tuple[float, float]]
    color: Tuple[int, int, int]
    closed: bool
    fill: Optional[str]
    style: str


@dataclass
class BoundingBox:
    x: float
    y: float
    w: float
    h: float

    def to_list(self) -> List[float]:
        return [self.x, self.y, self.w, self.h]

    def to_relative(self, width: int, height: int) -> "BoundingBox":
        if width <= 0 or height <= 0:
            return BoundingBox(0.0, 0.0, 0.0, 0.0)
        return BoundingBox(
            self.x / float(width),
            self.y / float(height),
            self.w / float(width),
            self.h / float(height),
        )


@dataclass
class PenBounds:
    raw: BoundingBox
    clamped: BoundingBox


def _clamp_extents(
    left: float,
    top: float,
    right: float,
    bottom: float,
    width: int,
    height: int,
) -> Tuple[float, float, float, float]:
    if width <= 0 or height <= 0:
        return 0.0, 0.0, 1.0, 1.0

    max_x = float(width)
    max_y = float(height)

    left = max(0.0, min(left, max_x))
    top = max(0.0, min(top, max_y))
    right = max(0.0, min(right, max_x))
    bottom = max(0.0, min(bottom, max_y))

    if right <= left:
        if left >= max_x:
            left = max_x - 1.0
            right = max_x
        else:
            right = min(max_x, left + 1.0)

    if bottom <= top:
        if top >= max_y:
            top = max_y - 1.0
            bottom = max_y
        else:
            bottom = min(max_y, top + 1.0)

    left = max(0.0, min(left, max_x))
    top = max(0.0, min(top, max_y))
    right = max(left + 1.0, min(right, max_x))
    bottom = max(top + 1.0, min(bottom, max_y))

    return left, top, right, bottom


def compute_pen_bounds(
    action: PenAction, width: int, height: int
) -> Optional[PenBounds]:
    if not action.points:
        return None

    xs = [point[0] for point in action.points]
    ys = [point[1] for point in action.points]
    if not xs or not ys:
        return None

    min_x = min(xs)
    max_x = max(xs)
    min_y = min(ys)
    max_y = max(ys)

    raw = BoundingBox(
        min_x,
        min_y,
        max(1.0, max_x - min_x),
        max(1.0, max_y - min_y),
    )

    cl_left, cl_top, cl_right, cl_bottom = _clamp_extents(
        min_x, min_y, max_x, max_y, width, height
    )
    clamped = BoundingBox(cl_left, cl_top, cl_right - cl_left, cl_bottom - cl_top)

    return PenBounds(raw=raw, clamped=clamped)


def extract_pen_bounds(
    pen_actions: Sequence[PenAction], width: int, height: int
) -> List[Optional[PenBounds]]:
    return [compute_pen_bounds(action, width, height) for action in pen_actions]


def serialize_pen_predictions(
    pen_actions: Sequence[PenAction],
    pen_bounds: Sequence[Optional[PenBounds]],
    width: int,
    height: int,
) -> List[Dict[str, object]]:
    entries: List[Dict[str, object]] = []
    for idx, (action, bounds) in enumerate(zip(pen_actions, pen_bounds)):
        if bounds is None:
            continue
        entries.append(
            {
                "pen_index": idx,
                "num_points": len(action.points),
                "style": action.style,
                "closed": action.closed,
                "color": action.color,
                "raw_bbox": bounds.raw.to_list(),
                "raw_bbox_relative": bounds.raw.to_relative(width, height).to_list(),
                "clamped_bbox": bounds.clamped.to_list(),
                "clamped_bbox_relative": bounds.clamped.to_relative(width, height).to_list(),
            }
        )
    return entries


def load_image(image_path: Path) -> Tuple[Image.Image, str, int, int, float]:
    """Open the background image, ensure prompt encoding stays under limits."""

    if not image_path.exists():
        raise FileNotFoundError(f"Input image '{image_path}' was not found")

    with Image.open(image_path) as raw:
        base_rgba = raw.convert("RGBA")

    prepared_rgba, data_url, scale = prepare_prompt_image(base_rgba)
    width, height = prepared_rgba.size
    return prepared_rgba, data_url, width, height, scale


def prepare_prompt_image(image: Image.Image) -> Tuple[Image.Image, str, float]:
    """Compress / resize the image until the payload fits the 5 MB limit."""

    rgb_image = image.convert("RGB")
    scale = 1.0
    quality = 90

    best_rgba = image
    best_data_url = ""

    while True:
        candidate = rgb_image
        if scale < 0.999:
            new_width = max(1, int(rgb_image.width * scale))
            new_height = max(1, int(rgb_image.height * scale))
            candidate = rgb_image.resize((new_width, new_height), Image.LANCZOS)

        buffer = io.BytesIO()
        candidate.save(buffer, format="JPEG", quality=quality, optimize=True)
        payload = buffer.getvalue()

        data_url = f"data:image/jpeg;base64,{base64.b64encode(payload).decode('ascii')}"

        if len(payload) <= MAX_SCREENSHOT_BYTES:
            return candidate.convert("RGBA"), data_url, scale

        # Remember best attempt so far in case we need to bail out
        best_rgba = candidate.convert("RGBA")
        best_data_url = data_url

        if quality > 35:
            quality -= 10
            continue

        if scale > 0.3:
            scale *= 0.85
            quality = 90
            continue

        # Last resort: return the smallest candidate even if still too large
        final_data_url = best_data_url or data_url
        return best_rgba, final_data_url, scale


def build_prompt(message: str, data_url: str, width: int, height: int, model: str) -> Dict[str, object]:
    """Create the minimal prompt structure expected by the worker."""

    bounds = {"x": 0, "y": 0, "w": width, "h": height}
    guidance = (
        "Use pen strokes to draw directly on the provided screenshot. "
        "Avoid creating shapes or other actions unless absolutely necessary."
    )

    return {
        "system": {"type": "system"},
        "modelName": {"type": "modelName", "name": model},
        "messages": {
            "type": "messages",
            "messages": [guidance, message],
            "requestType": "user",
        },
        "screenshot": {"type": "screenshot", "screenshot": data_url},
        "viewportBounds": {
            "type": "viewportBounds",
            "userBounds": bounds,
            "agentBounds": bounds,
        },
        "contextItems": {"type": "contextItems", "items": [], "requestType": "user"},
        "data": {"type": "data", "data": []},
        "todoList": {"type": "todoList", "items": []},
        "chatHistory": {"type": "chatHistory", "items": []},
        "time": {"type": "time", "time": ""},
    }


def stream_actions(endpoint: str, prompt: Dict[str, object], timeout: int) -> Iterable[Dict[str, object]]:
    """Yield JSON action payloads produced by the worker."""

    headers = {"Content-Type": "application/json", "Accept": "text/event-stream"}
    with requests.post(endpoint, json=prompt, headers=headers, stream=True, timeout=timeout) as response:
        response.raise_for_status()

        for line in response.iter_lines(decode_unicode=True):
            if not line or not line.startswith("data: "):
                continue
            payload = json.loads(line[6:])
            if "error" in payload:
                raise RuntimeError(f"Worker error: {payload['error']}")
            yield payload


def _coerce_points(points: Sequence[Dict[str, object]]) -> List[Tuple[float, float]]:
    result: List[Tuple[float, float]] = []
    for point in points:
        x = point.get("x")
        y = point.get("y")
        if isinstance(x, (int, float)) and isinstance(y, (int, float)):
            result.append((float(x), float(y)))
    return result


def parse_pen_action(action: Dict[str, object]) -> Optional[PenAction]:
    if action.get("_type") != "pen" or not action.get("complete"):
        return None

    points = action.get("points")
    if not isinstance(points, list):
        return None

    parsed_points = _coerce_points(points)
    if len(parsed_points) < 2:
        return None

    color = resolve_color(action.get("color"))
    closed = bool(action.get("closed", False))
    fill = action.get("fill") if isinstance(action.get("fill"), str) else None
    style = str(action.get("style") or "smooth")

    return PenAction(points=parsed_points, color=color, closed=closed, fill=fill, style=style)


def render_pen_actions(image: Image.Image, pen_actions: Sequence[PenAction]) -> Image.Image:
    canvas = image.copy()
    drawer = ImageDraw.Draw(canvas, "RGBA")

    shortest_edge = max(1, min(canvas.size))
    base_width = max(3, shortest_edge // 120)

    for action in pen_actions:
        xs = [point[0] for point in action.points]
        ys = [point[1] for point in action.points]
        if not xs or not ys:
            continue

        min_x = min(xs)
        max_x = max(xs)
        min_y = min(ys)
        max_y = max(ys)

        cl_left, cl_top, cl_right, cl_bottom = _clamp_extents(
            min_x,
            min_y,
            max_x,
            max_y,
            canvas.width,
            canvas.height,
        )

        left = math.floor(cl_left)
        top = math.floor(cl_top)
        right = math.ceil(cl_right)
        bottom = math.ceil(cl_bottom)

        if right <= left:
            right = min(canvas.width - 1, left + 1)
            if right <= left:
                continue

        if bottom <= top:
            bottom = min(canvas.height - 1, top + 1)
            if bottom <= top:
                continue

        stroke = (*action.color, PEN_ALPHA)
        width = base_width if action.style == "smooth" else max(1, base_width - 1)

        drawer.rectangle([(left, top), (right, bottom)], outline=stroke, width=width, fill=None)

    return canvas


def ensure_endpoint(endpoint: str) -> str:
    return endpoint if endpoint.endswith("/stream") else f"{endpoint.rstrip('/')}/stream"


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Automatically draw on an image with the tldraw agent")
    parser.add_argument("input_image", nargs="?", help="Path to a single image")
    parser.add_argument("prompt", help="Instruction for the agent")
    parser.add_argument("output_image", nargs="?", help="Destination for the annotated image")
    parser.add_argument("--endpoint", default=DEFAULT_ENDPOINT,
                        help=f"Agent stream endpoint (default: {DEFAULT_ENDPOINT})")
    parser.add_argument("--session", default=None,
                        help="Session identifier for the worker (default: random)")
    parser.add_argument("--model", default=DEFAULT_MODEL,
                        help=f"Agent model name (default: {DEFAULT_MODEL})")
    parser.add_argument("--timeout", type=int, default=90,
                        help="Request timeout in seconds (default: 90)")
    parser.add_argument("--input-dir", type=Path, default=None,
                        help="Process every image in this directory")
    parser.add_argument("--output-dir", type=Path, default=None,
                        help="Output directory when using --input-dir")
    parser.add_argument("--extensions", default=".jpg,.jpeg,.png",
                        help="Comma-separated list of extensions to include in --input-dir mode")
    parser.add_argument(
        "--log-json",
        type=Path,
        default=None,
        help="Optional path to write bounding box predictions as JSON",
    )
    return parser.parse_args(argv)


def process_image(
    input_path: Path,
    prompt: str,
    output_path: Path,
    args: argparse.Namespace,
) -> Tuple[int, Optional[Dict[str, object]]]:
    try:
        image, data_url, width, height, scale = load_image(input_path)
    except Exception as exc:  # pragma: no cover - argument validation
        print(f"Error loading input image '{input_path}': {exc}", file=sys.stderr)
        return 1, None

    print(f"Using screenshot dimensions: {width}x{height} (scale factor {scale:.3f})")

    prompt_payload = build_prompt(prompt, data_url, width, height, args.model)

    preview = json.loads(json.dumps(prompt_payload))
    screenshot_value = preview.get("screenshot", {}).get("screenshot")
    if isinstance(screenshot_value, str):
        preview["screenshot"]["screenshot"] = (
            f"<{len(screenshot_value)} chars: {screenshot_value[:32]}...>"
        )

    print("Prompt payload:")
    print(json.dumps(preview, indent=2))

    endpoint = ensure_endpoint(args.endpoint)
    session_id = args.session or uuid.uuid4().hex
    endpoint_with_session = (
        f"{endpoint}&sessionId={session_id}" if '?' in endpoint else f"{endpoint}?sessionId={session_id}"
    )

    print(f"Connecting to worker at {endpoint_with_session}...")

    pen_actions: List[PenAction] = []
    try:
        for payload in stream_actions(endpoint_with_session, prompt_payload, args.timeout):
            parsed = parse_pen_action(payload)
            action_type = payload.get("_type")
            handled = False

            if parsed:
                pen_actions.append(parsed)
                print(f"Pen stroke received with {len(parsed.points)} points")
                handled = True

            if not handled and action_type in {"message", "think", "review", "todo"}:
                handled = True

            if (not handled) and isinstance(payload.get("actions"), list):
                for nested in payload["actions"]:
                    nested_parsed = parse_pen_action(nested)
                    if nested_parsed:
                        pen_actions.append(nested_parsed)
                        print(
                            "Pen stroke received from aggregate payload with"
                            f" {len(nested_parsed.points)} points"
                        )
                        handled = True

            if not handled:
                print(f"Skipping unsupported action payload: {payload}")
    except Exception as exc:  # pragma: no cover - runtime errors
        print(f"Agent request failed: {exc}", file=sys.stderr)
        return 1, None

    pen_bounds = extract_pen_bounds(pen_actions, width, height)
    if not pen_actions:
        print("The agent response did not contain any completed pen strokes.")
        print("Saving copy of the original image.")
        annotated = image
    else:
        try:
            annotated = render_pen_actions(image, pen_actions)
        except Exception as exc:
            print(f"Failed to render pen strokes: {exc}", file=sys.stderr)
            return 1, None

    output_path.parent.mkdir(parents=True, exist_ok=True)

    image_to_save = annotated
    suffix = output_path.suffix.lower()
    if suffix in {".jpg", ".jpeg"} and annotated.mode == "RGBA":
        background = Image.new("RGB", annotated.size, (255, 255, 255))
        alpha = annotated.split()[-1]
        background.paste(annotated, mask=alpha)
        image_to_save = background

    image_to_save.save(output_path)
    print(f"Annotated image saved to {output_path}")
    record = {
        "input_image": str(input_path),
        "input_name": input_path.name,
        "output_image": str(output_path),
        "output_name": output_path.name,
        "prompt": prompt,
        "model": args.model,
        "endpoint": endpoint,
        "session_id": session_id,
        "image_size": {"width": width, "height": height},
        "scale": scale,
        "pen_actions": len(pen_actions),
        "predictions": serialize_pen_predictions(pen_actions, pen_bounds, width, height),
    }

    return 0, record


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = parse_args(argv)

    if args.input_dir:
        if args.output_dir is None:
            print("Error: --output-dir is required when using --input-dir", file=sys.stderr)
            return 1

        exts = [ext.strip().lower() for ext in args.extensions.split(',') if ext.strip()]
        images = sorted(
            p for p in args.input_dir.glob('**/*')
            if p.is_file() and p.suffix.lower() in exts
        )

        if not images:
            print(f"No images found in {args.input_dir} for extensions {exts}", file=sys.stderr)
            return 1

        timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
        model_slug = args.model.replace('/', '_')
        final_output_dir = args.output_dir / f"{timestamp}_{model_slug}"
        final_output_dir.mkdir(parents=True, exist_ok=True)
        failures = 0
        batch_records: List[Dict[str, object]] = []
        for img_path in images:
            rel = img_path.relative_to(args.input_dir)
            out_path = final_output_dir / rel.with_suffix('.png')
            out_path.parent.mkdir(parents=True, exist_ok=True)
            print(f"\n=== Processing {img_path} ===")
            status, record = process_image(img_path, args.prompt, out_path, args)
            if status != 0:
                failures += 1
                continue
            if record:
                batch_records.append(record)

        if failures:
            print(f"Completed with {failures} failures.")
            # Save predictions collected so far even if some failures occurred.
        if batch_records:
            log_path = args.log_json or (final_output_dir / "predictions.json")
            log_payload = {
                "created": datetime.utcnow().isoformat(timespec="seconds") + "Z",
                "model": args.model,
                "prompt": args.prompt,
                "endpoint": ensure_endpoint(args.endpoint),
                "input_dir": str(args.input_dir),
                "output_dir": str(final_output_dir),
                "total_images": len(images),
                "processed_images": len(batch_records),
                "failures": failures,
                "images": batch_records,
            }
            log_path.parent.mkdir(parents=True, exist_ok=True)
            with log_path.open("w", encoding="utf-8") as handle:
                json.dump(log_payload, handle, indent=2)
            print(f"Prediction log saved to {log_path}")

        if failures:
            return 1
        print(f"Batch processing complete. Outputs in {final_output_dir}")
        return 0

    if not args.input_image or not args.output_image:
        print("Error: input_image and output_image are required in single image mode", file=sys.stderr)
        return 1

    status, record = process_image(Path(args.input_image), args.prompt, Path(args.output_image), args)
    if status == 0 and args.log_json and record:
        log_payload = {
            "created": datetime.utcnow().isoformat(timespec="seconds") + "Z",
            "model": args.model,
            "prompt": args.prompt,
            "endpoint": ensure_endpoint(args.endpoint),
            "input_image": str(args.input_image),
            "output_image": str(args.output_image),
            "images": [record],
        }
        args.log_json.parent.mkdir(parents=True, exist_ok=True)
        with args.log_json.open("w", encoding="utf-8") as handle:
            json.dump(log_payload, handle, indent=2)
        print(f"Prediction log saved to {args.log_json}")

    return status


if __name__ == "__main__":
    sys.exit(main())
