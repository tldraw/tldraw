import { IconButton } from 'components/shared'
import { strokes } from 'state/shape-styles'
import { ColorStyle } from 'types'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Square } from 'react-feather'
import { DropdownContent } from '../shared'
import { memo } from 'react'
import state from 'state'
import useTheme from 'hooks/useTheme'

function handleColorChange(color: ColorStyle): void {
  state.send('CHANGED_STYLE', { color })
}

function ColorContent({ color }: { color: ColorStyle }): JSX.Element {
  const { theme } = useTheme()

  return (
    <DropdownMenu.DropdownMenuRadioGroup
      value={color}
      as={DropdownContent}
      onValueChange={handleColorChange}
      sideOffset={8}
    >
      {Object.keys(strokes[theme]).map((colorStyle: ColorStyle) => (
        <DropdownMenu.DropdownMenuRadioItem
          as={IconButton}
          key={colorStyle}
          title={colorStyle}
          value={colorStyle}
        >
          <Square fill={strokes[theme][colorStyle]} stroke="none" size="22" />
        </DropdownMenu.DropdownMenuRadioItem>
      ))}
    </DropdownMenu.DropdownMenuRadioGroup>
  )
}

export default memo(ColorContent)
