import * as React from 'react'
import { FloatingContainer, RowButton } from '../shared'
import styled from '../../styles'
import type { Data } from '../../state'
import { useTLDrawContext } from '../../hooks'

const isEmptyCanvasSelector = (s: Data) =>
  Object.keys(s.page.shapes).length > 0 && s.appState.isEmptyCanvas

export const BackToContent = React.memo(() => {
  const { tlstate, useSelector } = useTLDrawContext()

  const isEmptyCanvas = useSelector(isEmptyCanvasSelector)

  if (!isEmptyCanvas) return null

  return (
    <BackToContentButton>
      <RowButton onClick={tlstate.zoomToContent}>Back to content</RowButton>
    </BackToContentButton>
  )
})

const BackToContentButton = styled(FloatingContainer, {
  pointerEvents: 'all',
  width: 'fit-content',
  gridRow: 1,
  flexGrow: 2,
  display: 'block',
})
