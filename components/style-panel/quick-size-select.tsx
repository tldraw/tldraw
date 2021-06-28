import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { breakpoints, IconButton } from 'components/shared'
import Tooltip from 'components/tooltip'
import { memo } from 'react'
import { Circle } from 'react-feather'
import state, { useSelector } from 'state'
import { SizeStyle } from 'types'
import { DropdownContent, Item } from '../shared'

const sizes = {
  [SizeStyle.Small]: 6,
  [SizeStyle.Medium]: 12,
  [SizeStyle.Large]: 22,
}

function handleSizeChange(
  e: Event & { currentTarget: { value: SizeStyle } }
): void {
  state.send('CHANGED_STYLE', { size: e.currentTarget.value })
}

function QuickSizeSelect(): JSX.Element {
  const size = useSelector((s) => s.values.selectedStyle.size)

  return (
    <DropdownMenu.Root dir="ltr">
      <DropdownMenu.Trigger as={IconButton} bp={breakpoints}>
        <Tooltip label="Size">
          <Circle size={sizes[size]} stroke="none" fill="currentColor" />
        </Tooltip>
      </DropdownMenu.Trigger>
      <DropdownContent sideOffset={8} direction="vertical">
        {Object.keys(SizeStyle).map((sizeStyle: SizeStyle) => (
          <DropdownMenu.DropdownMenuItem
            key={sizeStyle}
            as={Item}
            isActive={size === sizeStyle}
            value={sizeStyle}
            onSelect={handleSizeChange}
          >
            <Circle size={sizes[sizeStyle]} />
          </DropdownMenu.DropdownMenuItem>
        ))}
      </DropdownContent>
    </DropdownMenu.Root>
  )
}

export default memo(QuickSizeSelect)
