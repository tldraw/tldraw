export const name = 'Click Explosions'

export const code = `// Click anywhere to create explosions!

const cx = 400, cy = 300
const maxParticles = 60

const particles = []
const particleIds = []

const colors = ['red', 'orange', 'yellow', 'light-green', 'light-blue', 'violet']

// Pre-create particle shapes
for (let i = 0; i < maxParticles; i++) {
  particleIds.push(canvas.createCircle(cx, cy, 4, {
    color: colors[i % colors.length],
    fill: 'solid'
  }))
  particles.push({ x: cx, y: cy, vx: 0, vy: 0, life: 0 })
}

canvas.createText(250, 30, 'Click to create explosions!', { size: 'm', color: 'grey' })

// Click handler
const canvasEl = document.querySelector('.tl-canvas')
let nextParticle = 0

canvasEl?.addEventListener('click', (e) => {
  const rect = canvasEl.getBoundingClientRect()
  const camera = canvas.getCamera()
  const clickX = (e.clientX - rect.left) / camera.z - camera.x
  const clickY = (e.clientY - rect.top) / camera.z - camera.y

  // Spawn burst of particles
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.3
    const speed = 4 + Math.random() * 6
    const p = particles[nextParticle]
    p.x = clickX
    p.y = clickY
    p.vx = Math.cos(angle) * speed
    p.vy = Math.sin(angle) * speed
    p.life = 80 + Math.random() * 40
    nextParticle = (nextParticle + 1) % maxParticles
  }
})

const interval = setInterval(() => {
  const updates = []

  particles.forEach((p, i) => {
    if (p.life > 0) {
      p.vy += 0.15  // gravity
      p.vx *= 0.98
      p.vy *= 0.98
      p.x += p.vx
      p.y += p.vy
      p.life--

      updates.push({
        id: particleIds[i],
        type: 'geo',
        x: p.x - 4,
        y: p.y - 4,
        opacity: Math.min(1, p.life / 30)
      })
    } else {
      updates.push({
        id: particleIds[i],
        type: 'geo',
        opacity: 0
      })
    }
  })

  editor.updateShapes(updates)
}, 25)

canvas.zoomToFit({ animation: { duration: 400 } })`
