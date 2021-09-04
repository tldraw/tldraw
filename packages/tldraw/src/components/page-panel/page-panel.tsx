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

const sortedSelector = (s: Data) =>
  Object.values(s.document.pages).sort((a, b) => (a.childIndex || 0) - (b.childIndex || 0))

const currentPageNameSelector = (s: Data) => s.document.pages[s.appState.currentPageId].name

const currentPageIdSelector = (s: Data) => s.document.pages[s.appState.currentPageId].id

export function PagePanel(): JSX.Element {
  const { useSelector } = useTLDrawContext()

  const rIsOpen = React.useRef(false)

  const [isOpen, setIsOpen] = React.useState(false)

  React.useEffect(() => {
    if (rIsOpen.current !== isOpen) {
      rIsOpen.current = isOpen
    }
  }, [isOpen])

  const handleClose = React.useCallback(() => {
    setIsOpen(false)
  }, [setIsOpen])

  const handleOpenChange = React.useCallback(
    (isOpen: boolean) => {
      if (rIsOpen.current !== isOpen) {
        setIsOpen(isOpen)
      }
    },
    [setIsOpen]
  )
  const currentPageName = useSelector(currentPageNameSelector)

  return (
    <DropdownMenu.Root dir="ltr" open={isOpen} onOpenChange={handleOpenChange}>
      <FloatingContainer>
        <RowButton as={DropdownMenu.Trigger} bp={breakpoints} variant="noIcon">
          <span>{currentPageName || 'Page'}</span>
        </RowButton>
      </FloatingContainer>
      <MenuContent as={DropdownMenu.Content} sideOffset={8} align="start">
        {isOpen && <PageMenuContent onClose={handleClose} />}
      </MenuContent>
    </DropdownMenu.Root>
  )
}

function PageMenuContent({ onClose }: { onClose: () => void }) {
  const { tlstate, useSelector } = useTLDrawContext()

  const sortedPages = useSelector(sortedSelector)

  const currentPageId = useSelector(currentPageIdSelector)

  const handleCreatePage = React.useCallback(() => {
    tlstate.createPage()
  }, [tlstate])

  const handleChangePage = React.useCallback(
    (id: string) => {
      onClose()
      tlstate.changePage(id)
    },
    [tlstate]
  )

  return (
    <>
      <DropdownMenu.RadioGroup value={currentPageId} onValueChange={handleChangePage}>
        {sortedPages.map((page) => (
          <ButtonWithOptions key={page.id}>
            <DropdownMenu.RadioItem
              as={RowButton}
              bp={breakpoints}
              value={page.id}
              variant="pageButton"
            >
              <span>{page.name || 'Page'}</span>
              <DropdownMenu.ItemIndicator>
                <IconWrapper size="small">
                  <CheckIcon />
                </IconWrapper>
              </DropdownMenu.ItemIndicator>
            </DropdownMenu.RadioItem>
            <PageOptionsDialog page={page} onClose={onClose} />
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
    </>
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
