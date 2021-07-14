import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { DropdownMenuIconTriggerButton } from 'components/shared'
import { strokes } from 'state/shape-styles'
import state, { useSelector } from 'state'
import { BoxIcon, StyleDropdownItem, StyleDropdownContent } from './shared'
import { useTheme } from 'next-themes'
import { ColorStyle } from 'types'

function handleColorChange(color: ColorStyle): void {
  state.send('CHANGED_STYLE', { color })
}

export default function QuickColorSelect(): JSX.Element {
  const color = useSelector((s) => s.values.selectedStyle.color)
  const { theme } = useTheme()

  return (
    <DropdownMenu.Root dir="ltr">
      <DropdownMenuIconTriggerButton label="Color">
        <BoxIcon fill={strokes[theme][color]} stroke={strokes[theme][color]} />
      </DropdownMenuIconTriggerButton>
      <DropdownMenu.Content
        as={StyleDropdownContent}
        sideOffset={8}
        direction="vertical"
      >
        <DropdownMenu.DropdownMenuRadioGroup
          value={color}
          onValueChange={handleColorChange}
        >
          {Object.keys(strokes[theme]).map((colorStyle: ColorStyle) => (
            <DropdownMenu.DropdownMenuRadioItem
              as={StyleDropdownItem}
              key={colorStyle}
              title={colorStyle}
              value={colorStyle}
            >
              <BoxIcon
                fill={strokes[theme][colorStyle]}
                stroke={strokes[theme][colorStyle]}
              />
            </DropdownMenu.DropdownMenuRadioItem>
          ))}
        </DropdownMenu.DropdownMenuRadioGroup>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}
