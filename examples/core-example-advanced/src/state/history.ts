import { current } from 'immer'
import { AppData, INITIAL_DATA, PERSIST_DATA } from './constants'

export function makeHistory(ID = '@tldraw/core_advanced_example') {
  let initialData = INITIAL_DATA

  const saved = localStorage.getItem(ID)

  if (PERSIST_DATA && saved !== null) {
    let restoredData = JSON.parse(saved)

    if (restoredData.version < INITIAL_DATA.version) {
      // Migrations would go here
      restoredData = INITIAL_DATA
    }

    initialData = restoredData
  }

  let stack: AppData[] = [initialData]
  let pointer = 0

  function persist(data: AppData) {
    delete data.pageState.hoveredId
    data.overlays.snapLines = []
    localStorage.setItem(ID, JSON.stringify(data))
  }

  function push(data: AppData) {
    if (pointer < stack.length - 1) {
      stack = stack.slice(0, pointer + 1)
    }
    const serialized = current(data)
    stack.push(serialized)
    pointer = stack.length - 1
    persist(serialized)
    return true
  }

  function undo() {
    if (pointer <= 0) return false
    pointer--
    const data = stack[pointer]
    persist(data)
    return data
  }

  function redo() {
    if (pointer >= stack.length - 1) return false
    pointer++
    const data = stack[pointer]
    persist(data)
    return data
  }

  function reset(data = INITIAL_DATA) {
    stack = [data]
    pointer = 0
    localStorage.setItem(ID, JSON.stringify(data))
    persist(data)
    return data
  }

  function restore() {
    return initialData
  }

  return { push, undo, redo, reset, restore }
}
