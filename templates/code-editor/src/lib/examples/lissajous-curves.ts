export const name = 'Lissajous Curves'

export const code = `
const cx = 400, cy = 300
const A = 150, B = 150

let freqA = 3
let freqB = 2
let phase = 0

const trailLen = 300
const trailIds = []
for (let i = 0; i < trailLen; i++) {
  trailIds.push(canvas.createCircle(cx, cy, 2, {
    color: 'violet',
    fill: 'solid'
  }))
}

const headId = canvas.createCircle(cx, cy, 8, {
  color: 'yellow',
  fill: 'solid'
})

canvas.createArrow(cx - A - 20, cy, cx + A + 20, cy, {
  color: 'grey', arrowheadStart: 'none', arrowheadEnd: 'none', dash: 'dotted'
})
canvas.createArrow(cx, cy - B - 20, cx, cy + B + 20, {
  color: 'grey', arrowheadStart: 'none', arrowheadEnd: 'none', dash: 'dotted'
})

const infoId = canvas.createText(cx - 60, cy + B + 40, 'Ratio: 3:2', { size: 'm', color: 'grey' })

let t = 0
const trail = []

const interval = setInterval(() => {
  phase += 0.003

  const x = cx + A * Math.sin(freqA * t + phase)
  const y = cy + B * Math.sin(freqB * t)

  trail.push({ x, y })
  if (trail.length > trailLen) trail.shift()

  t += 0.03

  if (Math.floor(t / 30) % 4 === 1 && freqA === 3) {
    freqA = 5; freqB = 4
  } else if (Math.floor(t / 30) % 4 === 2 && freqA === 5 && freqB === 4) {
    freqA = 5; freqB = 6
  } else if (Math.floor(t / 30) % 4 === 3 && freqB === 6) {
    freqA = 7; freqB = 6
  } else if (Math.floor(t / 30) % 4 === 0 && freqA === 7) {
    freqA = 3; freqB = 2
  }

  const updates = []

  const colors = ['red', 'orange', 'yellow', 'green', 'light-blue', 'blue', 'violet']
  trail.forEach((pt, i) => {
    const progress = i / trail.length
    const colorIdx = Math.floor(progress * colors.length)
    const size = 1 + progress * 3
    updates.push({
      id: trailIds[i],
      type: 'geo',
      x: pt.x - size,
      y: pt.y - size,
      props: { w: size * 2, h: size * 2, color: colors[colorIdx] },
      opacity: progress * 0.9
    })
  })

  for (let i = trail.length; i < trailLen; i++) {
    updates.push({ id: trailIds[i], type: 'geo', opacity: 0 })
  }

  updates.push({
    id: headId,
    type: 'geo',
    x: x - 8,
    y: y - 8
  })

  updates.push({
    id: infoId,
    type: 'text',
    props: { richText: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Ratio: ' + freqA + ':' + freqB }] }] } }
  })

  editor.updateShapes(updates)
}, 20)

canvas.zoomToFit({ animation: { duration: 400 } })`
