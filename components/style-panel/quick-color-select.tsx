import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { IconButton } from 'components/shared'
import { strokes } from 'lib/shape-styles'
import { Square } from 'react-feather'
import state, { useSelector } from 'state'
import ColorContent from './color-content'

export default function QuickColorSelect() {
  const color = useSelector((s) => s.values.selectedStyle.color)

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger as={IconButton} title="color">
        <Square fill={strokes[color]} stroke={strokes[color]} />
      </DropdownMenu.Trigger>
      <ColorContent
        onChange={(color) => state.send('CHANGED_STYLE', { color })}
      />
    </DropdownMenu.Root>
  )
}
