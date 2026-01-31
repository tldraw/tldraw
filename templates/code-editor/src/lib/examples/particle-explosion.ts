export const name = 'Particle explosion'

export const code = `// Particle explosion effect with physics

const cx = 400, cy = 300
const particles = []
const numParticles = 40

// Create particles
for (let i = 0; i < numParticles; i++) {
  const angle = (i / numParticles) * Math.PI * 2
  const speed = 3 + Math.random() * 5
  const size = 8 + Math.random() * 15
  const colors = ['red', 'orange', 'yellow', 'light-red']
  const shapes = ['ellipse', 'star', 'diamond']

  const id = canvas.createGeo(cx - size/2, cy - size/2, size, size, {
    color: colors[Math.floor(Math.random() * colors.length)],
    fill: 'solid',
    geo: shapes[Math.floor(Math.random() * shapes.length)]
  })

  particles.push({
    id,
    x: cx,
    y: cy,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size,
    life: 1.0
  })
}

// Animate with gravity and fade
let frame = 0
const interval = setInterval(() => {
  frame++
  let allDead = true

  particles.forEach(p => {
    if (p.life <= 0) return
    allDead = false

    // Physics
    p.x += p.vx
    p.y += p.vy
    p.vy += 0.15  // gravity
    p.vx *= 0.99  // drag
    p.life -= 0.015

    // Update position
    editor.updateShapes([{
      id: p.id,
      type: 'geo',
      x: p.x - p.size / 2,
      y: p.y - p.size / 2,
      opacity: Math.max(0, p.life)
    }])
  })

  if (allDead || frame > 200) {
    clearInterval(interval)
  }
}, 30)

canvas.zoomToFit({ animation: { duration: 400 } })`
