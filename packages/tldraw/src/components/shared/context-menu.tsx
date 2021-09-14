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
import { rowButton } from './row-button'
import { iconButton } from './icon-button'
import { iconWrapper } from './icon-wrapper'
import { menuContent } from './menu'
import css from '~styles'

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
      <CMTriggerItem className={rowButton({ bp: breakpoints })}>
        <span>{label}</span>
        <div className={iconWrapper({ size: 'small' })}>
          <ChevronRightIcon />
        </div>
      </CMTriggerItem>
      <CMContent className={menuContent()} sideOffset={2} alignOffset={-2}>
        {children}
        <ContextMenuArrow offset={13} />
      </CMContent>
    </CMRoot>
  )
}

const contextMenuDivider = css({
  backgroundColor: '$hover',
  height: 1,
  margin: '$2 -$2',
})

export const ContextMenuDivider = React.forwardRef<
  React.ElementRef<typeof CMSeparator>,
  React.ComponentProps<typeof CMSeparator>
>((props, forwardedRef) => (
  <CMSeparator
    {...props}
    ref={forwardedRef}
    className={contextMenuDivider({ className: props.className })}
  />
))

const contextMenuArrow = css({
  fill: '$panel',
})

export const ContextMenuArrow = React.forwardRef<
  React.ElementRef<typeof CMArrow>,
  React.ComponentProps<typeof CMArrow>
>((props, forwardedRef) => (
  <CMArrow
    {...props}
    ref={forwardedRef}
    className={contextMenuArrow({ className: props.className })}
  />
))

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
    <CMItem className={rowButton({ bp: breakpoints })} disabled={disabled} onSelect={onSelect}>
      {children}
    </CMItem>
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
    <CMItem className={iconButton({ bp: breakpoints })} disabled={disabled} onSelect={onSelect}>
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
      className={rowButton({ bp: breakpoints })}
      onCheckedChange={onCheckedChange}
      checked={checked}
      disabled={disabled}
    >
      {children}
      <CMItemIndicator>
        <div className={iconWrapper({ size: 'small' })}>
          <CheckIcon />
        </div>
      </CMItemIndicator>
    </CMCheckboxItem>
  )
}
