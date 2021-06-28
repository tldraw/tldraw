import {
  Group,
  Item,
  DashDashedIcon,
  DashDottedIcon,
  DashSolidIcon,
} from '../shared'
import * as RadioGroup from '@radix-ui/react-radio-group'
import { DashStyle } from 'types'
import state, { useSelector } from 'state'
import { memo } from 'react'

function handleChange(dash: string) {
  state.send('CHANGED_STYLE', { dash })
}

const dashes = {
  [DashStyle.Solid]: <DashSolidIcon />,
  [DashStyle.Dashed]: <DashDashedIcon />,
  [DashStyle.Dotted]: <DashDottedIcon />,
}

function DashPicker(): JSX.Element {
  const dash = useSelector((s) => s.values.selectedStyle.dash)

  return (
    <Group name="Dash" onValueChange={handleChange}>
      {Object.keys(DashStyle).map((dashStyle: DashStyle) => (
        <RadioGroup.RadioGroupItem
          as={Item}
          key={dashStyle}
          isActive={dash === dashStyle}
          value={dashStyle}
        >
          {dashes[dashStyle]}
        </RadioGroup.RadioGroupItem>
      ))}
    </Group>
  )
}

export default memo(DashPicker)
