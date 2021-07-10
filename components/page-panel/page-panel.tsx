import styled from 'styles'
import * as ContextMenu from '@radix-ui/react-context-menu'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

import { breakpoints, IconWrapper, RowButton } from 'components/shared'
import { CheckIcon, PlusIcon } from '@radix-ui/react-icons'
import * as Panel from '../panel'
import state, { useSelector } from 'state'
import { useEffect, useRef, useState } from 'react'

export default function PagePanel(): JSX.Element {
  const rIsOpen = useRef(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (rIsOpen.current !== isOpen) {
      rIsOpen.current = isOpen
    }
  }, [isOpen])

  const documentPages = useSelector((s) => s.data.document.pages)
  const currentPageId = useSelector((s) => s.data.currentPageId)

  if (!documentPages[currentPageId]) return null

  const sorted = Object.values(documentPages).sort(
    (a, b) => a.childIndex - b.childIndex
  )

  return (
    <DropdownMenu.Root
      dir="ltr"
      open={isOpen}
      onOpenChange={(isOpen) => {
        if (rIsOpen.current !== isOpen) {
          setIsOpen(isOpen)
        }
      }}
    >
      <PanelRoot dir="ltr">
        <DropdownMenu.Trigger
          as={RowButton}
          bp={breakpoints}
          variant="pageButton"
        >
          <span>{documentPages[currentPageId].name}</span>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content sideOffset={8}>
          <PanelRoot>
            <DropdownMenu.RadioGroup
              as={Content}
              value={currentPageId}
              onValueChange={(id) => {
                setIsOpen(false)
                state.send('CHANGED_PAGE', { id })
              }}
            >
              {sorted.map(({ id, name }) => (
                <ContextMenu.Root dir="ltr" key={id}>
                  <ContextMenu.Trigger>
                    <StyledRadioItem key={id} value={id} bp={breakpoints}>
                      <span>{name}</span>
                      <DropdownMenu.ItemIndicator as={IconWrapper} size="small">
                        <CheckIcon />
                      </DropdownMenu.ItemIndicator>
                    </StyledRadioItem>
                  </ContextMenu.Trigger>
                  <StyledContextMenuContent>
                    <ContextMenu.Group>
                      <StyledContextMenuItem
                        onSelect={() => state.send('RENAMED_PAGE', { id })}
                      >
                        Rename
                      </StyledContextMenuItem>
                      <StyledContextMenuItem
                        onSelect={() => {
                          setIsOpen(false)
                          state.send('DELETED_PAGE', { id })
                        }}
                      >
                        Delete
                      </StyledContextMenuItem>
                    </ContextMenu.Group>
                  </StyledContextMenuContent>
                </ContextMenu.Root>
              ))}
            </DropdownMenu.RadioGroup>
            <DropdownMenu.Separator />
            <RowButton
              bp={breakpoints}
              onClick={() => {
                setIsOpen(false)
                state.send('CREATED_PAGE')
              }}
            >
              <span>Create Page</span>
              <IconWrapper size="small">
                <PlusIcon />
              </IconWrapper>
            </RowButton>
          </PanelRoot>
        </DropdownMenu.Content>
      </PanelRoot>
    </DropdownMenu.Root>
  )
}

const PanelRoot = styled('div', {
  zIndex: 200,
  overflow: 'hidden',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  pointerEvents: 'all',
  padding: '$0',
  borderRadius: '4px',
  backgroundColor: '$panel',
  border: '1px solid $panel',
  boxShadow: '$4',
  userSelect: 'none',
})

const Content = styled(Panel.Content, {
  width: '100%',
  minWidth: 128,
})

const StyledRadioItem = styled(DropdownMenu.RadioItem, {
  height: 32,
  width: 'auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 6px 0 12px',
  cursor: 'pointer',
  borderRadius: '4px',
  fontSize: '$1',
  fontFamily: '$ui',
  fontWeight: 400,
  backgroundColor: 'transparent',
  outline: 'none',
  variants: {
    bp: {
      mobile: {},
      small: {
        '&:hover': {
          backgroundColor: '$hover',
        },
        '&:focus-within': {
          backgroundColor: '$hover',
        },
      },
    },
  },
})

const StyledContextMenuContent = styled(ContextMenu.Content, {
  padding: '$0',
  borderRadius: '4px',
  backgroundColor: '$panel',
  border: '1px solid $panel',
  boxShadow: '$4',
})

const StyledContextMenuItem = styled(ContextMenu.Item, {
  height: 32,
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 12px 0 12px',
  cursor: 'pointer',
  borderRadius: '4px',
  fontSize: '$1',
  fontFamily: '$ui',
  fontWeight: 400,
  backgroundColor: 'transparent',
  outline: 'none',
  bp: {
    mobile: {},
    small: {
      '&:hover:not(:disabled)': {
        backgroundColor: '$hover',
      },
    },
  },
})
