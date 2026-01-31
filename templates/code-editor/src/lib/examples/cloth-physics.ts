export const name = 'Cloth Physics'

export const code = `// Cloth simulation using verlet integration

const gridW = 8, gridH = 6
const spacing = 25
const startX = 300, startY = 80
const gravity = 0.4
const damping = 0.98
const iterations = 3

// Create grid of points
const points = []
for (let y = 0; y < gridH; y++) {
  for (let x = 0; x < gridW; x++) {
    points.push({
      x: startX + x * spacing,
      y: startY + y * spacing,
      oldX: startX + x * spacing,
      oldY: startY + y * spacing,
      pinned: y === 0  // top row is pinned
    })
  }
}

// Create constraints (horizontal and vertical)
const constraints = []
for (let y = 0; y < gridH; y++) {
  for (let x = 0; x < gridW; x++) {
    const i = y * gridW + x
    // Horizontal
    if (x < gridW - 1) {
      constraints.push({ a: i, b: i + 1, len: spacing })
    }
    // Vertical
    if (y < gridH - 1) {
      constraints.push({ a: i, b: i + gridW, len: spacing })
    }
  }
}

// Create visual nodes
const nodeIds = points.map((p, i) =>
  canvas.createCircle(p.x, p.y, p.pinned ? 5 : 3, {
    color: p.pinned ? 'red' : 'blue',
    fill: 'solid'
  })
)

// Create segments using beziers
const segmentIds = constraints.map(c =>
  canvas.createBezier(points[c.a].x, points[c.a].y, {
    start: { x: 0, y: 0 },
    cp1: { x: 0, y: 0 },
    cp2: { x: spacing, y: 0 },
    end: { x: spacing, y: 0 }
  })
)

let time = 0
const interval = setInterval(() => {
  time += 0.02

  // Wind force (oscillating)
  const windX = Math.sin(time * 2) * 0.8
  const windY = Math.cos(time * 1.5) * 0.3

  // Verlet integration
  points.forEach(p => {
    if (p.pinned) return

    const vx = (p.x - p.oldX) * damping
    const vy = (p.y - p.oldY) * damping

    p.oldX = p.x
    p.oldY = p.y

    p.x += vx + windX
    p.y += vy + gravity + windY
  })

  // Constraint satisfaction
  for (let iter = 0; iter < iterations; iter++) {
    constraints.forEach(c => {
      const p1 = points[c.a]
      const p2 = points[c.b]

      const dx = p2.x - p1.x
      const dy = p2.y - p1.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const diff = c.len - dist
      const percent = diff / dist / 2

      const offsetX = dx * percent
      const offsetY = dy * percent

      if (!p1.pinned) {
        p1.x -= offsetX
        p1.y -= offsetY
      }
      if (!p2.pinned) {
        p2.x += offsetX
        p2.y += offsetY
      }
    })
  }

  // Update visuals
  const updates = []

  // Update nodes
  points.forEach((p, i) => {
    const size = p.pinned ? 5 : 3
    updates.push({
      id: nodeIds[i],
      type: 'geo',
      x: p.x - size,
      y: p.y - size
    })
  })

  // Update segments
  constraints.forEach((c, i) => {
    const p1 = points[c.a]
    const p2 = points[c.b]
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y

    // Color based on tension (stretch)
    const dist = Math.sqrt(dx * dx + dy * dy)
    const tension = Math.abs(dist - c.len) / c.len

    updates.push({
      id: segmentIds[i],
      type: 'bezier-curve',
      x: p1.x,
      y: p1.y,
      props: {
        start: { x: 0, y: 0 },
        cp1: { x: dx * 0.33, y: dy * 0.33 },
        cp2: { x: dx * 0.67, y: dy * 0.67 },
        end: { x: dx, y: dy }
      }
    })
  })

  editor.updateShapes(updates)
}, 25)

canvas.zoomToFit({ animation: { duration: 400 } })`
