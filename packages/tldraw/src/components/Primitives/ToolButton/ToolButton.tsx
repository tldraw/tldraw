import * as React from 'react'
import { breakpoints } from '~components/breakpoints'
import { Tooltip } from '~components/Primitives/Tooltip'
import { useTldrawApp } from '~hooks'
import { styled } from '~styles'

export interface ToolButtonProps {
  onClick?: () => void
  onSelect?: () => void
  onDoubleClick?: () => void
  disabled?: boolean
  isActive?: boolean
  isSponsor?: boolean
  isToolLocked?: boolean
  variant?: 'icon' | 'text' | 'circle' | 'primary'
  children: React.ReactNode
  id?: string
  onKeyDown?: React.KeyboardEventHandler<HTMLButtonElement>
}

export const ToolButton = React.forwardRef<HTMLButtonElement, ToolButtonProps>(
  (
    {
      onSelect,
      onClick,
      onDoubleClick,
      variant,
      children,
      isToolLocked = false,
      disabled = false,
      isActive = false,
      isSponsor = false,
      onKeyDown,
      id,
      ...rest
    },
    ref
  ) => {
    return (
      <StyledToolButton
        ref={ref}
        isActive={isActive}
        isSponsor={isSponsor}
        variant={variant}
        onClick={onClick}
        disabled={disabled}
        onPointerDown={onSelect}
        onDoubleClick={onDoubleClick}
        onKeyDown={onKeyDown}
        bp={breakpoints}
        id={id}
        {...rest}
      >
        <StyledToolButtonInner>{children}</StyledToolButtonInner>
        {isToolLocked && <ToolLockIndicator />}
      </StyledToolButton>
    )
  }
)

/* ------------------ With Tooltip ------------------ */

interface ToolButtonWithTooltipProps extends ToolButtonProps {
  label: string
  isLocked?: boolean
  kbd?: string
}

export function ToolButtonWithTooltip({
  label,
  kbd,
  isLocked,
  ...rest
}: ToolButtonWithTooltipProps) {
  const app = useTldrawApp()

  const handleDoubleClick = React.useCallback(() => {
    app.toggleToolLock()
  }, [])

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === ' ' && app.isForcePanning) {
      e.preventDefault()
    }
  }, [])

  return (
    <Tooltip label={label[0].toUpperCase() + label.slice(1)} kbd={kbd}>
      <ToolButton
        {...rest}
        variant="primary"
        isToolLocked={isLocked && rest.isActive}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
      />
    </Tooltip>
  )
}

export const StyledToolButtonInner = styled('div', {
  position: 'relative',
  height: '100%',
  width: '100%',
  backgroundColor: '$panel',
  borderRadius: '$2',
  margin: '0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: '$ui',
  color: 'inherit',
  userSelect: 'none',
  boxSizing: 'border-box',
  border: '1px solid transparent',
})

export const StyledToolButton = styled('button', {
  position: 'relative',
  color: '$text',
  fontSize: '$0',
  background: 'none',
  margin: '0',
  padding: '$2',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  outline: 'none',
  cursor: 'pointer',
  pointerEvents: 'all',
  border: 'none',
  height: '40px',
  width: '40px',

  [`&:disabled ${StyledToolButtonInner}`]: {
    opacity: 0.618,
  },

  variants: {
    variant: {
      primary: {
        marginTop: '0',
      },
      icon: {
        [`& ${StyledToolButtonInner}`]: {
          display: 'grid',
          '& > *': {
            gridRow: 1,
            gridColumn: 1,
          },
        },
      },
      text: {
        width: 'auto',
        [`& ${StyledToolButtonInner}`]: {
          fontSize: '$1',
          padding: '0 $3',
          gap: '$3',
        },
      },
      circle: {
        padding: '$2',
        [`& ${StyledToolButtonInner}`]: {
          border: '1px solid $panelContrast',
          borderRadius: '100%',
          boxShadow: '$panel',
        },
        [`& ${StyledToolButtonInner} > svg`]: {
          width: 14,
          height: 14,
        },
      },
    },
    isSponsor: {
      true: {
        [`${StyledToolButtonInner}`]: {
          backgroundColor: '$sponsorContrast',
        },
      },
    },
    isActive: {
      true: {},
      false: {},
    },
    bp: {
      mobile: {},
      small: {},
    },
  },
  compoundVariants: [
    {
      variant: 'primary',
      bp: 'mobile',
      css: {
        height: '40px',
        width: '40px',
        [`& ${StyledToolButtonInner} > svg`]: {
          width: 16,
          height: 16,
        },
      },
    },
    {
      variant: 'primary',
      bp: 'small',
      css: {
        height: '44px',
        width: '44px',
        [`& ${StyledToolButtonInner} > svg`]: {
          width: 20,
          height: 20,
        },
      },
    },
    {
      isActive: true,
      isSponsor: false,
      css: {
        [`${StyledToolButtonInner}`]: {
          backgroundColor: '$selected',
          color: '$selectedContrast',
        },
      },
    },
    {
      isActive: false,
      isSponsor: false,
      bp: 'small',
      css: {
        [`&:hover:not(:disabled) ${StyledToolButtonInner}`]: {
          backgroundColor: '$hover',
          border: '1px solid $panel',
        },
        [`&:focus:not(:disabled) ${StyledToolButtonInner}`]: {
          backgroundColor: '$hover',
        },
      },
    },
  ],
})

const ToolLockIndicator = styled('div', {
  position: 'absolute',
  width: 10,
  height: 10,
  backgroundColor: '$selected',
  borderRadius: '100%',
  bottom: -2,
  border: '2px solid $panel',
  zIndex: 100,
})
