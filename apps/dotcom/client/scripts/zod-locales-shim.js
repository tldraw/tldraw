// Custom shim to only load the English locale instead of all 47 locales
// This dramatically reduces bundle size while keeping error messages readable
import en from 'zod/v4/locales/en.js'

// Re-export as both default and named export
export { en }
export default en
