import { getSandbox, type Sandbox } from '@cloudflare/sandbox'
import type { Environment } from '../environment'

export interface SandboxExecResult {
	stdout: string
	stderr: string
	exitCode: number
	success: boolean
}

export interface SandboxFileResult {
	content: string
}

/**
 * Wrapper around Cloudflare Sandbox with logging for provisioning status.
 * Each fairy agent can have its own isolated sandbox environment.
 */
export class FairySandbox {
	private sandbox: Sandbox
	private sandboxId: string
	private initialized = false

	private constructor(sandbox: Sandbox, sandboxId: string) {
		this.sandbox = sandbox
		this.sandboxId = sandboxId
	}

	/**
	 * Get or create a sandbox for a specific fairy agent.
	 * @param env - The worker environment with SANDBOX binding
	 * @param agentId - The fairy agent's unique identifier
	 */
	static async getForAgent(env: Environment, agentId: string): Promise<FairySandbox> {
		const sandboxId = `fairy-${agentId}`
		console.warn(`[FairySandbox] Requesting sandbox for agent: ${agentId}`)
		console.warn(`[FairySandbox] Sandbox ID: ${sandboxId}`)

		const startTime = Date.now()
		console.warn(`[FairySandbox] Getting sandbox instance...`)

		const sandbox = getSandbox(env.SANDBOX, sandboxId)

		const elapsed = Date.now() - startTime
		console.warn(`[FairySandbox] Sandbox instance obtained in ${elapsed}ms`)

		return new FairySandbox(sandbox, sandboxId)
	}

	/**
	 * Initialize the sandbox by running a simple command.
	 * This triggers container provisioning if not already running.
	 */
	async initialize(): Promise<void> {
		if (this.initialized) {
			console.warn(`[FairySandbox:${this.sandboxId}] Already initialized, skipping`)
			return
		}

		console.warn(`[FairySandbox:${this.sandboxId}] Initializing sandbox (this may take a few seconds on first run)...`)
		const startTime = Date.now()

		try {
			// Run a simple command to trigger container provisioning
			const result = await this.sandbox.exec('echo "sandbox ready"')
			const elapsed = Date.now() - startTime

			if (result.success) {
				console.warn(`[FairySandbox:${this.sandboxId}] Sandbox initialized successfully in ${elapsed}ms`)
				console.warn(`[FairySandbox:${this.sandboxId}] Container is ready for commands`)
				this.initialized = true
			} else {
				console.warn(`[FairySandbox:${this.sandboxId}] Sandbox initialization failed after ${elapsed}ms`)
				console.warn(`[FairySandbox:${this.sandboxId}] stderr: ${result.stderr}`)
				throw new Error(`Sandbox initialization failed: ${result.stderr}`)
			}
		} catch (error) {
			const elapsed = Date.now() - startTime
			console.warn(`[FairySandbox:${this.sandboxId}] Sandbox initialization error after ${elapsed}ms:`, error)
			throw error
		}
	}

	/**
	 * Execute a command in the sandbox.
	 * @param command - The command to execute
	 */
	async exec(command: string): Promise<SandboxExecResult> {
		console.warn(`[FairySandbox:${this.sandboxId}] Executing command: ${command.substring(0, 100)}${command.length > 100 ? '...' : ''}`)
		const startTime = Date.now()

		try {
			const result = await this.sandbox.exec(command)
			const elapsed = Date.now() - startTime

			console.warn(`[FairySandbox:${this.sandboxId}] Command completed in ${elapsed}ms`)
			console.warn(`[FairySandbox:${this.sandboxId}] Exit code: ${result.exitCode}, Success: ${result.success}`)

			if (result.stderr) {
				console.warn(`[FairySandbox:${this.sandboxId}] stderr: ${result.stderr.substring(0, 200)}`)
			}

			return result
		} catch (error) {
			const elapsed = Date.now() - startTime
			console.warn(`[FairySandbox:${this.sandboxId}] Command failed after ${elapsed}ms:`, error)
			throw error
		}
	}

	/**
	 * Write a file to the sandbox filesystem.
	 * @param path - The file path within the sandbox
	 * @param content - The file content
	 */
	async writeFile(path: string, content: string): Promise<void> {
		console.warn(`[FairySandbox:${this.sandboxId}] Writing file: ${path} (${content.length} bytes)`)
		const startTime = Date.now()

		try {
			await this.sandbox.writeFile(path, content)
			const elapsed = Date.now() - startTime
			console.warn(`[FairySandbox:${this.sandboxId}] File written successfully in ${elapsed}ms`)
		} catch (error) {
			const elapsed = Date.now() - startTime
			console.warn(`[FairySandbox:${this.sandboxId}] File write failed after ${elapsed}ms:`, error)
			throw error
		}
	}

	/**
	 * Read a file from the sandbox filesystem.
	 * @param path - The file path within the sandbox
	 */
	async readFile(path: string): Promise<SandboxFileResult> {
		console.warn(`[FairySandbox:${this.sandboxId}] Reading file: ${path}`)
		const startTime = Date.now()

		try {
			const result = await this.sandbox.readFile(path)
			const elapsed = Date.now() - startTime
			console.warn(`[FairySandbox:${this.sandboxId}] File read successfully in ${elapsed}ms (${result.content.length} bytes)`)
			return result
		} catch (error) {
			const elapsed = Date.now() - startTime
			console.warn(`[FairySandbox:${this.sandboxId}] File read failed after ${elapsed}ms:`, error)
			throw error
		}
	}

	/**
	 * Execute Python code in the sandbox.
	 * @param code - The Python code to execute
	 */
	async execPython(code: string): Promise<SandboxExecResult> {
		console.warn(`[FairySandbox:${this.sandboxId}] Executing Python code (${code.length} chars)`)

		// Write the code to a temp file and execute it
		const filename = `/workspace/script_${Date.now()}.py`
		await this.writeFile(filename, code)
		return this.exec(`python ${filename}`)
	}

	/**
	 * Execute JavaScript/Node.js code in the sandbox.
	 * @param code - The JavaScript code to execute
	 */
	async execNode(code: string): Promise<SandboxExecResult> {
		console.warn(`[FairySandbox:${this.sandboxId}] Executing Node.js code (${code.length} chars)`)

		// Write the code to a temp file and execute it
		const filename = `/workspace/script_${Date.now()}.js`
		await this.writeFile(filename, code)
		return this.exec(`node ${filename}`)
	}

	/**
	 * Get the sandbox ID for debugging purposes.
	 */
	getSandboxId(): string {
		return this.sandboxId
	}
}
