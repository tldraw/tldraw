import * as React from 'react'
import { styled } from '~styles'
import type { TLDrawSnapshot } from '~types'
import { useTLDrawContext } from '~hooks'
import { RowButton } from '~components/RowButton'
import { MenuContent } from '~components/MenuContent'

const isEmptyCanvasSelector = (s: TLDrawSnapshot) =>
  Object.keys(s.document.pages[s.appState.currentPageId].shapes).length > 0 &&
  s.appState.isEmptyCanvas

export const BackToContent = React.memo(function BackToContent() {
  const { state, useSelector } = useTLDrawContext()

  const isEmptyCanvas = useSelector(isEmptyCanvasSelector)

  if (!isEmptyCanvas) return null

  return (
    <BackToContentContainer>
      <RowButton onSelect={state.zoomToContent}>Back to content</RowButton>
    </BackToContentContainer>
  )
})

const BackToContentContainer = styled(MenuContent, {
  pointerEvents: 'all',
  width: 'fit-content',
  minWidth: 0,
  gridRow: 1,
  flexGrow: 2,
  display: 'block',
})
