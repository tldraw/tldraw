import * as React from 'react'
import { TertiaryButton, TertiaryButtonsContainer } from './shared'
import { Undo, Redo, Trash } from '../icons'
import { state } from '../../state'

const undo = () => state.send('UNDO')
const redo = () => state.send('REDO')
const clear = () => state.send('DELETED_ALL')

export const UndoRedo = React.memo((): JSX.Element => {
  return (
    <TertiaryButtonsContainer bp={{ '@initial': 'mobile', '@sm': 'small' }}>
      <TertiaryButton label="Undo" kbd="#Z" onClick={undo}>
        <Undo />
      </TertiaryButton>
      <TertiaryButton label="Redo" kbd="#⇧" onClick={redo}>
        <Redo />
      </TertiaryButton>
      <TertiaryButton label="Delete" kbd="⌫" onClick={clear}>
        <Trash />
      </TertiaryButton>
    </TertiaryButtonsContainer>
  )
})
