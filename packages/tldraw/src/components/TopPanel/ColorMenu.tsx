import * as React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { strokes } from '~state/shapes/shape-styles'
import { useTLDrawContext } from '~hooks'
import { DMContent, DMTriggerIcon } from '~components/DropdownMenu'
import { BoxIcon, CircleIcon } from '~components/icons'
import { ToolButton } from '~components/ToolButton'
import type { TLDrawSnapshot, ColorStyle } from '~types'

const selectColor = (s: TLDrawSnapshot) => s.appState.selectedStyle.color
const preventEvent = (e: Event) => e.preventDefault()
const themeSelector = (data: TLDrawSnapshot) => (data.settings.isDarkMode ? 'dark' : 'light')

export const ColorMenu = React.memo(function ColorMenu(): JSX.Element {
  const { state, useSelector } = useTLDrawContext()

  const theme = useSelector(themeSelector)
  const color = useSelector(selectColor)

  return (
    <DropdownMenu.Root dir="ltr">
      <DMTriggerIcon>
        <CircleIcon size={18} fill={strokes[theme][color]} stroke={strokes[theme][color]} />
      </DMTriggerIcon>
      <DMContent variant="grid">
        {Object.keys(strokes[theme]).map((colorStyle: string) => (
          <DropdownMenu.Item key={colorStyle} onSelect={preventEvent} asChild>
            <ToolButton
              variant="icon"
              isActive={color === colorStyle}
              onClick={() => state.style({ color: colorStyle as ColorStyle })}
            >
              <BoxIcon
                fill={strokes[theme][colorStyle as ColorStyle]}
                stroke={strokes[theme][colorStyle as ColorStyle]}
              />
            </ToolButton>
          </DropdownMenu.Item>
        ))}
      </DMContent>
    </DropdownMenu.Root>
  )
})
