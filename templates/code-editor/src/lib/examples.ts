/**
 * Example code snippets for the code editor.
 * These demonstrate the API and provide starting points for users.
 */

export const examples: Record<string, string> = {
	'Basic shapes': `// Create a blue rectangle
api.createRect(100, 100, 200, 150, {
  color: 'blue',
  fill: 'solid'
})

// Create a red circle
api.createCircle(400, 200, 75, {
  color: 'red',
  fill: 'semi'
})

// Create some text
api.createText(100, 300, 'Made with code!', {
  color: 'violet'
})`,

	'Grid pattern': `// Create a 5x5 grid of colorful squares
const colors = ['blue', 'red', 'green', 'orange', 'violet']

for (let row = 0; row < 5; row++) {
  for (let col = 0; col < 5; col++) {
    api.createRect(
      col * 120 + 50,
      row * 120 + 50,
      100,
      100,
      {
        color: colors[row],
        fill: 'semi'
      }
    )
  }
}`,

	'Random circles': `// Create 20 random circles
for (let i = 0; i < 20; i++) {
  const x = Math.random() * 800 + 100
  const y = Math.random() * 600 + 100
  const radius = Math.random() * 40 + 20

  api.createCircle(x, y, radius, {
    color: ['blue', 'red', 'green', 'orange'][i % 4],
    fill: 'semi'
  })
}`,

	'Connected nodes': `// Create nodes with arrows connecting them
// Node dimensions
const nodeW = 120
const nodeH = 80

// Create three nodes in a triangle layout
const node1 = api.createRect(100, 150, nodeW, nodeH, {
  color: 'blue',
  fill: 'solid'
})

const node2 = api.createRect(350, 150, nodeW, nodeH, {
  color: 'red',
  fill: 'solid'
})

const node3 = api.createRect(225, 300, nodeW, nodeH, {
  color: 'green',
  fill: 'solid'
})

// Calculate center points for arrow connections
// Node 1 center: (160, 190), Node 2 center: (410, 190), Node 3 center: (285, 340)

// Connect node 1 to node 2 (horizontal)
api.createArrow(100 + nodeW, 150 + nodeH/2, 350, 150 + nodeH/2)

// Connect node 1 to node 3 (diagonal down-left to down-right)
api.createArrow(100 + nodeW/2, 150 + nodeH, 225 + nodeW/2, 300)

// Connect node 2 to node 3 (diagonal down-right to down-left)
api.createArrow(350 + nodeW/2, 150 + nodeH, 225 + nodeW/2, 300)`,

	'Spiral pattern': `// Create a colorful spiral
const colors = ['blue', 'violet', 'red', 'orange', 'green']
const centerX = 400
const centerY = 300

for (let i = 0; i < 50; i++) {
  const angle = i * 0.5
  const radius = i * 8
  const x = centerX + Math.cos(angle) * radius
  const y = centerY + Math.sin(angle) * radius

  api.createCircle(x, y, 15, {
    color: colors[i % colors.length],
    fill: 'solid'
  })
}`,

	'Camera controls': `// Animated shape sequence with camera following
// Creates shapes in a pentagon constellation pattern

const centerX = 400
const centerY = 300
const radius = 180

// Pentagon vertices with different shapes and colors
const shapes = [
  { angle: -90, geo: 'diamond', color: 'violet', size: 50 },
  { angle: -18, geo: 'hexagon', color: 'blue', size: 55 },
  { angle: 54, geo: 'octagon', color: 'green', size: 60 },
  { angle: 126, geo: 'star', color: 'orange', size: 65 },
  { angle: 198, geo: 'pentagon', color: 'red', size: 58 },
]

// Start super zoomed in on first shape position
const firstAngle = shapes[0].angle * (Math.PI / 180)
const firstX = centerX + Math.cos(firstAngle) * radius
const firstY = centerY + Math.sin(firstAngle) * radius
api.setCamera({ x: -firstX + 300, y: -firstY + 200, z: 4 })

// Sequentially create shapes and follow with camera
let delay = 300
shapes.forEach((shape, i) => {
  setTimeout(() => {
    const angle = shape.angle * (Math.PI / 180)
    const x = centerX + Math.cos(angle) * radius - shape.size / 2
    const y = centerY + Math.sin(angle) * radius - shape.size / 2

    api.createRect(x, y, shape.size, shape.size, {
      color: shape.color,
      fill: 'solid',
      geo: shape.geo
    })

    // Camera follows with snappy animation
    setTimeout(() => {
      api.centerOnPoint(
        { x: x + shape.size / 2, y: y + shape.size / 2 },
        { animation: { duration: 250 } }
      )
    }, 50)
  }, delay)
  delay += 350
})

// Final zoom out to reveal the constellation
setTimeout(() => {
  api.zoomToFit({ animation: { duration: 500 } })
}, delay + 200)`,
}

// The default example shown on first load
export const defaultCode = examples['Basic shapes']
