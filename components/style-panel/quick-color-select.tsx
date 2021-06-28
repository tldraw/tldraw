import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { breakpoints, IconButton } from 'components/shared'
import Tooltip from 'components/tooltip'
import { strokes } from 'state/shape-styles'
import { Square } from 'react-feather'
import { useSelector } from 'state'
import ColorContent from './color-content'

export default function QuickColorSelect(): JSX.Element {
  const color = useSelector((s) => s.values.selectedStyle.color)

  return (
    <DropdownMenu.Root dir="ltr">
      <DropdownMenu.Trigger as={IconButton} bp={breakpoints}>
        <Tooltip label="Color">
          <Square fill={strokes[color]} stroke={strokes[color]} />
        </Tooltip>
      </DropdownMenu.Trigger>
      <ColorContent />
    </DropdownMenu.Root>
  )
}
