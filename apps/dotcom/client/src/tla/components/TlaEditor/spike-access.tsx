import {
	accessGrantId,
	allowedColours,
	grantCan,
	grantCoversPage,
	judgeChange,
	readGrant,
	TLAccessGrant,
} from '@tldraw/dotcom-shared'
import { useEffect, useMemo } from 'react'
import {
	createShapeId,
	DefaultColorStyle,
	DefaultStylePanel,
	defineMessages,
	Editor,
	getColorStyleItems,
	isPageId,
	react,
	StylePanelArrowheadPicker,
	StylePanelArrowKindPicker,
	StylePanelButtonPicker,
	StylePanelDashPicker,
	StylePanelFillPicker,
	StylePanelFontPicker,
	StylePanelGeoShapePicker,
	StylePanelLabelAlignPicker,
	StylePanelOpacityPicker,
	StylePanelSection,
	StylePanelSizePicker,
	StylePanelSplinePicker,
	StylePanelTextAlignPicker,
	TLAsset,
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	TldrawUiIcon,
	TLBinding,
	TLPage,
	TLRecordChange,
	TLRefusal,
	TLShape,
	TLUiStylePanelProps,
	useDialogs,
	useEditor,
	useStylePanelContext,
	useTranslation,
	useValue,
} from 'tldraw'
import { useMaybeApp } from '../../hooks/useAppState'

// SPIKE: what a session can do is a grant record in the room (see dotcom-shared accessCan.ts).
// Everything here reads it: no roles. Teachers edit the students' grant; students try to break it.

const messages = defineMessages({
	color: { defaultMessage: 'Color' },
	refusedTitle: { defaultMessage: 'Change not saved' },
	ok: { defaultMessage: 'OK' },
	refusedCount: { defaultMessage: 'Refused' },
	revertedCount: { defaultMessage: 'Reverted' },
	showOnlyThisPage: { defaultMessage: 'Show only this page to students' },
	canCreateRed: { defaultMessage: 'Can create red shapes' },
	canCreateAny: { defaultMessage: 'Can create any shape' },
	canEdit: { defaultMessage: 'Can edit shapes' },
	canDelete: { defaultMessage: 'Can delete shapes' },
	canCreatePages: { defaultMessage: 'Can create pages' },
	blockedHeading: { defaultMessage: 'Things that will fail' },
	tryPermissions: { defaultMessage: 'Change the permissions' },
	tryOtherPage: { defaultMessage: "Edit the teacher's page" },
	tryRecolour: { defaultMessage: 'One shape red, one blue' },
	tryBlue: { defaultMessage: 'Add a blue shape' },
	tryDelete: { defaultMessage: 'Delete a shape' },
})

const STUDENTS_GRANT_ID = accessGrantId(null)

function grantOf(editor: Editor, userId: string | null | undefined) {
	return readGrant(editor.store.get(accessGrantId(userId) as any))
}

/** The grant for the current session, or undefined until it has arrived. */
export function useGrant() {
	const editor = useEditor()
	const app = useMaybeApp()
	const id = accessGrantId(app?.userId)
	return useValue('access grant', () => readGrant(editor.store.get(id as any)), [editor, id])
}

export function useCan(capability: string) {
	return grantCan(useGrant(), capability)
}

// The page a shape or binding is on, or null when its parent can't be found yet. A new shape's
// page isn't in the store, so this walks the parents.
function pageOf(editor: Editor, record: any): string | null {
	if (record.typeName === 'binding') {
		const from = editor.getShape(record.fromId)
		return (from && editor.getAncestorPageId(from)) || null
	}
	let parent = record.parentId
	while (!isPageId(parent)) {
		const next = editor.getShape(parent)
		if (!next) return null
		parent = next.parentId
	}
	return parent
}

function makeCanChangeRecord(userId: string | null | undefined) {
	return (change: TLRecordChange<TLShape | TLPage | TLBinding | TLAsset>, editor: Editor) =>
		judgeChange(grantOf(editor, userId), change, {
			pageOf: (record) => pageOf(editor, record),
			unresolved: 'allow',
		}) === null
}

function makeGetShapeVisibility(userId: string | null | undefined) {
	return (shape: TLShape, editor: Editor) => {
		const pageId = editor.getAncestorPageId(shape)
		return pageId && grantCoversPage(grantOf(editor, userId), pageId) ? 'inherit' : 'hidden'
	}
}

// Keeps the session on a page its grant covers, and starts new shapes in a colour it can use.
function startAccessGuard(editor: Editor, userId: string | null | undefined) {
	return react('access guard', () => {
		const grant = grantOf(editor, userId)
		if (!grant) return
		if (!grantCoversPage(grant, editor.getCurrentPageId())) {
			const first = editor.getPages().find((page) => grantCoversPage(grant, page.id))
			if (first) editor.setCurrentPage(first.id)
		}
		const allowed = allowedColours(grant)
		if (allowed && allowed.length > 0) {
			editor.setStyleForNextShapes(DefaultColorStyle, allowed[0], { history: 'ignore' })
		}
	})
}

// --- style panel: only the colours the grant can create

function AllowedColorPicker({ allowed }: { allowed: string[] }) {
	const editor = useEditor()
	const msg = useTranslation()
	const { styles } = useStylePanelContext()
	const items = useValue(
		'allowed color items',
		() =>
			getColorStyleItems(editor.getCurrentTheme().colors[editor.getColorMode()]).filter((item) =>
				allowed.includes(item.value)
			),
		[editor, allowed]
	)
	const color = styles.get(DefaultColorStyle)
	if (color === undefined) return null
	return (
		<StylePanelButtonPicker
			title={msg(messages.color)}
			uiType="color"
			style={DefaultColorStyle}
			items={items}
			value={color}
		/>
	)
}

export function SpikeStylePanel(props: TLUiStylePanelProps) {
	const allowed = allowedColours(useGrant())
	if (!allowed || allowed.length === 0) return <DefaultStylePanel {...props} />
	return (
		<DefaultStylePanel {...props}>
			<StylePanelSection>
				<AllowedColorPicker allowed={allowed} />
				<StylePanelOpacityPicker />
			</StylePanelSection>
			<StylePanelSection>
				<StylePanelFillPicker />
				<StylePanelDashPicker />
				<StylePanelSizePicker />
			</StylePanelSection>
			<StylePanelSection>
				<StylePanelFontPicker />
				<StylePanelTextAlignPicker />
				<StylePanelLabelAlignPicker />
			</StylePanelSection>
			<StylePanelSection>
				<StylePanelGeoShapePicker />
				<StylePanelArrowKindPicker />
				<StylePanelArrowheadPicker />
				<StylePanelSplinePicker />
			</StylePanelSection>
		</DefaultStylePanel>
	)
}

// --- the dialog shown when the server refuses a change

function RefusedDialog({ refusal, onClose }: { refusal: TLRefusal; onClose(): void }) {
	const msg = useTranslation()
	const refused = refusal.ids?.length ?? 0
	const changes = refusal.changes
	const reverted = changes
		? Object.keys(changes.added).length +
			Object.keys(changes.updated).length +
			Object.keys(changes.removed).length
		: 0
	const summary = [
		msg(messages.refusedCount),
		': ',
		refused,
		'. ',
		msg(messages.revertedCount),
		': ',
		reverted,
		'.',
	].join('')
	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>{msg(messages.refusedTitle)}</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody style={{ maxWidth: 350 }}>
				<div>{refusal.reason}</div>
				<div>{summary}</div>
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				<TldrawUiButton type="primary" onClick={onClose}>
					<TldrawUiButtonLabel>{msg(messages.ok)}</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}

function ShowRefusals() {
	const editor = useEditor()
	const { addDialog } = useDialogs()
	useEffect(() => {
		const onRefused = (refusal: TLRefusal) => {
			addDialog({
				id: 'refused-dialog',
				component: ({ onClose }) => <RefusedDialog refusal={refusal} onClose={onClose} />,
			})
		}
		editor.on('refused', onRefused)
		return () => void editor.off('refused', onRefused)
	}, [editor, addDialog])
	return null
}

// --- panels in front of the canvas

const panelStyle = {
	position: 'absolute',
	top: 8,
	left: '50%',
	transform: 'translateX(-50%)',
	display: 'flex',
	flexDirection: 'column',
	minWidth: 240,
	padding: 4,
	borderRadius: 'var(--tl-radius-3)',
	background: 'var(--tl-color-panel)',
	boxShadow: 'var(--tl-shadow-2)',
	pointerEvents: 'all',
	zIndex: 'var(--tl-layer-canvas-in-front)' as any,
} as const

function putStudentsGrant(
	editor: Editor,
	change: (grant: TLAccessGrant) => Partial<TLAccessGrant>
) {
	const current: TLAccessGrant = readGrant(editor.store.get(STUDENTS_GRANT_ID as any)) ?? {
		id: STUDENTS_GRANT_ID,
		typeName: 'access-grant',
		can: [],
		pages: [],
	}
	editor.run(() => editor.store.put([{ ...current, ...change(current) } as any]), {
		history: 'ignore',
	})
}

function Option({
	label,
	checked,
	onChange,
}: {
	label: string
	checked: boolean
	onChange(next: boolean): void
}) {
	return (
		<TldrawUiButton type="menu" onClick={() => onChange(!checked)}>
			<TldrawUiIcon small label={label} icon={checked ? 'toggle-on' : 'toggle-off'} />
			<TldrawUiButtonLabel>{label}</TldrawUiButtonLabel>
		</TldrawUiButton>
	)
}

// Teachers: switch what the students' grant lets them do.
function TeacherPanel() {
	const editor = useEditor()
	const msg = useTranslation()
	const students = useValue(
		'students grant',
		() => readGrant(editor.store.get(STUDENTS_GRANT_ID as any)),
		[editor]
	)
	const currentPageId = useValue('current page', () => editor.getCurrentPageId(), [editor])

	const toggle = (capability: string, on: boolean) =>
		putStudentsGrant(editor, (grant) => ({
			can: on
				? [...grant.can.filter((c) => c !== capability), capability]
				: grant.can.filter((c) => c !== capability),
		}))

	const capabilityOptions = [
		['shape:create:red', messages.canCreateRed],
		['shape:create', messages.canCreateAny],
		['shape:edit', messages.canEdit],
		['shape:delete', messages.canDelete],
		['page:create', messages.canCreatePages],
	] as const

	return (
		<div style={panelStyle} onPointerDown={(e) => e.stopPropagation()}>
			<Option
				label={msg(messages.showOnlyThisPage)}
				checked={!!students?.pages.includes(currentPageId)}
				// students get exactly one page: this one, or none
				onChange={(next) =>
					putStudentsGrant(editor, () => ({ pages: next ? [currentPageId] : [] }))
				}
			/>
			{capabilityOptions.map(([capability, label]) => (
				<Option
					key={capability}
					label={msg(label)}
					checked={!!students?.can.includes(capability)}
					onChange={(next) => toggle(capability, next)}
				/>
			))}
		</div>
	)
}

// Students: buttons that try things their grant doesn't allow. They write straight to the store,
// past the editor's own checks, so the room has to say no.
function StudentPanel() {
	const editor = useEditor()
	const msg = useTranslation()
	const grant = useGrant()

	const tryPermissions = () =>
		putStudentsGrant(editor, () => ({ can: ['shape:*', 'page:*', 'grants:manage'], pages: ['*'] }))

	const tryOtherPage = () => {
		const shape = editor.store.allRecords().find((record) => {
			if (record.typeName !== 'shape') return false
			const pageId = editor.getAncestorPageId(record as TLShape)
			return !!pageId && !grantCoversPage(grant, pageId)
		}) as TLShape | undefined
		if (shape) editor.store.put([{ ...shape, x: shape.x + 10 }])
	}

	// One change, two shapes: one goes to red, one to blue. The room judges the whole change, so
	// if it refuses one, both are reverted.
	const tryRecolour = () => {
		const shapes = editor.getCurrentPageShapes().filter((shape) => 'color' in shape.props) as Array<
			TLShape & { props: { color: string } }
		>
		const toRed = shapes.find((shape) => shape.props.color !== 'red')
		const toBlue = shapes.find((shape) => shape !== toRed && shape.props.color !== 'blue')
		if (!toRed || !toBlue) return
		editor.store.put([
			{ ...toRed, props: { ...toRed.props, color: 'red' } },
			{ ...toBlue, props: { ...toBlue.props, color: 'blue' } },
		] as TLShape[])
	}

	const tryBlue = () => {
		const parentId = editor.getCurrentPageId()
		editor.store.put([
			{
				id: createShapeId(),
				typeName: 'shape',
				type: 'geo',
				x: 100,
				y: 100,
				rotation: 0,
				isLocked: false,
				opacity: 1,
				meta: {},
				parentId,
				index: editor.getHighestIndexForParent(parentId),
				props: { ...editor.getShapeUtil('geo').getDefaultProps(), color: 'blue' },
			} as TLShape,
		])
	}

	const tryDelete = () => {
		const shape = editor.getCurrentPageShapes()[0]
		if (shape) editor.store.remove([shape.id])
	}

	return (
		<div style={panelStyle} onPointerDown={(e) => e.stopPropagation()}>
			<div
				style={{
					padding: '8px 12px 4px',
					font: '500 12px var(--tl-font-sans)',
					color: 'var(--tl-color-text-3)',
				}}
			>
				{msg(messages.blockedHeading)}
			</div>
			{(
				[
					[messages.tryPermissions, tryPermissions],
					[messages.tryOtherPage, tryOtherPage],
					[messages.tryRecolour, tryRecolour],
					[messages.tryBlue, tryBlue],
					[messages.tryDelete, tryDelete],
				] as const
			).map(([label, run]) => (
				<TldrawUiButton key={label.defaultMessage} type="menu" onClick={run}>
					<TldrawUiButtonLabel>{msg(label)}</TldrawUiButtonLabel>
				</TldrawUiButton>
			))}
		</div>
	)
}

// Everything TlaEditor needs from here, so it doesn't carry any of it itself:
//   const spike = useSpikeAccess(userId)   canChangeRecord / getShapeVisibility for <Tldraw>
//   components: { ...spikeComponents }     the style panel
//   <SpikeAccessPanels />                  in front of the canvas

export const spikeComponents = { StylePanel: SpikeStylePanel }

export function useSpikeAccess(userId: string | null | undefined) {
	return useMemo(
		() => ({
			canChangeRecord: makeCanChangeRecord(userId),
			getShapeVisibility: makeGetShapeVisibility(userId),
		}),
		[userId]
	)
}

// The refusal dialog, the page and colour guard, and the panels: the teacher's switches for those
// who can manage grants, the buttons that break the rules for everyone else.
export function SpikeAccessPanels() {
	const editor = useEditor()
	const app = useMaybeApp()
	const canManage = useCan('grants:manage')
	useEffect(() => startAccessGuard(editor, app?.userId), [editor, app?.userId])
	return (
		<>
			<ShowRefusals />
			{canManage ? <TeacherPanel /> : <StudentPanel />}
		</>
	)
}
