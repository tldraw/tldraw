import * as React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { strokes } from '~state/shapes/shared/shape-styles'
import { useTldrawApp } from '~hooks'
import { DMContent, DMTriggerIcon } from '~components/DropdownMenu'
import { BoxIcon, CircleIcon } from '~components/icons'
import { ToolButton } from '~components/ToolButton'
import type { TldrawSnapshot, ColorStyle } from '~types'

const selectColor = (s: TldrawSnapshot) => s.appState.selectedStyle.color
const preventEvent = (e: Event) => e.preventDefault()
const themeSelector = (data: TldrawSnapshot) => (data.settings.isDarkMode ? 'dark' : 'light')

export const ColorMenu = React.memo(function ColorMenu(): JSX.Element {
  const app = useTldrawApp()

  const theme = app.useStore(themeSelector)
  const color = app.useStore(selectColor)

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
              onClick={() => app.style({ color: colorStyle as ColorStyle })}
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
