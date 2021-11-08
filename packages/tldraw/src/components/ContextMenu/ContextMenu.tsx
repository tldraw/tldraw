import * as React from 'react'
import { styled } from '~styles'
import * as RadixContextMenu from '@radix-ui/react-context-menu'
import { useTLDrawContext } from '~hooks'
import { Data, AlignType, DistributeType, StretchType } from '~types'
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

const has1SelectedIdsSelector = (s: Data) => {
  return s.document.pageStates[s.appState.currentPageId].selectedIds.length > 0
}
const has2SelectedIdsSelector = (s: Data) => {
  return s.document.pageStates[s.appState.currentPageId].selectedIds.length > 1
}
const has3SelectedIdsSelector = (s: Data) => {
  return s.document.pageStates[s.appState.currentPageId].selectedIds.length > 2
}

const isDebugModeSelector = (s: Data) => {
  return s.settings.isDebugMode
}

const hasGroupSelectedSelector = (s: Data) => {
  return s.document.pageStates[s.appState.currentPageId].selectedIds.some(
    (id) => s.document.pages[s.appState.currentPageId].shapes[id].children !== undefined
  )
}

const preventDefault = (e: Event) => e.stopPropagation()

interface ContextMenuProps {
  children: React.ReactNode
}

export const ContextMenu = ({ children }: ContextMenuProps): JSX.Element => {
  const { state, useSelector } = useTLDrawContext()
  const hasSelection = useSelector(has1SelectedIdsSelector)
  const hasTwoOrMore = useSelector(has2SelectedIdsSelector)
  const hasThreeOrMore = useSelector(has3SelectedIdsSelector)
  const isDebugMode = useSelector(isDebugModeSelector)
  const hasGroupSelected = useSelector(hasGroupSelectedSelector)

  const rContent = React.useRef<HTMLDivElement>(null)

  const handleFlipHorizontal = React.useCallback(() => {
    state.flipHorizontal()
  }, [state])

  const handleFlipVertical = React.useCallback(() => {
    state.flipVertical()
  }, [state])

  const handleDuplicate = React.useCallback(() => {
    state.duplicate()
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

  const handleCopyJson = React.useCallback(() => {
    state.copyJson()
  }, [state])

  const handleCopy = React.useCallback(() => {
    state.copy()
  }, [state])

  const handlePaste = React.useCallback(() => {
    state.paste()
  }, [state])

  const handleCopySvg = React.useCallback(() => {
    state.copySvg()
  }, [state])

  const handleUndo = React.useCallback(() => {
    state.undo()
  }, [state])

  const handleRedo = React.useCallback(() => {
    state.redo()
  }, [state])

  return (
    <RadixContextMenu.Root>
      <RadixContextMenu.Trigger dir="ltr">{children}</RadixContextMenu.Trigger>
      <RadixContextMenu.Content dir="ltr" ref={rContent} onEscapeKeyDown={preventDefault} asChild>
        <MenuContent>
          {hasSelection ? (
            <>
              <CMRowButton onSelect={handleFlipHorizontal} kbd="⇧H">
                Flip Horizontal
              </CMRowButton>
              <CMRowButton onSelect={handleFlipVertical} kbd="⇧V">
                Flip Vertical
              </CMRowButton>
              <CMRowButton onSelect={handleDuplicate} kbd="#D">
                Duplicate
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
  const { state } = useTLDrawContext()

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

const currentPageIdSelector = (s: Data) => s.appState.currentPageId
const documentPagesSelector = (s: Data) => s.document.pages

function MoveToPageMenu(): JSX.Element | null {
  const { state, useSelector } = useTLDrawContext()
  const currentPageId = useSelector(currentPageIdSelector)
  const documentPages = useSelector(documentPagesSelector)

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
              onSelect={() => state.moveToPage(id)}
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
