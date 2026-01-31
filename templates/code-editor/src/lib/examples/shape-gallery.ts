export const name = 'Shape gallery'

export const code = `// A gallery showcasing all available shapes

const shapes = [
  { fn: 'createRect', args: [0, 0, 80, 80], label: 'Rectangle' },
  { fn: 'createCircle', args: [140, 40, 40], label: 'Circle' },
  { fn: 'createEllipse', args: [260, 40, 90, 60], label: 'Ellipse' },
  { fn: 'createTriangle', args: [320, 0, 80, 80], label: 'Triangle' },
  { fn: 'createDiamond', args: [420, 0, 80, 80], label: 'Diamond' },
  { fn: 'createStar', args: [520, 0, 80, 80], label: 'Star' },
  { fn: 'createHexagon', args: [0, 120, 80, 80], label: 'Hexagon' },
  { fn: 'createPentagon', args: [100, 120, 80, 80], label: 'Pentagon' },
  { fn: 'createOctagon', args: [200, 120, 80, 80], label: 'Octagon' },
  { fn: 'createCloud', args: [300, 120, 100, 70], label: 'Cloud' },
  { fn: 'createHeart', args: [420, 120, 80, 80], label: 'Heart' },
  { fn: 'createOval', args: [520, 120, 90, 60], label: 'Oval' },
  { fn: 'createTrapezoid', args: [0, 240, 80, 60], label: 'Trapezoid' },
  { fn: 'createRhombus', args: [100, 240, 80, 80], label: 'Rhombus' },
]

const colors = ['red', 'orange', 'yellow', 'green', 'blue', 'violet', 'light-blue']

shapes.forEach((shape, i) => {
  // Create shape
  canvas[shape.fn](...shape.args, {
    color: colors[i % colors.length],
    fill: 'solid'
  })

  // Add label below
  const x = shape.args[0]
  const y = shape.args[1] + (shape.args[3] || shape.args[2] * 2) + 5
  canvas.createText(x, y, shape.label, {
    size: 's',
    color: 'black'
  })
})

// Add arrows section
canvas.createText(220, 340, 'Arrow Styles:', { size: 'm' })
const arrowStyles = ['arrow', 'triangle', 'diamond', 'dot', 'bar']
arrowStyles.forEach((style, i) => {
  canvas.createArrow(50 + i * 110, 380, 120 + i * 110, 380, {
    color: colors[i],
    arrowheadEnd: style
  })
  canvas.createText(50 + i * 110, 395, style, { size: 's' })
})

canvas.zoomToFit({ animation: { duration: 400 } })`
