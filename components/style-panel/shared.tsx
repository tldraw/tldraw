import * as RadioGroup from '@radix-ui/react-radio-group'
import * as Panel from '../panel'
import styled from 'styles'

export const StylePanelRoot = styled(Panel.Root, {
  minWidth: 1,
  width: 184,
  maxWidth: 184,
  overflow: 'hidden',
  position: 'relative',
  border: '1px solid $panel',
  boxShadow: '0px 2px 4px rgba(0,0,0,.12)',

  variants: {
    isOpen: {
      true: {},
      false: {
        padding: 2,
        height: 38,
        width: 38,
      },
    },
  },
})

export const Group = styled(RadioGroup.Root, {
  display: 'flex',
})

export const RadioItem = styled(RadioGroup.Item, {
  height: '32px',
  width: '32px',
  backgroundColor: '$panel',
  borderRadius: '4px',
  padding: '0',
  margin: '0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  outline: 'none',
  border: 'none',
  pointerEvents: 'all',
  cursor: 'pointer',

  '&:hover:not(:disabled)': {
    backgroundColor: '$hover',
    '& svg': {
      stroke: '$text',
      fill: '$text',
      strokeWidth: '0',
    },
  },

  '&:disabled': {
    opacity: '0.5',
  },

  variants: {
    isActive: {
      true: {
        '& svg': {
          fill: '$text',
          stroke: '$text',
          strokeWidth: '0',
        },
      },
      false: {
        '& svg': {
          fill: '$inactive',
          stroke: '$inactive',
          strokeWidth: '0',
        },
      },
    },
  },
})
