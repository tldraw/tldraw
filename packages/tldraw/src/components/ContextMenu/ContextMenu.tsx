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
import { CMRowButton } from './CMRowButton'
import { CMIconButton } from './CMIconButton'
import { CMTriggerButton } from './CMTriggerButton'
import { Divider } from '~components/Divider'
import { MenuContent } from '~components/MenuContent'

const has1SelectedIdsSelector = (s: TDSnapshot) => {
  return s.document.pageStates[s.appState.currentPageId].selectedIds.length > 0
}
const has2SelectedIdsSelector = (s: TDSnapshot) => {
  return s.document.pageStates[s.appState.currentPageId].selectedIds.length > 1
}
const has3SelectedIdsSelector = (s: TDSnapshot) => {
  return s.document.pageStates[s.appState.currentPageId].selectedIds.length > 2
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
  const hasSelection = app.useStore(has1SelectedIdsSelector)
  const hasTwoOrMore = app.useStore(has2SelectedIdsSelector)
  const hasThreeOrMore = app.useStore(has3SelectedIdsSelector)
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

  return (
    <RadixContextMenu.Root>
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
              <CMRowButton onSelect={handleDuplicate} kbd="#D">
                Duplicate
              </CMRowButton>
              <CMRowButton onSelect={handleFlipHorizontal} kbd="⇧H">
                Flip Horizontal
              </CMRowButton>
              <CMRowButton onSelect={handleFlipVertical} kbd="⇧V">
                Flip Vertical
              </CMRowButton>
              <CMRowButton onSelect={handleLock} kbd="#⇧L">
                Lock / Unlock
              </CMRowButton>
              {(hasTwoOrMore || hasGroupSelected) && <Divider />}
              {hasTwoOrMore && (
                <CMRowButton onSelect={handleGroup} kbd="#G">
                  Group
                </CMRowButton>
              )}
              {hasGroupSelected && (
                <CMRowButton onSelect={handleGroup} kbd="#⇧G">
                  Ungroup
                </CMRowButton>
              )}
              <Divider />
              <ContextMenuSubMenu label="Move">
                <CMRowButton onSelect={handleMoveToFront} kbd="⇧]">
                  To Front
                </CMRowButton>
                <CMRowButton onSelect={handleMoveForward} kbd="]">
                  Forward
                </CMRowButton>
                <CMRowButton onSelect={handleMoveBackward} kbd="[">
                  Backward
                </CMRowButton>
                <CMRowButton onSelect={handleMoveToBack} kbd="⇧[">
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
              <CMRowButton onSelect={handleCopy} kbd="#C">
                Copy
              </CMRowButton>
              <CMRowButton onSelect={handleCopySvg} kbd="⇧#C">
                Copy as SVG
              </CMRowButton>
              {isDebugMode && <CMRowButton onSelect={handleCopyJson}>Copy as JSON</CMRowButton>}
              <CMRowButton onSelect={handlePaste} kbd="#V">
                Paste
              </CMRowButton>
              <Divider />
              <CMRowButton onSelect={handleDelete} kbd="⌫">
                Delete
              </CMRowButton>
            </>
          ) : (
            <>
              <CMRowButton onSelect={handlePaste} kbd="#V">
                Paste
              </CMRowButton>
              <CMRowButton onSelect={handleUndo} kbd="#Z">
                Undo
              </CMRowButton>
              <CMRowButton onSelect={handleRedo} kbd="#⇧Z">
                Redo
              </CMRowButton>
            </>
          )}
        </MenuContent>
      </RadixContextMenu.Content>
    </RadixContextMenu.Root>
  )
}

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
    <RadixContextMenu.Root>
      <CMTriggerButton isSubmenu>Align / Distribute</CMTriggerButton>
      <RadixContextMenu.Content asChild sideOffset={2} alignOffset={-2}>
        <StyledGridContent selectedStyle={hasThreeOrMore ? 'threeOrMore' : 'twoOrMore'}>
          <CMIconButton onSelect={alignLeft}>
            <AlignLeftIcon />
          </CMIconButton>
          <CMIconButton onSelect={alignCenterHorizontal}>
            <AlignCenterHorizontallyIcon />
          </CMIconButton>
          <CMIconButton onSelect={alignRight}>
            <AlignRightIcon />
          </CMIconButton>
          <CMIconButton onSelect={stretchHorizontally}>
            <StretchHorizontallyIcon />
          </CMIconButton>
          {hasThreeOrMore && (
            <CMIconButton onSelect={distributeHorizontally}>
              <SpaceEvenlyHorizontallyIcon />
            </CMIconButton>
          )}
          <CMIconButton onSelect={alignTop}>
            <AlignTopIcon />
          </CMIconButton>
          <CMIconButton onSelect={alignCenterVertical}>
            <AlignCenterVerticallyIcon />
          </CMIconButton>
          <CMIconButton onSelect={alignBottom}>
            <AlignBottomIcon />
          </CMIconButton>
          <CMIconButton onSelect={stretchVertically}>
            <StretchVerticallyIcon />
          </CMIconButton>
          {hasThreeOrMore && (
            <CMIconButton onSelect={distributeVertically}>
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
    selectedStyle: {
      threeOrMore: {
        gridTemplateColumns: 'repeat(5, auto)',
      },
      twoOrMore: {
        gridTemplateColumns: 'repeat(4, auto)',
      },
    },
  },
})

/* ------------------ Move to Page ------------------ */

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
              onSelect={() => app.moveToPage(id)}
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
