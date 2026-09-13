# app-community#698 authenticated maps evidence

Flow: `manager-general-settings-maps` — `MANAGER` — `/general-settings` → `Mapas`.

The seven PNGs were produced by the authenticated Playwright smoke at `1081cd23054e42aa2c8e09f360272804c54c5a2d`, which is an ancestor of `task-698`. The test uses an authenticated local storage state and redacts credentials; API fixtures are deliberately deterministic and tenant-scoped. The evidence is indexed against delivery commit `f4f0774471c66396d8642423222b28b7594774d0`, based on `origin/master` `7322454ddf8172337764ed92697f4ccfb23cd371`, merged to `dev` as `5bffbc9c2a5fb6f14f60b4be7e79b93cf80d1cae`.

Every relevant step has a 1280x720 PNG: locator off, loading, franchise list with checkbox, selected franchise/pin, deselected/empty map, locator off again, and directory error/contextual help. SHA-256 values are recorded in `evidence/sha256sums.txt`.

The current retry is recorded separately because the Metro web build timed out before tests started. It must be rerun after the build/cache blocker is resolved.
