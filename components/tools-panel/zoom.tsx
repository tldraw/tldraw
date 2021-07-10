import { ZoomInIcon, ZoomOutIcon } from '@radix-ui/react-icons'
import { TertiaryButton, TertiaryButtonsContainer } from './shared'
import state, { useSelector } from 'state'
import tld from 'utils/tld'

const zoomIn = () => state.send('ZOOMED_IN')
const zoomOut = () => state.send('ZOOMED_OUT')
const zoomToFit = () => state.send('ZOOMED_TO_FIT')
const zoomToActual = () => state.send('ZOOMED_TO_ACTUAL')

export default function Zoom(): JSX.Element {
  return (
    <TertiaryButtonsContainer>
      <TertiaryButton label="Zoom Out" onClick={zoomOut}>
        <ZoomOutIcon />
      </TertiaryButton>
      <TertiaryButton label="Zoom In" onClick={zoomIn}>
        <ZoomInIcon />
      </TertiaryButton>
      <ZoomCounter />
    </TertiaryButtonsContainer>
  )
}

function ZoomCounter() {
  const zoom = useSelector((s) => tld.getCurrentCamera(s.data).zoom)

  return (
    <TertiaryButton
      label="Reset Zoom"
      onClick={zoomToActual}
      onDoubleClick={zoomToFit}
    >
      {Math.round(zoom * 100)}%
    </TertiaryButton>
  )
}
