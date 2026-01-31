export const name = 'Rope Physics'

export const code = `
const anchorX = 400, anchorY = 100
const numPoints = 15
const segmentLen = 20
const gravity = 0.5
const damping = 0.99
const iterations = 5

const points = []
for (let i = 0; i < numPoints; i++) {
  points.push({
    x: anchorX,
    y: anchorY + i * segmentLen,
    oldX: anchorX,
    oldY: anchorY + i * segmentLen,
    pinned: i === 0
  })
}

const nodeIds = points.map((p, i) =>
  canvas.createCircle(p.x, p.y, i === 0 ? 8 : 5, {
    color: i === 0 ? 'red' : 'orange',
    fill: 'solid'
  })
)

const segmentIds = []
for (let i = 0; i < numPoints - 1; i++) {
  segmentIds.push(canvas.createBezier(points[i].x, points[i].y, {
    start: { x: 0, y: 0 },
    cp1: { x: 0, y: segmentLen * 0.4 },
    cp2: { x: 0, y: segmentLen * 0.6 },
    end: { x: 0, y: segmentLen }
  }))
}

let mouseX = anchorX, mouseY = anchorY + numPoints * segmentLen
const canvasEl = document.querySelector('.tl-canvas')
canvasEl?.addEventListener('mousemove', (e) => {
  const rect = canvasEl.getBoundingClientRect()
  const camera = canvas.getCamera()
  mouseX = (e.clientX - rect.left) / camera.z - camera.x
  mouseY = (e.clientY - rect.top) / camera.z - camera.y
})

const weightId = canvas.createCircle(anchorX, anchorY + numPoints * segmentLen, 15, {
  color: 'blue',
  fill: 'solid'
})

let time = 0
const interval = setInterval(() => {
  time += 0.05

  const newAnchorX = 400 + Math.sin(time) * 80
  const newAnchorY = 100 + Math.cos(time * 0.7) * 30
  points[0].x = newAnchorX
  points[0].y = newAnchorY

  points.forEach(p => {
    if (p.pinned) return

    const vx = (p.x - p.oldX) * damping
    const vy = (p.y - p.oldY) * damping

    p.oldX = p.x
    p.oldY = p.y

    p.x += vx
    p.y += vy + gravity
  })

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < numPoints - 1; i++) {
      const p1 = points[i]
      const p2 = points[i + 1]

      const dx = p2.x - p1.x
      const dy = p2.y - p1.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const diff = segmentLen - dist
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
    }
  }

  const updates = []

  points.forEach((p, i) => {
    const size = i === 0 ? 8 : 5
    updates.push({
      id: nodeIds[i],
      type: 'geo',
      x: p.x - size,
      y: p.y - size
    })
  })

  for (let i = 0; i < numPoints - 1; i++) {
    const p1 = points[i]
    const p2 = points[i + 1]
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y

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
  }

  const lastPoint = points[points.length - 1]
  updates.push({
    id: weightId,
    type: 'geo',
    x: lastPoint.x - 15,
    y: lastPoint.y - 15
  })

  editor.updateShapes(updates)
}, 25)

canvas.zoomToFit({ animation: { duration: 400 } })`
