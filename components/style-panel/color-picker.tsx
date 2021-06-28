import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { strokes } from 'state/shape-styles'
import { RowButton, IconWrapper, breakpoints } from '../shared'
import { Square } from 'react-feather'
import ColorContent from './color-content'
import { memo } from 'react'
import { useSelector } from 'state'

function ColorPicker(): JSX.Element {
  const color = useSelector((s) => s.values.selectedStyle.color)

  return (
    <DropdownMenu.Root dir="ltr">
      <DropdownMenu.Trigger as={RowButton} bp={breakpoints}>
        <label htmlFor="color">Color</label>
        <IconWrapper>
          <Square fill={strokes[color]} />
        </IconWrapper>
      </DropdownMenu.Trigger>
      <ColorContent />
    </DropdownMenu.Root>
  )
}

export default memo(ColorPicker)
