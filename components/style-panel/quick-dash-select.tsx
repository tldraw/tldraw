import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { IconButton } from 'components/shared'
import Tooltip from 'components/tooltip'
import state, { useSelector } from 'state'
import { DashStyle } from 'types'
import {
  DropdownContent,
  Item,
  DashDottedIcon,
  DashSolidIcon,
  DashDashedIcon,
} from '../shared'

const dashes = {
  [DashStyle.Solid]: <DashSolidIcon />,
  [DashStyle.Dashed]: <DashDashedIcon />,
  [DashStyle.Dotted]: <DashDottedIcon />,
}

export default function QuickdashSelect() {
  const dash = useSelector((s) => s.values.selectedStyle.dash)

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        as={IconButton}
        bp={{ '@initial': 'mobile', '@sm': 'small' }}
      >
        <Tooltip label="Dash">{dashes[dash]}</Tooltip>
      </DropdownMenu.Trigger>
      <DropdownContent sideOffset={8} direction="vertical">
        <DashItem isActive={dash === DashStyle.Solid} dash={DashStyle.Solid} />
        <DashItem
          isActive={dash === DashStyle.Dashed}
          dash={DashStyle.Dashed}
        />
        <DashItem
          isActive={dash === DashStyle.Dotted}
          dash={DashStyle.Dotted}
        />
      </DropdownContent>
    </DropdownMenu.Root>
  )
}

function DashItem({ dash, isActive }: { isActive: boolean; dash: DashStyle }) {
  return (
    <Item
      as={DropdownMenu.DropdownMenuItem}
      isActive={isActive}
      onSelect={() => state.send('CHANGED_STYLE', { dash })}
    >
      {dashes[dash]}
    </Item>
  )
}
