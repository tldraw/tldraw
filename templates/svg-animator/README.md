# SVG Animator

A tldraw template with two independent capabilities:

1. **Fill path generation** — Takes SVG shapes, finds closed paths, and generates CNC-style toolpaths (like an embroidery machine or pocket mill) to fill them.
2. **Path animation** — Animates drawing a path as a tldraw draw shape with simulated pen pressure, configurable speed, and easing.

## Running

From the repo root:

```bash
yarn dev-template svg-animator
```

Or standalone:

```bash
cd templates/svg-animator
npx vite
```

## Usage

1. **Upload an SVG** — Drag-and-drop, click to browse, or hit "Load sample SVG" to use the included star/circle/rect sample.
2. **Tweak fill settings** — Pick a strategy, adjust step over, angle, margin.
3. **Click "Generate fill"** — The fill path appears as a red draw shape overlaying the black polygon outline.
4. **Click "Animate"** — Clears the static fill and re-draws it progressively with pressure simulation.

## Fill strategies

| Strategy | Description | Key params |
|----------|-------------|------------|
| **Zigzag** | Parallel hatching lines clipped to the polygon boundary, connected end-to-end. Like CNC pocket clearing or embroidery fill. | `angle` (line direction), `stepOver` (line spacing), `margin` (inset from edge), `connectEnds` |
| **Contour** | Concentric inward offsets of the polygon boundary, connected into a continuous spiral. Like contour milling. | `stepOver` (offset distance), `margin` (initial inset) |

## Using the libraries standalone

The two modules under `src/lib/` have no dependency on tldraw or React and can be used independently.

### Fill path generation

```ts
import { generateFillPaths, generateFillPath, parseSvg } from './lib/fill-path'

// From an SVG string — returns one fill path per closed shape found
const results = generateFillPaths(svgString, {
  strategy: 'zigzag',
  stepOver: 5,    // px between fill lines
  angle: 45,      // degrees
  margin: 2,      // px inset from boundary
  connectEnds: true,
})

// results[0].polygon — the source polygon
// results[0].path    — Point[] of the fill toolpath

// Or work with polygons directly
const polygons = parseSvg(svgString)
const path = generateFillPath(polygons[0], { strategy: 'contour', stepOver: 4 })
```

### Adding a custom fill strategy

```ts
import { registerStrategy } from './lib/fill-path'

registerStrategy('spiral', {
  name: 'spiral',
  generate(polygon, options) {
    // Return Point[] — a single continuous path filling the polygon
    return myCustomSpiralFill(polygon.points, options.stepOver)
  },
})
```

### Path animation

```ts
import { applyPressure, animatePath } from './lib/path-animator'
import { EASING_FUNCTIONS } from './lib/path-animator'

// Add simulated pressure to any point array
const pressured = applyPressure(points, {
  basePressure: 0.5,
  pressureVariation: 0.15,
  pressureFrequency: 0.08,
  seed: 42,
})

// Animate on a tldraw editor (needs helpers to stay framework-agnostic)
const anim = animatePath(editor, points, {
  duration: 3000,
  easing: EASING_FUNCTIONS.easeInOutCubic,
  pressure: { basePressure: 0.5, pressureVariation: 0.2, pressureFrequency: 0.1, seed: 7 },
  segmentType: 'free',
  onProgress: (p) => console.log(`${(p * 100).toFixed(0)}%`),
  onComplete: () => console.log('done'),
}, {
  createShapeId: () => createShapeId(),
  encodePoints: (pts) => b64Vecs.encodePoints(pts),
})

// Cancel early
anim.stop()
```

## SVG support

The parser handles these SVG elements:

- `<path>` — Full `d` attribute parsing (M, L, H, V, C, S, Q, T, A, Z, plus relative variants). Curves are flattened to line segments.
- `<polygon>` / `<polyline>` (if closed)
- `<rect>`, `<circle>`, `<ellipse>`
- Basic `transform` attributes (translate, scale, rotate, matrix)

Only closed shapes produce fill paths. Open paths are ignored.

## File structure

```
src/
├── lib/
│   ├── fill-path/            # SVG parsing + fill generation (no tldraw dependency)
│   │   ├── index.ts          # Main API
│   │   ├── types.ts          # Point, Polygon, FillOptions
│   │   ├── svg-parser.ts     # SVG string → Polygon[]
│   │   ├── polygon-utils.ts  # Geometry helpers
│   │   └── strategies/
│   │       ├── zigzag.ts     # Linear hatching
│   │       └── contour.ts    # Offset contours
│   └── path-animator/        # Path animation (no tldraw dependency)
│       ├── index.ts          # applyPressure, animatePath
│       ├── types.ts          # AnimationOptions, PressureOptions
│       ├── easing.ts         # 12 easing functions
│       └── pressure.ts       # Layered sine-wave pressure sim
├── components/               # React UI controls
│   ├── SvgUploader.tsx
│   ├── FillControls.tsx
│   └── AnimationControls.tsx
└── App.tsx                   # Wires everything together with tldraw
```
