# ThreeStyle.ai Project Guidelines

> [!NOTE]
> Ta konfiguracja służy dla narzędzia Claude Code w tym repozytorium.
> Pełny raport z sesji oraz plany techniczne znajdują się w: `C:/Develop/_Vault/ThreeStyle/implementation_plan.md` oraz `C:/Develop/_Vault/ThreeStyle/CLAUDE.md`.

## Commands

- Run development server: `npm run dev` (runs on port 3001)
- Build application: `npm run build`
- Type checking: `npx tsc --noEmit`
- Linter: `npm run lint`

## Tech Stack & Architecture

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4 & PostCSS
- **3D Engine**: Three.js, `@react-three/fiber`, `@react-three/drei`
- **State Management**: Zustand (stores located in `src/`)
- **Animation**: GSAP and Framer Motion

## Code Style & Standards

- **TypeScript**: Use strict types; avoid using `any`.
- **Components**: Functional components with hooks. Keep components modular.
- **3D assets**: Place assets in `public/` and use proper loaders. Run `check-gltf.mjs` to validate formats.
- **Error Handling**: Use early returns and secure database operations with Supabase.
- **State/Navigation**: Shared truth for locations/zones resides in `src/3d/navigation/navigationConfig.ts`. Use state machines (FSM) for transitions.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
