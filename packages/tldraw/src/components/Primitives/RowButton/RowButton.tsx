import { ItemIndicator } from '@radix-ui/react-dropdown-menu'
import { CheckIcon, ChevronRightIcon } from '@radix-ui/react-icons'
import * as React from 'react'
import { Kbd } from '~components/Primitives/Kbd'
import { SmallIcon } from '~components/Primitives/SmallIcon'
import { breakpoints } from '~components/breakpoints'
import { styled } from '~styles'

export interface RowButtonProps {
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  children: React.ReactNode
  disabled?: boolean
  kbd?: string
  variant?: 'wide' | 'styleMenu'
  isActive?: boolean
  isWarning?: boolean
  hasIndicator?: boolean
  hasArrow?: boolean
  id?: string
}

export const RowButton = React.forwardRef<HTMLButtonElement, RowButtonProps>(
  (
    {
      onClick,
      isActive = false,
      isWarning = false,
      hasIndicator = false,
      hasArrow = false,
      disabled = false,
      variant,
      kbd,
      children,
      ...rest
    },
    ref
  ) => {
    return (
      <StyledRowButton
        ref={ref}
        bp={breakpoints}
        isWarning={isWarning}
        isActive={isActive}
        disabled={disabled}
        onClick={onClick}
        variant={variant}
        {...rest}
      >
        <StyledRowButtonInner>
          {children}
          {kbd ? <Kbd variant="menu">{kbd}</Kbd> : undefined}
          {hasIndicator && (
            <ItemIndicator dir="ltr">
              <SmallIcon>
                <CheckIcon />
              </SmallIcon>
            </ItemIndicator>
          )}
          {hasArrow && (
            <SmallIcon>
              <ChevronRightIcon />
            </SmallIcon>
          )}
        </StyledRowButtonInner>
      </StyledRowButton>
    )
  }
)

const StyledRowButtonInner = styled('div', {
  height: '100%',
  width: '100%',
  backgroundColor: '$panel',
  borderRadius: '$2',
  display: 'flex',
  gap: '$1',
  flexDirection: 'row',
  alignItems: 'center',
  padding: '0 $3',
  justifyContent: 'space-between',
  border: '1px solid transparent',

  '& svg': {
    position: 'relative',
    stroke: '$overlay',
    strokeWidth: 1,
    zIndex: 1,
  },

  [`& > ${SmallIcon}`]: {
    paddingLeft: '$3',
  },
})

export const StyledRowButton = styled('button', {
  position: 'relative',
  width: '100%',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  height: 32,
  minHeight: 32,
  outline: 'none',
  color: '$text',
  fontFamily: '$ui',
  fontWeight: 400,
  fontSize: '$1',
  borderRadius: 4,
  userSelect: 'none',
  WebkitUserSelect: 'none',
  margin: 0,
  padding: '0 0',

  '&[data-disabled]': {
    opacity: 0.3,
  },

  '&:disabled': {
    opacity: 0.3,
  },

  [`&:focus:not(:disabled) ${StyledRowButtonInner}`]: {
    backgroundColor: '$hover',
  },

  '& a': {
    textDecoration: 'none',
    color: '$text',
  },

  variants: {
    bp: {
      mobile: {},
      small: {},
    },
    variant: {
      styleMenu: {
        margin: '$1 0 $1 0',
      },
      wide: {
        gridColumn: '1 / span 4',
      },
    },
    size: {
      icon: {
        padding: '4px ',
        width: 'auto',
      },
    },
    isWarning: {
      true: {
        color: '$warn',
      },
    },
    isActive: {
      true: {
        backgroundColor: '$hover',
      },
      false: {},
    },
  },
})
