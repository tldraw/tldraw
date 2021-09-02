import * as React from 'react'
import { inputs } from '@tldraw/core'
import { useHotkeys } from 'react-hotkeys-hook'
import { TLDrawShapeType } from '~types'
import type { TLDrawState } from '~state'

export function useKeyboardShortcuts(tlstate: TLDrawState) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const info = inputs.keydown(e)
      tlstate.onKeyDown(e.key, info)
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const info = inputs.keyup(e)
      tlstate.onKeyUp(e.key, info)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [tlstate])

  /* ---------------------- Tools --------------------- */

  useHotkeys('v,1', () => {
    tlstate.selectTool('select')
  })

  useHotkeys('d,2', () => {
    tlstate.selectTool(TLDrawShapeType.Draw)
  })

  useHotkeys('r,3', () => {
    tlstate.selectTool(TLDrawShapeType.Rectangle)
  })

  useHotkeys('e,4', () => {
    tlstate.selectTool(TLDrawShapeType.Ellipse)
  })

  useHotkeys('a,5', () => {
    tlstate.selectTool(TLDrawShapeType.Arrow)
  })

  useHotkeys('t,6', () => {
    tlstate.selectTool(TLDrawShapeType.Text)
  })

  /* ---------------------- Misc ---------------------- */

  // Save

  useHotkeys('ctrl+s,command+s', () => {
    tlstate.saveProject()
  })

  // Undo Redo

  useHotkeys('command+z,ctrl+z', () => {
    tlstate.undo()
  })

  useHotkeys('ctrl+shift-z,command+shift+z', () => {
    tlstate.redo()
  })

  // Undo Redo

  useHotkeys('command+u,ctrl+u', () => {
    tlstate.undoSelect()
  })

  useHotkeys('ctrl+shift-u,command+shift+u', () => {
    tlstate.redoSelect()
  })

  /* -------------------- Commands -------------------- */

  // Camera

  useHotkeys('ctrl+=,command+=', (e) => {
    tlstate.zoomIn()
    e.preventDefault()
  })

  useHotkeys('ctrl+-,command+-', (e) => {
    tlstate.zoomOut()
    e.preventDefault()
  })

  useHotkeys('shift+1', () => {
    tlstate.zoomToFit()
  })

  useHotkeys('shift+2', () => {
    tlstate.zoomToSelection()
  })

  useHotkeys('shift+0', () => {
    tlstate.zoomToActual()
  })

  // Duplicate

  useHotkeys('ctrl+d,command+d', (e) => {
    tlstate.duplicate()
    e.preventDefault()
  })

  // Flip

  useHotkeys('shift+h', () => {
    tlstate.flipHorizontal()
  })

  useHotkeys('shift+v', () => {
    tlstate.flipVertical()
  })

  // Cancel

  useHotkeys('escape', () => {
    tlstate.cancel()
  })

  // Delete

  useHotkeys('backspace', () => {
    tlstate.delete()
  })

  // Select All

  useHotkeys('command+a,ctrl+a', () => {
    tlstate.selectAll()
  })

  // Nudge

  useHotkeys('up', () => {
    tlstate.nudge([0, -1], false)
  })

  useHotkeys('right', () => {
    tlstate.nudge([1, 0], false)
  })

  useHotkeys('down', () => {
    tlstate.nudge([0, 1], false)
  })

  useHotkeys('left', () => {
    tlstate.nudge([-1, 0], false)
  })

  useHotkeys('shift+up', () => {
    tlstate.nudge([0, -1], true)
  })

  useHotkeys('shift+right', () => {
    tlstate.nudge([1, 0], true)
  })

  useHotkeys('shift+down', () => {
    tlstate.nudge([0, 1], true)
  })

  useHotkeys('shift+left', () => {
    tlstate.nudge([-1, 0], true)
  })

  // Copy & Paste

  useHotkeys('command+c,ctrl+c', () => {
    tlstate.copy()
  })

  useHotkeys('command+v,ctrl+v', () => {
    tlstate.paste()
  })

  // Group & Ungroup

  useHotkeys('command+g,ctrl+g', (e) => {
    tlstate.group()
    e.preventDefault()
  })

  useHotkeys('command+shift+g,ctrl+shift+g', (e) => {
    tlstate.ungroup()
    e.preventDefault()
  })

  // Move

  useHotkeys('[', () => {
    tlstate.moveBackward()
  })

  useHotkeys(']', () => {
    tlstate.moveForward()
  })

  useHotkeys('shift+[', () => {
    tlstate.moveToBack()
  })

  useHotkeys('shift+]', () => {
    tlstate.moveToFront()
  })

  useHotkeys('command+shift+backspace', (e) => {
    tlstate.resetDocument()
    e.preventDefault()
  })
}
