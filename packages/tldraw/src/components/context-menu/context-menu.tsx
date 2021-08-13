import * as React from 'react'
import { Utils } from '@tldraw/core'
import * as RadixContextMenu from '@radix-ui/react-context-menu'
import styled from '~styles'
import { useTLDrawContext } from '~hooks'
import type { Data } from '~types'
import { Kbd } from '../kbd'
import {
  IconWrapper,
  breakpoints,
  RowButton,
  ContextMenuArrow,
  ContextMenuDivider,
  ContextMenuButton,
  ContextMenuSubMenu,
  ContextMenuIconButton,
  ContextMenuRoot,
  MenuContent,
} from '../shared'
import { AlignType, DistributeType, StretchType } from '~types'
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
  return s.pageState.selectedIds.length > 0
}
const has2SelectedIdsSelector = (s: Data) => {
  return s.pageState.selectedIds.length > 1
}
const has3SelectedIdsSelector = (s: Data) => {
  return s.pageState.selectedIds.length > 2
}

const isDebugModeSelector = (s: Data) => {
  return s.settings.isDebugMode
}

const hasGroupSelectedSelector = (s: Data) => {
  return s.pageState.selectedIds.some((id) => s.page.shapes[id].children !== undefined)
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

  const handleCopyAsJson = React.useCallback(() => {
    tlstate.copyAsJson()
  }, [tlstate])

  const handleCopyAsSvg = React.useCallback(() => {
    tlstate.copyAsSvg()
  }, [tlstate])

  const handleUndo = React.useCallback(() => {
    tlstate.undo()
  }, [tlstate])

  const handleRedo = React.useCallback(() => {
    tlstate.redo()
  }, [tlstate])

  if (Utils.isMobile()) {
    return <>{children}</>
  }

  return (
    <ContextMenuRoot>
      <RadixContextMenu.Trigger>{children}</RadixContextMenu.Trigger>
      <MenuContent as={RadixContextMenu.Content} ref={rContent}>
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
                <Kbd variant="menu"># ⇧ ]</Kbd>
              </ContextMenuButton>
              <ContextMenuButton onSelect={handleMoveForward}>
                <span>Forward</span>
                <Kbd variant="menu"># ]</Kbd>
              </ContextMenuButton>
              <ContextMenuButton onSelect={handleMoveBackward}>
                <span>Backward</span>
                <Kbd variant="menu"># [</Kbd>
              </ContextMenuButton>
              <ContextMenuButton onSelect={handleMoveToBack}>
                <span>To Back</span>
                <Kbd variant="menu"># ⇧ [</Kbd>
              </ContextMenuButton>
            </ContextMenuSubMenu>
            {hasTwoOrMore && (
              <AlignDistributeSubMenu hasTwoOrMore={hasTwoOrMore} hasThreeOrMore={hasThreeOrMore} />
            )}
            {/* <MoveToPageMenu /> */}
            {isDebugMode && (
              <ContextMenuButton onSelect={handleCopyAsJson}>
                <span>Copy Data</span>
                <Kbd variant="menu"># ⇧ C</Kbd>
              </ContextMenuButton>
            )}
            <ContextMenuButton onSelect={handleCopyAsSvg}>
              <span>Copy to SVG</span>
              <Kbd variant="menu"># ⇧ C</Kbd>
            </ContextMenuButton>
            <ContextMenuDivider />
            <ContextMenuButton onSelect={handleDelete}>
              <span>Delete</span>
              <Kbd variant="menu">⌫</Kbd>
            </ContextMenuButton>
          </>
        ) : (
          <>
            <ContextMenuButton onSelect={handleUndo}>
              <span>Undo</span>
              <Kbd variant="menu"># Z</Kbd>
            </ContextMenuButton>
            <ContextMenuButton onSelect={handleRedo}>
              <span>Redo</span>
              <Kbd variant="menu"># ⇧ Z</Kbd>
            </ContextMenuButton>
          </>
        )}
      </MenuContent>
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
      <RadixContextMenu.TriggerItem as={RowButton} bp={breakpoints}>
        <span>Align / Distribute</span>
        <IconWrapper size="small">
          <ChevronRightIcon />
        </IconWrapper>
      </RadixContextMenu.TriggerItem>
      <StyledGrid
        as={RadixContextMenu.Content}
        sideOffset={2}
        alignOffset={-2}
        selectedStyle={hasThreeOrMore ? 'threeOrMore' : 'twoOrMore'}
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
      </StyledGrid>
    </ContextMenuRoot>
  )
}

const StyledGrid = styled(MenuContent, {
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

// function MoveToPageMenu() {
//   const documentPages = useSelector((s) => s.data.document.pages)
//   const currentPageId = useSelector((s) => s.data.currentPageId)

//   if (!documentPages[currentPageId]) return null

//   const sorted = Object.values(documentPages)
//     .sort((a, b) => a.childIndex - b.childIndex)
//     .filter((a) => a.id !== currentPageId)

//   if (sorted.length === 0) return null

//   return (
//     <ContextMenuRoot>
//       <ContextMenuButton>
//         <span>Move To Page</span>
//         <IconWrapper size="small">
//           <ChevronRightIcon />
//         </IconWrapper>
//       </ContextMenuButton>
//       <MenuContent as={RadixContextMenu.Content} sideOffset={2} alignOffset={-2}>
//         {sorted.map(({ id, name }) => (
//           <ContextMenuButton
//             key={id}
//             disabled={id === currentPageId}
//             onSelect={() => state.send('MOVED_TO_PAGE', { id })}
//           >
//             <span>{name}</span>
//           </ContextMenuButton>
//         ))}
//         <ContextMenuArrow offset={13} />
//       </MenuContent>
//     </ContextMenuRoot>
//   )
// }
