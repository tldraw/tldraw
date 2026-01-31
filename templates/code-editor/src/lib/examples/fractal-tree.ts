export const name = 'Fractal tree'

export const code = `// Recursive fractal tree using lines

function drawBranch(x, y, length, angle, depth) {
  if (depth === 0 || length < 5) return

  const endX = x + Math.cos(angle) * length
  const endY = y + Math.sin(angle) * length

  // Color based on depth (brown trunk to green leaves)
  const colors = ['black', 'black', 'grey', 'green', 'light-green']
  const color = colors[Math.min(depth - 1, colors.length - 1)]

  canvas.createArrow(x, y, endX, endY, {
    color,
    arrowheadStart: 'none',
    arrowheadEnd: 'none',
    size: depth > 3 ? 'l' : depth > 1 ? 'm' : 's'
  })

  // Recursive branches
  const shrink = 0.7
  const spread = 0.5
  drawBranch(endX, endY, length * shrink, angle - spread, depth - 1)
  drawBranch(endX, endY, length * shrink, angle + spread, depth - 1)

  // Add extra branch for variation
  if (depth > 3 && Math.random() > 0.5) {
    drawBranch(endX, endY, length * shrink * 0.8, angle, depth - 1)
  }
}

// Draw tree starting from bottom center
const startX = 400
const startY = 500
const trunkLength = 100
const startAngle = -Math.PI / 2  // pointing up

drawBranch(startX, startY, trunkLength, startAngle, 7)

// Add some decorative elements
canvas.createCircle(startX, startY + 20, 30, {
  color: 'black',
  fill: 'solid'
})

canvas.zoomToFit({ animation: { duration: 400 } })`
