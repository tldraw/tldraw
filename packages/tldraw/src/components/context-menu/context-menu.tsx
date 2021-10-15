import * as React from 'react'
import css from '~styles'
import * as RadixContextMenu from '@radix-ui/react-context-menu'
import { useTLDrawContext } from '~hooks'
import { Data, AlignType, DistributeType, StretchType } from '~types'
import {
  Kbd,
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
      <RadixContextMenu.Trigger dir="ltr">{children}</RadixContextMenu.Trigger>
      <RadixContextMenu.Content dir="ltr" className={menuContent()} ref={rContent}>
        {hasSelection ? (
          <>
            <ContextMenuButton onSelect={handleFlipHorizontal}>
              <span>Flip Horizontal</span>
              <Kbd variant="menu">⇧H</Kbd>
            </ContextMenuButton>
            <ContextMenuButton onSelect={handleFlipVertical}>
              <span>Flip Vertical</span>
              <Kbd variant="menu">⇧V</Kbd>
            </ContextMenuButton>
            <ContextMenuButton onSelect={handleDuplicate}>
              <span>Duplicate</span>
              <Kbd variant="menu">#D</Kbd>
            </ContextMenuButton>
            <ContextMenuDivider />
            {hasGroupSelected ||
              (hasTwoOrMore && (
                <>
                  {hasGroupSelected && (
                    <ContextMenuButton onSelect={handleGroup}>
                      <span>Ungroup</span>
                      <Kbd variant="menu">#⇧G</Kbd>
                    </ContextMenuButton>
                  )}
                  {hasTwoOrMore && (
                    <ContextMenuButton onSelect={handleGroup}>
                      <span>Group</span>
                      <Kbd variant="menu">#G</Kbd>
                    </ContextMenuButton>
                  )}
                </>
              ))}
            <ContextMenuSubMenu label="Move">
              <ContextMenuButton onSelect={handleMoveToFront}>
                <span>To Front</span>
                <Kbd variant="menu">#⇧]</Kbd>
              </ContextMenuButton>
              <ContextMenuButton onSelect={handleMoveForward}>
                <span>Forward</span>
                <Kbd variant="menu">#]</Kbd>
              </ContextMenuButton>
              <ContextMenuButton onSelect={handleMoveBackward}>
                <span>Backward</span>
                <Kbd variant="menu">#[</Kbd>
              </ContextMenuButton>
              <ContextMenuButton onSelect={handleMoveToBack}>
                <span>To Back</span>
                <Kbd variant="menu">#⇧[</Kbd>
              </ContextMenuButton>
            </ContextMenuSubMenu>
            <MoveToPageMenu />
            {hasTwoOrMore && (
              <AlignDistributeSubMenu hasTwoOrMore={hasTwoOrMore} hasThreeOrMore={hasThreeOrMore} />
            )}
            <ContextMenuDivider />
            <ContextMenuButton onSelect={handleCopy}>
              <span>Copy</span>
              <Kbd variant="menu">#C</Kbd>
            </ContextMenuButton>
            <ContextMenuButton onSelect={handleCopySvg}>
              <span>Copy to SVG</span>
              <Kbd variant="menu">⇧#C</Kbd>
            </ContextMenuButton>
            {isDebugMode && (
              <ContextMenuButton onSelect={handleCopyJson}>
                <span>Copy to JSON</span>
              </ContextMenuButton>
            )}
            <ContextMenuButton onSelect={handlePaste}>
              <span>Paste</span>
              <Kbd variant="menu">#V</Kbd>
            </ContextMenuButton>
            <ContextMenuDivider />
            <ContextMenuButton onSelect={handleDelete}>
              <span>Delete</span>
              <Kbd variant="menu">⌫</Kbd>
            </ContextMenuButton>
          </>
        ) : (
          <>
            <ContextMenuButton onSelect={handlePaste}>
              <span>Paste</span>
              <Kbd variant="menu">#V</Kbd>
            </ContextMenuButton>
            <ContextMenuButton onSelect={handleUndo}>
              <span>Undo</span>
              <Kbd variant="menu">#Z</Kbd>
            </ContextMenuButton>
            <ContextMenuButton onSelect={handleRedo}>
              <span>Redo</span>
              <Kbd variant="menu">#⇧Z</Kbd>
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
        className={grid({ selectedStyle: hasThreeOrMore ? 'threeOrMore' : 'twoOrMore' })}
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

const grid = css(menuContent, {
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
