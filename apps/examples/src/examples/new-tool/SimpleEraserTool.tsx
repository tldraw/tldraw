import { SVGContainer, TLEventInfo, TLShapeId, TLToolState, ToolUtil, Vec } from 'tldraw'

interface SimpleEraserContext extends TLToolState {
	readonly type: '@simple/eraser'
	state: 'idle' | 'pointing' | 'dragging'
	line: Vec[]
}

export class SimpleEraserToolUtil extends ToolUtil<SimpleEraserContext> {
	static override type = '@simple/eraser' as const

	getDefaultContext(): SimpleEraserContext {
		return {
			type: '@simple/eraser',
			state: 'idle',
			line: [],
		}
	}

	underlay() {
		return null
	}

	overlay() {
		const { line } = this.getContext()
		if (line.length === 0) return null

		return (
			<>
				<SVGContainer>
					<polyline
						points={line.map((p) => `${p.x},${p.y}`).join(' ')}
						strokeWidth={10}
						stroke={'lightgrey'}
						fill="none"
					/>
				</SVGContainer>
			</>
		)
	}

	getStyles() {
		return null
	}

	// This object is used for events, it's kept in memory and updated as the user interacts with the tool
	private memo = {
		A: new Vec(),
		B: new Vec(),
		C: new Vec(),
		erasingIds: new Set<TLShapeId>(),
	}

	onEnter() {
		return
	}

	onExit() {
		return
	}

	onEvent(event: TLEventInfo) {
		const { editor, memo } = this
		const context = this.getContext()

		switch (context.state) {
			case 'idle': {
				if (event.name === 'pointer_down') {
					this.setContext({
						state: 'pointing',
					})
				}
				break
			}
			case 'pointing': {
				if (editor.inputs.isDragging) {
					const { originPagePoint, currentPagePoint } = editor.inputs
					this.setContext({ state: 'dragging', line: [originPagePoint, currentPagePoint] })
					memo.A = currentPagePoint.clone()
					memo.B = currentPagePoint.clone()
					memo.C = currentPagePoint.clone()
				}
				break
			}
			case 'dragging': {
				if (editor.inputs.isDragging) {
					if (event.name === 'tick') {
						const { currentPagePoint } = editor.inputs
						if (currentPagePoint.equals(memo.C)) return

						memo.A = memo.B
						memo.B = memo.C
						memo.C = currentPagePoint.clone()

						const { erasingIds } = memo

						for (const id of editor.getCurrentPageShapeIds()) {
							if (erasingIds.has(id)) continue
							if (
								editor
									.getShapeGeometry(id)
									.hitTestLineSegment(
										editor.getPointInShapeSpace(id, memo.B),
										editor.getPointInShapeSpace(id, memo.C)
									)
							) {
								erasingIds.add(id)
							}
						}

						this.setContext({ line: [memo.A, memo.B, memo.C] })

						const currentSelectedIds = editor.getSelectedShapeIds()
						if (
							currentSelectedIds.length !== erasingIds.size ||
							currentSelectedIds.some((id) => !erasingIds.has(id))
						) {
							editor.setErasingShapes(Array.from(erasingIds))
						}
					}
				} else {
					editor.deleteShapes(Array.from(memo.erasingIds))
					this.memo.erasingIds.clear()
					this.setContext({ state: 'idle', line: [] })
				}
				break
			}
		}
	}
}
