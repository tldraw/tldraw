export const name = 'Pomodoro Timer'

export const code = `
const cx = 400, cy = 280
const radius = 120

let timeLeft = 25 * 60
let isWork = true
let running = false
const workTime = 25 * 60
const breakTime = 5 * 60

const bgCircle = canvas.createCircle(cx, cy, radius + 10, { color: 'grey', fill: 'solid' })
const progressCircle = canvas.createCircle(cx, cy, radius, { color: 'red', fill: 'solid' })
const innerCircle = canvas.createCircle(cx, cy, radius - 15, { color: 'white', fill: 'solid' })
const timeText = canvas.createText(cx - 50, cy - 20, '25:00', { size: 'xl' })
const modeText = canvas.createText(cx - 30, cy + 25, 'WORK', { size: 'm', color: 'red' })
const instructionText = canvas.createText(cx - 80, cy + 100, 'Click to start/pause', { size: 's', color: 'grey' })

let workSessions = 0
const sessionText = canvas.createText(cx - 40, cy - 80, 'Sessions: 0', { size: 's', color: 'grey' })

const canvasEl = document.querySelector('.tl-canvas')
canvasEl?.addEventListener('click', (e) => {
  if (e.shiftKey) {
    timeLeft = workTime
    isWork = true
    running = false
  } else {
    running = !running
  }
})

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0')
}

const interval = setInterval(() => {
  if (running && timeLeft > 0) {
    timeLeft--
  } else if (running && timeLeft === 0) {
    if (isWork) {
      workSessions++
      timeLeft = breakTime
      isWork = false
    } else {
      timeLeft = workTime
      isWork = true
    }
  }

  const totalTime = isWork ? workTime : breakTime
  const progress = timeLeft / totalTime
  const progressSize = radius * progress

  editor.updateShapes([
    {
      id: progressCircle,
      type: 'geo',
      x: cx - radius,
      y: cy - radius,
      props: { color: isWork ? 'red' : 'green' }
    },
    {
      id: timeText,
      type: 'text',
      props: { richText: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: formatTime(timeLeft) }] }] } }
    },
    {
      id: modeText,
      type: 'text',
      props: {
        color: isWork ? 'red' : 'green',
        richText: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: isWork ? 'WORK' : 'BREAK' }] }] }
      }
    },
    {
      id: sessionText,
      type: 'text',
      props: { richText: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Sessions: ' + workSessions }] }] } }
    },
    {
      id: instructionText,
      type: 'text',
      props: { richText: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: running ? 'Click to pause' : 'Click to start' }] }] } }
    }
  ])
}, 1000)

canvas.zoomToFit({ animation: { duration: 400 } })`
