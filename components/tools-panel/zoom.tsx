import { ZoomInIcon, ZoomOutIcon } from '@radix-ui/react-icons'
import { IconButton } from 'components/shared'
import state, { useSelector } from 'state'
import styled from 'styles'

const zoomIn = () => state.send('ZOOMED_IN')
const zoomOut = () => state.send('ZOOMED_OUT')
const zoomToFit = () => state.send('ZOOMED_TO_FIT')
const zoomToActual = () => state.send('ZOOMED_TO_ACTUAL')

export default function Zoom() {
  return (
    <Container size={{ '@sm': 'small' }}>
      <IconButton onClick={zoomOut}>
        <ZoomOutIcon />
      </IconButton>
      <IconButton onClick={zoomIn}>
        <ZoomInIcon />
      </IconButton>
      <ZoomCounter />
    </Container>
  )
}

function ZoomCounter() {
  const camera = useSelector((s) => s.data.camera)
  return (
    <ZoomButton onClick={zoomToActual} onDoubleClick={zoomToFit}>
      {Math.round(camera.zoom * 100)}%
    </ZoomButton>
  )
}

const Container = styled('div', {
  position: 'absolute',
  left: 12,
  bottom: 64,
  backgroundColor: '$panel',
  borderRadius: '4px',
  overflow: 'hidden',
  alignSelf: 'flex-end',
  border: '1px solid $border',
  pointerEvents: 'all',
  userSelect: 'none',
  zIndex: 200,
  boxShadow: '0px 2px 12px rgba(0,0,0,.08)',
  display: 'flex',
  padding: 4,

  '& svg': {
    strokeWidth: 0,
  },

  variants: {
    size: {
      small: {
        bottom: 12,
      },
    },
  },
})

const ZoomButton = styled(IconButton, {
  fontSize: '$0',
  padding: 8,
  width: 44,
})
