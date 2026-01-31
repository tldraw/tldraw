export const name = 'Camera controls'

export const code = `// Generate shapes and get camera to follow

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
}, delay + 200)`
