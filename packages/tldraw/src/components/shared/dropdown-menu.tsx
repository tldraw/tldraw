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
import { rowButton } from './row-button'
import { iconButton } from './icon-button'
import { iconWrapper } from './icon-wrapper'
import { menuContent } from './menu'

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
      <DMTriggerItem className={rowButton({ bp: breakpoints })} disabled={disabled}>
        <span>{label}</span>
        <div className={iconWrapper({ size: 'small' })}>
          <ChevronRightIcon />
        </div>
      </DMTriggerItem>
      <DMContent className={menuContent()} sideOffset={2} alignOffset={-2}>
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
    <DMItem className={rowButton({ bp: breakpoints })} disabled={disabled} onSelect={onSelect}>
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
    <DMItem className={iconButton({ bp: breakpoints })} disabled={disabled} onSelect={onSelect}>
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
    <DMTrigger className={iconButton({ bp: breakpoints })} disabled={disabled}>
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
      className={rowButton({ bp: breakpoints })}
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
