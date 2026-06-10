## 2026-06-03 - Prevent Double Submission & Add Accessibility to Login
**Learning:** Implementing disabled states paired with loading indicators prevents duplicate async requests, while adding proper ARIA labels and required attributes vastly improves screen reader experience on form submissions.
**Action:** Whenever adding interactive forms, ensure inputs include explicit ARIA labels and buttons reflect an explicit loading or disabled state to avoid duplicate actions.

## 2024-10-24 - Icon-Only Button Accessibility in Chip Bars
**Learning:** In dense UI elements like the "Active filters" chip bar in `ProductGrid.tsx`, small icon-only buttons (like an "x" to remove a filter) are often overlooked for accessibility. Without ARIA labels, screen readers announce them unhelpfully (e.g., "x" or "button").
**Action:** Always verify that every interactive element, especially icon-only utility buttons within larger components, has a descriptive `aria-label` explaining the exact action it performs.
## 2024-06-05 - Add visual loading state to Auth buttons
**Learning:** Adding visual loading spinners (like `Loader2` with `animate-spin`) next to "Please wait..." text provides clear, immediate feedback for asynchronous operations, preventing user confusion or multiple clicks.
**Action:** Always include both disabled state and a visual indicator (like a spinner) in addition to text changes when submitting forms or performing async actions.
## 2024-06-10 - Enhancing Password Input Accessibility
**Learning:** Added a password visibility toggle using the "Eye" and "EyeOff" icons from lucide-react, significantly improving UX and accessibility for mobile and desktop users. This simple toggle allows users to visually verify their typed credentials instead of struggling with hidden characters, reducing failed login attempts. Also ensured that the visibility toggle is excluded when OTP code input is active (isRegister && otpSent), preventing confusing behavior.
**Action:** When working on authentication or password-related inputs in the future, always include a visibility toggle along with appropriate screen-reader labels (`aria-label="Show password"` / `"Hide password"`) and manage input padding (`pr-10`) to prevent text overlapping the toggle icon.
