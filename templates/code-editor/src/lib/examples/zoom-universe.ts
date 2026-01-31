export const name = 'Zoom Universe'

export const code = `// Zoom to explore different scales of the universe

const cx = 400, cy = 300
const numParticles = 40

// Particles exist at different "scales"
const particles = []
for (let i = 0; i < numParticles; i++) {
  const scale = Math.random() * 3 - 1  // -1 to 2 (log scale)
  const angle = Math.random() * Math.PI * 2
  const dist = 50 + Math.random() * 200
  particles.push({
    baseX: Math.cos(angle) * dist,
    baseY: Math.sin(angle) * dist,
    scale,  // what zoom level this particle is visible at
    orbitRadius: 20 + Math.random() * 80,
    orbitSpeed: (Math.random() - 0.5) * 0.03,
    phase: Math.random() * Math.PI * 2,
    size: 3 + Math.random() * 8
  })
}

// Create particle shapes
const particleIds = particles.map((p, i) => {
  const colors = ['red', 'orange', 'yellow', 'green', 'light-blue', 'blue', 'violet']
  return canvas.createCircle(cx, cy, p.size, {
    color: colors[i % colors.length],
    fill: 'solid'
  })
})

// Info display
const infoId = canvas.createText(200, 50, 'Zoom in/out to explore...', { size: 'm', color: 'grey' })

// Scale labels at different zoom levels
const scaleLabels = [
  { zoom: 0.3, text: 'GALACTIC' },
  { zoom: 0.7, text: 'STELLAR' },
  { zoom: 1.0, text: 'PLANETARY' },
  { zoom: 2.0, text: 'MOLECULAR' },
  { zoom: 4.0, text: 'ATOMIC' }
]

let time = 0
const interval = setInterval(() => {
  time += 0.02

  const camera = canvas.getCamera()
  const zoom = camera.z  // zoom level (1 = normal, <1 = zoomed out, >1 = zoomed in)
  const logZoom = Math.log2(zoom)  // -2 to +2 range typically

  // Find current scale label
  let currentScale = scaleLabels[0].text
  for (const label of scaleLabels) {
    if (zoom >= label.zoom) currentScale = label.text
  }

  const updates = []

  particles.forEach((p, i) => {
    // Visibility based on zoom - particles fade in/out based on their scale
    const scaleDiff = Math.abs(logZoom - p.scale)
    const visibility = Math.max(0, 1 - scaleDiff * 0.8)

    // Orbit animation - speed changes with zoom
    const orbitAngle = time * p.orbitSpeed * (1 + logZoom * 0.5) + p.phase

    // Position scales inversely with zoom for parallax effect
    const parallax = Math.pow(2, p.scale - logZoom)
    const x = cx + p.baseX * parallax + Math.cos(orbitAngle) * p.orbitRadius * parallax * 0.3
    const y = cy + p.baseY * parallax + Math.sin(orbitAngle) * p.orbitRadius * parallax * 0.3

    // Size also changes with zoom - things at "your" scale appear larger
    const apparentSize = p.size * (1 + (1 - scaleDiff) * 2) * Math.min(2, Math.max(0.5, parallax * 0.3))

    updates.push({
      id: particleIds[i],
      type: 'geo',
      x: x - apparentSize,
      y: y - apparentSize,
      props: { w: apparentSize * 2, h: apparentSize * 2 },
      opacity: visibility * 0.9
    })
  })

  // Update scale indicator
  updates.push({
    id: infoId,
    type: 'text',
    props: { richText: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: currentScale + ' SCALE (zoom: ' + zoom.toFixed(2) + 'x)' }] }] } }
  })

  editor.updateShapes(updates)
}, 30)

canvas.zoomToFit({ animation: { duration: 400 } })`
