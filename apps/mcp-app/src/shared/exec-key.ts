/**
 * Content hash used two ways in the exec flow:
 *
 * - As the JOB MATCHING KEY (`computeExecKey(code)`): pairs a freshly spawned
 *   widget with its own invocation's queued job inside a canvas DO, so
 *   concurrent execs on one base canvas can't swap jobs. Collisions require
 *   identical code on the same base, which makes the jobs interchangeable.
 *
 * - As the LEGACY EXEC KEY (`computeExecKey(code, canvasId)`): old cached
 *   widget builds report exec results through the `_exec_callback` shim
 *   addressed by this key; the server stamps it onto each job so the shim can
 *   find the job to complete. Hosts cache widget HTML durably, so this path
 *   stays live until `widgetVersion` telemetry says the old population has
 *   rolled over.
 *
 * Runs in both the Cloudflare worker and the widget (browser).
 */
export async function computeExecKey(code: string, canvasId?: string): Promise<string> {
	const material = canvasId ? `${canvasId}\n${code}` : code
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(material))
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0'))
		.join('')
		.slice(0, 32)
}
