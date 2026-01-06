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

	'Grid pattern': `const colors = ['blue', 'red', 'green', 'orange', 'violet']
const shapeIds = []

for (let i = 0; i < 5; i++) {
  const id = api.createCircle(150 + i * 120, 200, 40, {
    color: colors[i],
    fill: 'solid'
  })
  shapeIds.push(id)
}

let frame = 0
const interval = setInterval(() => {
  frame++

  shapeIds.forEach((id, i) => {
    const shape = editor.getShape(id)
    if (!shape) return

    const offset = Math.sin((frame + i * 20) * 0.1) * 50

    editor.updateShapes([{
      id: id,
      type: 'geo',
      y: 200 + offset - 40
    }])
  })
}, 50)`,

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

	'Canvas inspector': `// Inspect what's on the canvas
// Draw some shapes on the canvas first, then run this!

const shapes = api.getAllShapes()
console.log('Total shapes on canvas:', shapes.length)

// Group shapes by type
const byType = {}
shapes.forEach(shape => {
  byType[shape.type] = (byType[shape.type] || 0) + 1
})
console.log('Shapes by type:', byType)

// Show shape details
shapes.forEach(shape => {
  console.log(\`- \${shape.type} at (\${Math.round(shape.x)}, \${Math.round(shape.y)})\`)
  if (shape.props.color) {
    console.log(\`  color: \${shape.props.color}\`)
  }
})

// Check camera position
const camera = api.getCamera()
console.log('Camera:', {
  x: Math.round(camera.x),
  y: Math.round(camera.y),
  zoom: camera.z.toFixed(2)
})`,

	Selection: `// Working with selection
// First, let's create some shapes to select

const rect1 = api.createRect(100, 100, 100, 80, {
  color: 'blue', fill: 'solid'
})
const rect2 = api.createRect(250, 100, 100, 80, {
  color: 'red', fill: 'solid'
})
const rect3 = api.createRect(400, 100, 100, 80, {
  color: 'green', fill: 'solid'
})

// Select the first shape
editor.select(rect1)
console.log('Selected 1 shape')

// After a moment, select multiple shapes
setTimeout(() => {
  editor.select(rect1, rect2, rect3)
  console.log('Selected all 3 shapes')

  // Log selection info
  const selected = editor.getSelectedShapes()
  console.log('Selected shapes:', selected.map(s => s.props.color))
}, 1000)

// Select all, then deselect
setTimeout(() => {
  editor.selectAll()
  console.log('Selected all shapes on canvas')
}, 2000)

setTimeout(() => {
  editor.selectNone()
  console.log('Deselected all')
}, 3000)`,

	'Modify shapes': `// Modify existing shapes
// Create shapes and then animate their properties

const colors = ['blue', 'red', 'green', 'orange', 'violet']
const shapeIds = []

// Create a row of circles
for (let i = 0; i < 5; i++) {
  const id = api.createCircle(150 + i * 120, 200, 40, {
    color: colors[i],
    fill: 'solid'
  })
  shapeIds.push(id)
}

// Animate them in a wave pattern
let frame = 0
const interval = setInterval(() => {
  frame++

  // Update each shape's position
  shapeIds.forEach((id, i) => {
    const shape = editor.getShape(id)
    if (!shape) return

    // Wave motion
    const offset = Math.sin((frame + i * 20) * 0.1) * 50

    editor.updateShapes([{
      id: id,
      type: 'geo',
      y: 200 + offset - 40 // Subtract radius since circle uses top-left
    }])
  })

  // Stop after 5 seconds
  if (frame > 100) {
    clearInterval(interval)
  }
}, 50)
`,

	'Color cycle': `// Cycle colors on shapes over time
// Creates shapes that change color every second

const shapeIds = []

// Create a 3x3 grid of shapes
for (let row = 0; row < 3; row++) {
  for (let col = 0; col < 3; col++) {
    const id = api.createRect(
      100 + col * 120,
      100 + row * 120,
      100,
      100,
      { color: 'blue', fill: 'solid', geo: 'rectangle' }
    )
    shapeIds.push(id)
  }
}

const colors = ['blue', 'violet', 'red', 'orange', 'yellow', 'green', 'light-blue']
let colorIndex = 0

// Change colors every 500ms
const interval = setInterval(() => {
  colorIndex = (colorIndex + 1) % colors.length

  // Update each shape with offset colors
  shapeIds.forEach((id, i) => {
    const color = colors[(colorIndex + i) % colors.length]
    editor.updateShapes([{
      id: id,
      type: 'geo',
      props: { color: color }
    }])
  })
}, 500)

// Stop after 10 seconds
setTimeout(() => {
  clearInterval(interval)
  console.log('Color cycling complete!')
}, 10000)

console.log('Color cycling started (10 seconds)...')`,

	'Bezier curve': `// Elegant petal pattern using bezier curves
// Double-click any curve to edit it and drag the control handles!

const cx = 400  // Center X
const cy = 280  // Center Y
const size = 120 // Petal size

// Create 6 petals radiating from center, like a flower
for (let i = 0; i < 6; i++) {
  const angle = (i * Math.PI) / 3  // 60 degrees apart
  const nextAngle = angle + Math.PI / 3
  
  // Direction vectors
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  const ndx = Math.cos(nextAngle)
  const ndy = Math.sin(nextAngle)
  
  // Each petal curves outward and back
  api.createBezier(cx, cy, {
    start: { x: 0, y: 0 },
    cp1: { x: dx * size * 1.8, y: dy * size * 1.8 },
    cp2: { x: ndx * size * 1.8, y: ndy * size * 1.8 },
    end: { x: 0, y: 0 }
  })
}

// Inner petals nested inside the outer ones
for (let i = 0; i < 6; i++) {
  const angle = (i * Math.PI) / 3  // Same angles as outer petals
  const nextAngle = angle + Math.PI / 3
  
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  const ndx = Math.cos(nextAngle)
  const ndy = Math.sin(nextAngle)
  
  // Smaller petal inside each outer petal
  api.createBezier(cx, cy, {
    start: { x: 0, y: 0 },
    cp1: { x: dx * size * 0.9, y: dy * size * 0.9 },
    cp2: { x: ndx * size * 0.9, y: ndy * size * 0.9 },
    end: { x: 0, y: 0 }
  })
}

// Frame the creation
api.zoomToFit({ animation: { duration: 400 } })`,
}

// The default example shown on first load
export const defaultCode = examples['Basic shapes']
