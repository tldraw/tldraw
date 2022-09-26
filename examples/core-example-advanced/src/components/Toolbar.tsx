import * as React from 'react'
import { ArrowUpRight, Edit2, MousePointer, Square, X } from 'react-feather'
import { machine } from 'state/machine'
import styled from 'stitches.config'

interface ToolbarProps {
  activeStates: string[]
  lastEvent: string
}

const onToolSelect = (e: React.MouseEvent) => {
  machine.send('SELECTED_TOOL', { name: e.currentTarget.id })
}

const onReset = () => {
  machine.send('RESET')
}

export function Toolbar({ activeStates, lastEvent }: ToolbarProps) {
  return (
    <ToolbarContainer>
      <PrimaryTools>
        <PrimaryToolButton id="select" isActive={machine.isIn('select')} onClick={onToolSelect}>
          <Highlight>
            <MousePointer />
          </Highlight>
        </PrimaryToolButton>
        <PrimaryToolButton id="eraser" isActive={machine.isIn('eraser')} onClick={onToolSelect}>
          <Highlight>
            <X />
          </Highlight>
        </PrimaryToolButton>
        <PrimaryToolButton id="pencil" isActive={machine.isIn('pencil')} onClick={onToolSelect}>
          <Highlight>
            <Edit2 />
          </Highlight>
        </PrimaryToolButton>
        <PrimaryToolButton id="box" isActive={machine.isIn('box')} onClick={onToolSelect}>
          <Highlight>
            <Square />
          </Highlight>
        </PrimaryToolButton>
        <PrimaryToolButton id="arrow" isActive={machine.isIn('arrow')} onClick={onToolSelect}>
          <Highlight>
            <ArrowUpRight />
          </Highlight>
        </PrimaryToolButton>
      </PrimaryTools>
      <StatusBar>
        <div>
          <button onClick={onReset}>Reset</button>
          {activeStates
            .slice(1)
            .map((name) => {
              const state = name.split('.')
              return state[state.length - 1]
            })
            .join(' - ')}
        </div>
        <div>{lastEvent}</div>
      </StatusBar>
    </ToolbarContainer>
  )
}

const ToolbarContainer = styled('div', {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gridTemplateRows: 'auto auto',
  gridRowGap: '$5',
  position: 'fixed',
  bottom: '0',
  width: '100%',
  zIndex: '100',
})

const PrimaryTools = styled('div', {
  display: 'flex',
  width: 'fit-content',
  borderRadius: '100px',
  border: '1px solid $border',
  overflow: 'hidden',
  padding: '$2',
  justifySelf: 'center',
  backgroundColor: '$background',
})

const Highlight = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
  padding: 10,
  borderRadius: '100%',
  transition: 'background-color .025s',
})

const PrimaryToolButton = styled('button', {
  cursor: 'pointer',
  width: '40px',
  height: '40px',
  padding: 2,
  margin: 0,
  background: 'none',
  backgroundColor: 'none',
  border: 'none',
  color: '$text',

  variants: {
    isActive: {
      true: {
        color: '$background',
        [`& > ${Highlight}`]: {
          backgroundColor: '$text',
        },
      },
      false: {
        [`&:hover > ${Highlight}`]: {
          backgroundColor: '$hover',
        },
        '&:active': {
          color: '$background',
        },
        [`&:active > ${Highlight}`]: {
          backgroundColor: '$text',
        },
      },
    },
  },
})

const StatusBar = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 12px',
  borderTop: '1px solid $border',
  fontSize: '$1',
  fontWeight: '$1',
  backgroundColor: '$background',
  overflow: 'hidden',
  whiteSpace: 'nowrap',

  '& button': {
    background: 'none',
    border: '1px solid $text',
    borderRadius: 3,
    marginRight: '$3',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    cursor: 'pointer',
  },
})
