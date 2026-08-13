import minimist from 'minimist'
import { nicelog } from '../lib/nicelog'

const USAGE = `
Cloudflare Artifacts evaluation prototype — measures whether Artifacts can replace the
uncompressed R2 snapshot history (and the Pierre pipeline) with git delta compression.

Usage: yarn tsx internal/scripts/artifacts-eval/index.ts <command> [flags]

Commands (run in order; each stage is resumable via .data/):
  select       Sample rooms stratified by size x history length (LIST-only, no downloads)
                 --env staging|production  --from-db|--from-listing  --candidates N  --per-cell N
                 --slugs <a,b,...>  (explicit room list, e.g. specific tldraw-employee boards;
                                     skips sampling — preferred over random user data)
  fetch        Download version history from R2
                 --slug <slug>  --max-versions N  --strategy latest|spread  --concurrency N
  build        Build local git repos (records + blob layouts), measure gc'd pack sizes
                 --slug <slug>  --layout records|blob  --force  --skip-verify
  push         Create Artifacts repos, push, verify read-back, record server-reported size
                 --slug <slug>  --layout records|blob  --namespace <ns>  --force  --recheck
  incremental  Replay held-out versions as per-persist pushes (git CLI vs isomorphic-git vs batched)
                 --slug <slug>  --holdout N  --batch N  --namespace <ns>  --recheck
  report       Summary table + cost model -> .data/report.md
                 --fleet-size <active rooms per day>

All commands accept --work-dir (default: internal/scripts/artifacts-eval/.data).

Credentials (via env):
  select/fetch   CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_ACCESS_KEY_SECRET
                 (+ SUPABASE_PRODUCTION_DB_URL for --from-db)
  push/incr      CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN (Artifacts permission)
  build/report   none

Setup: the account needs Artifacts beta access — check with
  npx wrangler artifacts namespaces list
and create the eval namespace once with
  npx wrangler artifacts namespaces create snapshots-eval
`

async function main() {
	const args = minimist(process.argv.slice(2), {
		// Room slugs can start with "-"; keep these as strings (use --flag=value syntax).
		string: ['slugs', 'slug', 'env', 'layout', 'strategy', 'namespace', 'work-dir'],
	})
	const [command] = args._
	switch (command) {
		case 'select':
			return await (await import('./selectRooms')).selectRooms(args as any)
		case 'fetch':
			return await (await import('./fetchHistory')).fetchHistory(args as any)
		case 'build':
			return await (await import('./buildRepos')).buildRepos(args as any)
		case 'push':
			return await (await import('./pushArtifacts')).pushArtifacts(args as any)
		case 'incremental':
			return await (await import('./incremental')).incremental(args as any)
		case 'report':
			return await (await import('./report')).report(args as any)
		default:
			nicelog(USAGE)
			if (command) {
				throw new Error(`Unknown command: ${command}`)
			}
	}
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
