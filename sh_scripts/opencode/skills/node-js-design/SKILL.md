---
name: node-js-design
description: "Use when designing or planning any projects written in Node.js.
  Provides:
  - best practices
  - archetecture design
  - document design
  - backend design"
---

# Node.js Directory Structure Guide for AI Agents

## Decision Tree: Which Structure to Recommend

```
Is the project a monorepo with multiple services/packages?
├── YES → Monorepo with Workspaces (see Section 4)
└── NO → Continue...

Is the project using NestJS?
├── YES → NestJS Module-per-Feature (see Section 3)
└── NO → Continue...

How many developers on the team?
├── 1 (solo) → Simple Layered (see Section 1)
├── 2-5 → Feature-Based (see Section 2)
└── 5+ → Feature-Based + Shared Infrastructure (see Section 2)

Is the project >50K LoC or expecting rapid growth?
├── YES → Feature-Based + consider Hexagonal (see Section 5)
└── NO → Feature-Based is sufficient
```

---

## 1. Simple Layered Structure (Solo Dev / Small Projects)

**Use when:** Solo developer, <10K LoC, learning project, prototype, or simple API.

```
project-root/
├── src/
│   ├── controllers/        # HTTP request handlers (thin)
│   ├── services/           # Business logic
│   ├── models/             # Database schemas (Mongoose/Sequelize)
│   ├── routes/             # API route definitions
│   ├── middleware/         # Auth, error handling, logging
│   ├── utils/              # Shared helpers
│   ├── config/             # DB, env, logger config
│   └── index.js            # Express app setup
├── server.js               # Server entry (starts listening)
├── tests/                  # Test files (mirrors src/)
├── .env                    # Environment variables (gitignored)
├── .gitignore
├── package.json
└── README.md
```

**Rules:**

- Controllers are thin: validate input → call service → return response
- Services contain all business logic
- Models define schemas only
- Never pass `req`/`res` objects to services
- Use `src/` as the source root, keep project root clean

---

## 2. Feature-Based Structure (Recommended for Most Projects)

**Use when:** 2-5 developers, 10K-50K LoC, multiple business features, growing project.

This is the **default recommendation** for new Node.js projects in 2024-2025.

```
project-root/
├── src/
│   ├── features/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.model.ts
│   │   │   ├── auth.route.ts
│   │   │   └── index.ts              # Barrel export
│   │   ├── users/
│   │   │   ├── user.controller.ts
│   │   │   ├── user.service.ts
│   │   │   ├── user.model.ts
│   │   │   ├── user.route.ts
│   │   │   └── index.ts
│   │   └── products/
│   │       ├── product.controller.ts
│   │       ├── product.service.ts
│   │       ├── product.model.ts
│   │       ├── product.route.ts
│   │       └── index.ts
│   ├── shared/                       # Cross-cutting concerns
│   │   ├── middleware/               # Auth middleware, error handlers
│   │   ├── config/                   # Environment configuration
│   │   ├── utils/                    # Shared utility functions
│   │   └── types/                    # Shared TypeScript types
│   ├── api/                          # API versioning
│   │   └── v1/
│   └── index.ts                      # App setup (Express app instance)
├── server.ts                         # Server entry (imports index.ts, starts listening)
├── tests/                            # Test files (mirrors src/)
├── scripts/                          # Dev/ops scripts (migrations, seeders)
├── .env                              # Environment variables (gitignored)
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

**Rules:**

- Each feature folder is self-contained: controller, service, model, route, barrel export
- Barrel file (`index.ts`) exports all public exports from the feature
- Shared infrastructure goes in `src/shared/`
- Split `server.ts` (starts server) from `index.ts` (app setup) for testability
- Keep `server.ts` minimal — only import app, connect DB, listen on port
- New feature = new folder under `features/` + one line in `index.ts` to register routes

**Adding a new feature:**

1. Create `src/features/orders/`
2. Create `orders.controller.ts`, `orders.service.ts`, `orders.model.ts`, `orders.route.ts`, `index.ts`
3. Import and register routes in `src/index.ts`

---

## 3. NestJS Module-per-Feature Structure

**Use when:** Project uses NestJS framework. NestJS enforces this pattern via its CLI.

```
project-root/
├── src/
│   ├── app.module.ts                 # Root module (keep this)
│   ├── common/                       # Global Nest modules
│   │   ├── constants/
│   │   ├── controllers/
│   │   ├── decorators/
│   │   ├── dto/
│   │   ├── filters/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── interfaces/
│   │   ├── middleware/
│   │   ├── pipes/
│   │   └── providers/
│   ├── auth/                         # Auth module (generated via Nest CLI)
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── dto/
│   │   ├── guards/
│   │   └── strategies/
│   ├── users/                        # Users module
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── dto/
│   └── shared/                       # Shared modules used across features
│       ├── database/
│       └── logger/
├── test/                             # Jest testing
├── typings/                          # Global type definitions
├── public/                           # Static files
├── bin/                              # Custom CLI tasks
├── dist/                             # Build output
├── .env
├── nest-cli.json
├── package.json
└── tsconfig.json
```

**Rules:**

- Use Nest CLI: `nest g module <name>`, `nest g controller <name>`, `nest g service <name>`
- Each business domain = one module folder
- Use `--flat` flag for small features to avoid nested folders
- Controllers should be thin — delegate to services
- DTOs in `dto/` subfolder within each module
- Guards, interceptors, pipes, filters in their subfolders
- Barrel files recommended for imports: `import { UserService } from '../common'`
- Avoid barrel files in serverless environments (bundle size impact)
- Use TypeScript path aliases for clean imports (configure in `tsconfig.json`)

**File naming convention:**

```
PascalCase class → kebab-case.filename.ts
FooController  → foo.controller.ts
BarQueryDto    → bar-query.dto.ts
FooBarNaming   → foo-bar.naming.ts
```

---

## 4. Monorepo with Workspaces

**Use when:** Multiple microservices, shared libraries, or multiple apps in one repo.

```
monorepo-root/
├── packages/
│   ├── api/                          # Main REST/GraphQL API
│   │   ├── src/
│   │   │   ├── features/             # Feature-based structure inside
│   │   │   ├── shared/
│   │   │   └── index.ts
│   │   ├── package.json              # { "name": "@myorg/api" }
│   │   ├── tsconfig.json
│   │   └── nest-cli.json             # if NestJS
│   ├── workers/                      # Background job processors
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── shared/                       # Shared utilities & types
│       ├── src/
│       │   ├── logger/
│       │   │   └── index.ts
│       │   ├── config/
│       │   │   └── index.ts
│       │   └── types/
│       │       └── index.ts
│       ├── package.json              # Has "exports" field
│       └── tsconfig.json
├── package.json                      # Workspace root
│   {
│     "name": "monorepo-root",
│     "private": true,
│     "workspaces": ["packages/*"]
│   }
├── turbo.json                        # or nx.json
├── tsconfig.base.json                # Shared TS config across packages
├── .gitignore
└── .env
```

**Rules:**

- Each package has its own `package.json` with explicit `exports` field
- Shared packages define public API via `exports` — consumers cannot import internals
- Root `package.json` defines workspace boundaries
- Use Turborepo or NX for task orchestration (build, test, lint)
- Shared `tsconfig.base.json` defines common paths across all packages
- Use workspace protocol for inter-package deps: `"@myorg/shared": "workspace:*"`
- Keep packages independently deployable

---

## 5. Hexagonal Architecture (Complex Enterprise)

**Use when:** Strict testability requirements, evolving infrastructure, 50K+ LoC, or team wants framework independence.

```
project-root/
├── src/
│   ├── adapter/
│   │   ├── presentation/             # Inbound adapters
│   │   │   └── web/                  # REST controllers, GraphQL resolvers
│   │   │       └── dto/              # Request/response DTOs
│   │   └── data_access/              # Outbound adapters
│   │       └── sql/                  # Repository implementations
│   │           └── model/            # DB model mappings
│   ├── application/
│   │   └── port/
│   │       ├── in/                   # Application input interfaces
│   │       └── out/                  # Application output interfaces
│   │           ├── exception/
│   │           └── service/
│   └── domain/
│       ├── entity/                   # Entities and aggregates
│       ├── value/                    # Value objects
│       └── exception/                # Domain-specific exceptions
├── test/
├── .env
├── package.json
└── tsconfig.json
```

**Rules:**

- Core (domain + application) never depends on adapters
- Adapters depend on ports (interfaces defined in core)
- Each "hexagon" = one bounded context (e.g., `KnowledgeHexagon/`)
- Within each hexagon: `domain/`, `application/`, `infrastructure/`, `ui/`
- Use DI to wire adapters to ports at runtime
- For small teams: duplicate shared entity definitions per hexagon is acceptable
- Test application layer with fake repositories (in-memory)
- Test infrastructure layer with embedded DB (e.g., mongo-unit)

---

## 6. Configuration Management

**Always use this pattern for config:**

```
src/config/
├── envs/
│   ├── default.ts        # Base config (all environments)
│   ├── development.ts    # Dev overrides
│   ├── production.ts     # Production overrides
│   └── test.ts           # Test config
├── database.config.ts    # DB connection settings
├── logger.config.ts      # Pino/Winston config
└── jwt.config.ts         # Auth config
```

**Rules:**

- `.env` file at project root — never commit to Git
- Config validation with Zod or Joi
- Environment-specific configs extend `default.ts`
- NestJS: use `ConfigModule.forRoot()` with `load` functions
- Never hardcode secrets — always use `process.env`

---

## 7. Test Organization

**Choose based on project type:**

| Project Type     | Test Location     | Example                                     |
| ---------------- | ----------------- | ------------------------------------------- |
| Small / Solo dev | Co-located        | `src/features/auth/auth.controller.test.ts` |
| Medium / Team    | Co-located        | `src/features/users/user.service.spec.ts`   |
| Large / Monorepo | Separate `tests/` | `tests/e2e/auth.e2e.ts`                     |
| Enterprise / TDD | Co-located        | `src/domain/user/user.test.ts`              |

**Rules:**

- Jest: both patterns supported via `testMatch` config
- Vitest: both patterns supported via `include`/`exclude` config
- Node built-in test runner: `--test` flag supports both
- E2E tests always go in `tests/e2e/` or `test/e2e/`
- Test files should mirror source structure for discoverability

---

## 8. TypeScript Conventions

**Types placement:**

```
# Feature-based: types inside feature folder
src/features/users/user.types.ts

# Layered: types in shared directory
src/types/user.types.ts

# Hybrid (recommended for large projects):
src/features/users/user.types.ts      # Feature-specific types
src/shared/types/api.types.ts         # Shared DTOs and API contracts
```

**Barrel files:**

- ✅ Recommended for feature folders: `src/features/users/index.ts`
- ✅ Recommended for shared modules: `src/shared/index.ts`
- ❌ Avoid in serverless functions (bundle size)
- ✅ Use path aliases in `tsconfig.json`: `"@shared/*": ["src/shared/*"]`

**Import patterns (recommended):**

```typescript
// ✅ Preferred: import from barrel file
import { UserService } from "../users";

// ✅ Preferred: use path aliases
import { Logger } from "@shared/logger";

// ❌ Avoid: deep file imports
import { UserService } from "../users/user.service";

// ❌ Avoid: circular imports with relative paths
import { FooService } from ".";
import { BarService } from "..";
```

---

## 9. File Naming Conventions

```
# Controllers
foo.controller.ts
user-auth.controller.ts

# Services
foo.service.ts
payment-processing.service.ts

# Models
foo.model.ts
user-profile.model.ts

# Routes
foo.route.ts
user.routes.ts          # Plural for route files

# DTOs
foo.dto.ts
create-user.dto.ts

# Guards
foo.guard.ts

# Interceptors
foo.interceptor.ts

# Pipes
foo.pipe.ts

# Middleware
foo.middleware.ts

# Types/Interfaces
foo.types.ts
foo.interface.ts

# Tests
foo.controller.test.ts      # Jest/Vitest convention
foo.controller.spec.ts      # Angular/NestJS convention

# Config
database.config.ts
environment.config.ts
```

---

## 10. Root-Level Files Standard

Every Node.js project should include:

| File                             | Purpose                                     |
| -------------------------------- | ------------------------------------------- |
| `package.json`                   | Dependencies, scripts, metadata             |
| `tsconfig.json`                  | TypeScript compiler config                  |
| `.gitignore`                     | Git ignore rules                            |
| `.env`                           | Environment variables (gitignored)          |
| `.env.example`                   | Template for env vars (committed)           |
| `README.md`                      | Project documentation                       |
| `server.ts` or `server.js`       | Server entry point                          |
| `src/index.ts` or `src/index.js` | App setup (tested separately)               |
| `src/app.ts`                     | Alternative to index.ts (NestJS convention) |

---

## Quick Reference: Anti-Patterns to Avoid

| Anti-Pattern                      | Problem                    | Fix                         |
| --------------------------------- | -------------------------- | --------------------------- |
| Everything in `index.js`          | Unmaintainable             | Split into features/modules |
| Controllers with business logic   | Hard to test, reuse        | Move logic to services      |
| Passing `req`/`res` to services   | Tightly coupled to Express | Use DTOs between layers     |
| No `src/` directory               | Project root cluttered     | All source in `src/`        |
| Shared code in every feature      | Duplication                | Extract to `shared/`        |
| Large feature folders (>20 files) | Too many concerns          | Split into sub-features     |
| Deep nesting (>4 levels)          | Hard to navigate           | Flatten structure           |
| No barrel files                   | Messy import paths         | Add `index.ts` exports      |
| Hardcoded config values           | Environment-specific bugs  | Use `src/config/` pattern   |
| Committing `.env`                 | Security risk              | Add to `.gitignore`         |

---

## Checklist for New Projects

When scaffolding a new Node.js project, verify:

- [ ] Source code is under `src/`
- [ ] Entry point is `server.ts` (starts server) separate from `index.ts` (app setup)
- [ ] Business logic is in services, not controllers
- [ ] Each feature has its own folder with controller, service, model, route
- [ ] Shared code is in `src/shared/`
- [ ] Config is in `src/config/` with environment-specific files
- [ ] Tests are organized (co-located or in `tests/`)
- [ ] `.env` is gitignored, `.env.example` is committed
- [ ] TypeScript path aliases configured in `tsconfig.json`
- [ ] Barrel files (`index.ts`) in feature folders
- [ ] File naming follows kebab-case convention
- [ ] API versioning directory (`api/v1/`) if applicable
- [ ] Scripts directory for migrations, seeders, and dev tools
