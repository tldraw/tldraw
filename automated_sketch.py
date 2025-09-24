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
import sys
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

import requests
from PIL import Image, ImageDraw

DEFAULT_ENDPOINT = "http://localhost:8787/stream"
DEFAULT_MODEL = "claude-4-sonnet"
PEN_ALPHA = 255
FILL_ALPHA = 190
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

        center_x = (min_x + max_x) / 2
        center_y = (min_y + max_y) / 2
        side = max(max_x - min_x, max_y - min_y)

        half = side / 2
        left = round(center_x - half)
        top = round(center_y - half)
        right = round(center_x + half)
        bottom = round(center_y + half)

        left = max(0, left)
        top = max(0, top)
        right = min(canvas.width - 1, right)
        bottom = min(canvas.height - 1, bottom)

        stroke = (*action.color, PEN_ALPHA)
        width = base_width if action.style == "smooth" else max(1, base_width - 1)

        drawer.rectangle([(left, top), (right, bottom)], outline=stroke, width=width, fill=None)

    return canvas


def ensure_endpoint(endpoint: str) -> str:
    return endpoint if endpoint.endswith("/stream") else f"{endpoint.rstrip('/')}/stream"


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Automatically draw on an image with the tldraw agent")
    parser.add_argument("input_image", help="Path to background image")
    parser.add_argument("prompt", help="Instruction for the agent")
    parser.add_argument("output_image", help="Destination for the annotated image")
    parser.add_argument("--endpoint", default=DEFAULT_ENDPOINT,
                        help=f"Agent stream endpoint (default: {DEFAULT_ENDPOINT})")
    parser.add_argument("--session", default=None,
                        help="Session identifier for the worker (default: random)")
    parser.add_argument("--model", default=DEFAULT_MODEL,
                        help=f"Agent model name (default: {DEFAULT_MODEL})")
    parser.add_argument("--timeout", type=int, default=90,
                        help="Request timeout in seconds (default: 90)")
    return parser.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = parse_args(argv)

    input_path = Path(args.input_image)
    output_path = Path(args.output_image)

    try:
        image, data_url, width, height, scale = load_image(input_path)
    except Exception as exc:  # pragma: no cover - argument validation
        print(f"Error loading input image: {exc}", file=sys.stderr)
        return 1

    print(f"Using screenshot dimensions: {width}x{height} (scale factor {scale:.3f})")

    prompt = build_prompt(args.prompt, data_url, width, height, args.model)
    endpoint = ensure_endpoint(args.endpoint)

    session_id = args.session or uuid.uuid4().hex
    if '?' in endpoint:
        endpoint_with_session = f"{endpoint}&sessionId={session_id}"
    else:
        endpoint_with_session = f"{endpoint}?sessionId={session_id}"

    print(f"Connecting to worker at {endpoint_with_session}...")

    pen_actions: List[PenAction] = []
    try:
        for payload in stream_actions(endpoint_with_session, prompt, args.timeout):
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
        return 1

    if not pen_actions:
        print("The agent response did not contain any completed pen strokes.")
        print("Saving copy of the original image.")
        annotated = image
    else:
        annotated = render_pen_actions(image, pen_actions)

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
    return 0


if __name__ == "__main__":
    sys.exit(main())
