export const name = 'Turing Machine'

export const code = `
const tapeLen = 21
const cellSize = 32
const startX = 100, startY = 200

const tape = Array(tapeLen).fill('0')
tape[10] = '1'; tape[11] = '0'; tape[12] = '1'; tape[13] = '1'

const cellIds = []
for (let i = 0; i < tapeLen; i++) {
  cellIds[i] = canvas.createRect(
    startX + i * cellSize, startY,
    cellSize - 2, cellSize - 2,
    { color: 'light-blue', fill: 'solid' }
  )
}

const symbolIds = []
for (let i = 0; i < tapeLen; i++) {
  symbolIds[i] = canvas.createText(
    startX + i * cellSize + 8, startY + 4,
    tape[i],
    { size: 'm', color: 'black' }
  )
}

const headId = canvas.createTriangle(
  startX + 10 * cellSize, startY - 30,
  cellSize - 2, 25,
  { color: 'red', fill: 'solid' }
)

const stateId = canvas.createText(
  startX, startY - 60,
  'State: scanRight',
  { size: 'm', color: 'black' }
)

let head = 10
let state = 'scanRight'
let halted = false

function step() {
  const sym = tape[head]

  if (state === 'scanRight') {
    if (sym === '1' || sym === '0') {
      head++
    } else {
      head--
      state = 'carry'
    }
  } else if (state === 'carry') {
    if (sym === '1') {
      tape[head] = '0'
      head--
    } else if (sym === '0') {
      tape[head] = '1'
      state = 'halt'
      halted = true
    } else {
      tape[head] = '1'
      state = 'halt'
      halted = true
    }
  }
}

const interval = setInterval(() => {
  if (halted) {
    clearInterval(interval)
    return
  }

  step()

  const updates = []

  updates.push({
    id: headId,
    type: 'geo',
    x: startX + head * cellSize
  })

  editor.updateShapes([{
    id: stateId,
    type: 'text',
    props: { richText: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'State: ' + state }] }] } }
  }])

  for (let i = 0; i < tapeLen; i++) {
    updates.push({
      id: cellIds[i],
      type: 'geo',
      props: { color: i === head ? 'yellow' : 'light-blue' }
    })
    editor.updateShapes([{
      id: symbolIds[i],
      type: 'text',
      props: { richText: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: tape[i] }] }] } }
    }])
  }

  editor.updateShapes(updates)
}, 400)

canvas.zoomToFit({ animation: { duration: 400 } })`
