# DESIGN-06: shadcn/ui Component Integration - Foundation Setup

Date created: 2025-10-05
Date last updated: 2025-01-16
Date completed: -

## Status

- [x] Not Started
- [ ] In Progress
- [ ] Blocked
- [ ] Done

## Priority

- [x] P0 (MVP Required - FOUNDATIONAL)

## Category

- [ ] Authentication
- [ ] Workspaces
- [ ] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [ ] API
- [ ] Database
- [ ] Testing
- [ ] Infrastructure

## Description

**CRITICAL FOUNDATION WORK - MUST BE COMPLETED BEFORE ANY NEW UI DEVELOPMENT**

This ticket establishes the foundation for all future UI work by conducting a comprehensive inventory of UI components throughout the application and creating separate implementation tickets for each shadcn/ui component integration. This is not a single implementation ticket but rather the planning and setup phase that will generate multiple focused implementation tickets.

The goal is to systematically identify every location where shadcn/ui components could replace existing UI elements, organize these opportunities by component type, and create individual tickets for each component integration with specific file lists.

## Acceptance Criteria

### Phase 1: Component Inventory & Analysis
- [ ] Complete audit of all frontend files to identify UI component opportunities
- [ ] Catalog all buttons, inputs, forms, modals, alerts, and other UI elements
- [ ] Map each UI element to its appropriate shadcn/ui component
- [ ] Document file paths and line numbers for each opportunity
- [ ] Organize findings by shadcn component type (Button, Input, Form, Dialog, etc.)
- [ ] Prioritize components by usage frequency and foundational importance

### Phase 2: Implementation Planning
- [ ] Create separate tickets for each shadcn component integration
- [ ] Each ticket includes specific file list where component will be used
- [ ] Define implementation order based on dependencies and complexity
- [ ] Set up shadcn/ui infrastructure (init, config, theme setup)

### Phase 3: Documentation & Guidelines
- [ ] Create frontend development guide (markdown file)
- [ ] Document component usage patterns and best practices
- [ ] Establish coding standards for shadcn integration
- [ ] Create component implementation templates

## Technical Details

### Inventory Scope

**Files to Audit:**
- All `.tsx` files in `/apps/simple-dotcom/simple-client/src/`
- Focus on pages, components, and UI elements
- Include both existing and any work-in-progress UI
- **Custom components** - Identify inline/embedded UI components that could be extracted into reusable shadcn components

**UI Elements to Identify:**
1. **Buttons** - All `<button>` elements, click handlers, submit buttons
2. **Inputs** - Text, email, password, search inputs
3. **Forms** - Form wrappers, validation, submission handling
4. **Modals/Dialogs** - Pop-ups, confirmations, overlays
5. **Alerts** - Error messages, success notifications, warnings
6. **Cards** - Content containers, panels, sections
7. **Labels** - Form labels, descriptive text
8. **Loading States** - Spinners, skeletons, "Loading..." text
9. **Separators** - Dividers, borders, visual breaks
10. **Badges** - Status indicators, tags, chips

### Expected Component Opportunities

Based on initial assessment, expect to find:

**High-Priority Components (Most Usage):**
- Button: ~15-20 instances across auth, dashboard, profile
- Input: ~10-12 instances in forms
- Form: ~5-6 form containers
- Dialog: ~4-5 modals (workspace operations)

**Medium-Priority Components:**
- Alert: ~8-10 error/success messages
- Card: ~3-5 content containers
- Label: ~10-15 form labels

**Enhancement Components:**
- Toast: Potential upgrade for notifications
- Skeleton: Loading state improvements
- Badge: Status indicators

### Implementation Strategy

Each shadcn component will get its own ticket following this pattern:

**DESIGN-06-A: Integrate Button Component**
- List all button locations (auth pages, dashboard, modals)
- Specify variants needed (default, destructive, outline, ghost)
- Include test preservation requirements

**DESIGN-06-B: Integrate Input Component**
- List all input locations (forms across pages)
- Include validation integration
- Specify accessibility requirements

**DESIGN-06-C: Integrate Form Component**
- React Hook Form integration
- Form validation patterns
- Error handling consistency

[Continue pattern for each component...]

### Frontend Development Guide Requirements

Create comprehensive documentation covering:

1. **Architecture Decisions**
   - Why shadcn/ui was chosen
   - Component hierarchy and organization
   - State management patterns

2. **Development Standards**
   - Component usage guidelines
   - Styling conventions
   - Accessibility requirements

3. **Implementation Patterns**
   - Form handling with React Hook Form
   - Modal/dialog patterns
   - Error handling and validation
   - Loading states and user feedback

4. **Code Examples**
   - Before/after code samples
   - Common component patterns
   - Integration with existing systems

5. **Testing Guidelines**
   - Test preservation strategies
   - New testing patterns for shadcn components
   - Accessibility testing requirements

## Dependencies

- Current Tailwind configuration
- Existing React/Next.js setup
- No blocking dependencies - this sets foundation for other work

**BLOCKS:** All new UI development should wait for this foundation work

## Testing Requirements

- [ ] Inventory verification - Ensure all UI opportunities identified
- [ ] Documentation review - Frontend guide completeness
- [ ] Ticket creation validation - Each component ticket properly scoped

## Related Documentation

- shadcn/ui docs: https://ui.shadcn.com/docs/components
- Product spec: See product.md - UI/UX sections
- Will create: `FRONTEND_GUIDE.md` in project root

## Deliverables

### 1. Component Inventory Document
`SHADCN_COMPONENT_INVENTORY.md` containing:
- Complete list of UI opportunities by component type
- File paths and line numbers for each instance
- Priority ranking and implementation complexity
- Component dependency mapping

### 2. Implementation Tickets
Separate tickets for each component:
- DESIGN-06-A: Button Component Integration
- DESIGN-06-B: Input Component Integration  
- DESIGN-06-C: Form Component Integration
- DESIGN-06-D: Dialog Component Integration
- DESIGN-06-E: Alert Component Integration
- [Additional tickets as identified in inventory]

### 3. Frontend Development Guide
`FRONTEND_GUIDE.md` containing:
- Architecture overview and decisions
- Component usage standards
- Implementation patterns and examples
- Testing and accessibility guidelines
- Code style and conventions

### 4. shadcn/ui Infrastructure Setup
- Initial shadcn configuration
- Theme integration with existing design system (Tailwind-based)
- Component installation scripts/commands
- Create `/src/components/ui/` folder structure for reusable shadcn components

### 5. Milestone Integration
- Add UI Foundation work as **Milestone 2.5** in `milestones.md`
- Must be completed before Milestone 3 begins
- Establishes foundation for all future UI development

## Timeline & Approach

### Week 1: Discovery & Inventory
- Day 1-2: Complete file audit and UI element identification
- Day 3: Organize findings and create component mapping
- Day 4-5: Write inventory document and prioritize components

### Week 2: Planning & Setup
- Day 1-2: Create individual implementation tickets
- Day 3-4: Set up shadcn/ui infrastructure
- Day 5: Begin frontend development guide

### Week 3: Documentation & Handoff
- Day 1-3: Complete frontend development guide
- Day 4-5: Review, validate, and prepare for implementation phase

**CRITICAL:** No new UI development should begin until this foundation work is complete and implementation tickets are ready for development.

**DELIVERABLE STRUCTURE:** End result should include a `/src/components/ui/` folder containing reusable Button, Form, Input, and other foundational UI components that will be expanded over time with larger abstractions.

## Estimated Complexity

- [ ] Small (< 1 day)
- [ ] Medium (1-3 days)
- [ ] Large (3-5 days)
- [x] Extra Large (> 5 days) - Foundation work for entire UI system

## Worklog

[Track progress, decisions, and blockers as work proceeds. Each entry should include date and brief description.]

**2025-01-16:** Updated ticket to reflect foundational priority and multi-phase approach. This work must be completed before any new UI development begins.

## Resolved Questions

1. **Should we audit any existing component libraries or custom components already in use?**
   - YES - Focus on custom components defined inline within pages/components
   - These inline UI elements are prime opportunities for shadcn component extraction
   - Likely no separate component libraries, but many custom button/input/form patterns

2. **Do we want to establish a component storybook or documentation site alongside the integration?**
   - NO - Not needed at this time

3. **Should we include design tokens/theme documentation as part of the frontend guide?**
   - YES - Include design tokens documentation with Tailwind as the foundation

4. **How do we want to handle migration of existing custom styles that don't have shadcn equivalents?**
   - PREFER SHADCN DEFAULTS - Use shadcn default styling rather than migrating existing custom choices
   - Focus on consistency and established patterns over preserving current styling decisions

5. **Should we consider creating a migration timeline/roadmap for the implementation tickets?**
   - YES - Create **Milestone 2.5** in `milestones.md` for UI Foundation work
   - Must be completed before Milestone 3 begins
   - Will establish the foundation UI component system for future development