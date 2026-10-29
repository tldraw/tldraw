import { defineMessages } from '@tldraw/editor'
import { RefObject, useLayoutEffect, useRef } from 'react'
import { useDirection, useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiIcon } from '../primitives/TldrawUiIcon'
import { TldrawUiKbd } from '../primitives/TldrawUiKbd'
import { CommandPaletteSection, SelectableRow } from './commandPaletteRows'

const messages = defineMessages({
	checked: { id: 'ui.checked', defaultMessage: 'Checked' },
	unchecked: { id: 'ui.unchecked', defaultMessage: 'Unchecked' },
})

/** @internal */
export function getCommandPaletteOptionId(listboxId: string, index: number) {
	return `${listboxId}-option-${index}`
}

/** @internal */
export function CommandPaletteList({
	listboxId,
	sections,
	indexByKey,
	activeIndex,
	rScrollToActive,
	onHover,
	onRun,
}: {
	listboxId: string
	sections: CommandPaletteSection[]
	indexByKey: ReadonlyMap<string, number>
	activeIndex: number
	rScrollToActive: RefObject<boolean>
	onHover(index: number): void
	onRun(row: SelectableRow): void
}) {
	return sections.map((section, sectionIndex) => {
		const options = section.rows.map((row) => {
			const index = indexByKey.get(row.key)!
			return (
				<CommandPaletteRowView
					key={row.key}
					id={getCommandPaletteOptionId(listboxId, index)}
					row={row}
					isActive={index === activeIndex}
					rScrollToActive={rScrollToActive}
					onHover={() => onHover(index)}
					onRun={() => onRun(row)}
				/>
			)
		})
		if (section.separated) {
			return (
				<div key={section.key} role="group">
					<div role="separator" className="tlui-command-palette__separator" />
					{options}
				</div>
			)
		}
		if (!section.heading) return options
		const headingId = `${listboxId}-heading-${sectionIndex}`
		return (
			<div key={section.heading.key} role="group" aria-labelledby={headingId}>
				<div id={headingId} className="tlui-command-palette__heading">
					{section.heading.label}
				</div>
				{options}
			</div>
		)
	})
}

function CommandPaletteRowView({
	id,
	row,
	isActive,
	rScrollToActive,
	onHover,
	onRun,
}: {
	id: string
	row: SelectableRow
	isActive: boolean
	rScrollToActive: RefObject<boolean>
	onHover(): void
	onRun(): void
}) {
	const msg = useTranslation()
	const dir = useDirection()
	const rRow = useRef<HTMLDivElement>(null)
	useLayoutEffect(() => {
		if (isActive && rScrollToActive.current) rRow.current?.scrollIntoView?.({ block: 'nearest' })
	}, [isActive, rScrollToActive])

	if (row.type === 'submenu') {
		return (
			<div
				ref={rRow}
				id={id}
				role="option"
				aria-selected={isActive}
				data-highlighted={isActive || undefined}
				data-testid={`command-palette.submenu.${row.submenu.label}`}
				className="tlui-command-palette__item"
				onPointerMove={onHover}
				onClick={onRun}
			>
				<span className="tlui-command-palette__row">
					<TldrawUiIcon aria-hidden="true" label="" icon={row.submenu.icon ?? 'none'} small />
					<span className="tlui-command-palette__label">{row.submenu.label}</span>
					<TldrawUiIcon
						aria-hidden="true"
						label=""
						icon={dir === 'rtl' ? 'chevron-left' : 'chevron-right'}
						small
					/>
				</span>
			</div>
		)
	}

	const { entry } = row
	const marked = entry.checked ?? entry.isSelected
	const reasonId = `${id}-reason`
	const showReason = isActive && entry.disabled && !!entry.disabledReason
	return (
		<div
			ref={rRow}
			id={id}
			role="option"
			aria-selected={isActive}
			aria-disabled={entry.disabled || undefined}
			aria-describedby={showReason ? reasonId : undefined}
			data-highlighted={isActive || undefined}
			data-testid={`command-palette.${row.recent ? 'recent' : 'item'}.${entry.id}`}
			className="tlui-command-palette__item"
			onPointerMove={onHover}
			onClick={onRun}
		>
			<span className="tlui-command-palette__row">
				{/* One leading slot on every row, so labels line up: a check or an icon, never both. */}
				{marked !== undefined ? (
					<TldrawUiIcon
						icon={marked ? 'check' : 'none'}
						small
						label={msg(marked ? messages.checked : messages.unchecked)}
					/>
				) : (
					<TldrawUiIcon
						aria-hidden="true"
						label=""
						icon={row.icon ?? (entry.icon || 'none')}
						small
					/>
				)}
				<span className="tlui-command-palette__label">
					{row.label}
					{row.detail && <span className="tlui-command-palette__detail">{row.detail}</span>}
				</span>
				{/* In the shortcut's place, so showing it doesn't change the row's height. */}
				{showReason ? (
					<span id={reasonId} className="tlui-command-palette__reason">
						{entry.disabledReason}
					</span>
				) : (
					entry.kbd && <TldrawUiKbd>{entry.kbd}</TldrawUiKbd>
				)}
			</span>
		</div>
	)
}
