---
tags: [feature, profiles, configuration, user, admin]
---

# Config Profiles

Config profiles allow saving the current configuration as a named snapshot and restoring it later. This is useful for preserving known-good benchmark setups without manually editing `configs.json`.

## Overview

Profiles store a complete copy of the current configuration (all of `configs.json`) under a user-defined name. Loading a profile overwrites the active configuration.

## Profile Lifecycle

````mermaid
sequenceDiagram
    participant UI as Frontend
    participant API as API Server
    participant DB as Database
    participant FS as ~/.betty/profiles/

    UI->>API: POST /api/profile {name, data}
    API->>DB: REPLACE INTO profiles
    API->>FS: Save JSON fallback
    API-->>UI: Profile saved

    UI->>API: GET /api/profiles
    API->>DB: SELECT * FROM profiles
    DB-->>API: Profile list
    API-->>UI: Profile list

    UI->>API: POST /api/profile/:name/load
    API->>DB: Get profile data
    API->>DB: REPLACE INTO configs
    API->>FS: Save configs.json
    API-->>UI: Profile loaded

    UI->>API: DELETE /api/profile/:name
    API->>DB: DELETE FROM profiles
    API->>FS: Delete JSON file
    API-->>UI: Profile deleted
````

## Save Profile

Save the current configuration as a named profile:

```
POST /api/profile
Authorization: Bearer $TOKEN

{
  "name": "llama-3-8b-optimal",
  "data": { /* full configs.json content */ }
}
```

- **name**: Unique identifier for the profile (alphanumeric, hyphens, underscores)
- **data**: The complete configuration object to save

Profiles are stored in the database (with JSON file fallback in `~/.betty/profiles/`).

## List Profiles

Retrieve all saved profiles:

```
GET /api/profiles
```

Returns an array of profile names with their saved timestamps.

## Get Profile

Retrieve a specific profile's configuration:

```
GET /api/profile/:name
```

Returns the full configuration data for the named profile.

## Load Profile

Replace the current configuration with a saved profile:

```
POST /api/profile/:name/load
Authorization: Bearer $TOKEN
```

This writes the profile's configuration to the database, replacing the active config. The dashboard reflects the new configuration immediately.

## Delete Profile

Remove a saved profile:

```
DELETE /api/profile/:name
Authorization: Bearer $TOKEN
```

## Storage

Profiles are stored in the Betty database. A JSON file fallback exists at `~/.betty/profiles/<name>.json` for each profile.

## Use Cases

- **Preserve optimal settings**: After finding the best parameters, save them as a profile
- **Switch between models**: Keep separate profiles for different models with tuned parameters
- **Rollback**: If a config change breaks the benchmark, load the previous profile
- **Share configurations**: Export profile data to share with team members

## Related

- [[configuration-reference]] — Full config schema
- [[features/service-profiles]] — Service-specific profiles (different scope)
- [[config]] — Config tab documentation
