import * as React from 'react'
import { Tooltip } from '~components/Primitives/Tooltip/Tooltip'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useTldrawApp } from '~hooks'
import { styled } from '~styles'
import { AlignType, TDSnapshot, DistributeType, StretchType } from '~types'
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
  BoxIcon,
  AngleIcon,
} from '@radix-ui/react-icons'
import { DMContent } from '~components/Primitives/DropdownMenu'
import { Divider } from '~components/Primitives/Divider'
import { ToolButton } from '~components/Primitives/ToolButton'

const selectedShapesCountSelector = (s: TDSnapshot) =>
  s.document.pageStates[s.appState.currentPageId].selectedIds.length

const isAllLockedSelector = (s: TDSnapshot) => {
  const page = s.document.pages[s.appState.currentPageId]
  const { selectedIds } = s.document.pageStates[s.appState.currentPageId]
  return selectedIds.every((id) => page.shapes[id].isLocked)
}

const isAllAspectLockedSelector = (s: TDSnapshot) => {
  const page = s.document.pages[s.appState.currentPageId]
  const { selectedIds } = s.document.pageStates[s.appState.currentPageId]
  return selectedIds.every((id) => page.shapes[id].isAspectRatioLocked)
}

const isAllGroupedSelector = (s: TDSnapshot) => {
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

const hasSelectionSelector = (s: TDSnapshot) => {
  const { selectedIds } = s.document.pageStates[s.appState.currentPageId]
  return selectedIds.length > 0
}

const hasMultipleSelectionSelector = (s: TDSnapshot) => {
  const { selectedIds } = s.document.pageStates[s.appState.currentPageId]
  return selectedIds.length > 1
}

export function ActionButton(): JSX.Element {
  const app = useTldrawApp()

  const isAllLocked = app.useStore(isAllLockedSelector)

  const isAllAspectLocked = app.useStore(isAllAspectLockedSelector)

  const isAllGrouped = app.useStore(isAllGroupedSelector)

  const hasSelection = app.useStore(hasSelectionSelector)

  const hasMultipleSelection = app.useStore(hasMultipleSelectionSelector)

  const selectedShapesCount = app.useStore(selectedShapesCountSelector)

  const hasTwoOrMore = selectedShapesCount > 1

  const hasThreeOrMore = selectedShapesCount > 2

  const handleRotate = React.useCallback(() => {
    app.rotate()
  }, [app])

  const handleDuplicate = React.useCallback(() => {
    app.duplicate()
  }, [app])

  const handleToggleLocked = React.useCallback(() => {
    app.toggleLocked()
  }, [app])

  const handleToggleAspectRatio = React.useCallback(() => {
    app.toggleAspectRatioLocked()
  }, [app])

  const handleGroup = React.useCallback(() => {
    app.group()
  }, [app])

  const handleMoveToBack = React.useCallback(() => {
    app.moveToBack()
  }, [app])

  const handleMoveBackward = React.useCallback(() => {
    app.moveBackward()
  }, [app])

  const handleMoveForward = React.useCallback(() => {
    app.moveForward()
  }, [app])

  const handleMoveToFront = React.useCallback(() => {
    app.moveToFront()
  }, [app])

  const handleResetAngle = React.useCallback(() => {
    app.setShapeProps({ rotation: 0 })
  }, [app])

  const alignTop = React.useCallback(() => {
    app.align(AlignType.Top)
  }, [app])

  const alignCenterVertical = React.useCallback(() => {
    app.align(AlignType.CenterVertical)
  }, [app])

  const alignBottom = React.useCallback(() => {
    app.align(AlignType.Bottom)
  }, [app])

  const stretchVertically = React.useCallback(() => {
    app.stretch(StretchType.Vertical)
  }, [app])

  const distributeVertically = React.useCallback(() => {
    app.distribute(DistributeType.Vertical)
  }, [app])

  const alignLeft = React.useCallback(() => {
    app.align(AlignType.Left)
  }, [app])

  const alignCenterHorizontal = React.useCallback(() => {
    app.align(AlignType.CenterHorizontal)
  }, [app])

  const alignRight = React.useCallback(() => {
    app.align(AlignType.Right)
  }, [app])

  const stretchHorizontally = React.useCallback(() => {
    app.stretch(StretchType.Horizontal)
  }, [app])

  const distributeHorizontally = React.useCallback(() => {
    app.distribute(DistributeType.Horizontal)
  }, [app])

  const handleMenuOpenChange = React.useCallback(
    (open: boolean) => {
      app.setMenuOpen(open)
    },
    [app]
  )

  return (
    <DropdownMenu.Root dir="ltr" onOpenChange={handleMenuOpenChange}>
      <DropdownMenu.Trigger dir="ltr" asChild id="TD-Tools-Dots">
        <ToolButton variant="circle">
          <DotsHorizontalIcon />
        </ToolButton>
      </DropdownMenu.Trigger>
      <DMContent sideOffset={16}>
        <>
          <ButtonsRow>
            <ToolButton variant="icon" disabled={!hasSelection} onClick={handleDuplicate}>
              <Tooltip label="Duplicate" kbd={`#D`} id="TD-Tools-Copy">
                <CopyIcon />
              </Tooltip>
            </ToolButton>
            <ToolButton disabled={!hasSelection} onClick={handleRotate}>
              <Tooltip label="Rotate" id="TD-Tools-Rotate">
                <RotateCounterClockwiseIcon />
              </Tooltip>
            </ToolButton>
            <ToolButton disabled={!hasSelection} onClick={handleToggleLocked}>
              <Tooltip label="Toggle Locked" kbd={`#L`} id="TD-Tools-Lock">
                {isAllLocked ? <LockClosedIcon /> : <LockOpen1Icon />}
              </Tooltip>
            </ToolButton>
            <ToolButton disabled={!hasSelection} onClick={handleToggleAspectRatio}>
              <Tooltip label="Toggle Aspect Ratio Lock" id="TD-Tools-AspectRatio">
                {isAllAspectLocked ? <AspectRatioIcon /> : <BoxIcon />}
              </Tooltip>
            </ToolButton>
            <ToolButton
              disabled={!hasSelection || (!isAllGrouped && !hasMultipleSelection)}
              onClick={handleGroup}
            >
              <Tooltip label="Group" kbd={`#G`} id="TD-Tools-Group">
                <GroupIcon />
              </Tooltip>
            </ToolButton>
          </ButtonsRow>
          <ButtonsRow>
            <ToolButton disabled={!hasSelection} onClick={handleMoveToBack}>
              <Tooltip label="Move to Back" kbd={`#⇧[`} id="TD-Tools-PinBottom">
                <PinBottomIcon />
              </Tooltip>
            </ToolButton>
            <ToolButton disabled={!hasSelection} onClick={handleMoveBackward}>
              <Tooltip label="Move Backward" kbd={`#[`} id="TD-Tools-ArrowDown">
                <ArrowDownIcon />
              </Tooltip>
            </ToolButton>
            <ToolButton disabled={!hasSelection} onClick={handleMoveForward}>
              <Tooltip label="Move Forward" kbd={`#]`} id="TD-Tools-ArrowUp">
                <ArrowUpIcon />
              </Tooltip>
            </ToolButton>
            <ToolButton disabled={!hasSelection} onClick={handleMoveToFront}>
              <Tooltip label="Move to Front" kbd={`#⇧]`} id="TD-Tools-PinTop">
                <PinTopIcon />
              </Tooltip>
            </ToolButton>
            <ToolButton disabled={!hasSelection} onClick={handleResetAngle}>
              <Tooltip label="Reset Angle" id="TD-Tools-ResetAngle">
                <AngleIcon />
              </Tooltip>
            </ToolButton>
          </ButtonsRow>
          <Divider />
          <ButtonsRow>
            <ToolButton disabled={!hasTwoOrMore} onClick={alignLeft} id="TD-Tools-AlignLeft">
              <AlignLeftIcon />
            </ToolButton>
            <ToolButton
              disabled={!hasTwoOrMore}
              onClick={alignCenterHorizontal}
              id="TD-Tools-AlignCenterHorizontal"
            >
              <AlignCenterHorizontallyIcon />
            </ToolButton>
            <ToolButton disabled={!hasTwoOrMore} onClick={alignRight} id="TD-Tools-AlignRight">
              <AlignRightIcon />
            </ToolButton>
            <ToolButton
              disabled={!hasTwoOrMore}
              onClick={stretchHorizontally}
              id="TD-Tools-StretchHorizontal"
            >
              <StretchHorizontallyIcon />
            </ToolButton>
            <ToolButton
              disabled={!hasThreeOrMore}
              onClick={distributeHorizontally}
              id="TD-Tools-SpaceEvenlyHorizontal"
            >
              <SpaceEvenlyHorizontallyIcon />
            </ToolButton>
          </ButtonsRow>
          <ButtonsRow>
            <ToolButton disabled={!hasTwoOrMore} onClick={alignTop} id="TD-Tools-AlignTop">
              <AlignTopIcon />
            </ToolButton>
            <ToolButton
              disabled={!hasTwoOrMore}
              onClick={alignCenterVertical}
              id="TD-Tools-AlignCenterVertical"
            >
              <AlignCenterVerticallyIcon />
            </ToolButton>
            <ToolButton disabled={!hasTwoOrMore} onClick={alignBottom} id="TD-Tools-AlignBottom">
              <AlignBottomIcon />
            </ToolButton>
            <ToolButton
              disabled={!hasTwoOrMore}
              onClick={stretchVertically}
              id="TD-Tools-tretchVertical"
            >
              <StretchVerticallyIcon />
            </ToolButton>
            <ToolButton
              disabled={!hasThreeOrMore}
              onClick={distributeVertically}
              id="TD-Tools-SpaceEvenlyVertical"
            >
              <SpaceEvenlyVerticallyIcon />
            </ToolButton>
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
