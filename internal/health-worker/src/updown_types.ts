// docs: https://updown.io/api#webhooks

interface BaseCheck {
	token: string
	url: string
	alias: null
	last_status: number
	uptime: number
	period: number
	apdex_t: number
	string_match: string
	enabled: boolean
	published: boolean
	disabled_locations: any[]
	recipients: any[]
	last_check_at: string
	next_check_at: string
	created_at: null
	mute_until: null | string
	favicon_url: string
	custom_headers: CustomHeaders
	http_verb: string
	http_body: string
}

interface FailingCheck extends BaseCheck {
	down: true
	down_since: string
	up_since: null
	error: string
}

interface SucceedingCheck extends BaseCheck {
	down: true
	down_since: null
	up_since: string
	error: null
}

interface BaseDowntime {
	id: string
	error: string
	started_at: string
	partial: unknown
}

interface OngoingDowntime extends BaseDowntime {
	ended_at: null
	duration: null
}

interface FinishedDowntime extends BaseDowntime {
	ended_at: string
	// seconds
	duration: number
}

type CustomHeaders = Record<string, string>

interface SslCert {
	subject: string
	issuer: string
	from: string
	to: string
	algorithm: string
}

interface EventDown {
	event: 'check.down'
	time: string
	description: string
	check: FailingCheck
	downtime: OngoingDowntime
}

interface EventStillDown {
	event: 'check.still_down'
	time: string
	description: string
	check: FailingCheck
	downtime: OngoingDowntime
}

interface EventUp {
	event: 'check.up'
	time: string
	description: string
	check: SucceedingCheck
	downtime: FinishedDowntime
}

interface EventSslInvalid {
	event: 'check.ssl_invalid'
	time: string
	description: string
	check: SucceedingCheck | FailingCheck
	ssl: {
		cert: SslCert
		error: string
	}
}

interface EventSslValid {
	event: 'check.ssl_valid'
	time: string
	description: string
	check: SucceedingCheck | FailingCheck
	ssl: {
		cert: SslCert
	}
}

interface EventSslExpiration {
	event: 'check.ssl_expiration'
	time: string
	description: string
	check: SucceedingCheck | FailingCheck
	ssl: {
		cert: SslCert
		days_before_expiration: number
	}
}

interface EventSslRenewed {
	event: 'check.ssl_renewed'
	time: string
	description: string
	check: SucceedingCheck | FailingCheck
	ssl: {
		new_cert: SslCert
		old_cert: SslCert
	}
}

interface EventPerformanceDrop {
	event: 'check.performance_drop'
	time: string
	description: string
	check: SucceedingCheck | FailingCheck
	apdex_dropped: string
	last_metrics: Record<string, { apdex: number }>
}

export type Event =
	| EventDown
	| EventStillDown
	| EventUp
	| EventSslInvalid
	| EventSslValid
	| EventSslExpiration
	| EventSslRenewed
	| EventPerformanceDrop
