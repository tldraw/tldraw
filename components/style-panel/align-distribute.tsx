import {
  AlignBottomIcon,
  AlignCenterHorizontallyIcon,
  AlignCenterVerticallyIcon,
  AlignLeftIcon,
  AlignRightIcon,
  AlignTopIcon,
  SpaceEvenlyHorizontallyIcon,
  SpaceEvenlyVerticallyIcon,
  StretchHorizontallyIcon,
  StretchVerticallyIcon,
} from '@radix-ui/react-icons'
import { breakpoints, ButtonsRow, IconButton } from 'components/shared'
import { memo } from 'react'
import state from 'state'
import { AlignType, DistributeType, StretchType } from 'types'

function alignTop() {
  state.send('ALIGNED', { type: AlignType.Top })
}

function alignCenterVertical() {
  state.send('ALIGNED', { type: AlignType.CenterVertical })
}

function alignBottom() {
  state.send('ALIGNED', { type: AlignType.Bottom })
}

function stretchVertically() {
  state.send('STRETCHED', { type: StretchType.Vertical })
}

function distributeVertically() {
  state.send('DISTRIBUTED', { type: DistributeType.Vertical })
}

function alignLeft() {
  state.send('ALIGNED', { type: AlignType.Left })
}

function alignCenterHorizontal() {
  state.send('ALIGNED', { type: AlignType.CenterHorizontal })
}

function alignRight() {
  state.send('ALIGNED', { type: AlignType.Right })
}

function stretchHorizontally() {
  state.send('STRETCHED', { type: StretchType.Horizontal })
}

function distributeHorizontally() {
  state.send('DISTRIBUTED', { type: DistributeType.Horizontal })
}

function AlignDistribute({
  hasTwoOrMore,
  hasThreeOrMore,
}: {
  hasTwoOrMore: boolean
  hasThreeOrMore: boolean
}): JSX.Element {
  return (
    <>
      <ButtonsRow>
        <IconButton
          bp={breakpoints}
          size="small"
          disabled={!hasTwoOrMore}
          onClick={alignLeft}
        >
          <AlignLeftIcon />
        </IconButton>
        <IconButton
          bp={breakpoints}
          size="small"
          disabled={!hasTwoOrMore}
          onClick={alignCenterHorizontal}
        >
          <AlignCenterHorizontallyIcon />
        </IconButton>
        <IconButton
          bp={breakpoints}
          size="small"
          disabled={!hasTwoOrMore}
          onClick={alignRight}
        >
          <AlignRightIcon />
        </IconButton>
        <IconButton
          bp={breakpoints}
          size="small"
          disabled={!hasTwoOrMore}
          onClick={stretchHorizontally}
        >
          <StretchHorizontallyIcon />
        </IconButton>
        <IconButton
          bp={breakpoints}
          size="small"
          disabled={!hasThreeOrMore}
          onClick={distributeHorizontally}
        >
          <SpaceEvenlyHorizontallyIcon />
        </IconButton>
      </ButtonsRow>
      <ButtonsRow>
        <IconButton
          bp={breakpoints}
          size="small"
          disabled={!hasTwoOrMore}
          onClick={alignTop}
        >
          <AlignTopIcon />
        </IconButton>
        <IconButton
          bp={breakpoints}
          size="small"
          disabled={!hasTwoOrMore}
          onClick={alignCenterVertical}
        >
          <AlignCenterVerticallyIcon />
        </IconButton>
        <IconButton
          bp={breakpoints}
          size="small"
          disabled={!hasTwoOrMore}
          onClick={alignBottom}
        >
          <AlignBottomIcon />
        </IconButton>
        <IconButton
          bp={breakpoints}
          size="small"
          disabled={!hasTwoOrMore}
          onClick={stretchVertically}
        >
          <StretchVerticallyIcon />
        </IconButton>
        <IconButton
          bp={breakpoints}
          size="small"
          disabled={!hasThreeOrMore}
          onClick={distributeVertically}
        >
          <SpaceEvenlyVerticallyIcon />
        </IconButton>
      </ButtonsRow>
    </>
  )
}

export default memo(AlignDistribute)
