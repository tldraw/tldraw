import * as React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { PlusIcon, CheckIcon } from '@radix-ui/react-icons'
import {
  breakpoints,
  DropdownMenuButton,
  DropdownMenuDivider,
  RowButton,
  MenuContent,
  FloatingContainer,
  IconWrapper,
} from '~components/shared'
import { PageOptionsDialog } from '~components/page-options-dialog'
import styled from '~styles'
import { useTLDrawContext } from '~hooks'
import type { Data } from '~types'

const currentPageSelector = (s: Data) => s.page

export function PagePanel(): JSX.Element {
  const rIsOpen = React.useRef(false)
  const [isOpen, setIsOpen] = React.useState(false)

  const { tlstate, useSelector } = useTLDrawContext()

  React.useEffect(() => {
    if (rIsOpen.current !== isOpen) {
      rIsOpen.current = isOpen
    }
  }, [isOpen])

  const handleCreatePage = React.useCallback(() => {
    tlstate.createPage()
  }, [tlstate])

  const handleChangePage = React.useCallback(
    (id: string) => {
      setIsOpen(false)
      tlstate.changePage(id)
    },
    [tlstate]
  )

  const currentPage = useSelector(currentPageSelector)

  const sorted = Object.values([currentPage]).sort(
    (a, b) => (a.childIndex || 0) - (b.childIndex || 0)
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
        <RowButton as={DropdownMenu.Trigger} bp={breakpoints} variant="noIcon">
          <span>{currentPage.name || 'Page'}</span>
        </RowButton>
      </FloatingContainer>
      <MenuContent as={DropdownMenu.Content} sideOffset={8} align="start">
        <DropdownMenu.RadioGroup value={currentPage.id} onValueChange={handleChangePage}>
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
              <PageOptionsDialog page={page} />
            </ButtonWithOptions>
          ))}
        </DropdownMenu.RadioGroup>
        <DropdownMenuDivider />
        <DropdownMenuButton onSelect={handleCreatePage}>
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
