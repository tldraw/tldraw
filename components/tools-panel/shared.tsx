import { FloatingContainer } from 'components/shared'
import Tooltip from 'components/tooltip'
import styled from 'styles'

export const ToolButton = styled('button', {
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

export const PrimaryToolButton = styled(ToolButton, {
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

export const SecondaryToolButton = styled(ToolButton, {
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

export const TertiaryToolButton = styled(ToolButton, {
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
  onClick: () => void
  onDoubleClick?: () => void
  isActive: boolean
  children: React.ReactNode
}

export function PrimaryButton({
  label,
  onClick,
  onDoubleClick,
  isActive,
  children,
}: PrimaryToolButtonProps): JSX.Element {
  return (
    <Tooltip label={label}>
      <PrimaryToolButton
        name={label}
        bp={{
          '@initial': 'mobile',
          '@sm': 'small',
          '@md': 'medium',
          '@lg': 'large',
        }}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        isActive={isActive}
      >
        {children}
      </PrimaryToolButton>
    </Tooltip>
  )
}

interface SecondaryToolButtonProps {
  label: string
  onClick: () => void
  onDoubleClick?: () => void
  isActive: boolean
  children: React.ReactNode
}

export function SecondaryButton({
  label,
  onClick,
  onDoubleClick,
  isActive,
  children,
}: SecondaryToolButtonProps): JSX.Element {
  return (
    <Tooltip label={label}>
      <SecondaryToolButton
        name={label}
        bp={{
          '@initial': 'mobile',
          '@sm': 'small',
          '@md': 'medium',
          '@lg': 'large',
        }}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        isActive={isActive}
      >
        {children}
      </SecondaryToolButton>
    </Tooltip>
  )
}

interface TertiaryToolProps {
  label: string
  onClick: () => void
  onDoubleClick?: () => void
  children: React.ReactNode
}

export function TertiaryButton({
  label,
  onClick,
  onDoubleClick,
  children,
}: TertiaryToolProps): JSX.Element {
  return (
    <Tooltip label={label}>
      <TertiaryToolButton
        name={label}
        bp={{
          '@initial': 'mobile',
          '@sm': 'small',
          '@md': 'medium',
          '@lg': 'large',
        }}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      >
        {children}
      </TertiaryToolButton>
    </Tooltip>
  )
}

export const TertiaryButtonsContainer = styled(FloatingContainer, {
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
