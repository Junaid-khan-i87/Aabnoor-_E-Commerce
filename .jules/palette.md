## 2024-06-13 - Missing ARIA Labels on Overlay Close Buttons
**Learning:** Found a recurring pattern where top-level overlays (Search, Wishlist) have icon-only 'X' close buttons that lack `aria-label`s, making them invisible to screen readers despite being a primary interaction point.
**Action:** Always verify icon-only buttons (`<X />`, `<Menu />`, `<ShoppingBag />`, etc.) have explicit `aria-label` attributes for accessibility when reviewing or creating overlay components.
