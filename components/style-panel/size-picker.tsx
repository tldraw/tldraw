import { Group, Item } from '../shared'
import * as RadioGroup from '@radix-ui/react-radio-group'
import { Circle } from 'react-feather'
import state, { useSelector } from 'state'
import { SizeStyle } from 'types'
import { memo } from 'react'

const sizes = {
  [SizeStyle.Small]: 6,
  [SizeStyle.Medium]: 12,
  [SizeStyle.Large]: 22,
}

function handleChange(size: string) {
  state.send('CHANGED_STYLE', { size })
}

function SizePicker(): JSX.Element {
  const size = useSelector((s) => s.values.selectedStyle.size)

  return (
    <Group name="width" onValueChange={handleChange}>
      {Object.keys(SizeStyle).map((sizeStyle: SizeStyle) => (
        <RadioGroup.Item
          key={sizeStyle}
          as={Item}
          isActive={size === sizeStyle}
          value={sizeStyle}
        >
          <Circle size={sizes[sizeStyle]} />
        </RadioGroup.Item>
      ))}
    </Group>
  )
}

export default memo(SizePicker)
