import styled from 'styles'
import state, { useSelector } from 'state'
import * as Panel from 'components/panel'
import { useRef } from 'react'
import {
  IconButton,
  IconWrapper,
  ButtonsRow,
  RowButton,
} from 'components/shared'
import ShapesFunctions from './shapes-functions'
import AlignDistribute from './align-distribute'
import QuickColorSelect from './quick-color-select'
import QuickSizeSelect from './quick-size-select'
import QuickDashSelect from './quick-dash-select'
import QuickFillSelect from './quick-fill-select'
import Tooltip from 'components/tooltip'
import { motion } from 'framer-motion'
import {
  ClipboardCopyIcon,
  ClipboardIcon,
  DotsHorizontalIcon,
  Share2Icon,
  Cross2Icon,
} from '@radix-ui/react-icons'

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
          <Tooltip label="More">
            {isOpen ? <Cross2Icon /> : <DotsHorizontalIcon />}
          </Tooltip>
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
      <hr />
      <AlignDistribute
        hasTwoOrMore={selectedShapesCount > 1}
        hasThreeOrMore={selectedShapesCount > 2}
      />
      <hr />
      <RowButton
        bp={breakpoints}
        disabled={selectedShapesCount === 0}
        onClick={() => state.send('COPIED')}
      >
        <span>Copy</span>
        <IconWrapper size="small">
          <ClipboardCopyIcon />
        </IconWrapper>
      </RowButton>
      <RowButton bp={breakpoints} onClick={() => state.send('PASTED')}>
        <span>Paste</span>
        <IconWrapper size="small">
          <ClipboardIcon />
        </IconWrapper>
      </RowButton>
      <RowButton
        bp={breakpoints}
        disabled={selectedShapesCount === 0}
        onClick={() => state.send('COPIED_TO_SVG')}
      >
        <span>Copy to SVG</span>
        <IconWrapper size="small">
          <Share2Icon />
        </IconWrapper>
      </RowButton>
      <hr />
      <RowButton bp={breakpoints} onClick={() => state.send('SAVED')}>
        <span>Save</span>
      </RowButton>
      <RowButton
        bp={breakpoints}
        onClick={() => state.send('LOADED_FROM_FILE_STSTEM')}
      >
        <span>Load</span>
      </RowButton>
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
