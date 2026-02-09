import { author } from './author'
import { blogCategory } from './blogCategory'
import { blogPost } from './blogPost'
import { caseStudy } from './caseStudy'
import { companyPage } from './companyPage'
import { event } from './event'
import { faqItem } from './faqItem'
import { featurePage } from './featurePage'
import { homepage } from './homepage'
import { jobListing } from './jobListing'
import { legalPage } from './legalPage'
import { page } from './page'
import { pricingPage } from './pricingPage'
import { pricingTier } from './pricingTier'
import { siteSettings } from './siteSettings'
import { teamMember } from './teamMember'
import { testimonial } from './testimonial'

export const schemas = [
	// Documents
	author,
	blogCategory,
	blogPost,
	caseStudy,
	event,
	faqItem,
	featurePage,
	jobListing,
	legalPage,
	page,
	pricingTier,
	teamMember,
	testimonial,

	// Singleton pages
	companyPage,
	homepage,
	pricingPage,
	siteSettings,
]
