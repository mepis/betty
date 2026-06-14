# Project Rules

## ⚠️ Always Keep Config Sync Script Updated

**Whenever you modify `configs.json` (add, remove, or change default values), you MUST also update the `DEFAULT_CONFIGS` object and the `deepMerge`/`syncConfigDefaults` function in `api-server.js`.**

The config sync script on startup checks the current `configs.json` against `DEFAULT_CONFIGS` and fills in any missing keys. If the script is not kept in sync, new config keys will silently be ignored and the API server will not populate them.

**Rule of thumb:** Every change to `DEFAULT_CONFIGS` in `api-server.js` must be reflected in the canonical `configs.json`, and vice versa.
