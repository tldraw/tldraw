/* eslint-disable */
/// <reference path="./.sst/platform/config.d.ts" />
import { readFileSync } from 'fs'

const isProduction = process.env.TLDRAW_ENV === 'production'
const githubPrNumber = process.env.GITHUB_REF?.match(/refs\/pull\/(\d+)\/merge/)?.[1]

let previewId = null as null | string
if (process.env.TLDRAW_ENV === 'preview' && githubPrNumber) {
	previewId = `pr-${githubPrNumber}`
}

let domain = undefined as undefined | string
if (process.env.TLDRAW_ENV === 'preview' && previewId) {
	domain = `${previewId}.zero.tldraw.com`
} else if (isProduction) {
	domain = 'production.zero.tldraw.com'
} else if (process.env.TLDRAW_ENV === 'staging') {
	domain = 'staging.zero.tldraw.com'
}

export default $config({
	app(input) {
		return {
			name: 'tldraw',
			removal: input?.stage === 'production' ? 'retain' : 'remove',
			home: 'aws',
			region: process.env.AWS_REGION || 'eu-north-1',
			providers: {
				aws: process.env.CI
					? {}
					: {
							profile: 'preview',
						},
				command: true,
			},
		}
	},
	async run() {
		const zeroVersion = JSON.parse(readFileSync('apps/dotcom/zero-cache/package.json').toString())
			.dependencies['@rocicorp/zero']

		// S3 Bucket
		const replicationBucket = new sst.aws.Bucket(`replication-bucket`)

		// VPC Configuration
		const vpc = new sst.aws.Vpc(`vpc`, {
			az: 2,
		})

		// ECS Cluster
		const cluster = new sst.aws.Cluster(`cluster`, {
			vpc,
		})

		const conn = new sst.Secret('PostgresConnectionString')
		const zeroMutateUrl = new sst.Secret('ZeroMutateUrl')
		const zeroQueryUrl = new sst.Secret('ZeroQueryUrl')
		const zeroAdminPassword = new sst.Secret('ZeroAdminPassword')

		// Common environment variables
		const commonEnv = {
			ZERO_UPSTREAM_DB: conn.value,
			ZERO_CVR_DB: conn.value,
			ZERO_CHANGE_DB: conn.value,
			ZERO_REPLICA_FILE: 'sync-replica.db',
			ZERO_LITESTREAM_BACKUP_URL: $interpolate`s3://${replicationBucket.name}/backup`,
			ZERO_IMAGE_URL: `rocicorp/zero:${zeroVersion}`,
			ZERO_CVR_MAX_CONNS: '10',
			ZERO_UPSTREAM_MAX_CONNS: '10',
			ZERO_APP_PUBLICATIONS: 'zero_data',
			ZERO_MUTATE_URL: zeroMutateUrl.value,
			ZERO_QUERY_URL: zeroQueryUrl.value,
			ZERO_ADMIN_PASSWORD: zeroAdminPassword.value,
		}

		// Replication Manager Service
		const replicationManager = cluster.addService(`replication-manager`, {
			cpu: '0.5 vCPU',
			memory: '1 GB',
			architecture: 'arm64',
			image: commonEnv.ZERO_IMAGE_URL,
			link: [replicationBucket],
			health: {
				command: ['CMD-SHELL', 'curl -f http://localhost:4849/ || exit 1'],
				interval: '5 seconds',
				retries: 3,
				startPeriod: '300 seconds',
			},
			environment: {
				...commonEnv,
				ZERO_CHANGE_MAX_CONNS: '3',
				ZERO_NUM_SYNC_WORKERS: '0',
			},
			loadBalancer: {
				public: false,
				ports: [
					{
						listen: '80/http',
						forward: '4849/http',
					},
				],
			},
			transform: {
				loadBalancer: {
					idleTimeout: 3600,
				},
				target: {
					healthCheck: {
						enabled: true,
						path: '/keepalive',
						protocol: 'HTTP',
						interval: 5,
						healthyThreshold: 2,
						timeout: 3,
					},
				},
			},
		})

		// View Syncer Service
		const viewSyncer = cluster.addService(`view-syncer`, {
			cpu: isProduction ? '2 vCPU' : '1 vCPU',
			memory: isProduction ? '4 GB' : '2 GB',
			architecture: 'arm64',
			image: commonEnv.ZERO_IMAGE_URL,
			link: [replicationBucket],
			health: {
				command: ['CMD-SHELL', 'curl -f http://localhost:4848/ || exit 1'],
				interval: '5 seconds',
				retries: 3,
				startPeriod: '300 seconds',
			},
			environment: {
				...commonEnv,
				ZERO_CHANGE_STREAMER_URI: replicationManager.url,
			},
			logging: {
				retention: '1 month',
			},
			loadBalancer: {
				domain,
				public: true,
				rules: domain
					? [{ listen: '443/https', forward: '4848/http' }]
					: [{ listen: '80/http', forward: '4848/http' }],
			},
			transform: {
				target: {
					healthCheck: {
						enabled: true,
						path: '/keepalive',
						protocol: 'HTTP',
						interval: 5,
						healthyThreshold: 2,
						timeout: 3,
					},
					stickiness: {
						enabled: true,
						type: 'lb_cookie',
						cookieDuration: 120,
					},
					loadBalancingAlgorithmType: 'least_outstanding_requests',
				},
			},
		})
	},
})
