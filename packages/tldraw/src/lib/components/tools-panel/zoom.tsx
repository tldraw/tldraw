import * as React from 'react'
import { ZoomInIcon, ZoomOutIcon } from '@radix-ui/react-icons'
import { TertiaryButton, TertiaryButtonsContainer } from './shared'
import { state, useSelector } from '../../state'

const zoomIn = () => state.send('ZOOMED_IN')
const zoomOut = () => state.send('ZOOMED_OUT')
const zoomToFit = () => state.send('ZOOMED_TO_FIT')
const zoomToActual = () => state.send('ZOOMED_TO_ACTUAL')

export const Zoom = React.memo((): JSX.Element => {
  return (
    <TertiaryButtonsContainer bp={{ '@initial': 'mobile', '@sm': 'small' }}>
      <TertiaryButton label="Zoom Out" kbd={`#−`} onClick={zoomOut}>
        <ZoomOutIcon />
      </TertiaryButton>
      <TertiaryButton label="Zoom In" kbd={`#+`} onClick={zoomIn}>
        <ZoomInIcon />
      </TertiaryButton>
      <ZoomCounter />
    </TertiaryButtonsContainer>
  )
})

function ZoomCounter() {
  const zoom = useSelector((s) => s.data.pageState.camera.zoom)

  return (
    <TertiaryButton label="Reset Zoom" kbd="⇧0" onClick={zoomToActual} onDoubleClick={zoomToFit}>
      {Math.round(zoom * 100)}%
    </TertiaryButton>
  )
}
