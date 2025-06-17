import { Environment } from '../../types'

export async function isTestFile(env: Environment, fileId: string): Promise<boolean> {
	const result = await env.TEST_FILE.prepare('SELECT id FROM test_file WHERE id = ?')
		.bind(fileId)
		.first()

	return result !== null
}
