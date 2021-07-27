import * as React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { DropdownMenuIconTriggerButton } from '../shared'
import { state, useSelector } from '../../state'
import {
  DashDrawIcon,
  DashDottedIcon,
  DashSolidIcon,
  DashDashedIcon,
  StyleDropdownContent,
  StyleDropdownItem,
} from './shared'
import { DashStyle } from '../../shape'

const dashes = {
  [DashStyle.Draw]: <DashDrawIcon />,
  [DashStyle.Solid]: <DashSolidIcon />,
  [DashStyle.Dashed]: <DashDashedIcon />,
  [DashStyle.Dotted]: <DashDottedIcon />,
}

function changeDashStyle(dash: DashStyle): void {
  state.send('CHANGED_STYLE', { dash })
}

export const QuickDashSelect = React.memo((): JSX.Element => {
  const dash = useSelector((s) => s.values.selectedStyle.dash)

  return (
    <DropdownMenu.Root dir="ltr">
      <DropdownMenuIconTriggerButton label="Dash">{dashes[dash]}</DropdownMenuIconTriggerButton>
      <DropdownMenu.Content sideOffset={8}>
        <DropdownMenu.DropdownMenuRadioGroup
          as={StyleDropdownContent}
          direction="vertical"
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
})
