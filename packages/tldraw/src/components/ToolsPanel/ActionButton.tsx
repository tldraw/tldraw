import * as React from 'react'
import { Tooltip } from '~components/Tooltip/Tooltip'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useTLDrawContext } from '~hooks'
import styled from '~styles'
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

const hasSelectionSelector = (s: Data) => {
  const { selectedIds } = s.document.pageStates[s.appState.currentPageId]
  return selectedIds.length > 0
}

const hasMultipleSelectionSelector = (s: Data) => {
  const { selectedIds } = s.document.pageStates[s.appState.currentPageId]
  return selectedIds.length > 1
}

export function ActionButton(): JSX.Element {
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

  const alignTop = React.useCallback(() => {
    tlstate.align(AlignType.Top)
  }, [tlstate])

  const alignCenterVertical = React.useCallback(() => {
    tlstate.align(AlignType.CenterVertical)
  }, [tlstate])

  const alignBottom = React.useCallback(() => {
    tlstate.align(AlignType.Bottom)
  }, [tlstate])

  const stretchVertically = React.useCallback(() => {
    tlstate.stretch(StretchType.Vertical)
  }, [tlstate])

  const distributeVertically = React.useCallback(() => {
    tlstate.distribute(DistributeType.Vertical)
  }, [tlstate])

  const alignLeft = React.useCallback(() => {
    tlstate.align(AlignType.Left)
  }, [tlstate])

  const alignCenterHorizontal = React.useCallback(() => {
    tlstate.align(AlignType.CenterHorizontal)
  }, [tlstate])

  const alignRight = React.useCallback(() => {
    tlstate.align(AlignType.Right)
  }, [tlstate])

  const stretchHorizontally = React.useCallback(() => {
    tlstate.stretch(StretchType.Horizontal)
  }, [tlstate])

  const distributeHorizontally = React.useCallback(() => {
    tlstate.distribute(DistributeType.Horizontal)
  }, [tlstate])

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
            <IconButton disabled={!hasSelection} onSelect={handleDuplicate}>
              <Tooltip label="Duplicate" kbd={`#D`}>
                <CopyIcon />
              </Tooltip>
            </IconButton>
            <IconButton disabled={!hasSelection} onSelect={handleRotate}>
              <Tooltip label="Rotate">
                <RotateCounterClockwiseIcon />
              </Tooltip>
            </IconButton>
            <IconButton disabled={!hasSelection} onSelect={handleToggleLocked}>
              <Tooltip label="Toogle Locked" kbd={`#L`}>
                {isAllLocked ? <LockClosedIcon /> : <LockOpen1Icon opacity={0.4} />}
              </Tooltip>
            </IconButton>
            <IconButton disabled={!hasSelection} onSelect={handleToggleAspectRatio}>
              <Tooltip label="Toogle Aspect Ratio Lock">
                <AspectRatioIcon opacity={isAllAspectLocked ? 1 : 0.4} />
              </Tooltip>
            </IconButton>
            <IconButton disabled={!isAllGrouped && !hasMultipleSelection} onSelect={handleGroup}>
              <Tooltip label="Group" kbd={`#G`}>
                <GroupIcon opacity={isAllGrouped ? 1 : 0.4} />
              </Tooltip>
            </IconButton>
          </ButtonsRow>
          <ButtonsRow>
            <IconButton disabled={!hasSelection} onSelect={handleMoveToBack}>
              <Tooltip label="Move to Back" kbd={`#⇧[`}>
                <PinBottomIcon />
              </Tooltip>
            </IconButton>

            <IconButton disabled={!hasSelection} onSelect={handleMoveBackward}>
              <Tooltip label="Move Backward" kbd={`#[`}>
                <ArrowDownIcon />
              </Tooltip>
            </IconButton>
            <IconButton disabled={!hasSelection} onSelect={handleMoveForward}>
              <Tooltip label="Move Forward" kbd={`#]`}>
                <ArrowUpIcon />
              </Tooltip>
            </IconButton>
            <IconButton disabled={!hasSelection} onSelect={handleMoveToFront}>
              <Tooltip label="More to Front" kbd={`#⇧]`}>
                <PinTopIcon />
              </Tooltip>
            </IconButton>
            <IconButton disabled={!hasSelection} onSelect={handleDelete}>
              <Tooltip label="Delete" kbd="⌫">
                <TrashIcon />
              </Tooltip>
            </IconButton>
          </ButtonsRow>
          <Divider />
          <ButtonsRow>
            <IconButton disabled={!hasTwoOrMore} onSelect={alignLeft}>
              <AlignLeftIcon />
            </IconButton>
            <IconButton disabled={!hasTwoOrMore} onSelect={alignCenterHorizontal}>
              <AlignCenterHorizontallyIcon />
            </IconButton>
            <IconButton disabled={!hasTwoOrMore} onSelect={alignRight}>
              <AlignRightIcon />
            </IconButton>
            <IconButton disabled={!hasTwoOrMore} onSelect={stretchHorizontally}>
              <StretchHorizontallyIcon />
            </IconButton>
            <IconButton disabled={!hasThreeOrMore} onSelect={distributeHorizontally}>
              <SpaceEvenlyHorizontallyIcon />
            </IconButton>
          </ButtonsRow>
          <ButtonsRow>
            <IconButton disabled={!hasTwoOrMore} onSelect={alignTop}>
              <AlignTopIcon />
            </IconButton>
            <IconButton disabled={!hasTwoOrMore} onSelect={alignCenterVertical}>
              <AlignCenterVerticallyIcon />
            </IconButton>
            <IconButton disabled={!hasTwoOrMore} onSelect={alignBottom}>
              <AlignBottomIcon />
            </IconButton>
            <IconButton disabled={!hasTwoOrMore} onSelect={stretchVertically}>
              <StretchVerticallyIcon />
            </IconButton>
            <IconButton disabled={!hasThreeOrMore} onSelect={distributeVertically}>
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
