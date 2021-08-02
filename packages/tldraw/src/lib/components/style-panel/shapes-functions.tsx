import * as React from 'react'
import { IconButton, ButtonsRow, breakpoints } from '../shared'
import { Trash } from '../icons'
import { Tooltip } from '../tooltip'
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
import { useTLDrawContext } from '../../hooks'
import { Data } from '../../state2'

const isAllLockedSelector = (s: Data) => {
  const { selectedIds } = s.pageState
  return selectedIds.every((id) => s.page.shapes[id].isLocked)
}

const isAllAspectLockedSelector = (s: Data) => {
  const { selectedIds } = s.pageState
  return selectedIds.every((id) => s.page.shapes[id].isAspectRatioLocked)
}

const isAllGroupedSelector = (s: Data) => {
  const selectedShapes = s.pageState.selectedIds.map((id) => s.page.shapes[id])
  return selectedShapes.every(
    (shape) =>
      shape.children !== undefined ||
      (shape.parentId === selectedShapes[0].parentId &&
        selectedShapes[0].parentId !== s.appState.currentPageId),
  )
}

const hasSelectionSelector = (s: Data) => s.pageState.selectedIds.length > 0

const hasMultipleSelectionSelector = (s: Data) => s.pageState.selectedIds.length > 1

export const ShapesFunctions = React.memo(() => {
  const { tlstate, useAppState } = useTLDrawContext()

  const isAllLocked = useAppState(isAllLockedSelector)
  const isAllAspectLocked = useAppState(isAllAspectLockedSelector)
  const isAllGrouped = useAppState(isAllGroupedSelector)
  const hasSelection = useAppState(hasSelectionSelector)
  const hasMultipleSelection = useAppState(hasMultipleSelectionSelector)

  const handleRotate = React.useCallback(() => {
    tlstate.rotate()
  }, [tlstate])

  return (
    <>
      <ButtonsRow>
        <IconButton
          bp={breakpoints}
          disabled={!hasSelection}
          size="small"
          onClick={tlstate.duplicate}
        >
          <Tooltip label="Duplicate" kbd={`#D`}>
            <CopyIcon />
          </Tooltip>
        </IconButton>

        <IconButton disabled={!hasSelection} size="small" onClick={handleRotate}>
          <Tooltip label="Rotate">
            <RotateCounterClockwiseIcon />
          </Tooltip>
        </IconButton>

        <IconButton
          bp={breakpoints}
          disabled={!hasSelection}
          size="small"
          onClick={tlstate.toggleLocked}
        >
          <Tooltip label="Toogle Locked" kbd={`#L`}>
            {isAllLocked ? <LockClosedIcon /> : <LockOpen1Icon opacity={0.4} />}
          </Tooltip>
        </IconButton>

        <IconButton
          bp={breakpoints}
          disabled={!hasSelection}
          size="small"
          onClick={tlstate.toggleAspectRatioLocked}
        >
          <Tooltip label="Toogle Aspect Ratio Lock">
            <AspectRatioIcon opacity={isAllAspectLocked ? 1 : 0.4} />
          </Tooltip>
        </IconButton>

        <IconButton
          bp={breakpoints}
          disabled={!isAllGrouped && !hasMultipleSelection}
          size="small"
          onClick={tlstate.group}
        >
          <Tooltip label="Group" kbd={`#G`}>
            <GroupIcon opacity={isAllGrouped ? 1 : 0.4} />
          </Tooltip>
        </IconButton>
      </ButtonsRow>
      <ButtonsRow>
        <IconButton
          bp={breakpoints}
          disabled={!hasSelection}
          size="small"
          onClick={tlstate.moveToBack}
        >
          <Tooltip label="Move to Back" kbd={`#⇧[`}>
            <PinBottomIcon />
          </Tooltip>
        </IconButton>

        <IconButton
          bp={breakpoints}
          disabled={!hasSelection}
          size="small"
          onClick={tlstate.moveBackward}
        >
          <Tooltip label="Move Backward" kbd={`#[`}>
            <ArrowDownIcon />
          </Tooltip>
        </IconButton>

        <IconButton
          bp={breakpoints}
          disabled={!hasSelection}
          size="small"
          onClick={tlstate.moveForward}
        >
          <Tooltip label="Move Forward" kbd={`#]`}>
            <ArrowUpIcon />
          </Tooltip>
        </IconButton>

        <IconButton
          bp={breakpoints}
          disabled={!hasSelection}
          size="small"
          onClick={tlstate.moveToFront}
        >
          <Tooltip label="More to Front" kbd={`#⇧]`}>
            <PinTopIcon />
          </Tooltip>
        </IconButton>

        <IconButton bp={breakpoints} disabled={!hasSelection} size="small" onClick={tlstate.delete}>
          <Tooltip label="Delete" kbd="⌫">
            <Trash />
          </Tooltip>
        </IconButton>
      </ButtonsRow>
    </>
  )
})
