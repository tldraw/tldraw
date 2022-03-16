import * as React from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { TDShapeType } from '~types'
import { useTldrawApp } from '~hooks'

export function useKeyboardShortcuts(ref: React.RefObject<HTMLDivElement>) {
  const app = useTldrawApp()

  const canHandleEvent = React.useCallback(
    (ignoreMenus = false) => {
      const elm = ref.current
      if (ignoreMenus && app.isMenuOpen) return true
      return elm && (document.activeElement === elm || elm.contains(document.activeElement))
    },
    [ref]
  )

  /* ---------------------- Tools --------------------- */

  useHotkeys(
    'v,1',
    () => {
      if (!canHandleEvent(true)) return
      app.selectTool('select')
    },
    [app, ref.current]
  )

  useHotkeys(
    'd,p,2',
    () => {
      if (!canHandleEvent(true)) return
      app.selectTool(TDShapeType.Draw)
    },
    undefined,
    [app]
  )

  useHotkeys(
    'e,3',
    () => {
      if (!canHandleEvent(true)) return
      app.selectTool('erase')
    },
    undefined,
    [app]
  )

  useHotkeys(
    'r,4',
    () => {
      if (!canHandleEvent(true)) return
      app.selectTool(TDShapeType.Rectangle)
    },
    undefined,
    [app]
  )

  useHotkeys(
    'o,5',
    () => {
      if (!canHandleEvent(true)) return
      app.selectTool(TDShapeType.Ellipse)
    },
    undefined,
    [app]
  )

  useHotkeys(
    'g,6',
    () => {
      if (!canHandleEvent()) return
      app.selectTool(TDShapeType.Triangle)
    },
    undefined,
    [app]
  )

  useHotkeys(
    'l,7',
    () => {
      if (!canHandleEvent(true)) return
      app.selectTool(TDShapeType.Line)
    },
    undefined,
    [app]
  )

  useHotkeys(
    'a,8',
    () => {
      if (!canHandleEvent(true)) return
      app.selectTool(TDShapeType.Arrow)
    },
    undefined,
    [app]
  )

  /* ---------------------- Misc ---------------------- */

  // Focus Mode

  useHotkeys(
    'ctrl+.,⌘+.',
    () => {
      if (!canHandleEvent(true)) return
      app.toggleFocusMode()
    },
    undefined,
    [app]
  )

  useHotkeys(
    'ctrl+shift+g,⌘+shift+g',
    () => {
      if (!canHandleEvent(true)) return
      app.toggleGrid()
    },
    undefined,
    [app]
  )

  /* -------------------- Commands -------------------- */

  // Duplicate

  useHotkeys(
    'ctrl+d,⌘+d',
    (e) => {
      if (!canHandleEvent()) return

      app.duplicate()
      e.preventDefault()
    },
    undefined,
    [app]
  )

  // Flip

  useHotkeys(
    'shift+h',
    () => {
      if (!canHandleEvent(true)) return
      app.flipHorizontal()
    },
    undefined,
    [app]
  )

  useHotkeys(
    'shift+v',
    () => {
      if (!canHandleEvent(true)) return
      app.flipVertical()
    },
    undefined,
    [app]
  )

  // Cancel

  useHotkeys(
    'escape',
    () => {
      if (!canHandleEvent(true)) return

      app.cancel()
    },
    undefined,
    [app]
  )

  // Delete

  useHotkeys(
    'backspace,del',
    () => {
      if (!canHandleEvent()) return
      app.delete()
    },
    undefined,
    [app]
  )

  // Select All

  useHotkeys(
    '⌘+a,ctrl+a',
    () => {
      if (!canHandleEvent(true)) return
      app.selectAll()
    },
    undefined,
    [app]
  )

  // Nudge

  useHotkeys(
    'up',
    () => {
      if (!canHandleEvent()) return
      app.nudge([0, -1], false)
    },
    undefined,
    [app]
  )

  useHotkeys(
    'right',
    () => {
      if (!canHandleEvent()) return
      app.nudge([1, 0], false)
    },
    undefined,
    [app]
  )

  useHotkeys(
    'down',
    () => {
      if (!canHandleEvent()) return
      app.nudge([0, 1], false)
    },
    undefined,
    [app]
  )

  useHotkeys(
    'left',
    () => {
      if (!canHandleEvent()) return
      app.nudge([-1, 0], false)
    },
    undefined,
    [app]
  )

  useHotkeys(
    'shift+up',
    () => {
      if (!canHandleEvent()) return
      app.nudge([0, -1], true)
    },
    undefined,
    [app]
  )

  useHotkeys(
    'shift+right',
    () => {
      if (!canHandleEvent()) return
      app.nudge([1, 0], true)
    },
    undefined,
    [app]
  )

  useHotkeys(
    'shift+down',
    () => {
      if (!canHandleEvent()) return
      app.nudge([0, 1], true)
    },
    undefined,
    [app]
  )

  useHotkeys(
    'shift+left',
    () => {
      if (!canHandleEvent()) return
      app.nudge([-1, 0], true)
    },
    undefined,
    [app]
  )

  useHotkeys(
    '⌘+shift+l,ctrl+shift+l',
    () => {
      if (!canHandleEvent()) return
      app.toggleLocked()
    },
    undefined,
    [app]
  )

  // Copy, Cut & Paste

  useHotkeys(
    '⌘+c,ctrl+c',
    () => {
      if (!canHandleEvent()) return
      app.copy()
    },
    undefined,
    [app]
  )

  useHotkeys(
    '⌘+shift+c,ctrl+shift+c',
    (e) => {
      if (!canHandleEvent()) return

      app.copySvg()
      e.preventDefault()
    },
    undefined,
    [app]
  )

  useHotkeys(
    '⌘+x,ctrl+x',
    () => {
      if (!canHandleEvent()) return
      app.cut()
    },
    undefined,
    [app]
  )

  useHotkeys(
    '⌘+v,ctrl+v',
    () => {
      if (!canHandleEvent()) return
      app.paste()
    },
    undefined,
    [app]
  )

  // Move

  useHotkeys(
    '[',
    () => {
      if (!canHandleEvent(true)) return
      app.moveBackward()
    },
    undefined,
    [app]
  )

  useHotkeys(
    ']',
    () => {
      if (!canHandleEvent(true)) return
      app.moveForward()
    },
    undefined,
    [app]
  )

  useHotkeys(
    'shift+[',
    () => {
      if (!canHandleEvent(true)) return
      app.moveToBack()
    },
    undefined,
    [app]
  )

  useHotkeys(
    'shift+]',
    () => {
      if (!canHandleEvent(true)) return
      app.moveToFront()
    },
    undefined,
    [app]
  )

  useHotkeys(
    'ctrl+shift+backspace,⌘+shift+backspace',
    (e) => {
      if (!canHandleEvent()) return
      if (app.settings.isDebugMode) {
        app.resetDocument()
      }
      e.preventDefault()
    },
    undefined,
    [app]
  )
}
