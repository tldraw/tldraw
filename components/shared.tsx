import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as RadioGroup from '@radix-ui/react-radio-group'
import * as Panel from './panel'
import styled from 'styles'
import Tooltip from './tooltip'

export const IconButton = styled('button', {
  height: '32px',
  width: '32px',
  backgroundColor: '$panel',
  borderRadius: '4px',
  padding: '0',
  margin: '0',
  display: 'grid',
  alignItems: 'center',
  justifyContent: 'center',
  outline: 'none',
  border: 'none',
  pointerEvents: 'all',
  cursor: 'pointer',

  '& > *': {
    gridRow: 1,
    gridColumn: 1,
  },

  '&:disabled': {
    opacity: '0.5',
  },

  '& > span': {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
  },

  variants: {
    bp: {
      mobile: {},
      small: {
        '&:hover:not(:disabled)': {
          backgroundColor: '$hover',
        },
      },
    },
    size: {
      small: {
        '& svg': {
          height: '16px',
          width: '16px',
        },
      },
      medium: {
        height: 44,
        width: 44,
        '& svg': {
          height: '20px',
          width: '20px',
        },
      },
      large: {
        height: 44,
        width: 44,
        '& svg': {
          height: '24px',
          width: '24px',
        },
      },
    },
    isActive: {
      true: {
        color: '$selected',
      },
    },
  },
})

export const RowButton = styled('button', {
  position: 'relative',
  display: 'flex',
  width: '100%',
  background: 'none',
  height: '32px',
  border: 'none',
  cursor: 'pointer',
  outline: 'none',
  alignItems: 'center',
  fontFamily: '$ui',
  fontSize: '$1',
  justifyContent: 'space-between',
  padding: '4px 6px 4px 12px',
  borderRadius: 4,

  '& label': {
    fontWeight: '$1',
    margin: 0,
    padding: 0,
  },

  '& svg': {
    position: 'relative',
    stroke: 'rgba(0,0,0,.2)',
    strokeWidth: 1,
    zIndex: 1,
  },

  variants: {
    bp: {
      mobile: {},
      small: {
        '&:hover:not(:disabled)': {
          backgroundColor: '$hover',
        },
      },
    },
    size: {
      icon: {
        padding: '4px ',
        width: 'auto',
      },
    },
  },
})

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

export const Item = styled('button', {
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
        },
      },
      false: {
        '& svg': {
          fill: '$inactive',
          stroke: '$inactive',
        },
      },
    },
  },
})

export const IconWrapper = styled('div', {
  height: '100%',
  borderRadius: '4px',
  marginRight: '1px',
  display: 'grid',
  alignItems: 'center',
  justifyContent: 'center',
  outline: 'none',
  border: 'none',
  pointerEvents: 'all',
  cursor: 'pointer',

  '& svg': {
    height: 22,
    width: 22,
    strokeWidth: 1,
  },

  '& > *': {
    gridRow: 1,
    gridColumn: 1,
  },

  variants: {
    size: {
      small: {
        '& svg': {
          height: '16px',
          width: '16px',
        },
      },
      medium: {
        '& svg': {
          height: '22px',
          width: '22px',
        },
      },
    },
  },
})

export const DropdownContent = styled(DropdownMenu.Content, {
  display: 'grid',
  padding: 4,
  gridTemplateColumns: 'repeat(4, 1fr)',
  backgroundColor: '$panel',
  borderRadius: 4,
  border: '1px solid $panel',
  boxShadow: '0px 2px 4px rgba(0,0,0,.28)',

  variants: {
    direction: {
      vertical: {
        gridTemplateColumns: '1fr',
      },
    },
  },
})

export function DashSolidIcon() {
  return (
    <svg width="24" height="24" stroke="currentColor">
      <circle
        cx={12}
        cy={12}
        r={8}
        fill="none"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  )
}

export function DashDashedIcon() {
  return (
    <svg width="24" height="24" stroke="currentColor">
      <circle
        cx={12}
        cy={12}
        r={8}
        fill="none"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray={50.26548 * 0.1}
      />
    </svg>
  )
}

const dottedDasharray = `${50.26548 * 0.025} ${50.26548 * 0.1}`

export function DashDottedIcon() {
  return (
    <svg width="24" height="24" stroke="currentColor">
      <circle
        cx={12}
        cy={12}
        r={8}
        fill="none"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray={dottedDasharray}
      />
    </svg>
  )
}
