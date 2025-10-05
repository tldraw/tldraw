// Server-side logger for Node.js runtime only
// This logger writes to both stdout and a rotating file
// DO NOT import this in Edge runtime or client-side code

import { join } from 'path'
import pino from 'pino'

// Type guard to ensure we're in Node.js runtime
function isNodeRuntime(): boolean {
	return typeof process !== 'undefined' && process.versions?.node !== undefined
}

// Logger instance - lazily initialized
let loggerInstance: pino.Logger | null = null

/**
 * Get or create the shared logger instance
 * Only works in Node.js runtime (API routes, server components)
 * Throws error if called in Edge runtime
 */
export function getLogger(): pino.Logger {
	if (!isNodeRuntime()) {
		throw new Error('Logger can only be used in Node.js runtime, not Edge runtime')
	}

	if (!loggerInstance) {
		// Determine log directory path
		// For dev: apps/simple-dotcom/.logs/
		// For production: .logs/ relative to working directory
		const logDir = process.env.NODE_ENV === 'production' ? '.logs' : '../.logs'
		const logPath = join(process.cwd(), logDir, 'backend.log')

		// Create logger with multi-stream transport
		// - stdout: pretty-printed for development, JSON for production
		// - file: always JSON format with append mode
		loggerInstance = pino(
			{
				level: process.env.LOG_LEVEL || 'info',
				formatters: {
					// Add standardized fields to every log entry
					bindings: (bindings) => {
						return {
							pid: bindings.pid,
							hostname: bindings.hostname,
							node_env: process.env.NODE_ENV,
						}
					},
					level: (label, number) => {
						return { level: label }
					},
				},
				timestamp: pino.stdTimeFunctions.isoTime,
				// Serialize errors properly
				serializers: {
					err: pino.stdSerializers.err,
					error: pino.stdSerializers.err,
				},
			},
			pino.multistream([
				{
					// Stdout stream - pretty in dev, JSON in prod
					stream:
						process.env.NODE_ENV === 'production'
							? process.stdout
							: require('pino-pretty')({
									colorize: true,
									translateTime: 'HH:MM:ss.l',
									ignore: 'pid,hostname,node_env',
								}),
					level: process.env.LOG_LEVEL || 'info',
				},
				{
					// File stream - always JSON, append mode
					stream: require('fs').createWriteStream(logPath, {
						flags: 'a', // append mode
						encoding: 'utf8',
					}),
					level: 'debug', // Log everything to file
				},
			])
		)

		// Log initialization
		loggerInstance.info(
			{
				logPath,
				env: process.env.NODE_ENV,
				logLevel: process.env.LOG_LEVEL || 'info',
			},
			'Logger initialized'
		)
	}

	return loggerInstance
}

/**
 * Create a child logger with additional context
 * Useful for adding route-specific or request-specific context
 */
export function createChildLogger(context: Record<string, unknown>): pino.Logger {
	return getLogger().child(context)
}

/**
 * Convenience functions for common logging patterns
 */
export const logger = {
	/**
	 * Get the logger instance directly
	 */
	instance: () => getLogger(),

	/**
	 * Log informational message
	 */
	info: (msg: string, data?: Record<string, unknown>) => {
		if (data) {
			getLogger().info(data, msg)
		} else {
			getLogger().info(msg)
		}
	},

	/**
	 * Log warning message
	 */
	warn: (msg: string, data?: Record<string, unknown>) => {
		if (data) {
			getLogger().warn(data, msg)
		} else {
			getLogger().warn(msg)
		}
	},

	/**
	 * Log error message
	 */
	error: (msg: string, error?: Error | unknown, data?: Record<string, unknown>) => {
		const logData = { ...data }
		if (error instanceof Error) {
			logData.err = error
		} else if (error) {
			logData.error = error
		}
		if (Object.keys(logData).length > 0) {
			getLogger().error(logData, msg)
		} else {
			getLogger().error(msg)
		}
	},

	/**
	 * Log debug message (only in development or if LOG_LEVEL=debug)
	 */
	debug: (msg: string, data?: Record<string, unknown>) => {
		if (data) {
			getLogger().debug(data, msg)
		} else {
			getLogger().debug(msg)
		}
	},

	/**
	 * Create a child logger with additional context
	 * Example: logger.child({ route: '/api/workspaces', requestId: '123' })
	 */
	child: (context: Record<string, unknown>) => createChildLogger(context),
}
