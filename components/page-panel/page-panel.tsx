import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import styled from 'styles'
import {
  breakpoints,
  DropdownMenuButton,
  DropdownMenuDivider,
  RowButton,
  MenuContent,
  FloatingContainer,
  IconWrapper,
} from 'components/shared'
import PageOptions from './page-options'
import { PlusIcon, CheckIcon } from '@radix-ui/react-icons'
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
      <FloatingContainer>
        <RowButton as={DropdownMenu.Trigger} bp={breakpoints}>
          <span>{documentPages[currentPageId].name}</span>
        </RowButton>
      </FloatingContainer>
      <MenuContent as={DropdownMenu.Content} sideOffset={8} align="start">
        <DropdownMenu.RadioGroup
          value={currentPageId}
          onValueChange={(id) => {
            setIsOpen(false)
            state.send('CHANGED_PAGE', { id })
          }}
        >
          {sorted.map((page) => (
            <ButtonWithOptions key={page.id}>
              <DropdownMenu.RadioItem
                as={RowButton}
                bp={breakpoints}
                value={page.id}
                variant="pageButton"
              >
                <span>{page.name}</span>
                <DropdownMenu.ItemIndicator>
                  <IconWrapper size="small">
                    <CheckIcon />
                  </IconWrapper>
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
              <PageOptions page={page} />
            </ButtonWithOptions>
          ))}
        </DropdownMenu.RadioGroup>
        <DropdownMenuDivider />
        <DropdownMenuButton onSelect={() => state.send('CREATED_PAGE')}>
          <span>Create Page</span>
          <IconWrapper size="small">
            <PlusIcon />
          </IconWrapper>
        </DropdownMenuButton>
      </MenuContent>
    </DropdownMenu.Root>
  )
}

const ButtonWithOptions = styled('div', {
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  gridAutoFlow: 'column',

  '& > *[data-shy="true"]': {
    opacity: 0,
  },

  '&:hover > *[data-shy="true"]': {
    opacity: 1,
  },
})
