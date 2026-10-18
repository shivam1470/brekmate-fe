# Design implementation

Reference: supplied `BreakMate (1).zip`, a Figma Make React web prototype. No live Figma file key, node screenshots or editable design file was available, so this implementation uses the supplied source as its design reference. Pixel-perfect live-Figma parity is not claimed.

Preserved direction: orange `#FF5C1A`, dark ink `#111827`, cream `#F6F5F1`, rounded cards, local Lato body type and Bodoni Moda display type. Primary action backgrounds are darker for readable white labels. The staff sidebar, menu/category layout, basket, rewards and rider cards adapt the reference to the actual native/browser split.

The supplied customer prototype was a browser mockup. Native screens use React Native Views, Text, Pressables, ScrollViews, Modal, safe areas and OS text inputs; they are not embedded web pages. A test-only React Native Web renderer provides a menu/cart preview for browser checks and is excluded from the staff production build.

Prototype sample ratings, prep-time promises, sales metrics, map movement, revenue, account balances and fake order events are not used as live product data. Product images in the export were remote data-supplied sample URLs, while the backend has no approved product-image field. Current product cards therefore show neutral category/initial placeholders. Add approved photography and backend image metadata before visual signoff; do not present an unrelated photo as the actual dish.

The app icon is a draft Bodoni B monogram on the brand orange, created for this implementation. Final icon and store branding need owner review. Local font files and license texts are included. Device rendering, screen-reader, large-font, keyboard and tablet checks remain release gates.

Desktop staff, mobile rider and native-menu-component browser renders were inspected during implementation using synthetic fixtures. Those previews establish layout checks, not production device validation or live-service integration.
