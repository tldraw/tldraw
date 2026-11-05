import { type ReactNode, useEffect } from 'react'
import {
	defineMessages,
	getIncrementedName,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiIcon,
	useEditor,
	useToasts,
	useTranslation,
	useValue,
} from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import type { CollectionGroup } from './collection-groups'
import { createNewCollection } from './new-collection'
import { activeCollectionId, collapsedGroupKeys, renamingCollectionId } from './state'

const messages = defineMessages({
	newCollectionIn: {
		id: 'collections.group.new-collection',
		defaultMessage: 'New collection in {name}',
	},
	newPrivateCollection: {
		id: 'collections.group.new-private-collection',
		defaultMessage: 'New private collection',
	},
	newCollectionName: { id: 'collections.new-collection-name', defaultMessage: 'New collection' },
	changeErrorTitle: {
		id: 'collections.collection-error.title',
		defaultMessage: "Couldn't change collections",
	},
	changeErrorDescription: {
		id: 'collections.collection-error.description',
		defaultMessage: 'You may not be allowed to, or the collection no longer exists.',
	},
})

/**
 * A named group of collections under a heading that folds it shut. When the group is an owner that
 * takes new collections, the heading also has a "+" that creates one there. An unnamed group has no
 * heading and shows its collections as they are.
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
	const msg = useTranslation()
	const { addToast } = useToasts()
	const { key, label } = group
	const collapsed = useValue(
		'collection group collapsed',
		() => key !== undefined && (collapsedGroupKeys.get(editor)[source.id] ?? []).includes(key),
		[editor, source, key]
	)
	const owner = useValue(
		'group owner',
		() =>
			(source.getCollectionOwners ? source.getCollectionOwners() : []).find((o) => o.id === key),
		[source, key]
	)
	const canCreate = useValue(
		'group can create',
		() => owner !== undefined && !owner.readOnly && source.can('createCollection'),
		[source, owner]
	)

	// Unfolds when a collection in it is brought into view.
	const holdsActive = useValue(
		'group holds active collection',
		() => group.collections.some((c) => c.id === activeCollectionId.get(editor)),
		[editor, group.collections]
	)
	useEffect(() => {
		if (!holdsActive || key === undefined) return
		collapsedGroupKeys.update(editor, (all) => ({
			...all,
			[source.id]: (all[source.id] ?? []).filter((k) => k !== key),
		}))
	}, [editor, source, key, holdsActive])

	if (key === undefined || !label) return <>{children}</>

	const setCollapsed = (shut: boolean) =>
		collapsedGroupKeys.update(editor, (all) => {
			const keys = (all[source.id] ?? []).filter((k) => k !== key)
			return { ...all, [source.id]: shut ? [...keys, key] : keys }
		})

	const createCollection = () => {
		const name = getIncrementedName(
			msg(messages.newCollectionName),
			source.getCollections().map((collection) => collection.name)
		)
		createNewCollection(source, name, key).then(
			(collection) => {
				activeCollectionId.set(editor, collection.id)
				renamingCollectionId.set(editor, collection.id)
			},
			() =>
				addToast({
					title: msg(messages.changeErrorTitle),
					description: msg(messages.changeErrorDescription),
					severity: 'error',
				})
		)
	}

	const addLabel = owner?.private
		? msg(messages.newPrivateCollection)
		: msg(messages.newCollectionIn, { name: label })

	return (
		<section className="tlui-collections-group" aria-label={label}>
			<h3 className="tlui-collections-group__heading">
				<button
					type="button"
					className="tlui-collections-group__toggle"
					aria-expanded={!collapsed}
					onClick={() => setCollapsed(!collapsed)}
				>
					<span className="tlui-collections-group__label">{label}</span>
					<TldrawUiIcon icon="chevron-down" label="" small className="tlui-collections-chevron" />
				</button>
				{canCreate && (
					<TldrawUiButton
						type="icon"
						tooltip={addLabel}
						title={addLabel}
						onClick={createCollection}
					>
						<TldrawUiButtonIcon icon="plus" small />
					</TldrawUiButton>
				)}
			</h3>
			{!collapsed && children}
		</section>
	)
}
