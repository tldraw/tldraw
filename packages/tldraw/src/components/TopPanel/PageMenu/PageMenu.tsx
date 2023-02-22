import { CheckIcon } from '@radix-ui/react-icons'
import * as React from 'react'
import { FormattedMessage, useIntl } from 'react-intl'
import { Divider } from '~components/Primitives/Divider'
import { RowButton } from '~components/Primitives/RowButton'
import { SmallIcon } from '~components/Primitives/SmallIcon'
import { PlusIcon } from '~components/Primitives/icons/icoCommon'
import { useTldrawApp } from '~hooks'
import { styled } from '~styles'
import type { TDSnapshot } from '~types'
import { PageOptionsDialog } from '../PageOptionsDialog'

const sortedSelector = (s: TDSnapshot) =>
  Object.values(s.document.pages).sort((a, b) => (a.childIndex || 0) - (b.childIndex || 0))

const currentPageIdSelector = (s: TDSnapshot) => s.document.pages[s.appState.currentPageId].id

export function PageMenu() {
  return <PageMenuContent />
}

function PageMenuContent() {
  const app = useTldrawApp()
  const intl = useIntl()

  const sortedPages = app.useStore(sortedSelector)

  const currentPageId = app.useStore(currentPageIdSelector)

  const defaultPageName = intl.formatMessage({ id: 'page' })

  const handleCreatePage = React.useCallback(() => {
    const pageName = defaultPageName + ' ' + (Object.keys(app.document.pages).length + 1)
    app.createPage(undefined, pageName)
  }, [app])

  const handleChangePage = React.useCallback(
    (id: string) => {
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
      <StyledPageMenuScroll>
        {sortedPages.map((page, i) => (
          <ButtonWithOptions
            key={page.id}
            isDropAbove={i === dropIndex && i === 0}
            isDropBelow={dropIndex !== null && i === dropIndex - 1}
          >
            <div
              key={page.id}
              id={page.id}
              onDragOver={handleDrag}
              onDragStart={handleDragStart}
              // onDrag={handleDrag}
              onDrop={handleDrop}
              draggable={true}
            >
              <PageButton onClick={() => handleChangePage(page.id)}>
                <span id={page.id}>{page.name || defaultPageName}</span>
                {page.id === currentPageId ? (
                  <SmallIcon>
                    <CheckIcon />
                  </SmallIcon>
                ) : null}
              </PageButton>
            </div>
            <PageOptionsDialog page={page} />
          </ButtonWithOptions>
        ))}
      </StyledPageMenuScroll>
      <Divider />
      <RowButton onClick={handleCreatePage}>
        <span>
          <FormattedMessage id="create.page" />
        </span>
        <SmallIcon>
          <PlusIcon />
        </SmallIcon>
      </RowButton>
    </>
  )
}

const StyledPageMenuScroll = styled('div', {
  maxHeight: '96px',
  overflowY: 'auto',
  '&::-webkit-scrollbar': {
    width: '5px',
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: '#ebebeb',
    borderRadius: '10px',
  },
  '&::-webkit-scrollbar-thumb': {
    borderRadius: '10px',
    background: '#6d6d6d',
  },
})

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
