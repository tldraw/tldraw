export const name = '8 Ball Pool'

export const code = `const tableX = 50, tableY = 80
const tableW = 700, tableH = 350
const ballRadius = 10
const pocketRadius = 20
const friction = 0.988
const collisionBoost = 1.1
const cueStartX = tableX + tableW * 0.25
const cueStartY = tableY + tableH / 2
const trailLen = 5

let player1Score = 0, player2Score = 0
let currentPlayer = 1
let turnTaken = false

canvas.createRect(tableX - 15, tableY - 15, tableW + 30, tableH + 30, { color: 'black', fill: 'solid' })
canvas.createRect(tableX, tableY, tableW, tableH, { color: 'green', fill: 'solid' })

const scoreTextId = canvas.createText(tableX + tableW/2 - 120, tableY - 50, 'P1: 0  |  P2: 0  |  Player 1', { size: 'm', font: 'mono' })

const pockets = [
  { x: tableX + 15, y: tableY + 15 },
  { x: tableX + tableW/2, y: tableY + 10 },
  { x: tableX + tableW - 15, y: tableY + 15 },
  { x: tableX + 15, y: tableY + tableH - 15 },
  { x: tableX + tableW/2, y: tableY + tableH - 10 },
  { x: tableX + tableW - 15, y: tableY + tableH - 15 },
]

pockets.forEach(p => {
  canvas.createGeo(p.x - pocketRadius, p.y - pocketRadius, pocketRadius * 2, pocketRadius * 2, {
    geo: 'ellipse', color: 'black', fill: 'solid'
  })
})

const ballColors = [
  'white',
  'yellow', 'blue', 'red', 'violet', 'orange', 'green', 'light-red',
  'black',
  'yellow', 'blue', 'red', 'violet', 'orange', 'green', 'light-red'
]

const rackX = tableX + tableW * 0.72
const rackY = tableY + tableH / 2
const balls = []

balls.push({ x: cueStartX, y: cueStartY, vx: 0, vy: 0, sunk: false, trail: [] })

const spacing = ballRadius * 2.2
for (let row = 0; row < 5; row++) {
  for (let col = 0; col <= row; col++) {
    const x = rackX + row * spacing * 0.866
    const y = rackY + (col - row/2) * spacing
    balls.push({ x, y, vx: 0, vy: 0, sunk: false, trail: [] })
  }
}

const ballIds = balls.map((b, i) =>
  canvas.createGeo(b.x - ballRadius, b.y - ballRadius, ballRadius * 2, ballRadius * 2, {
    geo: 'ellipse', color: ballColors[i], fill: 'solid'
  })
)

const trailIds = []
for (let i = 1; i < balls.length; i++) {
  const ballTrailIds = []
  for (let j = 0; j < trailLen; j++) {
    ballTrailIds.push(canvas.createGeo(0, 0, 8, 8, { geo: 'ellipse', color: ballColors[i], fill: 'solid' }))
  }
  trailIds.push(ballTrailIds)
}

const aimLineId = canvas.createArrow(0, 0, 100, 0, { color: 'grey', arrowheadStart: 'none', arrowheadEnd: 'triangle' })
editor.updateShapes([{ id: aimLineId, type: 'arrow', opacity: 0 }])

const particles = []
const particleIds = []
for (let i = 0; i < 20; i++) {
  particleIds.push(canvas.createGeo(0, 0, 6, 6, { geo: 'star', color: 'yellow', fill: 'solid' }))
  particles.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0 })
}

function spawnParticles(x, y, color) {
  for (let i = 0; i < 10; i++) {
    const p = particles[i]
    p.x = x
    p.y = y
    p.vx = (Math.random() - 0.5) * 8
    p.vy = (Math.random() - 0.5) * 8
    p.life = 30
    p.color = color
  }
}

let aiming = false
let mouseX = 0, mouseY = 0

const canvasEl = document.querySelector('.tl-canvas')

canvasEl?.addEventListener('mousedown', (e) => {
  e.stopPropagation()
  e.preventDefault()
  const rect = canvasEl.getBoundingClientRect()
  const camera = canvas.getCamera()
  mouseX = (e.clientX - rect.left) / camera.z - camera.x
  mouseY = (e.clientY - rect.top) / camera.z - camera.y

  const cue = balls[0]
  const allStopped = balls.every(b => b.sunk || (Math.abs(b.vx) < 0.1 && Math.abs(b.vy) < 0.1))
  if (!cue.sunk && allStopped) aiming = true
})

canvasEl?.addEventListener('mousemove', (e) => {
  const rect = canvasEl.getBoundingClientRect()
  const camera = canvas.getCamera()
  mouseX = (e.clientX - rect.left) / camera.z - camera.x
  mouseY = (e.clientY - rect.top) / camera.z - camera.y
})

canvasEl?.addEventListener('mouseup', (e) => {
  if (aiming) {
    const cue = balls[0]
    const dx = cue.x - mouseX
    const dy = cue.y - mouseY
    const dist = Math.sqrt(dx*dx + dy*dy)
    const power = Math.min(dist * 0.12, 15)

    if (power > 0.5) {
      cue.vx = (dx / dist) * power
      cue.vy = (dy / dist) * power
      turnTaken = true
    }
    aiming = false
    editor.updateShapes([{ id: aimLineId, type: 'arrow', opacity: 0 }])
  }
})

function updateScore() {
  const text = 'P1: ' + player1Score + '  |  P2: ' + player2Score + '  |  Player ' + currentPlayer
  editor.updateShapes([{
    id: scoreTextId, type: 'text',
    props: { richText: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] } }
  }])
}

const interval = setInterval(() => {
  const cue = balls[0]

  if (aiming && !cue.sunk) {
    const dx = cue.x - mouseX
    const dy = cue.y - mouseY
    const dist = Math.sqrt(dx*dx + dy*dy)
    const lineLen = Math.min(dist * 0.8, 150)

    if (dist > 5) {
      editor.updateShapes([{
        id: aimLineId, type: 'arrow',
        x: cue.x, y: cue.y, opacity: 0.8,
        props: { start: { x: 0, y: 0 }, end: { x: (dx/dist) * lineLen, y: (dy/dist) * lineLen } }
      }])
    }
  }

  const allStopped = balls.every(b => b.sunk || (Math.abs(b.vx) < 0.1 && Math.abs(b.vy) < 0.1))
  if (turnTaken && allStopped) {
    turnTaken = false
    currentPlayer = currentPlayer === 1 ? 2 : 1
    updateScore()
  }

  if (cue.sunk && allStopped) {
    cue.sunk = false
    cue.x = cueStartX
    cue.y = cueStartY
    cue.vx = 0
    cue.vy = 0
  }

  balls.forEach((b, idx) => {
    if (b.sunk) return

    const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy)
    if (idx > 0 && speed > 3) {
      b.trail.unshift({ x: b.x, y: b.y })
      if (b.trail.length > trailLen) b.trail.pop()
    } else if (idx > 0) {
      b.trail = []
    }

    b.x += b.vx
    b.y += b.vy
    b.vx *= friction
    b.vy *= friction

    if (Math.abs(b.vx) < 0.05) b.vx = 0
    if (Math.abs(b.vy) < 0.05) b.vy = 0

    for (const p of pockets) {
      const dx = b.x - p.x
      const dy = b.y - p.y
      if (Math.sqrt(dx*dx + dy*dy) < pocketRadius + ballRadius * 0.5) {
        b.sunk = true
        b.vx = 0
        b.vy = 0
        b.trail = []
        if (idx > 0) {
          if (currentPlayer === 1) player1Score++
          else player2Score++
          updateScore()
          spawnParticles(p.x, p.y, ballColors[idx])
        }
        return
      }
    }

    const minX = tableX + ballRadius + 5
    const maxX = tableX + tableW - ballRadius - 5
    const minY = tableY + ballRadius + 5
    const maxY = tableY + tableH - ballRadius - 5

    if (b.x < minX) { b.x = minX; b.vx = Math.abs(b.vx) * 0.85 }
    if (b.x > maxX) { b.x = maxX; b.vx = -Math.abs(b.vx) * 0.85 }
    if (b.y < minY) { b.y = minY; b.vy = Math.abs(b.vy) * 0.85 }
    if (b.y > maxY) { b.y = maxY; b.vy = -Math.abs(b.vy) * 0.85 }
  })

  for (let i = 0; i < balls.length; i++) {
    if (balls[i].sunk) continue
    for (let j = i + 1; j < balls.length; j++) {
      if (balls[j].sunk) continue
      const a = balls[i], b = balls[j]
      const dx = b.x - a.x, dy = b.y - a.y
      const dist = Math.sqrt(dx*dx + dy*dy)
      const minDist = ballRadius * 2

      if (dist < minDist && dist > 0.1) {
        const nx = dx/dist, ny = dy/dist
        const dvx = a.vx - b.vx, dvy = a.vy - b.vy
        const dvn = dvx*nx + dvy*ny

        if (dvn > 0) {
          a.vx -= dvn * nx * collisionBoost
          a.vy -= dvn * ny * collisionBoost
          b.vx += dvn * nx * collisionBoost
          b.vy += dvn * ny * collisionBoost
        }

        const overlap = (minDist - dist) / 2 + 0.5
        a.x -= overlap * nx
        a.y -= overlap * ny
        b.x += overlap * nx
        b.y += overlap * ny
      }
    }
  }

  particles.forEach((p, i) => {
    if (p.life > 0) {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.3
      p.life--
    }
  })

  const updates = balls.map((b, i) => ({
    id: ballIds[i], type: 'geo',
    x: b.sunk ? -100 : b.x - ballRadius,
    y: b.sunk ? -100 : b.y - ballRadius,
    opacity: b.sunk ? 0 : 1
  }))

  for (let i = 1; i < balls.length; i++) {
    const b = balls[i]
    for (let j = 0; j < trailLen; j++) {
      const t = b.trail[j]
      const size = 4 - j * 0.5
      updates.push({
        id: trailIds[i-1][j], type: 'geo',
        x: t ? t.x - size : -100,
        y: t ? t.y - size : -100,
        props: { w: size * 2, h: size * 2 },
        opacity: t ? 0.3 - j * 0.05 : 0
      })
    }
  }

  particles.forEach((p, i) => {
    updates.push({
      id: particleIds[i], type: 'geo',
      x: p.x - 3, y: p.y - 3,
      props: { color: p.color || 'yellow' },
      opacity: p.life > 0 ? p.life / 30 : 0
    })
  })

  editor.updateShapes(updates)
}, 16)

canvas.zoomToFit({ animation: { duration: 400 } })`
