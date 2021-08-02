import * as React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { DropdownMenuIconTriggerButton, CircleIcon } from '../shared'
import { StyleDropdownContent, StyleDropdownItem } from './shared'
import { SizeStyle } from '../../shape'
import { Data } from '../../state'
import { useTLDrawContext } from '../../hooks'

const sizes = {
  [SizeStyle.Small]: 6,
  [SizeStyle.Medium]: 12,
  [SizeStyle.Large]: 22,
}

const selectSize = (data: Data) => data.appState.selectedStyle.size

export const QuickSizeSelect = React.memo((): JSX.Element => {
  const { tlstate, useAppState } = useTLDrawContext()

  const size = useAppState(selectSize)

  const changeSizeStyle = React.useCallback(
    (size: SizeStyle) => {
      tlstate.style({ size })
    },
    [tlstate],
  )

  return (
    <DropdownMenu.Root dir="ltr">
      <DropdownMenuIconTriggerButton label="Size">
        <CircleIcon size={sizes[size]} stroke="none" fill="currentColor" />
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
              <CircleIcon size={sizes[sizeStyle]} />
            </DropdownMenu.DropdownMenuRadioItem>
          ))}
        </DropdownMenu.DropdownMenuRadioGroup>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
})
