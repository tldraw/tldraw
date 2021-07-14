import { TertiaryButton, TertiaryButtonsContainer } from './shared'
import { Undo, Redo, Trash } from 'components/icons'
import state from 'state'
import { commandKey } from 'utils'

const undo = () => state.send('UNDO')
const redo = () => state.send('REDO')
const clear = () => state.send('CLEARED_PAGE')

export default function UndoRedo(): JSX.Element {
  return (
    <TertiaryButtonsContainer bp={{ '@initial': 'mobile', '@sm': 'small' }}>
      <TertiaryButton label="Undo" kbd={`${commandKey()}Z`} onClick={undo}>
        <Undo />
      </TertiaryButton>
      <TertiaryButton label="Redo" kbd={`${commandKey()}⇧Z`} onClick={redo}>
        <Redo />
      </TertiaryButton>
      <TertiaryButton label="Delete" kbd="⌫" onClick={clear}>
        <Trash />
      </TertiaryButton>
    </TertiaryButtonsContainer>
  )
}
