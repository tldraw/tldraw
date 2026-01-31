export const name = 'Maze generator'

export const code = `// Generate a random maze using recursive backtracking

const cols = 12, rows = 8
const cellSize = 50
const startX = 100, startY = 80
const walls = []

// Initialize grid
const grid = []
for (let y = 0; y < rows; y++) {
  grid[y] = []
  for (let x = 0; x < cols; x++) {
    grid[y][x] = { visited: false, walls: [true, true, true, true] } // top, right, bottom, left
  }
}

// Recursive backtracking
const stack = []
let current = { x: 0, y: 0 }
grid[0][0].visited = true

function getUnvisitedNeighbors(x, y) {
  const neighbors = []
  if (y > 0 && !grid[y-1][x].visited) neighbors.push({ x, y: y-1, dir: 0 })
  if (x < cols-1 && !grid[y][x+1].visited) neighbors.push({ x: x+1, y, dir: 1 })
  if (y < rows-1 && !grid[y+1][x].visited) neighbors.push({ x, y: y+1, dir: 2 })
  if (x > 0 && !grid[y][x-1].visited) neighbors.push({ x: x-1, y, dir: 3 })
  return neighbors
}

// Generate maze
while (true) {
  const neighbors = getUnvisitedNeighbors(current.x, current.y)
  if (neighbors.length > 0) {
    const next = neighbors[Math.floor(Math.random() * neighbors.length)]
    stack.push(current)

    // Remove walls between current and next
    grid[current.y][current.x].walls[next.dir] = false
    grid[next.y][next.x].walls[(next.dir + 2) % 4] = false

    current = { x: next.x, y: next.y }
    grid[current.y][current.x].visited = true
  } else if (stack.length > 0) {
    current = stack.pop()
  } else {
    break
  }
}

// Draw walls
for (let y = 0; y < rows; y++) {
  for (let x = 0; x < cols; x++) {
    const px = startX + x * cellSize
    const py = startY + y * cellSize
    const cell = grid[y][x]

    if (cell.walls[0]) // top
      canvas.createArrow(px, py, px + cellSize, py, { color: 'black', arrowheadStart: 'none', arrowheadEnd: 'none' })
    if (cell.walls[1]) // right
      canvas.createArrow(px + cellSize, py, px + cellSize, py + cellSize, { color: 'black', arrowheadStart: 'none', arrowheadEnd: 'none' })
    if (cell.walls[2]) // bottom
      canvas.createArrow(px, py + cellSize, px + cellSize, py + cellSize, { color: 'black', arrowheadStart: 'none', arrowheadEnd: 'none' })
    if (cell.walls[3]) // left
      canvas.createArrow(px, py, px, py + cellSize, { color: 'black', arrowheadStart: 'none', arrowheadEnd: 'none' })
  }
}

// Mark start and end
canvas.createCircle(startX + cellSize/2, startY + cellSize/2, 15, { color: 'green', fill: 'solid' })
canvas.createStar(startX + (cols-0.5) * cellSize, startY + (rows-0.5) * cellSize, 30, 30, { color: 'yellow', fill: 'solid' })

canvas.zoomToFit({ animation: { duration: 400 } })`
