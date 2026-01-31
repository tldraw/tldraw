export const name = '3D Starfield'

export const code = `
const cx = 400, cy = 300
const numStars = 80
const fieldDepth = 20
const speed = 0.15

const stars = []
for (let i = 0; i < numStars; i++) {
  stars.push({
    x: (Math.random() - 0.5) * 10,
    y: (Math.random() - 0.5) * 10,
    z: Math.random() * fieldDepth
  })
}

const starIds = stars.map(() =>
  canvas.createStar(cx, cy, 10, 10, {
    color: 'yellow',
    fill: 'solid'
  })
)

function project({ x, y, z }) {
  const fov = 300
  return {
    x: cx + (x / z) * fov,
    y: cy + (y / z) * fov
  }
}

const interval = setInterval(() => {
  const updates = []

  for (let i = 0; i < numStars; i++) {
    stars[i].z -= speed

    if (stars[i].z <= 0.1) {
      stars[i].x = (Math.random() - 0.5) * 10
      stars[i].y = (Math.random() - 0.5) * 10
      stars[i].z = fieldDepth
    }

    const star = stars[i]
    const pos = project(star)

    const size = Math.max(2, 25 / star.z)

    const opacity = Math.min(1, 1.5 / star.z)

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
