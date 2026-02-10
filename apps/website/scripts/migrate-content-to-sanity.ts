/**
 * Migration script: Hardcoded content → Sanity (COMPLETED)
 *
 * This script was used to migrate all hardcoded content from the former
 * apps/website/content/ folder into Sanity CMS. The content files have been
 * deleted now that all pages fetch from Sanity.
 *
 * Content migrated:
 *   - Homepage singleton (hero, whyTldraw, showcase, whatsInside, community,
 *     whiteboardKit, starterKits, testimonialSection, finalCta)
 *   - Site settings (navGroups, standaloneNavLinks, footer columns, social links)
 *   - Showcase entries + showcase page singleton
 *   - FAQ items + sections
 *   - Feature pages
 *   - Pricing page singleton
 *   - Images uploaded from public/images/showcase/
 *
 * To re-run or inspect the original migration logic, see git history for this file.
 */

console.log('This migration has already been run. All content is in Sanity.')
console.log('To re-run the migration, restore the content/ folder from git history.')
