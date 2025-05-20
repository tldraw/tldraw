This release focuses on enhancing user experience through UI improvements, optimizing performance, and increasing accessibility across various components. Key updates include fixes for text shape grouping, rich text editing in stickies, deployment strategy optimizations, and numerous accessibility enhancements.

# Release Notes

## Summary

- Resolved issues in text shape grouping and rich text editing.
- Optimized deployment strategies and performance across the board.
- Enhanced accessibility and UI across various components.

## Changes

### tldraw SDK
- **Fix Group Bounds for Text Shapes**. Corrected group bounds calculation for text shapes. [#5909](https://github.com/tldraw/tldraw/pull/5909)
- **Fixed tab behavior conflict in stickies with rich text**. Introduced `hasCustomTabBehavior` flag.
- **Bump `@rocicorp/zero` version to 0.19.2025041601**. Addressed token refresh issue and improved database connection strategy. [d403fcffd1eb23cf2d21ece3d367faa7d18083e3](https://github.com/rocicorp/mono/pull/5915)
- **Enhanced Following Mechanics**. Improved viewport following for user chains and loops. [42efa4c](https://github.com/undefined/commit/42efa4c146638a71daae61283ade0e11f96abae1)
- **Performance Improvement in Shape Selection**. Optimized `getSelectedShapes` method. [dc099cf308235698d0c66f39e650b35ce00c6cc3]
- **Accessibility and Rich Text Enhancements**. Added rich text shortcuts and link creation shortcut.
- **VS Code Extension Licensing Support**. Implemented licensing support for VS Code extensions.
- **Enhanced SDK Error Dialogs**. Updated error dialogs for clarity.
- **Upgrade @rocicorp/zero to 0.19.2025042502**. Improved change log cleanup.
- **Toolbar Accessibility Enhancements**. Improved keyboard navigation in toolbars. [37377fbef46d63ba2e0677a2a2ed0086d3931d74](https://github.com/tldraw/tldraw/commit/37377fbef46d63ba2e0677a2a2ed0086d3931d74)
- **Arrow Rotation Flicker Fix**. Addressed flickering in bound arrows during rotation. [bbec36f](https://github.com/commit/bbec36f938054ac87b441b403aceb31376059de3)
- **New Overlays Component**. Introduced `Overlays` component for hints above shapes. `eb5f191f61acf9936926a3c34996ba8780604637`
- **Shape Rendering Optimization**. Restored DPR constrained width and height calculations for shapes.

```diff
@@ -27,13 +27,15 @@ export const Shape = memo(function Shape({
+ dprMultiple,
}: {
id: TLShapeId
shape: TLShape
util: ShapeUtil
index: number
backgroundIndex: number
opacity: number
+ dprMultiple: number
}) {
const editor = useEditor()

@@ -88,14 +90,18 @@ export const Shape is memo(function Shape({
+       // We round the shape width and height up to the nearest multiple of dprMultiple
+       // to avoid the browser making miscalculations when applying the transform.
+       const widthRemainder = bounds.w % dprMultiple
+       const heightRemainder = bounds.h % dprMultiple
+       const width = widthRemainder === 0 ? bounds.w : bounds.w + (dprMultiple - widthRemainder)
+       const height = heightRemainder === 0 ? bounds.h : bounds.h + (dprMultiple - heightRemainder)

-           setStyleProperty(containerRef.current, 'width', width + 'px')
-           setStyleProperty(containerRef.current, 'height', height + 'px')
-           setStyleProperty(bgContainerRef.current, 'width', width + 'px')
-           setStyleProperty(bgContainerRef.current, 'height', height + 'px')
+           setStyleProperty(containerRef.current, 'width', Math.max(width, dprMultiple) + 'px')
+           setStyleProperty(containerRef.current, 'height', Math.max(height, dprMultiple) + 'px')
+           setStyleProperty(bgContainerRef.current, 'width', Math.max(width, dprMultiple) + 'px')
+           setStyleProperty(bgContainerRef.current, 'height', Math.max(height, dprMultiple) + 'px')
             prev.width = width
             prev.height = height
         }
```

- **Exclude .schema.js from Linting**. Excluded `.schema.js` files from linting.
- **Accessibility and UI Fixes for Dotcom**. Made several accessibility and UI improvements.
- **Submenu Display Fixes**. Standardized gradient displays and hover interactions across submenus.
- **Export Custom Background Color for Single Frame Exports**. Ensured custom background colors are applied when exporting individual frames. [#5993](https://github.com/tldraw/tldraw/pull/5990)
- **Button Hover Fix**. Adjusted `z-index` for button hover interactions. [712bc0b](https://github.com/tldraw/tldraw/commit/712bc0b8b5bcd2b146cae309336afc74b32445ad)
- **Migrate radix dependencies to radix-ui package**. Migrated `@radix-ui` dependencies to `radix-ui` package.
- **Indicator Performance Improvement**. Optimized indicator performance for dragging large numbers of shapes.
- **Improved Cache Memoization for Geometry Calculation**. Enhanced cache system by including `shape.meta` in the geometry cache key.
- **Fixed Selection of Off-Screen Shapes**. Ensured shapes outside the viewport can be selected. [064d79cae9fbb63f3d07578c10da54467915ef4d](https://github.com/tldraw/tldraw/commit/064d79cae9fbb63f3d07578c10da54467915ef4d)
- **Update to Zero v19**. Updated `@rocicorp/zero` to version `0.19.2025050203`. [#6005](https://github.com/undefined/pull/6005)
- **Drag Files from Sidebar**. Enabled dragging image files from the sidebar into the editor. [996d0ad](https://github.com/commit/996d0adfecaf8edc288069e56c8ee7f652a81054)
- **Laser Tool Enhancement**. Enabled Escape key functionality for the Laser tool. [#6015](https://github.com/tldraw/tldraw/issues/5861)
- **Enhanced Text Styling Flexibility**. Added `otherStyles` property for additional styles in text measurement scenarios.
- **Rich Text Styling Fixes**. Addressed styling issues in rich text fields. [#6013](https://github.com/tldraw/tldraw/pull/6013)
- **Arrow kind support**. Added support for specifying arrow kind. [#5572](https://github.com/tldraw/tldraw/pull/5572)
- **Fix Inconsistent Panning Speeds**. Made panning speed consistent across tools. [8f8ae1660cdba8d549418485424fba77adb55eb2](https://github.com/tldraw/tldraw/commit/8f8ae1660cdba8d549418485424fba77adb55eb2)
- **Performance Improvement for Rotating Shapes**. Enhanced performance when rotating shapes.
- **Elbow Arrow Enhancements and Fixes**. Improved elbow arrows with fixes for terminal adjustments and route calculation. [70e156551c5c4e3932e6de6c13484b4c605d949b](https://github.com/your-repo/your-project/commit/70e156551c5c4e3932e6de6c13484b4c605d949b)
- **Enhanced Label Indicator for Arrow Editing**. Introduced a minimum width for the label indicator on arrows. [#6029](https://github.com/tldraw/tldraw/pull/6029)
- **Bugfix: Ensure onEditEnd is Called for Previously Editing Shapes**. Ensured `onEditEnd` is called for shapes previously in edit mode.
- **Memory Optimization for Production**. Increased memory allocation for the `view-syncer` service in production. [07f891a2b5166e8bd84cb202d0a85224403c6be9](https://github.com/tldraw/tldraw/commit/07f891a2b5166e8bd84cb202d0a85224403c6be9)
- **Improved Clean Script for E2E Test Authentication**. Enhanced `yarn clean` command for E2E tests.
- **Editor Disposal Order Fix**. Modified disposal process to ensure `store` is disposed after all other disposables.
- **Build-Package Script Fix**. Resolved failure in executing `build-package` script. [#6035](https://github.com/undefined/pull/6035)
- **Props Migrators Bugfix**. Corrected loading issue with `.tldr` files. 
- **Accessibility Improvement**: Reduced screenreader announcements during shape interactions. [#6041](https://github.com/tldraw/tldraw/pull/6041)
- **Remove Unused Selection Background Component**. Eliminated the selection background component. [e0e586ba45af8f6b962ab400bb419b71f9f813c0](https://github.com/tldraw/tldraw/commit/e0e586ba45af8f6b962ab400bb419b71f9f813c0)
- **Embed Shape Definition Enhancement for Figma**. Added support for embedding Figma design URLs in shapes. [e13f266](https://github.com/tldraw/tldraw/commit/e13f266b087df6b12725131cdb8c3707230cad53)
- **Transparent Background for Flattened Shapes**. Ensured transparent backgrounds for flattened shape images. [Commit bd7655d](https://github.com/commit/bd7655d74283b511cddb1a3c8ba16111d5f9c538)
- **Redesign account / help menu**. Updated the design of the help menu in the sidebar. [#6008](https://github.com/tldraw/tldraw/pull/6008)
- **Zoom Button Padding Adjustment**. Increased padding around the zoom button.
- **Grid Snapping for Pasted Content**. Aligned shapes from pasted text or links to the grid.
- **Refactor: Rename `canEditInReadOnly` to `canEditInReadonly`**. Standardized the casing of `canEditInReadonly` method. [bbc6785692f276c5310f13ea3141c0cc2069fe22](https://github.com/tldraw/tldraw/commit/bbc6785692f276c5310f13ea3141c0cc2069fe22)
- **Fixed Arrow Bindings**. Adjusted arrow bindings to maintain proper connections between shapes.
- **Cursor Logic Enhancement**. Optimized cursor logic for improved performance. [6307ec7](https://github.com/tldraw/tldraw/commit/6307ec7baefb8aedc370d99df69f1f64be8a5af3)
- **Accessibility Improvement**: Implemented keyboard shortcuts for navigating into and out of container shapes.
- **Accessibility Improvements for Icons and Handles**. Enhanced internationalization and accessibility for icons and handles.
- **Fixed Elbow Arrow Binding Issue**: Corrected elbow arrow bindings during translation. 
- **User Association with File Uploads**. Associated uploaded files with uploader's user ID.
- **Accessibility Improvement**: Introduced Cmd+Enter shortcut to focus the styling menu. [#5827](https://github.com/tldraw/tldraw/pull/5827)
- **Edit Link Menu Enhancement**. Improved Edit Link menu by auto-selecting link text. [#6072](https://github.com/undefined/pull/6072)

### tldraw.com
- **Improved UI Layout**: Relocated the Import File button for enhanced accessibility.
- **Optimize File Permission Queries**. Optimized file permission logic. [bec6f90](https://github.com/grgbkr/tldraw/commit/bec6f90d283a46eb767708f5828c746f35ad885b)
- **Removed `first-connect-duration` event tracking**. Eliminated unnecessary event tracking. [d84fd6da5b87f67659cb3f2bd5e5b33595197b66](https://github.com/undefined/pull/5939)
- **Accessibility and UI Fixes for Dotcom**. Addressed accessibility and UI issues.
- **Improved Error Reporting for Sync Worker**. Enhanced error reporting for better troubleshooting. [#5996](https://github.com/tldraw/tldraw/issues/5959)
- **UI Improvement on SignIn/Share Buttons**: Fine-tuned spacing and baseline for SignIn and Share buttons.
- **Export Images Bug Fixed**. Resolved dimension accuracy issues in exported images.
- **Export Menu Clickable Area Bug Fix**. Corrected clickable area issue in the export menu. [172c566](https://github.com/commit/172c5663eaa22530baf9ab9e4144b671c2963635)
- **Export Menu Improvements**. Enhanced the export menu with visual and usability improvements.
- **Revert Export Menu Improvements**. Reverted changes to the export menu. [#6037](https://github.com/tldraw/tldraw/pull/6037)
- **Upload Progress Bar Visibility Improvement**. Fixed visibility issue of the upload progress bar. 
- **Sidebar UI Enhancements**. Implemented UI fixes for the sidebar.
- **Asset Upload Verification and Queue Implementation**. Verified file existence before uploading and introduced a queue system.
- **Feedback Dialog Fix**. Resolved feedback dialog submission issue.
- **Fix Queue Previews**. Ensured separate queues for each preview deploy. [#6056](https://github.com/tldraw/tldraw/pull/6056)
- **Download Option Removal for Non-Active Files**. Removed download option for non-active files. [#6065](https://github.com/tldraw/tldraw/pull/6060)
- **Internationalization String Updates**. Updated i18n strings for improved clarity.

### tldraw.dev
- **Semantic HTML Update for Documentation Site**. Changed `aside` to `nav` for better semantic accuracy.
- **Brand Name Update**. Updated brand name to "Craft" in documentation.
- **License Key Documentation Moved to Docs Site**. Transferred license key documentation to the official site.
- **Documentation Update**: Removed section on rich text exports.

### Other Changes
- **Optimized Deployment Strategy for Zero Backends**. Improved deployment strategy for zero backends.
- **Internationalization String Updates**. Updated i18n strings for enhanced clarity.
- **Simple Server Node Example Connection Fix**. Fixed message loss during initial connection. [PR #5949](https://github.com/tldraw/tldraw/pull/5946)
- **Exclude .schema.js from Linting**. Excluded `.schema.js` files from linting.
- **Mask Window Example Fix**. Corrected mask window example for accurate positioning. [d850dc6dd6367c7cf72f080efd778e46654ca345](https://github.com/undefined/pull/5998)
- **Disable Auto Flyio Deploy**: Temporarily disabled automatic Flyio deployment. `683b5ae3bbe90a93c8a641eacb4f749261cb0d21`
- **Simple Server Example - Image Upload Fix**: Fixed image upload functionality. [See discussion](https://github.com/tldraw/tldraw/issues/5970)
- **Memory Optimization for Production**. Increased memory allocation for the `view-syncer` service. [07f891a2b5166e8bd84cb202d0a85224403c6be9](https://github.com/tldraw/tldraw/commit/07f891a2b5166e8bd84cb202d0a85224403c6be9)
- **Improved Clean Script for E2E Test Authentication**. Enhanced `yarn clean` command for E2E tests.
- **Editor Disposal Order Fix**. Ensured `store` is disposed after all other disposables.
- **Build-Package Script Fix**. Fixed `build-package` script execution. [#6035](https://github.com/undefined/pull/6035)
- **Queue Creation on Dry Run Omitted**. Skipped queue creation during dry runs. [ad6c4f5526a8eb3103aaa29079e423cfee5f97ea](https://github.com/tldraw/tldraw/commit/ad6c4f5526a8eb3103aaa29079e423cfee5f97ea)
- **i18n Workflow Optimization**. Updated GitHub Actions for efficient fetch depth.
- **Upgrade transitive dependency prebuild-install**. Addressed `yarn install` failure on Node version 22.