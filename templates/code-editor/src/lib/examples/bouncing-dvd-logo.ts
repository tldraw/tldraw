export const name = 'Bouncing DVD logo'

export const code = `
const screenW = 600, screenH = 400
const logoW = 100, logoH = 50
const startX = 150, startY = 100

canvas.createRect(startX, startY, screenW, screenH, { color: 'black', fill: 'none' })

const colors = ['red', 'blue', 'green', 'violet', 'orange', 'yellow', 'light-blue']
let colorIndex = 0

const logoId = canvas.createRect(
  startX + screenW / 2 - logoW / 2,
  startY + screenH / 2 - logoH / 2,
  logoW, logoH,
  { color: colors[colorIndex], fill: 'solid', text: 'DVD' }
)

let x = screenW / 2 - logoW / 2
let y = screenH / 2 - logoH / 2
let vx = 3
let vy = 2

let cornerHits = 0
const cornerTextId = canvas.createText(startX, startY - 30, 'Corner hits: 0', { size: 'm' })

const interval = setInterval(() => {
  x += vx
  y += vy

  let hitX = false
  let hitY = false

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

  if (hitX || hitY) {
    colorIndex = (colorIndex + 1) % colors.length

    if (hitX && hitY) {
      cornerHits++
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

canvas.zoomToFit({ animation: { duration: 400 } })`
