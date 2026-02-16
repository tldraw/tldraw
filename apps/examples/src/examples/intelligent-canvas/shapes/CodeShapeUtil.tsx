import { useEffect, useRef, useState } from 'react'
import { BaseBoxShapeUtil, HTMLContainer, RecordPropsType, T, TLShape } from 'tldraw'
import { GLSLRenderer } from './glsl-renderer'

// --- Shape type definition ---

const CODE_SHAPE_TYPE = 'code' as const

const codeShapeProps = {
	w: T.number,
	h: T.number,
	code: T.string,
	target: T.string,
}

type CodeShapeProps = RecordPropsType<typeof codeShapeProps>

declare module 'tldraw' {
	interface TLGlobalShapePropsMap {
		[CODE_SHAPE_TYPE]: CodeShapeProps
	}
}

export type CodeShape = TLShape<typeof CODE_SHAPE_TYPE>

// --- GLSL component ---

function GLSLView({ code, w, h }: { code: string; w: number; h: number }) {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const rendererRef = useRef<GLSLRenderer | null>(null)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return

		const renderer = new GLSLRenderer()
		rendererRef.current = renderer

		// Adapt Shadertoy-style shaders: replace mainImage signature
		let shaderCode = code
		if (shaderCode.includes('mainImage')) {
			shaderCode = adaptShadertoyShader(shaderCode)
		}

		// Ensure precision declaration
		if (!shaderCode.includes('precision ')) {
			shaderCode = 'precision mediump float;\n' + shaderCode
		}

		const ok = renderer.initialize(canvas, shaderCode)
		if (!ok) {
			setError(renderer.error || 'Failed to compile shader')
		} else {
			setError(null)
			renderer.start()
		}

		return () => {
			renderer.dispose()
			rendererRef.current = null
		}
	}, [code])

	return (
		<div style={{ width: w, height: h, position: 'relative', overflow: 'hidden' }}>
			<canvas
				ref={canvasRef}
				style={{
					width: '100%',
					height: '100%',
					display: error ? 'none' : 'block',
				}}
			/>
			{error && (
				<div
					style={{
						width: '100%',
						height: '100%',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						background: '#1e1e1e',
						color: '#ff6b6b',
						padding: 16,
						fontSize: 12,
						fontFamily: 'monospace',
						whiteSpace: 'pre-wrap',
						overflow: 'auto',
					}}
				>
					{error}
				</div>
			)}
		</div>
	)
}

/**
 * Adapt Shadertoy-style shaders to work with our renderer.
 * Shadertoy uses `void mainImage(out vec4 fragColor, in vec2 fragCoord)`
 * We need standard `void main()` with `gl_FragColor` and `gl_FragCoord`.
 */
function adaptShadertoyShader(code: string): string {
	// Add our standard uniforms if not present
	let header = ''
	if (!code.includes('precision ')) {
		header += 'precision mediump float;\n'
	}
	if (!code.includes('uniform vec2 u_resolution') && !code.includes('uniform vec3 iResolution')) {
		header += 'uniform vec3 iResolution;\n'
	}
	if (!code.includes('uniform float u_time') && !code.includes('uniform float iTime')) {
		header += 'uniform float iTime;\n'
	}

	// Replace the mainImage function with main
	let adapted = header + code
	// Replace the function signature
	adapted = adapted.replace(
		/void\s+mainImage\s*\(\s*out\s+vec4\s+(\w+)\s*,\s*in\s+vec2\s+(\w+)\s*\)/,
		(_match, colorVar, coordVar) => {
			return `void main() {\n  vec2 ${coordVar} = gl_FragCoord.xy;\n  vec4 ${colorVar}`
		}
	)
	// Add closing assignment before the last }
	const lastBrace = adapted.lastIndexOf('}')
	if (lastBrace !== -1) {
		// Find the fragColor variable name from the replacement
		const colorMatch = code.match(/void\s+mainImage\s*\(\s*out\s+vec4\s+(\w+)/)
		if (colorMatch) {
			const colorVar = colorMatch[1]
			adapted = adapted.slice(0, lastBrace) + `  gl_FragColor = ${colorVar};\n}`
		}
	}

	return adapted
}

// --- SVG component ---

function SVGView({ code, w, h }: { code: string; w: number; h: number }) {
	return (
		<div
			style={{
				width: w,
				height: h,
				overflow: 'hidden',
				background: 'white',
			}}
			dangerouslySetInnerHTML={{ __html: code }}
		/>
	)
}

// --- iframe-based component (p5js, canvas2d) ---

function IframeView({
	code,
	target,
	w,
	h,
}: {
	code: string
	target: string
	w: number
	h: number
}) {
	const html = target === 'p5js' ? buildP5jsHtml(code) : buildCanvas2dHtml(code)

	return (
		<iframe
			srcDoc={html}
			sandbox="allow-scripts"
			style={{
				width: w,
				height: h,
				border: 'none',
				background: 'white',
			}}
			title={`${target} preview`}
		/>
	)
}

function buildP5jsHtml(code: string): string {
	return `<!DOCTYPE html>
<html>
<head>
<script src="https://cdn.jsdelivr.net/npm/p5@1.9.0/lib/p5.min.js"></script>
<style>html, body { margin: 0; overflow: hidden; }</style>
</head>
<body>
<script>
${code}
</script>
</body>
</html>`
}

function buildCanvas2dHtml(code: string): string {
	return `<!DOCTYPE html>
<html>
<head>
<style>html, body { margin: 0; overflow: hidden; }</style>
</head>
<body>
<canvas id="c" width="800" height="600"></canvas>
<script>
const canvas = document.getElementById('c');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const ctx = canvas.getContext('2d');
${code}
</script>
</body>
</html>`
}

// --- ShapeUtil ---

export class CodeShapeUtil extends BaseBoxShapeUtil<CodeShape> {
	static override type = 'code' as const
	static override props = codeShapeProps

	override getDefaultProps(): CodeShapeProps {
		return {
			w: 400,
			h: 400,
			code: '',
			target: 'glsl',
		}
	}

	override component(shape: CodeShape) {
		const { w, h, code, target } = shape.props
		const isEditing = this.editor.getEditingShapeId() === shape.id

		return (
			<HTMLContainer
				style={{
					width: w,
					height: h,
					pointerEvents: isEditing ? 'all' : 'none',
					overflow: 'hidden',
					borderRadius: 4,
					boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
				}}
			>
				{target === 'glsl' && <GLSLView code={code} w={w} h={h} />}
				{target === 'svg' && <SVGView code={code} w={w} h={h} />}
				{(target === 'p5js' || target === 'canvas2d') && (
					<IframeView code={code} target={target} w={w} h={h} />
				)}
			</HTMLContainer>
		)
	}

	override indicator(shape: CodeShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}
