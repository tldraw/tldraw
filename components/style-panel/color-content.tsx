import { IconButton } from 'components/shared'
import { strokes } from 'lib/shape-styles'
import { ColorStyle } from 'types'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Square } from 'react-feather'
import styled from 'styles'
import { DropdownContent } from '../shared'

export default function ColorContent({
  onChange,
}: {
  onChange: (color: ColorStyle) => void
}) {
  return (
    <DropdownContent sideOffset={0} side="bottom">
      {Object.keys(strokes).map((color: ColorStyle) => (
        <DropdownMenu.DropdownMenuItem
          as={IconButton}
          key={color}
          title={color}
          onSelect={() => onChange(color)}
        >
          <Square fill={strokes[color]} stroke="none" size="22" />
        </DropdownMenu.DropdownMenuItem>
      ))}
    </DropdownContent>
  )
}
