export const name = '3D Sphere'

export const code = `
const cx = 400, cy = 300
const scale3d = 100

function project({ x, y, z }) {
  return { x: x / z, y: y / z }
}

function rotateX({ x, y, z }, a) {
  const c = Math.cos(a), s = Math.sin(a)
  return { x, y: y*c - z*s, z: y*s + z*c }
}

function rotateY({ x, y, z }, a) {
  const c = Math.cos(a), s = Math.sin(a)
  return { x: x*c + z*s, y, z: -x*s + z*c }
}

const points = []
const radius = 1.0
const latSteps = 10, lonSteps = 16

for (let lat = 1; lat < latSteps; lat++) {
  const theta = (lat * Math.PI) / latSteps
  for (let lon = 0; lon < lonSteps; lon++) {
    const phi = (lon * 2 * Math.PI) / lonSteps
    points.push({
      x: radius * Math.sin(theta) * Math.cos(phi),
      y: radius * Math.cos(theta),
      z: radius * Math.sin(theta) * Math.sin(phi),
      lat, lon
    })
  }
}

const colors = ['red', 'orange', 'yellow', 'green', 'blue', 'violet']
const shapeIds = points.map((p) => {
  return canvas.createCircle(cx, cy, 3, {
    color: colors[p.lon % 6],
    fill: 'pattern'
  })
})

let time = 0
let angleX = 0, angleY = 0
const cameraZ = 3.5

const interval = setInterval(() => {
  time += 0.03
  angleX += 0.012
  angleY += 0.018

  const breathe = 1 + 0.15 * Math.sin(time * 2)

  const updates = shapeIds.map((id, i) => {
    const pt = points[i]

    const flicker = Math.random() > 0.12

    let p = { x: pt.x * breathe, y: pt.y * breathe, z: pt.z * breathe }

    p = rotateX(p, angleX)
    p = rotateY(p, angleY)

    const z = p.z + cameraZ
    const proj = project({ x: p.x, y: p.y, z })
    const screenX = cx + proj.x * scale3d
    const screenY = cy - proj.y * scale3d

    const depth = 1 - (p.z / breathe + radius) / (radius * 2)
    const size = 2 + depth * 4

    const colorIdx = Math.floor(time + pt.lon * 0.5) % 6

    return {
      id,
      type: 'geo',
      x: screenX - size,
      y: screenY - size,
      props: { w: size * 2, h: size * 2, color: colors[colorIdx] },
      opacity: flicker ? (0.3 + depth * 0.7) : 0
    }
  })

  editor.updateShapes(updates)
}, 50)

canvas.zoomToFit({ animation: { duration: 400 } })`
