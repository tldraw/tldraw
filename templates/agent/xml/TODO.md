# XML Agent Feature Roadmap

This document outlines the planned features and improvements for the XML agent's shape creation and manipulation capabilities.

## 🎯 Shape Creation Expansion

Currently only supports basic geo rectangles and text shapes. The following shape types should be added:

### Core Shapes

- [ ] **Line shapes** - Add line shape creation support
- [ ] **Note/sticky note shapes** - Add note/sticky note shape creation support
- [ ] **Frame shapes** - Add frame shape creation support for organizing content
- [ ] **Highlight shapes** - Add highlight shape creation support
- [ ] **Arrow shapes** - (BLOCKED)Add arrow shape creation support with start/end points, arrowheads, and styling options

### Advanced Shapes

- [ ] **Draw/freehand shapes** - Add support for drawing/freehand shapes
- [ ] **Image shapes** - Add image shape creation support (from URLs or base64)
- [ ] **Embed shapes** - Add embed shape creation for external content (YouTube, Figma, etc.)

### Enhanced Geo Shapes

- [ ] **Expand geo shape types** - Support all geo types (ellipse, triangle, diamond, star, cloud, trapezoid, rhombus, etc.)
- [ ] **Enhanced geo properties** - Add support for all geo shape properties (geo type, size, font, dash style, scale)

## ⚡ Action System Expansion

Currently supports: move, distribute, stack, align, label, place, delete. Add the following:

### Transform Actions

- [ ] **Resize shapes** - Add resize-shape action to change width/height of existing shapes
- [ ] **Rotate shapes** - Add rotate-shape action to rotate shapes by specified angles
- [ ] **Duplicate shapes** - Add duplicate-shapes action to copy shapes

### Styling Actions

- [ ] **Change style** - Add change-style action to modify color, fill, stroke, and other styling properties
- [ ] **Enhanced text properties** - Add support for text formatting properties (size, font, alignment)

### Organization Actions

- [ ] **Group/ungroup shapes** - Add group-shapes and ungroup-shapes actions
- [ ] **Z-order manipulation** - Add z-order manipulation actions (bring-to-front, send-to-back, etc.)
- [ ] **Connect shapes** - Add connect-shapes action to create arrow connections between shapes

### Selection & Navigation

- [ ] **Select shapes** - Add select-shapes action to change the current selection
- [ ] **Zoom and pan** - Add zoom and pan viewport actions (zoom-to-fit, zoom-in, zoom-out, pan-to)
- [ ] **Page management** - Add page management actions (create-page, switch-page, delete-page)

### Enhanced Placement

- [ ] **Enhanced placement modes** - Enhance place-shape to support more positioning modes (inside, outside, between shapes)

## 🔧 Advanced Capabilities

### Bulk Operations

- [ ] **Bulk operations** - Add bulk operation support for applying actions to multiple shapes at once
- [ ] **Conditional actions** - Add conditional logic support (if-then actions based on shape properties)

### Measurement & Calculation

- [ ] **Measurement actions** - Add measurement and calculation actions (get distance, area, center point)
- [ ] **Shape queries** - Add shape query actions (find-shapes-by-type, find-overlapping-shapes, etc.)

### Layout & Animation

- [ ] **Advanced layout** - Add advanced layout actions (grid layout, radial layout, flowchart layout)
- [ ] **Animation support** - Add animation/transition support for smooth shape movements

### System Improvements

- [ ] **Undo/redo** - Add explicit undo/redo action support
- [ ] **Error handling** - Improve error handling with try-catch-continue semantics

## 📝 Implementation Notes

### Priority Levels

- **High**: Arrow shapes, enhanced geo types, resize/rotate actions, styling actions
- **Medium**: Group/ungroup, z-order, connect shapes, bulk operations
- **Low**: Animation, advanced layouts, measurement actions

### Technical Considerations

- All new shape types should follow the existing pattern in `xml-types.ts`
- Actions should be added to `handleResponseItem.ts`
- Update XML system prompt to include new capabilities
- Add comprehensive test coverage for new features
- Ensure backward compatibility with existing XML responses

### Dependencies

- Review tldraw's latest shape APIs for any new capabilities
- Consider performance implications of complex operations
- Plan for extensibility to support future tldraw features
