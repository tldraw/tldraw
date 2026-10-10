// @clerk/elements imports Next.js router hooks for `routing="path"`. We only use `routing="virtual"`,
// so without this stub (aliased in vite.config.ts) the build needs Next.js installed and bundles its router.
function unsupported(): never {
	throw new Error('Next.js routing is not available in tldraw.com; use routing="virtual"')
}

export const useRouter = unsupported
export const usePathname = unsupported
export const useParams = unsupported
export const useSearchParams = unsupported
