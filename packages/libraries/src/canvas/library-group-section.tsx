import { type ReactNode, useEffect } from 'react'
import {
	defineMessages,
	getIncrementedName,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiIcon,
	useEditor,
	useReadonly,
	useToasts,
	useTranslation,
	useValue,
} from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import type { LibraryGroup } from './library-groups'
import { createNewLibrary } from './new-library'
import { activeLibraryId, collapsedGroupKeys, renamingLibraryId } from './state'

const messages = defineMessages({
	newLibraryIn: {
		id: 'libraries.group.new-library',
		defaultMessage: 'New library in {name}',
	},
	newLibraryName: { id: 'libraries.new-library-name', defaultMessage: 'New library' },
	changeErrorTitle: {
		id: 'libraries.library-error.title',
		defaultMessage: "Couldn't change libraries",
	},
	changeErrorDescription: {
		id: 'libraries.library-error.description',
		defaultMessage: 'You may not be allowed to, or the library no longer exists.',
	},
})

/**
 * An owner's libraries under a heading that folds them shut, with a "+" that creates a library
 * for that owner when the source allows it. Unfolds when one of its libraries becomes the active
 * one. A group without an owner has no heading.
 */
export function LibraryGroupSection({
	source,
	group,
	children,
}: {
	source: LibrarySource
	group: LibraryGroup
	children: ReactNode
}) {
	const editor = useEditor()
	const msg = useTranslation()
	const { addToast } = useToasts()
	const isReadonly = useReadonly()
	const { key, label } = group
	const collapsed = useValue(
		'library group collapsed',
		() => key !== undefined && (collapsedGroupKeys.get(editor)[source.id] ?? []).includes(key),
		[editor, source, key]
	)
	const canCreate = useValue(
		'can create library for owner',
		() => key !== undefined && source.can('createLibrary', { ownerId: key }),
		[source, key]
	)
	const holdsActive = useValue(
		'group holds active library',
		() => group.libraries.some((c) => c.id === activeLibraryId.get(editor)),
		[editor, group.libraries]
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

	const createLibrary = () => {
		const name = getIncrementedName(
			msg(messages.newLibraryName),
			source.getLibraries().map((library) => library.name)
		)
		createNewLibrary(source, name, key).then(
			(library) => {
				activeLibraryId.set(editor, library.id)
				renamingLibraryId.set(editor, library.id)
			},
			() =>
				addToast({
					title: msg(messages.changeErrorTitle),
					description: msg(messages.changeErrorDescription),
					severity: 'error',
				})
		)
	}

	const addLabel = msg(messages.newLibraryIn, { name: label })

	return (
		<section className="tlui-libraries-group" aria-label={label}>
			<h3 className="tlui-libraries-group__heading">
				<button
					type="button"
					className="tlui-libraries-group__toggle"
					aria-expanded={!collapsed}
					onClick={() => setCollapsed(!collapsed)}
				>
					<span className="tlui-libraries-group__label">{label}</span>
					<TldrawUiIcon icon="chevron-down" label="" small className="tlui-libraries-chevron" />
				</button>
				{canCreate && !isReadonly && (
					<TldrawUiButton type="icon" tooltip={addLabel} title={addLabel} onClick={createLibrary}>
						<TldrawUiButtonIcon icon="plus" small />
					</TldrawUiButton>
				)}
			</h3>
			{!collapsed && children}
		</section>
	)
}
