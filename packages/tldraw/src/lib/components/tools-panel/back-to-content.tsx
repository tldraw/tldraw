import * as React from 'react'
import { FloatingContainer, RowButton } from '../shared'
import styled from '../../styles'
import { Data } from '../../state2'
import { useTLDrawContext } from '../../hooks'

const isEmptyCanvasSelector = (s: Data) => s.appState.isEmptyCanvas

export const BackToContent = React.memo(() => {
  const { tlstate, useAppState } = useTLDrawContext()

  const isEmptyCanvas = useAppState(isEmptyCanvasSelector)

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
