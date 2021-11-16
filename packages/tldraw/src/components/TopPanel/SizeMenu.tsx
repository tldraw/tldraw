import * as React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { TldrawSnapshot, SizeStyle } from '~types'
import { useTldrawApp } from '~hooks'
import { DMContent, DMTriggerIcon } from '~components/DropdownMenu'
import { ToolButton } from '~components/ToolButton'
import { SizeSmallIcon, SizeMediumIcon, SizeLargeIcon } from '~components/icons'

const sizes = {
  [SizeStyle.Small]: <SizeSmallIcon />,
  [SizeStyle.Medium]: <SizeMediumIcon />,
  [SizeStyle.Large]: <SizeLargeIcon />,
}

const selectSize = (s: TldrawSnapshot) => s.appState.selectedStyle.size

const preventEvent = (e: Event) => e.preventDefault()

export const SizeMenu = React.memo(function SizeMenu(): JSX.Element {
  const app = useTldrawApp()

  const size = app.useStore(selectSize)

  return (
    <DropdownMenu.Root dir="ltr">
      <DMTriggerIcon>{sizes[size as SizeStyle]}</DMTriggerIcon>
      <DMContent variant="horizontal">
        {Object.values(SizeStyle).map((sizeStyle: string) => (
          <DropdownMenu.Item key={sizeStyle} onSelect={preventEvent} asChild>
            <ToolButton
              isActive={size === sizeStyle}
              variant="icon"
              onClick={() => state.style({ size: sizeStyle as SizeStyle })}
            >
              {sizes[sizeStyle as SizeStyle]}
            </ToolButton>
          </DropdownMenu.Item>
        ))}
      </DMContent>
    </DropdownMenu.Root>
  )
})
