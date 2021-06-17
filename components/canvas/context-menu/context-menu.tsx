import * as _ContextMenu from '@radix-ui/react-context-menu'
import * as _Dropdown from '@radix-ui/react-dropdown-menu'
import styled from 'styles'
import {
  IconWrapper,
  IconButton as _IconButton,
  RowButton,
} from 'components/shared'
import {
  commandKey,
  deepCompareArrays,
  getSelectedShapes,
  isMobile,
} from 'utils/utils'
import state, { useSelector } from 'state'
import {
  AlignType,
  DistributeType,
  MoveType,
  ShapeType,
  StretchType,
} from 'types'
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
}) {
  const selectedShapes = useSelector(
    (s) => getSelectedShapes(s.data),
    deepCompareArrays
  )

  const rContent = useRef<HTMLDivElement>(null)

  const hasGroupSelectd = selectedShapes.some((s) => s.type === ShapeType.Group)
  const hasTwoOrMore = selectedShapes.length > 1
  const hasThreeOrMore = selectedShapes.length > 2

  return (
    <_ContextMenu.Root>
      <_ContextMenu.Trigger>{children}</_ContextMenu.Trigger>
      <StyledContent ref={rContent} isMobile={isMobile()}>
        {selectedShapes.length ? (
          <>
            {/* <Button onSelect={() => state.send('COPIED')}>
              <span>Copy</span>
              <kbd>
                <span>{commandKey()}</span>
                <span>C</span>
              </kbd>
            </Button>
            <Button onSelect={() => state.send('CUT')}>
              <span>Cut</span>
              <kbd>
                <span>{commandKey()}</span>
                <span>X</span>
              </kbd>
            </Button>
             */}
            <Button onSelect={() => state.send('DUPLICATED')}>
              <span>Duplicate</span>
              <kbd>
                <span>{commandKey()}</span>
                <span>D</span>
              </kbd>
            </Button>
            <StyledDivider />
            {hasGroupSelectd ||
              (hasTwoOrMore && (
                <>
                  {hasGroupSelectd && (
                    <Button onSelect={() => state.send('UNGROUPED')}>
                      <span>Ungroup</span>
                      <kbd>
                        <span>{commandKey()}</span>
                        <span>⇧</span>
                        <span>G</span>
                      </kbd>
                    </Button>
                  )}
                  {hasTwoOrMore && (
                    <Button onSelect={() => state.send('GROUPED')}>
                      <span>Group</span>
                      <kbd>
                        <span>{commandKey()}</span>
                        <span>G</span>
                      </kbd>
                    </Button>
                  )}
                </>
              ))}
            <SubMenu label="Move">
              <Button
                onSelect={() =>
                  state.send('MOVED', {
                    type: MoveType.ToFront,
                  })
                }
              >
                <span>To Front</span>
                <kbd>
                  <span>{commandKey()}</span>
                  <span>⇧</span>
                  <span>]</span>
                </kbd>
              </Button>

              <Button
                onSelect={() =>
                  state.send('MOVED', {
                    type: MoveType.Forward,
                  })
                }
              >
                <span>Forward</span>
                <kbd>
                  <span>{commandKey()}</span>
                  <span>]</span>
                </kbd>
              </Button>
              <Button
                onSelect={() =>
                  state.send('MOVED', {
                    type: MoveType.Backward,
                  })
                }
              >
                <span>Backward</span>
                <kbd>
                  <span>{commandKey()}</span>
                  <span>[</span>
                </kbd>
              </Button>
              <Button
                onSelect={() =>
                  state.send('MOVED', {
                    type: MoveType.ToBack,
                  })
                }
              >
                <span>To Back</span>
                <kbd>
                  <span>{commandKey()}</span>
                  <span>⇧</span>
                  <span>[</span>
                </kbd>
              </Button>
            </SubMenu>
            {hasTwoOrMore && (
              <AlignDistributeSubMenu
                hasTwoOrMore={hasTwoOrMore}
                hasThreeOrMore={hasThreeOrMore}
              />
            )}
            <MoveToPageMenu />
            <StyledDivider />
            <Button onSelect={() => state.send('DELETED')}>
              <span>Delete</span>
              <kbd>
                <span>⌫</span>
              </kbd>
            </Button>
          </>
        ) : (
          <>
            <Button onSelect={() => state.send('UNDO')}>
              <span>Undo</span>
              <kbd>
                <span>{commandKey()}</span>
                <span>Z</span>
              </kbd>
            </Button>
            <Button onSelect={() => state.send('REDO')}>
              <span>Redo</span>
              <kbd>
                <span>{commandKey()}</span>
                <span>⇧</span>
                <span>Z</span>
              </kbd>
            </Button>
          </>
        )}
      </StyledContent>
    </_ContextMenu.Root>
  )
}

const StyledContent = styled(_ContextMenu.Content, {
  position: 'relative',
  backgroundColor: '$panel',
  borderRadius: '4px',
  overflow: 'hidden',
  pointerEvents: 'all',
  userSelect: 'none',
  zIndex: 200,
  padding: 3,
  boxShadow: '0px 2px 4px rgba(0,0,0,.2)',
  minWidth: 128,

  '& kbd': {
    marginLeft: '32px',
    fontSize: '$1',
    fontFamily: '$ui',
  },

  '& kbd > span': {
    display: 'inline-block',
    width: '12px',
  },

  variants: {
    isMobile: {
      true: {
        '& kbd': {
          display: 'none',
        },
      },
    },
  },
})

const StyledDivider = styled(_ContextMenu.Separator, {
  backgroundColor: '$hover',
  height: 1,
  margin: '3px -3px',
})

function Button({
  onSelect,
  children,
  disabled = false,
}: {
  onSelect: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <_ContextMenu.Item
      as={RowButton}
      disabled={disabled}
      bp={{ '@initial': 'mobile', '@sm': 'small' }}
      onSelect={onSelect}
    >
      {children}
    </_ContextMenu.Item>
  )
}

function IconButton({
  onSelect,
  children,
  disabled = false,
}: {
  onSelect: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <_ContextMenu.Item
      as={_IconButton}
      bp={{ '@initial': 'mobile', '@sm': 'small' }}
      disabled={disabled}
      onSelect={onSelect}
    >
      {children}
    </_ContextMenu.Item>
  )
}

function SubMenu({
  children,
  label,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <_ContextMenu.Root>
      <_ContextMenu.TriggerItem
        as={RowButton}
        bp={{ '@initial': 'mobile', '@sm': 'small' }}
      >
        <span>{label}</span>
        <IconWrapper size="small">
          <ChevronRightIcon />
        </IconWrapper>
      </_ContextMenu.TriggerItem>
      <StyledContent sideOffset={2} alignOffset={-2} isMobile={isMobile()}>
        {children}
        <StyledArrow offset={13} />
      </StyledContent>
    </_ContextMenu.Root>
  )
}

function AlignDistributeSubMenu({
  hasTwoOrMore,
  hasThreeOrMore,
}: {
  hasTwoOrMore: boolean
  hasThreeOrMore: boolean
}) {
  return (
    <_ContextMenu.Root>
      <_ContextMenu.TriggerItem
        as={RowButton}
        bp={{ '@initial': 'mobile', '@sm': 'small' }}
      >
        <span>Align / Distribute</span>
        <IconWrapper size="small">
          <ChevronRightIcon />
        </IconWrapper>
      </_ContextMenu.TriggerItem>
      <StyledGrid
        sideOffset={2}
        alignOffset={-2}
        isMobile={isMobile()}
        selectedStyle={hasThreeOrMore ? 'threeOrMore' : 'twoOrMore'}
      >
        <IconButton onSelect={alignLeft}>
          <AlignLeftIcon />
        </IconButton>
        <IconButton onSelect={alignCenterHorizontal}>
          <AlignCenterHorizontallyIcon />
        </IconButton>
        <IconButton onSelect={alignRight}>
          <AlignRightIcon />
        </IconButton>
        <IconButton onSelect={stretchHorizontally}>
          <StretchHorizontallyIcon />
        </IconButton>
        {hasThreeOrMore && (
          <IconButton onSelect={distributeHorizontally}>
            <SpaceEvenlyHorizontallyIcon />
          </IconButton>
        )}

        <IconButton onSelect={alignTop}>
          <AlignTopIcon />
        </IconButton>
        <IconButton onSelect={alignCenterVertical}>
          <AlignCenterVerticallyIcon />
        </IconButton>
        <IconButton onSelect={alignBottom}>
          <AlignBottomIcon />
        </IconButton>
        <IconButton onSelect={stretchVertically}>
          <StretchVerticallyIcon />
        </IconButton>
        {hasThreeOrMore && (
          <IconButton onSelect={distributeVertically}>
            <SpaceEvenlyVerticallyIcon />
          </IconButton>
        )}
        <StyledArrow offset={13} />
      </StyledGrid>
    </_ContextMenu.Root>
  )
}

const StyledGrid = styled(StyledContent, {
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
    <_ContextMenu.Root>
      <_ContextMenu.TriggerItem
        as={RowButton}
        bp={{ '@initial': 'mobile', '@sm': 'small' }}
      >
        <span>Move To Page</span>
        <IconWrapper size="small">
          <ChevronRightIcon />
        </IconWrapper>
      </_ContextMenu.TriggerItem>
      <StyledContent sideOffset={2} alignOffset={-2} isMobile={isMobile()}>
        {sorted.map(({ id, name }) => (
          <Button
            key={id}
            disabled={id === currentPageId}
            onSelect={() => state.send('MOVED_TO_PAGE', { id })}
          >
            <span>{name}</span>
          </Button>
        ))}
        <StyledArrow offset={13} />
      </StyledContent>
    </_ContextMenu.Root>
  )
}

const StyledDialogContent = styled(_Dropdown.Content, {
  // position: 'fixed',
  // top: '50%',
  // left: '50%',
  // transform: 'translate(-50%, -50%)',
  // minWidth: 200,
  // maxWidth: 'fit-content',
  // maxHeight: '85vh',
  // marginTop: '-5vh',
  minWidth: 128,
  backgroundColor: '$panel',
  borderRadius: '4px',
  overflow: 'hidden',
  pointerEvents: 'all',
  userSelect: 'none',
  zIndex: 200,
  padding: 2,
  border: '1px solid $panel',
  boxShadow: '0px 2px 4px rgba(0,0,0,.2)',

  '&:focus': {
    outline: 'none',
  },
})

const StyledArrow = styled(_ContextMenu.Arrow, {
  fill: 'white',
})
