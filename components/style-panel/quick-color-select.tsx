import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { breakpoints, IconButton } from 'components/shared'
import Tooltip from 'components/tooltip'
import { strokes } from 'state/shape-styles'
import state, { useSelector } from 'state'
import { BoxIcon, Item, DropdownContent } from '../shared'
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
      <DropdownMenu.Trigger as={IconButton} bp={breakpoints}>
        <Tooltip label="Color">
          <BoxIcon
            fill={strokes[theme][color]}
            stroke={strokes[theme][color]}
          />
        </Tooltip>
      </DropdownMenu.Trigger>

      <DropdownMenu.DropdownMenuRadioGroup
        value={color}
        as={DropdownContent}
        onValueChange={handleColorChange}
        sideOffset={8}
      >
        {Object.keys(strokes[theme]).map((colorStyle: ColorStyle) => (
          <DropdownMenu.DropdownMenuRadioItem
            as={Item}
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
    </DropdownMenu.Root>
  )
}
