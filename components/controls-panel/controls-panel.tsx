/* eslint-disable @typescript-eslint/ban-ts-comment */
import styled from 'styles'
import React, { useRef } from 'react'
import state, { useSelector } from 'state'
import { X, Code } from 'react-feather'
import { breakpoints, IconButton } from 'components/shared'
import * as Panel from '../panel'
import Control from './control'
import { deepCompareArrays } from 'utils'

function openCodePanel() {
  state.send('CLOSED_CODE_PANEL')
}

function closeCodePanel() {
  state.send('OPENED_CODE_PANEL')
}

const stopKeyboardPropagation = (e: KeyboardEvent | React.KeyboardEvent) =>
  e.stopPropagation()

export default function ControlPanel(): JSX.Element {
  const rContainer = useRef<HTMLDivElement>(null)
  const isOpen = useSelector((s) => Object.keys(s.data.codeControls).length > 0)
  const codeControls = useSelector(
    (state) => Object.keys(state.data.codeControls),
    deepCompareArrays
  )

  return (
    <Panel.Root
      ref={rContainer}
      dir="ltr"
      data-bp-desktop
      variant="controls"
      isOpen={isOpen}
      onKeyDown={stopKeyboardPropagation}
      onKeyUp={stopKeyboardPropagation}
    >
      {isOpen ? (
        <Panel.Layout>
          <Panel.Header>
            <IconButton bp={breakpoints} size="small" onClick={closeCodePanel}>
              <X />
            </IconButton>
            <h3>Controls</h3>
          </Panel.Header>
          <ControlsList>
            {codeControls.map((id) => (
              <Control key={id} id={id} />
            ))}
          </ControlsList>
        </Panel.Layout>
      ) : (
        <IconButton bp={breakpoints} size="small" onClick={openCodePanel}>
          <Code />
        </IconButton>
      )}
    </Panel.Root>
  )
}

const ControlsList = styled(Panel.Content, {
  padding: 12,
  display: 'grid',
  gridTemplateColumns: '1fr 4fr',
  gridAutoRows: '24px',
  alignItems: 'center',
  gridColumnGap: '8px',
  gridRowGap: '8px',

  '& input': {
    font: '$ui',
    fontSize: '$1',
    border: '1px solid $inputBorder',
    backgroundColor: '$input',
    color: '$text',
    height: '100%',
    padding: '0px 6px',
  },
})
