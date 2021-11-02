import * as React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { BoxIcon, dropdownItem, dropdownContent } from '~components/style-panel/styled'
import { strokes } from '~shape-utils'
import { useTheme, useTLDrawContext } from '~hooks'
import type { Data, ColorStyle } from '~types'
import { breakpoints, CircleIcon, toolButton, toolButtonInner } from '~components'

const selectColor = (s: Data) => s.appState.selectedStyle.color

export const ColorMenu = React.memo((): JSX.Element => {
  const { theme } = useTheme()
  const { tlstate, useSelector } = useTLDrawContext()

  const color = useSelector(selectColor)

  const handleColorChange = React.useCallback(
    (color) => tlstate.style({ color: color as ColorStyle }),
    [tlstate]
  )

  return (
    <DropdownMenu.Root dir="ltr">
      <DropdownMenu.Trigger asChild>
        <button className={toolButton({ isActive: false, bp: breakpoints })}>
          <div
            className={toolButtonInner({
              bp: breakpoints,
            })}
          >
            <CircleIcon size={16} fill={strokes[theme][color]} stroke={strokes[theme][color]} />
          </div>
        </button>
      </DropdownMenu.Trigger>
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
