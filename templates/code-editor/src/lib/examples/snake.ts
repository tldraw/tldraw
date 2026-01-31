export const name = 'Snake'

export const code = `
const gridSize = 20
const cellSize = 20
const startX = 150, startY = 100

canvas.createFrame(startX - 5, startY - 5, gridSize * cellSize + 10, gridSize * cellSize + 10, { name: 'Snake' })

let snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]
let dir = { x: 1, y: 0 }
let food = { x: 15, y: 10 }
let gameOver = false
let score = 0

const snakeIds = []
for (let i = 0; i < 100; i++) {
  snakeIds.push(canvas.createRect(0, 0, cellSize - 2, cellSize - 2, {
    color: i === 0 ? 'green' : 'light-green',
    fill: 'solid'
  }))
}

const foodId = canvas.createCircle(
  startX + food.x * cellSize + cellSize/2,
  startY + food.y * cellSize + cellSize/2,
  cellSize/2 - 2,
  { color: 'red', fill: 'solid' }
)

const scoreId = canvas.createText(startX, startY - 30, 'Score: 0', { size: 'm' })

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp' && dir.y !== 1) dir = { x: 0, y: -1 }
  if (e.key === 'ArrowDown' && dir.y !== -1) dir = { x: 0, y: 1 }
  if (e.key === 'ArrowLeft' && dir.x !== 1) dir = { x: -1, y: 0 }
  if (e.key === 'ArrowRight' && dir.x !== -1) dir = { x: 1, y: 0 }
})

function spawnFood() {
  do {
    food = {
      x: Math.floor(Math.random() * gridSize),
      y: Math.floor(Math.random() * gridSize)
    }
  } while (snake.some(s => s.x === food.x && s.y === food.y))
}

const interval = setInterval(() => {
  if (gameOver) return

  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y }

  if (head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize) {
    gameOver = true
    canvas.createText(startX + 60, startY + gridSize * cellSize / 2, 'GAME OVER', {
      size: 'xl', color: 'red'
    })
    return
  }

  if (snake.some(s => s.x === head.x && s.y === head.y)) {
    gameOver = true
    canvas.createText(startX + 60, startY + gridSize * cellSize / 2, 'GAME OVER', {
      size: 'xl', color: 'red'
    })
    return
  }

  snake.unshift(head)

  if (head.x === food.x && head.y === food.y) {
    score += 10
    spawnFood()
    editor.updateShapes([{
      id: foodId, type: 'geo',
      x: startX + food.x * cellSize + 2,
      y: startY + food.y * cellSize + 2
    }])
  } else {
    snake.pop()
  }

  const updates = snakeIds.map((id, i) => {
    if (i < snake.length) {
      const s = snake[i]
      return {
        id, type: 'geo',
        x: startX + s.x * cellSize,
        y: startY + s.y * cellSize,
        props: { color: i === 0 ? 'green' : 'light-green' },
        opacity: 1
      }
    } else {
      return { id, type: 'geo', opacity: 0 }
    }
  })

  editor.updateShapes([{
    id: scoreId, type: 'text',
    props: { richText: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Score: ' + score }] }] } }
  }])

  editor.updateShapes(updates)
}, 150)

canvas.zoomToFit({ animation: { duration: 400 } })`
