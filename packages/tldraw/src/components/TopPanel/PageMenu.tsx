import * as React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { PlusIcon, CheckIcon } from '@radix-ui/react-icons'
import { PageOptionsDialog } from './PageOptionsDialog'
import styled from '~styles'
import { useTLDrawContext } from '~hooks'
import type { Data } from '~types'
import { DMContent, DMDivider } from '~components/DropdownMenu'
import { SmallIcon } from '~components/SmallIcon'
import { RowButton } from '~components/RowButton'
import { ToolButton } from '~components/ToolButton'

const sortedSelector = (s: Data) =>
  Object.values(s.document.pages).sort((a, b) => (a.childIndex || 0) - (b.childIndex || 0))

const currentPageNameSelector = (s: Data) => s.document.pages[s.appState.currentPageId].name

const currentPageIdSelector = (s: Data) => s.document.pages[s.appState.currentPageId].id

export function PageMenu(): JSX.Element {
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
      <DropdownMenu.Trigger dir="ltr" asChild>
        <ToolButton variant="text">{currentPageName || 'Page'}</ToolButton>
      </DropdownMenu.Trigger>
      <DMContent variant="menu" align="start">
        {isOpen && <PageMenuContent onClose={handleClose} />}
      </DMContent>
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
              title={page.name || 'Page'}
              value={page.id}
              key={page.id}
              asChild
            >
              <PageButton>
                <span>{page.name || 'Page'}</span>
                <DropdownMenu.ItemIndicator>
                  <SmallIcon>
                    <CheckIcon />
                  </SmallIcon>
                </DropdownMenu.ItemIndicator>
              </PageButton>
            </DropdownMenu.RadioItem>
            <PageOptionsDialog page={page} onClose={onClose} />
          </ButtonWithOptions>
        ))}
      </DropdownMenu.RadioGroup>
      <DMDivider />
      <DropdownMenu.Item onSelect={handleCreatePage} asChild>
        <RowButton>
          <span>Create Page</span>
          <SmallIcon>
            <PlusIcon />
          </SmallIcon>
        </RowButton>
      </DropdownMenu.Item>
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

export const PageButton = styled(RowButton, {
  minWidth: 128,
})
