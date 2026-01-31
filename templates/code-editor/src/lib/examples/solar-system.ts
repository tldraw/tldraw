export const name = 'Solar system'

export const code = `// Animated solar system with orbiting planets

const cx = 400, cy = 300

// Create the sun
canvas.createCircle(cx, cy, 50, {
  color: 'yellow',
  fill: 'solid'
})

// Planet data: distance, size, speed, color
const planets = [
  { dist: 90, size: 12, speed: 0.03, color: 'grey' },      // Mercury
  { dist: 130, size: 18, speed: 0.022, color: 'orange' },  // Venus
  { dist: 180, size: 20, speed: 0.018, color: 'blue' },    // Earth
  { dist: 230, size: 16, speed: 0.014, color: 'red' },     // Mars
  { dist: 300, size: 35, speed: 0.008, color: 'orange' },  // Jupiter
]

// Create planets with initial positions
const planetIds = planets.map((p, i) => {
  const x = cx + p.dist
  return canvas.createCircle(x, cy, p.size, {
    color: p.color,
    fill: 'solid'
  })
})

// Draw orbit paths (subtle rings)
planets.forEach(p => {
  canvas.createCircle(cx, cy, p.dist, {
    color: 'grey',
    fill: 'none',
    dash: 'dotted'
  })
})

// Animate orbits
let time = 0
const interval = setInterval(() => {
  time += 1

  planetIds.forEach((id, i) => {
    const p = planets[i]
    const angle = time * p.speed
    const x = cx + Math.cos(angle) * p.dist
    const y = cy + Math.sin(angle) * p.dist

    editor.updateShapes([{
      id,
      type: 'geo',
      x: x - p.size,
      y: y - p.size
    }])
  })
}, 50)

canvas.zoomToFit({ animation: { duration: 400 } })`
