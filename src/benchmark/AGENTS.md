# Project Rules

## ⚠️ Always Close the API Server When Done

**If you start `api-server.js` (e.g., via `npm run start`, `node api-server.js`, or `npm run dev:server`), you MUST stop it before finishing your task.**

Leave the server running can block ports, consume resources, and interfere with subsequent runs. Always kill any `api-server.js` processes you started:

```bash
pkill -f "node api-server.js"
```

Or more specifically:

```bash
kill $(lsof -ti:3456) 2>/dev/null || true
```

**Rule of thumb:** If you start it, you close it. Verify the port is free before declaring the task complete.

## ⚠️ Always Keep Config Sync Script Updated

**Whenever you modify `configs.json` (add, remove, or change default values), you MUST also update the `DEFAULT_CONFIGS` object and the `deepMerge`/`syncConfigDefaults` function in `api-server.js`.**

The config sync script on startup checks the current `configs.json` against `DEFAULT_CONFIGS` and fills in any missing keys. If the script is not kept in sync, new config keys will silently be ignored and the API server will not populate them.

**Rule of thumb:** Every change to `DEFAULT_CONFIGS` in `api-server.js` must be reflected in the canonical `configs.json`, and vice versa.
