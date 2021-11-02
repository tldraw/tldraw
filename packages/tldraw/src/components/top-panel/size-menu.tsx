import * as React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { CircleIcon } from '~components/icons'
import { dropdownContent, dropdownItem } from '~components/style-panel/styled'
import { Data, SizeStyle } from '~types'
import { useTLDrawContext } from '~hooks'
import { breakpoints, toolButton, toolButtonInner } from '~components'

const sizes = {
  [SizeStyle.Small]: 6,
  [SizeStyle.Medium]: 12,
  [SizeStyle.Large]: 22,
}

const selectSize = (s: Data) => s.appState.selectedStyle.size

export const SizeMenu = React.memo((): JSX.Element => {
  const { tlstate, useSelector } = useTLDrawContext()

  const size = useSelector(selectSize)

  const changeSizeStyle = React.useCallback(
    (size: string) => tlstate.style({ size: size as SizeStyle }),
    [tlstate]
  )

  return (
    <DropdownMenu.Root dir="ltr">
      <DropdownMenu.Trigger asChild>
        <button
          className={toolButton({
            bp: breakpoints,
            isActive: false,
          })}
        >
          <div
            className={toolButtonInner({
              bp: breakpoints,
            })}
          >
            <CircleIcon size={sizes[size]} stroke="none" fill="currentColor" />
          </div>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content sideOffset={8}>
        <DropdownMenu.DropdownMenuRadioGroup
          className={dropdownContent({ direction: 'vertical' })}
          value={size}
          onValueChange={changeSizeStyle}
        >
          {Object.keys(SizeStyle).map((sizeStyle: string) => (
            <DropdownMenu.DropdownMenuRadioItem
              key={sizeStyle}
              className={dropdownItem({ isActive: size === sizeStyle })}
              value={sizeStyle}
            >
              <CircleIcon size={sizes[sizeStyle as SizeStyle]} />
            </DropdownMenu.DropdownMenuRadioItem>
          ))}
        </DropdownMenu.DropdownMenuRadioGroup>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
})
