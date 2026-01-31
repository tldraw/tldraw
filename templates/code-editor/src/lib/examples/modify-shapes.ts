export const name = 'Modify shapes'

export const code = `
const colors = ['blue', 'red', 'green', 'orange', 'violet']
const shapeIds = []

for (let i = 0; i < 5; i++) {
  const id = canvas.createCircle(150 + i * 120, 200, 40, {
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
}, 50)

canvas.zoomToFit({ animation: { duration: 400 } })
`
