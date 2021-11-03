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
    { onSelect, children, isActive, isWarning, hasIndicator, hasArrow, disabled, kbd, ...rest },
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
      </StyledRowButton>
    )
  }
)

export const StyledRowButton = styled('button', {
  position: 'relative',
  display: 'flex',
  flexDirection: 'row',
  width: '100%',
  background: 'none',
  height: '32px',
  border: 'none',
  cursor: 'pointer',
  color: '$text',
  outline: 'none',
  alignItems: 'center',
  fontFamily: '$ui',
  fontWeight: 400,
  fontSize: '$1',
  justifyContent: 'space-between',
  padding: '4px 8px 4px 12px',
  borderRadius: 4,
  userSelect: 'none',

  '& label': {
    fontWeight: '$1',
    margin: 0,
    padding: 0,
  },

  '& svg': {
    position: 'relative',
    stroke: '$overlay',
    strokeWidth: 1,
    zIndex: 1,
  },

  '&[data-disabled]': {
    opacity: 0.3,
  },

  '&:disabled': {
    opacity: 0.3,
  },

  variants: {
    bp: {
      mobile: {},
      small: {
        '& *[data-shy="true"]': {
          opacity: 0,
        },
        '&:hover:not(:disabled)': {
          backgroundColor: '$hover',
          '& *[data-shy="true"]': {
            opacity: 1,
          },
        },
      },
    },
    size: {
      icon: {
        padding: '4px ',
        width: 'auto',
      },
    },
    variant: {
      // pageButton: {
      //   display: 'grid',
      //   gridTemplateColumns: '24px auto',
      //   width: '100%',
      //   paddingLeft: '$1',
      //   gap: '$3',
      //   justifyContent: 'flex-start',
      //   [`& > *[data-state="checked"]`]: {
      //     gridRow: 1,
      //     gridColumn: 1,
      //   },
      //   '& > span': {
      //     gridRow: 1,
      //     gridColumn: 2,
      //     width: '100%',
      //   },
      // },
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
    },
  },
})
