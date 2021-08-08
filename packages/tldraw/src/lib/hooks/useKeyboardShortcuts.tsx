import React from 'react'
import { inputs } from '@tldraw/core'
import { useHotkeys } from 'react-hotkeys-hook'
import { TLDrawShapeType } from '../shape'
import { TLDrawState } from '../state'

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

  useHotkeys('v,1', (e) => {
    tlstate.selectTool('select')
    e.preventDefault()
  })

  useHotkeys('d,2', (e) => {
    tlstate.selectTool(TLDrawShapeType.Draw)
    e.preventDefault()
  })

  useHotkeys('r,3', (e) => {
    tlstate.selectTool(TLDrawShapeType.Rectangle)
    e.preventDefault()
  })

  useHotkeys('e,4', (e) => {
    tlstate.selectTool(TLDrawShapeType.Ellipse)
    e.preventDefault()
  })

  useHotkeys('a,5', (e) => {
    tlstate.selectTool(TLDrawShapeType.Arrow)
    e.preventDefault()
  })

  useHotkeys('t,6', (e) => {
    tlstate.selectTool(TLDrawShapeType.Text)
    e.preventDefault()
  })

  /* ---------------------- Misc ---------------------- */

  // Save

  useHotkeys('ctrl+s,command+s', (e) => {
    tlstate.save()
    e.preventDefault()
  })

  // Undo Redo

  useHotkeys('command+z', (e) => {
    tlstate.undo()
    e.preventDefault()
  })

  useHotkeys('ctrl+shift-z,command+shift+z', (e) => {
    tlstate.redo()
    e.preventDefault()
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

  useHotkeys('shift+1', (e) => {
    tlstate.zoomToFit()
    e.preventDefault()
  })

  useHotkeys('shift+2', (e) => {
    tlstate.zoomToSelection()
    e.preventDefault()
  })

  useHotkeys('shift+0', (e) => {
    tlstate.zoomToActual()
    e.preventDefault()
  })

  // Duplicate

  useHotkeys('ctrl+d,command+d', (e) => {
    tlstate.duplicate()
    e.preventDefault()
  })

  // Flip

  useHotkeys('shift+h', (e) => {
    tlstate.flipHorizontal()
    e.preventDefault()
  })

  useHotkeys('shift+v', (e) => {
    tlstate.flipVertical()
    e.preventDefault()
  })

  // Cancel

  useHotkeys('escape', (e) => {
    tlstate.cancel()
    e.preventDefault()
  })

  // Delete

  useHotkeys('backspace', (e) => {
    tlstate.delete()
    e.preventDefault()
  })

  // Select All

  useHotkeys('command+a,ctrl+a', (e) => {
    tlstate.selectAll()
    e.preventDefault()
  })

  // Nudge

  useHotkeys('up', (e) => {
    tlstate.nudge([0, -1], false)
    e.preventDefault()
  })

  useHotkeys('right', (e) => {
    tlstate.nudge([1, 0], false)
    e.preventDefault()
  })

  useHotkeys('down', (e) => {
    tlstate.nudge([0, 1], false)
    e.preventDefault()
  })

  useHotkeys('left', (e) => {
    tlstate.nudge([-1, 0], false)
    e.preventDefault()
  })

  useHotkeys('shift+up', (e) => {
    tlstate.nudge([0, -1], true)
    e.preventDefault()
  })

  useHotkeys('shift+right', (e) => {
    tlstate.nudge([1, 0], true)
    e.preventDefault()
  })

  useHotkeys('shift+down', (e) => {
    tlstate.nudge([0, 1], true)
    e.preventDefault()
  })

  useHotkeys('shift+left', (e) => {
    tlstate.nudge([-1, 0], true)
    e.preventDefault()
  })

  // Copy & Paste

  useHotkeys('command+c,ctrl+c', (e) => {
    tlstate.copy()
    e.preventDefault()
  })

  useHotkeys('command+v,ctrl+v', (e) => {
    tlstate.paste()
    e.preventDefault()
  })

  // Move

  useHotkeys('[', (e) => {
    tlstate.moveBackward()
    e.preventDefault()
  })

  useHotkeys(']', (e) => {
    tlstate.moveForward()
    e.preventDefault()
  })

  useHotkeys('shift+[', (e) => {
    tlstate.moveToBack()
    e.preventDefault()
  })

  useHotkeys('shift+]', (e) => {
    tlstate.moveToFront()
    e.preventDefault()
  })

  useHotkeys('command+shift+backspace', (e) => {
    tlstate.reset()
    e.preventDefault()
  })
}
