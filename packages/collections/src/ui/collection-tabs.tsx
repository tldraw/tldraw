import { type KeyboardEvent, useEffect, useRef } from 'react'

/** @public */
export interface CollectionTabsProps<Id extends string = string> {
	collections: { id: Id; name: string }[]
	value: Id
	onValueChange(id: Id): void
	label: string
	/** The id of the element showing the chosen collection, which each tab controls. */
	panelId?: string
}

/**
 * A row of tabs, one per collection, that scrolls sideways when they don't fit. The arrow keys,
 * Home and End move between tabs.
 * @public @react
 */
export function CollectionTabs<Id extends string>({
	collections,
	value,
	onValueChange,
	label,
	panelId,
}: CollectionTabsProps<Id>) {
	const listRef = useRef<HTMLDivElement>(null)
	useEffect(() => {
		listRef.current
			?.querySelector('[aria-selected="true"]')
			?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
	}, [value])

	const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		const index = collections.findIndex((collection) => collection.id === value)
		const last = collections.length - 1
		const next = {
			ArrowLeft: index <= 0 ? last : index - 1,
			ArrowRight: index >= last ? 0 : index + 1,
			Home: 0,
			End: last,
		}[e.key]
		if (next === undefined) return
		e.preventDefault()
		onValueChange(collections[next].id)
		listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
	}

	return (
		<div
			ref={listRef}
			role="tablist"
			aria-label={label}
			className="tlui-collections-tabs"
			onKeyDown={onKeyDown}
		>
			{collections.map((collection) => {
				const selected = collection.id === value
				return (
					<button
						key={collection.id}
						type="button"
						role="tab"
						className="tlui-collections-tab"
						aria-selected={selected}
						aria-controls={selected ? panelId : undefined}
						tabIndex={selected ? 0 : -1}
						title={collection.name}
						onClick={() => onValueChange(collection.id)}
					>
						{collection.name}
					</button>
				)
			})}
		</div>
	)
}
