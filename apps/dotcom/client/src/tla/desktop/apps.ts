export interface AppDef {
	title: string
	url: string
	// Whether to grant the iframe broad permissions (only for tldraw-owned
	// sites we trust).
	trusted: boolean
	defaultSize: { w: number; h: number }
	defaultPosition: { x: number; y: number }
}

const _apps = {
	tldraw: {
		title: 'tldraw',
		url: '/',
		trusted: true,
		defaultSize: { w: 1100, h: 720 },
		defaultPosition: { x: 240, y: 80 },
	},
	fairies: {
		title: 'Fairies',
		url: 'https://fairies.tldraw.com/',
		trusted: true,
		defaultSize: { w: 980, h: 660 },
		defaultPosition: { x: 320, y: 120 },
	},
	makereal: {
		title: 'Make Real',
		url: 'https://makereal.tldraw.com/',
		trusted: true,
		defaultSize: { w: 980, h: 660 },
		defaultPosition: { x: 360, y: 140 },
	},
	computer: {
		title: 'Computer',
		url: 'https://computer.tldraw.com/',
		trusted: true,
		defaultSize: { w: 980, h: 660 },
		defaultPosition: { x: 280, y: 100 },
	},
	showcase: {
		title: 'Showcase',
		url: 'https://tldraw.dev/showcase',
		trusted: true,
		defaultSize: { w: 1024, h: 680 },
		defaultPosition: { x: 300, y: 120 },
	},
	workflow: {
		title: 'Workflow',
		url: 'https://workflow.templates.tldraw.dev/',
		trusted: true,
		defaultSize: { w: 960, h: 640 },
		defaultPosition: { x: 340, y: 140 },
	},
	chat: {
		title: 'Chat',
		url: 'https://chat.templates.tldraw.dev/',
		trusted: true,
		defaultSize: { w: 960, h: 640 },
		defaultPosition: { x: 360, y: 160 },
	},
	agent: {
		title: 'Agent',
		url: 'https://agent.templates.tldraw.dev/',
		trusted: true,
		defaultSize: { w: 960, h: 640 },
		defaultPosition: { x: 380, y: 180 },
	},
	'image-pipeline': {
		title: 'Image Pipeline',
		url: 'https://image-pipeline.templates.tldraw.dev/',
		trusted: true,
		defaultSize: { w: 960, h: 640 },
		defaultPosition: { x: 400, y: 200 },
	},
	'branching-chat': {
		title: 'Branching Chat',
		url: 'https://branching-chat.templates.tldraw.dev/',
		trusted: true,
		defaultSize: { w: 960, h: 640 },
		defaultPosition: { x: 420, y: 220 },
	},
	multiplayer: {
		title: 'Multiplayer',
		url: 'https://multiplayer.templates.tldraw.dev/',
		trusted: true,
		defaultSize: { w: 960, h: 640 },
		defaultPosition: { x: 440, y: 240 },
	},
	shader: {
		title: 'Shader',
		url: 'https://shader.templates.tldraw.dev/',
		trusted: true,
		defaultSize: { w: 960, h: 640 },
		defaultPosition: { x: 460, y: 260 },
	},
} as const satisfies Record<string, AppDef>

export const apps: Record<AppId, AppDef> = _apps

export type AppId = keyof typeof _apps

export const appIds = Object.keys(_apps) as AppId[]
