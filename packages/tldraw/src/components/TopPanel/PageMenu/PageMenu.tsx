import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { CheckIcon, PlusIcon } from '@radix-ui/react-icons'
import * as React from 'react'
import { FormattedMessage, useIntl } from 'react-intl'
import { Divider } from '~components/Primitives/Divider'
import { DMContent } from '~components/Primitives/DropdownMenu'
import { RowButton } from '~components/Primitives/RowButton'
import { SmallIcon } from '~components/Primitives/SmallIcon'
import { ToolButton } from '~components/Primitives/ToolButton'
import { useTldrawApp } from '~hooks'
import { styled } from '~styles'
import type { TDSnapshot } from '~types'
import { PageOptionsDialog } from '../PageOptionsDialog'

const sortedSelector = (s: TDSnapshot) =>
  Object.values(s.document.pages).sort((a, b) => (a.childIndex || 0) - (b.childIndex || 0))

const currentPageNameSelector = (s: TDSnapshot) => s.document.pages[s.appState.currentPageId].name

const currentPageIdSelector = (s: TDSnapshot) => s.document.pages[s.appState.currentPageId].id

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
  const currentPageName = app.useStore(currentPageNameSelector)

  return (
    <DropdownMenu.Root dir="ltr" open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenu.Trigger dir="ltr" asChild id="TD-Page">
        <ToolButton variant="text">{currentPageName || 'Page'}</ToolButton>
      </DropdownMenu.Trigger>
      <DMContent variant="menu" align="start" sideOffset={4}>
        {isOpen && <PageMenuContent onClose={handleClose} />}
      </DMContent>
    </DropdownMenu.Root>
  )
}

function PageMenuContent({ onClose }: { onClose: () => void }) {
  const app = useTldrawApp()
  const intl = useIntl()

  const sortedPages = app.useStore(sortedSelector)

  const currentPageId = app.useStore(currentPageIdSelector)

  const handleCreatePage = React.useCallback(() => {
    const pageName =
      intl.formatMessage({ id: 'page' }) + ' ' + (Object.keys(app.document.pages).length + 1)
    app.createPage(undefined, pageName)
  }, [app])

  const handleChangePage = React.useCallback(
    (id: string) => {
      onClose()
      app.changePage(id)
    },
    [app]
  )

  const [dragId, setDragId] = React.useState<null | string>(null)

  const [dropIndex, setDropIndex] = React.useState<null | number>(null)

  const handleDragStart = React.useCallback((ev: React.DragEvent<HTMLDivElement>) => {
    setDragId(ev.currentTarget.id)
    setDropIndex(sortedPages.findIndex((p) => p.id === ev.currentTarget.id))
    ev.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDrag = React.useCallback(
    (ev: React.DragEvent<HTMLDivElement>) => {
      ev.preventDefault()

      let dropIndex = sortedPages.findIndex((p) => p.id === ev.currentTarget.id)

      const rect = ev.currentTarget.getBoundingClientRect()
      const ny = (ev.clientY - rect.top) / rect.height

      dropIndex = ny < 0.5 ? dropIndex : dropIndex + 1

      setDropIndex(dropIndex)
    },
    [dragId, sortedPages]
  )

  const handleDrop = React.useCallback(() => {
    if (dragId !== null && dropIndex !== null) {
      app.movePage(dragId, dropIndex)
    }

    setDragId(null)
    setDropIndex(null)
  }, [dragId, dropIndex])

  return (
    <>
      <DropdownMenu.RadioGroup dir="ltr" value={currentPageId} onValueChange={handleChangePage}>
        {sortedPages.map((page, i) => (
          <ButtonWithOptions
            key={page.id}
            isDropAbove={i === dropIndex && i === 0}
            isDropBelow={dropIndex !== null && i === dropIndex - 1}
          >
            <DropdownMenu.RadioItem
              title={page.name || 'Page'}
              value={page.id}
              key={page.id}
              id={page.id}
              asChild
              onDragOver={handleDrag}
              onDragStart={handleDragStart}
              // onDrag={handleDrag}
              onDrop={handleDrop}
              draggable={true}
            >
              <PageButton>
                <span id={page.id}>{page.name || 'Page'}</span>
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
      <Divider />
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
  position: 'relative',
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  gridAutoFlow: 'column',
  margin: 0,

  '& > *[data-shy="true"]': {
    opacity: 0,
  },

  '&:hover > *[data-shy="true"]': {
    opacity: 1,
  },

  variants: {
    isDropAbove: {
      true: {
        '&::after': {
          content: '',
          display: 'block',
          position: 'absolute',
          top: 0,
          width: '100%',
          height: '1px',
          backgroundColor: '$selected',
          zIndex: 999,
          pointerEvents: 'none',
        },
      },
    },
    isDropBelow: {
      true: {
        '&::after': {
          content: '',
          display: 'block',
          position: 'absolute',
          width: '100%',
          height: '1px',
          top: '100%',
          backgroundColor: '$selected',
          zIndex: 999,
          pointerEvents: 'none',
        },
      },
    },
  },
})

export const PageButton = styled(RowButton, {
  minWidth: 128,
})
