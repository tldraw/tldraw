export const name = 'Pong'

export const code = `
const fieldW = 500, fieldH = 300
const startX = 150, startY = 100
const paddleH = 60, paddleW = 12
const ballSize = 14

canvas.createFrame(startX, startY, fieldW, fieldH, { name: 'Pong' })

for (let y = 0; y < fieldH; y += 20) {
  canvas.createRect(startX + fieldW/2 - 2, startY + y, 4, 10, {
    color: 'grey', fill: 'solid'
  })
}

const paddle1 = canvas.createRect(startX + 15, startY + fieldH/2 - paddleH/2, paddleW, paddleH, {
  color: 'blue', fill: 'solid'
})
const paddle2 = canvas.createRect(startX + fieldW - 15 - paddleW, startY + fieldH/2 - paddleH/2, paddleW, paddleH, {
  color: 'red', fill: 'solid'
})

const ball = canvas.createCircle(startX + fieldW/2, startY + fieldH/2, ballSize/2, {
  color: 'yellow', fill: 'solid'
})

const score1Id = canvas.createText(startX + fieldW/2 - 60, startY + 15, '0', { size: 'xl' })
const score2Id = canvas.createText(startX + fieldW/2 + 40, startY + 15, '0', { size: 'xl' })

let p1y = fieldH/2, p2y = fieldH/2
let ballX = fieldW/2, ballY = fieldH/2
let ballVx = 4, ballVy = 3
let score1 = 0, score2 = 0
const paddleSpeed = 8

const keys = {}
document.addEventListener('keydown', (e) => { keys[e.key] = true })
document.addEventListener('keyup', (e) => { keys[e.key] = false })

const interval = setInterval(() => {
  if (keys['w'] || keys['W']) p1y = Math.max(paddleH/2, p1y - paddleSpeed)
  if (keys['s'] || keys['S']) p1y = Math.min(fieldH - paddleH/2, p1y + paddleSpeed)
  if (keys['ArrowUp']) p2y = Math.max(paddleH/2, p2y - paddleSpeed)
  if (keys['ArrowDown']) p2y = Math.min(fieldH - paddleH/2, p2y + paddleSpeed)

  ballX += ballVx
  ballY += ballVy

  if (ballY < ballSize/2 || ballY > fieldH - ballSize/2) {
    ballVy = -ballVy
    ballY = Math.max(ballSize/2, Math.min(fieldH - ballSize/2, ballY))
  }

  if (ballX < 30 && ballX > 15 && Math.abs(ballY - p1y) < paddleH/2 + ballSize/2) {
    ballVx = Math.abs(ballVx) * 1.05
    ballVy += (ballY - p1y) * 0.1
  }
  if (ballX > fieldW - 30 && ballX < fieldW - 15 && Math.abs(ballY - p2y) < paddleH/2 + ballSize/2) {
    ballVx = -Math.abs(ballVx) * 1.05
    ballVy += (ballY - p2y) * 0.1
  }

  if (ballX < 0) {
    score2++
    ballX = fieldW/2; ballY = fieldH/2
    ballVx = 4; ballVy = (Math.random() - 0.5) * 6
  }
  if (ballX > fieldW) {
    score1++
    ballX = fieldW/2; ballY = fieldH/2
    ballVx = -4; ballVy = (Math.random() - 0.5) * 6
  }

  ballVx = Math.max(-12, Math.min(12, ballVx))
  ballVy = Math.max(-8, Math.min(8, ballVy))

  editor.updateShapes([
    { id: paddle1, type: 'geo', x: startX + 15, y: startY + p1y - paddleH/2 },
    { id: paddle2, type: 'geo', x: startX + fieldW - 15 - paddleW, y: startY + p2y - paddleH/2 },
    { id: ball, type: 'geo', x: startX + ballX - ballSize/2, y: startY + ballY - ballSize/2 },
    { id: score1Id, type: 'text', props: { richText: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: String(score1) }] }] } } },
    { id: score2Id, type: 'text', props: { richText: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: String(score2) }] }] } } }
  ])
}, 30)

canvas.zoomToFit({ animation: { duration: 400 } })`
