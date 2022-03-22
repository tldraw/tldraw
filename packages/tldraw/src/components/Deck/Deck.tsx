import { CheckIcon, PlusIcon } from '@radix-ui/react-icons'
import { TLPageState } from '@tlslides/core'
import * as React from 'react'
import { TrashIcon } from '~components/Primitives/icons'
import { Panel } from '~components/Primitives/Panel'
import { RowButton } from '~components/Primitives/RowButton'
import { SmallIcon } from '~components/Primitives/SmallIcon'
import { ReadOnlyEditor } from '~components/ReadOnlyEditor'
import { PageButton } from '~components/TopPanel/PageMenu'
import { useTldrawApp } from '~hooks'
import { TLDR } from '~state/TLDR'
import { styled } from '~styles'
import { TDPage, TDSnapshot } from '~types'

const DECK_WIDTH = 200

const sortedSelector = (s: TDSnapshot) =>
  Object.values(s.document.pages).sort((a, b) => (a.childIndex || 0) - (b.childIndex || 0))

interface DeckProps {
  readOnly: boolean
  showPages: boolean
}

export const Deck = React.memo(function Deck({ readOnly }: DeckProps): JSX.Element {
  const app = useTldrawApp()
  const handleCreatePage = React.useCallback(() => {
    app.createPage()
  }, [app])

  const handleDeletePage = React.useCallback(() => {
    app.deletePage(app.currentPageId)
  }, [app])

  const boringPageState = React.useCallback(
    (pageId: string): TLPageState => {
      const camera = TLDR.getPageState(app.state, pageId).camera
      return {
        id: pageId,
        camera: {
          point: camera.point,
          zoom: (camera.zoom * 100) / (DECK_WIDTH * 4),
        },
        selectedIds: [],
      }
    },
    [app]
  )

  const sortedPages = app.useStore(sortedSelector)
  return (
    <StyledDeckContainer>
      <StyledCenterWrap id="TD-Deck">
        <StyledPanel side="lr" id="TD-DeckPanel">
          <StyledSlideStripContainer>
            {sortedPages.map((page) => (
              <ReadOnlyEditor key={page.id} page={page} pageState={boringPageState(page.id)} />
            ))}
            {/* <StyledAddSlide onClick={handleCreatePage}>
              <IconButton>
                <PlusIcon />
              </IconButton>
            </StyledAddSlide> */}
          </StyledSlideStripContainer>
          <StyledControls>
            <RowButton onClick={handleCreatePage}>
              <span>Add Slide</span>
              <SmallIcon>
                <PlusIcon />
              </SmallIcon>
            </RowButton>
            <RowButton onClick={handleDeletePage}>
              <span>Delete Slide</span>
              <SmallIcon>
                <TrashIcon />
              </SmallIcon>
            </RowButton>
          </StyledControls>
        </StyledPanel>
      </StyledCenterWrap>
    </StyledDeckContainer>
  )
})

const StyledDeckContainer = styled('div', {
  display: 'grid',
  position: 'absolute',
  top: 70,
  right: 0,
  justifyContent: 'flex-end',
  alignSelf: 'center',
  width: '100%',
  minWidth: 0,
  maxWidth: '100%',
  padding: '15 0',
  zIndex: 200,
  pointerEvents: 'none',
  '& > div > *': {
    pointerEvents: 'all',
  },
})

const StyledCenterWrap = styled('div', {
  gridRow: 1,
  gridColumn: 2,
  display: 'flex',
  width: 'fit-content',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
})

const StyledPanel = styled(Panel, {
  flexDirection: 'column',
  gap: '$3',
  width: DECK_WIDTH,
})

const StyledSlideStripContainer = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '$4',
  maxHeight: '70vh',
})

const StyledAddSlide = styled('div', {
  position: 'relative',
  display: 'flex',
  height: 140,
  width: 180,
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  borderRadius: '$3',
  boxSizing: 'border-box',
  outline: 'none',
  boxShadow: 'rgb(0 0 0 / 2%) 0px 1px 3px 0px, rgb(27 31 35 / 15%) 0px 0px 0px 1px',
})

const StyledControls = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '$2',
})
