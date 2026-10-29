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
	hasCheckSlot,
	indexByKey,
	activeIndex,
	rScrollToActive,
	onHover,
	onRun,
}: {
	listboxId: string
	sections: CommandPaletteSection[]
	hasCheckSlot: boolean
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
					hasCheckSlot={hasCheckSlot}
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
	hasCheckSlot,
	isActive,
	rScrollToActive,
	onHover,
	onRun,
}: {
	id: string
	row: SelectableRow
	hasCheckSlot: boolean
	isActive: boolean
	rScrollToActive: RefObject<boolean>
	onHover(): void
	onRun(): void
}) {
	const dir = useDirection()
	const rRow = useRef<HTMLDivElement>(null)
	useLayoutEffect(() => {
		if (isActive && rScrollToActive.current) rRow.current?.scrollIntoView?.({ block: 'nearest' })
	}, [isActive, rScrollToActive])

	const mark = getMark(row)
	// Decorative: the row's aria-checked carries the state.
	const checkSlot = hasCheckSlot && (
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
				onClick={onRun}
			>
				<span className="tlui-command-palette__row">
					{checkSlot}
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
			data-highlighted={isActive || undefined}
			data-testid={`command-palette.${row.recent ? 'recent' : 'item'}.${entry.id}`}
			className="tlui-command-palette__item"
			onPointerMove={onHover}
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
