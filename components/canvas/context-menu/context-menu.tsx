import * as _ContextMenu from '@radix-ui/react-context-menu'
import styled from 'styles'
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
} from 'components/shared'
import { commandKey, deepCompareArrays } from 'utils'
import state, { useSelector } from 'state'
import {
  AlignType,
  DistributeType,
  MoveType,
  ShapeType,
  StretchType,
} from 'types'
import tld from 'utils/tld'
import React, { useRef } from 'react'
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
import { Kbd } from 'components/shared'

function alignTop() {
  state.send('ALIGNED', { type: AlignType.Top })
}

function alignCenterVertical() {
  state.send('ALIGNED', { type: AlignType.CenterVertical })
}

function alignBottom() {
  state.send('ALIGNED', { type: AlignType.Bottom })
}

function stretchVertically() {
  state.send('STRETCHED', { type: StretchType.Vertical })
}

function distributeVertically() {
  state.send('DISTRIBUTED', { type: DistributeType.Vertical })
}

function alignLeft() {
  state.send('ALIGNED', { type: AlignType.Left })
}

function alignCenterHorizontal() {
  state.send('ALIGNED', { type: AlignType.CenterHorizontal })
}

function alignRight() {
  state.send('ALIGNED', { type: AlignType.Right })
}

function stretchHorizontally() {
  state.send('STRETCHED', { type: StretchType.Horizontal })
}

function distributeHorizontally() {
  state.send('DISTRIBUTED', { type: DistributeType.Horizontal })
}

export default function ContextMenu({
  children,
}: {
  children: React.ReactNode
}): JSX.Element {
  const selectedShapeIds = useSelector(
    (s) => s.values.selectedIds,
    deepCompareArrays
  )

  const rContent = useRef<HTMLDivElement>(null)

  const hasGroupSelected = useSelector((s) =>
    selectedShapeIds.some(
      (id) => tld.getShape(s.data, id)?.type === ShapeType.Group
    )
  )

  const hasTwoOrMore = selectedShapeIds.length > 1
  const hasThreeOrMore = selectedShapeIds.length > 2

  return (
    <ContextMenuRoot>
      <_ContextMenu.Trigger>{children}</_ContextMenu.Trigger>
      <MenuContent as={_ContextMenu.Content} ref={rContent}>
        {selectedShapeIds.length ? (
          <>
            {/* <ContextMenuButton onSelect={() => state.send('COPIED')}>
              <span>Copy</span>
              <Kbd>
                <span>{commandKey()}</span>
                <span>C</span>
              </Kbd>
            </ContextMenuButton>
            <ContextMenuButton onSelect={() => state.send('CUT')}>
              <span>Cut</span>
              <Kbd>
                <span>{commandKey()}</span>
                <span>X</span>
              </Kbd>
            </ContextMenuButton>
             */}
            <ContextMenuButton onSelect={() => state.send('DUPLICATED')}>
              <span>Duplicate</span>
              <Kbd>
                <span>{commandKey()}</span>
                <span>D</span>
              </Kbd>
            </ContextMenuButton>
            <ContextMenuDivider />
            {hasGroupSelected ||
              (hasTwoOrMore && (
                <>
                  {hasGroupSelected && (
                    <ContextMenuButton onSelect={() => state.send('UNGROUPED')}>
                      <span>Ungroup</span>
                      <Kbd>
                        <span>{commandKey()}</span>
                        <span>⇧</span>
                        <span>G</span>
                      </Kbd>
                    </ContextMenuButton>
                  )}
                  {hasTwoOrMore && (
                    <ContextMenuButton onSelect={() => state.send('GROUPED')}>
                      <span>Group</span>
                      <Kbd>
                        <span>{commandKey()}</span>
                        <span>G</span>
                      </Kbd>
                    </ContextMenuButton>
                  )}
                </>
              ))}
            <ContextMenuSubMenu label="Move">
              <ContextMenuButton
                onSelect={() =>
                  state.send('MOVED', {
                    type: MoveType.ToFront,
                  })
                }
              >
                <span>To Front</span>
                <Kbd>
                  <span>{commandKey()}</span>
                  <span>⇧</span>
                  <span>]</span>
                </Kbd>
              </ContextMenuButton>

              <ContextMenuButton
                onSelect={() =>
                  state.send('MOVED', {
                    type: MoveType.Forward,
                  })
                }
              >
                <span>Forward</span>
                <Kbd>
                  <span>{commandKey()}</span>
                  <span>]</span>
                </Kbd>
              </ContextMenuButton>
              <ContextMenuButton
                onSelect={() =>
                  state.send('MOVED', {
                    type: MoveType.Backward,
                  })
                }
              >
                <span>Backward</span>
                <Kbd>
                  <span>{commandKey()}</span>
                  <span>[</span>
                </Kbd>
              </ContextMenuButton>
              <ContextMenuButton
                onSelect={() =>
                  state.send('MOVED', {
                    type: MoveType.ToBack,
                  })
                }
              >
                <span>To Back</span>
                <Kbd>
                  <span>{commandKey()}</span>
                  <span>⇧</span>
                  <span>[</span>
                </Kbd>
              </ContextMenuButton>
            </ContextMenuSubMenu>
            {hasTwoOrMore && (
              <AlignDistributeSubMenu
                hasTwoOrMore={hasTwoOrMore}
                hasThreeOrMore={hasThreeOrMore}
              />
            )}
            <MoveToPageMenu />
            <ContextMenuButton onSelect={() => state.send('COPIED_TO_SVG')}>
              <span>Copy to SVG</span>
              <Kbd>
                <span>{commandKey()}</span>
                <span>⇧</span>
                <span>C</span>
              </Kbd>
            </ContextMenuButton>
            <ContextMenuDivider />
            <ContextMenuButton onSelect={() => state.send('DELETED')}>
              <span>Delete</span>
              <Kbd>
                <span>⌫</span>
              </Kbd>
            </ContextMenuButton>
          </>
        ) : (
          <>
            <ContextMenuButton onSelect={() => state.send('UNDO')}>
              <span>Undo</span>
              <Kbd>
                <span>{commandKey()}</span>
                <span>Z</span>
              </Kbd>
            </ContextMenuButton>
            <ContextMenuButton onSelect={() => state.send('REDO')}>
              <span>Redo</span>
              <Kbd>
                <span>{commandKey()}</span>
                <span>⇧</span>
                <span>Z</span>
              </Kbd>
            </ContextMenuButton>
          </>
        )}
      </MenuContent>
    </ContextMenuRoot>
  )
}

function AlignDistributeSubMenu({
  hasThreeOrMore,
}: {
  hasTwoOrMore: boolean
  hasThreeOrMore: boolean
}) {
  return (
    <ContextMenuRoot>
      <_ContextMenu.TriggerItem as={RowButton} bp={breakpoints}>
        <span>Align / Distribute</span>
        <IconWrapper size="small">
          <ChevronRightIcon />
        </IconWrapper>
      </_ContextMenu.TriggerItem>
      <StyledGrid
        as={_ContextMenu.Content}
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

function MoveToPageMenu() {
  const documentPages = useSelector((s) => s.data.document.pages)
  const currentPageId = useSelector((s) => s.data.currentPageId)

  if (!documentPages[currentPageId]) return null

  const sorted = Object.values(documentPages)
    .sort((a, b) => a.childIndex - b.childIndex)
    .filter((a) => a.id !== currentPageId)

  if (sorted.length === 0) return null

  return (
    <ContextMenuRoot>
      <ContextMenuButton>
        <span>Move To Page</span>
        <IconWrapper size="small">
          <ChevronRightIcon />
        </IconWrapper>
      </ContextMenuButton>
      <MenuContent as={_ContextMenu.Content} sideOffset={2} alignOffset={-2}>
        {sorted.map(({ id, name }) => (
          <ContextMenuButton
            key={id}
            disabled={id === currentPageId}
            onSelect={() => state.send('MOVED_TO_PAGE', { id })}
          >
            <span>{name}</span>
          </ContextMenuButton>
        ))}
        <ContextMenuArrow offset={13} />
      </MenuContent>
    </ContextMenuRoot>
  )
}
