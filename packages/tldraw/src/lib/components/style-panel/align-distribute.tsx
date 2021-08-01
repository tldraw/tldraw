import * as React from 'react'
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
import { tlstate } from '../../state/state2'
import { breakpoints, ButtonsRow, IconButton } from '../shared'
import { AlignType, DistributeType, StretchType } from '../../types'

function alignTop() {
  tlstate.align(AlignType.Top)
}

function alignCenterVertical() {
  tlstate.align(AlignType.CenterVertical)
}

function alignBottom() {
  tlstate.align(AlignType.Bottom)
}

function stretchVertically() {
  tlstate.stretch(StretchType.Vertical)
}

function distributeVertically() {
  tlstate.distribute(DistributeType.Vertical)
}

function alignLeft() {
  tlstate.align(AlignType.Left)
}

function alignCenterHorizontal() {
  tlstate.align(AlignType.CenterHorizontal)
}

function alignRight() {
  tlstate.align(AlignType.Right)
}

function stretchHorizontally() {
  tlstate.stretch(StretchType.Horizontal)
}

function distributeHorizontally() {
  tlstate.distribute(DistributeType.Horizontal)
}

export interface AlignDistributeProps {
  hasTwoOrMore: boolean
  hasThreeOrMore: boolean
}

export const AlignDistribute = React.memo(
  ({ hasTwoOrMore, hasThreeOrMore }: AlignDistributeProps): JSX.Element => {
    return (
      <>
        <ButtonsRow>
          <IconButton bp={breakpoints} size="small" disabled={!hasTwoOrMore} onClick={alignLeft}>
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
          <IconButton bp={breakpoints} size="small" disabled={!hasTwoOrMore} onClick={alignRight}>
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
          <IconButton bp={breakpoints} size="small" disabled={!hasTwoOrMore} onClick={alignTop}>
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
          <IconButton bp={breakpoints} size="small" disabled={!hasTwoOrMore} onClick={alignBottom}>
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
  },
)
