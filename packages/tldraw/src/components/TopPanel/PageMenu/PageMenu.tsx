import * as React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { PlusIcon, CheckIcon } from '@radix-ui/react-icons'
import { PageOptionsDialog } from '../PageOptionsDialog'
import { styled } from '~styles'
import { useTldrawApp } from '~hooks'
import type { TDSnapshot } from '~types'
import { DMContent, DMDivider } from '~components/Primitives/DropdownMenu'
import { SmallIcon } from '~components/Primitives/SmallIcon'
import { RowButton } from '~components/Primitives/RowButton'
import { ToolButton } from '~components/Primitives/ToolButton'
import { preventEvent } from '~components/preventEvent'

const sortedSelector = (s: TDSnapshot) =>
  Object.values(s.document.pages).sort((a, b) => (a.childIndex || 0) - (b.childIndex || 0))

const currentPageNameSelector = (s: TDSnapshot) => s.document.pages[s.appState.currentPageId].name

const currentPageIdSelector = (s: TDSnapshot) => s.document.pages[s.appState.currentPageId].id

export function PageMenu(): JSX.Element {
  const app = useTldrawApp()

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
  const currentPageName = app.useStore(currentPageNameSelector)

  return (
    <DropdownMenu.Root dir="ltr" open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenu.Trigger dir="ltr" asChild id="TD-Page">
        <ToolButton variant="text">{currentPageName || 'Page'}</ToolButton>
      </DropdownMenu.Trigger>
      <DMContent variant="menu" align="start">
        {isOpen && <PageMenuContent onClose={handleClose} />}
      </DMContent>
    </DropdownMenu.Root>
  )
}

function PageMenuContent({ onClose }: { onClose: () => void }) {
  const app = useTldrawApp()

  const sortedPages = app.useStore(sortedSelector)

  const currentPageId = app.useStore(currentPageIdSelector)

  const handleCreatePage = React.useCallback(() => {
    app.createPage()
  }, [app])

  const handleChangePage = React.useCallback(
    (id: string) => {
      onClose()
      app.changePage(id)
    },
    [app]
  )

  return (
    <>
      <DropdownMenu.RadioGroup dir="ltr" value={currentPageId} onValueChange={handleChangePage}>
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
