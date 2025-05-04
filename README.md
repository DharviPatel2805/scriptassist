# 🧠 TaskFlow API – Refactored & Scalable Backend

This is a production-ready, scalable, and secure version of the original TaskFlow API coding challenge. The refactor focuses on performance, architecture, security, and reliability for enterprise-scale deployments.

---

## ✅ Summary of Improvements

### 1. 🚀 Performance & Scalability

| Problem                          | Fixes Implemented |
|----------------------------------|--------------------|
| N+1 query problems               | 🔹 Used `QueryBuilder` with proper `leftJoinAndSelect` to fetch related data in a single query |
| In-memory filtering & pagination | 🔹 Moved all filtering and pagination logic to the database level using query parameters |
| Excessive roundtrips             | 🔹 Batched DB writes and reads using optimized bulk operations and reduced network latency |
| Poor access patterns             | 🔹 Moved all logic into services with properly optimized queries |

#### Features:
- Efficient pagination with total count
- Query-level filtering for `status`, `priority`, `userId`
- Transaction-safe batch operations

---

### 2. 🏗 Architectural Refactoring

| Problem                                | Fixes Implemented |
|----------------------------------------|--------------------|
| Controllers using repositories         | 🔹 Enforced service layer boundaries (no repo access in controller) |
| Lack of transaction support            | 🔹 Used `QueryRunner` to wrap multi-step DB operations in transactions |
| No service abstractions                | 🔹 Created `ITask`, `ITaskCreate`, etc. interfaces for type safety and testability |
| High interdependency                   | 🔹 Services loosely coupled, respecting SOLID principles |

#### Features:
- Repository Pattern + Interfaces
- Modular architecture
- Transaction wrapping for create/update/batch
- Better method separation & single responsibility

---

### 3. 🔒 Security Enhancements

| Problem                                | Fixes Implemented |
|----------------------------------------|--------------------|
| Weak JWT & role checks                 | 🔹 Added JWT Access/Refresh flow with secure validation |
| Authorization bypass potential         | 🔹 Implemented RBAC (Role-Based Access Control) |
| Sensitive error leaks                  | 🔹 Sanitized error responses using global filters |
| Rate limiting gaps                     | 🔹 Added rate-limiting decorators for high-risk routes |

#### Features:
- Access & Refresh token support
- Granular role protection (USER / ADMIN / MANAGER)
- Bearer token validation middleware
- Secure error messages and status codes

---

### 4. 🛡 Reliability & Resilience

| Problem                                | Fixes Implemented |
|----------------------------------------|--------------------|
| Centralized error handling missing     | 🔹 Added `HttpExceptionFilter` with timestamped responses |
| No observability tools                 | 🔹 Implemented contextual logging with request metadata |
| Queue degradation                      | 🔹 Added graceful degradation for BullMQ jobs |
| No health checks                       | 🔹 Added `/health` endpoint monitoring DB and queue |

#### Features:
- Global error filter
- Context-aware logger with stack traces
- Service health endpoint
- Fallbacks for job failures

---

### 5. 🌐 Distributed System Support

| Problem                                | Fixes Implemented |
|----------------------------------------|--------------------|
| No caching strategy                    | 🔹 Added Redis-based caching with TTL and invalidation hooks |
| Non-scalable stateful design           | 🔹 Made services stateless to support horizontal scaling |
| Queue non-resilience                   | 🔹 Used Redis-backed BullMQ queue for distributed task processing |

#### Features:
- Cache-first task lookup
- TTL-based invalidation
- Distributed queue support
- Multi-instance readiness (via Redis + statelessness)

---

## 🛠 How to Run the Project

### Prerequisites
- PostgreSQL
- Redis
- Bun (latest version)

### Setup

```bash
bun install
cp .env.example .env   # Update DB and Redis credentials
bun run build
bun run migration:run  # or bun run migration:custom
bun run seed
bun run start:dev
