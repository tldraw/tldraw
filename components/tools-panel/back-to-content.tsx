import { FloatingContainer, RowButton } from 'components/shared'
import { motion } from 'framer-motion'
import { memo } from 'react'
import state, { useSelector } from 'state'
import styled from 'styles'

function BackToContent() {
  const shouldDisplay = useSelector((s) => {
    const { currentShapes, shapesToRender } = s.values
    return currentShapes.length > 0 && shapesToRender.length === 0
  })

  if (!shouldDisplay) return null

  return (
    <BackToContentButton initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <RowButton onClick={() => state.send('ZOOMED_TO_CONTENT')}>
        Back to content
      </RowButton>
    </BackToContentButton>
  )
}

export default memo(BackToContent)

const BackToContentButton = styled(motion(FloatingContainer), {
  pointerEvents: 'all',
  width: 'fit-content',
  gridRow: 1,
  flexGrow: 2,
  display: 'block',
})
