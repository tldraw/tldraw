export const name = '3D Starfield'

export const code = `// Fly through a 3D starfield with perspective projection

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

canvas.zoomToFit({ animation: { duration: 400 } })`
