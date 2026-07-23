import { useContainer } from '@tldraw/editor'
import classNames from 'classnames'
import { HoverCard as _HoverCard } from 'radix-ui'
import React from 'react'
import { useDirection } from '../../hooks/useTranslation/useTranslation'

/** @public */
export interface TLUiHoverCardProps {
	children: React.ReactNode
	/** Delay in ms before the card opens on hover. Defaults to Radix's 700. */
	openDelay?: number
	/**
	 * Delay in ms before the card closes after the pointer leaves. This grace period is what lets
	 * the pointer travel from the trigger into the card without it closing. Defaults to 150.
	 */
	closeDelay?: number
}

/**
 * A hover-triggered card: opens when the pointer rests on the trigger and, unlike a tooltip, stays
 * open while the pointer moves into the content — so the content can be interactive or scrollable.
 * Clicks pass through to the trigger. Pair with `TldrawUiHoverCardTrigger` and
 * `TldrawUiHoverCardContent`.
 *
 * @public @react
 */
export function TldrawUiHoverCard({
	children,
	openDelay = 700,
	closeDelay = 150,
}: TLUiHoverCardProps) {
	return (
		<_HoverCard.Root openDelay={openDelay} closeDelay={closeDelay}>
			{children}
		</_HoverCard.Root>
	)
}

/** @public */
export interface TLUiHoverCardTriggerProps {
	children?: React.ReactNode
}

/** @public @react */
export function TldrawUiHoverCardTrigger({ children }: TLUiHoverCardTriggerProps) {
	// asChild so the trigger is the child element itself; HoverCard.Trigger only adds hover/focus
	// listeners and does not intercept clicks, so a trigger that is also a button still works.
	return <_HoverCard.Trigger asChild>{children}</_HoverCard.Trigger>
}

/** @public */
export interface TLUiHoverCardContentProps {
	children: React.ReactNode
	className?: string
	side?: 'top' | 'bottom' | 'left' | 'right'
	align?: 'start' | 'center' | 'end'
	sideOffset?: number
	alignOffset?: number
	collisionPadding?: number
}

/** @public @react */
export function TldrawUiHoverCardContent({
	children,
	className,
	side = 'top',
	align = 'center',
	sideOffset = 8,
	alignOffset = 0,
	collisionPadding = 8,
}: TLUiHoverCardContentProps) {
	const container = useContainer()
	const dir = useDirection()
	return (
		<_HoverCard.Portal container={container}>
			<_HoverCard.Content
				className={classNames('tlui-hover-card__content', className)}
				side={side}
				align={align}
				sideOffset={sideOffset}
				alignOffset={alignOffset}
				collisionPadding={collisionPadding}
				dir={dir}
			>
				{children}
			</_HoverCard.Content>
		</_HoverCard.Portal>
	)
}
