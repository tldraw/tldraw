import { useEditor } from '@tldraw/editor'
import { useCallback, useState } from 'react'
import { unwrapLabel, useActions } from '../../context/actions'
import { useMenuIsOpen } from '../../hooks/useMenuIsOpen'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonLabel } from '../primitives/Button/TldrawUiButtonLabel'
import { TldrawUiKbd } from '../primitives/TldrawUiKbd'

export const COMMAND_BAR_ID = 'command bar'

export function CommmandBar() {
	const actions = useActions()
	const editor = useEditor()
	const [isOpen] = useMenuIsOpen(COMMAND_BAR_ID)
	const msg = useTranslation()
	const [selected, setSelected] = useState(-1)
	const [search, setSearch] = useState('')
	const filteredActions = Object.values(actions)
		.filter((action) => {
			// if (!action.enabled?.()) return false
			const unwrapped = unwrapLabel(action.label, 'default')
			const value = msg(unwrapped as TLUiTranslationKey)
			if (!value) return false
			if (search === '') return true
			return value.toLowerCase().includes(search.toLowerCase())
		})
		.sort((a, b) => {
			if (!a.enabled?.()) {
				return 1
			}
			if (!b.enabled?.()) {
				return -1
			}
			return 0
		})

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			switch (e.key) {
				case 'Escape':
					editor.deleteOpenMenu(COMMAND_BAR_ID)
					break
				case 'Tab':
					if (e.shiftKey) {
						e.preventDefault()
						const next = selected - 1
						setSelected(next < 0 ? filteredActions.length - 1 : next)
					} else {
						e.preventDefault()
						setSelected((selected + 1) % filteredActions.length)
					}
					break
				case 'ArrowUp':
					{
						e.preventDefault()
						const next = selected - 1
						setSelected(next < 0 ? filteredActions.length - 1 : next)
					}
					break
				case 'ArrowDown':
					e.preventDefault()
					setSelected((selected + 1) % filteredActions.length)
					break

				case 'Enter': {
					const action = filteredActions[selected]
					if (!action || !action.enabled?.()) return
					editor.deleteOpenMenu(COMMAND_BAR_ID)
					action.onSelect('command-bar')
					setSearch('')
					setSelected(-1)
					break
				}
			}
		},
		[editor, filteredActions, selected]
	)

	if (!isOpen) return null

	return (
		<div
			style={{
				position: 'absolute',
				inset: 0,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				zIndex: 'var(--layer-panels)',
			}}
		>
			<div style={{ height: '300px' }}>
				<div
					style={{
						pointerEvents: 'all',
						boxShadow: 'var(--shadow-2)',
						overflow: 'hidden',
						borderRadius: 'var(--radius-3)',
						background: 'var(--color-background)',
					}}
				>
					<div
						style={{
							padding: '4px',
							height: 'fit-content',
							width: '300px',
							display: 'flex',
							flexDirection: 'column',
							gap: '8px',
						}}
						onKeyDown={handleKeyDown}
					>
						<input
							autoFocus
							type="text"
							value={search}
							placeholder="Search..."
							style={{
								width: '100%',
								border: 'none',
								padding: '8px',
								background: 'var(--color-background)',
								color: 'var(--color-text-1)',
							}}
							onChange={(e) => {
								const value = e.target.value
								setSearch(value)
								if (selected === -1) {
									setSelected(0)
								}
								if (value === '') setSelected(-1)
							}}
						/>
						{filteredActions.length !== 0 && (
							<div>
								{filteredActions.slice(0, 6).map((action, i) => {
									const { id, label, kbd } = action
									const enabled = action.enabled?.()

									const labelToUse = unwrapLabel(label, 'default')

									const labelStr = labelToUse ? msg(labelToUse as TLUiTranslationKey) : undefined

									return (
										<div
											key={id}
											style={{
												color: enabled ? 'var(--color-text-1)' : '#aaa',
												overflow: 'visible',
											}}
										>
											<div
												style={{
													background:
														i === selected ? 'var(--color-hint)' : 'var(--color-background)',
													borderRadius: 'var(--radius-2)',
													display: 'flex',
													alignItems: 'center',
												}}
											>
												<TldrawUiButton type="menu" disabled={!enabled}>
													<TldrawUiButtonLabel>{labelStr}</TldrawUiButtonLabel>
													{kbd && <TldrawUiKbd>{kbd}</TldrawUiKbd>}
												</TldrawUiButton>
											</div>
											{selected === i && !enabled && action.disabledDescription && (
												<span
													style={{
														fontSize: '10px',
														padding: '4px',
													}}
												>
													{action.disabledDescription}
												</span>
											)}
										</div>
									)
								})}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}
