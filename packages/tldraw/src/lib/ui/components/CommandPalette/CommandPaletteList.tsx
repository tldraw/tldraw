import { RefObject, useLayoutEffect, useRef } from 'react'
import { useDirection } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiIcon } from '../primitives/TldrawUiIcon'
import { TldrawUiKbd } from '../primitives/TldrawUiKbd'
import { CommandPaletteSection, SelectableRow } from './commandPaletteRows'
import { CommandPaletteEntry } from './CommandPaletteStore'

const getMark = (row: SelectableRow) =>
	row.type === 'item' ? getCommandPaletteEntryMark(row.entry) : undefined

/** @internal */
export function getCommandPaletteEntryMark(entry: CommandPaletteEntry) {
	return entry.checked ?? entry.isSelected
}

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
	onLeave,
	onRun,
}: {
	listboxId: string
	sections: CommandPaletteSection[]
	indexByKey: ReadonlyMap<string, number>
	activeIndex: number
	rScrollToActive: RefObject<boolean>
	onHover(index: number): void
	onLeave(): void
	onRun(row: SelectableRow): void
}) {
	return sections.map((section, sectionIndex) => {
		// A separator just before a heading leaves an empty section; it would draw a second divider.
		if (!section.rows.length) return null
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
					onLeave={onLeave}
					onRun={() => onRun(row)}
				/>
			)
		})
		// Every section is a group, divided from the next like .tlui-menu__group.
		const headingId = section.heading && `${listboxId}-heading-${sectionIndex}`
		return (
			<div
				key={section.key}
				role="group"
				aria-labelledby={headingId}
				className="tlui-command-palette__group"
			>
				{section.heading && (
					<div id={headingId} className="tlui-command-palette__heading">
						{section.heading.label}
					</div>
				)}
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
	onLeave,
	onRun,
}: {
	id: string
	row: SelectableRow
	isActive: boolean
	rScrollToActive: RefObject<boolean>
	onHover(): void
	onLeave(): void
	onRun(): void
}) {
	const dir = useDirection()
	const rRow = useRef<HTMLDivElement>(null)
	useLayoutEffect(() => {
		if (isActive && rScrollToActive.current) rRow.current?.scrollIntoView?.({ block: 'nearest' })
	}, [isActive, rScrollToActive])

	const mark = getMark(row)
	// Like menu checkbox items, only checkable rows lead with a check. Decorative: the row's
	// aria-checked carries the state.
	const checkSlot = mark !== undefined && (
		<TldrawUiIcon icon={mark ? 'check' : 'none'} small label="" aria-hidden="true" />
	)

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
				onPointerLeave={onLeave}
				onClick={onRun}
			>
				<span className="tlui-command-palette__row">
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
	return (
		<div
			ref={rRow}
			id={id}
			role="option"
			aria-selected={isActive}
			aria-checked={mark}
			aria-disabled={entry.disabled || undefined}
			data-highlighted={isActive || undefined}
			data-testid={`command-palette.${row.recent ? 'recent' : 'item'}.${entry.id}`}
			className="tlui-command-palette__item"
			// Like a disabled menu row, it takes no highlight, so hovering it drops the last one.
			onPointerMove={entry.disabled ? onLeave : onHover}
			onPointerLeave={onLeave}
			onClick={onRun}
		>
			<span className="tlui-command-palette__row">
				{row.icon ? <TldrawUiIcon aria-hidden="true" label="" icon={row.icon} small /> : checkSlot}
				<span className="tlui-command-palette__label">
					{row.label}
					{row.detail && <span className="tlui-command-palette__detail">{row.detail}</span>}
				</span>
				{entry.kbd && <TldrawUiKbd>{entry.kbd}</TldrawUiKbd>}
			</span>
		</div>
	)
}
