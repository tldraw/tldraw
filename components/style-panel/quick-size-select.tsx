import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { IconButton } from 'components/shared'
import { Circle } from 'react-feather'
import state, { useSelector } from 'state'
import { SizeStyle } from 'types'
import { DropdownContent, Item } from './shared'

const sizes = {
  [SizeStyle.Small]: 6,
  [SizeStyle.Medium]: 12,
  [SizeStyle.Large]: 22,
}

export default function QuickSizeSelect() {
  const size = useSelector((s) => s.values.selectedStyle.size)

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger as={IconButton} title="size">
        <Circle size={sizes[size]} stroke="none" fill="currentColor" />
      </DropdownMenu.Trigger>
      <DropdownContent direction="vertical">
        <SizeItem isActive={size === SizeStyle.Small} size={SizeStyle.Small} />
        <SizeItem
          isActive={size === SizeStyle.Medium}
          size={SizeStyle.Medium}
        />
        <SizeItem isActive={size === SizeStyle.Large} size={SizeStyle.Large} />
      </DropdownContent>
    </DropdownMenu.Root>
  )
}

function SizeItem({ size, isActive }: { isActive: boolean; size: SizeStyle }) {
  return (
    <Item
      as={DropdownMenu.DropdownMenuItem}
      isActive={isActive}
      onSelect={() => state.send('CHANGED_STYLE', { size })}
    >
      <Circle size={sizes[size]} />
    </Item>
  )
}
