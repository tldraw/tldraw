export const name = 'Watercolor Spokes Sphere'

export const code = `
const cx = 200, cy = 300
const scale3d = 120
const cameraZ = 1.4

function project({ x, y, z }) {
  return { x: x / z, y: y / z }
}

function rotateX({ x, y, z }, a) {
  const c = Math.cos(a), s = Math.sin(a)
  return { x, y: y * c - z * s, z: y * s + z * c }
}

function rotateY({ x, y, z }, a) {
  const c = Math.cos(a), s = Math.sin(a)
  return { x: x * c + z * s, y, z: -x * s + z * c }
}

const numSpokes = 40
const goldenRatio = (1 + Math.sqrt(5)) / 2
const colors = ['light-blue']
const shapeIds = []

const spherePoints = []
for (let i = 0; i < numSpokes; i++) {
  const theta = 2 * Math.PI * i / goldenRatio
  const phi = Math.acos(1 - 2 * (i + 0.5) / numSpokes)
  spherePoints.push({
    x: Math.sin(phi) * Math.cos(theta),
    y: Math.cos(phi),
    z: Math.sin(phi) * Math.sin(theta)
  })
}

for (let i = 0; i < numSpokes; i++) {
  const spokePoints = [
    { x: cx, y: cy },
    { x: cx + 10, y: cy + 5 },
    { x: cx + 20, y: cy + 10 }
  ]

  const id = canvas.createWatercolor(spokePoints, {
    color: colors[i % colors.length],
    style: 'soft',
    size: 's'
  })
  shapeIds.push(id)
}

let time = 0
let angleX = 40, angleY = 0

const interval = setInterval(() => {
  time += 0.025
  angleX += 0.005
  angleY += 0.01

  const pulse = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time * 2))

  const updates = shapeIds.map((id, i) => {
    let p = { ...spherePoints[i] }

    p = rotateX(p, angleX)
    p = rotateY(p, angleY)

    const z = p.z + cameraZ
    const proj = project({ x: p.x, y: p.y, z })
    const screenX = cx + proj.x * scale3d
    const screenY = cy - proj.y * scale3d

    const depth = 1 - (p.z + 1) / 2
    const spokeLength = pulse * depth

    const numPoints = 8
    const newPoints = []
    for (let j = 0; j < numPoints; j++) {
      const t = j / (numPoints - 1) * spokeLength
      const wobble = Math.sin(time * 3 + i + j * 0.5) * 2
      newPoints.push({
        x: (screenX - cx) * t + wobble,
        y: (screenY - cy) * t + wobble * 0.5
      })
    }

    return {
      id,
      type: 'watercolor',
      x: cx,
      y: cy,
      props: { points: newPoints },
      opacity: Math.min(1, Math.max(0.1, 0.15 + depth * 0.7))
    }
  })

  editor.updateShapes(updates)
}, 50)

canvas.setCamera({ x: cx, y: cy, z: 0.65 })
canvas.zoomToFit({animation: {duration: 400}})`
