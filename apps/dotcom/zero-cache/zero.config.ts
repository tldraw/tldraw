import { defineConfig } from '@rocicorp/zero/config'
import { schema, type Schema } from './zero.schema'

// The contents of your decoded JWT.
interface AuthData {
	sub: string
}

export default defineConfig<AuthData, Schema>(schema, (query) => {
	const allowIfLoggedIn = (authData: AuthData) => query.user.where('id', '=', authData.sub)

	return {
    upstreamDBConnStr: must(process.env.ZSTART_DB),
    cvrDBConnStr: must(process.env.ZSTART_DB),
    changeDBConnStr: must(process.env.ZSTART_DB),
    replicaDBFile: must(process.env.ZSTART_REPLICA_DB_FILE),
    jwtSecret: must(process.env.JWT_SECRET),
		

		numSyncWorkers: undefined, // this means numCores - 1

		log: {
			level: 'debug',
			format: 'text',
		},

		authorization: {
			user: {
				table: {
					insert: undefined,
					update: undefined,
					delete: undefined,
				},
			},
			file: {
				table: {
					insert: undefined,
					update: undefined,
					delete: undefined,
				},
			},
			file_state: {
				table: {
					insert: undefined,
					update: undefined,
					delete: undefined,
				},
			},
		},
	}
})

function must(val: any) {
	if (!val) {
		throw new Error('Expected value to be defined')
	}
	return val
}
