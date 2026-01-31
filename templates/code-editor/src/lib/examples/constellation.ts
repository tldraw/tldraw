export const name = 'Constellation'

export const code = `
const stars = [
  { x: 200, y: 100, size: 35, name: 'Polaris' },
  { x: 280, y: 180, size: 25 },
  { x: 350, y: 140, size: 30 },
  { x: 420, y: 200, size: 28 },
  { x: 380, y: 280, size: 32 },
  { x: 300, y: 320, size: 26 },
  { x: 220, y: 260, size: 24 },
]

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

stars.forEach((star, i) => {
  const id = canvas.createStar(
    star.x - star.size / 2,
    star.y - star.size / 2,
    star.size,
    star.size,
    { color: 'yellow', fill: 'solid' }
  )

  if (star.name) {
    canvas.createText(star.x - 25, star.y - star.size - 15, star.name, {
      color: 'light-blue',
      size: 's',
      font: 'serif'
    })
  }
})

for (let i = 0; i < 20; i++) {
  const x = 100 + Math.random() * 400
  const y = 50 + Math.random() * 350
  const size = 5 + Math.random() * 8
  canvas.createStar(x, y, size, size, {
    color: 'grey',
    fill: 'solid'
  })
}

canvas.zoomToFit({ animation: { duration: 400 } })`
