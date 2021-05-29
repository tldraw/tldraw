import * as RadioGroup from '@radix-ui/react-radio-group'
import { ChangeEvent } from 'react'
import { Circle } from 'react-feather'
import state from 'state'
import styled from 'styles'

function setWidth(e: ChangeEvent<HTMLInputElement>) {
  state.send('CHANGED_STYLE', {
    strokeWidth: Number(e.currentTarget.value),
  })
}

export default function WidthPicker({
  strokeWidth = 2,
}: {
  strokeWidth?: number
}) {
  return (
    <Group name="width" onValueChange={setWidth}>
      <RadioItem value="2" isActive={strokeWidth === 2}>
        <Circle size={6} />
      </RadioItem>
      <RadioItem value="4" isActive={strokeWidth === 4}>
        <Circle size={12} />
      </RadioItem>
      <RadioItem value="8" isActive={strokeWidth === 8}>
        <Circle size={22} />
      </RadioItem>
    </Group>
  )
}

const Group = styled(RadioGroup.Root, {
  display: 'flex',
})

const RadioItem = styled(RadioGroup.Item, {
  height: '32px',
  width: '32px',
  backgroundColor: '$panel',
  borderRadius: '4px',
  padding: '0',
  margin: '0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  outline: 'none',
  border: 'none',
  pointerEvents: 'all',
  cursor: 'pointer',

  '&:hover:not(:disabled)': {
    backgroundColor: '$hover',
    '& svg': {
      fill: '$text',
      strokeWidth: '0',
    },
  },

  '&:disabled': {
    opacity: '0.5',
  },

  variants: {
    isActive: {
      true: {
        '& svg': {
          fill: '$text',
          strokeWidth: '0',
        },
      },
      false: {
        '& svg': {
          fill: '$inactive',
          strokeWidth: '0',
        },
      },
    },
  },
})
