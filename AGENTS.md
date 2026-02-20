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

- Prefer editing shared code in `packages/fast-bridge-app/src/**`.
- Only use `apps/<slug>/src/runtime.ts` and env/config files for chain-specific behavior.
- Avoid reintroducing duplicated per-chain component trees.
- If you add env keys in `.env.<slug>`, run `pnpm chains:sync`.
- If you move shared source files, update Tailwind `@source` paths in `packages/fast-bridge-app/src/index.css`.
- For runtime-provided image URLs (`appConfig` / `chainFeatures`), use `withBasePath(...)` where needed.

## Chain Workflows

### Add a chain

```bash
pnpm chain:add <slug> --name "Chain Name"
```

Then complete the checklist in `docs/adding-chains.md`.

### Add new chain-specific behavior

1. Extend `ChainFeatures` in `packages/fast-bridge-app/src/types/runtime.ts`.
2. Add default value in `defaultChainFeatures`.
3. Consume flag in shared components/hooks.
4. Set values in each `apps/<slug>/src/runtime.ts`.

## Validation Commands

- Single chain dev: `pnpm --filter @fastbridge/<slug> dev`
- Multi app dev: `pnpm dev:all`
- Single chain build: `pnpm --filter @fastbridge/<slug> build`
- Full build: `pnpm build:all`
- Env export for deploy: `pnpm vercel:env`

## Important Paths

- Chain registry: `chains.config.json`
- Shared app code: `packages/fast-bridge-app/src`
- Chain runtime wrappers: `apps/<slug>/src/runtime.ts`
- Env prep: `scripts/prepare-env.mjs`
- Scaffold: `scripts/chains-add.mjs`
- Sync: `scripts/sync-chains.mjs`
- Root bundle collection: `scripts/collect-chains.mjs`

## Anti-Patterns

- Duplicating the same bug fix in multiple apps.
- Hardcoding chain logic in shared code without feature gates.
- Forgetting to sync env key changes to turbo (`pnpm chains:sync`).
- Introducing root-relative asset paths in runtime-driven UI without base-path normalization.


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
