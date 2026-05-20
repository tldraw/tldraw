import { BaseBoxShapeUtil, HTMLContainer, RecordProps, T, TLBaseBoxShape } from 'tldraw'
import { AppId, appIds, apps } from './apps'
import { openWindow } from './WindowManager'

export const APP_LAUNCHER_SHAPE_TYPE = 'app-launcher'

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[APP_LAUNCHER_SHAPE_TYPE]: { w: number; h: number; appId: string }
	}
}

export type AppLauncherShape = TLBaseBoxShape & {
	type: typeof APP_LAUNCHER_SHAPE_TYPE
	props: { appId: string }
}

const APP_ID_VALIDATOR = T.setEnum(new Set<string>(appIds))

export class AppLauncherShapeUtil extends BaseBoxShapeUtil<AppLauncherShape> {
	static override type = APP_LAUNCHER_SHAPE_TYPE
	static override props: RecordProps<AppLauncherShape> = {
		w: T.number,
		h: T.number,
		appId: APP_ID_VALIDATOR,
	}

	getDefaultProps(): AppLauncherShape['props'] {
		return { w: 96, h: 96, appId: 'tldraw' } as AppLauncherShape['props']
	}

	override canEdit(): boolean {
		return false
	}
	override canResize(): boolean {
		return false
	}
	override canBind(): boolean {
		return false
	}
	override hideRotateHandle(): boolean {
		return true
	}
	override hideSelectionBoundsFg(): boolean {
		return true
	}
	override hideSelectionBoundsBg(): boolean {
		return true
	}

	override onClick(shape: AppLauncherShape) {
		const appId = shape.props.appId as AppId
		if (appId in apps) openWindow(appId)
	}

	component(shape: AppLauncherShape) {
		const appId = shape.props.appId as AppId
		const app = apps[appId]
		if (!app) return null
		return (
			<HTMLContainer style={{ pointerEvents: 'all' }}>
				<div className="desktop-launcher hoverable" data-app-id={appId}>
					<div className="desktop-launcher__icon" aria-hidden="true">
						<AppGlyph appId={appId} />
					</div>
					<div className="desktop-launcher__label">{app.title}</div>
				</div>
			</HTMLContainer>
		)
	}

	indicator() {
		return null
	}

	getIndicatorPath(shape: AppLauncherShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}
}

// Minimal 1-bit glyphs per app. These are placeholders; they fit the
// classic dithered aesthetic and can be art-directed later.
function AppGlyph({ appId }: { appId: AppId }) {
	const map: Record<AppId, string> = {
		tldraw: 'T',
		fairies: '✦',
		makereal: '▣',
		computer: '◫',
		showcase: '★',
		workflow: '⟶',
		chat: '◻',
		agent: '◉',
		'image-pipeline': '▤',
		'branching-chat': '⌥',
		multiplayer: '◎',
		shader: '◐',
	}
	return (
		<svg viewBox="0 0 32 32" className="desktop-launcher__glyph">
			<text
				x="16"
				y="22"
				textAnchor="middle"
				fontSize="22"
				fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
			>
				{map[appId]}
			</text>
		</svg>
	)
}
