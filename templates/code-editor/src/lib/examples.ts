/**
 * Example code snippets for the code editor.
 * These demonstrate the API and provide starting points for users.
 */

export const examples: Record<string, string> = {
	'Modify shapes': `// Create shapes and then animate their properties

const colors = ['blue', 'red', 'green', 'orange', 'violet']
const shapeIds = []

// Create a row of circles
for (let i = 0; i < 5; i++) {
  const id = canvas.createCircle(150 + i * 120, 200, 40, {
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
}, 50)

canvas.zoomToFit({ animation: { duration: 400 } })
`,

	'Color cycle': `// Creates shapes that change color every second

const shapeIds = []

// Create a 3x3 grid of shapes
for (let row = 0; row < 3; row++) {
  for (let col = 0; col < 3; col++) {
    const id = canvas.createRect(
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
}, 10000)

canvas.zoomToFit({ animation: { duration: 400 } })`,

	'Camera controls': `// Generate shapes and get camera to follow

const centerX = 400
const centerY = 300
const radius = 180

// Order shapes in a pentagon formation
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
canvas.setCamera({ x: -firstX + 300, y: -firstY + 200, z: 4 })

// Sequentially create shapes and follow with camera
let delay = 300
shapes.forEach((shape, i) => {
  setTimeout(() => {
    const angle = shape.angle * (Math.PI / 180)
    const x = centerX + Math.cos(angle) * radius - shape.size / 2
    const y = centerY + Math.sin(angle) * radius - shape.size / 2

    canvas.createRect(x, y, shape.size, shape.size, {
      color: shape.color,
      fill: 'solid',
      geo: shape.geo
    })

    // Snappy camera animation
    setTimeout(() => {
      canvas.centerOnPoint(
        { x: x + shape.size / 2, y: y + shape.size / 2 },
        { animation: { duration: 250 } }
      )
    }, 50)
  }, delay)
  delay += 350
})

// Zoom out at the end to reveal the pentagon formation
setTimeout(() => {
  canvas.zoomToFit({ animation: { duration: 500 } })
}, delay + 200)`,

	'Bezier curve': `// Here's a flower made using bezier curves
// Double-click any curve to edit it and drag the control handles!

const cx = 400  // Center X
const cy = 280  // Center Y
const size = 120 // Petal size

// Create 6 petals radiating from center
for (let i = 0; i < 6; i++) {
  const angle = (i * Math.PI) / 3 
  const nextAngle = angle + Math.PI / 3

  // Direction vectors
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  const ndx = Math.cos(nextAngle)
  const ndy = Math.sin(nextAngle)

  // Each petal curves outward and back
  canvas.createBezier(cx, cy, {
    start: { x: 0, y: 0 },
    cp1: { x: dx * size * 1.8, y: dy * size * 1.8 },
    cp2: { x: ndx * size * 1.8, y: ndy * size * 1.8 },
    end: { x: 0, y: 0 }
  })
}

// Inner petals nested inside the outer ones
for (let i = 0; i < 6; i++) {
  const angle = (i * Math.PI) / 3
  const nextAngle = angle + Math.PI / 3

  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  const ndx = Math.cos(nextAngle)
  const ndy = Math.sin(nextAngle)

  // Smaller petal inside each outer petal
  canvas.createBezier(cx, cy, {
    start: { x: 0, y: 0 },
    cp1: { x: dx * size * 0.9, y: dy * size * 0.9 },
    cp2: { x: ndx * size * 0.9, y: ndy * size * 0.9 },
    end: { x: 0, y: 0 }
  })
}

canvas.zoomToFit({ animation: { duration: 400 } })`,
}

// The default example shown on first load
export const defaultCode = examples['Modify shapes']
