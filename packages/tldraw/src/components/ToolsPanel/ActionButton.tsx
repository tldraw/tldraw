import * as React from 'react'
import { Tooltip } from '~components/Tooltip/Tooltip'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useTLDrawContext } from '~hooks'
import { styled } from '~styles'
import { AlignType, Data, DistributeType, StretchType } from '~types'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  AspectRatioIcon,
  CopyIcon,
  DotsHorizontalIcon,
  GroupIcon,
  LockClosedIcon,
  LockOpen1Icon,
  PinBottomIcon,
  PinTopIcon,
  RotateCounterClockwiseIcon,
  AlignBottomIcon,
  AlignCenterHorizontallyIcon,
  AlignCenterVerticallyIcon,
  AlignLeftIcon,
  AlignRightIcon,
  AlignTopIcon,
  SpaceEvenlyHorizontallyIcon,
  SpaceEvenlyVerticallyIcon,
  StretchHorizontallyIcon,
  StretchVerticallyIcon,
} from '@radix-ui/react-icons'
import { DMContent } from '~components/DropdownMenu'
import { Divider } from '~components/Divider'
import { TrashIcon } from '~components/icons'
import { IconButton } from '~components/IconButton'
import { ToolButton } from '~components/ToolButton'

const selectedShapesCountSelector = (s: Data) =>
  s.document.pageStates[s.appState.currentPageId].selectedIds.length

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

const hasSelectionClickor = (s: Data) => {
  const { selectedIds } = s.document.pageStates[s.appState.currentPageId]
  return selectedIds.length > 0
}

const hasMultipleSelectionClickor = (s: Data) => {
  const { selectedIds } = s.document.pageStates[s.appState.currentPageId]
  return selectedIds.length > 1
}

export function ActionButton(): JSX.Element {
  const { state, useSelector } = useTLDrawContext()

  const isAllLocked = useSelector(isAllLockedSelector)

  const isAllAspectLocked = useSelector(isAllAspectLockedSelector)

  const isAllGrouped = useSelector(isAllGroupedSelector)

  const hasSelection = useSelector(hasSelectionClickor)

  const hasMultipleSelection = useSelector(hasMultipleSelectionClickor)

  const handleRotate = React.useCallback(() => {
    state.rotate()
  }, [state])

  const handleDuplicate = React.useCallback(() => {
    state.duplicate()
  }, [state])

  const handleToggleLocked = React.useCallback(() => {
    state.toggleLocked()
  }, [state])

  const handleToggleAspectRatio = React.useCallback(() => {
    state.toggleAspectRatioLocked()
  }, [state])

  const handleGroup = React.useCallback(() => {
    state.group()
  }, [state])

  const handleMoveToBack = React.useCallback(() => {
    state.moveToBack()
  }, [state])

  const handleMoveBackward = React.useCallback(() => {
    state.moveBackward()
  }, [state])

  const handleMoveForward = React.useCallback(() => {
    state.moveForward()
  }, [state])

  const handleMoveToFront = React.useCallback(() => {
    state.moveToFront()
  }, [state])

  const handleDelete = React.useCallback(() => {
    state.delete()
  }, [state])

  const alignTop = React.useCallback(() => {
    state.align(AlignType.Top)
  }, [state])

  const alignCenterVertical = React.useCallback(() => {
    state.align(AlignType.CenterVertical)
  }, [state])

  const alignBottom = React.useCallback(() => {
    state.align(AlignType.Bottom)
  }, [state])

  const stretchVertically = React.useCallback(() => {
    state.stretch(StretchType.Vertical)
  }, [state])

  const distributeVertically = React.useCallback(() => {
    state.distribute(DistributeType.Vertical)
  }, [state])

  const alignLeft = React.useCallback(() => {
    state.align(AlignType.Left)
  }, [state])

  const alignCenterHorizontal = React.useCallback(() => {
    state.align(AlignType.CenterHorizontal)
  }, [state])

  const alignRight = React.useCallback(() => {
    state.align(AlignType.Right)
  }, [state])

  const stretchHorizontally = React.useCallback(() => {
    state.stretch(StretchType.Horizontal)
  }, [state])

  const distributeHorizontally = React.useCallback(() => {
    state.distribute(DistributeType.Horizontal)
  }, [state])

  const selectedShapesCount = useSelector(selectedShapesCountSelector)

  const hasTwoOrMore = selectedShapesCount > 1
  const hasThreeOrMore = selectedShapesCount > 2

  return (
    <DropdownMenu.Root dir="ltr">
      <DropdownMenu.Trigger dir="ltr" asChild>
        <ToolButton variant="circle">
          <DotsHorizontalIcon />
        </ToolButton>
      </DropdownMenu.Trigger>
      <DMContent>
        <>
          <ButtonsRow>
            <IconButton disabled={!hasSelection} onClick={handleDuplicate}>
              <Tooltip label="Duplicate" kbd={`#D`}>
                <CopyIcon />
              </Tooltip>
            </IconButton>
            <IconButton disabled={!hasSelection} onClick={handleRotate}>
              <Tooltip label="Rotate">
                <RotateCounterClockwiseIcon />
              </Tooltip>
            </IconButton>
            <IconButton disabled={!hasSelection} onClick={handleToggleLocked}>
              <Tooltip label="Toogle Locked" kbd={`#L`}>
                {isAllLocked ? <LockClosedIcon /> : <LockOpen1Icon opacity={0.4} />}
              </Tooltip>
            </IconButton>
            <IconButton disabled={!hasSelection} onClick={handleToggleAspectRatio}>
              <Tooltip label="Toogle Aspect Ratio Lock">
                <AspectRatioIcon opacity={isAllAspectLocked ? 1 : 0.4} />
              </Tooltip>
            </IconButton>
            <IconButton disabled={!isAllGrouped && !hasMultipleSelection} onClick={handleGroup}>
              <Tooltip label="Group" kbd={`#G`}>
                <GroupIcon opacity={isAllGrouped ? 1 : 0.4} />
              </Tooltip>
            </IconButton>
          </ButtonsRow>
          <ButtonsRow>
            <IconButton disabled={!hasSelection} onClick={handleMoveToBack}>
              <Tooltip label="Move to Back" kbd={`#⇧[`}>
                <PinBottomIcon />
              </Tooltip>
            </IconButton>

            <IconButton disabled={!hasSelection} onClick={handleMoveBackward}>
              <Tooltip label="Move Backward" kbd={`#[`}>
                <ArrowDownIcon />
              </Tooltip>
            </IconButton>
            <IconButton disabled={!hasSelection} onClick={handleMoveForward}>
              <Tooltip label="Move Forward" kbd={`#]`}>
                <ArrowUpIcon />
              </Tooltip>
            </IconButton>
            <IconButton disabled={!hasSelection} onClick={handleMoveToFront}>
              <Tooltip label="More to Front" kbd={`#⇧]`}>
                <PinTopIcon />
              </Tooltip>
            </IconButton>
            <IconButton disabled={!hasSelection} onClick={handleDelete}>
              <Tooltip label="Delete" kbd="⌫">
                <TrashIcon />
              </Tooltip>
            </IconButton>
          </ButtonsRow>
          <Divider />
          <ButtonsRow>
            <IconButton disabled={!hasTwoOrMore} onClick={alignLeft}>
              <AlignLeftIcon />
            </IconButton>
            <IconButton disabled={!hasTwoOrMore} onClick={alignCenterHorizontal}>
              <AlignCenterHorizontallyIcon />
            </IconButton>
            <IconButton disabled={!hasTwoOrMore} onClick={alignRight}>
              <AlignRightIcon />
            </IconButton>
            <IconButton disabled={!hasTwoOrMore} onClick={stretchHorizontally}>
              <StretchHorizontallyIcon />
            </IconButton>
            <IconButton disabled={!hasThreeOrMore} onClick={distributeHorizontally}>
              <SpaceEvenlyHorizontallyIcon />
            </IconButton>
          </ButtonsRow>
          <ButtonsRow>
            <IconButton disabled={!hasTwoOrMore} onClick={alignTop}>
              <AlignTopIcon />
            </IconButton>
            <IconButton disabled={!hasTwoOrMore} onClick={alignCenterVertical}>
              <AlignCenterVerticallyIcon />
            </IconButton>
            <IconButton disabled={!hasTwoOrMore} onClick={alignBottom}>
              <AlignBottomIcon />
            </IconButton>
            <IconButton disabled={!hasTwoOrMore} onClick={stretchVertically}>
              <StretchVerticallyIcon />
            </IconButton>
            <IconButton disabled={!hasThreeOrMore} onClick={distributeVertically}>
              <SpaceEvenlyVerticallyIcon />
            </IconButton>
          </ButtonsRow>
        </>
      </DMContent>
    </DropdownMenu.Root>
  )
}

export const ButtonsRow = styled('div', {
  position: 'relative',
  display: 'flex',
  width: '100%',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  outline: 'none',
  alignItems: 'center',
  justifyContent: 'flex-start',
  padding: 0,
})
