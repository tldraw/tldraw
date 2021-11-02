import * as React from 'react'
import { Tooltip, toolButtonInner } from '~components'
import { floatToolButton } from '~components/tools-panel/styled'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useTheme, useTLDrawContext } from '~hooks'
import { strokes } from '~shape-utils'
import css from '~styles'
import type { ColorStyle, Data } from '~types'
import { BoxIcon, dropdownContent, dropdownItem } from '~components/style-panel/styled'

const colorSelector = (s: Data) => s.appState.selectedStyle.color

export function ColorButton(): JSX.Element {
  const { tlstate, useSelector } = useTLDrawContext()

  const { theme } = useTheme()

  const color = useSelector(colorSelector)

  const handleColorChange = React.useCallback(
    (color) => tlstate.style({ color: color as ColorStyle }),
    [tlstate]
  )

  return (
    <DropdownMenu.Root dir="ltr">
      <Tooltip label="Lock Tool" kbd="7">
        <DropdownMenu.Trigger
          className={floatToolButton({
            bp: {
              '@initial': 'mobile',
              '@sm': 'small',
              '@md': 'medium',
              '@lg': 'large',
            },
            name: 'Lock Tool',
            isActive: false,
          })}
        >
          <div
            className={colorToolButtonInner({
              isActive: false,
            })}
          >
            <svg width={20} height={20} fill={strokes[theme][color]}>
              <circle cx={10} cy={10} r={10} />
            </svg>
          </div>
        </DropdownMenu.Trigger>
      </Tooltip>
      <DropdownMenu.Content sideOffset={8}>
        <DropdownMenu.DropdownMenuRadioGroup
          className={dropdownContent()}
          value={color as string}
          onValueChange={handleColorChange}
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
}

export const colorToolButtonInner = css(toolButtonInner, {
  borderRadius: '100%',
  border: '1px solid $panelBorder',
  variants: {
    isActive: {
      false: {},
    },
  },
})
