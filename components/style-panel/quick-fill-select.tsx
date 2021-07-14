import * as Checkbox from '@radix-ui/react-checkbox'
import tld from 'utils/tld'
import { breakpoints, IconButton, IconWrapper } from '../shared'
import { BoxIcon, IsFilledFillIcon } from './shared'
import state, { useSelector } from 'state'
import { getShapeUtils } from 'state/shape-utils'
import Tooltip from 'components/tooltip'

function handleIsFilledChange(isFilled: boolean) {
  state.send('CHANGED_STYLE', { isFilled })
}

export default function IsFilledPicker(): JSX.Element {
  const isFilled = useSelector((s) => s.values.selectedStyle.isFilled)
  const canFill = useSelector((s) => {
    const selectedShapes = tld.getSelectedShapes(s.data)

    return (
      selectedShapes.length === 0 ||
      selectedShapes.some((shape) => getShapeUtils(shape).canStyleFill)
    )
  })

  return (
    <Checkbox.Root
      dir="ltr"
      as={IconButton}
      bp={breakpoints}
      checked={isFilled}
      disabled={!canFill}
      onCheckedChange={handleIsFilledChange}
    >
      <Tooltip label="Fill">
        <IconWrapper>
          <BoxIcon />
          <Checkbox.Indicator>
            <IsFilledFillIcon />
          </Checkbox.Indicator>
        </IconWrapper>
      </Tooltip>
    </Checkbox.Root>
  )
}
