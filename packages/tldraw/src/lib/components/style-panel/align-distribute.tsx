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
import { AlignType, DistributeType, StretchType } from '../../types'
import { breakpoints, ButtonsRow, IconButton } from '../shared'
import { useTLDrawContext } from '../../hooks'

export interface AlignDistributeProps {
  hasTwoOrMore: boolean
  hasThreeOrMore: boolean
}

export const AlignDistribute = React.memo(
  ({ hasTwoOrMore, hasThreeOrMore }: AlignDistributeProps): JSX.Element => {
    const { tlstate } = useTLDrawContext()

    const alignTop = React.useCallback(() => {
      tlstate.align(AlignType.Top)
    }, [tlstate])

    const alignCenterVertical = React.useCallback(() => {
      tlstate.align(AlignType.CenterVertical)
    }, [tlstate])

    const alignBottom = React.useCallback(() => {
      tlstate.align(AlignType.Bottom)
    }, [tlstate])

    const stretchVertically = React.useCallback(() => {
      tlstate.stretch(StretchType.Vertical)
    }, [tlstate])

    const distributeVertically = React.useCallback(() => {
      tlstate.distribute(DistributeType.Vertical)
    }, [tlstate])

    const alignLeft = React.useCallback(() => {
      tlstate.align(AlignType.Left)
    }, [tlstate])

    const alignCenterHorizontal = React.useCallback(() => {
      tlstate.align(AlignType.CenterHorizontal)
    }, [tlstate])

    const alignRight = React.useCallback(() => {
      tlstate.align(AlignType.Right)
    }, [tlstate])

    const stretchHorizontally = React.useCallback(() => {
      tlstate.stretch(StretchType.Horizontal)
    }, [tlstate])

    const distributeHorizontally = React.useCallback(() => {
      tlstate.distribute(DistributeType.Horizontal)
    }, [tlstate])

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
