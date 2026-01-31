export const name = 'World Clocks'

export const code = `
const cities = [
  { name: 'New York', offset: -5 },
  { name: 'London', offset: 0 },
  { name: 'Tokyo', offset: 9 },
  { name: 'Sydney', offset: 11 },
]

const startX = 150, startY = 100
const clockRadius = 60
const spacing = 180

const clocks = cities.map((city, i) => {
  const cx = startX + (i % 2) * spacing + clockRadius
  const cy = startY + Math.floor(i / 2) * 180 + clockRadius

  const face = canvas.createCircle(cx, cy, clockRadius, { color: 'light-blue', fill: 'solid' })
  const inner = canvas.createCircle(cx, cy, clockRadius - 5, { color: 'white', fill: 'solid' })
  const center = canvas.createCircle(cx, cy, 5, { color: 'black', fill: 'solid' })

  for (let h = 0; h < 12; h++) {
    const angle = (h / 12) * Math.PI * 2 - Math.PI/2
    const markerR = clockRadius - 12
    canvas.createCircle(
      cx + Math.cos(angle) * markerR,
      cy + Math.sin(angle) * markerR,
      h % 3 === 0 ? 4 : 2,
      { color: 'black', fill: 'solid' }
    )
  }

  const hourHand = canvas.createArrow(cx, cy, cx, cy - 30, {
    color: 'black', arrowheadStart: 'none', arrowheadEnd: 'none'
  })
  const minHand = canvas.createArrow(cx, cy, cx, cy - 45, {
    color: 'grey', arrowheadStart: 'none', arrowheadEnd: 'none'
  })

  const nameText = canvas.createText(cx - 35, cy + clockRadius + 10, city.name, { size: 'm' })
  const timeText = canvas.createText(cx - 30, cy + clockRadius + 35, '00:00', { size: 's', color: 'grey' })

  return { city, cx, cy, hourHand, minHand, timeText }
})

function getTimeForOffset(offset) {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  return new Date(utc + offset * 3600000)
}

const interval = setInterval(() => {
  const updates = []

  clocks.forEach(clock => {
    const time = getTimeForOffset(clock.city.offset)
    const hours = time.getHours()
    const mins = time.getMinutes()
    const secs = time.getSeconds()

    const hourAngle = ((hours % 12) + mins/60) / 12 * Math.PI * 2 - Math.PI/2
    const minAngle = (mins + secs/60) / 60 * Math.PI * 2 - Math.PI/2

    updates.push({
      id: clock.hourHand,
      type: 'arrow',
      x: clock.cx,
      y: clock.cy,
      props: {
        start: { x: 0, y: 0 },
        end: { x: Math.cos(hourAngle) * 30, y: Math.sin(hourAngle) * 30 }
      }
    })

    updates.push({
      id: clock.minHand,
      type: 'arrow',
      x: clock.cx,
      y: clock.cy,
      props: {
        start: { x: 0, y: 0 },
        end: { x: Math.cos(minAngle) * 45, y: Math.sin(minAngle) * 45 }
      }
    })

    const timeStr = String(hours).padStart(2, '0') + ':' + String(mins).padStart(2, '0')
    updates.push({
      id: clock.timeText,
      type: 'text',
      props: { richText: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: timeStr }] }] } }
    })
  })

  editor.updateShapes(updates)
}, 1000)

canvas.zoomToFit({ animation: { duration: 400 } })`
