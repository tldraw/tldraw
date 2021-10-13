import * as React from 'react'
import { floatingContainer } from '../shared'
import { Tooltip } from '../shared/tooltip'
import css from '~styles'

export const toolButton = css({
  position: 'relative',
  height: '32px',
  width: '32px',
  color: '$text',
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
  fontSize: '$0',
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
})

export const primaryToolButton = css(toolButton, {
  variants: {
    bp: {
      mobile: {
        height: 44,
        width: 44,
        '& svg:nth-of-type(1)': {
          height: '20px',
          width: '20px',
        },
      },
      small: {
        '&:hover:not(:disabled)': {
          backgroundColor: '$hover',
        },
      },
      medium: {},
      large: {},
    },
    isActive: {
      true: {
        color: '$selected',
      },
    },
  },
})

export const secondaryToolButton = css(toolButton, {
  variants: {
    bp: {
      mobile: {
        height: 44,
        width: 44,
        '& svg:nth-of-type(1)': {
          height: '18px',
          width: '18px',
        },
      },
      small: {
        '&:hover:not(:disabled)': {
          backgroundColor: '$hover',
        },
      },
      medium: {},
      large: {},
    },
    isActive: {
      true: {
        color: '$selected',
      },
    },
  },
})

export const tertiaryToolButton = css(toolButton, {
  variants: {
    bp: {
      mobile: {
        height: 32,
        width: 44,
        '& svg:nth-of-type(1)': {
          height: '16px',
          width: '16px',
        },
      },
      small: {
        height: 40,
        width: 40,
        '& svg:nth-of-type(1)': {
          height: '18px',
          width: '18px',
        },
        '&:hover:not(:disabled)': {
          backgroundColor: '$hover',
        },
      },
      medium: {},
      large: {},
    },
  },
})

interface PrimaryToolButtonProps {
  label: string
  kbd: string
  onClick: () => void
  onDoubleClick?: () => void
  isActive: boolean
  children: React.ReactNode
}

export function PrimaryButton({
  label,
  kbd,
  onClick,
  onDoubleClick,
  isActive,
  children,
}: PrimaryToolButtonProps): JSX.Element {
  return (
    <Tooltip label={label[0].toUpperCase() + label.slice(1)} kbd={kbd}>
      <button
        className={primaryToolButton({
          bp: {
            '@initial': 'mobile',
            '@sm': 'small',
            '@md': 'medium',
            '@lg': 'large',
          },
          name: label,
          isActive,
        })}
        onPointerDown={onClick}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      >
        {children}
      </button>
    </Tooltip>
  )
}

interface SecondaryToolButtonProps {
  label: string
  kbd: string
  onClick: () => void
  onDoubleClick?: () => void
  isActive: boolean
  children: React.ReactNode
}

export function SecondaryButton({
  label,
  kbd,
  onClick,
  onDoubleClick,
  isActive,
  children,
}: SecondaryToolButtonProps): JSX.Element {
  return (
    <Tooltip label={label[0].toUpperCase() + label.slice(1)} kbd={kbd}>
      <button
        className={secondaryToolButton({
          bp: {
            '@initial': 'mobile',
            '@sm': 'small',
            '@md': 'medium',
            '@lg': 'large',
          },
          name: label,
          isActive,
        })}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      >
        {children}
      </button>
    </Tooltip>
  )
}

interface TertiaryToolProps {
  label: string
  kbd: string
  onClick: () => void
  onDoubleClick?: () => void
  children: React.ReactNode
}

export function TertiaryButton({
  label,
  kbd,
  onClick,
  onDoubleClick,
  children,
}: TertiaryToolProps): JSX.Element {
  return (
    <Tooltip label={label[0].toUpperCase() + label.slice(1)} kbd={kbd}>
      <button
        className={tertiaryToolButton({
          bp: {
            '@initial': 'mobile',
            '@sm': 'small',
            '@md': 'medium',
            '@lg': 'large',
          },
        })}
        name={label}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      >
        {children}
      </button>
    </Tooltip>
  )
}

export const tertiaryButtonsContainer = css(floatingContainer, {
  boxShadow: '$3',
  variants: {
    bp: {
      mobile: {
        alignItems: 'center',
        flexDirection: 'column',
      },
      small: {
        alignItems: 'center',
        flexDirection: 'row',
      },
    },
  },
})
