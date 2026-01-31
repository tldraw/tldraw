export const name = 'Stopwatch'

export const code = `
const cx = 400, cy = 280

let running = false
let elapsed = 0
let laps = []
let lastUpdate = Date.now()

const bgCircle = canvas.createCircle(cx, cy, 100, { color: 'grey', fill: 'solid' })
const innerCircle = canvas.createCircle(cx, cy, 90, { color: 'white', fill: 'solid' })
const timeText = canvas.createText(cx - 70, cy - 15, '00:00.00', { size: 'xl' })
const statusText = canvas.createText(cx - 25, cy + 40, 'Stopped', { size: 's', color: 'grey' })

const lapTexts = []
for (let i = 0; i < 5; i++) {
  lapTexts.push(canvas.createText(cx + 150, cy - 60 + i * 30, '-', { size: 's', color: 'grey' }))
}
canvas.createText(cx + 150, cy - 90, 'Laps:', { size: 's', color: 'black' })

canvas.createText(cx - 100, cy + 130, 'Click: start/stop | Shift+click: reset | Alt+click: lap', { size: 's', color: 'grey' })

const canvasEl = document.querySelector('.tl-canvas')
canvasEl?.addEventListener('click', (e) => {
  if (e.shiftKey) {
    running = false
    elapsed = 0
    laps = []
  } else if (e.altKey) {
    if (running) {
      laps.unshift(elapsed)
      if (laps.length > 5) laps.pop()
    }
  } else {
    if (!running) lastUpdate = Date.now()
    running = !running
  }
})

function formatTime(ms) {
  const mins = Math.floor(ms / 60000)
  const secs = Math.floor((ms % 60000) / 1000)
  const cents = Math.floor((ms % 1000) / 10)
  return String(mins).padStart(2, '0') + ':' +
         String(secs).padStart(2, '0') + '.' +
         String(cents).padStart(2, '0')
}

const interval = setInterval(() => {
  if (running) {
    const now = Date.now()
    elapsed += now - lastUpdate
    lastUpdate = now
  }

  const updates = [
    {
      id: timeText,
      type: 'text',
      props: { richText: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: formatTime(elapsed) }] }] } }
    },
    {
      id: statusText,
      type: 'text',
      props: {
        color: running ? 'green' : 'grey',
        richText: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: running ? 'Running' : 'Stopped' }] }] }
      }
    }
  ]

  lapTexts.forEach((id, i) => {
    const text = laps[i] ? 'Lap ' + (i+1) + ': ' + formatTime(laps[i]) : ''
    updates.push({
      id,
      type: 'text',
      props: { richText: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] } }
    })
  })

  editor.updateShapes(updates)
}, 50)

canvas.zoomToFit({ animation: { duration: 400 } })`
