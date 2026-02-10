import { author } from './author'
import { blogCategory } from './blogCategory'
import { blogPost } from './blogPost'
import { caseStudy } from './caseStudy'
import { companyPage } from './companyPage'
import { event } from './event'
import { faqItem } from './faqItem'
import { faqSection } from './faqSection'
import { featurePage } from './featurePage'
import { homepage } from './homepage'
import { jobListing } from './jobListing'
import { legalPage } from './legalPage'
import { page } from './page'
import { pricingPage } from './pricingPage'
import { pricingTier } from './pricingTier'
import { showcaseEntry } from './showcaseEntry'
import { showcasePage } from './showcasePage'
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
	faqSection,
	featurePage,
	jobListing,
	legalPage,
	page,
	pricingTier,
	showcaseEntry,
	teamMember,
	testimonial,

	// Singleton pages
	companyPage,
	homepage,
	pricingPage,
	showcasePage,
	siteSettings,
]
