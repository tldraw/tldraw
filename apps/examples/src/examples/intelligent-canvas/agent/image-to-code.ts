import { generateGeminiVision } from './api'

/** Supported code generation targets. */
export type CodeTarget = 'glsl' | 'svg' | 'p5js' | 'canvas2d'

const TARGET_PROMPTS: Record<CodeTarget, string> = {
	glsl: `You are an expert GLSL shader programmer. Analyze the provided image and write a GLSL fragment shader that recreates it as closely as possible using procedural techniques.

Output ONLY the GLSL code — no explanation, no markdown fences. The shader should:
- Use a standard fragment shader signature: void mainImage(out vec4 fragColor, in vec2 fragCoord)
- Normalize coordinates using iResolution
- Use procedural math (sin, cos, smoothstep, noise, etc.) to approximate colors, shapes, and patterns
- Be a single self-contained shader compatible with Shadertoy`,

	svg: `You are an expert SVG artist. Analyze the provided image and write SVG markup that recreates it as closely as possible.

Output ONLY the SVG code — no explanation, no markdown fences. The SVG should:
- Use a viewBox of "0 0 800 600"
- Use paths, shapes, gradients, and filters to approximate the image
- Be self-contained and valid SVG 1.1
- Prioritize visual fidelity over code brevity`,

	p5js: `You are an expert p5.js creative coder. Analyze the provided image and write a p5.js sketch that recreates it as closely as possible.

Output ONLY the JavaScript code — no explanation, no markdown fences. The sketch should:
- Include setup() and draw() functions
- Use a canvas size of 800x600
- Use p5.js drawing primitives (rect, ellipse, line, bezier, etc.)
- Approximate colors, shapes, and composition from the image`,

	canvas2d: `You are an expert HTML5 Canvas programmer. Analyze the provided image and write JavaScript code using the Canvas 2D API that recreates it as closely as possible.

Output ONLY the JavaScript code — no explanation, no markdown fences. The code should:
- Assume a canvas context variable named "ctx" is available
- Assume canvas dimensions of 800x600
- Use Canvas 2D API calls (fillRect, arc, bezierCurveTo, gradients, etc.)
- Approximate colors, shapes, and composition from the image`,
}

/**
 * Generate procedural code from an image using Gemini vision.
 */
export async function generateCodeFromImage(
	imageBase64: string,
	mimeType: string,
	target: CodeTarget = 'glsl'
): Promise<string> {
	const prompt = TARGET_PROMPTS[target]
	if (!prompt) {
		throw new Error(`Unsupported code target: ${target}`)
	}

	const code = await generateGeminiVision(prompt, 'Analyze this image and generate code.', {
		mimeType,
		data: imageBase64,
	})

	// Strip markdown code fences if the model included them
	return code.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '')
}
