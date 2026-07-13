## UI Orders
- Keep this module focused on store-driven screens, small components, and thin route orchestration.
- Keep CSS in separate files, prefer reusable shared components, and avoid mixing concerns between screens and data loading.
- Use English code comments for business-specific decisions close to the implementation, and use `@agents` only on the first line of each rule comment block; keep AGENTS for reusable UI patterns and operating modes.
- Keep module tests under `src/tests`, and add browser coverage under `src/tests/browser` when the visible flow changes.
