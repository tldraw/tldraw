export const name = 'Color cycle'

export const code = `// Creates shapes that change color every second

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

canvas.zoomToFit({ animation: { duration: 400 } })`
