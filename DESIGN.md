# Design System Strategy: The Precision Vault

## 1. Overview & Creative North Star
This design system is built upon the "Precision Vault" concept. We are moving away from the cold, clinical aesthetic typical of security software and toward a "German Engineering meets 1Password" philosophy. The goal is to balance the uncompromising structural integrity of a high-end physical safe with the warmth and approachability of a premium editorial layout.

**The Creative North Star: "Human-Centric Security"**
We do not use generic grids. Instead, we lean into intentional asymmetry and generous whitespace to create a sense of calm and confidence. The system communicates "Trust" through tonal depth and typographic authority rather than heavy-handed borders or aggressive dark modes. It is a signature experience that feels crafted, not compiled.

---

## 2. Colors & Surface Philosophy
The palette is rooted in a sophisticated interplay between Charcoal (`#1C1917`), Warm Cream (`#FFFBF5`), and a singular, authoritative Golden Amber (`#F59E0B`).

### The "No-Line" Rule
To achieve a premium feel, designers are prohibited from using 1px solid borders for sectioning. Boundaries must be defined solely through background color shifts or subtle tonal transitions.
- **Surface Transitions:** A sidebar in `surface-container-low` should sit against a `background` without a divider line.
- **Nesting:** Importance is conveyed through height. Use `surface-container-lowest` for the most critical interactive cards, placed upon a `surface-container` background to create a natural, "physical" lift.

### Signature Textures & Depth
While the brand avoids heavy glassmorphism, we utilize "Atmospheric Depth."
- **Subtle Gradients:** Main CTAs may use a vertical linear gradient from `primary` (#855300) to `primary_container` (#F59E0B) to provide a "forged" metallic soul.
- **Layering:** Treat the UI as stacked sheets of fine paper. Each inner container should use a slightly higher or lower tier (from Lowest to Highest) to define its role in the hierarchy.

---

### 3. Typography: The Editorial Authority
We utilize a dual-font system to bridge the gap between "Professional Engineering" and "Premium Utility."

- **Ubuntu (Headers/Display):** Used for brand-level moments and headlines. It is clean, modern, and carries a distinct European engineering "voice."
- **Manrope/Inter (UI/Functional):** Used for the Typography Scale (from `display-lg` to `label-sm`). Manrope provides the technical precision required for encryption keys and file paths, while Inter is reserved for high-density labels.

**Typography Hierarchy:**
- **Display-LG (3.5rem):** Reserved for empty states or "File Decrypted" success moments.
- **Title-MD (1.125rem):** The workhorse for card titles and section headers.
- **Label-MD (0.75rem / Inter):** Used for metadata, file sizes, and encryption algorithms.

---

## 4. Elevation & Depth: Tonal Layering
In this system, depth is a function of light and color, not structure.

- **The Layering Principle:** Place a `surface-container-lowest` card (#FFFFFF) onto a `surface-container-low` (#F7F3ED) background. The contrast is enough to define the shape without "cluttering" the user's eye with lines.
- **Ambient Shadows:** When an element must float (e.g., a modal or a primary action button), use extra-diffused shadows.
- **Blur:** 20px - 40px.
- **Opacity:** 4% - 6%.
- **Tint:** Shadows must be tinted with `on-surface` (#1C1C18), never pure black.
- **The Ghost Border:** If a border is required for accessibility, use the `outline_variant` (#D8C3AD) at 20% opacity. This creates a "suggestion" of a boundary that disappears into the background.

---

## 5. Components

### Titlebar & Window Controls
- **macOS Traffic Lights:** Positioned with a `spacing-4` (1.4rem) left-inset.
- **Windows Controls:** Custom-rendered in `on_surface` color, using a `surface_container_high` hover state.
- **Charcoal Titlebar:** The titlebar uses `inverse_surface` (#31302D) to anchor the application, providing a heavy "lid" to the secure vault.

### Buttons & Chips
- **Primary Button:** Pill-shaped (`rounded-full`) using `primary_container` (#F59E0B) and `on_primary_container` (#613B00).
- **Secondary/Tertiary:** No background. Use a `title-sm` font weight with an amber `on_surface_variant` icon.
- **Chips:** For indicating "AES-256" or "Locked" status. Use `surface_container_highest` with `label-sm` typography.

### Input Fields & Encryption Wells
- **The "Vault" Input:** Text inputs do not have 4-sided borders. Use a `surface_container_low` background with a 2px `primary` bottom-border that activates on focus.
- **Drop Zones:** Large, generous areas using `surface_container_lowest` and a dashed `outline_variant` (20% opacity).

### Cards & Lists
- **Prohibition of Dividers:** Never use a horizontal line to separate files in a list. Instead, use a `1.4rem` (spacing-4) vertical gap or alternating subtle shifts between `surface` and `surface_container_low`.

---

## 6. Do’s and Don’ts

### Do:
- **Use Intentional Asymmetry:** Align the primary "Lock" icon slightly off-center to create an editorial, high-end look.
- **Embrace White Space:** Use `spacing-8` (2.75rem) or `spacing-10` (3.5rem) between major sections to let the "German Engineering" breathe.
- **Tint Everything:** Ensure all neutrals have a hint of the warm cream or amber to avoid a "default" digital feel.

### Don’t:
- **No 100% Black/White:** Use the Charcoal (#1C1C18) and Cream (#FFFBF5) tokens instead. Pure black/white is too harsh for this "Premium Utility" aesthetic.
- **No Hard Borders:** If you feel the urge to draw a line, try using a slightly different shade of cream first.
- **No Standard Shadows:** Avoid "Drop Shadow" defaults. If it doesn't look like ambient light hitting a piece of paper, it’s too heavy.