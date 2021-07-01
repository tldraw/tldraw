import styled from 'styles'
import state, { useSelector } from 'state'
import * as Panel from 'components/panel'
import { useRef } from 'react'
import { IconButton, ButtonsRow } from 'components/shared'
import { ChevronDown, X } from 'react-feather'
import ShapesFunctions from './shapes-functions'
import AlignDistribute from './align-distribute'
import QuickColorSelect from './quick-color-select'
import QuickSizeSelect from './quick-size-select'
import QuickDashSelect from './quick-dash-select'
import QuickFillSelect from './quick-fill-select'
import Tooltip from 'components/tooltip'
import { motion } from 'framer-motion'

const breakpoints = { '@initial': 'mobile', '@sm': 'small' } as any

const handleStylePanelOpen = () => state.send('TOGGLED_STYLE_PANEL_OPEN')

export default function StylePanel(): JSX.Element {
  const rContainer = useRef<HTMLDivElement>(null)

  const isOpen = useSelector((s) => s.data.settings.isStyleOpen)

  return (
    <StylePanelRoot dir="ltr" ref={rContainer} isOpen={isOpen}>
      <ButtonsRow>
        <QuickColorSelect />
        <QuickSizeSelect />
        <QuickDashSelect />
        <QuickFillSelect />
        <IconButton
          bp={breakpoints}
          title="Style"
          size="small"
          onClick={handleStylePanelOpen}
        >
          <Tooltip label="More">{isOpen ? <X /> : <ChevronDown />}</Tooltip>
        </IconButton>
      </ButtonsRow>
      {isOpen && <SelectedShapeContent />}
    </StylePanelRoot>
  )
}

function SelectedShapeContent(): JSX.Element {
  const selectedShapesCount = useSelector((s) => s.values.selectedIds.length)

  return (
    <>
      <hr />
      <ShapesFunctions />
      <AlignDistribute
        hasTwoOrMore={selectedShapesCount > 1}
        hasThreeOrMore={selectedShapesCount > 2}
      />
    </>
  )
}

const StylePanelRoot = styled(motion(Panel.Root), {
  minWidth: 1,
  width: 'fit-content',
  maxWidth: 'fit-content',
  overflow: 'hidden',
  position: 'relative',
  border: '1px solid $panel',
  boxShadow: '0px 2px 4px rgba(0,0,0,.2)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  pointerEvents: 'all',
  padding: 2,

  '& hr': {
    marginTop: 2,
    marginBottom: 2,
    marginLeft: '-2px',
    border: 'none',
    height: 1,
    backgroundColor: '$brushFill',
    width: 'calc(100% + 4px)',
  },

  variants: {
    isOpen: {
      true: {},
      false: {
        width: 'fit-content',
      },
    },
  },
})
