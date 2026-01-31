export const name = 'Calendar'

export const code = `
const now = new Date()
const year = now.getFullYear()
const month = now.getMonth()
const today = now.getDate()

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const startX = 150, startY = 80
const cellW = 50, cellH = 40

canvas.createText(startX + 80, startY, monthNames[month] + ' ' + year, { size: 'xl' })

dayNames.forEach((day, i) => {
  canvas.createText(startX + i * cellW + 10, startY + 50, day, { size: 's', color: 'grey' })
})

const firstDay = new Date(year, month, 1).getDay()
const daysInMonth = new Date(year, month + 1, 0).getDate()

for (let d = 1; d <= daysInMonth; d++) {
  const pos = firstDay + d - 1
  const row = Math.floor(pos / 7)
  const col = pos % 7

  const x = startX + col * cellW
  const y = startY + 80 + row * cellH

  if (d === today) {
    canvas.createCircle(x + cellW/2 - 5, y + cellH/2 - 5, 18, {
      color: 'blue', fill: 'solid'
    })
    canvas.createText(x + 12, y + 8, String(d), { size: 'm', color: 'white' })
  } else {
    const isWeekend = col === 0 || col === 6
    canvas.createText(x + 12, y + 8, String(d), {
      size: 'm',
      color: isWeekend ? 'light-blue' : 'black'
    })
  }
}

canvas.zoomToFit({ animation: { duration: 400 } })`
