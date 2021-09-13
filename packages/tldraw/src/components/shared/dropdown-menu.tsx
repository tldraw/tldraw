import * as React from 'react'
import { CheckIcon, ChevronRightIcon } from '@radix-ui/react-icons'
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

import { Tooltip } from './tooltip'
import { breakpoints } from './breakpoints'
import { RowButton } from './row-button'
import { IconButton } from './icon-button'
import { iconWrapper } from './icon-wrapper'
import { MenuContent } from './menu'

import styled from '~styles'

/* -------------------------------------------------- */
/*                    Dropdown Menu                   */
/* -------------------------------------------------- */

export interface DropdownMenuRootProps {
  isOpen?: boolean
  onOpenChange?: (isOpen: boolean) => void
  children: React.ReactNode
}

export function DropdownMenuRoot({
  isOpen,
  onOpenChange,
  children,
}: DropdownMenuRootProps): JSX.Element {
  return (
    <DMRoot dir="ltr" open={isOpen} onOpenChange={onOpenChange}>
      {children}
    </DMRoot>
  )
}

export interface DropdownMenuSubMenuProps {
  label: string
  disabled?: boolean
  children: React.ReactNode
}

export function DropdownMenuSubMenu({
  children,
  disabled = false,
  label,
}: DropdownMenuSubMenuProps): JSX.Element {
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

export interface DropdownMenuButtonProps {
  onSelect?: () => void
  disabled?: boolean
  children: React.ReactNode
}

export function DropdownMenuButton({
  onSelect,
  children,
  disabled = false,
}: DropdownMenuButtonProps): JSX.Element {
  return (
    <DMItem as={RowButton} bp={breakpoints} disabled={disabled} onSelect={onSelect}>
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
    <DMItem as={IconButton} bp={breakpoints} disabled={disabled} onSelect={onSelect}>
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
        <div className={iconWrapper({ size: 'small' })}>
          <CheckIcon />
        </div>
      </DMItemIndicator>
    </DMCheckboxItem>
  )
}
