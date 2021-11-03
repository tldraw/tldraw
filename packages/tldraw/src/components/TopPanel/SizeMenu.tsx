import * as React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Data, SizeStyle } from '~types'
import { useTLDrawContext } from '~hooks'
import { DMContent, DMTriggerIcon } from '~components/DropdownMenu'
import { ToolButton } from '~components/ToolButton'
import { SizeSmallIcon, SizeMediumIcon, SizeLargeIcon } from '~components/icons'
import { Tooltip } from '~components/Tooltip'

const sizes = {
  [SizeStyle.Small]: <SizeSmallIcon />,
  [SizeStyle.Medium]: <SizeMediumIcon />,
  [SizeStyle.Large]: <SizeLargeIcon />,
}

const selectSize = (s: Data) => s.appState.selectedStyle.size

export const SizeMenu = React.memo((): JSX.Element => {
  const { tlstate, useSelector } = useTLDrawContext()

  const size = useSelector(selectSize)

  return (
    <DropdownMenu.Root dir="ltr">
      <DMTriggerIcon>{sizes[size as SizeStyle]}</DMTriggerIcon>
      <DMContent>
        {Object.keys(SizeStyle).map((sizeStyle: string) => (
          <ToolButton
            key={sizeStyle}
            isActive={size === sizeStyle}
            onSelect={() => tlstate.style({ size: sizeStyle as SizeStyle })}
          >
            {sizes[sizeStyle as SizeStyle]}
          </ToolButton>
        ))}
      </DMContent>
    </DropdownMenu.Root>
  )
})
