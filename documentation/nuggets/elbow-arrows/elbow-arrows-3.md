---
title: Elbow arrows
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - elbow
  - arrows
  - routing
---

# Elbow arrows

When routing an elbow arrow between two shapes, there are often multiple valid paths. Both edges could work. Different wrapping directions could produce equivalent results. The obvious solution—pick the shortest path—turns out to be insufficient. If two routes have the same length, you need a tiebreaker. Without one, arrows flicker as you drag shapes around, switching between equally valid options.

We use a cascade of heuristics: prefer fewer corners, then prefer shorter Manhattan distance, then bias towards down and right. The third rule is what prevents flickering.

## The primary heuristic

When shapes are separated, we first check if there's a clearly preferred axis:

```typescript
if (Math.abs(info.gapX) + 1 > Math.abs(info.gapY) && info.midX !== null) {
  // +1 bias towards x-axis to prevent flicker at 45 degrees
  if (info.gapX > 0) {
    idealRoute = tryRouteArrow(info, 'right', 'left')
  } else {
    idealRoute = tryRouteArrow(info, 'left', 'right')
  }
}
```

The `+ 1` bias means that at exactly 45 degrees (where `gapX` equals `gapY`), we choose the horizontal route. Without this bias, dragging a shape near 45 degrees causes the arrow to oscillate between horizontal-primary and vertical-primary routing as floating-point rounding tips the calculation one way or the other.

## Corner case detection

Before applying the general heuristic, we check for special geometric arrangements. If the right edge of shape A can reach the top edge of shape B with a simple two-segment path, that's almost always what you want:

```typescript
if (
  aRight &&
  bTop &&
  (aRight.expanded ?? aRight.value) <= bTop.crossTarget &&
  aRight.crossTarget <= (bTop.expanded ?? bTop.value)
) {
  idealRoute = tryRouteArrow(info, 'right', 'top')
}
```

These corner cases produce the cleanest routes—just one turn instead of wrapping around obstacles. The geometry check confirms the edges can "see" each other without obstruction.

## Measuring route quality

When comparing routes, we use Manhattan distance: the sum of all horizontal and vertical segments. This aligns with how elbow arrows actually move—they can't take diagonal shortcuts.

```typescript
function measureRouteManhattanDistance(path: VecLike[]): number {
  let distance = 0
  for (let i = 0; i < path.length - 1; i++) {
    const start = path[i]
    const end = path[i + 1]
    distance += Math.abs(end.x - start.x) + Math.abs(end.y - start.y)
  }
  return distance
}
```

A route with 4 points has 3 segments. A route with 6 points has 5 segments. More corners usually means a longer, more awkward path—but not always. Sometimes wrapping around produces more corners but shorter total distance.

## Tie-breaking with bias

When multiple routes have the same corner count and similar distance, we need a tiebreaker:

```typescript
function pickBest(info, edges) {
  let bestRoute = null
  let bestCornerCount = Infinity
  let bestDistance = Infinity
  let distanceBias = 0

  for (const [aSide, bSide] of edges) {
    distanceBias += 1  // increasing bias for later candidates
    const route = tryRouteArrow(info, aSide, bSide)

    if (route) {
      if (route.points.length < bestCornerCount) {
        bestCornerCount = route.points.length
        bestDistance = route.distance
        bestRoute = route
      } else if (
        route.points.length === bestCornerCount &&
        route.distance + distanceBias < bestDistance
      ) {
        bestDistance = route.distance
        bestRoute = route
      }
    }
  }

  return bestRoute
}
```

The `distanceBias` increments with each candidate we consider. This means later candidates in the list need to be noticeably shorter to win. The effect is subtle—just one pixel of bias per position—but it's enough to prevent ties from causing oscillation.

The candidate order itself encodes preference. We check right-to-left before left-to-right, down-to-up before up-to-down. This directional bias (preferring down and right over up and left) makes routes feel more natural for left-to-right, top-to-bottom layouts.

## The bias vector

The bias shows up in one more place: when calculating route distance for certain patterns, we add a directional penalty:

```typescript
// prefer down/right when routing arrows
this.bias = new Vec(1, 1)
```

Routes that go down or right get a slight distance bonus compared to routes that go up or left. The magnitude is small—it won't override a significantly shorter path—but when routes are nearly identical, it tips the scale.

## Why this cascade works

Fewer corners beats everything. If one route has 4 points and another has 6, the 4-point route wins regardless of distance.

Among routes with the same corner count, shorter distance wins. But the distance comparison includes the bias, so we're really comparing "distance in the preferred direction."

If distance is still tied after bias, the candidate order breaks the tie. Earlier candidates win, and we've ordered them to prefer rightward and downward routing.

The result is that dragging shapes around feels stable. Arrows don't twitch between equivalent paths because there are no equivalent paths—every tie has a defined breaker.

## What about perfect 45 degrees?

The most fragile case is when two shapes sit at exactly 45 degrees from each other. In theory, horizontal-first and vertical-first routes have identical geometry. In practice, floating-point arithmetic rarely produces exact ties, but it gets close enough that without bias, arrows would flicker as rounding errors tip the calculation.

The `+ 1` in the gap comparison, the directional bias vector, and the incrementing `distanceBias` all work together to ensure that one route is always strictly preferred, even when the geometric difference is imperceptible.

## Where this lives

The route selection logic is in `packages/tldraw/src/lib/shapes/arrow/elbow/routes/routeArrowWithAutoEdgePicking.tsx`. The `pickBest` function handles tie-breaking. The bias vector is defined in `packages/tldraw/src/lib/shapes/arrow/elbow/routes/ElbowArrowWorkingInfo.ts`. Distance calculation is in `packages/tldraw/src/lib/shapes/arrow/elbow/routes/ElbowArrowRouteBuilder.ts`.

The cascade of heuristics isn't elegant, but it's necessary. A single "best" metric doesn't exist for arrow routing—you need a sequence of increasingly subtle rules to handle all the cases where geometry alone doesn't give a clear answer.
