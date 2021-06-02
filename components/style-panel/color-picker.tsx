import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { strokes } from 'lib/shape-styles'
import { ColorStyle } from 'types'
import { IconWrapper, RowButton } from './shared'
import { Square } from 'react-feather'
import ColorContent from './color-content'

interface Props {
  color: ColorStyle
  onChange: (color: ColorStyle) => void
}

export default function ColorPicker({ color, onChange }: Props) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger as={RowButton}>
        <label htmlFor="color">Color</label>
        <IconWrapper>
          <Square fill={strokes[color]} />
        </IconWrapper>
      </DropdownMenu.Trigger>
      <ColorContent onChange={onChange} />
    </DropdownMenu.Root>
  )
}
