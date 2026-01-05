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
const node1 = api.createRect(100, 200, 100, 80, {
  color: 'blue',
  fill: 'solid'
})

const node2 = api.createRect(300, 200, 100, 80, {
  color: 'red',
  fill: 'solid'
})

const node3 = api.createRect(200, 350, 100, 80, {
  color: 'green',
  fill: 'solid'
})

// Connect the nodes with arrows
api.createArrow(150, 200, 350, 200)
api.createArrow(150, 280, 250, 350)
api.createArrow(350, 280, 250, 350)`,

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

	'Using raw editor API': `// You can also use the editor directly for full control
const shapes = editor.getCurrentPageShapes()
console.log('Total shapes:', shapes.length)

// Create a shape with the raw API
// Important: Set meta.generated = true to allow clearing!
editor.createShapes([{
  type: 'text',
  x: 200,
  y: 100,
  props: {
    text: 'Direct from editor!',
    size: 'xl',
    color: 'violet'
  },
  meta: { generated: true }
}])

// You can also manipulate existing shapes
const generatedShapes = api.getGeneratedShapes()
console.log('Generated shapes:', generatedShapes.length)`,
}

// The default example shown on first load
export const defaultCode = examples['Basic shapes']
