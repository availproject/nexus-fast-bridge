# Agent Guide: nexus-fast-bridge

This file is for future coding agents working in this repository.

## Mission

Keep multi-chain bridge development scalable:
- Fix and ship shared logic once.
- Keep chain wrappers thin.
- Express chain differences through runtime config and feature flags.

## Read First

1. `README.md`
2. `docs/architecture.md`
3. `docs/adding-chains.md`
4. `docs/customization.md`

## Mandatory Docs Gate

Before writing or editing any code, you must read the docs listed above.
This is required for every task, not just onboarding.

If your task touches chain-specific behavior, also read:
- `apps/<slug>/README.md`
- `apps/<slug>/src/runtime.ts`

If docs and code conflict, stop and resolve the mismatch first (update docs and code in the same change where possible).

## Core Rules

- All shared code lives in `packages/fast-bridge-app/src/**`.
- Chain configurations are managed entirely in `packages/fast-bridge-app/src/config/chain-settings.ts`.
- RPC URLs are maintained in `packages/fast-bridge-app/src/config/rpcs.json` (if used, else inside registry).
- Do not use environment variables for chain-specific features.
- Provide all logic via the `useRuntime()` context hook instead of static config imports.

## Chain Workflows

### Add a chain

1. Add a new entry to `CHAIN_REGISTRY` in `packages/fast-bridge-app/src/config/chain-settings.ts`.
2. Add the RPC URL to the configuration or `rpcs.json`.
3. Add any necessary custom features to the chain's `ChainFeatures` object.

### Add new chain-specific behavior

1. Extend `ChainFeatures` in `packages/fast-bridge-app/src/types/runtime.ts`.
2. Add a fallback default value in `defaultChainFeatures`.
3. Consume the new flag in shared components using `useRuntime()`.
4. Set the exact values in the `CHAIN_REGISTRY` entry in `chain-settings.ts`.

## Validation Commands

- Run dev server: `pnpm dev`
- Build production bundle: `pnpm build`
- Preview production build: `pnpm preview`
- Lint code: `pnpm check`
- Format code: `pnpm fix`

## Important Paths

- Chain configs: `packages/fast-bridge-app/src/config/chain-settings.ts`
- Shared app code: `packages/fast-bridge-app/src/`
- Runtime Hook: `packages/fast-bridge-app/src/providers/runtime-context.tsx`

## Anti-Patterns

- Hardcoding chain logic in shared code without feature gates.
- Storing chain data in `.env` variables instead of the registry.
- Relying on Turborepo multi-build logic (the project is now a single SPA).
- Using `import { appConfig } from "@fastbridge/runtime"` instead of `useRuntime()`.


# Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

## Quick Reference

- **Format code**: `pnpm dlx ultracite fix`
- **Check for issues**: `pnpm dlx ultracite check`
- **Diagnose setup**: `pnpm dlx ultracite doctor`

Biome (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

---

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

### Framework-Specific Guidance

**Next.js:**
- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**
- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**
- Use `class` and `for` attributes (not `className` or `htmlFor`)

---

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

## When Biome Can't Help

Biome's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Biome can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

---

Most formatting and common issues are automatically fixed by Biome. Run `pnpm dlx ultracite fix` before committing to ensure compliance.
