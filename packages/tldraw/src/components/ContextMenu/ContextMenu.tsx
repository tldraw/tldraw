import * as React from 'react'
import { styled } from '~styles'
import * as RadixContextMenu from '@radix-ui/react-context-menu'
import { useTldrawApp } from '~hooks'
import { TDSnapshot, AlignType, DistributeType, StretchType } from '~types'
import {
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
import { Divider } from '~components/Primitives/Divider'
import { MenuContent } from '~components/Primitives/MenuContent'
import { RowButton, RowButtonProps } from '~components/Primitives/RowButton'
import { ToolButton, ToolButtonProps } from '~components/Primitives/ToolButton'

const numberOfSelectedIdsSelector = (s: TDSnapshot) => {
  return s.document.pageStates[s.appState.currentPageId].selectedIds.length
}

const isDebugModeSelector = (s: TDSnapshot) => {
  return s.settings.isDebugMode
}

const hasGroupSelectedSelector = (s: TDSnapshot) => {
  return s.document.pageStates[s.appState.currentPageId].selectedIds.some(
    (id) => s.document.pages[s.appState.currentPageId].shapes[id].children !== undefined
  )
}

const preventDefault = (e: Event) => e.stopPropagation()

interface ContextMenuProps {
  onBlur: React.FocusEventHandler
  children: React.ReactNode
}

export const ContextMenu = ({ onBlur, children }: ContextMenuProps): JSX.Element => {
  const app = useTldrawApp()
  const numberOfSelectedIds = app.useStore(numberOfSelectedIdsSelector)
  const isDebugMode = app.useStore(isDebugModeSelector)
  const hasGroupSelected = app.useStore(hasGroupSelectedSelector)

  const rContent = React.useRef<HTMLDivElement>(null)

  const handleFlipHorizontal = React.useCallback(() => {
    app.flipHorizontal()
  }, [app])

  const handleFlipVertical = React.useCallback(() => {
    app.flipVertical()
  }, [app])

  const handleDuplicate = React.useCallback(() => {
    app.duplicate()
  }, [app])

  const handleLock = React.useCallback(() => {
    app.toggleLocked()
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

  const handleDelete = React.useCallback(() => {
    app.delete()
  }, [app])

  const handleCopyJson = React.useCallback(() => {
    app.copyJson()
  }, [app])

  const handleCopy = React.useCallback(() => {
    app.copy()
  }, [app])

  const handlePaste = React.useCallback(() => {
    app.paste()
  }, [app])

  const handleCopySvg = React.useCallback(() => {
    app.copySvg()
  }, [app])

  const handleUndo = React.useCallback(() => {
    app.undo()
  }, [app])

  const handleRedo = React.useCallback(() => {
    app.redo()
  }, [app])

  const hasSelection = numberOfSelectedIds > 0
  const hasTwoOrMore = numberOfSelectedIds > 1
  const hasThreeOrMore = numberOfSelectedIds > 2

  return (
    <RadixContextMenu.Root dir="ltr">
      <RadixContextMenu.Trigger dir="ltr">{children}</RadixContextMenu.Trigger>
      <RadixContextMenu.Content
        dir="ltr"
        ref={rContent}
        onEscapeKeyDown={preventDefault}
        asChild
        tabIndex={-1}
        onBlur={onBlur}
      >
        <MenuContent>
          {hasSelection ? (
            <>
              <CMRowButton onClick={handleDuplicate} kbd="#D">
                Duplicate
              </CMRowButton>
              <CMRowButton onClick={handleFlipHorizontal} kbd="⇧H">
                Flip Horizontal
              </CMRowButton>
              <CMRowButton onClick={handleFlipVertical} kbd="⇧V">
                Flip Vertical
              </CMRowButton>
              <CMRowButton onClick={handleLock} kbd="#⇧L">
                Lock / Unlock
              </CMRowButton>
              {(hasTwoOrMore || hasGroupSelected) && <Divider />}
              {hasTwoOrMore && (
                <CMRowButton onClick={handleGroup} kbd="#G">
                  Group
                </CMRowButton>
              )}
              {hasGroupSelected && (
                <CMRowButton onClick={handleGroup} kbd="#⇧G">
                  Ungroup
                </CMRowButton>
              )}
              <Divider />
              <ContextMenuSubMenu label="Move">
                <CMRowButton onClick={handleMoveToFront} kbd="⇧]">
                  To Front
                </CMRowButton>
                <CMRowButton onClick={handleMoveForward} kbd="]">
                  Forward
                </CMRowButton>
                <CMRowButton onClick={handleMoveBackward} kbd="[">
                  Backward
                </CMRowButton>
                <CMRowButton onClick={handleMoveToBack} kbd="⇧[">
                  To Back
                </CMRowButton>
              </ContextMenuSubMenu>
              <MoveToPageMenu />
              {hasTwoOrMore && (
                <AlignDistributeSubMenu
                  hasTwoOrMore={hasTwoOrMore}
                  hasThreeOrMore={hasThreeOrMore}
                />
              )}
              <Divider />
              <CMRowButton onClick={handleCopy} kbd="#C">
                Copy
              </CMRowButton>
              <CMRowButton onClick={handleCopySvg} kbd="#⇧C">
                Copy as SVG
              </CMRowButton>
              {isDebugMode && <CMRowButton onClick={handleCopyJson}>Copy as JSON</CMRowButton>}
              <CMRowButton onClick={handlePaste} kbd="#V">
                Paste
              </CMRowButton>
              <Divider />
              <CMRowButton onClick={handleDelete} kbd="⌫">
                Delete
              </CMRowButton>
            </>
          ) : (
            <>
              <CMRowButton onClick={handlePaste} kbd="#V">
                Paste
              </CMRowButton>
              <CMRowButton onClick={handleUndo} kbd="#Z">
                Undo
              </CMRowButton>
              <CMRowButton onClick={handleRedo} kbd="#⇧Z">
                Redo
              </CMRowButton>
            </>
          )}
        </MenuContent>
      </RadixContextMenu.Content>
    </RadixContextMenu.Root>
  )
}

/* ---------- Align and Distribute Sub Menu --------- */

function AlignDistributeSubMenu({
  hasThreeOrMore,
}: {
  hasTwoOrMore: boolean
  hasThreeOrMore: boolean
}) {
  const app = useTldrawApp()

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

  return (
    <RadixContextMenu.Root dir="ltr">
      <CMTriggerButton isSubmenu>Align / Distribute</CMTriggerButton>
      <RadixContextMenu.Content asChild sideOffset={2} alignOffset={-2}>
        <StyledGridContent numberOfSelected={hasThreeOrMore ? 'threeOrMore' : 'twoOrMore'}>
          <CMIconButton onClick={alignLeft}>
            <AlignLeftIcon />
          </CMIconButton>
          <CMIconButton onClick={alignCenterHorizontal}>
            <AlignCenterHorizontallyIcon />
          </CMIconButton>
          <CMIconButton onClick={alignRight}>
            <AlignRightIcon />
          </CMIconButton>
          <CMIconButton onClick={stretchHorizontally}>
            <StretchHorizontallyIcon />
          </CMIconButton>
          {hasThreeOrMore && (
            <CMIconButton onClick={distributeHorizontally}>
              <SpaceEvenlyHorizontallyIcon />
            </CMIconButton>
          )}
          <CMIconButton onClick={alignTop}>
            <AlignTopIcon />
          </CMIconButton>
          <CMIconButton onClick={alignCenterVertical}>
            <AlignCenterVerticallyIcon />
          </CMIconButton>
          <CMIconButton onClick={alignBottom}>
            <AlignBottomIcon />
          </CMIconButton>
          <CMIconButton onClick={stretchVertically}>
            <StretchVerticallyIcon />
          </CMIconButton>
          {hasThreeOrMore && (
            <CMIconButton onClick={distributeVertically}>
              <SpaceEvenlyVerticallyIcon />
            </CMIconButton>
          )}
          <CMArrow offset={13} />
        </StyledGridContent>
      </RadixContextMenu.Content>
    </RadixContextMenu.Root>
  )
}

const StyledGridContent = styled(MenuContent, {
  display: 'grid',
  variants: {
    numberOfSelected: {
      threeOrMore: {
        gridTemplateColumns: 'repeat(5, auto)',
      },
      twoOrMore: {
        gridTemplateColumns: 'repeat(4, auto)',
      },
    },
  },
})

/* -------------- Move to Page Sub Menu ------------- */

const currentPageIdSelector = (s: TDSnapshot) => s.appState.currentPageId
const documentPagesSelector = (s: TDSnapshot) => s.document.pages

function MoveToPageMenu(): JSX.Element | null {
  const app = useTldrawApp()
  const currentPageId = app.useStore(currentPageIdSelector)
  const documentPages = app.useStore(documentPagesSelector)

  const sorted = Object.values(documentPages)
    .sort((a, b) => (a.childIndex || 0) - (b.childIndex || 0))
    .filter((a) => a.id !== currentPageId)

  if (sorted.length === 0) return null

  return (
    <RadixContextMenu.Root dir="ltr">
      <CMTriggerButton isSubmenu>Move To Page</CMTriggerButton>
      <RadixContextMenu.Content dir="ltr" sideOffset={2} alignOffset={-2} asChild>
        <MenuContent>
          {sorted.map(({ id, name }, i) => (
            <CMRowButton
              key={id}
              disabled={id === currentPageId}
              onClick={() => app.moveToPage(id)}
            >
              {name || `Page ${i}`}
            </CMRowButton>
          ))}
          <CMArrow offset={13} />
        </MenuContent>
      </RadixContextMenu.Content>
    </RadixContextMenu.Root>
  )
}

/* --------------------- Submenu -------------------- */

export interface ContextMenuSubMenuProps {
  label: string
  children: React.ReactNode
}

export function ContextMenuSubMenu({ children, label }: ContextMenuSubMenuProps): JSX.Element {
  return (
    <RadixContextMenu.Root dir="ltr">
      <CMTriggerButton isSubmenu>{label}</CMTriggerButton>
      <RadixContextMenu.Content dir="ltr" sideOffset={2} alignOffset={-2} asChild>
        <MenuContent>
          {children}
          <CMArrow offset={13} />
        </MenuContent>
      </RadixContextMenu.Content>
    </RadixContextMenu.Root>
  )
}

/* ---------------------- Arrow --------------------- */

const CMArrow = styled(RadixContextMenu.ContextMenuArrow, {
  fill: '$panel',
})

/* ------------------- IconButton ------------------- */

function CMIconButton({ onSelect, ...rest }: ToolButtonProps): JSX.Element {
  return (
    <RadixContextMenu.ContextMenuItem dir="ltr" onSelect={onSelect} asChild>
      <ToolButton {...rest} />
    </RadixContextMenu.ContextMenuItem>
  )
}

/* -------------------- RowButton ------------------- */

const CMRowButton = ({ ...rest }: RowButtonProps) => {
  return (
    <RadixContextMenu.ContextMenuItem asChild>
      <RowButton {...rest} />
    </RadixContextMenu.ContextMenuItem>
  )
}

/* ----------------- Trigger Button ----------------- */

interface CMTriggerButtonProps extends RowButtonProps {
  isSubmenu?: boolean
}

export const CMTriggerButton = ({ isSubmenu, ...rest }: CMTriggerButtonProps) => {
  return (
    <RadixContextMenu.ContextMenuTriggerItem asChild>
      <RowButton hasArrow={isSubmenu} {...rest} />
    </RadixContextMenu.ContextMenuTriggerItem>
  )
}
