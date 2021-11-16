import * as React from 'react'
import { styled } from '~styles'
import type { TDSnapshot } from '~types'
import { useTldrawApp } from '~hooks'
import { RowButton } from '~components/RowButton'
import { MenuContent } from '~components/MenuContent'

const isEmptyCanvasSelector = (s: TDSnapshot) =>
  Object.keys(s.document.pages[s.appState.currentPageId].shapes).length > 0 &&
  s.appState.isEmptyCanvas

export const BackToContent = React.memo(function BackToContent() {
  const app = useTldrawApp()

  const isEmptyCanvas = app.useStore(isEmptyCanvasSelector)

  if (!isEmptyCanvas) return null

  return (
    <BackToContentContainer>
      <RowButton onClick={app.zoomToContent}>Back to content</RowButton>
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
