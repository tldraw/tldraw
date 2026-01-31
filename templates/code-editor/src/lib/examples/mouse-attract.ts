export const name = 'Mouse Attract'

export const code = `// Move your mouse to attract particles!

const cx = 400, cy = 300
const numParticles = 40

const particles = []
for (let i = 0; i < numParticles; i++) {
  const angle = Math.random() * Math.PI * 2
  const dist = 50 + Math.random() * 200
  particles.push({
    x: cx + Math.cos(angle) * dist,
    y: cy + Math.sin(angle) * dist,
    vx: (Math.random() - 0.5) * 2,
    vy: (Math.random() - 0.5) * 2
  })
}

const colors = ['red', 'orange', 'yellow', 'green', 'light-blue', 'blue', 'violet']
const particleIds = particles.map((p, i) =>
  canvas.createCircle(p.x, p.y, 6, {
    color: colors[i % colors.length],
    fill: 'solid'
  })
)

canvas.createText(200, 30, 'Move mouse to attract, hold shift to repel!', { size: 'm', color: 'grey' })

// Track mouse
let mouseX = cx, mouseY = cy, shiftHeld = false
const canvasEl = document.querySelector('.tl-canvas')

canvasEl?.addEventListener('mousemove', (e) => {
  const rect = canvasEl.getBoundingClientRect()
  const camera = canvas.getCamera()
  mouseX = (e.clientX - rect.left) / camera.z - camera.x
  mouseY = (e.clientY - rect.top) / camera.z - camera.y
})

document.addEventListener('keydown', (e) => { if (e.key === 'Shift') shiftHeld = true })
document.addEventListener('keyup', (e) => { if (e.key === 'Shift') shiftHeld = false })

const interval = setInterval(() => {
  particles.forEach(p => {
    const dx = mouseX - p.x
    const dy = mouseY - p.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > 5 && dist < 400) {
      const force = (shiftHeld ? -200 : 150) / (dist * dist)
      p.vx += (dx / dist) * force
      p.vy += (dy / dist) * force
    }

    // Damping
    p.vx *= 0.96
    p.vy *= 0.96

    // Move
    p.x += p.vx
    p.y += p.vy

    // Soft bounds
    if (p.x < 50) p.vx += 0.5
    if (p.x > 750) p.vx -= 0.5
    if (p.y < 50) p.vy += 0.5
    if (p.y > 550) p.vy -= 0.5
  })

  const updates = particles.map((p, i) => ({
    id: particleIds[i],
    type: 'geo',
    x: p.x - 6,
    y: p.y - 6
  }))

  editor.updateShapes(updates)
}, 25)

canvas.zoomToFit({ animation: { duration: 400 } })`
