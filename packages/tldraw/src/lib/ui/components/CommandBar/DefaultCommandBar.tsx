import { useContainer } from '@tldraw/editor'
import { Dialog as _Dialog } from 'radix-ui'
import { memo, useCallback, useEffect, useRef } from 'react'
import { CommandBarItem, useCommandBar } from '../../hooks/useCommandBar'
import { useDirection, useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiIcon } from '../primitives/TldrawUiIcon'
import { TldrawUiKbd } from '../primitives/TldrawUiKbd'

/** @public @react */
export const DefaultCommandBar = memo(function DefaultCommandBar() {
	const {
		isOpen,
		query,
		setQuery,
		selectedIndex,
		setSelectedIndex,
		filteredItems,
		handleKeyDown,
		executeItem,
		close,
	} = useCommandBar()

	const container = useContainer()
	const dir = useDirection()
	const msg = useTranslation()
	const listRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!isOpen) return
		const list = listRef.current
		if (!list) return
		const selected = list.children[selectedIndex] as HTMLElement | undefined
		if (selected) {
			selected.scrollIntoView({ block: 'nearest' })
		}
	}, [selectedIndex, isOpen])

	const handleOpenChange = useCallback(
		(open: boolean) => {
			if (!open) close()
		},
		[close]
	)

	if (!isOpen) return null

	return (
		<_Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
			<_Dialog.Portal container={container}>
				<_Dialog.Overlay dir={dir} className="tlui-command-bar__overlay" onClick={close}>
					<_Dialog.Content
						dir={dir}
						className="tlui-command-bar__content"
						aria-label={msg('command-bar.title')}
						aria-describedby={undefined}
						onKeyDown={handleKeyDown}
						onClick={(e) => e.stopPropagation()}
						onInteractOutside={(e) => {
							e.preventDefault()
							close()
						}}
					>
						<div className="tlui-command-bar__input-wrapper">
							<input
								className="tlui-command-bar__input"
								type="text"
								value={query}
								onChange={(e) => setQuery(e.currentTarget.value)}
								placeholder={msg('command-bar.placeholder')}
								autoFocus
								aria-label={msg('command-bar.placeholder')}
								aria-activedescendant={
									filteredItems[selectedIndex]
										? `command-bar-item-${filteredItems[selectedIndex].id}`
										: undefined
								}
								aria-controls="command-bar-list"
								role="combobox"
								aria-expanded={true}
								aria-haspopup="listbox"
								autoComplete="off"
							/>
						</div>
						{filteredItems.length > 0 ? (
							<div
								id="command-bar-list"
								ref={listRef}
								className="tlui-command-bar__results"
								role="listbox"
							>
								{filteredItems.map((item, index) => (
									<CommandBarItemRow
										key={item.id}
										item={item}
										isSelected={index === selectedIndex}
										onExecute={() => executeItem(item)}
										onHover={() => setSelectedIndex(index)}
									/>
								))}
							</div>
						) : (
							<div className="tlui-command-bar__empty">{msg('command-bar.empty')}</div>
						)}
					</_Dialog.Content>
				</_Dialog.Overlay>
			</_Dialog.Portal>
		</_Dialog.Root>
	)
})

interface CommandBarItemRowProps {
	item: CommandBarItem
	isSelected: boolean
	onExecute(): void
	onHover(): void
}

const CommandBarItemRow = memo(function CommandBarItemRow({
	item,
	isSelected,
	onExecute,
	onHover,
}: CommandBarItemRowProps) {
	const msg = useTranslation()

	let iconElement: React.ReactNode
	if (item.checkbox && item.checked !== undefined) {
		iconElement = <TldrawUiIcon icon={item.checked ? 'check' : 'none'} label="" small />
	} else if (item.icon) {
		iconElement = <TldrawUiIcon icon={item.icon} label="" small />
	} else {
		iconElement = <div className="tlui-command-bar__item-icon-placeholder" />
	}

	return (
		<button
			id={`command-bar-item-${item.id}`}
			className="tlui-command-bar__item"
			role="option"
			aria-selected={isSelected}
			aria-disabled={!item.enabled}
			data-isselected={isSelected}
			data-disabled={!item.enabled || undefined}
			onClick={onExecute}
			onMouseEnter={onHover}
		>
			{iconElement}
			<span className="tlui-command-bar__item-label">
				{item.label}
				{item.checkbox && item.checked !== undefined && (
					<span className="tlui-command-bar__item-state">
						{' '}
						— {msg(item.checked ? 'ui.checked' : 'ui.unchecked')}
					</span>
				)}
				{item.type === 'tool' && (
					<span className="tlui-command-bar__item-state"> — {msg('command-bar.type-tool')}</span>
				)}
				{!item.enabled && item.disabledDescription && (
					<span className="tlui-command-bar__item-disabled-description">
						{' '}
						— {item.disabledDescription}
					</span>
				)}
			</span>
			{item.displayKbd && <TldrawUiKbd>{item.displayKbd}</TldrawUiKbd>}
		</button>
	)
})
