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

function changeSizeStyle(size: SizeStyle): void {
  state.send('CHANGED_STYLE', { size })
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

      <DropdownMenu.DropdownMenuRadioGroup
        as={DropdownContent}
        sideOffset={8}
        direction="vertical"
        value={size}
        onValueChange={changeSizeStyle}
      >
        {Object.keys(SizeStyle).map((sizeStyle: SizeStyle) => (
          <DropdownMenu.DropdownMenuRadioItem
            key={sizeStyle}
            as={Item}
            isActive={size === sizeStyle}
            value={sizeStyle}
          >
            <Circle size={sizes[sizeStyle]} />
          </DropdownMenu.DropdownMenuRadioItem>
        ))}
      </DropdownMenu.DropdownMenuRadioGroup>
    </DropdownMenu.Root>
  )
}

export default memo(QuickSizeSelect)
