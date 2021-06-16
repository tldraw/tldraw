import {
  Group,
  Item,
  DashDashedIcon,
  DashDottedIcon,
  DashSolidIcon,
} from '../shared'
import * as RadioGroup from '@radix-ui/react-radio-group'
import { DashStyle } from 'types'
import state from 'state'

function handleChange(dash: string) {
  state.send('CHANGED_STYLE', { dash })
}

interface Props {
  dash: DashStyle
}

export default function DashPicker({ dash }: Props) {
  return (
    <Group name="Dash" onValueChange={handleChange}>
      <Item
        as={RadioGroup.RadioGroupItem}
        value={DashStyle.Solid}
        isActive={dash === DashStyle.Solid}
      >
        <DashSolidIcon />
      </Item>
      <Item
        as={RadioGroup.RadioGroupItem}
        value={DashStyle.Dashed}
        isActive={dash === DashStyle.Dashed}
      >
        <DashDashedIcon />
      </Item>
      <Item
        as={RadioGroup.RadioGroupItem}
        value={DashStyle.Dotted}
        isActive={dash === DashStyle.Dotted}
      >
        <DashDottedIcon />
      </Item>
    </Group>
  )
}
