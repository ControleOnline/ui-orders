# app-community#698 authenticated maps evidence

Flow: `manager-general-settings-maps` — `MANAGER` — `/general-settings` → `Mapas`.

The seven PNGs were produced by the authenticated Playwright smoke at `1081cd23054e42aa2c8e09f360272804c54c5a2d`, which is an ancestor of `task-698`. The test uses an authenticated local storage state and redacts credentials; API fixtures are deliberately deterministic and tenant-scoped.

The current retry is recorded separately because the Metro web build timed out before tests started. It must be rerun after the build/cache blocker is resolved.
