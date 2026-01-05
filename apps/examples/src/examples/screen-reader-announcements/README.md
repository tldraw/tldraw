---
title: Custom screen reader announcements
component: ./ScreenReaderAnnouncementsExample.tsx
category: ui
priority: 1
keywords: [accessibility, a11y, screen reader, announcements, live region, useA11y]
---

Trigger custom screen reader announcements using the `useA11y()` hook.

---

This example demonstrates how to use the `useA11y()` hook to create custom screen reader announcements for your UI components. Screen readers use ARIA live regions to announce dynamic content changes to users.

The example shows three common use cases:

- **Polite announcements**: Use `priority: 'polite'` for informational messages that don't require immediate attention (e.g., "Copied to clipboard"). These announcements wait for the screen reader to finish its current announcement.

- **Assertive announcements**: Use `priority: 'assertive'` for important messages that need immediate attention (e.g., validation errors). These announcements interrupt the current screen reader output.

- **State change announcements**: Announce state changes to keep users informed of the current application state.

```tsx
import { useA11y } from 'tldraw'

function CustomPanel() {
	const a11y = useA11y()

	const handleCopy = () => {
		// Polite announcement - doesn't interrupt
		a11y.announce({ msg: 'Copied to clipboard', priority: 'polite' })
	}

	const handleError = () => {
		// Assertive announcement - interrupts immediately
		a11y.announce({ msg: 'Error: Invalid input', priority: 'assertive' })
	}
}
```

The announcements are rendered in an off-screen ARIA live region by the `DefaultA11yAnnouncer` component, making them accessible to screen readers without cluttering the visual interface.
