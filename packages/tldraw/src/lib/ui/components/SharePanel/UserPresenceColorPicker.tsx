import { USER_COLORS, getOwnerWindow, track, useContainer, useEditor } from '@tldraw/editor'
import { TlButton } from '@tldraw/ui'
import { TlButtonIcon } from '@tldraw/ui'
import { TlGrid } from '@tldraw/ui'
import { TlPopover, TlPopoverContent, TlPopoverTrigger } from '@tldraw/ui'
import React, { useCallback, useRef, useState } from 'react'
import { useUiEvents } from '../../context/events'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'

/** @public @react */
export const UserPresenceColorPicker = track(function UserPresenceColorPicker() {
	const editor = useEditor()
	const container = useContainer()
	const msg = useTranslation()
	const trackEvent = useUiEvents()

	const rPointing = useRef(false)

	const [isOpen, setIsOpen] = useState(false)
	const handleOpenChange = useCallback((isOpen: boolean) => {
		setIsOpen(isOpen)
	}, [])

	const value = editor.user.getColor()

	const onValueChange = useCallback(
		(item: string) => {
			editor.user.updateUserPreferences({ color: item })
			trackEvent('set-color', { source: 'people-menu' })
		},
		[editor, trackEvent]
	)

	const {
		handleButtonClick,
		handleButtonPointerDown,
		handleButtonPointerEnter,
		handleButtonPointerUp,
	} = React.useMemo(() => {
		const handlePointerUp = () => {
			rPointing.current = false
			getOwnerWindow(container).removeEventListener('pointerup', handlePointerUp)
		}

		const handleButtonClick = (e: React.PointerEvent<HTMLButtonElement>) => {
			const { id } = e.currentTarget.dataset
			if (!id) return
			if (value === id) return

			onValueChange(id)
		}

		const handleButtonPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
			const { id } = e.currentTarget.dataset
			if (!id) return

			onValueChange(id)

			rPointing.current = true
			getOwnerWindow(container).addEventListener('pointerup', handlePointerUp) // see TLD-658
		}

		const handleButtonPointerEnter = (e: React.PointerEvent<HTMLButtonElement>) => {
			if (!rPointing.current) return

			const { id } = e.currentTarget.dataset
			if (!id) return
			onValueChange(id)
		}

		const handleButtonPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
			const { id } = e.currentTarget.dataset
			if (!id) return
			onValueChange(id)
		}

		return {
			handleButtonClick,
			handleButtonPointerDown,
			handleButtonPointerEnter,
			handleButtonPointerUp,
		}
	}, [container, value, onValueChange])

	return (
		<TlPopover id="people menu user color" onOpenChange={handleOpenChange} open={isOpen}>
			<TlPopoverTrigger>
				<TlButton
					type="icon"
					className="tlui-people-menu__user__color"
					style={{ color: editor.user.getColor() }}
					title={msg('people-menu.change-color')}
				>
					<TlButtonIcon icon="color" />
				</TlButton>
			</TlPopoverTrigger>
			<TlPopoverContent
				className="tlui-people-menu__user__color-picker"
				align="start"
				side="left"
				sideOffset={8}
			>
				<TlGrid>
					{USER_COLORS.map((item: string) => (
						<TlButton
							type="icon"
							key={item}
							data-id={item}
							data-testid={item}
							aria-label={item}
							isActive={value === item}
							title={item}
							style={{ color: item }}
							onPointerEnter={handleButtonPointerEnter}
							onPointerDown={handleButtonPointerDown}
							onPointerUp={handleButtonPointerUp}
							onClick={handleButtonClick}
						>
							<TlButtonIcon icon="color" />
						</TlButton>
					))}
				</TlGrid>
			</TlPopoverContent>
		</TlPopover>
	)
})
