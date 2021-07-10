import { TertiaryButton, TertiaryButtonsContainer } from './shared'
import { Undo, Redo, Trash } from 'components/icons'
import state from 'state'

const undo = () => state.send('UNDO')
const redo = () => state.send('REDO')
const clear = () => state.send('CLEARED_PAGE')

export default function UndoRedo(): JSX.Element {
  return (
    <TertiaryButtonsContainer>
      <TertiaryButton label="Undo" onClick={undo}>
        <Undo />
      </TertiaryButton>
      <TertiaryButton label="Redo" onClick={redo}>
        <Redo />
      </TertiaryButton>
      <TertiaryButton label="Delete" onClick={clear}>
        <Trash />
      </TertiaryButton>
    </TertiaryButtonsContainer>
  )
}
