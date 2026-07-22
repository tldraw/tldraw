import { createShapeId, Editor, TLShapeId, toRichText } from 'tldraw'

/**
 * Seeds a board with content that exercises every clustering signal:
 * two wireframe frames, a sticky-note cloud, an arrow-connected flowchart,
 * a text annotation pointing into the flowchart, and far-away stragglers.
 */
export function createDemoBoard(editor: Editor) {
	const ids = {
		login: createShapeId(),
		dashboard: createShapeId(),
		flowStart: createShapeId(),
		flowAuth: createShapeId(),
		flowDashboard: createShapeId(),
		flowLogin: createShapeId(),
		annotation: createShapeId(),
	}

	editor.run(() => {
		editor.markHistoryStoppingPoint('seed demo board')

		// -- Wireframe 1: login screen (a frame full of UI) ---------------------
		editor.createShape({
			id: ids.login,
			type: 'frame',
			x: 0,
			y: 0,
			props: { w: 360, h: 540, name: 'Login screen' },
		})
		editor.createShapes([
			{
				type: 'text',
				parentId: ids.login,
				x: 24,
				y: 32,
				props: { richText: toRichText('Acme app') },
			},
			{
				type: 'geo',
				parentId: ids.login,
				x: 24,
				y: 120,
				props: { w: 312, h: 48, geo: 'rectangle', richText: toRichText('Email') },
			},
			{
				type: 'geo',
				parentId: ids.login,
				x: 24,
				y: 190,
				props: { w: 312, h: 48, geo: 'rectangle', richText: toRichText('Password') },
			},
			{
				type: 'geo',
				parentId: ids.login,
				x: 24,
				y: 270,
				props: {
					w: 312,
					h: 52,
					geo: 'rectangle',
					fill: 'solid',
					color: 'blue',
					richText: toRichText('Sign in'),
				},
			},
			{
				type: 'text',
				parentId: ids.login,
				x: 24,
				y: 350,
				props: { richText: toRichText('Forgot password?') },
			},
		])

		// -- Wireframe 2: dashboard ----------------------------------------------
		editor.createShape({
			id: ids.dashboard,
			type: 'frame',
			x: 700,
			y: -20,
			props: { w: 560, h: 460, name: 'Dashboard' },
		})
		editor.createShapes([
			{
				type: 'geo',
				parentId: ids.dashboard,
				x: 24,
				y: 24,
				props: { w: 320, h: 220, geo: 'rectangle', richText: toRichText('Revenue chart') },
			},
			{
				type: 'geo',
				parentId: ids.dashboard,
				x: 368,
				y: 24,
				props: { w: 168, h: 100, geo: 'rectangle', richText: toRichText('Active users') },
			},
			{
				type: 'geo',
				parentId: ids.dashboard,
				x: 368,
				y: 144,
				props: { w: 168, h: 100, geo: 'rectangle', richText: toRichText('Churn rate') },
			},
			{
				type: 'text',
				parentId: ids.dashboard,
				x: 24,
				y: 280,
				props: { richText: toRichText('Weekly report') },
			},
		])

		// -- Sticky-note cloud: shared vocabulary for the keyword extractor -----
		const stickies = [
			'Ship onboarding flow',
			'Improve mobile onboarding',
			'User research interviews',
			'Onboarding email drip',
			'Pricing page experiment',
			'Beta feedback triage',
		]
		stickies.forEach((text, i) => {
			editor.createShape({
				type: 'note',
				x: -140 + (i % 3) * 230,
				y: 1000 + Math.floor(i / 3) * 230,
				props: { richText: toRichText(text) },
			})
		})

		// -- Flowchart: shapes joined by bound arrows -----------------------------
		editor.createShapes([
			{
				id: ids.flowStart,
				type: 'geo',
				x: 1650,
				y: 950,
				props: { w: 160, h: 70, geo: 'ellipse', richText: toRichText('App start') },
			},
			{
				id: ids.flowAuth,
				type: 'geo',
				x: 1620,
				y: 1110,
				props: { w: 220, h: 110, geo: 'diamond', richText: toRichText('Session valid?') },
			},
			{
				id: ids.flowDashboard,
				type: 'geo',
				x: 1940,
				y: 1310,
				props: { w: 190, h: 70, geo: 'rectangle', richText: toRichText('Open dashboard') },
			},
			{
				id: ids.flowLogin,
				type: 'geo',
				x: 1360,
				y: 1310,
				props: { w: 190, h: 70, geo: 'rectangle', richText: toRichText('Show login') },
			},
		])
		createBoundArrow(editor, ids.flowStart, ids.flowAuth)
		createBoundArrow(editor, ids.flowAuth, ids.flowDashboard)
		createBoundArrow(editor, ids.flowAuth, ids.flowLogin)

		// -- Annotation: a note pointing into the flowchart with an arrow ---------
		editor.createShape({
			id: ids.annotation,
			type: 'note',
			x: 2150,
			y: 780,
			props: { color: 'red', richText: toRichText('Needs security review!') },
		})
		createBoundArrow(editor, ids.annotation, ids.flowAuth)

		// -- Stragglers far away ---------------------------------------------------
		editor.createShapes([
			{ type: 'note', x: 3100, y: 100, props: { richText: toRichText('Parking lot: dark mode?') } },
			{
				type: 'geo',
				x: 3160,
				y: 500,
				props: { w: 140, h: 90, geo: 'cloud', richText: toRichText('Someday') },
			},
		])
	})

	editor.zoomToFit()
}

function createBoundArrow(editor: Editor, fromId: TLShapeId, toId: TLShapeId) {
	const arrowId = createShapeId()
	const fromBounds = editor.getShapePageBounds(fromId)
	const toBounds = editor.getShapePageBounds(toId)
	if (!fromBounds || !toBounds) return
	editor.createShape({
		id: arrowId,
		type: 'arrow',
		x: (fromBounds.midX + toBounds.midX) / 2,
		y: (fromBounds.midY + toBounds.midY) / 2,
	})
	editor.createBindings([
		{
			fromId: arrowId,
			toId: fromId,
			type: 'arrow',
			props: {
				terminal: 'start',
				normalizedAnchor: { x: 0.5, y: 0.5 },
				isExact: false,
				isPrecise: false,
			},
		},
		{
			fromId: arrowId,
			toId: toId,
			type: 'arrow',
			props: {
				terminal: 'end',
				normalizedAnchor: { x: 0.5, y: 0.5 },
				isExact: false,
				isPrecise: false,
			},
		},
	])
}
