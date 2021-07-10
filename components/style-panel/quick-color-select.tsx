import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { breakpoints, IconButton } from 'components/shared'
import Tooltip from 'components/tooltip'
import { fills, strokes } from 'state/shape-styles'
import { useSelector } from 'state'
import ColorContent from './color-content'
import { BoxIcon } from '../shared'
import useTheme from 'hooks/useTheme'

export default function QuickColorSelect(): JSX.Element {
  const color = useSelector((s) => s.values.selectedStyle.color)
  const { theme } = useTheme()

  return (
    <DropdownMenu.Root dir="ltr">
      <DropdownMenu.Trigger as={IconButton} bp={breakpoints}>
        <Tooltip label="Color">
          <BoxIcon fill={fills[theme][color]} stroke={strokes[theme][color]} />
        </Tooltip>
      </DropdownMenu.Trigger>
      <ColorContent />
    </DropdownMenu.Root>
  )
}
