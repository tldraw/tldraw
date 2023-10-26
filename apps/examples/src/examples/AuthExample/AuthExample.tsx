import {
	Rectangle2d,
	ShapeUtil,
	StateNode,
	TLBaseShape,
	TLEventHandlers,
	TLUiOverrides,
	Tldraw,
	toolbarItem,
} from '@tldraw/tldraw'
import { Octokit } from 'octokit'

const octokit = new Octokit({})

type GitHubShape = TLBaseShape<'github', { value: string }>

class GitHubShapeUtil extends ShapeUtil<GitHubShape> {
	static override type = 'github' as const
	static WIDTH = 300
	static HEIGHT = 45

	override canResize = () => false

	override getDefaultProps() {
		return {
			value: '',
		}
	}

	override getGeometry() {
		return new Rectangle2d({
			width: GitHubShapeUtil.WIDTH,
			height: GitHubShapeUtil.HEIGHT,
			isFilled: true,
		})
	}

	override component(shape: GitHubShape) {
		const handleLoadIssues = async () => {
			const [owner, repo] = shape.props.value.split('/')

			const issues = await octokit.request('GET /repos/{owner}/{repo}/issues', {
				owner,
				repo,
				per_page: 5,
			})

			let i = 0.4
			for (const issue of issues.data) {
				this.editor.createShape({
					type: 'note',
					x: shape.x,
					y: shape.y + 220 * i,
					props: {
						text: issue.title,
					},
				})
				i++
			}
		}

		return (
			<div
				style={{
					backgroundColor: 'var(--color-low)',
					width: '100%',
					height: '100%',
					display: 'flex',
					pointerEvents: 'all',
					alignItems: 'center',
					gap: '13px',
					padding: '13px',
					borderRadius: '13px',
				}}
			>
				<input
					type="text"
					placeholder="eg: tldraw/tldraw"
					id="repo"
					style={{
						width: '100%',
						fontFamily: 'Inter',
					}}
					value={shape.props.value}
					onInput={(e) => {
						this.editor.updateShape({
							id: shape.id,
							type: 'github',
							props: { value: (e.target as HTMLInputElement).value },
						})
					}}
					onKeyDown={(e) => {
						if (e.key === 'Enter') handleLoadIssues()
					}}
				/>
				<button
					style={{
						whiteSpace: 'nowrap',
						fontFamily: 'Inter',
						pointerEvents: 'all',
					}}
					disabled={shape.props.value === ''}
					onClick={handleLoadIssues}
				>
					Load issues
				</button>
			</div>
		)
	}

	override indicator() {
		return null
	}
}

class GitHubShapeTool extends StateNode {
	static override id = 'github'

	override onPointerDown: TLEventHandlers['onPointerDown'] = (info) => {
		this.editor.createShape({
			type: 'github',
			x: info.point.x,
			y: info.point.y,
		})
		this.editor.setCurrentTool('select')
	}
}

const overrides: TLUiOverrides = {
	tools(editor, tools) {
		tools.github = {
			id: 'github',
			icon: 'github',
			label: 'GitHub' as any,
			kbd: 'g',
			readonlyOk: false,
			onSelect: () => {
				editor.setCurrentTool('github')
			},
		}
		return tools
	},
	toolbar(_app, toolbar, { tools }) {
		toolbar.splice(4, 0, toolbarItem(tools.github))
		return toolbar
	},
}

export default function AuthExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={[GitHubShapeUtil]}
				tools={[GitHubShapeTool]}
				overrides={overrides}
				persistenceKey="auth"
			/>
		</div>
	)
}
