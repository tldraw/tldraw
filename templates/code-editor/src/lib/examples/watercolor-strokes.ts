export const name = 'Watercolor strokes'

export const code = `const colors = ['blue', 'violet', 'red', 'orange', 'green', 'light-blue']
const centerX = 400
const centerY = 300
const petalCount = 6
const petalIds = []

function createPetals(rotationOffset, jStart, jEnd) {
  petalIds.forEach(id => canvas.deleteShape(id))
  petalIds.length = 0

  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2 + rotationOffset
    const points = []

    for (let j = jStart; j <= jEnd; j++) {
      const t = j / 30
      const r = Math.sin(t * Math.PI) * 80
      const x = centerX + Math.cos(angle) * t * 100 + Math.cos(angle + Math.PI/2) * r * 0.3
      const y = centerY + Math.sin(angle) * t * 100 + Math.sin(angle + Math.PI/2) * r * 0.3
      points.push({ x, y })
    }

    const id = canvas.createWatercolor(points, {
      color: colors[i % colors.length],
      style: 'soft',
      size: 'm'
    })
    petalIds.push(id)
  }
}

createPetals(0, 0, 30)
canvas.centerOnPoint({ x: centerX, y: centerY }, { animation: { duration: 400 } })

let rotation = 0
let time = 0
const interval = setInterval(() => {
  rotation += 0.03
  time += 0.05

  const jStart = Math.floor(Math.sin(time) * 10 + 10)
  const jEnd = Math.floor(30 - Math.sin(time * 0.7) * 8)

  createPetals(rotation, jStart, jEnd)
}, 50)`
