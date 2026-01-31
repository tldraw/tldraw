export const name = '3D Cube'

export const code = `
const cx = 400, cy = 300
const scale3d = 80

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

function rotateZ({ x, y, z }, a) {
  const c = Math.cos(a), s = Math.sin(a)
  return { x: x*c - y*s, y: x*s + y*c, z }
}

const size = 1
const vertices = [
  { x: -size, y: -size, z: -size },
  { x:  size, y: -size, z: -size },
  { x:  size, y:  size, z: -size },
  { x: -size, y:  size, z: -size },
  { x: -size, y: -size, z:  size },
  { x:  size, y: -size, z:  size },
  { x:  size, y:  size, z:  size },
  { x: -size, y:  size, z:  size },
]

const edges = [
  [0,1], [1,2], [2,3], [3,0],
  [4,5], [5,6], [6,7], [7,4],
  [0,4], [1,5], [2,6], [3,7],
]

const colors = ['red', 'orange', 'yellow', 'green', 'blue', 'violet', 'light-blue', 'light-green']
const vertexIds = vertices.map((_, i) =>
  canvas.createCircle(cx, cy, 4, {
    color: colors[i % colors.length],
    fill: 'solid'
  })
)

const edgeIds = edges.map((_, i) =>
  canvas.createBezier(cx, cy, {
    start: { x: 0, y: 0 },
    cp1: { x: 0, y: 0 },
    cp2: { x: 10, y: 10 },
    end: { x: 10, y: 10 }
  })
)

let angleX = 0, angleY = 0, angleZ = 0
const cameraZ = 4

const interval = setInterval(() => {
  angleX += 0.018
  angleY += 0.024
  angleZ += 0.01

  const transformed = vertices.map(v => {
    let p = rotateX(v, angleX)
    p = rotateY(p, angleY)
    p = rotateZ(p, angleZ)
    return p
  })

  const projected = transformed.map(p => {
    const z = p.z + cameraZ
    const proj = project({ x: p.x, y: p.y, z })
    return {
      x: cx + proj.x * scale3d,
      y: cy - proj.y * scale3d,
      z: p.z
    }
  })

  const vertexUpdates = projected.map((p, i) => {
    const depthFactor = (transformed[i].z + size) / (size * 2)
    const dotSize = 3 + (1 - depthFactor) * 5
    return {
      id: vertexIds[i],
      type: 'geo',
      x: p.x - dotSize,
      y: p.y - dotSize,
      props: { w: dotSize * 2, h: dotSize * 2 },
      opacity: 0.4 + (1 - depthFactor) * 0.6
    }
  })

  const edgeUpdates = edges.map(([i, j], idx) => {
    const p1 = projected[i], p2 = projected[j]
    const dx = p2.x - p1.x, dy = p2.y - p1.y
    return {
      id: edgeIds[idx],
      type: 'bezier-curve',
      x: p1.x,
      y: p1.y,
      props: {
        start: { x: 0, y: 0 },
        cp1: { x: dx * 0.33, y: dy * 0.33 },
        cp2: { x: dx * 0.67, y: dy * 0.67 },
        end: { x: dx, y: dy }
      }
    }
  })

  editor.updateShapes([...vertexUpdates, ...edgeUpdates])
}, 40)

canvas.zoomToFit({ animation: { duration: 400 } })`
