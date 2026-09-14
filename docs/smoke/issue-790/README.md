# app-community#790 — staging smoke evidence

## Scope

- `fluxo: client-details-franchise-links`
- `wikiPage`: `https://github.com/ControleOnline/ui-customers/wiki/Client-Details-Franquia-Filial`
- Target: `https://staging.controleonline.com/client-details?clientId=5&contextKey=client`
- Bundle: `task-790@74d9b6a46fd42ce65c0ce5ae2a4f73541381ef47`

## Authenticated run

The staging login completed with HTTP 200 token issuance using the runtime smoke account. The account's authenticated `GET /people/companies/my` response exposed only companies `103054` and `4`; company `5` was not in the permitted company list.

The target checks therefore produced:

- `GET /people/5`: HTTP 403 — outside caller company scope.
- `GET /people?id=5&itemsPerPage=1`: HTTP 200 with `totalItems: 0`.
- UI client-details page: HTTP 200, but the client payload was unavailable and the Franquia/Filial tab did not become visible.
- `flowchartIds`: not asserted because the authenticated account is not authorized for the target company; no flowchart evidence is claimed.

This is a real authenticated failure, not a passing smoke. The missing prerequisite is an authorized staging account or a staging permission grant for `companyId=5`. No credential or token is stored here.

## Required rerun

After the Manager/QA supplies that authorization, rerun the same flow and attach a manifest with `wikiPage` first, `fluxo`/`etapa` entries, enabled `flowchartIds`, screenshots for login/client-details/franchise-tab/action-result, and console/network status.
