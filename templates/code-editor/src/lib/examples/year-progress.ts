export const name = 'Year Progress'

export const code = `// Year Progress - How much of the year has passed

const now = new Date()
const startOfYear = new Date(now.getFullYear(), 0, 1)
const endOfYear = new Date(now.getFullYear() + 1, 0, 1)
const dayOfYear = Math.floor((now - startOfYear) / (1000 * 60 * 60 * 24))
const totalDays = Math.floor((endOfYear - startOfYear) / (1000 * 60 * 60 * 24))
const progress = dayOfYear / totalDays

const cx = 400, cy = 280
const barWidth = 400, barHeight = 40
const barX = cx - barWidth/2, barY = cy

// Title
canvas.createText(cx - 80, cy - 100, now.getFullYear() + ' Progress', { size: 'xl' })

// Progress bar background
canvas.createRect(barX, barY, barWidth, barHeight, { color: 'grey', fill: 'solid' })

// Progress bar fill
const fillWidth = barWidth * progress
canvas.createRect(barX, barY, fillWidth, barHeight, { color: 'green', fill: 'solid' })

// Percentage text
const pct = (progress * 100).toFixed(1)
canvas.createText(cx - 25, barY + 8, pct + '%', { size: 'm', color: 'white' })

// Day count
canvas.createText(cx - 60, barY + 60, 'Day ' + dayOfYear + ' of ' + totalDays, { size: 'm', color: 'grey' })

// Days remaining
const daysLeft = totalDays - dayOfYear
canvas.createText(cx - 50, barY + 90, daysLeft + ' days remaining', { size: 's', color: 'grey' })

// Month markers
const months = ['J','F','M','A','M','J','J','A','S','O','N','D']
months.forEach((m, i) => {
  const x = barX + (i / 12) * barWidth
  canvas.createText(x + 12, barY + barHeight + 8, m, { size: 's', color: 'grey' })
})

// Week of year
const weekOfYear = Math.ceil(dayOfYear / 7)
canvas.createText(cx - 30, cy - 50, 'Week ' + weekOfYear, { size: 'm', color: 'blue' })

canvas.zoomToFit({ animation: { duration: 400 } })`
