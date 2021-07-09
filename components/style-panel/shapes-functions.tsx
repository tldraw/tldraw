import tld from 'utils/tld'
import state, { useSelector } from 'state'
import { IconButton, ButtonsRow, breakpoints } from 'components/shared'
import { memo } from 'react'
import { MoveType, ShapeType } from 'types'
import { Trash2 } from 'react-feather'
import Tooltip from 'components/tooltip'
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

function handleRotateCcw() {
  state.send('ROTATED_CCW')
}

function handleDuplicate() {
  state.send('DUPLICATED')
}

function handleGroup() {
  state.send('GROUPED')
}

function handleUngroup() {
  state.send('UNGROUPED')
}

function handleLock() {
  state.send('TOGGLED_SHAPE_LOCK')
}

function handleAspectLock() {
  state.send('TOGGLED_SHAPE_ASPECT_LOCK')
}

function handleMoveToBack() {
  state.send('MOVED', { type: MoveType.ToBack })
}

function handleMoveBackward() {
  state.send('MOVED', { type: MoveType.Backward })
}

function handleMoveForward() {
  state.send('MOVED', { type: MoveType.Forward })
}

function handleMoveToFront() {
  state.send('MOVED', { type: MoveType.ToFront })
}

function handleDelete() {
  state.send('DELETED')
}

function ShapesFunctions() {
  const isAllLocked = useSelector((s) => {
    const page = tld.getPage(s.data)
    return s.values.selectedIds.every((id) => page.shapes[id].isLocked)
  })

  const isAllAspectLocked = useSelector((s) => {
    const page = tld.getPage(s.data)
    return s.values.selectedIds.every(
      (id) => page.shapes[id].isAspectRatioLocked
    )
  })

  const isAllGrouped = useSelector((s) => {
    const selectedShapes = tld.getSelectedShapes(s.data)
    return selectedShapes.every(
      (shape) =>
        shape.type === ShapeType.Group ||
        (shape.parentId === selectedShapes[0].parentId &&
          selectedShapes[0].parentId !== s.data.currentPageId)
    )
  })

  const hasSelection = useSelector((s) => {
    return tld.getSelectedIds(s.data).length > 0
  })

  const hasMultipleSelection = useSelector((s) => {
    return tld.getSelectedIds(s.data).length > 1
  })

  return (
    <>
      <ButtonsRow>
        <IconButton
          bp={breakpoints}
          disabled={!hasSelection}
          size="small"
          onClick={handleDuplicate}
        >
          <Tooltip label="Duplicate">
            <CopyIcon />
          </Tooltip>
        </IconButton>

        <IconButton
          disabled={!hasSelection}
          size="small"
          onClick={handleRotateCcw}
        >
          <Tooltip label="Rotate">
            <RotateCounterClockwiseIcon />
          </Tooltip>
        </IconButton>

        <IconButton
          bp={breakpoints}
          disabled={!hasSelection}
          size="small"
          onClick={handleLock}
        >
          <Tooltip label="Toogle Locked">
            {isAllLocked ? <LockClosedIcon /> : <LockOpen1Icon opacity={0.4} />}
          </Tooltip>
        </IconButton>

        <IconButton
          bp={breakpoints}
          disabled={!hasSelection}
          size="small"
          onClick={handleAspectLock}
        >
          <Tooltip label="Toogle Aspect Ratio Lock">
            <AspectRatioIcon opacity={isAllAspectLocked ? 1 : 0.4} />
          </Tooltip>
        </IconButton>

        <IconButton
          bp={breakpoints}
          disabled={!isAllGrouped && !hasMultipleSelection}
          size="small"
          onClick={isAllGrouped ? handleUngroup : handleGroup}
        >
          <Tooltip label="Group">
            <GroupIcon opacity={isAllGrouped ? 1 : 0.4} />
          </Tooltip>
        </IconButton>
      </ButtonsRow>
      <ButtonsRow>
        <IconButton
          bp={breakpoints}
          disabled={!hasSelection}
          size="small"
          onClick={handleMoveToBack}
        >
          <Tooltip label="Move to Back">
            <PinBottomIcon />
          </Tooltip>
        </IconButton>

        <IconButton
          bp={breakpoints}
          disabled={!hasSelection}
          size="small"
          onClick={handleMoveBackward}
        >
          <Tooltip label="Move Backward">
            <ArrowDownIcon />
          </Tooltip>
        </IconButton>

        <IconButton
          bp={breakpoints}
          disabled={!hasSelection}
          size="small"
          onClick={handleMoveForward}
        >
          <Tooltip label="Move Forward">
            <ArrowUpIcon />
          </Tooltip>
        </IconButton>

        <IconButton
          bp={breakpoints}
          disabled={!hasSelection}
          size="small"
          onClick={handleMoveToFront}
        >
          <Tooltip label="More to Front">
            <PinTopIcon />
          </Tooltip>
        </IconButton>

        <IconButton
          bp={breakpoints}
          disabled={!hasSelection}
          size="small"
          onClick={handleDelete}
        >
          <Tooltip label="Delete">
            <Trash2 size="15" />
          </Tooltip>
        </IconButton>
      </ButtonsRow>
    </>
  )
}

export default memo(ShapesFunctions)
