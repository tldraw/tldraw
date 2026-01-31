export const name = 'Clock'

export const code = `
const cx = 400, cy = 300, radius = 150

canvas.createCircle(cx, cy, radius, {
  color: 'black',
  fill: 'none',
  size: 'xl'
})
canvas.createCircle(cx, cy, radius - 10, {
  color: 'light-blue',
  fill: 'solid'
})

for (let i = 0; i < 12; i++) {
  const angle = (i / 12) * Math.PI * 2 - Math.PI / 2
  const inner = radius - 30
  const outer = radius - 15
  canvas.createArrow(
    cx + Math.cos(angle) * inner,
    cy + Math.sin(angle) * inner,
    cx + Math.cos(angle) * outer,
    cy + Math.sin(angle) * outer,
    { color: 'black', arrowheadStart: 'none', arrowheadEnd: 'none', size: 'l' }
  )
}

const hourHand = canvas.createArrow(cx, cy, cx, cy - 60, {
  color: 'black', size: 'xl',
  arrowheadStart: 'none', arrowheadEnd: 'none'
})
const minuteHand = canvas.createArrow(cx, cy, cx, cy - 100, {
  color: 'black', size: 'l',
  arrowheadStart: 'none', arrowheadEnd: 'none'
})
const secondHand = canvas.createArrow(cx, cy, cx, cy - 110, {
  color: 'red', size: 'm',
  arrowheadStart: 'none', arrowheadEnd: 'none'
})

canvas.createCircle(cx, cy, 8, { color: 'black', fill: 'solid' })

const updateClock = () => {
  const now = new Date()
  const seconds = now.getSeconds()
  const minutes = now.getMinutes() + seconds / 60
  const hours = (now.getHours() % 12) + minutes / 60

  const secAngle = (seconds / 60) * Math.PI * 2 - Math.PI / 2
  const minAngle = (minutes / 60) * Math.PI * 2 - Math.PI / 2
  const hourAngle = (hours / 12) * Math.PI * 2 - Math.PI / 2

  editor.updateShapes([
    { id: secondHand, type: 'arrow', props: {
      end: { x: Math.cos(secAngle) * 110, y: Math.sin(secAngle) * 110 }
    }},
    { id: minuteHand, type: 'arrow', props: {
      end: { x: Math.cos(minAngle) * 100, y: Math.sin(minAngle) * 100 }
    }},
    { id: hourHand, type: 'arrow', props: {
      end: { x: Math.cos(hourAngle) * 60, y: Math.sin(hourAngle) * 60 }
    }}
  ])
}

updateClock()
setInterval(updateClock, 1000)

canvas.zoomToFit({ animation: { duration: 400 } })`
