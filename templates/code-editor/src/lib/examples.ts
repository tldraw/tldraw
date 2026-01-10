/**
 * Example code snippets for the code editor.
 * These demonstrate the API and provide starting points for users.
 */

export const examples: Record<string, string> = {
	'Modify shapes': `// Create shapes and then animate their properties

const colors = ['blue', 'red', 'green', 'orange', 'violet']
const shapeIds = []

// Create a row of circles
for (let i = 0; i < 5; i++) {
  const id = canvas.createCircle(150 + i * 120, 200, 40, {
    color: colors[i],
    fill: 'solid'
  })
  shapeIds.push(id)
}

// Animate them in a wave pattern
let frame = 0
const interval = setInterval(() => {
  frame++

  // Update each shape's position
  shapeIds.forEach((id, i) => {
    const shape = editor.getShape(id)
    if (!shape) return

    // Wave motion
    const offset = Math.sin((frame + i * 20) * 0.1) * 50

    editor.updateShapes([{
      id: id,
      type: 'geo',
      y: 200 + offset - 40 // Subtract radius since circle uses top-left
    }])
  })
}, 50)

canvas.zoomToFit({ animation: { duration: 400 } })
`,

	'Color cycle': `// Creates shapes that change color every second

const shapeIds = []

// Create a 3x3 grid of shapes
for (let row = 0; row < 3; row++) {
  for (let col = 0; col < 3; col++) {
    const id = canvas.createRect(
      100 + col * 120,
      100 + row * 120,
      100,
      100,
      { color: 'blue', fill: 'solid', geo: 'rectangle' }
    )
    shapeIds.push(id)
  }
}

const colors = ['blue', 'violet', 'red', 'orange', 'yellow', 'green', 'light-blue']
let colorIndex = 0

// Change colors every 500ms
const interval = setInterval(() => {
  colorIndex = (colorIndex + 1) % colors.length

  // Update each shape with offset colors
  shapeIds.forEach((id, i) => {
    const color = colors[(colorIndex + i) % colors.length]
    editor.updateShapes([{
      id: id,
      type: 'geo',
      props: { color: color }
    }])
  })
}, 500)

// Stop after 10 seconds
setTimeout(() => {
  clearInterval(interval)
}, 10000)

canvas.zoomToFit({ animation: { duration: 400 } })`,

	'Camera controls': `// Generate shapes and get camera to follow

const centerX = 400
const centerY = 300
const radius = 180

// Order shapes in a pentagon formation
const shapes = [
  { angle: -90, geo: 'diamond', color: 'violet', size: 50 },
  { angle: -18, geo: 'hexagon', color: 'blue', size: 55 },
  { angle: 54, geo: 'octagon', color: 'green', size: 60 },
  { angle: 126, geo: 'star', color: 'orange', size: 65 },
  { angle: 198, geo: 'pentagon', color: 'red', size: 58 },
]

// Start super zoomed in on first shape position
const firstAngle = shapes[0].angle * (Math.PI / 180)
const firstX = centerX + Math.cos(firstAngle) * radius
const firstY = centerY + Math.sin(firstAngle) * radius
canvas.setCamera({ x: -firstX + 300, y: -firstY + 200, z: 4 })

// Sequentially create shapes and follow with camera
let delay = 300
shapes.forEach((shape, i) => {
  setTimeout(() => {
    const angle = shape.angle * (Math.PI / 180)
    const x = centerX + Math.cos(angle) * radius - shape.size / 2
    const y = centerY + Math.sin(angle) * radius - shape.size / 2

    canvas.createRect(x, y, shape.size, shape.size, {
      color: shape.color,
      fill: 'solid',
      geo: shape.geo
    })

    // Snappy camera animation
    setTimeout(() => {
      canvas.centerOnPoint(
        { x: x + shape.size / 2, y: y + shape.size / 2 },
        { animation: { duration: 250 } }
      )
    }, 50)
  }, delay)
  delay += 350
})

// Zoom out at the end to reveal the pentagon formation
setTimeout(() => {
  canvas.zoomToFit({ animation: { duration: 500 } })
}, delay + 200)`,

	'Bezier curve': `// Here's a flower made using bezier curves
// Double-click any curve to edit it and drag the control handles!

const cx = 400  // Center X
const cy = 280  // Center Y
const size = 120 // Petal size

// Create 6 petals radiating from center
for (let i = 0; i < 6; i++) {
  const angle = (i * Math.PI) / 3
  const nextAngle = angle + Math.PI / 3

  // Direction vectors
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  const ndx = Math.cos(nextAngle)
  const ndy = Math.sin(nextAngle)

  // Each petal curves outward and back
  canvas.createBezier(cx, cy, {
    start: { x: 0, y: 0 },
    cp1: { x: dx * size * 1.8, y: dy * size * 1.8 },
    cp2: { x: ndx * size * 1.8, y: ndy * size * 1.8 },
    end: { x: 0, y: 0 }
  })
}

// Inner petals nested inside the outer ones
for (let i = 0; i < 6; i++) {
  const angle = (i * Math.PI) / 3
  const nextAngle = angle + Math.PI / 3

  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  const ndx = Math.cos(nextAngle)
  const ndy = Math.sin(nextAngle)

  // Smaller petal inside each outer petal
  canvas.createBezier(cx, cy, {
    start: { x: 0, y: 0 },
    cp1: { x: dx * size * 0.9, y: dy * size * 0.9 },
    cp2: { x: ndx * size * 0.9, y: ndy * size * 0.9 },
    end: { x: 0, y: 0 }
  })
}

canvas.zoomToFit({ animation: { duration: 400 } })`,

	'Solar system': `// Animated solar system with orbiting planets

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

canvas.zoomToFit({ animation: { duration: 400 } })`,

	Flowchart: `// A simple flowchart using shapes and arrows

// Start node
const start = canvas.createGeo(300, 50, 120, 50, {
  geo: 'oval',
  color: 'green',
  fill: 'solid',
  text: 'Start'
})

// Decision diamond
const decision = canvas.createDiamond(300, 160, 140, 100, {
  color: 'yellow',
  fill: 'solid',
  text: 'Is valid?'
})

// Process boxes
const processYes = canvas.createRect(120, 320, 140, 70, {
  color: 'blue',
  fill: 'solid',
  text: 'Process data'
})

const processNo = canvas.createRect(420, 320, 140, 70, {
  color: 'red',
  fill: 'solid',
  text: 'Show error'
})

// End nodes
const endSuccess = canvas.createGeo(120, 450, 140, 50, {
  geo: 'oval',
  color: 'green',
  fill: 'semi',
  text: 'Done'
})

const endError = canvas.createGeo(420, 450, 140, 50, {
  geo: 'oval',
  color: 'red',
  fill: 'semi',
  text: 'Retry'
})

// Connect with arrows
canvas.createArrow(360, 95, 360, 160, { color: 'black' })
canvas.createArrow(300, 210, 190, 320, { color: 'green' })
canvas.createArrow(380, 210, 490, 320, { color: 'red' })
canvas.createArrow(190, 390, 190, 450, { color: 'black' })
canvas.createArrow(490, 390, 490, 450, { color: 'black' })

// Labels for decision branches
canvas.createText(220, 250, 'Yes', { color: 'green', size: 's' })
canvas.createText(430, 250, 'No', { color: 'red', size: 's' })

canvas.zoomToFit({ animation: { duration: 400 } })`,

	'Sticky notes': `// Create a kanban-style board with sticky notes

const columns = [
  { title: 'To Do', x: 50, color: 'light-red' },
  { title: 'In Progress', x: 270, color: 'yellow' },
  { title: 'Done', x: 490, color: 'light-green' }
]

const tasks = {
  'To Do': ['Research API', 'Write tests', 'Update docs'],
  'In Progress': ['Build UI', 'Code review'],
  'Done': ['Setup project', 'Design mockups']
}

// Create column headers
columns.forEach(col => {
  canvas.createText(col.x + 60, 30, col.title, {
    size: 'l',
    font: 'sans'
  })
})

// Create sticky notes
columns.forEach(col => {
  const colTasks = tasks[col.title]
  colTasks.forEach((task, i) => {
    canvas.createNote(col.x, 80 + i * 130, task, {
      color: col.color,
      size: 'm'
    })
  })
})

// Add a frame around each column
columns.forEach(col => {
  const taskCount = tasks[col.title].length
  canvas.createFrame(col.x - 15, 15, 210, 60 + taskCount * 130, {
    name: col.title
  })
})

canvas.zoomToFit({ animation: { duration: 400 } })`,

	Constellation: `// Draw a constellation with stars and connecting lines

const stars = [
  { x: 200, y: 100, size: 35, name: 'Polaris' },
  { x: 280, y: 180, size: 25 },
  { x: 350, y: 140, size: 30 },
  { x: 420, y: 200, size: 28 },
  { x: 380, y: 280, size: 32 },
  { x: 300, y: 320, size: 26 },
  { x: 220, y: 260, size: 24 },
]

// Draw connecting lines first (so stars appear on top)
const connections = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0], [1, 6], [2, 4]
]

connections.forEach(([from, to]) => {
  const s1 = stars[from], s2 = stars[to]
  canvas.createArrow(s1.x, s1.y, s2.x, s2.y, {
    color: 'light-blue',
    arrowheadStart: 'none',
    arrowheadEnd: 'none',
    dash: 'dotted'
  })
})

// Create stars
stars.forEach((star, i) => {
  const id = canvas.createStar(
    star.x - star.size / 2,
    star.y - star.size / 2,
    star.size,
    star.size,
    { color: 'yellow', fill: 'solid' }
  )

  // Add label for named stars
  if (star.name) {
    canvas.createText(star.x - 25, star.y - star.size - 15, star.name, {
      color: 'light-blue',
      size: 's',
      font: 'serif'
    })
  }
})

// Add some background small stars
for (let i = 0; i < 20; i++) {
  const x = 100 + Math.random() * 400
  const y = 50 + Math.random() * 350
  const size = 5 + Math.random() * 8
  canvas.createStar(x, y, size, size, {
    color: 'grey',
    fill: 'solid'
  })
}

canvas.zoomToFit({ animation: { duration: 400 } })`,

	'Particle explosion': `// Particle explosion effect with physics

const cx = 400, cy = 300
const particles = []
const numParticles = 40

// Create particles
for (let i = 0; i < numParticles; i++) {
  const angle = (i / numParticles) * Math.PI * 2
  const speed = 3 + Math.random() * 5
  const size = 8 + Math.random() * 15
  const colors = ['red', 'orange', 'yellow', 'light-red']
  const shapes = ['ellipse', 'star', 'diamond']

  const id = canvas.createGeo(cx - size/2, cy - size/2, size, size, {
    color: colors[Math.floor(Math.random() * colors.length)],
    fill: 'solid',
    geo: shapes[Math.floor(Math.random() * shapes.length)]
  })

  particles.push({
    id,
    x: cx,
    y: cy,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size,
    life: 1.0
  })
}

// Animate with gravity and fade
let frame = 0
const interval = setInterval(() => {
  frame++
  let allDead = true

  particles.forEach(p => {
    if (p.life <= 0) return
    allDead = false

    // Physics
    p.x += p.vx
    p.y += p.vy
    p.vy += 0.15  // gravity
    p.vx *= 0.99  // drag
    p.life -= 0.015

    // Update position
    editor.updateShapes([{
      id: p.id,
      type: 'geo',
      x: p.x - p.size / 2,
      y: p.y - p.size / 2,
      opacity: Math.max(0, p.life)
    }])
  })

  if (allDead || frame > 200) {
    clearInterval(interval)
  }
}, 30)

canvas.zoomToFit({ animation: { duration: 400 } })`,

	'Fractal tree': `// Recursive fractal tree using lines

function drawBranch(x, y, length, angle, depth) {
  if (depth === 0 || length < 5) return

  const endX = x + Math.cos(angle) * length
  const endY = y + Math.sin(angle) * length

  // Color based on depth (brown trunk to green leaves)
  const colors = ['black', 'black', 'grey', 'green', 'light-green']
  const color = colors[Math.min(depth - 1, colors.length - 1)]

  canvas.createArrow(x, y, endX, endY, {
    color,
    arrowheadStart: 'none',
    arrowheadEnd: 'none',
    size: depth > 3 ? 'l' : depth > 1 ? 'm' : 's'
  })

  // Recursive branches
  const shrink = 0.7
  const spread = 0.5
  drawBranch(endX, endY, length * shrink, angle - spread, depth - 1)
  drawBranch(endX, endY, length * shrink, angle + spread, depth - 1)

  // Add extra branch for variation
  if (depth > 3 && Math.random() > 0.5) {
    drawBranch(endX, endY, length * shrink * 0.8, angle, depth - 1)
  }
}

// Draw tree starting from bottom center
const startX = 400
const startY = 500
const trunkLength = 100
const startAngle = -Math.PI / 2  // pointing up

drawBranch(startX, startY, trunkLength, startAngle, 7)

// Add some decorative elements
canvas.createCircle(startX, startY + 20, 30, {
  color: 'black',
  fill: 'solid'
})

canvas.zoomToFit({ animation: { duration: 400 } })`,

	'Shape gallery': `// A gallery showcasing all available shapes

const shapes = [
  { fn: 'createRect', args: [0, 0, 80, 80], label: 'Rectangle' },
  { fn: 'createCircle', args: [140, 40, 40], label: 'Circle' },
  { fn: 'createEllipse', args: [260, 40, 90, 60], label: 'Ellipse' },
  { fn: 'createTriangle', args: [320, 0, 80, 80], label: 'Triangle' },
  { fn: 'createDiamond', args: [420, 0, 80, 80], label: 'Diamond' },
  { fn: 'createStar', args: [520, 0, 80, 80], label: 'Star' },
  { fn: 'createHexagon', args: [0, 120, 80, 80], label: 'Hexagon' },
  { fn: 'createPentagon', args: [100, 120, 80, 80], label: 'Pentagon' },
  { fn: 'createOctagon', args: [200, 120, 80, 80], label: 'Octagon' },
  { fn: 'createCloud', args: [300, 120, 100, 70], label: 'Cloud' },
  { fn: 'createHeart', args: [420, 120, 80, 80], label: 'Heart' },
  { fn: 'createOval', args: [520, 120, 90, 60], label: 'Oval' },
  { fn: 'createTrapezoid', args: [0, 240, 80, 60], label: 'Trapezoid' },
  { fn: 'createRhombus', args: [100, 240, 80, 80], label: 'Rhombus' },
]

const colors = ['red', 'orange', 'yellow', 'green', 'blue', 'violet', 'light-blue']

shapes.forEach((shape, i) => {
  // Create shape
  canvas[shape.fn](...shape.args, {
    color: colors[i % colors.length],
    fill: 'solid'
  })

  // Add label below
  const x = shape.args[0]
  const y = shape.args[1] + (shape.args[3] || shape.args[2] * 2) + 5
  canvas.createText(x, y, shape.label, {
    size: 's',
    color: 'black'
  })
})

// Add arrows section
canvas.createText(220, 340, 'Arrow Styles:', { size: 'm' })
const arrowStyles = ['arrow', 'triangle', 'diamond', 'dot', 'bar']
arrowStyles.forEach((style, i) => {
  canvas.createArrow(50 + i * 110, 380, 120 + i * 110, 380, {
    color: colors[i],
    arrowheadEnd: style
  })
  canvas.createText(50 + i * 110, 395, style, { size: 's' })
})

canvas.zoomToFit({ animation: { duration: 400 } })`,

	Spirograph: `// Animated spirograph pattern

const cx = 400, cy = 300
const R = 150  // outer radius
const r = 55   // inner radius
const d = 80   // pen distance
const colors = ['red', 'blue', 'green', 'violet', 'orange']

let points = []
let colorIndex = 0

// Calculate spirograph points
for (let t = 0; t < Math.PI * 40; t += 0.05) {
  const x = cx + (R - r) * Math.cos(t) + d * Math.cos((R - r) / r * t)
  const y = cy + (R - r) * Math.sin(t) - d * Math.sin((R - r) / r * t)
  points.push({ x, y })
}

// Draw the spirograph incrementally
let index = 0
const batchSize = 20

const interval = setInterval(() => {
  for (let i = 0; i < batchSize && index < points.length - 1; i++, index++) {
    const p1 = points[index]
    const p2 = points[index + 1]

    canvas.createArrow(p1.x, p1.y, p2.x, p2.y, {
      color: colors[Math.floor(index / 100) % colors.length],
      arrowheadStart: 'none',
      arrowheadEnd: 'none',
      size: 's'
    })
  }

  if (index >= points.length - 1) {
    clearInterval(interval)
    canvas.zoomToFit({ animation: { duration: 500 } })
  }
}, 30)

canvas.centerOnPoint({ x: cx, y: cy })`,

	Clock: `// An animated analog clock

const cx = 400, cy = 300, radius = 150

// Clock face
canvas.createCircle(cx, cy, radius, {
  color: 'black',
  fill: 'none',
  size: 'xl'
})
canvas.createCircle(cx, cy, radius - 10, {
  color: 'light-blue',
  fill: 'solid'
})

// Hour markers
for (let i = 0; i < 12; i++) {
  const angle = (i / 12) * Math.PI * 2 - Math.PI / 2
  const inner = radius - 30
  const outer = radius - 15
  canvas.createArrow(
    cx + Math.cos(angle) * inner,
    cy + Math.sin(angle) * inner,
    cx + Math.cos(angle) * outer,
    cy + Math.sin(angle) * outer,
    { color: 'black', arrowheadStart: 'none', arrowheadEnd: 'none', size: 'l' }
  )
}

// Create clock hands (we'll update these)
const hourHand = canvas.createArrow(cx, cy, cx, cy - 60, {
  color: 'black', size: 'xl',
  arrowheadStart: 'none', arrowheadEnd: 'none'
})
const minuteHand = canvas.createArrow(cx, cy, cx, cy - 100, {
  color: 'black', size: 'l',
  arrowheadStart: 'none', arrowheadEnd: 'none'
})
const secondHand = canvas.createArrow(cx, cy, cx, cy - 110, {
  color: 'red', size: 'm',
  arrowheadStart: 'none', arrowheadEnd: 'none'
})

// Center dot
canvas.createCircle(cx, cy, 8, { color: 'black', fill: 'solid' })

// Update hands every second
const updateClock = () => {
  const now = new Date()
  const seconds = now.getSeconds()
  const minutes = now.getMinutes() + seconds / 60
  const hours = (now.getHours() % 12) + minutes / 60

  const secAngle = (seconds / 60) * Math.PI * 2 - Math.PI / 2
  const minAngle = (minutes / 60) * Math.PI * 2 - Math.PI / 2
  const hourAngle = (hours / 12) * Math.PI * 2 - Math.PI / 2

  editor.updateShapes([
    { id: secondHand, type: 'arrow', props: {
      end: { x: Math.cos(secAngle) * 110, y: Math.sin(secAngle) * 110 }
    }},
    { id: minuteHand, type: 'arrow', props: {
      end: { x: Math.cos(minAngle) * 100, y: Math.sin(minAngle) * 100 }
    }},
    { id: hourHand, type: 'arrow', props: {
      end: { x: Math.cos(hourAngle) * 60, y: Math.sin(hourAngle) * 60 }
    }}
  ])
}

updateClock()
setInterval(updateClock, 1000)

canvas.zoomToFit({ animation: { duration: 400 } })`,

	'3D Sphere': `// 3D sphere with breathing, flicker, and pattern fill

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

// Generate sphere points
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

  // Breathing - sphere pulses
  const breathe = 1 + 0.15 * Math.sin(time * 2)

  const updates = shapeIds.map((id, i) => {
    const pt = points[i]

    // Flicker - randomly hide some points
    const flicker = Math.random() > 0.12

    // Apply breathing scale
    let p = { x: pt.x * breathe, y: pt.y * breathe, z: pt.z * breathe }

    // Rotations
    p = rotateX(p, angleX)
    p = rotateY(p, angleY)

    const z = p.z + cameraZ
    const proj = project({ x: p.x, y: p.y, z })
    const screenX = cx + proj.x * scale3d
    const screenY = cy - proj.y * scale3d

    // Depth for size/opacity
    const depth = 1 - (p.z / breathe + radius) / (radius * 2)
    const size = 2 + depth * 4

    // Color shifts based on time and position
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

canvas.zoomToFit({ animation: { duration: 400 } })`,

	'3D Cube': `// Rotating 3D wireframe cube with perspective projection

const cx = 400, cy = 300
const scale3d = 80  // smaller scale

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

// Cube vertices (centered at origin)
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

// Edges connect vertex indices
const edges = [
  [0,1], [1,2], [2,3], [3,0],  // back face
  [4,5], [5,6], [6,7], [7,4],  // front face
  [0,4], [1,5], [2,6], [3,7],  // connecting edges
]

// Create vertex dots only (simpler approach)
const colors = ['red', 'orange', 'yellow', 'green', 'blue', 'violet', 'light-blue', 'light-green']
const vertexIds = vertices.map((_, i) =>
  canvas.createCircle(cx, cy, 4, {
    color: colors[i % colors.length],
    fill: 'solid'
  })
)

// Create edge lines using bezier curves (more reliable for updates)
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

  // Transform all vertices
  const transformed = vertices.map(v => {
    let p = rotateX(v, angleX)
    p = rotateY(p, angleY)
    p = rotateZ(p, angleZ)
    return p
  })

  // Project vertices to screen
  const projected = transformed.map(p => {
    const z = p.z + cameraZ
    const proj = project({ x: p.x, y: p.y, z })
    return {
      x: cx + proj.x * scale3d,
      y: cy - proj.y * scale3d,
      z: p.z
    }
  })

  // Update vertices with depth-based size
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

  // Update edges as straight bezier lines
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

canvas.zoomToFit({ animation: { duration: 400 } })`,

	'3D Starfield': `// Fly through a 3D starfield with perspective projection

const cx = 400, cy = 300
const numStars = 80
const fieldDepth = 20
const speed = 0.15

// Initialize stars at random 3D positions
const stars = []
for (let i = 0; i < numStars; i++) {
  stars.push({
    x: (Math.random() - 0.5) * 10,
    y: (Math.random() - 0.5) * 10,
    z: Math.random() * fieldDepth
  })
}

// Create star shapes
const starIds = stars.map(() =>
  canvas.createStar(cx, cy, 10, 10, {
    color: 'yellow',
    fill: 'solid'
  })
)

function project({ x, y, z }) {
  const fov = 300  // field of view
  return {
    x: cx + (x / z) * fov,
    y: cy + (y / z) * fov
  }
}

const interval = setInterval(() => {
  const updates = []

  for (let i = 0; i < numStars; i++) {
    // Move star toward camera
    stars[i].z -= speed

    // Reset star if it passes the camera
    if (stars[i].z <= 0.1) {
      stars[i].x = (Math.random() - 0.5) * 10
      stars[i].y = (Math.random() - 0.5) * 10
      stars[i].z = fieldDepth
    }

    const star = stars[i]
    const pos = project(star)

    // Size based on proximity (closer = bigger)
    const size = Math.max(2, 25 / star.z)

    // Brightness based on depth
    const opacity = Math.min(1, 1.5 / star.z)

    // Color shift based on speed (blue shift as stars approach)
    const colors = ['grey', 'white', 'light-blue', 'blue']
    const colorIdx = Math.min(3, Math.floor((1 / star.z) * 2))

    updates.push({
      id: starIds[i],
      type: 'geo',
      x: pos.x - size / 2,
      y: pos.y - size / 2,
      props: {
        w: size,
        h: size,
        color: colors[colorIdx]
      },
      opacity
    })
  }

  editor.updateShapes(updates)
}, 40)

canvas.zoomToFit({ animation: { duration: 400 } })`,

	'3D Torus': `// Rotating 3D torus (donut) with perspective projection

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

// Generate torus points
const points = []
const R = 1.0   // major radius (center of tube to center of torus)
const r = 0.4  // minor radius (tube radius)
const uSteps = 24, vSteps = 12

for (let u = 0; u < uSteps; u++) {
  const theta = (u / uSteps) * Math.PI * 2
  for (let v = 0; v < vSteps; v++) {
    const phi = (v / vSteps) * Math.PI * 2

    points.push({
      x: (R + r * Math.cos(phi)) * Math.cos(theta),
      y: r * Math.sin(phi),
      z: (R + r * Math.cos(phi)) * Math.sin(theta),
      u, v  // store for coloring
    })
  }
}

// Create shapes
const shapeIds = points.map((p, i) => {
  // Color based on position on torus
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

    // Depth-based size and opacity
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

canvas.zoomToFit({ animation: { duration: 400 } })`,

	'Whack-a-Mole': `// Whack-a-Mole - Click the moles!

const gridCols = 3, gridRows = 3
const holeSize = 80
const spacing = 100
const startX = 220, startY = 120

// Create holes and moles
const holes = []
const moleIds = []
const holeIds = []

for (let r = 0; r < gridRows; r++) {
  for (let c = 0; c < gridCols; c++) {
    const x = startX + c * spacing
    const y = startY + r * spacing

    // Hole (dark ellipse)
    holeIds.push(canvas.createEllipse(x + holeSize/2, y + holeSize/2 + 15, holeSize, 30, {
      color: 'black', fill: 'solid'
    }))

    // Mole (circle that pops up)
    const moleId = canvas.createCircle(x + holeSize/2, y + holeSize/2, holeSize/2 - 5, {
      color: 'orange', fill: 'solid'
    })
    moleIds.push(moleId)

    // Eyes
    canvas.createCircle(x + holeSize/2 - 12, y + holeSize/2 - 8, 6, { color: 'black', fill: 'solid' })
    canvas.createCircle(x + holeSize/2 + 12, y + holeSize/2 - 8, 6, { color: 'black', fill: 'solid' })

    // Nose
    canvas.createCircle(x + holeSize/2, y + holeSize/2 + 5, 8, { color: 'red', fill: 'solid' })

    holes.push({ x, y, active: false, timer: 0 })
  }
}

// Score and timer
let score = 0
let timeLeft = 30
let gameOver = false

const scoreId = canvas.createText(startX, startY - 60, 'Score: 0', { size: 'l' })
const timerId = canvas.createText(startX + 180, startY - 60, 'Time: 30', { size: 'l' })

// Hide all moles initially
moleIds.forEach(id => {
  editor.updateShapes([{ id, type: 'geo', opacity: 0 }])
})

// Click detection
const canvasEl = document.querySelector('.tl-canvas')
const clickHandler = (e) => {
  if (gameOver) return

  const rect = canvasEl?.getBoundingClientRect()
  if (!rect) return

  // Get camera for coordinate transform
  const camera = canvas.getCamera()
  const clickX = (e.clientX - rect.left) / camera.z - camera.x
  const clickY = (e.clientY - rect.top) / camera.z - camera.y

  holes.forEach((hole, i) => {
    if (!hole.active) return

    const moleCenterX = hole.x + holeSize/2
    const moleCenterY = hole.y + holeSize/2
    const dist = Math.sqrt((clickX - moleCenterX) ** 2 + (clickY - moleCenterY) ** 2)

    if (dist < holeSize/2) {
      // Whacked!
      hole.active = false
      score += 10
      editor.updateShapes([{ id: moleIds[i], type: 'geo', opacity: 0 }])
    }
  })
}
document.addEventListener('click', clickHandler)

// Game loop
const interval = setInterval(() => {
  if (gameOver) return

  // Countdown
  timeLeft -= 0.1
  if (timeLeft <= 0) {
    gameOver = true
    canvas.createText(startX + 40, startY + 130, 'GAME OVER!', { size: 'xl', color: 'red' })
    canvas.createText(startX + 30, startY + 180, 'Final Score: ' + score, { size: 'l', color: 'black' })
    document.removeEventListener('click', clickHandler)
    clearInterval(interval)
    return
  }

  // Random mole popup
  if (Math.random() < 0.08) {
    const inactiveHoles = holes.map((h, i) => ({ h, i })).filter(x => !x.h.active)
    if (inactiveHoles.length > 0) {
      const { h, i } = inactiveHoles[Math.floor(Math.random() * inactiveHoles.length)]
      h.active = true
      h.timer = 15 + Math.random() * 15  // visible for 1.5-3 seconds
      editor.updateShapes([{ id: moleIds[i], type: 'geo', opacity: 1 }])
    }
  }

  // Update mole timers
  holes.forEach((hole, i) => {
    if (hole.active) {
      hole.timer -= 1
      if (hole.timer <= 0) {
        hole.active = false
        editor.updateShapes([{ id: moleIds[i], type: 'geo', opacity: 0 }])
      }
    }
  })

  // Update display
  editor.updateShapes([
    { id: scoreId, type: 'text', props: { richText: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Score: ' + score }] }] } } },
    { id: timerId, type: 'text', props: { richText: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Time: ' + Math.ceil(timeLeft) }] }] } } }
  ])
}, 100)

canvas.zoomToFit({ animation: { duration: 400 } })`,

	'Space Invaders': `// Space Invaders - Arrow keys to move, Space to shoot

const fieldW = 400, fieldH = 400
const startX = 200, startY = 50

// Draw field
canvas.createFrame(startX, startY, fieldW, fieldH, { name: 'Space Invaders' })

// Create aliens (5 rows x 8 cols)
const alienRows = 5, alienCols = 8
const alienW = 30, alienH = 20
const aliens = []
const alienIds = []

for (let r = 0; r < alienRows; r++) {
  for (let c = 0; c < alienCols; c++) {
    const colors = ['red', 'orange', 'yellow', 'green', 'light-blue']
    const id = canvas.createRect(
      startX + 30 + c * 42, startY + 40 + r * 32,
      alienW, alienH,
      { color: colors[r], fill: 'solid' }
    )
    aliens.push({ x: 30 + c * 42, y: 40 + r * 32, alive: true })
    alienIds.push(id)
  }
}

// Player
const playerW = 40, playerH = 15
let playerX = fieldW / 2 - playerW / 2
const playerY = fieldH - 40
const playerId = canvas.createRect(
  startX + playerX, startY + playerY,
  playerW, playerH,
  { color: 'green', fill: 'solid' }
)

// Bullets
const bullets = []
const bulletIds = []
for (let i = 0; i < 10; i++) {
  bulletIds.push(canvas.createRect(0, 0, 4, 12, { color: 'yellow', fill: 'solid' }))
  bullets.push({ x: 0, y: 0, active: false })
}

// Score
let score = 0
let gameOver = false
const scoreId = canvas.createText(startX, startY - 25, 'Score: 0', { size: 'm' })

// Alien movement
let alienDir = 1
let alienSpeed = 1.5
let alienDropCounter = 0

// Controls
const keys = {}
document.addEventListener('keydown', (e) => {
  keys[e.key] = true
  if (e.key === ' ') {
    const bullet = bullets.find(b => !b.active)
    if (bullet) {
      bullet.x = playerX + playerW / 2 - 2
      bullet.y = playerY - 12
      bullet.active = true
    }
  }
})
document.addEventListener('keyup', (e) => { keys[e.key] = false })

const interval = setInterval(() => {
  if (gameOver) return

  // Move player
  if (keys['ArrowLeft']) playerX = Math.max(0, playerX - 5)
  if (keys['ArrowRight']) playerX = Math.min(fieldW - playerW, playerX + 5)

  // Move aliens
  let hitEdge = false
  aliens.forEach(a => {
    if (!a.alive) return
    a.x += alienDir * alienSpeed
    if (a.x < 10 || a.x > fieldW - alienW - 10) hitEdge = true
  })

  if (hitEdge) {
    alienDir *= -1
    aliens.forEach(a => { a.y += 15 })
    alienSpeed += 0.2
  }

  // Move bullets
  bullets.forEach(b => {
    if (b.active) {
      b.y -= 8
      if (b.y < 0) b.active = false
    }
  })

  // Bullet-alien collision
  bullets.forEach(b => {
    if (!b.active) return
    aliens.forEach((a, i) => {
      if (!a.alive) return
      if (b.x > a.x && b.x < a.x + alienW && b.y > a.y && b.y < a.y + alienH) {
        a.alive = false
        b.active = false
        score += 10
      }
    })
  })

  // Check win/lose
  const aliveAliens = aliens.filter(a => a.alive)
  if (aliveAliens.length === 0) {
    canvas.createText(startX + 120, startY + fieldH / 2, 'YOU WIN!', { size: 'xl', color: 'green' })
    gameOver = true
  }
  if (aliveAliens.some(a => a.y > playerY - alienH)) {
    canvas.createText(startX + 100, startY + fieldH / 2, 'GAME OVER', { size: 'xl', color: 'red' })
    gameOver = true
  }

  // Render
  const updates = [
    { id: playerId, type: 'geo', x: startX + playerX },
    { id: scoreId, type: 'text', props: { richText: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Score: ' + score }] }] } } }
  ]

  aliens.forEach((a, i) => {
    updates.push({
      id: alienIds[i], type: 'geo',
      x: startX + a.x, y: startY + a.y,
      opacity: a.alive ? 1 : 0
    })
  })

  bullets.forEach((b, i) => {
    updates.push({
      id: bulletIds[i], type: 'geo',
      x: startX + b.x, y: startY + b.y,
      opacity: b.active ? 1 : 0
    })
  })

  editor.updateShapes(updates)
}, 50)

canvas.zoomToFit({ animation: { duration: 400 } })`,

	Tetris: `// Tetris - Arrow keys to move/rotate, Down to drop faster

const cols = 10, rows = 20
const cellSize = 22
const startX = 250, startY = 50

// Tetromino shapes and colors
const pieces = [
  { shape: [[1,1,1,1]], color: 'light-blue' },           // I
  { shape: [[1,1],[1,1]], color: 'yellow' },             // O
  { shape: [[0,1,0],[1,1,1]], color: 'violet' },         // T
  { shape: [[0,1,1],[1,1,0]], color: 'green' },          // S
  { shape: [[1,1,0],[0,1,1]], color: 'red' },            // Z
  { shape: [[1,0,0],[1,1,1]], color: 'blue' },           // L
  { shape: [[0,0,1],[1,1,1]], color: 'orange' }          // J
]

// Create grid cells
const cellIds = []
for (let y = 0; y < rows; y++) {
  cellIds[y] = []
  for (let x = 0; x < cols; x++) {
    cellIds[y][x] = canvas.createRect(
      startX + x * cellSize, startY + y * cellSize,
      cellSize - 1, cellSize - 1,
      { color: 'grey', fill: 'none' }
    )
  }
}

// Game state
const grid = Array(rows).fill(null).map(() => Array(cols).fill(null))
let current = null
let curX = 0, curY = 0
let score = 0
let gameOver = false

// Score display
const scoreId = canvas.createText(startX, startY - 30, 'Score: 0', { size: 'm' })

function newPiece() {
  const p = pieces[Math.floor(Math.random() * pieces.length)]
  current = { shape: p.shape.map(r => [...r]), color: p.color }
  curX = Math.floor(cols / 2) - Math.floor(current.shape[0].length / 2)
  curY = 0
  if (collides(curX, curY, current.shape)) gameOver = true
}

function rotate(shape) {
  const h = shape.length, w = shape[0].length
  const rotated = Array(w).fill(null).map(() => Array(h).fill(0))
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      rotated[x][h - 1 - y] = shape[y][x]
  return rotated
}

function collides(px, py, shape) {
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[0].length; x++) {
      if (shape[y][x]) {
        const nx = px + x, ny = py + y
        if (nx < 0 || nx >= cols || ny >= rows) return true
        if (ny >= 0 && grid[ny][nx]) return true
      }
    }
  }
  return false
}

function merge() {
  for (let y = 0; y < current.shape.length; y++) {
    for (let x = 0; x < current.shape[0].length; x++) {
      if (current.shape[y][x] && curY + y >= 0) {
        grid[curY + y][curX + x] = current.color
      }
    }
  }
}

function clearLines() {
  let cleared = 0
  for (let y = rows - 1; y >= 0; y--) {
    if (grid[y].every(c => c)) {
      grid.splice(y, 1)
      grid.unshift(Array(cols).fill(null))
      cleared++
      y++
    }
  }
  score += [0, 100, 300, 500, 800][cleared]
}

// Controls
document.addEventListener('keydown', (e) => {
  if (gameOver || !current) return
  if (e.key === 'ArrowLeft' && !collides(curX - 1, curY, current.shape)) curX--
  if (e.key === 'ArrowRight' && !collides(curX + 1, curY, current.shape)) curX++
  if (e.key === 'ArrowDown' && !collides(curX, curY + 1, current.shape)) curY++
  if (e.key === 'ArrowUp') {
    const rotated = rotate(current.shape)
    if (!collides(curX, curY, rotated)) current.shape = rotated
  }
  render()
})

function render() {
  const updates = []
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let color = grid[y][x]
      let fill = color ? 'solid' : 'none'

      // Draw current piece
      if (current) {
        const py = y - curY, px = x - curX
        if (py >= 0 && py < current.shape.length && px >= 0 && px < current.shape[0].length) {
          if (current.shape[py][px]) {
            color = current.color
            fill = 'solid'
          }
        }
      }

      updates.push({
        id: cellIds[y][x], type: 'geo',
        props: { color: color || 'grey', fill }
      })
    }
  }
  editor.updateShapes(updates)
  editor.updateShapes([{
    id: scoreId, type: 'text',
    props: { richText: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Score: ' + score }] }] } }
  }])
}

newPiece()

const interval = setInterval(() => {
  if (gameOver) {
    canvas.createText(startX + 20, startY + rows * cellSize / 2, 'GAME OVER', { size: 'xl', color: 'red' })
    clearInterval(interval)
    return
  }

  if (!collides(curX, curY + 1, current.shape)) {
    curY++
  } else {
    merge()
    clearLines()
    newPiece()
  }
  render()
}, 500)

canvas.zoomToFit({ animation: { duration: 400 } })`,

	Pong: `// Pong - W/S for left paddle, Up/Down for right paddle

const fieldW = 500, fieldH = 300
const startX = 150, startY = 100
const paddleH = 60, paddleW = 12
const ballSize = 14

// Draw field
canvas.createFrame(startX, startY, fieldW, fieldH, { name: 'Pong' })

// Center line
for (let y = 0; y < fieldH; y += 20) {
  canvas.createRect(startX + fieldW/2 - 2, startY + y, 4, 10, {
    color: 'grey', fill: 'solid'
  })
}

// Paddles
const paddle1 = canvas.createRect(startX + 15, startY + fieldH/2 - paddleH/2, paddleW, paddleH, {
  color: 'blue', fill: 'solid'
})
const paddle2 = canvas.createRect(startX + fieldW - 15 - paddleW, startY + fieldH/2 - paddleH/2, paddleW, paddleH, {
  color: 'red', fill: 'solid'
})

// Ball
const ball = canvas.createCircle(startX + fieldW/2, startY + fieldH/2, ballSize/2, {
  color: 'yellow', fill: 'solid'
})

// Scores
const score1Id = canvas.createText(startX + fieldW/2 - 60, startY + 15, '0', { size: 'xl' })
const score2Id = canvas.createText(startX + fieldW/2 + 40, startY + 15, '0', { size: 'xl' })

// Game state
let p1y = fieldH/2, p2y = fieldH/2
let ballX = fieldW/2, ballY = fieldH/2
let ballVx = 4, ballVy = 3
let score1 = 0, score2 = 0
const paddleSpeed = 8

// Controls
const keys = {}
document.addEventListener('keydown', (e) => { keys[e.key] = true })
document.addEventListener('keyup', (e) => { keys[e.key] = false })

const interval = setInterval(() => {
  // Move paddles
  if (keys['w'] || keys['W']) p1y = Math.max(paddleH/2, p1y - paddleSpeed)
  if (keys['s'] || keys['S']) p1y = Math.min(fieldH - paddleH/2, p1y + paddleSpeed)
  if (keys['ArrowUp']) p2y = Math.max(paddleH/2, p2y - paddleSpeed)
  if (keys['ArrowDown']) p2y = Math.min(fieldH - paddleH/2, p2y + paddleSpeed)

  // Move ball
  ballX += ballVx
  ballY += ballVy

  // Top/bottom bounce
  if (ballY < ballSize/2 || ballY > fieldH - ballSize/2) {
    ballVy = -ballVy
    ballY = Math.max(ballSize/2, Math.min(fieldH - ballSize/2, ballY))
  }

  // Paddle collisions
  if (ballX < 30 && ballX > 15 && Math.abs(ballY - p1y) < paddleH/2 + ballSize/2) {
    ballVx = Math.abs(ballVx) * 1.05
    ballVy += (ballY - p1y) * 0.1
  }
  if (ballX > fieldW - 30 && ballX < fieldW - 15 && Math.abs(ballY - p2y) < paddleH/2 + ballSize/2) {
    ballVx = -Math.abs(ballVx) * 1.05
    ballVy += (ballY - p2y) * 0.1
  }

  // Scoring
  if (ballX < 0) {
    score2++
    ballX = fieldW/2; ballY = fieldH/2
    ballVx = 4; ballVy = (Math.random() - 0.5) * 6
  }
  if (ballX > fieldW) {
    score1++
    ballX = fieldW/2; ballY = fieldH/2
    ballVx = -4; ballVy = (Math.random() - 0.5) * 6
  }

  // Speed cap
  ballVx = Math.max(-12, Math.min(12, ballVx))
  ballVy = Math.max(-8, Math.min(8, ballVy))

  // Update visuals
  editor.updateShapes([
    { id: paddle1, type: 'geo', x: startX + 15, y: startY + p1y - paddleH/2 },
    { id: paddle2, type: 'geo', x: startX + fieldW - 15 - paddleW, y: startY + p2y - paddleH/2 },
    { id: ball, type: 'geo', x: startX + ballX - ballSize/2, y: startY + ballY - ballSize/2 },
    { id: score1Id, type: 'text', props: { richText: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: String(score1) }] }] } } },
    { id: score2Id, type: 'text', props: { richText: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: String(score2) }] }] } } }
  ])
}, 30)

canvas.zoomToFit({ animation: { duration: 400 } })`,

	Snake: `// Snake game - use arrow keys to play!

const gridSize = 20
const cellSize = 20
const startX = 150, startY = 100

// Draw border
canvas.createFrame(startX - 5, startY - 5, gridSize * cellSize + 10, gridSize * cellSize + 10, { name: 'Snake' })

// Snake state
let snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]
let dir = { x: 1, y: 0 }
let food = { x: 15, y: 10 }
let gameOver = false
let score = 0

// Create snake segments
const snakeIds = []
for (let i = 0; i < 100; i++) {  // max length
  snakeIds.push(canvas.createRect(0, 0, cellSize - 2, cellSize - 2, {
    color: i === 0 ? 'green' : 'light-green',
    fill: 'solid'
  }))
}

// Create food
const foodId = canvas.createCircle(
  startX + food.x * cellSize + cellSize/2,
  startY + food.y * cellSize + cellSize/2,
  cellSize/2 - 2,
  { color: 'red', fill: 'solid' }
)

// Score display
const scoreId = canvas.createText(startX, startY - 30, 'Score: 0', { size: 'm' })

// Keyboard controls
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp' && dir.y !== 1) dir = { x: 0, y: -1 }
  if (e.key === 'ArrowDown' && dir.y !== -1) dir = { x: 0, y: 1 }
  if (e.key === 'ArrowLeft' && dir.x !== 1) dir = { x: -1, y: 0 }
  if (e.key === 'ArrowRight' && dir.x !== -1) dir = { x: 1, y: 0 }
})

function spawnFood() {
  do {
    food = {
      x: Math.floor(Math.random() * gridSize),
      y: Math.floor(Math.random() * gridSize)
    }
  } while (snake.some(s => s.x === food.x && s.y === food.y))
}

const interval = setInterval(() => {
  if (gameOver) return

  // Move snake
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y }

  // Wall collision
  if (head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize) {
    gameOver = true
    canvas.createText(startX + 60, startY + gridSize * cellSize / 2, 'GAME OVER', {
      size: 'xl', color: 'red'
    })
    return
  }

  // Self collision
  if (snake.some(s => s.x === head.x && s.y === head.y)) {
    gameOver = true
    canvas.createText(startX + 60, startY + gridSize * cellSize / 2, 'GAME OVER', {
      size: 'xl', color: 'red'
    })
    return
  }

  snake.unshift(head)

  // Eat food?
  if (head.x === food.x && head.y === food.y) {
    score += 10
    spawnFood()
    editor.updateShapes([{
      id: foodId, type: 'geo',
      x: startX + food.x * cellSize + 2,
      y: startY + food.y * cellSize + 2
    }])
  } else {
    snake.pop()
  }

  // Update snake visuals
  const updates = snakeIds.map((id, i) => {
    if (i < snake.length) {
      const s = snake[i]
      return {
        id, type: 'geo',
        x: startX + s.x * cellSize,
        y: startY + s.y * cellSize,
        props: { color: i === 0 ? 'green' : 'light-green' },
        opacity: 1
      }
    } else {
      return { id, type: 'geo', opacity: 0 }
    }
  })

  // Update score
  editor.updateShapes([{
    id: scoreId, type: 'text',
    props: { richText: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Score: ' + score }] }] } }
  }])

  editor.updateShapes(updates)
}, 150)

canvas.zoomToFit({ animation: { duration: 400 } })`,

	'Rope Physics': `// Verlet integration rope simulation

const anchorX = 400, anchorY = 100
const numPoints = 15
const segmentLen = 20
const gravity = 0.5
const damping = 0.99
const iterations = 5  // constraint iterations for stability

// Create points with verlet positions (current and previous)
const points = []
for (let i = 0; i < numPoints; i++) {
  points.push({
    x: anchorX,
    y: anchorY + i * segmentLen,
    oldX: anchorX,
    oldY: anchorY + i * segmentLen,
    pinned: i === 0  // first point is fixed
  })
}

// Create visual elements
const nodeIds = points.map((p, i) =>
  canvas.createCircle(p.x, p.y, i === 0 ? 8 : 5, {
    color: i === 0 ? 'red' : 'orange',
    fill: 'solid'
  })
)

// Rope segments using bezier curves
const segmentIds = []
for (let i = 0; i < numPoints - 1; i++) {
  segmentIds.push(canvas.createBezier(points[i].x, points[i].y, {
    start: { x: 0, y: 0 },
    cp1: { x: 0, y: segmentLen * 0.4 },
    cp2: { x: 0, y: segmentLen * 0.6 },
    end: { x: 0, y: segmentLen }
  }))
}

// Mouse interaction
let mouseX = anchorX, mouseY = anchorY + numPoints * segmentLen
const canvasEl = document.querySelector('.tl-canvas')
canvasEl?.addEventListener('mousemove', (e) => {
  const rect = canvasEl.getBoundingClientRect()
  const camera = canvas.getCamera()
  mouseX = (e.clientX - rect.left) / camera.z - camera.x
  mouseY = (e.clientY - rect.top) / camera.z - camera.y
})

// Add weight at bottom
const weightId = canvas.createCircle(anchorX, anchorY + numPoints * segmentLen, 15, {
  color: 'blue',
  fill: 'solid'
})

let time = 0
const interval = setInterval(() => {
  time += 0.05

  // Gently move anchor point in a circle
  const newAnchorX = 400 + Math.sin(time) * 80
  const newAnchorY = 100 + Math.cos(time * 0.7) * 30
  points[0].x = newAnchorX
  points[0].y = newAnchorY

  // Verlet integration - update positions
  points.forEach(p => {
    if (p.pinned) return

    const vx = (p.x - p.oldX) * damping
    const vy = (p.y - p.oldY) * damping

    p.oldX = p.x
    p.oldY = p.y

    p.x += vx
    p.y += vy + gravity
  })

  // Satisfy distance constraints (multiple iterations)
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < numPoints - 1; i++) {
      const p1 = points[i]
      const p2 = points[i + 1]

      const dx = p2.x - p1.x
      const dy = p2.y - p1.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const diff = segmentLen - dist
      const percent = diff / dist / 2

      const offsetX = dx * percent
      const offsetY = dy * percent

      if (!p1.pinned) {
        p1.x -= offsetX
        p1.y -= offsetY
      }
      if (!p2.pinned) {
        p2.x += offsetX
        p2.y += offsetY
      }
    }
  }

  // Update visuals
  const updates = []

  // Update nodes
  points.forEach((p, i) => {
    const size = i === 0 ? 8 : 5
    updates.push({
      id: nodeIds[i],
      type: 'geo',
      x: p.x - size,
      y: p.y - size
    })
  })

  // Update rope segments
  for (let i = 0; i < numPoints - 1; i++) {
    const p1 = points[i]
    const p2 = points[i + 1]
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y

    updates.push({
      id: segmentIds[i],
      type: 'bezier-curve',
      x: p1.x,
      y: p1.y,
      props: {
        start: { x: 0, y: 0 },
        cp1: { x: dx * 0.33, y: dy * 0.33 },
        cp2: { x: dx * 0.67, y: dy * 0.67 },
        end: { x: dx, y: dy }
      }
    })
  }

  // Update weight at end
  const lastPoint = points[points.length - 1]
  updates.push({
    id: weightId,
    type: 'geo',
    x: lastPoint.x - 15,
    y: lastPoint.y - 15
  })

  editor.updateShapes(updates)
}, 25)

canvas.zoomToFit({ animation: { duration: 400 } })`,

	'Lissajous Curves': `// Lissajous curves - beautiful harmonic patterns

const cx = 400, cy = 300
const A = 150, B = 150  // amplitudes

// Frequency ratios - try 3:2, 3:4, 5:4, 5:6 for different patterns
let freqA = 3
let freqB = 2
let phase = 0

// Trail
const trailLen = 300
const trailIds = []
for (let i = 0; i < trailLen; i++) {
  trailIds.push(canvas.createCircle(cx, cy, 2, {
    color: 'violet',
    fill: 'solid'
  }))
}

// Head
const headId = canvas.createCircle(cx, cy, 8, {
  color: 'yellow',
  fill: 'solid'
})

// Draw axes (faint)
canvas.createArrow(cx - A - 20, cy, cx + A + 20, cy, {
  color: 'grey', arrowheadStart: 'none', arrowheadEnd: 'none', dash: 'dotted'
})
canvas.createArrow(cx, cy - B - 20, cx, cy + B + 20, {
  color: 'grey', arrowheadStart: 'none', arrowheadEnd: 'none', dash: 'dotted'
})

// Info display
const infoId = canvas.createText(cx - 60, cy + B + 40, 'Ratio: 3:2', { size: 'm', color: 'grey' })

let t = 0
const trail = []

const interval = setInterval(() => {
  // Slowly shift phase for evolving pattern
  phase += 0.003

  // Calculate position
  const x = cx + A * Math.sin(freqA * t + phase)
  const y = cy + B * Math.sin(freqB * t)

  // Add to trail
  trail.push({ x, y })
  if (trail.length > trailLen) trail.shift()

  t += 0.03

  // Every ~10 seconds, change frequency ratio
  if (Math.floor(t / 30) % 4 === 1 && freqA === 3) {
    freqA = 5; freqB = 4
  } else if (Math.floor(t / 30) % 4 === 2 && freqA === 5 && freqB === 4) {
    freqA = 5; freqB = 6
  } else if (Math.floor(t / 30) % 4 === 3 && freqB === 6) {
    freqA = 7; freqB = 6
  } else if (Math.floor(t / 30) % 4 === 0 && freqA === 7) {
    freqA = 3; freqB = 2
  }

  // Update visuals
  const updates = []

  // Rainbow trail based on position in trail
  const colors = ['red', 'orange', 'yellow', 'green', 'light-blue', 'blue', 'violet']
  trail.forEach((pt, i) => {
    const progress = i / trail.length
    const colorIdx = Math.floor(progress * colors.length)
    const size = 1 + progress * 3
    updates.push({
      id: trailIds[i],
      type: 'geo',
      x: pt.x - size,
      y: pt.y - size,
      props: { w: size * 2, h: size * 2, color: colors[colorIdx] },
      opacity: progress * 0.9
    })
  })

  // Hide unused trail segments
  for (let i = trail.length; i < trailLen; i++) {
    updates.push({ id: trailIds[i], type: 'geo', opacity: 0 })
  }

  // Update head
  updates.push({
    id: headId,
    type: 'geo',
    x: x - 8,
    y: y - 8
  })

  // Update info
  updates.push({
    id: infoId,
    type: 'text',
    props: { richText: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Ratio: ' + freqA + ':' + freqB }] }] } }
  })

  editor.updateShapes(updates)
}, 20)

canvas.zoomToFit({ animation: { duration: 400 } })`,

	'Lorenz Attractor': `// Lorenz attractor - chaotic "butterfly" system

const cx = 400, cy = 350
const scale = 8

// Lorenz parameters
const sigma = 10
const rho = 28
const beta = 8 / 3
const dt = 0.005

// Two particles to show sensitivity to initial conditions
const particles = [
  { x: 1, y: 1, z: 1, color: 'blue', trail: [] },
  { x: 1.001, y: 1, z: 1, color: 'red', trail: [] }  // tiny difference!
]

// Create trail shapes for each particle
const trailLen = 200
const trailIds = particles.map(p => {
  const ids = []
  for (let i = 0; i < trailLen; i++) {
    ids.push(canvas.createCircle(cx, cy, 2, {
      color: p.color,
      fill: 'solid'
    }))
  }
  return ids
})

// Current position markers
const headIds = particles.map(p =>
  canvas.createCircle(cx, cy, 5, { color: p.color, fill: 'solid' })
)

// Project 3D to 2D (simple orthographic, rotated view)
function project(x, y, z) {
  return {
    x: cx + (x - z * 0.3) * scale,
    y: cy - (z - 25) * scale * 0.8  // center on attractor
  }
}

// Lorenz equations
function lorenz(x, y, z) {
  return {
    dx: sigma * (y - x),
    dy: x * (rho - z) - y,
    dz: x * y - beta * z
  }
}

const interval = setInterval(() => {
  // Update each particle
  particles.forEach((p, pIdx) => {
    // RK4 integration for accuracy
    const k1 = lorenz(p.x, p.y, p.z)
    const k2 = lorenz(p.x + k1.dx*dt/2, p.y + k1.dy*dt/2, p.z + k1.dz*dt/2)
    const k3 = lorenz(p.x + k2.dx*dt/2, p.y + k2.dy*dt/2, p.z + k2.dz*dt/2)
    const k4 = lorenz(p.x + k3.dx*dt, p.y + k3.dy*dt, p.z + k3.dz*dt)

    p.x += (k1.dx + 2*k2.dx + 2*k3.dx + k4.dx) * dt / 6
    p.y += (k1.dy + 2*k2.dy + 2*k3.dy + k4.dy) * dt / 6
    p.z += (k1.dz + 2*k2.dz + 2*k3.dz + k4.dz) * dt / 6

    // Add to trail
    p.trail.push({ x: p.x, y: p.y, z: p.z })
    if (p.trail.length > trailLen) p.trail.shift()
  })

  // Update visuals
  const updates = []

  particles.forEach((p, pIdx) => {
    // Update trail
    p.trail.forEach((pt, i) => {
      const pos = project(pt.x, pt.y, pt.z)
      const opacity = (i / p.trail.length) * 0.8
      const size = 1 + (i / p.trail.length) * 2
      updates.push({
        id: trailIds[pIdx][i],
        type: 'geo',
        x: pos.x - size,
        y: pos.y - size,
        props: { w: size * 2, h: size * 2 },
        opacity
      })
    })

    // Update head
    const headPos = project(p.x, p.y, p.z)
    updates.push({
      id: headIds[pIdx],
      type: 'geo',
      x: headPos.x - 5,
      y: headPos.y - 5
    })
  })

  editor.updateShapes(updates)
}, 20)

// Add label
canvas.createText(cx - 100, cy + 180, 'Two particles starting 0.001 apart...', { size: 's', color: 'grey' })

canvas.zoomToFit({ animation: { duration: 400 } })`,

	'Double Pendulum': `// Double pendulum - chaotic motion

const cx = 400, cy = 200
const g = 1.5  // gravity

// Pendulum properties
const L1 = 100, L2 = 100  // arm lengths
const m1 = 10, m2 = 10    // masses
let a1 = Math.PI / 2      // angle 1 (from vertical)
let a2 = Math.PI / 2      // angle 2
let v1 = 0, v2 = 0        // angular velocities

// Create pivot point
canvas.createCircle(cx, cy, 8, { color: 'black', fill: 'solid' })

// Create arms (using bezier as lines)
const arm1 = canvas.createBezier(cx, cy, {
  start: { x: 0, y: 0 }, cp1: { x: 0, y: 50 },
  cp2: { x: 0, y: 50 }, end: { x: 0, y: L1 }
})
const arm2 = canvas.createBezier(cx, cy + L1, {
  start: { x: 0, y: 0 }, cp1: { x: 0, y: 50 },
  cp2: { x: 0, y: 50 }, end: { x: 0, y: L2 }
})

// Create bobs
const bob1 = canvas.createCircle(cx, cy + L1, 12, {
  color: 'blue', fill: 'solid'
})
const bob2 = canvas.createCircle(cx, cy + L1 + L2, 12, {
  color: 'red', fill: 'solid'
})

// Trail for second bob
const trailLen = 60
const trail = []
for (let i = 0; i < trailLen; i++) {
  trail.push(canvas.createCircle(cx, cy, 2, {
    color: 'red', fill: 'solid'
  }))
}
const trailPoints = []

const interval = setInterval(() => {
  // Double pendulum physics (simplified)
  const num1 = -g * (2*m1 + m2) * Math.sin(a1)
  const num2 = -m2 * g * Math.sin(a1 - 2*a2)
  const num3 = -2 * Math.sin(a1 - a2) * m2
  const num4 = v2*v2*L2 + v1*v1*L1*Math.cos(a1-a2)
  const den1 = L1 * (2*m1 + m2 - m2*Math.cos(2*a1 - 2*a2))
  const acc1 = (num1 + num2 + num3*num4) / den1

  const num5 = 2 * Math.sin(a1 - a2)
  const num6 = v1*v1*L1*(m1+m2) + g*(m1+m2)*Math.cos(a1)
  const num7 = v2*v2*L2*m2*Math.cos(a1-a2)
  const den2 = L2 * (2*m1 + m2 - m2*Math.cos(2*a1 - 2*a2))
  const acc2 = (num5 * (num6 + num7)) / den2

  v1 += acc1 * 0.2
  v2 += acc2 * 0.2
  a1 += v1 * 0.2
  a2 += v2 * 0.2

  // Calculate positions
  const x1 = cx + L1 * Math.sin(a1)
  const y1 = cy + L1 * Math.cos(a1)
  const x2 = x1 + L2 * Math.sin(a2)
  const y2 = y1 + L2 * Math.cos(a2)

  // Update trail
  trailPoints.push({ x: x2, y: y2 })
  if (trailPoints.length > trailLen) trailPoints.shift()

  const trailUpdates = trail.map((id, i) => {
    const pt = trailPoints[i] || { x: x2, y: y2 }
    const opacity = i / trailLen
    return {
      id, type: 'geo',
      x: pt.x - 2, y: pt.y - 2,
      opacity: opacity * 0.7
    }
  })

  // Update arms and bobs
  editor.updateShapes([
    ...trailUpdates,
    {
      id: arm1, type: 'bezier-curve',
      x: cx, y: cy,
      props: {
        start: { x: 0, y: 0 },
        cp1: { x: (x1-cx)*0.33, y: (y1-cy)*0.33 },
        cp2: { x: (x1-cx)*0.67, y: (y1-cy)*0.67 },
        end: { x: x1-cx, y: y1-cy }
      }
    },
    {
      id: arm2, type: 'bezier-curve',
      x: x1, y: y1,
      props: {
        start: { x: 0, y: 0 },
        cp1: { x: (x2-x1)*0.33, y: (y2-y1)*0.33 },
        cp2: { x: (x2-x1)*0.67, y: (y2-y1)*0.67 },
        end: { x: x2-x1, y: y2-y1 }
      }
    },
    { id: bob1, type: 'geo', x: x1 - 12, y: y1 - 12 },
    { id: bob2, type: 'geo', x: x2 - 12, y: y2 - 12 }
  ])
}, 30)

canvas.zoomToFit({ animation: { duration: 400 } })`,

	'Turing Machine': `// Turing Machine - binary increment

const tapeLen = 21
const cellSize = 32
const startX = 100, startY = 200

// Tape: starts with binary number (e.g., 1011 = 11)
const tape = Array(tapeLen).fill('0')
tape[10] = '1'; tape[11] = '0'; tape[12] = '1'; tape[13] = '1'  // 1011

// Create tape cells
const cellIds = []
for (let i = 0; i < tapeLen; i++) {
  cellIds[i] = canvas.createRect(
    startX + i * cellSize, startY,
    cellSize - 2, cellSize - 2,
    { color: 'light-blue', fill: 'solid' }
  )
}

// Create tape symbols
const symbolIds = []
for (let i = 0; i < tapeLen; i++) {
  symbolIds[i] = canvas.createText(
    startX + i * cellSize + 8, startY + 4,
    tape[i],
    { size: 'm', color: 'black' }
  )
}

// Head indicator
const headId = canvas.createTriangle(
  startX + 10 * cellSize, startY - 30,
  cellSize - 2, 25,
  { color: 'red', fill: 'solid' }
)

// State display
const stateId = canvas.createText(
  startX, startY - 60,
  'State: scanRight',
  { size: 'm', color: 'black' }
)

// Machine state
let head = 10  // start at leftmost 1
let state = 'scanRight'
let halted = false

// Transition function for binary increment
// Scans right to end, then carries back left
function step() {
  const sym = tape[head]

  if (state === 'scanRight') {
    if (sym === '1' || sym === '0') {
      head++  // move right
    } else {
      head--  // found blank, go back
      state = 'carry'
    }
  } else if (state === 'carry') {
    if (sym === '1') {
      tape[head] = '0'  // 1 + 1 = 10, write 0, carry
      head--
    } else if (sym === '0') {
      tape[head] = '1'  // 0 + 1 = 1, done
      state = 'halt'
      halted = true
    } else {
      tape[head] = '1'  // blank + carry = 1
      state = 'halt'
      halted = true
    }
  }
}

// Animation
const interval = setInterval(() => {
  if (halted) {
    clearInterval(interval)
    return
  }

  step()

  // Update visuals
  const updates = []

  // Update head position
  updates.push({
    id: headId,
    type: 'geo',
    x: startX + head * cellSize
  })

  // Update state display
  editor.updateShapes([{
    id: stateId,
    type: 'text',
    props: { richText: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'State: ' + state }] }] } }
  }])

  // Update tape symbols and highlight current cell
  for (let i = 0; i < tapeLen; i++) {
    updates.push({
      id: cellIds[i],
      type: 'geo',
      props: { color: i === head ? 'yellow' : 'light-blue' }
    })
    // Update symbol text
    editor.updateShapes([{
      id: symbolIds[i],
      type: 'text',
      props: { richText: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: tape[i] }] }] } }
    }])
  }

  editor.updateShapes(updates)
}, 400)

canvas.zoomToFit({ animation: { duration: 400 } })`,

	'Game of Life': `// Conway's Game of Life cellular automaton

const cols = 20, rows = 15
const cellSize = 22
const startX = 150, startY = 100

// Initialize grid with random state
let grid = []
for (let y = 0; y < rows; y++) {
  grid[y] = []
  for (let x = 0; x < cols; x++) {
    grid[y][x] = Math.random() > 0.65 ? 1 : 0
  }
}

// Create cell shapes
const cellIds = []
for (let y = 0; y < rows; y++) {
  cellIds[y] = []
  for (let x = 0; x < cols; x++) {
    const id = canvas.createRect(
      startX + x * cellSize,
      startY + y * cellSize,
      cellSize - 2,
      cellSize - 2,
      {
        color: 'blue',
        fill: 'solid'
      }
    )
    cellIds[y][x] = id
  }
}

// Count live neighbors
function countNeighbors(g, x, y) {
  let count = 0
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue
      const ny = (y + dy + rows) % rows  // wrap around
      const nx = (x + dx + cols) % cols
      count += g[ny][nx]
    }
  }
  return count
}

// Compute next generation
function nextGen() {
  const next = []
  for (let y = 0; y < rows; y++) {
    next[y] = []
    for (let x = 0; x < cols; x++) {
      const neighbors = countNeighbors(grid, x, y)
      const alive = grid[y][x]

      if (alive && (neighbors === 2 || neighbors === 3)) {
        next[y][x] = 1  // survives
      } else if (!alive && neighbors === 3) {
        next[y][x] = 1  // birth
      } else {
        next[y][x] = 0  // dies
      }
    }
  }
  return next
}

// Animation loop
const colors = ['light-blue', 'blue', 'violet', 'green']
let generation = 0

const interval = setInterval(() => {
  generation++
  grid = nextGen()

  // Update cell visibility
  const updates = []
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const alive = grid[y][x]
      updates.push({
        id: cellIds[y][x],
        type: 'geo',
        props: {
          color: colors[generation % colors.length]
        },
        opacity: alive ? 1 : 0.05
      })
    }
  }
  editor.updateShapes(updates)
}, 150)

canvas.zoomToFit({ animation: { duration: 400 } })`,

	'Maze generator': `// Generate a random maze using recursive backtracking

const cols = 12, rows = 8
const cellSize = 50
const startX = 100, startY = 80
const walls = []

// Initialize grid
const grid = []
for (let y = 0; y < rows; y++) {
  grid[y] = []
  for (let x = 0; x < cols; x++) {
    grid[y][x] = { visited: false, walls: [true, true, true, true] } // top, right, bottom, left
  }
}

// Recursive backtracking
const stack = []
let current = { x: 0, y: 0 }
grid[0][0].visited = true

function getUnvisitedNeighbors(x, y) {
  const neighbors = []
  if (y > 0 && !grid[y-1][x].visited) neighbors.push({ x, y: y-1, dir: 0 })
  if (x < cols-1 && !grid[y][x+1].visited) neighbors.push({ x: x+1, y, dir: 1 })
  if (y < rows-1 && !grid[y+1][x].visited) neighbors.push({ x, y: y+1, dir: 2 })
  if (x > 0 && !grid[y][x-1].visited) neighbors.push({ x: x-1, y, dir: 3 })
  return neighbors
}

// Generate maze
while (true) {
  const neighbors = getUnvisitedNeighbors(current.x, current.y)
  if (neighbors.length > 0) {
    const next = neighbors[Math.floor(Math.random() * neighbors.length)]
    stack.push(current)

    // Remove walls between current and next
    grid[current.y][current.x].walls[next.dir] = false
    grid[next.y][next.x].walls[(next.dir + 2) % 4] = false

    current = { x: next.x, y: next.y }
    grid[current.y][current.x].visited = true
  } else if (stack.length > 0) {
    current = stack.pop()
  } else {
    break
  }
}

// Draw walls
for (let y = 0; y < rows; y++) {
  for (let x = 0; x < cols; x++) {
    const px = startX + x * cellSize
    const py = startY + y * cellSize
    const cell = grid[y][x]

    if (cell.walls[0]) // top
      canvas.createArrow(px, py, px + cellSize, py, { color: 'black', arrowheadStart: 'none', arrowheadEnd: 'none' })
    if (cell.walls[1]) // right
      canvas.createArrow(px + cellSize, py, px + cellSize, py + cellSize, { color: 'black', arrowheadStart: 'none', arrowheadEnd: 'none' })
    if (cell.walls[2]) // bottom
      canvas.createArrow(px, py + cellSize, px + cellSize, py + cellSize, { color: 'black', arrowheadStart: 'none', arrowheadEnd: 'none' })
    if (cell.walls[3]) // left
      canvas.createArrow(px, py, px, py + cellSize, { color: 'black', arrowheadStart: 'none', arrowheadEnd: 'none' })
  }
}

// Mark start and end
canvas.createCircle(startX + cellSize/2, startY + cellSize/2, 15, { color: 'green', fill: 'solid' })
canvas.createStar(startX + (cols-0.5) * cellSize, startY + (rows-0.5) * cellSize, 30, 30, { color: 'yellow', fill: 'solid' })

canvas.zoomToFit({ animation: { duration: 400 } })`,

	'Mouse Attract': `// Move your mouse to attract particles!

const cx = 400, cy = 300
const numParticles = 40

const particles = []
for (let i = 0; i < numParticles; i++) {
  const angle = Math.random() * Math.PI * 2
  const dist = 50 + Math.random() * 200
  particles.push({
    x: cx + Math.cos(angle) * dist,
    y: cy + Math.sin(angle) * dist,
    vx: (Math.random() - 0.5) * 2,
    vy: (Math.random() - 0.5) * 2
  })
}

const colors = ['red', 'orange', 'yellow', 'green', 'light-blue', 'blue', 'violet']
const particleIds = particles.map((p, i) =>
  canvas.createCircle(p.x, p.y, 6, {
    color: colors[i % colors.length],
    fill: 'solid'
  })
)

canvas.createText(200, 30, 'Move mouse to attract, hold shift to repel!', { size: 'm', color: 'grey' })

// Track mouse
let mouseX = cx, mouseY = cy, shiftHeld = false
const canvasEl = document.querySelector('.tl-canvas')

canvasEl?.addEventListener('mousemove', (e) => {
  const rect = canvasEl.getBoundingClientRect()
  const camera = canvas.getCamera()
  mouseX = (e.clientX - rect.left) / camera.z - camera.x
  mouseY = (e.clientY - rect.top) / camera.z - camera.y
})

document.addEventListener('keydown', (e) => { if (e.key === 'Shift') shiftHeld = true })
document.addEventListener('keyup', (e) => { if (e.key === 'Shift') shiftHeld = false })

const interval = setInterval(() => {
  particles.forEach(p => {
    const dx = mouseX - p.x
    const dy = mouseY - p.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > 5 && dist < 400) {
      const force = (shiftHeld ? -200 : 150) / (dist * dist)
      p.vx += (dx / dist) * force
      p.vy += (dy / dist) * force
    }

    // Damping
    p.vx *= 0.96
    p.vy *= 0.96

    // Move
    p.x += p.vx
    p.y += p.vy

    // Soft bounds
    if (p.x < 50) p.vx += 0.5
    if (p.x > 750) p.vx -= 0.5
    if (p.y < 50) p.vy += 0.5
    if (p.y > 550) p.vy -= 0.5
  })

  const updates = particles.map((p, i) => ({
    id: particleIds[i],
    type: 'geo',
    x: p.x - 6,
    y: p.y - 6
  }))

  editor.updateShapes(updates)
}, 25)

canvas.zoomToFit({ animation: { duration: 400 } })`,

	'Click Explosions': `// Click anywhere to create explosions!

const cx = 400, cy = 300
const maxParticles = 60

const particles = []
const particleIds = []

const colors = ['red', 'orange', 'yellow', 'light-green', 'light-blue', 'violet']

// Pre-create particle shapes
for (let i = 0; i < maxParticles; i++) {
  particleIds.push(canvas.createCircle(cx, cy, 4, {
    color: colors[i % colors.length],
    fill: 'solid'
  }))
  particles.push({ x: cx, y: cy, vx: 0, vy: 0, life: 0 })
}

canvas.createText(250, 30, 'Click to create explosions!', { size: 'm', color: 'grey' })

// Click handler
const canvasEl = document.querySelector('.tl-canvas')
let nextParticle = 0

canvasEl?.addEventListener('click', (e) => {
  const rect = canvasEl.getBoundingClientRect()
  const camera = canvas.getCamera()
  const clickX = (e.clientX - rect.left) / camera.z - camera.x
  const clickY = (e.clientY - rect.top) / camera.z - camera.y

  // Spawn burst of particles
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.3
    const speed = 4 + Math.random() * 6
    const p = particles[nextParticle]
    p.x = clickX
    p.y = clickY
    p.vx = Math.cos(angle) * speed
    p.vy = Math.sin(angle) * speed
    p.life = 80 + Math.random() * 40
    nextParticle = (nextParticle + 1) % maxParticles
  }
})

const interval = setInterval(() => {
  const updates = []

  particles.forEach((p, i) => {
    if (p.life > 0) {
      p.vy += 0.15  // gravity
      p.vx *= 0.98
      p.vy *= 0.98
      p.x += p.vx
      p.y += p.vy
      p.life--

      updates.push({
        id: particleIds[i],
        type: 'geo',
        x: p.x - 4,
        y: p.y - 4,
        opacity: Math.min(1, p.life / 30)
      })
    } else {
      updates.push({
        id: particleIds[i],
        type: 'geo',
        opacity: 0
      })
    }
  })

  editor.updateShapes(updates)
}, 25)

canvas.zoomToFit({ animation: { duration: 400 } })`,

	'Mouse Trail': `// Beautiful trailing particles follow your mouse

const trailLen = 50
const cx = 400, cy = 300

// Create trail particles
const trail = []
const trailIds = []
const colors = ['red', 'orange', 'yellow', 'green', 'light-blue', 'blue', 'violet']

for (let i = 0; i < trailLen; i++) {
  trail.push({ x: cx, y: cy })
  trailIds.push(canvas.createCircle(cx, cy, 3, {
    color: colors[i % colors.length],
    fill: 'solid'
  }))
}

canvas.createText(280, 30, 'Move your mouse!', { size: 'm', color: 'grey' })

// Track mouse
let mouseX = cx, mouseY = cy
const canvasEl = document.querySelector('.tl-canvas')

canvasEl?.addEventListener('mousemove', (e) => {
  const rect = canvasEl.getBoundingClientRect()
  const camera = canvas.getCamera()
  mouseX = (e.clientX - rect.left) / camera.z - camera.x
  mouseY = (e.clientY - rect.top) / camera.z - camera.y
})

const interval = setInterval(() => {
  // Head follows mouse
  trail[0].x += (mouseX - trail[0].x) * 0.3
  trail[0].y += (mouseY - trail[0].y) * 0.3

  // Each segment follows the one before it
  for (let i = 1; i < trailLen; i++) {
    const dx = trail[i-1].x - trail[i].x
    const dy = trail[i-1].y - trail[i].y
    trail[i].x += dx * 0.25
    trail[i].y += dy * 0.25
  }

  // Render with size gradient
  const updates = trail.map((p, i) => {
    const progress = 1 - i / trailLen
    const size = 2 + progress * 10
    return {
      id: trailIds[i],
      type: 'geo',
      x: p.x - size / 2,
      y: p.y - size / 2,
      props: { w: size, h: size },
      opacity: progress * 0.9
    }
  })

  editor.updateShapes(updates)
}, 20)

canvas.zoomToFit({ animation: { duration: 400 } })`,

	'Zoom Universe': `// Zoom to explore different scales of the universe

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

canvas.zoomToFit({ animation: { duration: 400 } })`,

	'Zoom Temperature': `// Gas simulation - zoom controls temperature!

const boxX = 200, boxY = 100
const boxW = 400, boxH = 300
const numParticles = 25

// Create container
canvas.createFrame(boxX, boxY, boxW, boxH, { name: 'Gas Chamber' })

// Create particles
const particles = []
for (let i = 0; i < numParticles; i++) {
  const angle = Math.random() * Math.PI * 2
  const speed = 1 + Math.random() * 2
  particles.push({
    x: boxX + 50 + Math.random() * (boxW - 100),
    y: boxY + 50 + Math.random() * (boxH - 100),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: 6 + Math.random() * 6
  })
}

// Particle shapes
const particleIds = particles.map((p, i) =>
  canvas.createCircle(p.x, p.y, p.radius, {
    color: 'blue',
    fill: 'solid'
  })
)

// Temperature display
const tempId = canvas.createText(boxX, boxY - 35, 'Temperature: COLD', { size: 'm' })

// Color scale for temperature
function tempColor(temp) {
  if (temp < 0.7) return 'blue'
  if (temp < 1.0) return 'light-blue'
  if (temp < 1.5) return 'green'
  if (temp < 2.0) return 'yellow'
  if (temp < 3.0) return 'orange'
  return 'red'
}

function tempLabel(temp) {
  if (temp < 0.7) return 'FROZEN'
  if (temp < 1.0) return 'COLD'
  if (temp < 1.5) return 'COOL'
  if (temp < 2.0) return 'WARM'
  if (temp < 3.0) return 'HOT'
  return 'PLASMA!'
}

const interval = setInterval(() => {
  const camera = canvas.getCamera()
  const temp = camera.z  // zoom = temperature

  // Target speed based on temperature
  const targetSpeed = temp * 3

  // Update physics
  particles.forEach(p => {
    // Adjust speed toward target (thermal equilibrium)
    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
    if (speed > 0.1) {
      const factor = 0.98 + (targetSpeed / speed) * 0.02
      p.vx *= factor
      p.vy *= factor
    } else {
      // Random kick if nearly stopped
      const angle = Math.random() * Math.PI * 2
      p.vx = Math.cos(angle) * targetSpeed * 0.5
      p.vy = Math.sin(angle) * targetSpeed * 0.5
    }

    // Add random thermal motion
    p.vx += (Math.random() - 0.5) * temp * 0.3
    p.vy += (Math.random() - 0.5) * temp * 0.3

    // Move
    p.x += p.vx
    p.y += p.vy

    // Bounce off walls
    if (p.x - p.radius < boxX) { p.x = boxX + p.radius; p.vx = Math.abs(p.vx) }
    if (p.x + p.radius > boxX + boxW) { p.x = boxX + boxW - p.radius; p.vx = -Math.abs(p.vx) }
    if (p.y - p.radius < boxY) { p.y = boxY + p.radius; p.vy = Math.abs(p.vy) }
    if (p.y + p.radius > boxY + boxH) { p.y = boxY + boxH - p.radius; p.vy = -Math.abs(p.vy) }
  })

  // Particle-particle collisions
  for (let i = 0; i < numParticles; i++) {
    for (let j = i + 1; j < numParticles; j++) {
      const a = particles[i], b = particles[j]
      const dx = b.x - a.x, dy = b.y - a.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const minDist = a.radius + b.radius

      if (dist < minDist && dist > 0) {
        // Elastic collision
        const nx = dx / dist, ny = dy / dist
        const dvx = a.vx - b.vx, dvy = a.vy - b.vy
        const dvn = dvx * nx + dvy * ny

        if (dvn > 0) {
          a.vx -= dvn * nx
          a.vy -= dvn * ny
          b.vx += dvn * nx
          b.vy += dvn * ny
        }

        // Separate overlapping particles
        const overlap = (minDist - dist) / 2
        a.x -= overlap * nx
        a.y -= overlap * ny
        b.x += overlap * nx
        b.y += overlap * ny
      }
    }
  }

  // Render
  const color = tempColor(temp)
  const updates = particles.map((p, i) => ({
    id: particleIds[i],
    type: 'geo',
    x: p.x - p.radius,
    y: p.y - p.radius,
    props: { color }
  }))

  // Update temperature display
  updates.push({
    id: tempId,
    type: 'text',
    props: {
      color,
      richText: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: tempLabel(temp) + ' (' + (temp * 100).toFixed(0) + '°)' }] }] }
    }
  })

  editor.updateShapes(updates)
}, 30)

canvas.zoomToFit({ animation: { duration: 400 } })`,

	'Cloth Physics': `// Cloth simulation using verlet integration

const gridW = 8, gridH = 6
const spacing = 25
const startX = 300, startY = 80
const gravity = 0.4
const damping = 0.98
const iterations = 3

// Create grid of points
const points = []
for (let y = 0; y < gridH; y++) {
  for (let x = 0; x < gridW; x++) {
    points.push({
      x: startX + x * spacing,
      y: startY + y * spacing,
      oldX: startX + x * spacing,
      oldY: startY + y * spacing,
      pinned: y === 0  // top row is pinned
    })
  }
}

// Create constraints (horizontal and vertical)
const constraints = []
for (let y = 0; y < gridH; y++) {
  for (let x = 0; x < gridW; x++) {
    const i = y * gridW + x
    // Horizontal
    if (x < gridW - 1) {
      constraints.push({ a: i, b: i + 1, len: spacing })
    }
    // Vertical
    if (y < gridH - 1) {
      constraints.push({ a: i, b: i + gridW, len: spacing })
    }
  }
}

// Create visual nodes
const nodeIds = points.map((p, i) =>
  canvas.createCircle(p.x, p.y, p.pinned ? 5 : 3, {
    color: p.pinned ? 'red' : 'blue',
    fill: 'solid'
  })
)

// Create segments using beziers
const segmentIds = constraints.map(c =>
  canvas.createBezier(points[c.a].x, points[c.a].y, {
    start: { x: 0, y: 0 },
    cp1: { x: 0, y: 0 },
    cp2: { x: spacing, y: 0 },
    end: { x: spacing, y: 0 }
  })
)

let time = 0
const interval = setInterval(() => {
  time += 0.02

  // Wind force (oscillating)
  const windX = Math.sin(time * 2) * 0.8
  const windY = Math.cos(time * 1.5) * 0.3

  // Verlet integration
  points.forEach(p => {
    if (p.pinned) return

    const vx = (p.x - p.oldX) * damping
    const vy = (p.y - p.oldY) * damping

    p.oldX = p.x
    p.oldY = p.y

    p.x += vx + windX
    p.y += vy + gravity + windY
  })

  // Constraint satisfaction
  for (let iter = 0; iter < iterations; iter++) {
    constraints.forEach(c => {
      const p1 = points[c.a]
      const p2 = points[c.b]

      const dx = p2.x - p1.x
      const dy = p2.y - p1.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const diff = c.len - dist
      const percent = diff / dist / 2

      const offsetX = dx * percent
      const offsetY = dy * percent

      if (!p1.pinned) {
        p1.x -= offsetX
        p1.y -= offsetY
      }
      if (!p2.pinned) {
        p2.x += offsetX
        p2.y += offsetY
      }
    })
  }

  // Update visuals
  const updates = []

  // Update nodes
  points.forEach((p, i) => {
    const size = p.pinned ? 5 : 3
    updates.push({
      id: nodeIds[i],
      type: 'geo',
      x: p.x - size,
      y: p.y - size
    })
  })

  // Update segments
  constraints.forEach((c, i) => {
    const p1 = points[c.a]
    const p2 = points[c.b]
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y

    // Color based on tension (stretch)
    const dist = Math.sqrt(dx * dx + dy * dy)
    const tension = Math.abs(dist - c.len) / c.len

    updates.push({
      id: segmentIds[i],
      type: 'bezier-curve',
      x: p1.x,
      y: p1.y,
      props: {
        start: { x: 0, y: 0 },
        cp1: { x: dx * 0.33, y: dy * 0.33 },
        cp2: { x: dx * 0.67, y: dy * 0.67 },
        end: { x: dx, y: dy }
      }
    })
  })

  editor.updateShapes(updates)
}, 25)

canvas.zoomToFit({ animation: { duration: 400 } })`,

	'Bouncing DVD logo': `// Classic bouncing DVD logo screensaver
// Changes color every time it hits a corner!

const screenW = 600, screenH = 400
const logoW = 100, logoH = 50
const startX = 150, startY = 100

// Create the screen boundary (black rectangle outline)
canvas.createRect(startX, startY, screenW, screenH, { color: 'black', fill: 'none' })

// DVD logo - text with a rectangle background
const colors = ['red', 'blue', 'green', 'violet', 'orange', 'yellow', 'light-blue']
let colorIndex = 0

const logoId = canvas.createRect(
  startX + screenW / 2 - logoW / 2,
  startY + screenH / 2 - logoH / 2,
  logoW, logoH,
  { color: colors[colorIndex], fill: 'solid', text: 'DVD' }
)

// Position and velocity
let x = screenW / 2 - logoW / 2
let y = screenH / 2 - logoH / 2
let vx = 3
let vy = 2

// Corner hit counter
let cornerHits = 0
const cornerTextId = canvas.createText(startX, startY - 30, 'Corner hits: 0', { size: 'm' })

const interval = setInterval(() => {
  // Update position
  x += vx
  y += vy

  // Track if we hit horizontal and vertical edges
  let hitX = false
  let hitY = false

  // Bounce off walls
  if (x <= 0) {
    x = 0
    vx = Math.abs(vx)
    hitX = true
  } else if (x >= screenW - logoW) {
    x = screenW - logoW
    vx = -Math.abs(vx)
    hitX = true
  }

  if (y <= 0) {
    y = 0
    vy = Math.abs(vy)
    hitY = true
  } else if (y >= screenH - logoH) {
    y = screenH - logoH
    vy = -Math.abs(vy)
    hitY = true
  }

  // Change color on any edge hit
  if (hitX || hitY) {
    colorIndex = (colorIndex + 1) % colors.length

    // Check for corner hit (both edges at once)
    if (hitX && hitY) {
      cornerHits++
      // Flash effect for corner hit
      editor.updateShapes([{
        id: logoId,
        type: 'geo',
        props: { color: 'white' }
      }])
      setTimeout(() => {
        editor.updateShapes([{
          id: logoId,
          type: 'geo',
          props: { color: colors[colorIndex] }
        }])
      }, 100)
    }
  }

  // Update logo position and color
  editor.updateShapes([
    {
      id: logoId,
      type: 'geo',
      x: startX + x,
      y: startY + y,
      props: { color: colors[colorIndex] }
    },
    {
      id: cornerTextId,
      type: 'text',
      props: {
        richText: {
          type: 'doc',
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: 'Corner hits: ' + cornerHits }]
          }]
        }
      }
    }
  ])
}, 30)

canvas.zoomToFit({ animation: { duration: 400 } })`,
}

// The default example shown on first load
export const defaultCode = examples['Modify shapes']
