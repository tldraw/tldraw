import { IconButton } from 'components/shared'
import { RotateCcw, RotateCw, Trash2 } from 'react-feather'
import state from 'state'
import styled from 'styles'
import Tooltip from '../tooltip'

const undo = () => state.send('UNDO')
const redo = () => state.send('REDO')
const clear = () => state.send('CLEARED_PAGE')

export default function UndoRedo(): JSX.Element {
  return (
    <Container size={{ '@sm': 'small' }}>
      <Tooltip label="Undo">
        <IconButton onClick={undo}>
          <RotateCcw />
        </IconButton>
      </Tooltip>
      <Tooltip label="Redo">
        <IconButton onClick={redo}>
          <RotateCw />
        </IconButton>
      </Tooltip>
      <Tooltip label="Clear Canvas">
        <IconButton onClick={clear}>
          <Trash2 />
        </IconButton>
      </Tooltip>
    </Container>
  )
}

const Container = styled('div', {
  position: 'absolute',
  bottom: 64,
  right: 12,
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

  '& svg': {
    height: 13,
    width: 13,
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
