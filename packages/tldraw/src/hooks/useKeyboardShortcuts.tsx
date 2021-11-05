import * as React from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { TLDrawShapeType } from '~types'
import { useFileSystem, useTLDrawContext } from '~hooks'

export function useKeyboardShortcuts(ref: React.RefObject<HTMLDivElement>) {
  const { tlstate } = useTLDrawContext()

  const canHandleEvent = React.useCallback(() => {
    const elm = ref.current
    return elm && (document.activeElement === elm || elm.contains(document.activeElement))
  }, [ref])

  /* ---------------------- Tools --------------------- */

  useHotkeys(
    'v,1',
    () => {
      if (canHandleEvent()) tlstate.selectTool('select')
    },
    [tlstate, ref.current]
  )

  useHotkeys(
    'd,2',
    () => {
      if (canHandleEvent()) tlstate.selectTool(TLDrawShapeType.Draw)
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'r,3',
    () => {
      if (canHandleEvent()) tlstate.selectTool(TLDrawShapeType.Rectangle)
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'e,4',
    () => {
      if (canHandleEvent()) tlstate.selectTool(TLDrawShapeType.Ellipse)
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'a,5',
    () => {
      if (canHandleEvent()) tlstate.selectTool(TLDrawShapeType.Arrow)
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    't,6',
    () => {
      if (canHandleEvent()) tlstate.selectTool(TLDrawShapeType.Text)
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'n,7',
    () => {
      if (canHandleEvent()) tlstate.selectTool(TLDrawShapeType.Sticky)
    },
    undefined,
    [tlstate]
  )

  /* ---------------------- Misc ---------------------- */

  // Dark Mode

  useHotkeys(
    'ctrl+shift+d,command+shift+d',
    (e) => {
      if (canHandleEvent()) {
        tlstate.toggleDarkMode()
        e.preventDefault()
      }
    },
    undefined,
    [tlstate]
  )

  // Focus Mode

  useHotkeys(
    'ctrl+.,command+.',
    () => {
      if (canHandleEvent()) tlstate.toggleFocusMode()
    },
    undefined,
    [tlstate]
  )

  // File System

  const { onNewProject, onOpenProject, onSaveProject, onSaveProjectAs } = useFileSystem()

  useHotkeys(
    'ctrl+n,command+n',
    (e) => {
      if (canHandleEvent()) {
        e.preventDefault()
        onNewProject()
      }
    },
    undefined,
    [tlstate]
  )
  useHotkeys(
    'ctrl+s,command+s',
    (e) => {
      if (canHandleEvent()) {
        e.preventDefault()
        onSaveProject()
      }
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'ctrl+shift+s,command+shift+s',
    (e) => {
      if (canHandleEvent()) {
        e.preventDefault()
        onSaveProjectAs()
      }
    },
    undefined,
    [tlstate]
  )
  useHotkeys(
    'ctrl+o,command+o',
    (e) => {
      if (canHandleEvent()) {
        e.preventDefault()
        onOpenProject()
      }
    },
    undefined,
    [tlstate]
  )

  // Undo Redo

  useHotkeys(
    'command+z,ctrl+z',
    () => {
      if (canHandleEvent()) {
        if (tlstate.session) {
          tlstate.cancelSession()
        } else {
          tlstate.undo()
        }
      }
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'ctrl+shift-z,command+shift+z',
    () => {
      if (canHandleEvent()) {
        if (tlstate.session) {
          tlstate.cancelSession()
        } else {
          tlstate.redo()
        }
      }
    },
    undefined,
    [tlstate]
  )

  // Undo Redo

  useHotkeys(
    'command+u,ctrl+u',
    () => {
      if (canHandleEvent()) tlstate.undoSelect()
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'ctrl+shift-u,command+shift+u',
    () => {
      if (canHandleEvent()) tlstate.redoSelect()
    },
    undefined,
    [tlstate]
  )

  /* -------------------- Commands -------------------- */

  // Camera

  useHotkeys(
    'ctrl+=,command+=',
    (e) => {
      if (canHandleEvent()) {
        tlstate.zoomIn()
        e.preventDefault()
      }
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'ctrl+-,command+-',
    (e) => {
      if (canHandleEvent()) {
        tlstate.zoomOut()
        e.preventDefault()
      }
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'shift+1',
    () => {
      if (canHandleEvent()) tlstate.zoomToFit()
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'shift+2',
    () => {
      if (canHandleEvent()) tlstate.zoomToSelection()
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'shift+0',
    () => {
      if (canHandleEvent()) tlstate.zoomToActual()
    },
    undefined,
    [tlstate]
  )

  // Duplicate

  useHotkeys(
    'ctrl+d,command+d',
    (e) => {
      if (canHandleEvent()) {
        tlstate.duplicate()
        e.preventDefault()
      }
    },
    undefined,
    [tlstate]
  )

  // Flip

  useHotkeys(
    'shift+h',
    () => {
      if (canHandleEvent()) tlstate.flipHorizontal()
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'shift+v',
    () => {
      if (canHandleEvent()) tlstate.flipVertical()
    },
    undefined,
    [tlstate]
  )

  // Cancel

  useHotkeys(
    'escape',
    () => {
      if (canHandleEvent()) {
        tlstate.cancel()
      }
    },
    undefined,
    [tlstate]
  )

  // Delete

  useHotkeys(
    'backspace',
    () => {
      if (canHandleEvent()) tlstate.delete()
    },
    undefined,
    [tlstate]
  )

  // Select All

  useHotkeys(
    'command+a,ctrl+a',
    () => {
      if (canHandleEvent()) tlstate.selectAll()
    },
    undefined,
    [tlstate]
  )

  // Nudge

  useHotkeys(
    'up',
    () => {
      if (canHandleEvent()) tlstate.nudge([0, -1], false)
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'right',
    () => {
      if (canHandleEvent()) tlstate.nudge([1, 0], false)
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'down',
    () => {
      if (canHandleEvent()) tlstate.nudge([0, 1], false)
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'left',
    () => {
      if (canHandleEvent()) tlstate.nudge([-1, 0], false)
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'shift+up',
    () => {
      if (canHandleEvent()) tlstate.nudge([0, -1], true)
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'shift+right',
    () => {
      if (canHandleEvent()) tlstate.nudge([1, 0], true)
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'shift+down',
    () => {
      if (canHandleEvent()) tlstate.nudge([0, 1], true)
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'shift+left',
    () => {
      if (canHandleEvent()) tlstate.nudge([-1, 0], true)
    },
    undefined,
    [tlstate]
  )

  // Copy & Paste

  useHotkeys(
    'command+c,ctrl+c',
    () => {
      if (canHandleEvent()) tlstate.copy()
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'command+v,ctrl+v',
    () => {
      if (canHandleEvent()) tlstate.paste()
    },
    undefined,
    [tlstate]
  )

  // Group & Ungroup

  useHotkeys(
    'command+g,ctrl+g',
    (e) => {
      if (canHandleEvent()) {
        tlstate.group()
        e.preventDefault()
      }
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'command+shift+g,ctrl+shift+g',
    (e) => {
      if (canHandleEvent()) {
        tlstate.ungroup()
        e.preventDefault()
      }
    },
    undefined,
    [tlstate]
  )

  // Move

  useHotkeys(
    '[',
    () => {
      if (canHandleEvent()) tlstate.moveBackward()
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    ']',
    () => {
      if (canHandleEvent()) tlstate.moveForward()
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'shift+[',
    () => {
      if (canHandleEvent()) tlstate.moveToBack()
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'shift+]',
    () => {
      if (canHandleEvent()) tlstate.moveToFront()
    },
    undefined,
    [tlstate]
  )

  useHotkeys(
    'command+shift+backspace',
    (e) => {
      if (canHandleEvent()) {
        if (process.env.NODE_ENV === 'development') {
          tlstate.resetDocument()
        }
        e.preventDefault()
      }
    },
    undefined,
    [tlstate]
  )
}
