import * as Checkbox from '@radix-ui/react-checkbox'
import tld from 'utils/tld'
import {
  breakpoints,
  BoxIcon,
  IsFilledFillIcon,
  IconButton,
  IconWrapper,
} from '../shared'
import state, { useSelector } from 'state'
import { getShapeUtils } from 'state/shape-utils'

function handleIsFilledChange(isFilled: boolean) {
  state.send('CHANGED_STYLE', { isFilled })
}

export default function IsFilledPicker(): JSX.Element {
  const isFilled = useSelector((s) => s.values.selectedStyle.isFilled)
  const canFill = useSelector((s) => {
    const selectedShapes = tld.getSelectedShapes(s.data)

    return (
      selectedShapes.length === 0 ||
      selectedShapes.every((shape) => getShapeUtils(shape).canStyleFill)
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
      <IconWrapper>
        <BoxIcon />
        <Checkbox.Indicator as={IsFilledFillIcon} />
      </IconWrapper>
    </Checkbox.Root>
  )
}
