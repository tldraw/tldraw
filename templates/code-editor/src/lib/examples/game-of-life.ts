export const name = 'Game of Life'

export const code = `// Conway's Game of Life cellular automaton

const cols = 20, rows = 15
const cellSize = 22
const startX = 150, startY = 100

// Initialize grid with random state
let grid = []
for (let y = 0; y < rows; y++) {
  grid[y] = []
  for (let x = 0; x < cols; x++) {
    grid[y][x] = Math.random() > 0.65 ? 1 : 0
  }
}

// Create cell shapes
const cellIds = []
for (let y = 0; y < rows; y++) {
  cellIds[y] = []
  for (let x = 0; x < cols; x++) {
    const id = canvas.createRect(
      startX + x * cellSize,
      startY + y * cellSize,
      cellSize - 2,
      cellSize - 2,
      {
        color: 'blue',
        fill: 'solid'
      }
    )
    cellIds[y][x] = id
  }
}

// Count live neighbors
function countNeighbors(g, x, y) {
  let count = 0
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue
      const ny = (y + dy + rows) % rows  // wrap around
      const nx = (x + dx + cols) % cols
      count += g[ny][nx]
    }
  }
  return count
}

// Compute next generation
function nextGen() {
  const next = []
  for (let y = 0; y < rows; y++) {
    next[y] = []
    for (let x = 0; x < cols; x++) {
      const neighbors = countNeighbors(grid, x, y)
      const alive = grid[y][x]

      if (alive && (neighbors === 2 || neighbors === 3)) {
        next[y][x] = 1  // survives
      } else if (!alive && neighbors === 3) {
        next[y][x] = 1  // birth
      } else {
        next[y][x] = 0  // dies
      }
    }
  }
  return next
}

// Animation loop
const colors = ['light-blue', 'blue', 'violet', 'green']
let generation = 0

const interval = setInterval(() => {
  generation++
  grid = nextGen()

  // Update cell visibility
  const updates = []
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const alive = grid[y][x]
      updates.push({
        id: cellIds[y][x],
        type: 'geo',
        props: {
          color: colors[generation % colors.length]
        },
        opacity: alive ? 1 : 0.05
      })
    }
  }
  editor.updateShapes(updates)
}, 150)

canvas.zoomToFit({ animation: { duration: 400 } })`
