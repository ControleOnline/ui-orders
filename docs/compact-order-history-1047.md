# DefaultTable compact pilot — app-community #1047

The compact appearance is opt-in. Order History is the pilot; default consumers retain their existing appearance and actions. Search, controlled filters, accessible card sorting, column visibility, table/cards, numbered pagination and report totals reuse the shared table and order services.

Theme authority remains the main company/domain. Theme tokens override status colors; registered status.color follows; neutral theme text is last. Franchise switching does not override domain authority. No database writes or staging Theme bindings are shipped. Business permissions, payment/cancellation eligibility and request/security filters are preserved.

Header logos send authentication only to the exact API origin; external images use Image without headers. Inline row/card navigation stays blocked during editing/saving, preserving existing store save callbacks. Provider extraction preserves hook order and unrelated bootstrap dependencies, checked by ordered AST fingerprints.

Pre-existing published dependencies are merged by their exact gitHeads rather than importing latest dev:
- ui-default 1.0.276 f0083eb73074f402e81f4e0c832af0bb829c2047; published patch277 1dff39dc32be3320cd4a786baf5621e8a2d3ac00.
- ui-orders 1.3.42 bfe2f013dc9bcaf033ba0db80894f021bfb2fbfb.
- ui-layout 1.0.15 37f1dff3fecf1f08bc8846a319af83c9fcbff502.
- ui-common 1.2.89 4919724c04f3d6e66280db4c9e2a66db65c47cc0; published patch90 e19f14d4afefb89a0700d63753785815364af835.

Patch90 Connections.js had an unterminated searchKey quote. Only that quote is repaired to make the retained published fixes compilable. Existing DefaultTable tests are split without discarding cases; fixtures now model reactive stores, company-scoped preferences, route context and CSS sticky positioning. Legacy toolbar tests isolate the inactive compact branch; dedicated compact suites cover its controls.

Validation: 135 assertions in 22 suites, 591 React files parsed, and isolated Expo web export (5492 modules). These are source/composition checks; authenticated staging validation remains a separate promotion gate. Isolation used source-module copies; final released-package pins must be verified again by release validation.

From app-community with installed release packages:
```sh
node scripts/validate-compact-sources.cjs
node node_modules/jest/bin/jest.js --config jest.compact.config.cjs --maxWorkers=2 --testPathPattern='compact|Compact|headerLogoProtocol|DefaultCompanyHeaderLogo|useDefaultTableStoreSync|providerEffects|DefaultProviderAuthority|deviceConfigBootstrap|mercadoLivreIntegrationHelpers|DefaultTable\.(group[123]\.)?test.js|OrderHistoryPage.test.js|DefaultTableCards.layout|DefaultTableToolbar.waiter'
```

For isolated sibling source clones, set CONTROLEONLINE_MODULES_ROOT to their common directory. The committed configuration has no machine-specific absolute path. Published versions planned: ui-default1.0.278, ui-orders1.3.43, ui-layout1.0.16, ui-common1.2.91.
