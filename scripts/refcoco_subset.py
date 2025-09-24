#!/usr/bin/env python3
"""Create a tiny, visualisable subset of the RefCOCO dataset.

Given the standard RefCOCO resources (the pickled refs file and the COCO
instances annotations) plus the MS-COCO 2014 images, this script selects a
fixed number of unique images, draws the ground-truth boxes, and writes the
visualisations and metadata to an output directory.

Usage example
-------------

Assuming the RefCOCO files live in ``~/data/refcoco``::

    python scripts/refcoco_subset.py \
        --refcoco-root ~/data/refcoco \
        --split val \
        --count 50 \
        --output-dir ~/data/refcoco_subset

The output directory will contain ``png`` files with overlaid boxes and a
``metadata.json`` file with the raw annotations used to render the boxes.

This script never attempts to download anything; see the accompanying
instructions in ``notes/refcoco_subset.md`` for download links.
"""

from __future__ import annotations

import argparse
import json
import pickle
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

from PIL import Image, ImageDraw, ImageFont
from pycocotools.coco import COCO


@dataclass
class RefExample:
    """Container tying a referring expression to its annotation."""

    ref_id: int
    image_id: int
    ann_id: int
    sentences: List[str]
    category_id: int


def load_refs(ref_path: Path, split: str) -> List[RefExample]:
    if ref_path.suffix in {'.p', '.pickle'}:
        refs = pickle.load(ref_path.open('rb'), encoding='latin1')
    else:
        refs = json.load(ref_path.open('r', encoding='utf-8'))
    examples: List[RefExample] = []
    for ref in refs:
        if split != 'all' and ref.get('split') != split:
            continue
        examples.append(
            RefExample(
                ref_id=ref['ref_id'],
                image_id=ref['image_id'],
                ann_id=ref['ann_id'],
                sentences=[s['sent'] for s in ref['sentences']],
                category_id=ref['category_id'],
            )
        )
    return examples


def resolve_image_path(image_root: Path, file_name: str) -> Path:
    # Images live inside train2014/val2014/test2015
    for split in ("train2014", "val2014", "test2014", "test2015"):
        if split in file_name:
            candidate = image_root / split / file_name
            if candidate.exists():
                return candidate
    candidate = image_root / file_name
    if candidate.exists():
        return candidate
    raise FileNotFoundError(f"Cannot resolve path for {file_name}")


def draw_boxes(
    image_path: Path,
    anns: Iterable[Dict],
    output_path: Path,
    captions: Dict[int, List[str]],
) -> None:
    with Image.open(image_path).convert("RGB") as im:
        draw = ImageDraw.Draw(im)
        font = None
        try:
            font = ImageFont.truetype("arial.ttf", size=14)
        except OSError:
            font = ImageFont.load_default()

        for ann in anns:
            bbox = ann['bbox']  # [x, y, w, h]
            x, y, w, h = bbox
            x2, y2 = x + w, y + h
            draw.rectangle((x, y, x2, y2), outline="red", width=3)

            label_lines = captions.get(ann['id'], [])
            if label_lines:
                text = label_lines[0]
                text_bg = draw.textbbox((x, y), text, font=font)
                draw.rectangle(text_bg, fill=(0, 0, 0, 160))
                draw.text((x + 2, y + 2), text, fill="white", font=font)

        im.save(output_path, format=output_path.suffix.lstrip('.').upper())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--refcoco-root", type=Path, required=True,
                        help="Directory containing refs(unc).p and annotations")
    parser.add_argument("--split", default="val", choices=["train", "val", "testA", "testB", "all"],
                        help="Split to sample from")
    parser.add_argument("--count", type=int, default=50,
                        help="Number of unique images to sample")
    parser.add_argument("--seed", type=int, default=0,
                        help="Random seed for reproducibility")
    parser.add_argument("--output-dir", type=Path, required=True,
                        help="Where to store the subset")
    parser.add_argument("--image-root", type=Path, default=None,
                        help="Optional override for the MS-COCO image directory")
    args = parser.parse_args()

    refs_path = args.refcoco_root / "refs(unc).p"
    ann_path = args.refcoco_root / "instances.json"
    image_root = args.image_root or (args.refcoco_root / "images")

    if not refs_path.exists():
        alternatives = sorted(args.refcoco_root.glob("refs(unc).*"))
        if alternatives:
            refs_path = alternatives[0]
        else:
            raise FileNotFoundError(
                f"Missing refs file at {refs_path}; place refs(unc).p or refs(unc).json in {args.refcoco_root}"
            )
    if not ann_path.exists():
        raise FileNotFoundError(f"Missing COCO annotation file at {ann_path}")

    refs = load_refs(refs_path, args.split)
    if not refs:
        raise RuntimeError(f"No references found for split '{args.split}'")

    random.seed(args.seed)

    refs_by_image: Dict[int, List[RefExample]] = {}
    for ref in refs:
        refs_by_image.setdefault(ref.image_id, []).append(ref)

    image_ids = sorted(refs_by_image.keys())
    if len(image_ids) < args.count:
        raise RuntimeError(f"Requested {args.count} images but only {len(image_ids)} available")

    sampled_image_ids = random.sample(image_ids, args.count)

    coco = COCO(str(ann_path))

    output_dir = args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    metadata: Dict[str, Dict] = {}

    for image_id in sampled_image_ids:
        img_info = coco.loadImgs(image_id)[0]
        file_name = img_info['file_name']
        image_path = resolve_image_path(image_root, file_name)

        relevant_refs = refs_by_image[image_id]
        ann_ids = [ref.ann_id for ref in relevant_refs]
        ann_records = coco.loadAnns(ann_ids)

        caption_map: Dict[int, List[str]] = {}
        for ref in relevant_refs:
            caption_map.setdefault(ref.ann_id, []).extend(ref.sentences)

        out_file = output_dir / f"{image_id}_{file_name.replace('.jpg', '.png')}"
        draw_boxes(image_path, ann_records, out_file, caption_map)

        metadata[out_file.name] = {
            "image_id": image_id,
            "file_name": file_name,
            "annotations": [
                {
                    "ann_id": ann['id'],
                    "bbox": ann['bbox'],
                    "category_id": ann['category_id'],
                    "sentences": caption_map.get(ann['id'], []),
                }
                for ann in ann_records
            ],
        }

    with (output_dir / "metadata.json").open('w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)

    print(f"Wrote {len(sampled_image_ids)} annotated images to {output_dir}")


if __name__ == "__main__":
    main()
