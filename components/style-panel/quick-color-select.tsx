import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { IconButton } from 'components/shared'
import Tooltip from 'components/tooltip'
import { strokes } from 'lib/shape-styles'
import { Square } from 'react-feather'
import state, { useSelector } from 'state'
import ColorContent from './color-content'

export default function QuickColorSelect() {
  const color = useSelector((s) => s.values.selectedStyle.color)

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger as={IconButton}>
        <Tooltip label="Color">
          <Square fill={strokes[color]} stroke={strokes[color]} />
        </Tooltip>
      </DropdownMenu.Trigger>
      <ColorContent
        onChange={(color) => state.send('CHANGED_STYLE', { color })}
      />
    </DropdownMenu.Root>
  )
}
