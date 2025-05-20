# Release Notes

## Summary

- Enhanced text shape handling, sticky notes functionality, semantic HTML, UI accessibility, backend deployment, documentation, performance, and more across tldraw SDK, tldraw.com, and tldraw.dev.
- Addressed issues with server connection, shape selection, arrow rotation, UI consistency, and file uploads.
- Improved internationalization, error reporting, and accessibility features.

## Changes

### tldraw SDK

- Corrected group bounds calculations to include text shapes. [#5909](https://github.com/tldraw/tldraw/pull/5909) [#5910](https://github.com/tldraw/tldraw/pull/5910)
- Resolved sticky notes tab conflict with rich text indentation.
- Updated `@rocicorp/zero` to `0.19.2025041601` for token refresh fix and lazy database connection.
- Enhanced viewport following logic for smoother collaboration. [42efa4c](https://github.com/undefined/commit/42efa4c146638a71daae61283ade0e11f96abae1)
- Optimized `getSelectedShapes` method for better performance.
- Added rich text shortcuts and improved dialog accessibility. [ae83a75](https://github.com/tldraw/tldraw/commit/ae83a75c91b6d95f40045bbb5a12d96355d6b855)
- Improved accessibility and UI for select components and error dialogs. [#5941](https://github.com/tldraw/tldraw/pull/5941)
- Implemented licensing support for VS Code extensions.
- Removed GitHub and Discord links from SDK error dialogs in production. [44a0b426](https://github.com/tldraw/tldraw/commit/44a0b42690d2f60285be9af887727865b5286582)
- Updated `@rocicorp/zero` for better logging and metrics. [1a9d2f1](https://github.com/rocicorp/replicache/commit/1a9d2f148c2dcba9069d2e1a2ba1c5e2e12bc426)
- Enhanced keyboard navigation in toolbars and improved aria-labels. [37377fb](https://github.com)
- Made embeds focusable during editing for keyboard accessibility. [2449ca6](https://github.com/commit/2449ca610c41a2dc29ab4461c4c9ed56ddcc92f0)
- Stabilized visual feedback for rotating bound arrows.
- Introduced `Overlays` component for intermediate layer content placement.
- Prevented unintentional entry into edit mode with prolonged Enter key press.
- Updated `@rocicorp/zero` to address deployment issues and improve performance. [e0dbceb](https://github.com/tldraw/tldraw/commit/e0dbcebeb554a7878ae74c633699021145ef3b52)
- Added double-click functionality for frame resizing to fit contents. [#5546](https://github.com/tldraw/tldraw/pull/5546)
- Restored missing bottom margin to style panel. `fd867ad`
- Reintroduced DPR-constrained rounding logic to prevent jittering.
- Improved accessibility and UI for the `<nav>` element and Share menu.
- Corrected ctrl key detection during scroll actions for accurate zoom/pan behavior.
- Standardized gradients and hover interactions for visual consistency. [499ea5e](https://github.com/tldraw/tldraw/commit/499ea5e07c8314ce69b5ca51bf84da8932bde9ba)
- Ensured active items in toolbars are correctly highlighted.
- Enabled custom background color use in single frame exports. [#5993](https://github.com/tldraw/tldraw/pull/5990)
- Improved hover responsiveness for UI buttons. [712bc0b](https://github.com/tldraw/tldraw/commit/712bc0b8b5bcd2b146cae309336afc74b32445ad)
- Migrated radix dependencies to `radix-ui` package for simplified management.
- Optimized rendering efficiency for hidden indicators and introduced simplified style for geo shapes.
- Enhanced error logging and handling in the sync worker for more detailed debugging.
- Optimized geometry cache's memoization logic by including `shape.meta` in the cache key.
- Enhanced selection capability for off-screen shapes during brushing action.
- Upgraded `@rocicorp/zero` with naming and configuration improvements. [#6005](https://github.com/undefined/pull/6005)
- Refined export menu UI and functionality for a better user experience.
- Enabled direct drag-and-drop functionality for image files from VSCode sidebar. [996d0ad](https://github.com/commit/996d0adfecaf8edc288069e56c8ee7f652a81054)
- Allowed returning to Select tool with the escape key from laser tool mode. [#6015](https://github.com/tldraw/tldraw/pull/6015)
- Ensured correct handling of image uploads in the simple server example. [c4135f4](https://github.com/tldraw/tldraw/commit/c4135f4903f563823a231da1aa7d656285066ec6)
- Added support for additional CSS styles in TextManager for comprehensive styling. [#6014](https://github.com/tldraw/tldraw/issues/5966)
- Corrected styling for empty lines and lists within rich text elements. [#6013](https://github.com/tldraw/tldraw/issues/6013)
- Updated packages for new arrow kinds and binding properties. [#5572](https://github.com/tldraw/tldraw/pull/5572)
- Ensured panning speed consistency across hand tool and space/middle mouse button panning. [#6024](https://github.com/tldraw/tldraw/pull/6024)
- Optimized shape rotation performance and introduced `ResizeHandle` component. [4389e59](https://github.com/tldraw/tldraw/commit/4389e597566020cb54a60eceee877c14ba8c737d)
- Improved elbow arrow performance, editing, and routing logic. [70e1565](https://github.com/tldraw/tldraw/commit/70e156551c5c4e3932e6de6c13484b4c605d949b)
- Implemented minimum width for arrow label indicators. [d6fe56e](https://github.com/tldraw/tldraw/commit/d6fe56e14603cd0078f71ba72d09ea53bf4239c5)
- Fixed `onEditEnd` trigger for shape editing transitions. [b791a03](https://github.com/undefined/commit/b791a0363a7a2625a389f5f0a098a4626f05e6a5)
- Streamlined cursor logic for improved performance. [6307ec7](https://github.com/tldraw/tldraw/commit/6307ec7baefb8aedc370d99df69f1f64be8a5af3)
- Added keyboard shortcuts for container shape navigation.
- Enhanced labels for better screen reader accessibility.
- Fixed issue with elbow arrows losing bindings during drag selections.
- Linked file uploads with uploader's user ID for better file tracking and management. [b49b003](https://github.com/tldraw/tldraw/commit/b49b003c609ecc4689f5885e9c23a48f0e97ee3b)
- Added Cmd+Enter shortcut to focus styling menu.
- Enhanced Edit Link menu for quicker link text modifications. [#6072](https://github.com/tldraw/tldraw/pull/6072)
- Updated Wrangler and dependencies for compatibility improvements.
- Merged shape and binding utilities in TldrawImage for improved reliability. [e79ae46](https://github.com/tldraw/tldraw/commit/e79ae4643e8a6c12943813c994838d521df1043f)
- Added hooks for presence changes in `TLSocketRoom` and `TLSyncRoom`. `4982c45`
- Upgraded dependencies to fix build issues with Node version 22. [e5e62b7](https://github.com/TryGhost/node-sqlite3/issues/1824)

### tldraw.com

- Moved Import File button for better UI accessibility.
- Improved query efficiency for file permissions. [bec6f90](https://github.com/grgbkr/tldraw/pull/1)
- Eliminated `first-connect-duration` event tracking. [d84fd6da](https://github.com/undefined/commit/d84fd6da5b87f67659cb3f2bd5e5b33595197b66)
- Improved accessibility and UI for the `<nav>` element and Share menu.
- Enhanced error reporting for sync worker.
- Adjusted alignment and spacing of "Sign in / Share" buttons. [2594be9](https://github.com/undefined/pull/5985)
- Corrected image dimension issues in the export menu.
- Modified HTML structure for correct hover and click behavior in exports menu. [172c566](https://github.com/undefined/pull/6007)
- Refined export menu UI and functionality.
- Rolled back previously introduced changes to the export menu. [5186e76](https://github.com/tldraw/tldraw/commit/5186e76a1992bb5d5c495e201da259b9ade8d0de)
- Ensured upload progress bar remains hidden after failed uploads.
- Implemented UI fixes for sidebar enhancements.
- Improved file upload verification and introduced retry logic. [b29c844](https://github.com/tldraw/tldraw/commit/b29c8448ae7b4a64b4d28bfc14fc2bc6cc426249)
- Fixed feedback dialog sending issue. [be59c37](https://github.com/commit/be59c37b047e871db593cf896ca86df83c155f2c)
- Ensured separate queues for each preview deployment. [4887e1f](https://github.com/tldraw/tldraw/commit/4887e1f52521c469f25e67e04488a6f7df829600)
- Removed download option for non-active files. [#6065](https://github.com/tldraw/tldraw/pull/6065)

### tldraw.dev

- Replaced `<aside>` with `<nav>` tags for semantic HTML structure improvement. [a2884bb](https://github.com/undefined/pull/5913)
- Updated product name to "Craft" in documentation.
- Migrated license key documentation to Docs site. [ea6e503](https://github.com/tldraw/tldraw/commit/ea6e50365559507d98ce0cc774082c099aa652d3)
- Removed section on exporting rich text challenges from documentation.

### Other Changes

- Refined Zero backend deployment logic for targeted deployments.
- Updated internationalization strings for improved clarity and user experience.
- Addressed server connection issue on first attempt. [#5949](https://github.com/tldraw/tldraw/pull/5946)
- Increased memory allocation for the `view-syncer` service to 4 GB. [07f891a](https://github.com/tldraw/tldraw/commit/07f891a2b5166e8bd84cb202d0a85224403c6be9)
- Enhanced `yarn clean` command for smoother e2e testing.
- Fixed `build-package` script execution issue. [#6035](https://github.com/tldraw/tldraw/pull/6035)
- Excluded queue creation during dry run for deployment efficiency. [ad6c4f5](https://github.com/tldraw/tldraw/commit/ad6c4f5526a8eb3103aaa29079e423cfee5f97ea)
- Optimized repository checkout in GitHub Actions.
- Upgraded `prebuild-install` dependency to fix build failure with Node version 22. [e5e62b7](https://github.com/TryGhost/node-sqlite3/issues/1824)
