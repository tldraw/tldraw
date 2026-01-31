export const name = 'Whack-a-Mole'

export const code = `
const gridCols = 3, gridRows = 3
const holeSize = 80
const spacing = 100
const startX = 220, startY = 120

const holes = []
const moleIds = []
const holeIds = []

for (let r = 0; r < gridRows; r++) {
  for (let c = 0; c < gridCols; c++) {
    const x = startX + c * spacing
    const y = startY + r * spacing

    holeIds.push(canvas.createEllipse(x + holeSize/2, y + holeSize/2 + 15, holeSize, 30, {
      color: 'black', fill: 'solid'
    }))

    const moleId = canvas.createCircle(x + holeSize/2, y + holeSize/2, holeSize/2 - 5, {
      color: 'orange', fill: 'solid'
    })
    moleIds.push(moleId)

    canvas.createCircle(x + holeSize/2 - 12, y + holeSize/2 - 8, 6, { color: 'black', fill: 'solid' })
    canvas.createCircle(x + holeSize/2 + 12, y + holeSize/2 - 8, 6, { color: 'black', fill: 'solid' })

    canvas.createCircle(x + holeSize/2, y + holeSize/2 + 5, 8, { color: 'red', fill: 'solid' })

    holes.push({ x, y, active: false, timer: 0 })
  }
}

let score = 0
let timeLeft = 30
let gameOver = false

const scoreId = canvas.createText(startX, startY - 60, 'Score: 0', { size: 'l' })
const timerId = canvas.createText(startX + 180, startY - 60, 'Time: 30', { size: 'l' })

moleIds.forEach(id => {
  editor.updateShapes([{ id, type: 'geo', opacity: 0 }])
})

const canvasEl = document.querySelector('.tl-canvas')
const clickHandler = (e) => {
  if (gameOver) return

  const rect = canvasEl?.getBoundingClientRect()
  if (!rect) return

  const camera = canvas.getCamera()
  const clickX = (e.clientX - rect.left) / camera.z - camera.x
  const clickY = (e.clientY - rect.top) / camera.z - camera.y

  holes.forEach((hole, i) => {
    if (!hole.active) return

    const moleCenterX = hole.x + holeSize/2
    const moleCenterY = hole.y + holeSize/2
    const dist = Math.sqrt((clickX - moleCenterX) ** 2 + (clickY - moleCenterY) ** 2)

    if (dist < holeSize/2) {
      hole.active = false
      score += 10
      editor.updateShapes([{ id: moleIds[i], type: 'geo', opacity: 0 }])
    }
  })
}
document.addEventListener('click', clickHandler)

const interval = setInterval(() => {
  if (gameOver) return

  timeLeft -= 0.1
  if (timeLeft <= 0) {
    gameOver = true
    canvas.createText(startX + 40, startY + 130, 'GAME OVER!', { size: 'xl', color: 'red' })
    canvas.createText(startX + 30, startY + 180, 'Final Score: ' + score, { size: 'l', color: 'black' })
    document.removeEventListener('click', clickHandler)
    clearInterval(interval)
    return
  }

  if (Math.random() < 0.08) {
    const inactiveHoles = holes.map((h, i) => ({ h, i })).filter(x => !x.h.active)
    if (inactiveHoles.length > 0) {
      const { h, i } = inactiveHoles[Math.floor(Math.random() * inactiveHoles.length)]
      h.active = true
      h.timer = 15 + Math.random() * 15
      editor.updateShapes([{ id: moleIds[i], type: 'geo', opacity: 1 }])
    }
  }

  holes.forEach((hole, i) => {
    if (hole.active) {
      hole.timer -= 1
      if (hole.timer <= 0) {
        hole.active = false
        editor.updateShapes([{ id: moleIds[i], type: 'geo', opacity: 0 }])
      }
    }
  })

  editor.updateShapes([
    { id: scoreId, type: 'text', props: { richText: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Score: ' + score }] }] } } },
    { id: timerId, type: 'text', props: { richText: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Time: ' + Math.ceil(timeLeft) }] }] } } }
  ])
}, 100)

canvas.zoomToFit({ animation: { duration: 400 } })`
