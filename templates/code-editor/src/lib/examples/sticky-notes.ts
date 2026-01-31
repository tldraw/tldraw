export const name = 'Sticky notes'

export const code = `// Create a kanban-style board with sticky notes

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

canvas.zoomToFit({ animation: { duration: 400 } })`
