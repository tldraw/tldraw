import { ItemIndicator } from '@radix-ui/react-dropdown-menu'
import { ChevronRightIcon, CheckIcon } from '@radix-ui/react-icons'
import * as React from 'react'
import { breakpoints } from '~components/breakpoints'
import { Kbd } from '~components/Kbd'
import { SmallIcon } from '~components/SmallIcon'
import styled from '~styles'

export interface RowButtonProps {
  onSelect?: () => void
  children: React.ReactNode
  disabled?: boolean
  kbd?: string
  isActive?: boolean
  isWarning?: boolean
  hasIndicator?: boolean
  hasArrow?: boolean
}

export const RowButton = React.forwardRef<HTMLButtonElement, RowButtonProps>(
  (
    {
      onSelect,
      isActive = false,
      isWarning = false,
      hasIndicator = false,
      hasArrow = false,
      disabled = false,
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
        onPointerDown={onSelect}
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
  color: '$text',
  fontFamily: '$ui',
  fontWeight: 400,
  fontSize: '$1',
  backgroundColor: '$panel',
  borderRadius: '$2',
  display: 'flex',
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
})

export const StyledRowButton = styled('button', {
  position: 'relative',
  width: '100%',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  height: '32px',
  outline: 'none',
  borderRadius: 4,
  userSelect: 'none',
  margin: 0,
  padding: '0 0',

  '&[data-disabled]': {
    opacity: 0.3,
  },

  '&:disabled': {
    opacity: 0.3,
  },

  variants: {
    bp: {
      mobile: {},
      small: {},
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
      false: {
        [`&:hover:not(:disabled) ${StyledRowButtonInner}`]: {
          backgroundColor: '$hover',
          border: '1px solid $panel',
          '& *[data-shy="true"]': {
            opacity: 1,
          },
        },
      },
    },
  },
})
