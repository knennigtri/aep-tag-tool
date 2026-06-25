<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Auth config fixtures](#auth-config-fixtures)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Auth config fixtures

Place Adobe Developer Console **project/workspace JSON** downloads here for local runs:

```bash
aep-tag-tool -c tests/auths/your-project-production.json --export PR...
```

Use the same file you get from **Project overview → Download** in [Adobe Developer Console](https://developer.adobe.com/console). The tool reads `project.org.ims_org_id` and `project.workspace.details.credentials[].oauth_server_to_server`.

- `auth-workspace.example.json` — sanitized structure for tests (safe to commit).
- Real credential files — keep local only; do not commit secrets.
