import { IconButton } from 'components/shared'
import { strokes } from 'state/shape-styles'
import { ColorStyle } from 'types'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Square } from 'react-feather'
import { DropdownContent } from '../shared'
import { memo } from 'react'
import state from 'state'

function handleColorChange(
  e: Event & { currentTarget: { value: ColorStyle } }
): void {
  state.send('CHANGED_STYLE', { color: e.currentTarget.value })
}

function ColorContent(): JSX.Element {
  return (
    <DropdownContent sideOffset={8} side="bottom">
      {Object.keys(strokes).map((color: ColorStyle) => (
        <DropdownMenu.DropdownMenuItem
          as={IconButton}
          key={color}
          title={color}
          value={color}
          onSelect={handleColorChange}
        >
          <Square fill={strokes[color]} stroke="none" size="22" />
        </DropdownMenu.DropdownMenuItem>
      ))}
    </DropdownContent>
  )
}

export default memo(ColorContent)
