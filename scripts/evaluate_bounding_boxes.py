#!/usr/bin/env python3
"""Evaluate predicted bounding boxes against COCO ground truth annotations."""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple


DEFAULT_GT_PATH = Path("datasets/coco/val_subset_people_50/metadata.json")


@dataclass
class BoxMatch:
    prediction_index: int
    ground_truth_index: int
    iou: float


def load_ground_truth(path: Path, category_id: Optional[int]) -> Dict[str, List[List[float]]]:
    if not path.exists():
        raise FileNotFoundError(f"Ground truth file '{path}' not found")

    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)

    images: Dict[str, List[List[float]]] = {}
    for entry in data.values():
        file_name = entry.get("file_name")
        if not file_name:
            continue
        boxes: List[List[float]] = []
        for ann in entry.get("annotations", []):
            if category_id is not None and ann.get("category_id") != category_id:
                continue
            bbox = ann.get("bbox")
            if not bbox:
                continue
            boxes.append([float(coord) for coord in bbox])
        images[file_name] = boxes

    return images


def load_predictions(path: Path) -> Dict[str, List[List[float]]]:
    if not path.exists():
        raise FileNotFoundError(f"Predictions file '{path}' not found")

    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)

    images: Dict[str, List[List[float]]] = {}
    entries = payload.get("images", [])
    if not isinstance(entries, list):
        raise ValueError("Predictions JSON must contain an 'images' list")

    for entry in entries:
        input_name = entry.get("input_name")
        input_image = entry.get("input_image")
        if not input_name and input_image:
            input_name = Path(input_image).name
        if not input_name:
            continue

        boxes: List[List[float]] = []
        for pred in entry.get("predictions", []):
            bbox = pred.get("clamped_bbox")
            if not bbox:
                continue
            boxes.append([float(coord) for coord in bbox])
        images[input_name] = boxes

    return images


def compute_iou(box_a: List[float], box_b: List[float]) -> float:
    ax1, ay1, aw, ah = box_a
    bx1, by1, bw, bh = box_b

    ax2 = ax1 + aw
    ay2 = ay1 + ah
    bx2 = bx1 + bw
    by2 = by1 + bh

    inter_x1 = max(ax1, bx1)
    inter_y1 = max(ay1, by1)
    inter_x2 = min(ax2, bx2)
    inter_y2 = min(ay2, by2)

    inter_w = max(0.0, inter_x2 - inter_x1)
    inter_h = max(0.0, inter_y2 - inter_y1)
    inter_area = inter_w * inter_h

    if inter_area <= 0.0:
        return 0.0

    area_a = max(0.0, aw) * max(0.0, ah)
    area_b = max(0.0, bw) * max(0.0, bh)
    union = area_a + area_b - inter_area
    if union <= 0.0:
        return 0.0
    return inter_area / union


def match_boxes(
    predictions: List[List[float]],
    ground_truth: List[List[float]],
    iou_threshold: float,
) -> Tuple[List[BoxMatch], List[int], List[int]]:
    if not predictions or not ground_truth:
        return [], list(range(len(predictions))), list(range(len(ground_truth)))

    scored_pairs: List[Tuple[float, int, int]] = []
    for pred_idx, pred in enumerate(predictions):
        for gt_idx, gt in enumerate(ground_truth):
            iou = compute_iou(pred, gt)
            if iou > 0.0:
                scored_pairs.append((iou, pred_idx, gt_idx))

    scored_pairs.sort(reverse=True)

    matches: List[BoxMatch] = []
    used_preds: set[int] = set()
    used_gts: set[int] = set()

    for iou, pred_idx, gt_idx in scored_pairs:
        if iou < iou_threshold:
            continue
        if pred_idx in used_preds or gt_idx in used_gts:
            continue
        matches.append(BoxMatch(pred_idx, gt_idx, iou))
        used_preds.add(pred_idx)
        used_gts.add(gt_idx)

    unmatched_preds = [idx for idx in range(len(predictions)) if idx not in used_preds]
    unmatched_gts = [idx for idx in range(len(ground_truth)) if idx not in used_gts]

    return matches, unmatched_preds, unmatched_gts


def evaluate_dataset(
    predictions: Dict[str, List[List[float]]],
    ground_truth: Dict[str, List[List[float]]],
    iou_threshold: float,
    exclude_zero_predictions: bool = True,
) -> Tuple[Dict[str, object], Dict[str, object]]:
    per_image: Dict[str, object] = {}
    total_matches = 0
    total_predictions = 0
    total_ground_truth = 0
    iou_sum = 0.0
    images_used_for_evaluation = 0

    image_names = set(predictions.keys()) | set(ground_truth.keys())

    for name in sorted(image_names):
        preds = predictions.get(name, [])
        gts = ground_truth.get(name, [])

        # Skip images with zero predictions if flag is set
        if exclude_zero_predictions and len(preds) == 0:
            continue

        matches, unmatched_preds, unmatched_gts = match_boxes(preds, gts, iou_threshold)

        image_match_count = len(matches)
        image_iou_sum = sum(match.iou for match in matches)

        per_image[name] = {
            "ground_truth": len(gts),
            "predictions": len(preds),
            "matches": image_match_count,
            "mean_iou": image_iou_sum / image_match_count if image_match_count else 0.0,
            "unmatched_ground_truth": len(unmatched_gts),
            "unmatched_predictions": len(unmatched_preds),
            "matches_detail": [
                {
                    "prediction_index": match.prediction_index,
                    "ground_truth_index": match.ground_truth_index,
                    "iou": match.iou,
                }
                for match in matches
            ],
        }

        total_matches += image_match_count
        total_predictions += len(preds)
        total_ground_truth += len(gts)
        iou_sum += image_iou_sum
        images_used_for_evaluation += 1

    precision = total_matches / total_predictions if total_predictions else 0.0
    recall = total_matches / total_ground_truth if total_ground_truth else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if precision + recall else 0.0

    summary = {
        "images_total": len(image_names),
        "images_used_for_evaluation": images_used_for_evaluation,
        "total_predictions": total_predictions,
        "total_ground_truth": total_ground_truth,
        "matches": total_matches,
        "mean_iou": iou_sum / total_matches if total_matches else 0.0,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "iou_threshold": iou_threshold,
    }

    return summary, per_image


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Compare predicted bounding boxes to COCO ground truth")
    parser.add_argument(
        "--ground-truth",
        type=Path,
        default=DEFAULT_GT_PATH,
        help="Path to COCO-style ground truth metadata JSON",
    )
    parser.add_argument(
        "--predictions",
        type=Path,
        required=True,
        help="Path to prediction log produced by automated_sketch.py",
    )
    parser.add_argument(
        "--iou-threshold",
        type=float,
        default=0.5,
        help="IoU threshold for counting a match (default: 0.5)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Optional path to write detailed evaluation results as JSON",
    )
    parser.add_argument(
        "--category-id",
        type=int,
        default=None,
        help="Filter ground truth annotations to a specific COCO category id",
    )
    parser.add_argument(
        "--exclude-zero-predictions",
        action="store_true",
        default=True,
        help="Exclude images with zero predictions from evaluation metrics (default: True)",
    )
    parser.add_argument(
        "--include-zero-predictions",
        action="store_false",
        dest="exclude_zero_predictions",
        help="Include images with zero predictions in evaluation metrics",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    ground_truth = load_ground_truth(args.ground_truth, args.category_id)
    predictions = load_predictions(args.predictions)

    summary, per_image = evaluate_dataset(predictions, ground_truth, args.iou_threshold, args.exclude_zero_predictions)

    print("Evaluation Summary:")
    print(json.dumps(summary, indent=2))

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with args.output.open("w", encoding="utf-8") as handle:
            json.dump({"summary": summary, "per_image": per_image}, handle, indent=2)
        print(f"Detailed results saved to {args.output}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
