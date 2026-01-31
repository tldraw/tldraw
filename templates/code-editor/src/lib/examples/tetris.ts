export const name = 'Tetris'

export const code = `// Tetris - Arrow keys to move/rotate, Down to drop faster

const cols = 10, rows = 20
const cellSize = 22
const startX = 250, startY = 50

// Tetromino shapes and colors
const pieces = [
  { shape: [[1,1,1,1]], color: 'light-blue' },           // I
  { shape: [[1,1],[1,1]], color: 'yellow' },             // O
  { shape: [[0,1,0],[1,1,1]], color: 'violet' },         // T
  { shape: [[0,1,1],[1,1,0]], color: 'green' },          // S
  { shape: [[1,1,0],[0,1,1]], color: 'red' },            // Z
  { shape: [[1,0,0],[1,1,1]], color: 'blue' },           // L
  { shape: [[0,0,1],[1,1,1]], color: 'orange' }          // J
]

// Create grid cells
const cellIds = []
for (let y = 0; y < rows; y++) {
  cellIds[y] = []
  for (let x = 0; x < cols; x++) {
    cellIds[y][x] = canvas.createRect(
      startX + x * cellSize, startY + y * cellSize,
      cellSize - 1, cellSize - 1,
      { color: 'grey', fill: 'none' }
    )
  }
}

// Game state
const grid = Array(rows).fill(null).map(() => Array(cols).fill(null))
let current = null
let curX = 0, curY = 0
let score = 0
let gameOver = false

// Score display
const scoreId = canvas.createText(startX, startY - 30, 'Score: 0', { size: 'm' })

function newPiece() {
  const p = pieces[Math.floor(Math.random() * pieces.length)]
  current = { shape: p.shape.map(r => [...r]), color: p.color }
  curX = Math.floor(cols / 2) - Math.floor(current.shape[0].length / 2)
  curY = 0
  if (collides(curX, curY, current.shape)) gameOver = true
}

function rotate(shape) {
  const h = shape.length, w = shape[0].length
  const rotated = Array(w).fill(null).map(() => Array(h).fill(0))
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      rotated[x][h - 1 - y] = shape[y][x]
  return rotated
}

function collides(px, py, shape) {
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[0].length; x++) {
      if (shape[y][x]) {
        const nx = px + x, ny = py + y
        if (nx < 0 || nx >= cols || ny >= rows) return true
        if (ny >= 0 && grid[ny][nx]) return true
      }
    }
  }
  return false
}

function merge() {
  for (let y = 0; y < current.shape.length; y++) {
    for (let x = 0; x < current.shape[0].length; x++) {
      if (current.shape[y][x] && curY + y >= 0) {
        grid[curY + y][curX + x] = current.color
      }
    }
  }
}

function clearLines() {
  let cleared = 0
  for (let y = rows - 1; y >= 0; y--) {
    if (grid[y].every(c => c)) {
      grid.splice(y, 1)
      grid.unshift(Array(cols).fill(null))
      cleared++
      y++
    }
  }
  score += [0, 100, 300, 500, 800][cleared]
}

// Controls
document.addEventListener('keydown', (e) => {
  if (gameOver || !current) return
  if (e.key === 'ArrowLeft' && !collides(curX - 1, curY, current.shape)) curX--
  if (e.key === 'ArrowRight' && !collides(curX + 1, curY, current.shape)) curX++
  if (e.key === 'ArrowDown' && !collides(curX, curY + 1, current.shape)) curY++
  if (e.key === 'ArrowUp') {
    const rotated = rotate(current.shape)
    if (!collides(curX, curY, rotated)) current.shape = rotated
  }
  render()
})

function render() {
  const updates = []
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let color = grid[y][x]
      let fill = color ? 'solid' : 'none'

      // Draw current piece
      if (current) {
        const py = y - curY, px = x - curX
        if (py >= 0 && py < current.shape.length && px >= 0 && px < current.shape[0].length) {
          if (current.shape[py][px]) {
            color = current.color
            fill = 'solid'
          }
        }
      }

      updates.push({
        id: cellIds[y][x], type: 'geo',
        props: { color: color || 'grey', fill }
      })
    }
  }
  editor.updateShapes(updates)
  editor.updateShapes([{
    id: scoreId, type: 'text',
    props: { richText: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Score: ' + score }] }] } }
  }])
}

newPiece()

const interval = setInterval(() => {
  if (gameOver) {
    canvas.createText(startX + 20, startY + rows * cellSize / 2, 'GAME OVER', { size: 'xl', color: 'red' })
    clearInterval(interval)
    return
  }

  if (!collides(curX, curY + 1, current.shape)) {
    curY++
  } else {
    merge()
    clearLines()
    newPiece()
  }
  render()
}, 500)

canvas.zoomToFit({ animation: { duration: 400 } })`
