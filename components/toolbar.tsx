import state, { useSelector } from 'state'
import styled from 'styles'
import { Lock, Menu, RotateCcw, RotateCw, Unlock } from 'react-feather'
import { IconButton } from './shared'

export default function Toolbar() {
  const activeTool = useSelector((state) =>
    state.whenIn({
      selecting: 'select',
      dot: 'dot',
      circle: 'circle',
      ellipse: 'ellipse',
      ray: 'ray',
      line: 'line',
      polyline: 'polyline',
      rectangle: 'rectangle',
      draw: 'draw',
    })
  )

  const isToolLocked = useSelector((s) => s.data.settings.isToolLocked)

  return (
    <ToolbarContainer>
      <Section>
        <Button>
          <Menu />
        </Button>
        <Button onClick={() => state.send('RESET_CAMERA')}>Reset Camera</Button>
      </Section>
      <Section>
        <Button title="Undo" onClick={() => state.send('UNDO')}>
          <RotateCcw />
        </Button>
        <Button title="Redo" onClick={() => state.send('REDO')}>
          <RotateCw />
        </Button>
      </Section>
    </ToolbarContainer>
  )
}

const ToolbarContainer = styled('div', {
  gridArea: 'toolbar',
  userSelect: 'none',
  borderBottom: '1px solid black',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: '$panel',
  gap: 8,
  fontSize: '$1',
  zIndex: 200,
})

const Section = styled('div', {
  whiteSpace: 'nowrap',
  overflowY: 'hidden',
  overflowX: 'auto',
  display: 'flex',
  scrollbarWidth: 'none',
  '&::-webkit-scrollbar': {
    '-webkit-appearance': 'none',
    width: 0,
    height: 0,
  },
})

const Button = styled('button', {
  display: 'flex',
  alignItems: 'center',
  cursor: 'pointer',
  font: '$ui',
  fontSize: '$ui',
  height: '40px',
  outline: 'none',
  borderRadius: 0,
  border: 'none',
  padding: '0 12px',
  background: 'none',
  '&:hover': {
    backgroundColor: '$hint',
  },
  '& svg': {
    height: 16,
    width: 16,
  },
  variants: {
    isSelected: {
      true: {
        color: '$selected',
      },
      false: {},
    },
  },
})
