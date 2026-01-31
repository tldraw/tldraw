export const name = 'Spirograph'

export const code = `
const cx = 400, cy = 300
const R = 150
const r = 55
const d = 80
const colors = ['red', 'blue', 'green', 'violet', 'orange']

let points = []
let colorIndex = 0

for (let t = 0; t < Math.PI * 40; t += 0.05) {
  const x = cx + (R - r) * Math.cos(t) + d * Math.cos((R - r) / r * t)
  const y = cy + (R - r) * Math.sin(t) - d * Math.sin((R - r) / r * t)
  points.push({ x, y })
}

let index = 0
const batchSize = 20

const interval = setInterval(() => {
  for (let i = 0; i < batchSize && index < points.length - 1; i++, index++) {
    const p1 = points[index]
    const p2 = points[index + 1]

    canvas.createArrow(p1.x, p1.y, p2.x, p2.y, {
      color: colors[Math.floor(index / 100) % colors.length],
      arrowheadStart: 'none',
      arrowheadEnd: 'none',
      size: 's'
    })
  }

  if (index >= points.length - 1) {
    clearInterval(interval)
    canvas.zoomToFit({ animation: { duration: 500 } })
  }
}, 30)

canvas.centerOnPoint({ x: cx, y: cy })`
