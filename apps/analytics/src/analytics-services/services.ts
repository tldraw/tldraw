import { AnalyticsService } from './analytics-service'
import { ga4Service } from './ga4'
import { hubspotService } from './hubspot'
import { posthogService } from './posthog'
import { reoService } from './reo'

export const ANALYTICS_SERVICES: AnalyticsService[] = [
	posthogService,
	ga4Service,
	hubspotService,
	reoService,
]
