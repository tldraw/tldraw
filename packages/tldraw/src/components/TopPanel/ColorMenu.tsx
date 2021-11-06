import * as React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { strokes } from '~shapes'
import { useTheme, useTLDrawContext } from '~hooks'
import type { Data, ColorStyle } from '~types'
import CircleIcon from '~components/icons/CircleIcon'
import { DMContent, DMTriggerIcon } from '~components/DropdownMenu'
import { BoxIcon } from '~components/icons'
import { ToolButton } from '~components/ToolButton'

const selectColor = (s: Data) => s.appState.selectedStyle.color
const preventEvent = (e: Event) => e.preventDefault()

export const ColorMenu = React.memo((): JSX.Element => {
  const { theme } = useTheme()
  const { tlstate, useSelector } = useTLDrawContext()

  const color = useSelector(selectColor)

  return (
    <DropdownMenu.Root dir="ltr">
      <DMTriggerIcon>
        <CircleIcon size={16} fill={strokes[theme][color]} stroke={strokes[theme][color]} />
      </DMTriggerIcon>
      <DMContent variant="grid">
        {Object.keys(strokes[theme]).map((colorStyle: string) => (
          <DropdownMenu.Item key={colorStyle} onSelect={preventEvent} asChild>
            <ToolButton
              variant="icon"
              isActive={color === colorStyle}
              onClick={() => tlstate.style({ color: colorStyle as ColorStyle })}
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
