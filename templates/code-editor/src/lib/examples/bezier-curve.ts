export const name = 'Bezier curve'

export const code = `// Here's a flower made using bezier curves
// Double-click any curve to edit it and drag the control handles!

const cx = 400  // Center X
const cy = 280  // Center Y
const size = 120 // Petal size

// Create 6 petals radiating from center
for (let i = 0; i < 6; i++) {
  const angle = (i * Math.PI) / 3
  const nextAngle = angle + Math.PI / 3

  // Direction vectors
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  const ndx = Math.cos(nextAngle)
  const ndy = Math.sin(nextAngle)

  // Each petal curves outward and back
  canvas.createBezier(cx, cy, {
    start: { x: 0, y: 0 },
    cp1: { x: dx * size * 1.8, y: dy * size * 1.8 },
    cp2: { x: ndx * size * 1.8, y: ndy * size * 1.8 },
    end: { x: 0, y: 0 }
  })
}

// Inner petals nested inside the outer ones
for (let i = 0; i < 6; i++) {
  const angle = (i * Math.PI) / 3
  const nextAngle = angle + Math.PI / 3

  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  const ndx = Math.cos(nextAngle)
  const ndy = Math.sin(nextAngle)

  // Smaller petal inside each outer petal
  canvas.createBezier(cx, cy, {
    start: { x: 0, y: 0 },
    cp1: { x: dx * size * 0.9, y: dy * size * 0.9 },
    cp2: { x: ndx * size * 0.9, y: ndy * size * 0.9 },
    end: { x: 0, y: 0 }
  })
}

canvas.zoomToFit({ animation: { duration: 400 } })`
