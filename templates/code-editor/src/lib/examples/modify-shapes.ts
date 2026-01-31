export const name = 'Modify shapes'

export const code = `// Create shapes and then animate their properties

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
`
