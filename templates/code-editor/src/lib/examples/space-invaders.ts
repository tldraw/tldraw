export const name = 'Space Invaders'

export const code = `
const fieldW = 400, fieldH = 400
const startX = 200, startY = 50

canvas.createFrame(startX, startY, fieldW, fieldH, { name: 'Space Invaders' })

const alienRows = 5, alienCols = 8
const alienW = 30, alienH = 20
const aliens = []
const alienIds = []

for (let r = 0; r < alienRows; r++) {
  for (let c = 0; c < alienCols; c++) {
    const colors = ['red', 'orange', 'yellow', 'green', 'light-blue']
    const id = canvas.createRect(
      startX + 30 + c * 42, startY + 40 + r * 32,
      alienW, alienH,
      { color: colors[r], fill: 'solid' }
    )
    aliens.push({ x: 30 + c * 42, y: 40 + r * 32, alive: true })
    alienIds.push(id)
  }
}

const playerW = 40, playerH = 15
let playerX = fieldW / 2 - playerW / 2
const playerY = fieldH - 40
const playerId = canvas.createRect(
  startX + playerX, startY + playerY,
  playerW, playerH,
  { color: 'green', fill: 'solid' }
)

const bullets = []
const bulletIds = []
for (let i = 0; i < 10; i++) {
  bulletIds.push(canvas.createRect(0, 0, 4, 12, { color: 'yellow', fill: 'solid' }))
  bullets.push({ x: 0, y: 0, active: false })
}

let score = 0
let gameOver = false
const scoreId = canvas.createText(startX, startY - 25, 'Score: 0', { size: 'm' })

let alienDir = 1
let alienSpeed = 1.5
let alienDropCounter = 0

const keys = {}
document.addEventListener('keydown', (e) => {
  keys[e.key] = true
  if (e.key === ' ') {
    const bullet = bullets.find(b => !b.active)
    if (bullet) {
      bullet.x = playerX + playerW / 2 - 2
      bullet.y = playerY - 12
      bullet.active = true
    }
  }
})
document.addEventListener('keyup', (e) => { keys[e.key] = false })

const interval = setInterval(() => {
  if (gameOver) return

  if (keys['ArrowLeft']) playerX = Math.max(0, playerX - 5)
  if (keys['ArrowRight']) playerX = Math.min(fieldW - playerW, playerX + 5)

  let hitEdge = false
  aliens.forEach(a => {
    if (!a.alive) return
    a.x += alienDir * alienSpeed
    if (a.x < 10 || a.x > fieldW - alienW - 10) hitEdge = true
  })

  if (hitEdge) {
    alienDir *= -1
    aliens.forEach(a => { a.y += 15 })
    alienSpeed += 0.2
  }

  bullets.forEach(b => {
    if (b.active) {
      b.y -= 8
      if (b.y < 0) b.active = false
    }
  })

  bullets.forEach(b => {
    if (!b.active) return
    aliens.forEach((a, i) => {
      if (!a.alive) return
      if (b.x > a.x && b.x < a.x + alienW && b.y > a.y && b.y < a.y + alienH) {
        a.alive = false
        b.active = false
        score += 10
      }
    })
  })

  const aliveAliens = aliens.filter(a => a.alive)
  if (aliveAliens.length === 0) {
    canvas.createText(startX + 120, startY + fieldH / 2, 'YOU WIN!', { size: 'xl', color: 'green' })
    gameOver = true
  }
  if (aliveAliens.some(a => a.y > playerY - alienH)) {
    canvas.createText(startX + 100, startY + fieldH / 2, 'GAME OVER', { size: 'xl', color: 'red' })
    gameOver = true
  }

  const updates = [
    { id: playerId, type: 'geo', x: startX + playerX },
    { id: scoreId, type: 'text', props: { richText: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Score: ' + score }] }] } } }
  ]

  aliens.forEach((a, i) => {
    updates.push({
      id: alienIds[i], type: 'geo',
      x: startX + a.x, y: startY + a.y,
      opacity: a.alive ? 1 : 0
    })
  })

  bullets.forEach((b, i) => {
    updates.push({
      id: bulletIds[i], type: 'geo',
      x: startX + b.x, y: startY + b.y,
      opacity: b.active ? 1 : 0
    })
  })

  editor.updateShapes(updates)
}, 50)

canvas.zoomToFit({ animation: { duration: 400 } })`
