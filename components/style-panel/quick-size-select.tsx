import { memo } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { DropdownMenuIconTriggerButton } from 'components/shared'
import { Circle } from 'react-feather'
import state, { useSelector } from 'state'
import { SizeStyle } from 'types'
import { StyleDropdownContent, StyleDropdownItem } from './shared'

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
      <DropdownMenuIconTriggerButton label="Size">
        <Circle size={sizes[size]} stroke="none" fill="currentColor" />
      </DropdownMenuIconTriggerButton>
      <DropdownMenu.Content sideOffset={8}>
        <DropdownMenu.DropdownMenuRadioGroup
          as={StyleDropdownContent}
          direction="vertical"
          value={size}
          onValueChange={changeSizeStyle}
        >
          {Object.keys(SizeStyle).map((sizeStyle: SizeStyle) => (
            <DropdownMenu.DropdownMenuRadioItem
              key={sizeStyle}
              as={StyleDropdownItem}
              isActive={size === sizeStyle}
              value={sizeStyle}
            >
              <Circle size={sizes[sizeStyle]} />
            </DropdownMenu.DropdownMenuRadioItem>
          ))}
        </DropdownMenu.DropdownMenuRadioGroup>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}

export default memo(QuickSizeSelect)
