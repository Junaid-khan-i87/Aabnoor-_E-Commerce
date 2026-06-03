## 2026-06-03 - Form Input Accessibility
**Learning:** The `LoginOverlay` component relies on placeholders and icons for its inputs (Full Name, Email, Password) instead of explicit `<label>` tags. This pattern might be common across the app's modals.
**Action:** Always check modals and overlays for form inputs missing explicit labels or `aria-label` attributes to ensure screen reader compatibility.
