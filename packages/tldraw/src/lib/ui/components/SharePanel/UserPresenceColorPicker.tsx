import { USER_COLORS, track, useContainer, useEditor } from '@tldraw/editor'
import { Popover as _Popover } from 'radix-ui'
import React, { useCallback, useRef, useState } from 'react'
import { useUiEvents } from '../../context/events'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiGrid } from '../primitives/layout'

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
			window.removeEventListener('pointerup', handlePointerUp)
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
			window.addEventListener('pointerup', handlePointerUp) // see TLD-658
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
	}, [value, onValueChange])

	return (
		<_Popover.Root onOpenChange={handleOpenChange} open={isOpen}>
			<_Popover.Trigger dir="ltr" asChild>
				<TldrawUiButton
					type="icon"
					className="tlui-people-menu__user__color"
					style={{ color: editor.user.getColor() }}
					title={msg('people-menu.change-color')}
				>
					<TldrawUiButtonIcon icon="color" />
				</TldrawUiButton>
			</_Popover.Trigger>
			<_Popover.Portal container={container}>
				<_Popover.Content
					dir="ltr"
					className="tlui-menu tlui-people-menu__user__color-picker"
					align="start"
					side="left"
					sideOffset={8}
				>
					<TldrawUiGrid>
						{USER_COLORS.map((item: string) => (
							<TldrawUiButton
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
								<TldrawUiButtonIcon icon="color" />
							</TldrawUiButton>
						))}
					</TldrawUiGrid>
				</_Popover.Content>
			</_Popover.Portal>
		</_Popover.Root>
	)
})
