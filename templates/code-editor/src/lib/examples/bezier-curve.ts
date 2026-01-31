export const name = 'Bezier curve'

export const code = `
const cx = 400
const cy = 280
const size = 120

for (let i = 0; i < 6; i++) {
  const angle = (i * Math.PI) / 3
  const nextAngle = angle + Math.PI / 3

  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  const ndx = Math.cos(nextAngle)
  const ndy = Math.sin(nextAngle)

  canvas.createBezier(cx, cy, {
    start: { x: 0, y: 0 },
    cp1: { x: dx * size * 1.8, y: dy * size * 1.8 },
    cp2: { x: ndx * size * 1.8, y: ndy * size * 1.8 },
    end: { x: 0, y: 0 }
  })
}

for (let i = 0; i < 6; i++) {
  const angle = (i * Math.PI) / 3
  const nextAngle = angle + Math.PI / 3

  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  const ndx = Math.cos(nextAngle)
  const ndy = Math.sin(nextAngle)

  canvas.createBezier(cx, cy, {
    start: { x: 0, y: 0 },
    cp1: { x: dx * size * 0.9, y: dy * size * 0.9 },
    cp2: { x: ndx * size * 0.9, y: ndy * size * 0.9 },
    end: { x: 0, y: 0 }
  })
}

canvas.zoomToFit({ animation: { duration: 400 } })`
