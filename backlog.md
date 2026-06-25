<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Backlog](#backlog)
  - [Generate settings YAML from export (curated profiles)](#generate-settings-yaml-from-export-curated-profiles)
    - [Approach](#approach)
      - [Extension profile (initial)](#extension-profile-initial)
      - [Data elements](#data-elements)
      - [`settings-vars` / templating](#settings-vars--templating)
    - [Proposed CLI](#proposed-cli)
    - [Implementation notes](#implementation-notes)
    - [Out of scope (for later)](#out-of-scope-for-later)
    - [Workflow for new org](#workflow-for-new-org)
    - [References](#references)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Backlog

## Generate settings YAML from export (curated profiles)

**Goal:** After exporting a tag property, auto-build a `*-settings.yml` that matches what `importObjectUtil.updateSettings()` expects, so each target IMS org is mostly “copy template → edit `settings-vars` and org-specific literals → validate → import.”

### Approach

Use **curated profiles** (Option 1): a small map per extension / data-element name listing settings keys that are usually org-specific. Do not dump every leaf key from every `attributes.settings` blob.

#### Extension profile (initial)

| Component name | Keys to extract |
|----------------|-----------------|
| `adobe-mcid` | `orgId` |
| `adobe-analytics` | `orgId`, `staging`, `production`, `development`, `company`, `trackingServer`, `partner` |
| `adobe-target` | `imsOrgId`, `clientCode`, `serverDomain` |
| `adobe-target-v2` | `imsOrgId`, `clientCode`, `serverDomain` (nested under `targetSettings`; OK via recursive key replace) |

#### Data elements

- Include components present in export whose settings use a `value` field (e.g. cookie domain / `z_*` patterns).
- Optional flag later: `--include-data-elements z_` or match list from export.

#### `settings-vars` / templating

- Detect shared IMS org ID (`*@AdobeOrg`) across extracted `orgId` / `imsOrgId` values.
- Emit `settings-vars.orgId` and use `{{ orgId }}` for those slots when `--templatize-org` is set (optional follow-up).

### Proposed CLI

```bash
# No auth required
aep-tag-tool -i ./export.json --generate-settings -o ./tests/vlab2-settings.generated.yml

# Optional
aep-tag-tool -i ./export.json --generate-settings --templatize-org -o ./settings.yml
```

Round-trip with existing tooling:

```bash
aep-tag-tool -i ./export.json -s ./settings.yml --validate-settings
```

### Implementation notes

- Add `generateSettingsFromExport(importObj, options)` in `importObjectUtil.js` (mirror of `applySettingsDocument` / `validateSettings`).
- Wire `--generate-settings` in `cli.js` (similar to `--validate-settings`; requires `-i`, optional `-o`).
- Use `js-yaml` for output; keep canonical section name `settings-vars`.
- Only emit blocks for extensions/data elements that exist in the export.
- Document in `examples/import-settings-yaml/README.md` and `-h import`.

### Out of scope (for later)

- Full dump of all settings keys (too noisy, poor template).
- Rules section in settings YAML (not supported by import today).
- Heuristic-only detection without profiles (fragile across extension versions).

### Workflow for new org

1. Export from source property (or use existing export JSON).
2. `--generate-settings` → org-specific template YAML.
3. Copy to e.g. `tests/vlab7-settings.yml`; update `settings-vars` and Target/Analytics/AEM-specific values.
4. `--validate-settings` against export JSON used for import.
5. Import with `-c` auth for target org + `-i` export + `-s` settings file.

### References

- `importObjectUtil.js`: `applySettingsDocument`, `validateSettings`, `replaceSettings`
- Example hand-maintained files: `tests/vlab2-settings.yml`, `tests/vlab7-settings.yml`
- `examples/import-settings-yaml/wknd-tag-settings-template.yml`
