import * as React from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { TLDrawShapeType } from '~types'
import { useTLDrawContext } from '~hooks'

export function useKeyboardShortcuts() {
  const { tlstate } = useTLDrawContext()

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      tlstate.onKeyDown(e.key)
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      tlstate.onKeyUp(e.key)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [tlstate])

  /* ---------------------- Tools --------------------- */

  useHotkeys(
    'v,1',
    () => {
      tlstate.selectTool('select')
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'd,2',
    () => {
      tlstate.selectTool(TLDrawShapeType.Draw)
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'r,3',
    () => {
      tlstate.selectTool(TLDrawShapeType.Rectangle)
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'e,4',
    () => {
      tlstate.selectTool(TLDrawShapeType.Ellipse)
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'a,5',
    () => {
      tlstate.selectTool(TLDrawShapeType.Arrow)
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    't,6',
    () => {
      tlstate.selectTool(TLDrawShapeType.Text)
    },
    undefined,
    [tlstate]
  )

  /* ---------------------- Misc ---------------------- */

  // Save

  useHotkeys(
    'ctrl+s,command+s',
    () => {
      tlstate.saveProject()
    },
    undefined,
    [tlstate]
  )

  // Undo Redo

  useHotkeys(
    'command+z,ctrl+z',
    () => {
      tlstate.undo()
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'ctrl+shift-z,command+shift+z',
    () => {
      tlstate.redo()
    },
    undefined,
    [tlstate]
  )

  // Undo Redo

  useHotkeys(
    'command+u,ctrl+u',
    () => {
      tlstate.undoSelect()
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'ctrl+shift-u,command+shift+u',
    () => {
      tlstate.redoSelect()
    },
    undefined,
    [tlstate]
  )

  /* -------------------- Commands -------------------- */

  // Camera

  useHotkeys(
    'ctrl+=,command+=',
    (e) => {
      tlstate.zoomIn()
      e.preventDefault()
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'ctrl+-,command+-',
    (e) => {
      tlstate.zoomOut()
      e.preventDefault()
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'shift+1',
    () => {
      tlstate.zoomToFit()
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'shift+2',
    () => {
      tlstate.zoomToSelection()
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'shift+0',
    () => {
      tlstate.zoomToActual()
    },
    undefined,
    [tlstate]
  )

  // Duplicate

  useHotkeys(
    'ctrl+d,command+d',
    (e) => {
      tlstate.duplicate()
      e.preventDefault()
    },
    undefined,
    [tlstate]
  )

  // Flip

  useHotkeys(
    'shift+h',
    () => {
      tlstate.flipHorizontal()
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'shift+v',
    () => {
      tlstate.flipVertical()
    },
    undefined,
    [tlstate]
  )

  // Cancel

  useHotkeys(
    'escape',
    () => {
      tlstate.cancel()
    },
    undefined,
    [tlstate]
  )

  // Delete

  useHotkeys(
    'backspace',
    () => {
      tlstate.delete()
    },
    undefined,
    [tlstate]
  )

  // Select All

  useHotkeys(
    'command+a,ctrl+a',
    () => {
      tlstate.selectAll()
    },
    undefined,
    [tlstate]
  )

  // Nudge

  useHotkeys(
    'up',
    () => {
      tlstate.nudge([0, -1], false)
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'right',
    () => {
      tlstate.nudge([1, 0], false)
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'down',
    () => {
      tlstate.nudge([0, 1], false)
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'left',
    () => {
      tlstate.nudge([-1, 0], false)
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'shift+up',
    () => {
      tlstate.nudge([0, -1], true)
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'shift+right',
    () => {
      tlstate.nudge([1, 0], true)
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'shift+down',
    () => {
      tlstate.nudge([0, 1], true)
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'shift+left',
    () => {
      tlstate.nudge([-1, 0], true)
    },
    undefined,
    [tlstate]
  )

  // Copy & Paste

  useHotkeys(
    'command+c,ctrl+c',
    () => {
      tlstate.copy()
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'command+v,ctrl+v',
    () => {
      tlstate.paste()
    },
    undefined,
    [tlstate]
  )

  // Group & Ungroup

  useHotkeys(
    'command+g,ctrl+g',
    (e) => {
      tlstate.group()
      e.preventDefault()
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'command+shift+g,ctrl+shift+g',
    (e) => {
      tlstate.ungroup()
      e.preventDefault()
    },
    undefined,
    [tlstate]
  )

  // Move

  useHotkeys(
    '[',
    () => {
      tlstate.moveBackward()
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    ']',
    () => {
      tlstate.moveForward()
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'shift+[',
    () => {
      tlstate.moveToBack()
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'shift+]',
    () => {
      tlstate.moveToFront()
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'command+shift+backspace',
    (e) => {
      tlstate.resetDocument()
      e.preventDefault()
    },
    undefined,
    [tlstate]
  )
}
