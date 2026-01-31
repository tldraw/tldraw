export const name = 'Dot Sphere'

export const code = `// 3D sphere using freehand dots with organic, wobbly movement
// Watch the spiral factor oscillate automatically!

const cx = 400, cy = 300
const scale3d = 200
const cameraZ = 2

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

// === SLIDER CONTROL ===
// Slider configuration - controls the multiplier in the golden angle formula
const sliderX = 150, sliderY = 520
const sliderWidth = 200, sliderHeight = 8
const handleSize = 16
const minFactor = 1.32, maxFactor = 2.0

// Create slider track
canvas.createRect(sliderX, sliderY, sliderWidth, sliderHeight, {
  color: 'grey', fill: 'solid'
})

// Create slider handle (animates automatically)
const handleId = canvas.createCircle(
  sliderX + sliderWidth / 2,
  sliderY + sliderHeight / 2,
  handleSize / 2,
  { color: 'blue', fill: 'solid' }
)

// Create label
const labelId = canvas.createText(sliderX, sliderY - 25, 'Spiral factor: 1.66', { size: 's' })

// === SPHERE SETUP ===
const numPoints = 160
const goldenRatio = (1 + Math.sqrt(5)) / 2

const colors = ['red', 'orange', 'yellow', 'green', 'blue', 'violet']
const sizes = ['s', 'm', 'l', 'xl']
const shapeIds = []
for (let i = 0; i < numPoints; i++) {
  shapeIds.push(canvas.createDot(cx, cy, {
    color: colors[i % 6],
    size: sizes[i % 4]
  }))
}

let time = 0
let angleX = 0, angleY = 0

const interval = setInterval(() => {
  time += 0.025
  angleX += 0.008
  angleY += 0.015

  // Auto-oscillate the spiral factor using a sine wave
  // Oscillates smoothly between minFactor and maxFactor
  const t = (Math.sin(time * 0.5) + 1) / 4  // 0 to 1, slowly
  const spiralFactor = minFactor + t * (maxFactor - minFactor)

  // Update the slider handle position and label to match
  const handleX = sliderX + t * sliderWidth - handleSize / 2
  editor.updateShapes([
    {
      id: handleId,
      type: 'geo',
      x: handleX,
      y: sliderY + sliderHeight / 2 - handleSize / 2
    },
    {
      id: labelId,
      type: 'text',
      props: {
        richText: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Spiral factor: ' + spiralFactor.toFixed(2) }] }]
        }
      }
    }
  ])

  // Recalculate point positions with the new spiral factor
  const points = []
  for (let i = 0; i < numPoints; i++) {
    // This is where the slider value is used!
    const theta = spiralFactor * Math.PI * i / goldenRatio
    const phi = Math.acos(1 - 2 * (i + 0.5) / numPoints)
    points.push({
      x: Math.sin(phi) * Math.cos(theta),
      y: Math.cos(phi),
      z: Math.sin(phi) * Math.sin(theta),
      idx: i
    })
  }

  // Gentle breathing
  const breathe = 1 + 0.1 * Math.sin(time * 1.5)

  const updates = shapeIds.map((id, i) => {
    const pt = points[i]

    // Individual wobble for each dot
    const wobbleX = Math.sin(time * 2 + pt.idx * 0.5) * 0.03
    const wobbleY = Math.cos(time * 1.7 + pt.idx * 0.3) * 0.03

    let p = {
      x: (pt.x + wobbleX) * breathe,
      y: (pt.y + wobbleY) * breathe,
      z: pt.z * breathe
    }

    p = rotateX(p, angleX)
    p = rotateY(p, angleY)

    const z = p.z + cameraZ
    const proj = project({ x: p.x, y: p.y, z })
    const screenX = cx + proj.x * scale3d
    const screenY = cy - proj.y * scale3d

    // Depth for opacity and size
    const depth = 1 - (p.z / breathe + 1) / 2

    // Scale dots based on depth - closer = bigger
    const dotScale = 0.5 + depth * 1.5

    // Cycle colors over time
    const colorIdx = Math.floor(time * 0.5 + pt.idx * 0.1) % 6

    return {
      id,
      type: 'draw',
      x: screenX,
      y: screenY,
      props: { color: colors[colorIdx], scale: dotScale },
      opacity: Math.min(1, Math.max(0, 0.3 + depth * 0.7))
    }
  })

  editor.updateShapes(updates)
}, 50)

// Zoom out to see the full sphere and slider
canvas.setCamera({ x: cx, y: cy, z: 0.65 })`
