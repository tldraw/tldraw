import { Group, RadioItem } from './shared'
import { ChangeEvent } from 'react'
import { Circle } from 'react-feather'
import state from 'state'

function handleChange(e: ChangeEvent<HTMLInputElement>) {
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
    <Group name="width" onValueChange={handleChange}>
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
