import * as React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { BoxIcon, dropdownItem, dropdownContent } from './styled'
import { DropdownMenuIconTriggerButton } from '../shared'
import { strokes } from '~shape'
import { useTheme, useTLDrawContext } from '~hooks'
import type { Data, ColorStyle } from '~types'

const selectColor = (s: Data) => s.appState.selectedStyle.color

export const QuickColorSelect = React.memo((): JSX.Element => {
  const { theme } = useTheme()
  const { tlstate, useSelector } = useTLDrawContext()

  const color = useSelector(selectColor)

  const handleColorChange = React.useCallback(
    (color) => tlstate.style({ color: color as ColorStyle }),
    [tlstate]
  )

  return (
    <DropdownMenu.Root dir="ltr">
      <DropdownMenuIconTriggerButton label="Color">
        <BoxIcon fill={strokes[theme][color]} stroke={strokes[theme][color]} />
      </DropdownMenuIconTriggerButton>
      <DropdownMenu.Content sideOffset={8}>
        <DropdownMenu.DropdownMenuRadioGroup
          value={color as string}
          onValueChange={handleColorChange}
          className={dropdownContent()}
        >
          {Object.keys(strokes[theme]).map((colorStyle: string) => (
            <DropdownMenu.DropdownMenuRadioItem
              className={dropdownItem()}
              key={colorStyle}
              title={colorStyle}
              value={colorStyle}
            >
              <BoxIcon
                fill={strokes[theme][colorStyle as ColorStyle]}
                stroke={strokes[theme][colorStyle as ColorStyle]}
              />
            </DropdownMenu.DropdownMenuRadioItem>
          ))}
        </DropdownMenu.DropdownMenuRadioGroup>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
})
