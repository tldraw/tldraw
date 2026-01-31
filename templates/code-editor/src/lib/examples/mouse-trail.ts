export const name = 'Mouse Trail'

export const code = `
const trailLen = 50
const cx = 400, cy = 300

const trail = []
const trailIds = []
const colors = ['red', 'orange', 'yellow', 'green', 'light-blue', 'blue', 'violet']

for (let i = 0; i < trailLen; i++) {
  trail.push({ x: cx, y: cy })
  trailIds.push(canvas.createCircle(cx, cy, 3, {
    color: colors[i % colors.length],
    fill: 'solid'
  }))
}

canvas.createText(280, 30, 'Move your mouse!', { size: 'm', color: 'grey' })

let mouseX = cx, mouseY = cy
const canvasEl = document.querySelector('.tl-canvas')

canvasEl?.addEventListener('mousemove', (e) => {
  const rect = canvasEl.getBoundingClientRect()
  const camera = canvas.getCamera()
  mouseX = (e.clientX - rect.left) / camera.z - camera.x
  mouseY = (e.clientY - rect.top) / camera.z - camera.y
})

const interval = setInterval(() => {
  trail[0].x += (mouseX - trail[0].x) * 0.3
  trail[0].y += (mouseY - trail[0].y) * 0.3

  for (let i = 1; i < trailLen; i++) {
    const dx = trail[i-1].x - trail[i].x
    const dy = trail[i-1].y - trail[i].y
    trail[i].x += dx * 0.25
    trail[i].y += dy * 0.25
  }

  const updates = trail.map((p, i) => {
    const progress = 1 - i / trailLen
    const size = 2 + progress * 10
    return {
      id: trailIds[i],
      type: 'geo',
      x: p.x - size / 2,
      y: p.y - size / 2,
      props: { w: size, h: size },
      opacity: progress * 0.9
    }
  })

  editor.updateShapes(updates)
}, 20)

canvas.zoomToFit({ animation: { duration: 400 } })`
