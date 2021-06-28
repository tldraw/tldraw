import { IconButton, breakpoints } from 'components/shared'
import { memo } from 'react'
import styled from 'styles'
import { MoveType } from 'types'
import { Trash2 } from 'react-feather'
import state, { useSelector } from 'state'
import Tooltip from 'components/tooltip'

import {
  ArrowDownIcon,
  ArrowUpIcon,
  AspectRatioIcon,
  BoxIcon,
  CopyIcon,
  EyeClosedIcon,
  EyeOpenIcon,
  LockClosedIcon,
  LockOpen1Icon,
  PinBottomIcon,
  PinTopIcon,
  RotateCounterClockwiseIcon,
} from '@radix-ui/react-icons'
import { getPage, getSelectedIds } from 'utils'

function handleRotateCcw() {
  state.send('ROTATED_CCW')
}

function handleDuplicate() {
  state.send('DUPLICATED')
}

function handleHide() {
  state.send('TOGGLED_SHAPE_HIDE')
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
    const page = getPage(s.data)
    return s.values.selectedIds.every((id) => page.shapes[id].isLocked)
  })

  const isAllAspectLocked = useSelector((s) => {
    const page = getPage(s.data)
    return s.values.selectedIds.every(
      (id) => page.shapes[id].isAspectRatioLocked
    )
  })

  const isAllHidden = useSelector((s) => {
    const page = getPage(s.data)
    return s.values.selectedIds.every((id) => page.shapes[id].isHidden)
  })

  const hasSelection = useSelector((s) => {
    return getSelectedIds(s.data).size > 0
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
          onClick={handleHide}
        >
          <Tooltip label="Toogle Hidden">
            {isAllHidden ? <EyeClosedIcon /> : <EyeOpenIcon />}
          </Tooltip>
        </IconButton>

        <IconButton
          bp={breakpoints}
          disabled={!hasSelection}
          size="small"
          onClick={handleLock}
        >
          <Tooltip label="Toogle Locked">
            {isAllLocked ? <LockClosedIcon /> : <LockOpen1Icon />}
          </Tooltip>
        </IconButton>

        <IconButton
          bp={breakpoints}
          disabled={!hasSelection}
          size="small"
          onClick={handleAspectLock}
        >
          <Tooltip label="Toogle Aspect Ratio Lock">
            {isAllAspectLocked ? <AspectRatioIcon /> : <BoxIcon />}
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

const ButtonsRow = styled('div', {
  position: 'relative',
  display: 'flex',
  width: '100%',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  outline: 'none',
  alignItems: 'center',
  justifyContent: 'flex-start',
  padding: 4,
})
