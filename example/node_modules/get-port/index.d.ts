export interface Options {
	/**
	 * A preferred port or an array of preferred ports to use.
	 */
	readonly port?: number | ReadonlyArray<number>,

	/**
	 * The host on which port resolution should be performed. Can be either an IPv4 or IPv6 address.
	 */
	readonly host?: string;
}

/**
 * Get an available TCP port number.
 *
 * @returns Port number.
 */
export default function getPort(options?: Options): Promise<number>;
