---
title: Move the Toolbar to the Top Panel
component: ./ToolbarToTopPanelExample.tsx
category: ui
priority: 1.5
keywords: [toolbar, top panel, layout]
---

Reposition the toolbar from its default location at the bottom of the screen to the Top Panel.

---

By default tldraw renders the main toolbar inside the **Bottom Panel** area. Because the toolbar is just a React component, you can move it anywhere you like.

This example hides the default `Toolbar` component and renders it inside the `TopPanel` instead, using the `CenteredTopPanelContainer` helper so that it stays nicely centred between the left- and right-hand panels.

```tsx
const components: TLComponents = {
  // Remove the toolbar from the bottom panel
  Toolbar: null,
  // Render it inside the top panel instead
  TopPanel: () => (
    <CenteredTopPanelContainer>
      <DefaultToolbar />
    </CenteredTopPanelContainer>
  ),
}
```

Open the example and notice how the toolbar now appears at the top of the screen.