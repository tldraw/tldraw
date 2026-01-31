export const name = 'Flowchart'

export const code = `
const start = canvas.createGeo(300, 50, 120, 50, {
  geo: 'oval',
  color: 'green',
  fill: 'solid',
  text: 'Start'
})

const decision = canvas.createDiamond(300, 160, 140, 100, {
  color: 'yellow',
  fill: 'solid',
  text: 'Is valid?'
})

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

canvas.createArrow(360, 95, 360, 160, { color: 'black' })
canvas.createArrow(300, 210, 190, 320, { color: 'green' })
canvas.createArrow(380, 210, 490, 320, { color: 'red' })
canvas.createArrow(190, 390, 190, 450, { color: 'black' })
canvas.createArrow(490, 390, 490, 450, { color: 'black' })

canvas.createText(220, 250, 'Yes', { color: 'green', size: 's' })
canvas.createText(430, 250, 'No', { color: 'red', size: 's' })

canvas.zoomToFit({ animation: { duration: 400 } })`
