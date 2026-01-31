export const name = '3D Torus'

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
const R = 1.0
const r = 0.4
const uSteps = 24, vSteps = 12

for (let u = 0; u < uSteps; u++) {
  const theta = (u / uSteps) * Math.PI * 2
  for (let v = 0; v < vSteps; v++) {
    const phi = (v / vSteps) * Math.PI * 2

    points.push({
      x: (R + r * Math.cos(phi)) * Math.cos(theta),
      y: r * Math.sin(phi),
      z: (R + r * Math.cos(phi)) * Math.sin(theta),
      u, v
    })
  }
}

const shapeIds = points.map((p, i) => {
  const hueIdx = p.u % 6
  const colors = ['red', 'orange', 'yellow', 'green', 'blue', 'violet']
  return canvas.createCircle(cx, cy, 3, {
    color: colors[hueIdx],
    fill: 'solid'
  })
})

let angleX = 0.5, angleY = 0
const cameraZ = 4

const interval = setInterval(() => {
  angleX += 0.02
  angleY += 0.025

  const updates = points.map((p, i) => {
    let pt = { x: p.x, y: p.y, z: p.z }
    pt = rotateX(pt, angleX)
    pt = rotateY(pt, angleY)

    const z = pt.z + cameraZ
    const proj = project({ x: pt.x, y: pt.y, z })
    const screenX = cx + proj.x * scale3d
    const screenY = cy - proj.y * scale3d

    const depth = (pt.z + R + r) / (2 * (R + r))
    const size = 2 + (1 - depth) * 5
    const opacity = 0.3 + (1 - depth) * 0.7

    return {
      id: shapeIds[i],
      type: 'geo',
      x: screenX - size,
      y: screenY - size,
      props: { w: size * 2, h: size * 2 },
      opacity
    }
  })

  editor.updateShapes(updates)
}, 40)

canvas.zoomToFit({ animation: { duration: 400 } })`
