import * as React from 'react'
import { breakpoints } from '~components/breakpoints'
import { Tooltip } from '~components/Tooltip'
import { useTLDrawContext } from '~hooks'
import { styled } from '~styles'

export interface ToolButtonProps {
  onClick?: () => void
  onSelect?: () => void
  onDoubleClick?: () => void
  isActive?: boolean
  isSponsor?: boolean
  variant?: 'icon' | 'text' | 'circle' | 'primary'
  children: React.ReactNode
}

export const ToolButton = React.forwardRef<HTMLButtonElement, ToolButtonProps>(
  (
    {
      onSelect,
      onClick,
      onDoubleClick,
      variant,
      children,
      isActive = false,
      isSponsor = false,
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
        onPointerDown={onSelect}
        onDoubleClick={onDoubleClick}
        bp={breakpoints}
        {...rest}
      >
        <StyledToolButtonInner>{children}</StyledToolButtonInner>
      </StyledToolButton>
    )
  }
)

/* ------------------ With Tooltip ------------------ */

interface ToolButtonWithTooltipProps extends ToolButtonProps {
  label: string
  kbd?: string
}

export function ToolButtonWithTooltip({ label, kbd, ...rest }: ToolButtonWithTooltipProps) {
  const { state } = useTLDrawContext()

  const handleDoubleClick = React.useCallback(() => {
    state.toggleToolLock()
  }, [])

  return (
    <Tooltip label={label[0].toUpperCase() + label.slice(1)} kbd={kbd}>
      <ToolButton {...rest} variant="primary" onDoubleClick={handleDoubleClick} />
    </Tooltip>
  )
}

export const StyledToolButtonInner = styled('div', {
  position: 'relative',
  height: '100%',
  width: '100%',
  color: '$text',
  backgroundColor: '$panel',
  borderRadius: '$2',
  margin: '0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: '$ui',
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
        },
      },
      circle: {
        padding: '$2',
        [`& ${StyledToolButtonInner}`]: {
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
          backgroundColor: '$sponsorLight',
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
          color: '$panelActive',
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
