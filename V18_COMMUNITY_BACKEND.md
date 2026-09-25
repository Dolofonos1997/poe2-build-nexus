# Build Nexus V18 Community Backend

The standalone package intentionally remains offline-first. For production, persist users, builds, likes, comments, favorites and versions in a database.

Suggested API surface:
- POST /api/v1/auth/session
- GET /api/v1/creators/:handle
- POST /api/v1/builds
- GET /api/v1/builds/:slug
- POST /api/v1/builds/:slug/fork
- POST /api/v1/builds/:slug/like
- POST /api/v1/builds/:slug/comments
- POST /api/v1/builds/:slug/versions
- GET /api/v1/me/favorites

Do not expose private tokens in the client. Validate and rate-limit mutations server-side.
