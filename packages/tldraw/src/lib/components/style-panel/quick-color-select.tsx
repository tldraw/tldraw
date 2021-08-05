import * as React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { BoxIcon, StyleDropdownItem, StyleDropdownContent } from './shared'
import { DropdownMenuIconTriggerButton } from '../shared'
import { ColorStyle, strokes } from '../../shape'
import { useTheme } from '../../hooks/useTheme'
import { useTLDrawContext } from '../../hooks'
import { Data } from '../../state'

const selectColor = (data: Data) => data.appState.selectedStyle.color

export const QuickColorSelect = React.memo(
  (): JSX.Element => {
    const { theme } = useTheme()
    const { tlstate, useAppState } = useTLDrawContext()
    const color = useAppState(selectColor)

    const handleColorChange = React.useCallback(
      color => {
        tlstate.style({ color: color as ColorStyle })
      },
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
            as={StyleDropdownContent}
          >
            {Object.keys(strokes[theme]).map((colorStyle: string) => (
              <DropdownMenu.DropdownMenuRadioItem
                as={StyleDropdownItem}
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
)
