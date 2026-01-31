export const name = 'Zoom Temperature'

export const code = `// Gas simulation - zoom controls temperature!

const boxX = 200, boxY = 100
const boxW = 400, boxH = 300
const numParticles = 25

// Create container
canvas.createFrame(boxX, boxY, boxW, boxH, { name: 'Gas Chamber' })

// Create particles
const particles = []
for (let i = 0; i < numParticles; i++) {
  const angle = Math.random() * Math.PI * 2
  const speed = 1 + Math.random() * 2
  particles.push({
    x: boxX + 50 + Math.random() * (boxW - 100),
    y: boxY + 50 + Math.random() * (boxH - 100),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: 6 + Math.random() * 6
  })
}

// Particle shapes
const particleIds = particles.map((p, i) =>
  canvas.createCircle(p.x, p.y, p.radius, {
    color: 'blue',
    fill: 'solid'
  })
)

// Temperature display
const tempId = canvas.createText(boxX, boxY - 35, 'Temperature: COLD', { size: 'm' })

// Color scale for temperature
function tempColor(temp) {
  if (temp < 0.7) return 'blue'
  if (temp < 1.0) return 'light-blue'
  if (temp < 1.5) return 'green'
  if (temp < 2.0) return 'yellow'
  if (temp < 3.0) return 'orange'
  return 'red'
}

function tempLabel(temp) {
  if (temp < 0.7) return 'FROZEN'
  if (temp < 1.0) return 'COLD'
  if (temp < 1.5) return 'COOL'
  if (temp < 2.0) return 'WARM'
  if (temp < 3.0) return 'HOT'
  return 'PLASMA!'
}

const interval = setInterval(() => {
  const camera = canvas.getCamera()
  const temp = camera.z  // zoom = temperature

  // Target speed based on temperature
  const targetSpeed = temp * 3

  // Update physics
  particles.forEach(p => {
    // Adjust speed toward target (thermal equilibrium)
    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
    if (speed > 0.1) {
      const factor = 0.98 + (targetSpeed / speed) * 0.02
      p.vx *= factor
      p.vy *= factor
    } else {
      // Random kick if nearly stopped
      const angle = Math.random() * Math.PI * 2
      p.vx = Math.cos(angle) * targetSpeed * 0.5
      p.vy = Math.sin(angle) * targetSpeed * 0.5
    }

    // Add random thermal motion
    p.vx += (Math.random() - 0.5) * temp * 0.3
    p.vy += (Math.random() - 0.5) * temp * 0.3

    // Move
    p.x += p.vx
    p.y += p.vy

    // Bounce off walls
    if (p.x - p.radius < boxX) { p.x = boxX + p.radius; p.vx = Math.abs(p.vx) }
    if (p.x + p.radius > boxX + boxW) { p.x = boxX + boxW - p.radius; p.vx = -Math.abs(p.vx) }
    if (p.y - p.radius < boxY) { p.y = boxY + p.radius; p.vy = Math.abs(p.vy) }
    if (p.y + p.radius > boxY + boxH) { p.y = boxY + boxH - p.radius; p.vy = -Math.abs(p.vy) }
  })

  // Particle-particle collisions
  for (let i = 0; i < numParticles; i++) {
    for (let j = i + 1; j < numParticles; j++) {
      const a = particles[i], b = particles[j]
      const dx = b.x - a.x, dy = b.y - a.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const minDist = a.radius + b.radius

      if (dist < minDist && dist > 0) {
        // Elastic collision
        const nx = dx / dist, ny = dy / dist
        const dvx = a.vx - b.vx, dvy = a.vy - b.vy
        const dvn = dvx * nx + dvy * ny

        if (dvn > 0) {
          a.vx -= dvn * nx
          a.vy -= dvn * ny
          b.vx += dvn * nx
          b.vy += dvn * ny
        }

        // Separate overlapping particles
        const overlap = (minDist - dist) / 2
        a.x -= overlap * nx
        a.y -= overlap * ny
        b.x += overlap * nx
        b.y += overlap * ny
      }
    }
  }

  // Render
  const color = tempColor(temp)
  const updates = particles.map((p, i) => ({
    id: particleIds[i],
    type: 'geo',
    x: p.x - p.radius,
    y: p.y - p.radius,
    props: { color }
  }))

  // Update temperature display
  updates.push({
    id: tempId,
    type: 'text',
    props: {
      color,
      richText: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: tempLabel(temp) + ' (' + (temp * 100).toFixed(0) + '°)' }] }] }
    }
  })

  editor.updateShapes(updates)
}, 30)

canvas.zoomToFit({ animation: { duration: 400 } })`
