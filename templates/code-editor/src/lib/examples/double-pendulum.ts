export const name = 'Double Pendulum'

export const code = `
const cx = 400, cy = 200
const g = 1.5

const L1 = 100, L2 = 100
const m1 = 10, m2 = 10
let a1 = Math.PI / 2
let a2 = Math.PI / 2
let v1 = 0, v2 = 0

canvas.createCircle(cx, cy, 8, { color: 'black', fill: 'solid' })

const arm1 = canvas.createBezier(cx, cy, {
  start: { x: 0, y: 0 }, cp1: { x: 0, y: 50 },
  cp2: { x: 0, y: 50 }, end: { x: 0, y: L1 }
})
const arm2 = canvas.createBezier(cx, cy + L1, {
  start: { x: 0, y: 0 }, cp1: { x: 0, y: 50 },
  cp2: { x: 0, y: 50 }, end: { x: 0, y: L2 }
})

const bob1 = canvas.createCircle(cx, cy + L1, 12, {
  color: 'blue', fill: 'solid'
})
const bob2 = canvas.createCircle(cx, cy + L1 + L2, 12, {
  color: 'red', fill: 'solid'
})

const trailLen = 60
const trail = []
for (let i = 0; i < trailLen; i++) {
  trail.push(canvas.createCircle(cx, cy, 2, {
    color: 'red', fill: 'solid'
  }))
}
const trailPoints = []

const interval = setInterval(() => {
  const num1 = -g * (2*m1 + m2) * Math.sin(a1)
  const num2 = -m2 * g * Math.sin(a1 - 2*a2)
  const num3 = -2 * Math.sin(a1 - a2) * m2
  const num4 = v2*v2*L2 + v1*v1*L1*Math.cos(a1-a2)
  const den1 = L1 * (2*m1 + m2 - m2*Math.cos(2*a1 - 2*a2))
  const acc1 = (num1 + num2 + num3*num4) / den1

  const num5 = 2 * Math.sin(a1 - a2)
  const num6 = v1*v1*L1*(m1+m2) + g*(m1+m2)*Math.cos(a1)
  const num7 = v2*v2*L2*m2*Math.cos(a1-a2)
  const den2 = L2 * (2*m1 + m2 - m2*Math.cos(2*a1 - 2*a2))
  const acc2 = (num5 * (num6 + num7)) / den2

  v1 += acc1 * 0.2
  v2 += acc2 * 0.2
  a1 += v1 * 0.2
  a2 += v2 * 0.2

  const x1 = cx + L1 * Math.sin(a1)
  const y1 = cy + L1 * Math.cos(a1)
  const x2 = x1 + L2 * Math.sin(a2)
  const y2 = y1 + L2 * Math.cos(a2)

  trailPoints.push({ x: x2, y: y2 })
  if (trailPoints.length > trailLen) trailPoints.shift()

  const trailUpdates = trail.map((id, i) => {
    const pt = trailPoints[i] || { x: x2, y: y2 }
    const opacity = i / trailLen
    return {
      id, type: 'geo',
      x: pt.x - 2, y: pt.y - 2,
      opacity: opacity * 0.7
    }
  })

  editor.updateShapes([
    ...trailUpdates,
    {
      id: arm1, type: 'bezier-curve',
      x: cx, y: cy,
      props: {
        start: { x: 0, y: 0 },
        cp1: { x: (x1-cx)*0.33, y: (y1-cy)*0.33 },
        cp2: { x: (x1-cx)*0.67, y: (y1-cy)*0.67 },
        end: { x: x1-cx, y: y1-cy }
      }
    },
    {
      id: arm2, type: 'bezier-curve',
      x: x1, y: y1,
      props: {
        start: { x: 0, y: 0 },
        cp1: { x: (x2-x1)*0.33, y: (y2-y1)*0.33 },
        cp2: { x: (x2-x1)*0.67, y: (y2-y1)*0.67 },
        end: { x: x2-x1, y: y2-y1 }
      }
    },
    { id: bob1, type: 'geo', x: x1 - 12, y: y1 - 12 },
    { id: bob2, type: 'geo', x: x2 - 12, y: y2 - 12 }
  ])
}, 30)

canvas.zoomToFit({ animation: { duration: 400 } })`
