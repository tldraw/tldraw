import styled from 'styles'
import * as ContextMenu from '@radix-ui/react-context-menu'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Dialog from '@radix-ui/react-dialog'

import { IconWrapper, RowButton } from 'components/shared'
import { CheckIcon, ChevronDownIcon, PlusIcon } from '@radix-ui/react-icons'
import * as Panel from '../panel'
import state, { useSelector } from 'state'
import { useEffect, useRef, useState } from 'react'

export default function PagePanel() {
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
      open={isOpen}
      onOpenChange={(isOpen) => {
        if (rIsOpen.current !== isOpen) {
          setIsOpen(isOpen)
        }
      }}
    >
      <PanelRoot>
        <DropdownMenu.Trigger
          as={RowButton}
          bp={{ '@initial': 'mobile', '@sm': 'small' }}
          css={{ paddingRight: 12 }}
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
                <ContextMenu.Root key={id}>
                  <ContextMenu.Trigger>
                    <StyledRadioItem
                      key={id}
                      value={id}
                      bp={{ '@initial': 'mobile', '@sm': 'small' }}
                    >
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
              bp={{ '@initial': 'mobile', '@sm': 'small' }}
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
  marginLeft: 8,
  zIndex: 200,
  overflow: 'hidden',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  pointerEvents: 'all',
  padding: '2px',
  borderRadius: '4px',
  backgroundColor: '$panel',
  border: '1px solid $panel',
  boxShadow: '0px 2px 4px rgba(0,0,0,.2)',
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
  padding: '2px',
  borderRadius: '4px',
  backgroundColor: '$panel',
  border: '1px solid $panel',
  boxShadow: '0px 2px 4px rgba(0,0,0,.2)',
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

const StyledOverlay = styled(Dialog.Overlay, {
  backgroundColor: 'rgba(0, 0, 0, .15)',
  position: 'fixed',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
})

const StyledContent = styled(Dialog.Content, {
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  minWidth: 200,
  maxWidth: 'fit-content',
  maxHeight: '85vh',
  padding: 20,
  marginTop: '-5vh',
  backgroundColor: 'white',
  borderRadius: 6,

  '&:focus': {
    outline: 'none',
  },
})
