import { defineMessages } from '@tldraw/editor'
import { RefObject, useLayoutEffect, useRef } from 'react'
import { useDirection, useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiIcon } from '../primitives/TldrawUiIcon'
import { TldrawUiKbd } from '../primitives/TldrawUiKbd'
import { CommandPaletteSection, SelectableRow } from './commandPaletteRows'

const getMark = (row: SelectableRow) =>
	row.type === 'item' ? (row.entry.checked ?? row.entry.isSelected) : undefined

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
		// Only sections with a checkable row reserve the check slot, so their labels line up.
		const hasCheckSlot = section.rows.some((row) => getMark(row) !== undefined)
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
	const msg = useTranslation()
	const dir = useDirection()
	const rRow = useRef<HTMLDivElement>(null)
	useLayoutEffect(() => {
		if (isActive && rScrollToActive.current) rRow.current?.scrollIntoView?.({ block: 'nearest' })
	}, [isActive, rScrollToActive])

	const mark = getMark(row)
	const checkSlot = hasCheckSlot && (
		<TldrawUiIcon
			icon={mark ? 'check' : 'none'}
			small
			label={mark === undefined ? '' : msg(mark ? messages.checked : messages.unchecked)}
			aria-hidden={mark === undefined || undefined}
		/>
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
				{row.icon ? <TldrawUiIcon aria-hidden="true" label="" icon={row.icon} small /> : checkSlot}
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
