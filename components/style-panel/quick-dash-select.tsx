import React, { memo } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { DropdownMenuIconTriggerButton } from 'components/shared'
import state, { useSelector } from 'state'
import { DashStyle } from 'types'
import {
  DashDrawIcon,
  DashDottedIcon,
  DashSolidIcon,
  DashDashedIcon,
  StyleDropdownContent,
  StyleDropdownItem,
} from './shared'

const dashes = {
  [DashStyle.Draw]: <DashDrawIcon />,
  [DashStyle.Solid]: <DashSolidIcon />,
  [DashStyle.Dashed]: <DashDashedIcon />,
  [DashStyle.Dotted]: <DashDottedIcon />,
}

function changeDashStyle(dash: DashStyle): void {
  state.send('CHANGED_STYLE', { dash })
}

function QuickdashSelect(): JSX.Element {
  const dash = useSelector((s) => s.values.selectedStyle.dash)

  return (
    <DropdownMenu.Root dir="ltr">
      <DropdownMenuIconTriggerButton label="Dash">
        {dashes[dash]}
      </DropdownMenuIconTriggerButton>
      <DropdownMenu.Content
        as={StyleDropdownContent}
        sideOffset={8}
        direction="vertical"
      >
        <DropdownMenu.DropdownMenuRadioGroup
          value={dash}
          onValueChange={changeDashStyle}
        >
          {Object.keys(DashStyle).map((dashStyle: DashStyle) => (
            <DropdownMenu.DropdownMenuRadioItem
              as={StyleDropdownItem}
              key={dashStyle}
              isActive={dash === dashStyle}
              value={dashStyle}
            >
              {dashes[dashStyle]}
            </DropdownMenu.DropdownMenuRadioItem>
          ))}
        </DropdownMenu.DropdownMenuRadioGroup>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}

export default memo(QuickdashSelect)
