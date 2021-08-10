/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import { Tooltip } from './tooltip'
import {
  Root as CMRoot,
  TriggerItem as CMTriggerItem,
  Separator as CMSeparator,
  Item as CMItem,
  Arrow as CMArrow,
  Content as CMContent,
  ItemIndicator as CMItemIndicator,
  CheckboxItem as CMCheckboxItem,
} from '@radix-ui/react-context-menu'
import {
  Root as DMRoot,
  TriggerItem as DMTriggerItem,
  Separator as DMSeparator,
  Item as DMItem,
  Arrow as DMArrow,
  Content as DMContent,
  Trigger as DMTrigger,
  ItemIndicator as DMItemIndicator,
  CheckboxItem as DMCheckboxItem,
} from '@radix-ui/react-dropdown-menu'
import { Root as RGRoot } from '@radix-ui/react-radio-group'
import { CheckIcon, ChevronRightIcon } from '@radix-ui/react-icons'
import styled from '../styles'

export const breakpoints: any = { '@initial': 'mobile', '@sm': 'small' }

export const IconButton = styled('button', {
  position: 'relative',
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
  fontSize: '$0',
  color: '$text',
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
      mobile: {
        backgroundColor: 'transparent',
      },
      small: {
        '&:hover:not(:disabled)': {
          backgroundColor: '$hover',
        },
      },
    },
    size: {
      small: {
        height: 32,
        width: 32,
        '& svg:nth-of-type(1)': {
          height: '16px',
          width: '16px',
        },
      },
      medium: {
        height: 44,
        width: 44,
        '& svg:nth-of-type(1)': {
          height: '18px',
          width: '18px',
        },
      },
      large: {
        height: 44,
        width: 44,
        '& svg:nth-of-type(1)': {
          height: '20px',
          width: '20px',
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
      noIcon: {
        padding: '4px 12px',
      },
      pageButton: {
        display: 'grid',
        gridTemplateColumns: '24px auto',
        width: '100%',
        paddingLeft: '$1',
        gap: '$3',
        justifyContent: 'flex-start',
        [`& > *[data-state="checked"]`]: {
          gridRow: 1,
          gridColumn: 1,
        },
        '& > span': {
          gridRow: 1,
          gridColumn: 2,
          width: '100%',
        },
      },
    },
    warn: {
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

export const Group = styled(RGRoot, {
  display: 'flex',
})

export const ShortcutKey = styled('span', {
  fontSize: '$0',
  width: '16px',
  height: '16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '1px 1px 0px rgba(0,0,0,.5)',
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
  color: '$text',

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

export const ButtonsRow = styled('div', {
  position: 'relative',
  display: 'flex',
  width: '100%',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  outline: 'none',
  alignItems: 'center',
  justifyContent: 'flex-start',
  padding: 0,
})

export const VerticalDivider = styled('hr', {
  width: '1px',
  margin: '-2px 3px',
  border: 'none',
  backgroundColor: '$brushFill',
})

export const FloatingContainer = styled('div', {
  backgroundColor: '$panel',
  border: '1px solid $panel',
  borderRadius: '4px',
  boxShadow: '$4',
  display: 'flex',
  height: 'fit-content',
  padding: '$0',
  pointerEvents: 'all',
  position: 'relative',
  userSelect: 'none',
  zIndex: 200,

  variants: {
    direction: {
      row: {
        flexDirection: 'row',
      },
      column: {
        flexDirection: 'column',
      },
    },
    elevation: {
      0: {
        boxShadow: 'none',
      },
      2: {
        boxShadow: '$2',
      },
      3: {
        boxShadow: '$3',
      },
      4: {
        boxShadow: '$4',
      },
    },
  },
})

/* -------------------------------------------------- */
/*                       Dialog                       */
/* -------------------------------------------------- */

export const DialogContent = styled('div', {
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  minWidth: 240,
  maxWidth: 'fit-content',
  maxHeight: '85vh',
  marginTop: '-5vh',
  pointerEvents: 'all',
  backgroundColor: '$panel',
  border: '1px solid $panel',
  padding: '$0',
  boxShadow: '$4',
  borderRadius: '4px',
  font: '$ui',

  '&:focus': {
    outline: 'none',
  },
})

export const DialogOverlay = styled('div', {
  backgroundColor: 'rgba(0, 0, 0, .15)',
  position: 'fixed',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
})

export const DialogInputWrapper = styled('div', {
  padding: '$4 $2',
})

export const DialogTitleRow = styled('div', {
  display: 'flex',
  padding: '0 0 0 $4',
  alignItems: 'center',
  justifyContent: 'space-between',

  h3: {
    fontSize: '$1',
  },
})

/* -------------------------------------------------- */
/*                        Menus                       */
/* -------------------------------------------------- */

export const MenuContent = styled('div', {
  position: 'relative',
  overflow: 'hidden',
  userSelect: 'none',
  zIndex: 180,
  minWidth: 180,
  pointerEvents: 'all',
  backgroundColor: '$panel',
  border: '1px solid $panel',
  padding: '$0',
  boxShadow: '$4',
  borderRadius: '4px',
  font: '$ui',
})

export const Divider = styled('div', {
  backgroundColor: '$hover',
  height: 1,
  marginTop: '$2',
  marginRight: '-$2',
  marginBottom: '$2',
  marginLeft: '-$2',
})

export function MenuButton({
  warn,
  onSelect,
  children,
  disabled = false,
}: {
  warn?: boolean
  onSelect?: () => void
  disabled?: boolean
  children: React.ReactNode
}): JSX.Element {
  return (
    <RowButton
      bp={breakpoints}
      disabled={disabled}
      warn={warn}
      onSelect={onSelect}
    >
      {children}
    </RowButton>
  )
}

export const MenuTextInput = styled('input', {
  backgroundColor: '$panel',
  border: 'none',
  padding: '$4 $3',
  width: '100%',
  outline: 'none',
  background: '$input',
  borderRadius: '4px',
  font: '$ui',
  fontSize: '$1',
})

/* -------------------------------------------------- */
/*                    Dropdown Menu                   */
/* -------------------------------------------------- */

export function DropdownMenuRoot({
  isOpen,
  onOpenChange,
  children,
}: {
  isOpen?: boolean
  onOpenChange?: (isOpen: boolean) => void
  children: React.ReactNode
}): JSX.Element {
  return (
    <DMRoot dir="ltr" open={isOpen} onOpenChange={onOpenChange}>
      {children}
    </DMRoot>
  )
}

export function DropdownMenuSubMenu({
  children,
  disabled = false,
  label,
}: {
  label: string
  disabled?: boolean
  children: React.ReactNode
}): JSX.Element {
  return (
    <DMRoot dir="ltr">
      <DMTriggerItem as={RowButton} bp={breakpoints} disabled={disabled}>
        <span>{label}</span>
        <IconWrapper size="small">
          <ChevronRightIcon />
        </IconWrapper>
      </DMTriggerItem>
      <DMContent as={MenuContent} sideOffset={2} alignOffset={-2}>
        {children}
        <DropdownMenuArrow offset={13} />
      </DMContent>
    </DMRoot>
  )
}

export const DropdownMenuDivider = styled(DMSeparator, {
  backgroundColor: '$hover',
  height: 1,
  marginTop: '$2',
  marginRight: '-$2',
  marginBottom: '$2',
  marginLeft: '-$2',
})

export const DropdownMenuArrow = styled(DMArrow, {
  fill: '$panel',
})

export function DropdownMenuButton({
  onSelect,
  children,
  disabled = false,
}: {
  onSelect?: () => void
  disabled?: boolean
  children: React.ReactNode
}): JSX.Element {
  return (
    <DMItem
      as={RowButton}
      bp={breakpoints}
      disabled={disabled}
      onSelect={onSelect}
    >
      {children}
    </DMItem>
  )
}

interface DropdownMenuIconButtonProps {
  onSelect: () => void
  disabled?: boolean
  children: React.ReactNode
}

export function DropdownMenuIconButton({
  onSelect,
  children,
  disabled = false,
}: DropdownMenuIconButtonProps): JSX.Element {
  return (
    <DMItem
      as={IconButton}
      bp={breakpoints}
      disabled={disabled}
      onSelect={onSelect}
    >
      {children}
    </DMItem>
  )
}

interface DropdownMenuIconTriggerButtonProps {
  label: string
  kbd?: string
  disabled?: boolean
  children: React.ReactNode
}
export function DropdownMenuIconTriggerButton({
  label,
  kbd,
  children,
  disabled = false,
}: DropdownMenuIconTriggerButtonProps): JSX.Element {
  return (
    <DMTrigger as={IconButton} bp={breakpoints} disabled={disabled}>
      <Tooltip label={label} kbd={kbd}>
        {children}
      </Tooltip>
    </DMTrigger>
  )
}

interface MenuCheckboxItemProps {
  checked: boolean
  disabled?: boolean
  onCheckedChange: (isChecked: boolean) => void
  children: React.ReactNode
}

export function DropdownMenuCheckboxItem({
  checked,
  disabled = false,
  onCheckedChange,
  children,
}: MenuCheckboxItemProps): JSX.Element {
  return (
    <DMCheckboxItem
      as={RowButton}
      bp={breakpoints}
      onCheckedChange={onCheckedChange}
      checked={checked}
      disabled={disabled}
    >
      {children}
      <DMItemIndicator>
        <IconWrapper size="small">
          <CheckIcon />
        </IconWrapper>
      </DMItemIndicator>
    </DMCheckboxItem>
  )
}

/* -------------------------------------------------- */
/*                    Context Menu                   */
/* -------------------------------------------------- */

export function ContextMenuRoot({
  onOpenChange,
  children,
}: {
  onOpenChange?: (isOpen: boolean) => void
  children: React.ReactNode
}): JSX.Element {
  return (
    <CMRoot dir="ltr" onOpenChange={onOpenChange}>
      {children}
    </CMRoot>
  )
}

export function ContextMenuSubMenu({
  children,
  label,
}: {
  label: string
  children: React.ReactNode
}): JSX.Element {
  return (
    <CMRoot dir="ltr">
      <CMTriggerItem as={RowButton} bp={breakpoints}>
        <span>{label}</span>
        <IconWrapper size="small">
          <ChevronRightIcon />
        </IconWrapper>
      </CMTriggerItem>
      <CMContent as={MenuContent} sideOffset={2} alignOffset={-2}>
        {children}
        <ContextMenuArrow offset={13} />
      </CMContent>
    </CMRoot>
  )
}

export const ContextMenuDivider = styled(CMSeparator, {
  backgroundColor: '$hover',
  height: 1,
  margin: '$2 -$2',
})

export const ContextMenuArrow = styled(CMArrow, {
  fill: '$panel',
})

export function ContextMenuButton({
  onSelect,
  children,
  disabled = false,
}: {
  onSelect?: () => void
  disabled?: boolean
  children: React.ReactNode
}): JSX.Element {
  return (
    <RowButton
      as={CMItem}
      bp={breakpoints}
      disabled={disabled}
      onSelect={onSelect}
    >
      {children}
    </RowButton>
  )
}

export function ContextMenuIconButton({
  onSelect,
  children,
  disabled = false,
}: {
  onSelect: () => void
  disabled?: boolean
  children: React.ReactNode
}): JSX.Element {
  return (
    <CMItem
      as={IconButton}
      bp={breakpoints}
      disabled={disabled}
      onSelect={onSelect}
    >
      {children}
    </CMItem>
  )
}

export function ContextMenuCheckboxItem({
  checked,
  disabled = false,
  onCheckedChange,
  children,
}: MenuCheckboxItemProps): JSX.Element {
  return (
    <CMCheckboxItem
      as={RowButton}
      bp={breakpoints}
      onCheckedChange={onCheckedChange}
      checked={checked}
      disabled={disabled}
    >
      {children}
      <CMItemIndicator>
        <IconWrapper size="small">
          <CheckIcon />
        </IconWrapper>
      </CMItemIndicator>
    </CMCheckboxItem>
  )
}

export function CircleIcon(
  props: Pick<React.SVGProps<SVGSVGElement>, 'stroke' | 'fill'> & {
    size: number
  }
) {
  const { size = 16, ...rest } = props
  return (
    <svg width={24} height={24} {...rest}>
      <circle cx={12} cy={12} r={size / 2} />
    </svg>
  )
}
