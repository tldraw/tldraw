import * as Fiber from '@react-three/fiber'
import { Canvas } from '@react-three/fiber'
import * as Drei from '@react-three/drei'
import { Bounds, OrbitControls } from '@react-three/drei'
import * as Babel from '@babel/standalone'
import { Component, ReactNode, useEffect, useMemo, useState } from 'react'
import * as React from 'react'
import * as THREE from 'three'
import {
	BaseBoxShapeUtil,
	HTMLContainer,
	RecordProps,
	T,
	TLShape,
	stopEventPropagation,
} from 'tldraw'

// There's a guide at the bottom of this file!

export const MODEL_3D_SHAPE_TYPE = 'model-3d'

// [1]
declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[MODEL_3D_SHAPE_TYPE]: {
			w: number
			h: number
			code: string
			status: 'empty' | 'loading' | 'ready' | 'error'
		}
	}
}

export type IModel3dShape = TLShape<typeof MODEL_3D_SHAPE_TYPE>

// [2] The set of globals that generated scene code is allowed to reference. The
// model is told exactly what's available here — keep the prompt in makeReal3d.ts
// in sync when adding to this list.
// Inject React, the three.js namespace, R3F hooks, and *every* drei helper. We
// spread all of drei (rather than a curated list) so whatever component the model
// reaches for — <Sky>, <Cloud>, <Stars>, <Outlines>, … — is in scope and won't
// throw "X is not defined". Names that aren't valid JS identifiers are skipped so
// `new Function(...names)` stays valid.
const SCENE_SCOPE: Record<string, unknown> = (() => {
	const scope: Record<string, unknown> = {
		React,
		THREE,
		useFrame: Fiber.useFrame,
		useThree: Fiber.useThree,
	}
	const isValidName = (n: string) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(n)
	for (const [name, value] of Object.entries(Drei)) {
		if (isValidName(name)) scope[name] = value
	}
	return scope
})()

// [3] Turn a string of JSX source into a live React component. This is an
// example, so we eval model output directly with `new Function`. Don't do this
// with untrusted input in production.
// Babel plugin that removes any import/export the model included despite being
// told not to. Doing this on the AST (not with regex) handles multi-line imports
// and `export default function Scene` reliably.
function stripModuleSyntax() {
	return {
		visitor: {
			ImportDeclaration(path: any) {
				path.remove()
			},
			ExportDefaultDeclaration(path: any) {
				// `export default function Scene() {}` -> `function Scene() {}`
				path.replaceWith(path.node.declaration)
			},
			ExportNamedDeclaration(path: any) {
				if (path.node.declaration) path.replaceWith(path.node.declaration)
				else path.remove()
			},
		},
	}
}

function compileScene(code: string): React.ComponentType {
	const transformed = Babel.transform(code, {
		// classic runtime -> JSX compiles to React.createElement (React is in scope).
		// The default automatic runtime emits `_jsx` + an import we strip, leaving it undefined.
		presets: [['react', { runtime: 'classic' }]],
		plugins: [stripModuleSyntax],
		filename: 'scene.tsx',
	}).code

	const names = Object.keys(SCENE_SCOPE)
	// eslint-disable-next-line no-new-func
	const factory = new Function(
		...names,
		`${transformed}\nreturn typeof Scene !== 'undefined' ? Scene : null;`
	)
	const Scene = factory(...names.map((n) => SCENE_SCOPE[n]))
	if (typeof Scene !== 'function') {
		throw new Error('Generated code must define a `Scene` component')
	}
	return Scene
}

// [4] A render-error boundary so a bad scene shows a message instead of blanking
// the whole editor.
class SceneErrorBoundary extends Component<
	{ children: ReactNode; onError: (msg: string) => void },
	{ hasError: boolean }
> {
	override state = { hasError: false }
	static getDerivedStateFromError() {
		return { hasError: true }
	}
	override componentDidCatch(error: Error) {
		this.props.onError(error.message)
	}
	override render() {
		if (this.state.hasError) return null
		return this.props.children
	}
}

function SceneCanvas({ code }: { code: string }) {
	const compiled = useMemo(() => {
		try {
			return { Scene: compileScene(code) }
		} catch (e) {
			return { error: e instanceof Error ? e.message : String(e) }
		}
	}, [code])

	// runtime errors thrown while rendering the scene are surfaced here
	const [runtimeError, setRuntimeError] = useState<string | null>(null)
	useEffect(() => setRuntimeError(null), [code])

	if ('error' in compiled) {
		return <CodeError message={compiled.error!} title="Scene failed to compile" />
	}
	if (runtimeError) {
		return <CodeError message={runtimeError} title="Scene crashed while rendering" />
	}

	const { Scene } = compiled
	return (
		<Canvas key={code} shadows camera={{ position: [6, 4, 8], fov: 45 }} dpr={[1, 2]}>
			<color attach="background" args={['#f4f1ea']} />
			<ambientLight intensity={0.4} />
			<OrbitControls makeDefault enableDamping />
			{/* Bounds auto-frames whatever the model builds, at any scale */}
			<Bounds fit observe margin={1.2}>
				<SceneErrorBoundary onError={setRuntimeError}>
					<Scene />
				</SceneErrorBoundary>
			</Bounds>
		</Canvas>
	)
}

function CodeError({ message, title }: { message: string; title: string }) {
	return (
		<div
			style={{
				position: 'absolute',
				inset: 0,
				padding: 16,
				overflow: 'auto',
				background: '#fff5f5',
				color: '#c0392b',
				font: '12px/1.5 ui-monospace, monospace',
				whiteSpace: 'pre-wrap',
			}}
		>
			{title}:{'\n\n'}
			{message}
		</div>
	)
}

// [5]
export class Model3dShapeUtil extends BaseBoxShapeUtil<IModel3dShape> {
	static override type = MODEL_3D_SHAPE_TYPE
	static override props: RecordProps<IModel3dShape> = {
		w: T.number,
		h: T.number,
		code: T.string,
		status: T.literalEnum('empty', 'loading', 'ready', 'error'),
	}

	getDefaultProps(): IModel3dShape['props'] {
		return { w: 420, h: 420, code: '', status: 'empty' }
	}

	override canEdit() {
		return false
	}

	component(shape: IModel3dShape) {
		const { status, code } = shape.props
		return (
			<HTMLContainer
				style={{
					width: shape.props.w,
					height: shape.props.h,
					pointerEvents: 'all',
					overflow: 'hidden',
					borderRadius: 12,
					border: '1px solid #e6e1d5',
					background: '#f4f1ea',
					boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
					display: 'flex',
					flexDirection: 'column',
				}}
			>
				{/* Header — a drag handle, so we DON'T stop propagation here */}
				<div
					style={{
						flex: '0 0 auto',
						height: 28,
						display: 'flex',
						alignItems: 'center',
						padding: '0 10px',
						gap: 8,
						background: '#efeae0',
						borderBottom: '1px solid #e6e1d5',
						font: '600 11px/1 system-ui, sans-serif',
						color: '#6b6455',
						cursor: 'grab',
						userSelect: 'none',
					}}
				>
					<span>3D asset</span>
					{status === 'loading' && <span style={{ color: '#b8860b' }}>generating…</span>}
				</div>

				{/* Canvas area — stop propagation so orbit controls get the pointer.
				    touchAction:'none' is required or the browser eats drag gestures
				    before OrbitControls sees them. */}
				<div
					style={{ flex: 1, position: 'relative', touchAction: 'none' }}
					onPointerDown={stopEventPropagation}
					onPointerMove={stopEventPropagation}
					onPointerUp={stopEventPropagation}
					onWheel={stopEventPropagation}
				>
					{status === 'empty' && <Hint>Select this shape plus some notes, then “Make 3D real”.</Hint>}
					{status === 'loading' && !code && <Hint>Generating your 3D asset…</Hint>}
					{code && <SceneCanvas code={code} />}
				</div>
			</HTMLContainer>
		)
	}

	getIndicatorPath(shape: IModel3dShape) {
		const path = new Path2D()
		path.roundRect(0, 0, shape.props.w, shape.props.h, 12)
		return path
	}
}

function Hint({ children }: { children: ReactNode }) {
	return (
		<div
			style={{
				position: 'absolute',
				inset: 0,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				textAlign: 'center',
				padding: 24,
				font: '13px/1.5 system-ui, sans-serif',
				color: '#8a8271',
			}}
		>
			{children}
		</div>
	)
}

/*
This is a custom shape that renders a live React Three Fiber scene from a string
of generated code. See the custom shape example for a gentler introduction to
shape utils.

[1] Register the shape's props on the global type map so TypeScript knows about
	them across the app.

[2] SCENE_SCOPE is the sandbox: the only names generated code can reference. We
	inject React, the three.js namespace, R3F hooks, and a curated set of drei
	helpers. The system prompt in makeReal3d.ts lists these exact names.

[3] compileScene transpiles the JSX with Babel standalone (so the model can write
	ordinary `<mesh>` JSX) and evaluates it with `new Function`, passing the scope
	in as arguments. This is fine for an example; never eval untrusted code in
	production.

[4] Runtime errors while rendering the scene are caught by an error boundary;
	compile errors are caught in SceneCanvas and shown as text.

[5] The shape util itself. We extend BaseBoxShapeUtil so we get geometry and
	resizing for free. The component renders a draggable header plus a canvas area
	that captures pointer events for the orbit controls.
*/
