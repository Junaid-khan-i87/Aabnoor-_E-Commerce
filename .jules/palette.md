## 2026-06-03 - Prevent Double Submission & Add Accessibility to Login
**Learning:** Implementing disabled states paired with loading indicators prevents duplicate async requests, while adding proper ARIA labels and required attributes vastly improves screen reader experience on form submissions.
**Action:** Whenever adding interactive forms, ensure inputs include explicit ARIA labels and buttons reflect an explicit loading or disabled state to avoid duplicate actions.

## 2024-10-24 - Icon-Only Button Accessibility in Chip Bars
**Learning:** In dense UI elements like the "Active filters" chip bar in `ProductGrid.tsx`, small icon-only buttons (like an "x" to remove a filter) are often overlooked for accessibility. Without ARIA labels, screen readers announce them unhelpfully (e.g., "x" or "button").
**Action:** Always verify that every interactive element, especially icon-only utility buttons within larger components, has a descriptive `aria-label` explaining the exact action it performs.
