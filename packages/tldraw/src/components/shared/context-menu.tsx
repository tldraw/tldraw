import * as React from 'react'
import { CheckIcon, ChevronRightIcon } from '@radix-ui/react-icons'
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
import { breakpoints } from './breakpoints'
import { RowButton } from './row-button'
import { IconButton } from './icon-button'
import { IconWrapper } from './icon-wrapper'
import { MenuContent } from './menu'
import styled from '~styles'

/* -------------------------------------------------- */
/*                    Context Menu                   */
/* -------------------------------------------------- */

export interface ContextMenuRootProps {
  onOpenChange?: (isOpen: boolean) => void
  children: React.ReactNode
}

export function ContextMenuRoot({ onOpenChange, children }: ContextMenuRootProps): JSX.Element {
  return (
    <CMRoot dir="ltr" onOpenChange={onOpenChange}>
      {children}
    </CMRoot>
  )
}

export interface ContextMenuSubMenuProps {
  label: string
  children: React.ReactNode
}

export function ContextMenuSubMenu({ children, label }: ContextMenuSubMenuProps): JSX.Element {
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

export interface ContextMenuButtonProps {
  onSelect?: () => void
  disabled?: boolean
  children: React.ReactNode
}

export function ContextMenuButton({
  onSelect,
  children,
  disabled = false,
}: ContextMenuButtonProps): JSX.Element {
  return (
    <RowButton as={CMItem} bp={breakpoints} disabled={disabled} onSelect={onSelect}>
      {children}
    </RowButton>
  )
}

interface ContextMenuIconButtonProps {
  onSelect: () => void
  disabled?: boolean
  children: React.ReactNode
}

export function ContextMenuIconButton({
  onSelect,
  children,
  disabled = false,
}: ContextMenuIconButtonProps): JSX.Element {
  return (
    <CMItem as={IconButton} bp={breakpoints} disabled={disabled} onSelect={onSelect}>
      {children}
    </CMItem>
  )
}

interface ContextMenuCheckboxItemProps {
  checked: boolean
  disabled?: boolean
  onCheckedChange: (isChecked: boolean) => void
  children: React.ReactNode
}

export function ContextMenuCheckboxItem({
  checked,
  disabled = false,
  onCheckedChange,
  children,
}: ContextMenuCheckboxItemProps): JSX.Element {
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
