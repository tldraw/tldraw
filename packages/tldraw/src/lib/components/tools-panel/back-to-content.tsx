import * as React from 'react'
import { FloatingContainer, RowButton } from '../shared'
import { state, useSelector } from '../../state'
import styled from '../../styles'

export const BackToContent = React.memo(() => {
  const isEmptyCanvas = useSelector((s) => s.data.appState.isEmptyCanvas)

  if (!isEmptyCanvas) return null

  return (
    <BackToContentButton>
      <RowButton onClick={() => state.send('ZOOMED_TO_CONTENT')}>Back to content</RowButton>
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
