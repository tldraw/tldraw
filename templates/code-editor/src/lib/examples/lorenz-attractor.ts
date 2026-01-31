export const name = 'Lorenz Attractor'

export const code = `// Lorenz attractor - chaotic "butterfly" system

const cx = 400, cy = 350
const scale = 8

// Lorenz parameters
const sigma = 10
const rho = 28
const beta = 8 / 3
const dt = 0.005

// Two particles to show sensitivity to initial conditions
const particles = [
  { x: 1, y: 1, z: 1, color: 'blue', trail: [] },
  { x: 1.001, y: 1, z: 1, color: 'red', trail: [] }  // tiny difference!
]

// Create trail shapes for each particle
const trailLen = 200
const trailIds = particles.map(p => {
  const ids = []
  for (let i = 0; i < trailLen; i++) {
    ids.push(canvas.createCircle(cx, cy, 2, {
      color: p.color,
      fill: 'solid'
    }))
  }
  return ids
})

// Current position markers
const headIds = particles.map(p =>
  canvas.createCircle(cx, cy, 5, { color: p.color, fill: 'solid' })
)

// Project 3D to 2D (simple orthographic, rotated view)
function project(x, y, z) {
  return {
    x: cx + (x - z * 0.3) * scale,
    y: cy - (z - 25) * scale * 0.8  // center on attractor
  }
}

// Lorenz equations
function lorenz(x, y, z) {
  return {
    dx: sigma * (y - x),
    dy: x * (rho - z) - y,
    dz: x * y - beta * z
  }
}

const interval = setInterval(() => {
  // Update each particle
  particles.forEach((p, pIdx) => {
    // RK4 integration for accuracy
    const k1 = lorenz(p.x, p.y, p.z)
    const k2 = lorenz(p.x + k1.dx*dt/2, p.y + k1.dy*dt/2, p.z + k1.dz*dt/2)
    const k3 = lorenz(p.x + k2.dx*dt/2, p.y + k2.dy*dt/2, p.z + k2.dz*dt/2)
    const k4 = lorenz(p.x + k3.dx*dt, p.y + k3.dy*dt, p.z + k3.dz*dt)

    p.x += (k1.dx + 2*k2.dx + 2*k3.dx + k4.dx) * dt / 6
    p.y += (k1.dy + 2*k2.dy + 2*k3.dy + k4.dy) * dt / 6
    p.z += (k1.dz + 2*k2.dz + 2*k3.dz + k4.dz) * dt / 6

    // Add to trail
    p.trail.push({ x: p.x, y: p.y, z: p.z })
    if (p.trail.length > trailLen) p.trail.shift()
  })

  // Update visuals
  const updates = []

  particles.forEach((p, pIdx) => {
    // Update trail
    p.trail.forEach((pt, i) => {
      const pos = project(pt.x, pt.y, pt.z)
      const opacity = (i / p.trail.length) * 0.8
      const size = 1 + (i / p.trail.length) * 2
      updates.push({
        id: trailIds[pIdx][i],
        type: 'geo',
        x: pos.x - size,
        y: pos.y - size,
        props: { w: size * 2, h: size * 2 },
        opacity
      })
    })

    // Update head
    const headPos = project(p.x, p.y, p.z)
    updates.push({
      id: headIds[pIdx],
      type: 'geo',
      x: headPos.x - 5,
      y: headPos.y - 5
    })
  })

  editor.updateShapes(updates)
}, 20)

// Add label
canvas.createText(cx - 100, cy + 180, 'Two particles starting 0.001 apart...', { size: 's', color: 'grey' })

canvas.zoomToFit({ animation: { duration: 400 } })`
