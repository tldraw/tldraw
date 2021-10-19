import * as React from 'react'
import { iconButton, buttonsRow, breakpoints } from '../shared'
import { Trash } from '../icons'
import { Tooltip } from '../shared/tooltip'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  AspectRatioIcon,
  CopyIcon,
  GroupIcon,
  LockClosedIcon,
  LockOpen1Icon,
  PinBottomIcon,
  PinTopIcon,
  RotateCounterClockwiseIcon,
} from '@radix-ui/react-icons'
import { useTLDrawContext } from '~hooks'
import type { Data } from '~types'

const isAllLockedSelector = (s: Data) => {
  const page = s.document.pages[s.appState.currentPageId]
  const { selectedIds } = s.document.pageStates[s.appState.currentPageId]
  return selectedIds.every((id) => page.shapes[id].isLocked)
}

const isAllAspectLockedSelector = (s: Data) => {
  const page = s.document.pages[s.appState.currentPageId]
  const { selectedIds } = s.document.pageStates[s.appState.currentPageId]
  return selectedIds.every((id) => page.shapes[id].isAspectRatioLocked)
}

const isAllGroupedSelector = (s: Data) => {
  const page = s.document.pages[s.appState.currentPageId]
  const selectedShapes = s.document.pageStates[s.appState.currentPageId].selectedIds.map(
    (id) => page.shapes[id]
  )

  return selectedShapes.every(
    (shape) =>
      shape.children !== undefined ||
      (shape.parentId === selectedShapes[0].parentId &&
        selectedShapes[0].parentId !== s.appState.currentPageId)
  )
}

const hasSelectionSelector = (s: Data) => {
  const { selectedIds } = s.document.pageStates[s.appState.currentPageId]
  return selectedIds.length > 0
}

const hasMultipleSelectionSelector = (s: Data) => {
  const { selectedIds } = s.document.pageStates[s.appState.currentPageId]
  return selectedIds.length > 1
}

export const ShapesFunctions = React.memo(() => {
  const { tlstate, useSelector } = useTLDrawContext()

  const isAllLocked = useSelector(isAllLockedSelector)

  const isAllAspectLocked = useSelector(isAllAspectLockedSelector)

  const isAllGrouped = useSelector(isAllGroupedSelector)

  const hasSelection = useSelector(hasSelectionSelector)

  const hasMultipleSelection = useSelector(hasMultipleSelectionSelector)

  const handleRotate = React.useCallback(() => {
    tlstate.rotate()
  }, [tlstate])

  const handleDuplicate = React.useCallback(() => {
    tlstate.duplicate()
  }, [tlstate])

  const handleToggleLocked = React.useCallback(() => {
    tlstate.toggleLocked()
  }, [tlstate])

  const handleToggleAspectRatio = React.useCallback(() => {
    tlstate.toggleAspectRatioLocked()
  }, [tlstate])

  const handleGroup = React.useCallback(() => {
    tlstate.group()
  }, [tlstate])

  const handleMoveToBack = React.useCallback(() => {
    tlstate.moveToBack()
  }, [tlstate])

  const handleMoveBackward = React.useCallback(() => {
    tlstate.moveBackward()
  }, [tlstate])

  const handleMoveForward = React.useCallback(() => {
    tlstate.moveForward()
  }, [tlstate])

  const handleMoveToFront = React.useCallback(() => {
    tlstate.moveToFront()
  }, [tlstate])

  const handleDelete = React.useCallback(() => {
    tlstate.delete()
  }, [tlstate])

  return (
    <>
      <div className={buttonsRow()}>
        <button
          className={iconButton({ bp: breakpoints, size: 'small' })}
          disabled={!hasSelection}
          onClick={handleDuplicate}
        >
          <Tooltip label="Duplicate" kbd={`#D`}>
            <CopyIcon />
          </Tooltip>
        </button>

        <button
          className={iconButton({ size: 'small' })}
          disabled={!hasSelection}
          onClick={handleRotate}
        >
          <Tooltip label="Rotate">
            <RotateCounterClockwiseIcon />
          </Tooltip>
        </button>

        <button
          className={iconButton({ bp: breakpoints, size: 'small' })}
          disabled={!hasSelection}
          onClick={handleToggleLocked}
        >
          <Tooltip label="Toogle Locked" kbd={`#L`}>
            {isAllLocked ? <LockClosedIcon /> : <LockOpen1Icon opacity={0.4} />}
          </Tooltip>
        </button>

        <button
          className={iconButton({ bp: breakpoints, size: 'small' })}
          disabled={!hasSelection}
          onClick={handleToggleAspectRatio}
        >
          <Tooltip label="Toogle Aspect Ratio Lock">
            <AspectRatioIcon opacity={isAllAspectLocked ? 1 : 0.4} />
          </Tooltip>
        </button>

        <button
          className={iconButton({ bp: breakpoints, size: 'small' })}
          disabled={!isAllGrouped && !hasMultipleSelection}
          onClick={handleGroup}
        >
          <Tooltip label="Group" kbd={`#G`}>
            <GroupIcon opacity={isAllGrouped ? 1 : 0.4} />
          </Tooltip>
        </button>
      </div>
      <div className={buttonsRow()}>
        <button
          className={iconButton({ bp: breakpoints, size: 'small' })}
          disabled={!hasSelection}
          onClick={handleMoveToBack}
        >
          <Tooltip label="Move to Back" kbd={`#⇧[`}>
            <PinBottomIcon />
          </Tooltip>
        </button>

        <button
          className={iconButton({ bp: breakpoints, size: 'small' })}
          disabled={!hasSelection}
          onClick={handleMoveBackward}
        >
          <Tooltip label="Move Backward" kbd={`#[`}>
            <ArrowDownIcon />
          </Tooltip>
        </button>

        <button
          className={iconButton({ bp: breakpoints, size: 'small' })}
          disabled={!hasSelection}
          onClick={handleMoveForward}
        >
          <Tooltip label="Move Forward" kbd={`#]`}>
            <ArrowUpIcon />
          </Tooltip>
        </button>

        <button
          className={iconButton({ bp: breakpoints, size: 'small' })}
          disabled={!hasSelection}
          onClick={handleMoveToFront}
        >
          <Tooltip label="More to Front" kbd={`#⇧]`}>
            <PinTopIcon />
          </Tooltip>
        </button>

        <button
          className={iconButton({ bp: breakpoints, size: 'small' })}
          disabled={!hasSelection}
          onClick={handleDelete}
        >
          <Tooltip label="Delete" kbd="⌫">
            <Trash />
          </Tooltip>
        </button>
      </div>
    </>
  )
})
