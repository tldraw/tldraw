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
import { IconButton } from 'components/shared'
import state from 'state'
import styled from 'styles'
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

export default function AlignDistribute({
  hasTwoOrMore,
  hasThreeOrMore,
}: {
  hasTwoOrMore: boolean
  hasThreeOrMore: boolean
}) {
  return (
    <Container>
      <IconButton
        bp={{ '@initial': 'mobile', '@sm': 'small' }}
        size="small"
        disabled={!hasTwoOrMore}
        onClick={alignLeft}
      >
        <AlignLeftIcon />
      </IconButton>
      <IconButton
        bp={{ '@initial': 'mobile', '@sm': 'small' }}
        size="small"
        disabled={!hasTwoOrMore}
        onClick={alignCenterHorizontal}
      >
        <AlignCenterHorizontallyIcon />
      </IconButton>
      <IconButton
        bp={{ '@initial': 'mobile', '@sm': 'small' }}
        size="small"
        disabled={!hasTwoOrMore}
        onClick={alignRight}
      >
        <AlignRightIcon />
      </IconButton>
      <IconButton
        bp={{ '@initial': 'mobile', '@sm': 'small' }}
        size="small"
        disabled={!hasTwoOrMore}
        onClick={stretchHorizontally}
      >
        <StretchHorizontallyIcon />
      </IconButton>
      <IconButton
        bp={{ '@initial': 'mobile', '@sm': 'small' }}
        size="small"
        disabled={!hasThreeOrMore}
        onClick={distributeHorizontally}
      >
        <SpaceEvenlyHorizontallyIcon />
      </IconButton>
      <IconButton
        bp={{ '@initial': 'mobile', '@sm': 'small' }}
        size="small"
        disabled={!hasTwoOrMore}
        onClick={alignTop}
      >
        <AlignTopIcon />
      </IconButton>
      <IconButton
        bp={{ '@initial': 'mobile', '@sm': 'small' }}
        size="small"
        disabled={!hasTwoOrMore}
        onClick={alignCenterVertical}
      >
        <AlignCenterVerticallyIcon />
      </IconButton>
      <IconButton
        bp={{ '@initial': 'mobile', '@sm': 'small' }}
        size="small"
        disabled={!hasTwoOrMore}
        onClick={alignBottom}
      >
        <AlignBottomIcon />
      </IconButton>
      <IconButton
        bp={{ '@initial': 'mobile', '@sm': 'small' }}
        size="small"
        disabled={!hasTwoOrMore}
        onClick={stretchVertically}
      >
        <StretchVerticallyIcon />
      </IconButton>
      <IconButton
        bp={{ '@initial': 'mobile', '@sm': 'small' }}
        size="small"
        disabled={!hasThreeOrMore}
        onClick={distributeVertically}
      >
        <SpaceEvenlyVerticallyIcon />
      </IconButton>
    </Container>
  )
}

const Container = styled('div', {
  display: 'grid',
  padding: 4,
  gridTemplateColumns: 'repeat(5, auto)',
  [`& ${IconButton} > svg`]: {
    stroke: 'transparent',
  },
})
