import { Bounds, BoundsSnapshot, ShapeBounds } from "types"

export function stretchshapesX(shapes: ShapeBounds[]) {
  const [first, ...rest] = shapes
  let min = first.minX
  let max = first.minX + first.width
  for (let box of rest) {
    min = Math.min(min, box.minX)
    max = Math.max(max, box.minX + box.width)
  }
  return shapes.map((box) => ({ ...box, x: min, width: max - min }))
}

export function stretchshapesY(shapes: ShapeBounds[]) {
  const [first, ...rest] = shapes
  let min = first.minY
  let max = first.minY + first.height
  for (let box of rest) {
    min = Math.min(min, box.minY)
    max = Math.max(max, box.minY + box.height)
  }
  return shapes.map((box) => ({ ...box, y: min, height: max - min }))
}

export function distributeshapesX(shapes: ShapeBounds[]) {
  const len = shapes.length
  const sorted = [...shapes].sort((a, b) => a.minX - b.minX)
  let min = sorted[0].minX

  sorted.sort((a, b) => a.minX + a.width - b.minX - b.width)
  let last = sorted[len - 1]
  let max = last.minX + last.width

  let range = max - min
  let step = range / len
  return sorted.map((box, i) => ({ ...box, x: min + step * i }))
}

export function distributeshapesY(shapes: ShapeBounds[]) {
  const len = shapes.length
  const sorted = [...shapes].sort((a, b) => a.minY - b.minY)
  let min = sorted[0].minY

  sorted.sort((a, b) => a.minY + a.height - b.minY - b.height)
  let last = sorted[len - 1]
  let max = last.minY + last.height

  let range = max - min
  let step = range / len
  return sorted.map((box, i) => ({ ...box, y: min + step * i }))
}

export function alignshapesCenterX(shapes: ShapeBounds[]) {
  let midX = 0
  for (let box of shapes) midX += box.minX + box.width / 2
  midX /= shapes.length
  return shapes.map((box) => ({ ...box, x: midX - box.width / 2 }))
}

export function alignshapesCenterY(shapes: ShapeBounds[]) {
  let midY = 0
  for (let box of shapes) midY += box.minY + box.height / 2
  midY /= shapes.length
  return shapes.map((box) => ({ ...box, y: midY - box.height / 2 }))
}

export function alignshapesTop(shapes: ShapeBounds[]) {
  const [first, ...rest] = shapes
  let y = first.minY
  for (let box of rest) if (box.minY < y) y = box.minY
  return shapes.map((box) => ({ ...box, y }))
}

export function alignshapesBottom(shapes: ShapeBounds[]) {
  const [first, ...rest] = shapes
  let maxY = first.minY + first.height
  for (let box of rest)
    if (box.minY + box.height > maxY) maxY = box.minY + box.height
  return shapes.map((box) => ({ ...box, y: maxY - box.height }))
}

export function alignshapesLeft(shapes: ShapeBounds[]) {
  const [first, ...rest] = shapes
  let x = first.minX
  for (let box of rest) if (box.minX < x) x = box.minX
  return shapes.map((box) => ({ ...box, x }))
}

export function alignshapesRight(shapes: ShapeBounds[]) {
  const [first, ...rest] = shapes
  let maxX = first.minX + first.width
  for (let box of rest)
    if (box.minX + box.width > maxX) maxX = box.minX + box.width
  return shapes.map((box) => ({ ...box, x: maxX - box.width }))
}

// Resizers

export function getBoundingBox(shapes: ShapeBounds[]): Bounds {
  if (shapes.length === 0) {
    return {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      width: 0,
      height: 0,
    }
  }

  const first = shapes[0]

  let minX = first.minX
  let minY = first.minY
  let maxX = first.minX + first.width
  let maxY = first.minY + first.height

  for (let box of shapes) {
    minX = Math.min(minX, box.minX)
    minY = Math.min(minY, box.minY)
    maxX = Math.max(maxX, box.minX + box.width)
    maxY = Math.max(maxY, box.minY + box.height)
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

export function getSnapshots(
  shapes: ShapeBounds[],
  bounds: Bounds
): Record<string, BoundsSnapshot> {
  const acc = {} as Record<string, BoundsSnapshot>

  const w = bounds.maxX - bounds.minX
  const h = bounds.maxY - bounds.minY

  for (let box of shapes) {
    acc[box.id] = {
      ...box,
      nx: (box.minX - bounds.minX) / w,
      ny: (box.minY - bounds.minY) / h,
      nmx: 1 - (box.minX + box.width - bounds.minX) / w,
      nmy: 1 - (box.minY + box.height - bounds.minY) / h,
      nw: box.width / w,
      nh: box.height / h,
    }
  }

  return acc
}

export function getEdgeResizer(shapes: ShapeBounds[], edge: number) {
  const initial = getBoundingBox(shapes)
  const snapshots = getSnapshots(shapes, initial)
  const mshapes = [...shapes]

  let { minX: x0, minY: y0, maxX: x1, maxY: y1 } = initial
  let { minX: mx, minY: my } = initial
  let mw = x1 - x0
  let mh = y1 - y0

  return function edgeResize({ x, y }) {
    if (edge === 0 || edge === 2) {
      edge === 0 ? (y0 = y) : (y1 = y)
      my = y0 < y1 ? y0 : y1
      mh = Math.abs(y1 - y0)
      for (let box of mshapes) {
        const { ny, nmy, nh } = snapshots[box.id]
        box.minY = my + (y1 < y0 ? nmy : ny) * mh
        box.height = nh * mh
      }
    } else {
      edge === 1 ? (x1 = x) : (x0 = x)
      mx = x0 < x1 ? x0 : x1
      mw = Math.abs(x1 - x0)
      for (let box of mshapes) {
        const { nx, nmx, nw } = snapshots[box.id]
        box.minX = mx + (x1 < x0 ? nmx : nx) * mw
        box.width = nw * mw
      }
    }

    return [
      mshapes,
      {
        x: mx,
        y: my,
        width: mw,
        height: mh,
        maxX: mx + mw,
        maxY: my + mh,
      },
    ]
  }
}

/**
 * Returns a function that can be used to calculate corner resize transforms.
 * @param shapes An array of the shapes being resized.
 * @param corner A number representing the corner being dragged. Top Left: 0, Top Right: 1, Bottom Right: 2, Bottom Left: 3.
 * @example
 * const resizer = getCornerResizer(selectedshapes, 3)
 * resizer(selectedshapes, )
 */
export function getCornerResizer(shapes: ShapeBounds[], corner: number) {
  const initial = getBoundingBox(shapes)
  const snapshots = getSnapshots(shapes, initial)
  const mshapes = [...shapes]

  let { minX: x0, minY: y0, maxX: x1, maxY: y1 } = initial
  let { minX: mx, minY: my } = initial
  let mw = x1 - x0
  let mh = y1 - y0

  return function cornerResizer({ x, y }) {
    corner < 2 ? (y0 = y) : (y1 = y)
    my = y0 < y1 ? y0 : y1
    mh = Math.abs(y1 - y0)

    corner === 1 || corner === 2 ? (x1 = x) : (x0 = x)
    mx = x0 < x1 ? x0 : x1
    mw = Math.abs(x1 - x0)

    for (let box of mshapes) {
      const { nx, nmx, nw, ny, nmy, nh } = snapshots[box.id]
      box.minX = mx + (x1 < x0 ? nmx : nx) * mw
      box.minY = my + (y1 < y0 ? nmy : ny) * mh
      box.width = nw * mw
      box.height = nh * mh
    }

    return [
      mshapes,
      {
        x: mx,
        y: my,
        width: mw,
        height: mh,
        maxX: mx + mw,
        maxY: my + mh,
      },
    ]
  }
}
