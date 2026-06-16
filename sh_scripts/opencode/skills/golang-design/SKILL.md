---
name: golang-design
description: "Use when designing or planning any projects written in GoLang.
  Provides:
  - best practices
  - archetecture design
  - document design
  - backend design"
---

# Go Project Best Practices

## Purpose

Concise reference for AI coding agents creating and maintaining Go projects. Covers directory structures, conventions, architecture patterns, and common pitfalls. Optimized for agents with limited context windows.

**Target Go version:** 1.21+ (generics, go.work, modern modules)
**Scope:** Backend/server-side Go only (APIs, services, workers)

---

## Project Structure Selection

Use this decision flow to choose the appropriate structure level:

```
Start
  |
  +-- Monorepo? ─Yes→ Multi-Service (Level 3) or Enterprise (Level 5)
  |                     Use go.work + internal/ packages shared across services
  |
  +-- Team size?
  |     Solo (<3) → Simple (Level 1) or Standard (Level 2)
  |     Small (3-10) → Standard (Level 2)
  |     Medium (10-30) → Multi-Service (Level 3) or Clean (Level 4)
  |     Large (30+) → Enterprise (Level 5)
  |
  +-- Need strict separation of concerns?
  |     Yes → Clean Architecture (Level 4) or Hexagonal (Level 4)
  |     No → Standard (Level 2)
  |
  +-- Complexity?
  |     Low (<10K LoC) → Level 1 or 2
  |     Medium (10K-50K LoC) → Level 2 or 3
  |     High (50K+ LoC) → Level 4 or 5
```

### Structure Levels

| Level | Name                        | LoC      | Team   | Key Pattern                              |
| ----- | --------------------------- | -------- | ------ | ---------------------------------------- |
| 1     | Simple/Single-Service       | <10K     | 1-2    | Flat structure, cmd/main.go              |
| 2     | Standard (golang-standards) | 10K-50K  | 1-10   | cmd/, internal/, pkg/                    |
| 3     | Multi-Service               | 50K+     | 5-20   | Multiple cmd/ services, shared internal/ |
| 4     | Clean/Hexagonal             | 10K-100K | 5-15   | layered packages, ports & adapters       |
| 5     | Enterprise/Modular Monolith | 100K+    | 15-50+ | Bounded contexts, multiple modules       |

---

## Standard Directory Structure (Level 2)

```
project-root/
├── cmd/                    # Entry points (one dir per executable)
│   ├── myapp/
│   │   └── main.go
│   └── mycli/
│       └── main.go
├── internal/               # Private packages (compiler-enforced)
│   ├── handler/
│   ├── service/
│   └── repository/
├── pkg/                    # Public packages (shareable externally)
│   ├── httpclient/
│   └── config/
├── api/                    # API definitions (OpenAPI, proto)
├── configs/                # Config file templates
├── docs/                   # Extended documentation
├── scripts/                # Build/utility scripts
├── tools/                  # Standalone tools (go:build tool)
├── web/                    # Frontend assets (if applicable)
├── go.mod
├── go.sum
├── .air.toml               # Hot-reload config (optional)
└── README.md
```

### Required vs Optional

| Directory   | Required     | Notes                               |
| ----------- | ------------ | ----------------------------------- |
| `go.mod`    | **Required** | Module definition                   |
| `go.sum`    | **Required** | Auto-generated, commit it           |
| `cmd/`      | **Required** | At least one executable entry point |
| `internal/` | Recommended  | Compiler-enforced privacy boundary  |
| `pkg/`      | Recommended  | For public, shareable packages      |
| `api/`      | Optional     | OpenAPI, protobuf definitions       |
| `configs/`  | Optional     | Config templates (not secrets)      |
| `docs/`     | Optional     | Architecture docs, ADRs             |
| `scripts/`  | Optional     | Build, deploy, utility scripts      |
| `tools/`    | Optional     | CLI tools, code generators          |

---

## Go-Specific Language Features

### internal/ Directory (Compiler-Enforced)

Packages inside `internal/` **cannot be imported** by code outside their parent directory tree. The Go compiler rejects such imports.

```
myproject/
├── internal/
│   ├── auth/           # Importable by: myproject/... (anywhere in this module)
│   └── service/
│       └── internal/   # Importable by: myproject/internal/service/... only
├── pkg/
│   └── utils/          # Importable by: ANY Go module
```

Usage rules:

- Use `internal/` for packages that should not leave your module
- Use `pkg/` for packages you intend to share with other modules
- Nested `internal/` provides tighter scoping (parent directory tree constraint)

### pkg/ Convention

- Unenforced by Go, but strong community convention
- Use for public, reusable packages that other modules may import
- Version with major suffix: `github.com/org/myproject/pkg/v2/`

### Module Path Conventions

```go
// go.mod for v1
module github.com/org/myproject

// go.mod for v2+ (must have /v2 suffix)
module github.com/org/myproject/v2

// Importing v2 module
import "github.com/org/myproject/v2/internal/service"
```

### go.mod Directives

| Directive | Purpose                        | Example                                   |
| --------- | ------------------------------ | ----------------------------------------- |
| `require` | Specify dependency versions    | `require github.com/gin-gonic/gin v1.9.1` |
| `replace` | Local override for development | `replace github.com/org/lib => ../lib`    |
| `exclude` | Prevent specific versions      | `exclude github.com/bad/pkg v1.2.3`       |
| `retract` | Hide published versions        | `retract v1.0.0 // critical bug`          |
| `tool`    | Specify Go toolchain version   | `tool go 1.21`                            |

### go.work (Go 1.18+)

For multi-module development without vendoring:

```
# go.work
go 1.21

use (
    ./service-api
    ./service-worker
    ./shared-lib
)
```

Use when:

- Developing multiple related services/libraries locally
- You need local overrides for dependencies
- Working in a monorepo with multiple modules

### Build Constraints

File naming conventions:

- `_test.go` — Test files (compiled only during `go test`)
- `_linux.go` — Platform-specific (compiled only on Linux)
- `_windows.go` — Platform-specific (compiled only on Windows)
- `doc.go` — Package documentation (first file in package)

Build constraint comments:

```go
//go:build linux
// +build linux

package mypkg
```

### testdata/ Directory

Convention for test fixtures:

```
service/
├── service_test.go
└── testdata/
    ├── valid_input.json
    └── invalid_input.json
```

The `testdata/` directory is not compiled as part of the package. Use it for fixtures, golden files, and test inputs.

### third_party/ Directory

For external pulled code (e.g., bazel-go_rules, generated code from external sources). Rarely used in pure Go projects.

---

## Architecture Patterns

### Clean Architecture in Go

**Layers (inward dependency):**

```
cmd/myapp/main.go          → Adapters (frameworks)
internal/api/              → Interface Adapters (controllers, use case orchestrators)
internal/service/          → Use Cases (business logic)
internal/entity/           → Entities (domain models)
```

**Dependency direction:** Outer layers depend inward. Inner layers know nothing about outer layers.

```go
// Entity (innermost - no imports of outer packages)
package entity

type User struct {
    ID    string
    Name  string
    Email string
}

// Use Case (depends on entity, defines interfaces)
package service

type UserRepository interface {
    Save(User) error
    FindByID(string) (*User, error)
}

type UserService struct {
    repo UserRepository  // depends on abstraction, not concrete
}

// Adapter (outermost - implements interfaces)
package repository

type DBRepository struct {
    db *sql.DB
}

func (r *DBRepository) Save(u entity.User) error {
    // SQL implementation
}
```

**Dependency injection:** Use constructor injection (not frameworks):

```go
func NewUserService(repo service.UserRepository) *UserService {
    return &UserService{repo: repo}
}
```

### Hexagonal Architecture (Ports-And-Adapters)

**Core concept:** The domain is at the center. Ports (interfaces) define contracts. Adapters implement them.

```
myproject/
├── internal/
│   ├── domain/           # Entities, value objects, domain logic
│   ├── ports/            # Interface definitions (ports)
│   │   ├── repository.go # Repository port interface
│   │   └── http.go       # HTTP port interface (for outgoing calls)
│   ├── adapters/         # Implementations (adapters)
│   │   ├── http/         # HTTP server adapter (incoming)
│   │   ├── grpc/         # gRPC adapter (incoming)
│   │   └── postgres/     # Database adapter (outgoing)
│   └── application/      # Use case orchestration
```

**Dependency direction:** Domain → Ports → Adapters (inward only)

**Key Go idioms:**

- Ports = Go interfaces
- Adapters = Concrete types implementing those interfaces
- Dependency injection via constructors

### Domain-Driven Design in Go

**Aggregates and entities:**

```go
package entity

type Order struct {
    id        string
    items     []OrderItem
    status    OrderStatus
    createdAt time.Time
}

func (o *Order) AddItem(item OrderItem) error {
    if o.status != StatusDraft {
        return fmt.Errorf("order is not in draft status")
    }
    o.items = append(o.items, item)
    return nil
}
```

**Value objects (struct-based immutability):**

```go
package valueobject

type Money struct {
    amount   int64
    currency string
}

func NewMoney(amount int64, currency string) (Money, error) {
    // validation
    return Money{amount, currency}, nil
}
```

**Go DDD limitations:**

- Verbose interface definitions for ports
- No built-in support for aggregates (must enforce invariants manually)
- Generics (1.18+) help with repository patterns but add complexity
- Most Go teams use simpler layered architectures instead of full DDD

**When DDD makes sense in Go:** Complex business domains with rich domain logic, multiple bounded contexts, regulatory requirements.

**When DDD is overkill:** CRUD APIs, simple microservices, small teams.

---

## Naming Conventions

### File Naming

| Pattern                  | Purpose               | Example                                          |
| ------------------------ | --------------------- | ------------------------------------------------ |
| `main.go`                | Entry point           | `cmd/myapp/main.go`                              |
| `_test.go`               | Test files            | `service_test.go`                                |
| `_linux.go`              | Platform-specific     | `fs_linux.go`                                    |
| `_windows.go`            | Platform-specific     | `fs_windows.go`                                  |
| `doc.go`                 | Package docs          | `package/service/doc.go`                         |
| `config.go`              | Configuration         | `config.go`                                      |
| `handler.go`             | HTTP handler          | `user_handler.go`                                |
| `service.go`             | Business logic        | `user_service.go`                                |
| `model.go` / `_model.go` | Data models           | `user_model.go`                                  |
| `_repository.go`         | Data access           | `user_repository.go`                             |
| `_interface.go`          | Interface definitions | `user_store.go` (use type name, not "Interface") |

### Package Naming

```go
package user        // singular, lowercase, no underscores
package httpclient  // descriptive, compound words
package config      // short, clear
```

Rules:

- Singular names (not plural): `package user` not `package users`
- No underscores or capital letters
- Match directory name exactly
- Avoid generic names: `package util`, `package common`, `package helpers`

### Interface Naming

```go
type Reader interface {    // single method: Read()
    Read(p []byte) (int, error)
}

type Writer interface {    // single method: Write()
    Write(p []byte) (int, error)
}

type ReadWrite interface { // two methods
    Reader
    Writer
}

type UserStore interface { // multiple methods, use noun
    Save(User) error
    FindByID(string) (*User, error)
}
```

Rules:

- Single method: suffix with `-er` (Reader, Writer, Closer, Logger)
- Multiple methods: use noun (UserStore, ConnectionPool)
- Do NOT use `I` prefix (Go convention)
- Do NOT use `Interface` suffix

### Struct Naming

```go
type User struct { ... }           // Business entity
type UserService struct { ... }    // Service layer (implies service)
type UserRepository struct { ... } // Repository (implies data access)
type HTTPHandler struct { ... }    // HTTP-specific
type Config struct { ... }         // Configuration
```

---

## Import Patterns

### Standard Library

```go
import (
    "context"
    "fmt"
    "log"
    "net/http"
    "time"
)
```

### Internal Packages

```go
import (
    "myproject/internal/handler"    // same module
    "myproject/internal/service"
    "myproject/internal/entity"
)
```

### External Dependencies

```go
import (
    "github.com/gin-gonic/gin"
    "github.com/lib/pq"
    "go.uber.org/zap"
)
```

### Import Grouping (standard convention)

```go
import (
    "standard"   // stdlib
    "library"    // external
    "internal"   // project internal
)
```

Use `gofmt` or `goimports` to auto-format imports.

---

## Anti-Patterns and Common Mistakes

### Over-Nesting Packages

```go
// BAD: Too many levels
internal/handler/user/v2/http/

// GOOD: Flat, shallow packages
internal/handler/user/
```

Rule: Max 3 levels deep. If you need more, reconsider your package boundaries.

### Circular Dependencies

```go
// BAD: service imports repository, repository imports service
service/service.go     → imports repository
repository/repository.go → imports service  // compile error!
```

Fix: Extract shared types into a separate package or use interfaces.

### Misusing internal/ vs pkg/

```go
// BAD: Putting everything in pkg/ (makes everything public)
// BAD: Putting everything in internal/ (prevents testing from other modules)

// GOOD: internal/ for private implementation, pkg/ for public APIs
internal/     → handler, service, repository (private)
pkg/          → httpclient, config, middleware (public, shareable)
```

### Business Logic in Handlers

```go
// BAD: Handler with business logic
func (h *Handler) CreateUser(w http.ResponseWriter, r *http.Request) {
    // complex validation, domain rules, transactions
    // this should be in a service
}

// GOOD: Handler delegates to service
func (h *Handler) CreateUser(w http.ResponseWriter, r *http.Request) {
    user := h.parseAndValidate(r)  // only parsing/validation
    h.service.Create(r.Context(), user)  // business logic in service
}
```

### God Packages

```go
// BAD: One package with everything
package utils

func DoEverything() { ... }  // 2000+ line file
```

### Interface Pollution

```go
// BAD: Interfaces for everything, even simple cases
type UserCreator interface {
    CreateUser(ctx context.Context, input CreateUserInput) (*User, error)
}

// GOOD: Use interfaces where you need to swap implementations
// (e.g., real DB vs mock for testing)
```

### Deep Dependency Injection Chains

```go
// BAD: 5 levels of constructor params
func NewHandler(repo UserRepository, svc UserService, logger *zap.Logger, cfg *Config, mw Middleware) *Handler

// GOOD: Use a config/options struct for complex constructors
type HandlerConfig struct {
    Repo   UserRepository
    Svc    UserService
    Logger *zap.Logger
    Config *Config
}

func NewHandler(cfg HandlerConfig) *Handler
```

---

## Scaffold Checklist

### Pre-Scaffolding Decisions

- [ ] Module path determined (`github.com/org/project`)
- [ ] Structure level chosen (1-5 based on team size, complexity)
- [ ] Architecture pattern selected (layered, clean, hexagonal)
- [ ] External dependencies identified
- [ ] Internal packages identified (what stays in `internal/`)

### Initial Structure

- [ ] `go.mod` initialized with correct module path and Go version
- [ ] `cmd/<app>/main.go` entry point created
- [ ] `internal/` directory structure for private packages
- [ ] `pkg/` directory structure for public packages (if applicable)
- [ ] `api/` directory if using OpenAPI/protobuf
- [ ] `configs/` directory for config templates
- [ ] `docs/` directory for extended documentation
- [ ] `README.md` with project overview and structure explanation

### go.mod Configuration

- [ ] `go 1.21` directive set
- [ ] All dependencies added via `go get`
- [ ] `go mod tidy` run to clean up
- [ ] `go.sum` committed to version control
- [ ] `replace` directives for local development dependencies
- [ ] `retract` directives for any problematic published versions

### Build and Test Setup

- [ ] `go build ./...` succeeds
- [ ] `go test ./...` passes
- [ ] Table-driven tests used (Go idiom)
- [ ] `testdata/` directory created for test fixtures
- [ ] CI/CD pipeline configured
- [ ] `go vet ./...` runs clean
- [ ] `gofmt -l .` shows no files (proper formatting)

---

## Real-World Examples

### Level 2 (Standard) Examples

| Project                         | Repo                                       | Notes                         |
| ------------------------------- | ------------------------------------------ | ----------------------------- |
| golang-standards/project-layout | github.com/golang-standards/project-layout | The reference template itself |
| go-echo-scaffold                | github.com/echoes-project/scaffold         | Echo framework based          |
| go-clean-scaffold               | github.com/abiosoft/colima                 | Clean-ish architecture        |

### Level 3 (Multi-Service) Examples

| Project    | Repo                             | Notes                               |
| ---------- | -------------------------------- | ----------------------------------- |
| kubernetes | github.com/kubernetes/kubernetes | Massive multi-service monorepo      |
| prometheus | github.com/prometheus/prometheus | Multiple services, shared internal/ |

### Level 4 (Clean/Hexagonal) Examples

| Project               | Repo                                    | Notes                          |
| --------------------- | --------------------------------------- | ------------------------------ |
| go-clean-architecture | github.com/evrone/go-clean architecture | Clean Architecture reference   |
| hexagonal-go          | github.com/anthdm/hexagonal-go          | Hexagonal architecture example |

---

## Quick Reference: Package-by-Feature vs Package-by-Layer

### Package-by-Layer (most common in Go)

```
internal/
├── handler/     # All HTTP handlers
├── service/     # All business logic
├── repository/  # All data access
└── model/       # All data models
```

**Pros:** Easy to find code, simple mental model
**Cons:** Changing a feature requires editing multiple directories

### Package-by-Feature

```
internal/
├── user/
│   ├── handler/
│   ├── service/
│   └── repository/
├── order/
│   ├── handler/
│   ├── service/
│   └── repository/
```

**Pros:** Feature changes contained in one directory
**Cons:** Harder to find shared utilities, more directories

**Recommendation:** Start with package-by-layer for small projects. Switch to package-by-feature when features become complex and teams grow.

---

## Token-Efficient Project Structure Lookup

When an AI agent needs to understand or create a Go project structure:

1. **Check for `go.mod`** — confirms module, shows dependencies
2. **Check `cmd/`** — shows all executables/entry points
3. **Check `internal/`** — shows private package boundaries
4. **Check `pkg/`** — shows public/reusable packages
5. **Check directory count** — >50 packages suggests over-nesting
6. **Check `internal/` depth** — >3 levels suggests over-nesting
7. **Look for circular imports** — indicates architecture issues
