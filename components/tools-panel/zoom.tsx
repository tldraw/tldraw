import { ZoomInIcon, ZoomOutIcon } from '@radix-ui/react-icons'
import { IconButton } from 'components/shared'
import state, { useSelector } from 'state'
import styled from 'styles'
import { getCurrentCamera } from 'utils'
import Tooltip from '../tooltip'

const zoomIn = () => state.send('ZOOMED_IN')
const zoomOut = () => state.send('ZOOMED_OUT')
const zoomToFit = () => state.send('ZOOMED_TO_FIT')
const zoomToActual = () => state.send('ZOOMED_TO_ACTUAL')

export default function Zoom(): JSX.Element {
  return (
    <Container size={{ '@sm': 'small' }}>
      <Tooltip label="Zoom Out">
        <IconButton onClick={zoomOut}>
          <ZoomOutIcon />
        </IconButton>
      </Tooltip>
      <Tooltip label="Zoom In">
        <IconButton onClick={zoomIn}>
          <ZoomInIcon />
        </IconButton>
      </Tooltip>
      <Tooltip label="Reset Zoom">
        <ZoomCounter />
      </Tooltip>
    </Container>
  )
}

function ZoomCounter() {
  const zoom = useSelector((s) => getCurrentCamera(s.data).zoom)

  return (
    <ZoomButton
      onClick={zoomToActual}
      onDoubleClick={zoomToFit}
      style={{ width: '44px' }}
    >
      {Math.round(zoom * 100)}%
    </ZoomButton>
  )
}

const ZoomButton = styled(IconButton, {
  fontSize: '$0',
  padding: 8,
})

const Container = styled('div', {
  position: 'absolute',
  left: 12,
  bottom: 64,
  backgroundColor: '$panel',
  borderRadius: '4px',
  overflow: 'hidden',
  alignSelf: 'flex-end',
  pointerEvents: 'all',
  userSelect: 'none',
  zIndex: 200,
  border: '1px solid $panel',
  boxShadow: '0px 2px 4px rgba(0,0,0,.12)',
  display: 'flex',
  padding: 4,
  flexDirection: 'column',
  alignItems: 'center',

  '& svg': {
    strokeWidth: 0,
  },

  variants: {
    size: {
      small: {
        bottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
      },
    },
  },
})
