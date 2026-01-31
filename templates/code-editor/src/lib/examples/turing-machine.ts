export const name = 'Turing Machine'

export const code = `// Turing Machine - binary increment

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

canvas.zoomToFit({ animation: { duration: 400 } })`
