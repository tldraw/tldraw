import { Atom, useEditor, useValue } from '@tldraw/editor'
import { useLayoutEffect, useState } from 'react'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonCheck } from '../primitives/Button/TldrawUiButtonCheck'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiButtonLabel } from '../primitives/Button/TldrawUiButtonLabel'
import {
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuItem,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
} from '../primitives/TldrawUiDropdownMenu'
import {
	CommandPalettePosition,
	CommandPaletteTopSection,
	commandPaletteFlags,
} from './commandPaletteFlags'

function FlagToggle({ label, title, flag }: { label: string; title: string; flag: Atom<boolean> }) {
	const checked = useValue(flag)
	return (
		<TldrawUiButton type="menu" title={title} onClick={() => flag.set(!flag.get())}>
			<TldrawUiButtonCheck checked={checked} />
			<TldrawUiButtonLabel>{label}</TldrawUiButtonLabel>
		</TldrawUiButton>
	)
}

function FlagChoice<T extends string>({
	id,
	label,
	flag,
	choices,
}: {
	id: string
	label: string
	flag: Atom<T>
	choices: { value: T; label: string }[]
}) {
	const current = useValue(flag)
	return (
		<div className="tlui-command-palette-flags__choice">
			<span className="tlui-command-palette-flags__choice-label">{label}</span>
			<TldrawUiDropdownMenuRoot id={`command-palette-flag-${id}`}>
				<TldrawUiDropdownMenuTrigger>
					<TldrawUiButton type="normal" title={label}>
						<TldrawUiButtonLabel>
							{choices.find((choice) => choice.value === current)?.label}
						</TldrawUiButtonLabel>
						<TldrawUiButtonIcon icon="chevron-down" small />
					</TldrawUiButton>
				</TldrawUiDropdownMenuTrigger>
				<TldrawUiDropdownMenuContent side="bottom" align="end">
					{choices.map((choice) => (
						<TldrawUiDropdownMenuItem key={choice.value}>
							<TldrawUiButton type="menu" onClick={() => flag.set(choice.value)}>
								<TldrawUiButtonCheck checked={choice.value === current} />
								<TldrawUiButtonLabel>{choice.label}</TldrawUiButtonLabel>
							</TldrawUiButton>
						</TldrawUiDropdownMenuItem>
					))}
				</TldrawUiDropdownMenuContent>
			</TldrawUiDropdownMenuRoot>
		</div>
	)
}

const TOP_SECTIONS: { value: CommandPaletteTopSection; label: string }[] = [
	{ value: 'recent', label: 'Recent' },
	{ value: 'suggested', label: 'Suggested' },
	{ value: 'none', label: 'Nothing' },
]

const POSITIONS: { value: CommandPalettePosition; label: string }[] = [
	{ value: 'top', label: 'Top' },
	{ value: 'center', label: 'Center' },
	{ value: 'bottom', label: 'Bottom' },
]

/**
 * Testing only: toggles for the palette's design variants, untranslated. Meant for
 * `InFrontOfTheCanvas`; sits under the helper buttons (back to content and the like).
 *
 * @internal
 */
export function CommandPaletteFeatureFlagsPanel() {
	const editor = useEditor()
	const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

	// The helper buttons grow and shrink as buttons come and go, so follow their bottom edge.
	useLayoutEffect(() => {
		const container = editor.getContainer()
		const helperButtons = container.querySelector('.tlui-helper-buttons')
		if (!helperButtons) return
		const update = () => {
			const bounds = container.getBoundingClientRect()
			const { bottom, left } = helperButtons.getBoundingClientRect()
			setPosition((prev) => {
				const next = { top: bottom - bounds.top, left: left - bounds.left }
				return prev?.top === next.top && prev.left === next.left ? prev : next
			})
		}
		update()
		const observer = new ResizeObserver(update)
		observer.observe(helperButtons)
		observer.observe(container)
		return () => observer.disconnect()
	}, [editor])

	if (!position) return null

	return (
		<div
			className="tlui-command-palette-flags"
			style={{ top: position.top, left: position.left }}
			onPointerDown={editor.markEventAsHandled}
		>
			<div className="tlui-command-palette-flags__title">Command palette flags</div>
			<FlagChoice
				id="top"
				label="Top section"
				flag={commandPaletteFlags.topSection}
				choices={TOP_SECTIONS}
			/>
			<FlagChoice
				id="position"
				label="Position"
				flag={commandPaletteFlags.position}
				choices={POSITIONS}
			/>
			<FlagToggle
				label="Group headings"
				title="Heads each group while browsing, like Recent."
				flag={commandPaletteFlags.showGroupHeadings}
			/>
			<FlagToggle
				label="Icons"
				title="An icon before each label, from the item's menu icon."
				flag={commandPaletteFlags.showIcons}
			/>
			<FlagToggle
				label="Disabled reasons"
				title="A highlighted unavailable command says why, e.g. Select a shape first."
				flag={commandPaletteFlags.showDisabledReasons}
			/>
			<FlagToggle
				label="Group submenus"
				title="One row per submenu that opens its items. Off: every item gets its own row."
				flag={commandPaletteFlags.groupSubmenus}
			/>
			<FlagToggle
				label="Checkmarks on the right"
				title="Off: every row keeps a check slot on the left, so labels line up."
				flag={commandPaletteFlags.checkmarksOnRight}
			/>
			<FlagToggle
				label="Name files in the palette"
				title="tldraw.com: New file and Rename file ask for the name here."
				flag={commandPaletteFlags.nameNewFiles}
			/>
		</div>
	)
}
