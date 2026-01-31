export const name = 'Watercolor Mesh Sphere'

export const code = `
const cx = 400, cy = 300
const scale3d = 160
const cameraZ = 2.2

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

const latSteps = 8
const lonSteps = 12
const colors = ['blue', 'light-blue', 'violet', 'light-violet', 'green']
const shapeIds = []
const connections = []

const gridPoints = []
for (let lat = 0; lat <= latSteps; lat++) {
  const phi = (lat / latSteps) * Math.PI
  const row = []
  for (let lon = 0; lon < lonSteps; lon++) {
    const theta = (lon / lonSteps) * Math.PI * 2
    row.push({
      x: Math.sin(phi) * Math.cos(theta),
      y: Math.cos(phi),
      z: Math.sin(phi) * Math.sin(theta),
      lat, lon
    })
  }
  gridPoints.push(row)
}

for (let lat = 0; lat < latSteps; lat++) {
  for (let lon = 0; lon < lonSteps; lon++) {
    const nextLon = (lon + 1) % lonSteps

    connections.push({
      from: { lat, lon },
      to: { lat, lon: nextLon }
    })

    if (lat < latSteps) {
      connections.push({
        from: { lat, lon },
        to: { lat: lat + 1, lon }
      })
    }
  }
}

for (let i = 0; i < connections.length; i++) {
  const id = canvas.createWatercolor([
    { x: cx, y: cy },
    { x: cx + 10, y: cy }
  ], {
    color: colors[i % colors.length],
    style: 'soft',
    size: 's'
  })
  shapeIds.push(id)
}

let time = 0
let angleX = 0, angleY = 0

const interval = setInterval(() => {
  time += 0.018
  angleX += 0.004
  angleY += 0.009

  const breathe = 1 + 0.06 * Math.sin(time * 1.5)

  const transformedGrid = gridPoints.map(row =>
    row.map(p => {
      let tp = {
        x: p.x * breathe,
        y: p.y * breathe,
        z: p.z * breathe
      }
      tp = rotateX(tp, angleX)
      tp = rotateY(tp, angleY)

      const z = tp.z + cameraZ
      const proj = project({ x: tp.x, y: tp.y, z })
      return {
        screenX: cx + proj.x * scale3d,
        screenY: cy - proj.y * scale3d,
        depth: tp.z
      }
    })
  )

  const updates = connections.map((conn, i) => {
    const fromPt = transformedGrid[conn.from.lat][conn.from.lon]
    const toPt = transformedGrid[conn.to.lat][conn.to.lon]

    const avgDepth = (fromPt.depth + toPt.depth) / 2
    const depthFactor = 1 - (avgDepth / breathe + 1) / 2

    const midX = (fromPt.screenX + toPt.screenX) / 2
    const midY = (fromPt.screenY + toPt.screenY) / 2
    const curveOffset = Math.sin(time * 2 + i * 0.3) * 3

    const newPoints = [
      { x: 0, y: 0 },
      { x: (midX - fromPt.screenX) + curveOffset, y: (midY - fromPt.screenY) + curveOffset },
      { x: toPt.screenX - fromPt.screenX, y: toPt.screenY - fromPt.screenY }
    ]

    return {
      id: shapeIds[i],
      type: 'watercolor',
      x: fromPt.screenX,
      y: fromPt.screenY,
      props: { points: newPoints },
      opacity: Math.min(1, Math.max(0.08, 0.1 + depthFactor * 0.6))
    }
  })

  editor.updateShapes(updates)
}, 50)

canvas.setCamera({ x: cx, y: cy, z: 0.6 })`
