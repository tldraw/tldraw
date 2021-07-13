import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { breakpoints, IconButton } from 'components/shared'
import Tooltip from 'components/tooltip'
import React, { memo } from 'react'
import state, { useSelector } from 'state'
import { DashStyle } from 'types'
import {
  DropdownContent,
  Item,
  DashDrawIcon,
  DashDottedIcon,
  DashSolidIcon,
  DashDashedIcon,
} from '../shared'

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
      <DropdownMenu.Trigger as={IconButton} bp={breakpoints}>
        <Tooltip label="Dash">{dashes[dash]}</Tooltip>
      </DropdownMenu.Trigger>
      <DropdownMenu.DropdownMenuRadioGroup
        as={DropdownContent}
        sideOffset={8}
        direction="vertical"
        value={dash}
        onValueChange={changeDashStyle}
      >
        {Object.keys(DashStyle).map((dashStyle: DashStyle) => (
          <DropdownMenu.DropdownMenuRadioItem
            as={Item}
            key={dashStyle}
            isActive={dash === dashStyle}
            value={dashStyle}
          >
            {dashes[dashStyle]}
          </DropdownMenu.DropdownMenuRadioItem>
        ))}
      </DropdownMenu.DropdownMenuRadioGroup>
    </DropdownMenu.Root>
  )
}

export default memo(QuickdashSelect)
