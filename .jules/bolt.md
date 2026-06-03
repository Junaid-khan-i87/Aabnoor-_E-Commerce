## 2026-06-03 - [Expensive Recalculations in Render]
**Learning:** Found that `ProductGrid.tsx` re-renders frequently due to context changes (like Cart toggles), and because filtering and sorting were calculated synchronously during every render, they caused unnecessary O(N) and O(N log N) work on the main thread.
**Action:** Always verify if complex filtering or sorting mechanisms within components that use multiple Contexts are correctly memoized. Use `useMemo` specifically when sorting or filtering large lists.
