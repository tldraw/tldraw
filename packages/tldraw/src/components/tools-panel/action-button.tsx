import * as React from 'react'
import { Tooltip, breakpoints, buttonsRow, iconButton, Trash, divider } from '~components'
import { floatToolButton, floatToolButtonInner } from '~components/tools-panel/styled'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useTLDrawContext } from '~hooks'
import { AlignType, Data, DistributeType, StretchType } from '~types'
import { dropdownContent } from '~components/style-panel/styled'
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
      <DropdownMenu.Trigger
        dir="ltr"
        className={floatToolButton({
          bp: breakpoints,
          name: 'Actions',
          isActive: false,
        })}
      >
        <div
          className={floatToolButtonInner({
            isActive: false,
          })}
        >
          <DotsHorizontalIcon />
        </div>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        sideOffset={8}
        dir="ltr"
        className={dropdownContent({
          direction: 'vertical',
        })}
      >
        <>
          <div className={buttonsRow({ bp: breakpoints })}>
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
          <div className={buttonsRow({ bp: breakpoints })}>
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
          <div className={divider({ bp: breakpoints })} />
          <div className={buttonsRow({ bp: breakpoints })}>
            <button
              className={iconButton({ bp: breakpoints, size: 'small' })}
              disabled={!hasTwoOrMore}
              onClick={alignLeft}
            >
              <AlignLeftIcon />
            </button>
            <button
              className={iconButton({ bp: breakpoints, size: 'small' })}
              disabled={!hasTwoOrMore}
              onClick={alignCenterHorizontal}
            >
              <AlignCenterHorizontallyIcon />
            </button>
            <button
              className={iconButton({ bp: breakpoints, size: 'small' })}
              disabled={!hasTwoOrMore}
              onClick={alignRight}
            >
              <AlignRightIcon />
            </button>
            <button
              className={iconButton({ bp: breakpoints, size: 'small' })}
              disabled={!hasTwoOrMore}
              onClick={stretchHorizontally}
            >
              <StretchHorizontallyIcon />
            </button>
            <button
              className={iconButton({ bp: breakpoints, size: 'small' })}
              disabled={!hasThreeOrMore}
              onClick={distributeHorizontally}
            >
              <SpaceEvenlyHorizontallyIcon />
            </button>
          </div>
          <div className={buttonsRow({ bp: breakpoints })}>
            <button
              className={iconButton({ bp: breakpoints, size: 'small' })}
              disabled={!hasTwoOrMore}
              onClick={alignTop}
            >
              <AlignTopIcon />
            </button>
            <button
              className={iconButton({ bp: breakpoints, size: 'small' })}
              disabled={!hasTwoOrMore}
              onClick={alignCenterVertical}
            >
              <AlignCenterVerticallyIcon />
            </button>
            <button
              className={iconButton({ bp: breakpoints, size: 'small' })}
              disabled={!hasTwoOrMore}
              onClick={alignBottom}
            >
              <AlignBottomIcon />
            </button>
            <button
              className={iconButton({ bp: breakpoints, size: 'small' })}
              disabled={!hasTwoOrMore}
              onClick={stretchVertically}
            >
              <StretchVerticallyIcon />
            </button>
            <button
              className={iconButton({ bp: breakpoints, size: 'small' })}
              disabled={!hasThreeOrMore}
              onClick={distributeVertically}
            >
              <SpaceEvenlyVerticallyIcon />
            </button>
          </div>
        </>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}
