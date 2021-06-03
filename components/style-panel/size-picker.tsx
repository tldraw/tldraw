import { Group, Item } from '../shared'
import * as RadioGroup from '@radix-ui/react-radio-group'
import { ChangeEvent } from 'react'
import { Circle } from 'react-feather'
import state from 'state'
import { SizeStyle } from 'types'

function handleChange(e: ChangeEvent<HTMLInputElement>) {
  state.send('CHANGED_STYLE', {
    size: e.currentTarget.value as SizeStyle,
  })
}

export default function SizePicker({ size }: { size: SizeStyle }) {
  return (
    <Group name="width" onValueChange={handleChange}>
      <Item
        as={RadioGroup.Item}
        value={SizeStyle.Small}
        isActive={size === SizeStyle.Small}
      >
        <Circle size={6} />
      </Item>
      <Item
        as={RadioGroup.Item}
        value={SizeStyle.Medium}
        isActive={size === SizeStyle.Medium}
      >
        <Circle size={12} />
      </Item>
      <Item
        as={RadioGroup.Item}
        value={SizeStyle.Large}
        isActive={size === SizeStyle.Large}
      >
        <Circle size={22} />
      </Item>
    </Group>
  )
}
