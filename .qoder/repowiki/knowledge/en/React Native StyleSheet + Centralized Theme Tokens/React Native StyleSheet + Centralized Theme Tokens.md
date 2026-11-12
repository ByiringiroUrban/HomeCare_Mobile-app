---
kind: frontend_style
name: React Native StyleSheet + Centralized Theme Tokens
category: frontend_style
scope:
    - '**'
source_files:
    - src/constants/theme.ts
    - src/components/ui/Button.tsx
    - src/components/ui/InputField.tsx
    - src/components/ui/Card.tsx
    - src/components/ui/Badge.tsx
    - src/components/ui/DoctorCard.tsx
    - src/components/ui/EmergencyBanner.tsx
    - src/components/ui/VisitCard.tsx
    - package.json
---

## Approach

The HomeCare mobile app is a React Native / Expo project that styles its UI exclusively with **React Native's built-in `StyleSheet` API** and a single centralized design-token file. There is no CSS, SCSS, Tailwind, styled-components, or third-party UI kit in the frontend — styling lives inside TypeScript component files.

## Key Files

- `src/constants/theme.ts` — the sole source of truth for colors, typography, spacing, border radius, and shadows (the "design tokens").
- `src/components/ui/` — shared primitive components (`Button.tsx`, `InputField.tsx`, `Card.tsx`, `Badge.tsx`, `DoctorCard.tsx`, `EmergencyBanner.tsx`, `VisitCard.tsx`) that compose the token system into reusable UI.
- `src/app/(auth)/*`, `src/app/(patient)/*`, `src/app/(doctor)/*`, `src/app/(admin)/*` — page-level screens that import from `components/ui` and `constants/theme` rather than defining their own palettes.
- `package.json` — confirms the stack: `expo`, `react-native`, `expo-router`, `@expo/vector-icons`, `lucide-react-native`; no CSS framework dependency.

## Architecture & Conventions

1. **Centralized theme tokens.** `THEME` in `src/constants/theme.ts` exposes four token categories:
   - `colors`: primary/accent/success/warning/error/info palette plus neutral background/surface/border/text scales and status-badge variants.
   - `typography.fontFamilies`: all set to `'System'` (no custom fonts).
   - `typography.sizes`: xs through display (11–28px).
   - `spacing`: xs through xxl (4–32px).
   - `borderRadius`: sm/xl/full plus named radii.
   - `shadows.card` and `shadows.floating`: cross-platform `shadowColor`/`shadowOffset`/`shadowOpacity`/`shadowRadius` plus `elevation`.

2. **Components consume tokens, never hardcode values.** Every style object in `components/ui/*` references `THEME.colors.*`, `THEME.spacing.*`, `THEME.borderRadius.*`, `THEME.typography.sizes.*`, or `THEME.shadows.*`. For example, `Button.tsx` uses `THEME.colors.primary`, `THEME.colors.textWhite`, `THEME.borderRadius.md`, and `THEME.typography.sizes.sm/base/md` across its variant/size style classes; `Card.tsx` composes `THEME.shadows.card` via spread.

3. **Variant-driven styling via dynamic style keys.** Components build style arrays by concatenating string-keyed style objects, e.g. `styles[variant]`, `styles[`size_${size}`]`, `styles[`text_${variant}`]`, `styles[`textSize_${size}`]`. This keeps variant/size combinations declarative without runtime branching.

4. **No responsive breakpoints or media queries.** The codebase does not use `Dimensions`, `useWindowDimensions`, or any breakpoint logic — layout is adaptive only through flexbox defaults of React Native.

5. **Icons come from two sources:** `@expo/vector-icons` (Ionicons, used in `InputField.tsx`) and `lucide-react-native` (used elsewhere in the app). No icon font or SVG sprites are defined locally.

6. **Country-specific theming is data-driven, not visual.** `COUNTRY_CONFIGS` and `APP_CONFIG` in `theme.ts` parameterize locale content (phone prefixes, emergency numbers, regulatory bodies) but do not swap color palettes per country.

## Conventions & Constraints

- **All visual constants flow through `THEME`.** Hardcoded hex colors, font sizes, spacing values, and shadow definitions are absent from component files; they are imported from `../../constants/theme`. This is an observed convention enforced by the component architecture (components reference `THEME.*` directly).
- **Typography uses the platform default font family** (`'System'` for regular/medium/bold), so there is no custom font loading or web font strategy.
- **Shadows are defined once** under `THEME.shadows` and composed into components via spread (`...THEME.shadows.card`); components do not define their own shadow objects.
- **Component props expose style overrides** (`style?: ViewStyle`, `textStyle?: TextStyle`, `containerStyle?: ViewStyle`) so consumers can layer on top of the base token-driven styles without breaking the token contract.
- **No CSS/SCSS/Tailwind exists in the repo.** Styling is entirely within `.tsx` files using `StyleSheet.create` from `react-native`.
- **Design tokens mirror Tailwind class names as comments** (e.g. `// Tailwind teal-700`, `// slate-900`) in `theme.ts`, indicating the palette was chosen to align with Tailwind semantics even though Tailwind is not installed.