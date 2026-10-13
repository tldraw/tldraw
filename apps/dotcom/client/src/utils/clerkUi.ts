// Evaluated once, when main.tsx boots. Clerk only loads its UI bundle at boot, so a consent page
// reached by client-side navigation has none, and <OAuthConsent /> throws without it.
export const bootedOnOAuthConsent = /^\/oauth-consent\/?$/.test(window.location.pathname)
