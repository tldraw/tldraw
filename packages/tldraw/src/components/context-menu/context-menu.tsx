import * as React from 'react'
import css from '~styles'
import { Utils } from '@tldraw/core'
import * as RadixContextMenu from '@radix-ui/react-context-menu'
import { useTLDrawContext } from '~hooks'
import { Data, AlignType, DistributeType, StretchType } from '~types'
import {
  kbd,
  iconWrapper,
  breakpoints,
  rowButton,
  ContextMenuArrow,
  ContextMenuDivider,
  ContextMenuButton,
  ContextMenuSubMenu,
  ContextMenuIconButton,
  ContextMenuRoot,
  menuContent,
} from '../shared'
import {
  ChevronRightIcon,
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

interface ContextMenuProps {
  children: React.ReactNode
}

export const ContextMenu = React.memo(({ children }: ContextMenuProps): JSX.Element => {
  const { tlstate, useSelector } = useTLDrawContext()
  const hasSelection = useSelector(has1SelectedIdsSelector)
  const hasTwoOrMore = useSelector(has2SelectedIdsSelector)
  const hasThreeOrMore = useSelector(has3SelectedIdsSelector)
  const isDebugMode = useSelector(isDebugModeSelector)
  const hasGroupSelected = useSelector(hasGroupSelectedSelector)

  const rContent = React.useRef<HTMLDivElement>(null)

  const handleFlipHorizontal = React.useCallback(() => {
    tlstate.flipHorizontal()
  }, [tlstate])

  const handleFlipVertical = React.useCallback(() => {
    tlstate.flipVertical()
  }, [tlstate])

  const handleDuplicate = React.useCallback(() => {
    tlstate.duplicate()
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

  const handleCopyJson = React.useCallback(() => {
    tlstate.copyJson()
  }, [tlstate])

  const handleCopy = React.useCallback(() => {
    tlstate.copy()
  }, [tlstate])

  const handlePaste = React.useCallback(() => {
    tlstate.paste()
  }, [tlstate])

  const handleCopySvg = React.useCallback(() => {
    tlstate.copySvg()
  }, [tlstate])

  const handleUndo = React.useCallback(() => {
    tlstate.undo()
  }, [tlstate])

  const handleRedo = React.useCallback(() => {
    tlstate.redo()
  }, [tlstate])

  return (
    <ContextMenuRoot>
      <RadixContextMenu.Trigger>{children}</RadixContextMenu.Trigger>
      <RadixContextMenu.Content className={menuContent()} ref={rContent}>
        {hasSelection ? (
          <>
            <ContextMenuButton onSelect={handleFlipHorizontal}>
              <span>Flip Horizontal</span>
              <kbd className={kbd({ variant: 'menu' })}>⇧H</kbd>
            </ContextMenuButton>
            <ContextMenuButton onSelect={handleFlipVertical}>
              <span>Flip Vertical</span>
              <kbd className={kbd({ variant: 'menu' })}>⇧V</kbd>
            </ContextMenuButton>
            <ContextMenuButton onSelect={handleDuplicate}>
              <span>Duplicate</span>
              <kbd className={kbd({ variant: 'menu' })}>#D</kbd>
            </ContextMenuButton>
            <ContextMenuDivider />
            {hasGroupSelected ||
              (hasTwoOrMore && (
                <>
                  {hasGroupSelected && (
                    <ContextMenuButton onSelect={handleGroup}>
                      <span>Ungroup</span>
                      <kbd className={kbd({ variant: 'menu' })}>#⇧G</kbd>
                    </ContextMenuButton>
                  )}
                  {hasTwoOrMore && (
                    <ContextMenuButton onSelect={handleGroup}>
                      <span>Group</span>
                      <kbd className={kbd({ variant: 'menu' })}>#G</kbd>
                    </ContextMenuButton>
                  )}
                </>
              ))}
            <ContextMenuSubMenu label="Move">
              <ContextMenuButton onSelect={handleMoveToFront}>
                <span>To Front</span>
                <kbd className={kbd({ variant: 'menu' })}>#⇧]</kbd>
              </ContextMenuButton>
              <ContextMenuButton onSelect={handleMoveForward}>
                <span>Forward</span>
                <kbd className={kbd({ variant: 'menu' })}>#]</kbd>
              </ContextMenuButton>
              <ContextMenuButton onSelect={handleMoveBackward}>
                <span>Backward</span>
                <kbd className={kbd({ variant: 'menu' })}>#[</kbd>
              </ContextMenuButton>
              <ContextMenuButton onSelect={handleMoveToBack}>
                <span>To Back</span>
                <kbd className={kbd({ variant: 'menu' })}>#⇧[</kbd>
              </ContextMenuButton>
            </ContextMenuSubMenu>
            <MoveToPageMenu />
            {hasTwoOrMore && (
              <AlignDistributeSubMenu hasTwoOrMore={hasTwoOrMore} hasThreeOrMore={hasThreeOrMore} />
            )}
            <ContextMenuDivider />
            <ContextMenuButton onSelect={handleCopy}>
              <span>Copy</span>
              <kbd className={kbd({ variant: 'menu' })}>#C</kbd>
            </ContextMenuButton>
            <ContextMenuButton onSelect={handleCopySvg}>
              <span>Copy to SVG</span>
              <kbd className={kbd({ variant: 'menu' })}>⇧#C</kbd>
            </ContextMenuButton>
            {isDebugMode && (
              <ContextMenuButton onSelect={handleCopyJson}>
                <span>Copy to JSON</span>
              </ContextMenuButton>
            )}
            <ContextMenuButton onSelect={handlePaste}>
              <span>Paste</span>
              <kbd className={kbd({ variant: 'menu' })}>#V</kbd>
            </ContextMenuButton>
            <ContextMenuDivider />
            <ContextMenuButton onSelect={handleDelete}>
              <span>Delete</span>
              <kbd className={kbd({ variant: 'menu' })}>⌫</kbd>
            </ContextMenuButton>
          </>
        ) : (
          <>
            <ContextMenuButton onSelect={handlePaste}>
              <span>Paste</span>
              <kbd className={kbd({ variant: 'menu' })}>#V</kbd>
            </ContextMenuButton>
            <ContextMenuButton onSelect={handleUndo}>
              <span>Undo</span>
              <kbd className={kbd({ variant: 'menu' })}>#Z</kbd>
            </ContextMenuButton>
            <ContextMenuButton onSelect={handleRedo}>
              <span>Redo</span>
              <kbd className={kbd({ variant: 'menu' })}>#⇧Z</kbd>
            </ContextMenuButton>
          </>
        )}
      </RadixContextMenu.Content>
    </ContextMenuRoot>
  )
})

function AlignDistributeSubMenu({
  hasThreeOrMore,
}: {
  hasTwoOrMore: boolean
  hasThreeOrMore: boolean
}) {
  const { tlstate } = useTLDrawContext()

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

  return (
    <ContextMenuRoot>
      <RadixContextMenu.TriggerItem className={rowButton({ bp: breakpoints })}>
        <span>Align / Distribute</span>
        <div className={iconWrapper({ size: 'small' })}>
          <ChevronRightIcon />
        </div>
      </RadixContextMenu.TriggerItem>
      <RadixContextMenu.Content
        className={styledGrid({ selectedStyle: hasThreeOrMore ? 'threeOrMore' : 'twoOrMore' })}
        sideOffset={2}
        alignOffset={-2}
      >
        <ContextMenuIconButton onSelect={alignLeft}>
          <AlignLeftIcon />
        </ContextMenuIconButton>
        <ContextMenuIconButton onSelect={alignCenterHorizontal}>
          <AlignCenterHorizontallyIcon />
        </ContextMenuIconButton>
        <ContextMenuIconButton onSelect={alignRight}>
          <AlignRightIcon />
        </ContextMenuIconButton>
        <ContextMenuIconButton onSelect={stretchHorizontally}>
          <StretchHorizontallyIcon />
        </ContextMenuIconButton>
        {hasThreeOrMore && (
          <ContextMenuIconButton onSelect={distributeHorizontally}>
            <SpaceEvenlyHorizontallyIcon />
          </ContextMenuIconButton>
        )}

        <ContextMenuIconButton onSelect={alignTop}>
          <AlignTopIcon />
        </ContextMenuIconButton>
        <ContextMenuIconButton onSelect={alignCenterVertical}>
          <AlignCenterVerticallyIcon />
        </ContextMenuIconButton>
        <ContextMenuIconButton onSelect={alignBottom}>
          <AlignBottomIcon />
        </ContextMenuIconButton>
        <ContextMenuIconButton onSelect={stretchVertically}>
          <StretchVerticallyIcon />
        </ContextMenuIconButton>
        {hasThreeOrMore && (
          <ContextMenuIconButton onSelect={distributeVertically}>
            <SpaceEvenlyVerticallyIcon />
          </ContextMenuIconButton>
        )}
        <ContextMenuArrow offset={13} />
      </RadixContextMenu.Content>
    </ContextMenuRoot>
  )
}

const styledGrid = css(menuContent, {
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

const currentPageIdSelector = (s: Data) => s.appState.currentPageId
const documentPagesSelector = (s: Data) => s.document.pages

function MoveToPageMenu(): JSX.Element | null {
  const { tlstate, useSelector } = useTLDrawContext()
  const currentPageId = useSelector(currentPageIdSelector)
  const documentPages = useSelector(documentPagesSelector)

  const sorted = Object.values(documentPages)
    .sort((a, b) => (a.childIndex || 0) - (b.childIndex || 0))
    .filter((a) => a.id !== currentPageId)

  if (sorted.length === 0) return null

  return (
    <ContextMenuRoot>
      <RadixContextMenu.TriggerItem className={rowButton({ bp: breakpoints })}>
        <span>Move To Page</span>
        <div className={iconWrapper({ size: 'small' })}>
          <ChevronRightIcon />
        </div>
      </RadixContextMenu.TriggerItem>
      <RadixContextMenu.Content className={menuContent()} sideOffset={2} alignOffset={-2}>
        {sorted.map(({ id, name }, i) => (
          <ContextMenuButton
            key={id}
            disabled={id === currentPageId}
            onSelect={() => tlstate.moveToPage(id)}
          >
            <span>{name || `Page ${i}`}</span>
          </ContextMenuButton>
        ))}
        <ContextMenuArrow offset={13} />
      </RadixContextMenu.Content>
    </ContextMenuRoot>
  )
}
