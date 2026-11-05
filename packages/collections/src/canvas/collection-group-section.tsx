import type { ReactNode } from 'react'
import { TldrawUiIcon, useEditor, useValue } from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import type { CollectionGroup } from './collection-groups'
import { collapsedGroupKeys } from './state'

/**
 * A named group of collections under a heading that folds it shut. An unnamed group has no heading
 * and shows its collections as they are.
 */
export function CollectionGroupSection({
	source,
	group,
	children,
}: {
	source: CollectionSource
	group: CollectionGroup
	children: ReactNode
}) {
	const editor = useEditor()
	const { key, label } = group
	const collapsed = useValue(
		'collection group collapsed',
		() => key !== undefined && (collapsedGroupKeys.get(editor)[source.id] ?? []).includes(key),
		[editor, source, key]
	)

	if (key === undefined || !label) return <>{children}</>

	const toggle = () =>
		collapsedGroupKeys.update(editor, (all) => {
			const keys = all[source.id] ?? []
			return {
				...all,
				[source.id]: collapsed ? keys.filter((k) => k !== key) : [...keys, key],
			}
		})

	return (
		<section className="tlui-collections-group" aria-label={label}>
			<h3 className="tlui-collections-group__heading">
				<button
					type="button"
					className="tlui-collections-group__toggle"
					aria-expanded={!collapsed}
					onClick={toggle}
				>
					<span className="tlui-collections-group__label">{label}</span>
					<TldrawUiIcon icon="chevron-down" label="" small className="tlui-collections-chevron" />
				</button>
			</h3>
			{!collapsed && children}
		</section>
	)
}
