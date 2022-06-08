import * as React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import { PlusIcon, CheckIcon, Cross2Icon, DragHandleDots2Icon, FrameIcon, TextAlignJustifyIcon, TriangleRightIcon, SpeakerLoudIcon } from '@radix-ui/react-icons'
import { PageOptionsDialog } from '../PageOptionsDialog'
import { styled } from '~styles'
import { useTldrawApp } from '~hooks'
import type { TDSnapshot } from '~types'
import { DMContent, DMDivider } from '~components/Primitives/DropdownMenu'
import { SmallIcon } from '~components/Primitives/SmallIcon'
import { RowButton } from '~components/Primitives/RowButton'
import { ToolButton } from '~components/Primitives/ToolButton'
import { FormattedMessage } from 'react-intl'

const sortedSelector = (s: TDSnapshot) =>
  Object.values(s.document.pages).sort((a, b) => (a.childIndex || 0) - (b.childIndex || 0))

const currentPageSelector = (s: TDSnapshot) => s.document.pages[s.appState.currentPageId]

export function PageMenu() {
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
  const currentPageName = app.useStore(currentPageSelector).name

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

  const currentPage = app.useStore(currentPageSelector)

  const [gridType, setGridType] = React.useState(currentPage.gridType || 'none')

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

  const handleGridTypeChange = React.useCallback((v) => {
    setGridType(v)
    app.setGridType(currentPage.id, v == 'none' ? undefined : v);
  }, [app, setGridType, currentPage]);

  return (
    <>
      <DropdownMenu.RadioGroup dir="ltr" value={currentPage.id} onValueChange={handleChangePage}>
        <ToggleGroup.Root type="single" value={gridType} onValueChange={handleGridTypeChange} orientation='horizontal'>
          <ToggleGroup.Item value='none'>
            <Cross2Icon/>
          </ToggleGroup.Item>
          <ToggleGroup.Item value='dots'>
            <DragHandleDots2Icon />
          </ToggleGroup.Item>
          <ToggleGroup.Item value='squares'>
            <FrameIcon />
          </ToggleGroup.Item>
          <ToggleGroup.Item value='lines'>
            <TextAlignJustifyIcon />
          </ToggleGroup.Item>
          <ToggleGroup.Item value='iso'>
            <TriangleRightIcon />
          </ToggleGroup.Item>
          <ToggleGroup.Item value='music'>
            <SpeakerLoudIcon />
          </ToggleGroup.Item>
        </ToggleGroup.Root>
        <DMDivider />
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
          <span>
            <FormattedMessage id="create.page" />
          </span>
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
