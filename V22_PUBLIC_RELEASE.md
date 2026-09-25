# V22 Public Build Nexus

V22 adds the public-site client layer and production API contract for accounts, creators, cloud builds, versions/forks, community interactions and operations.

## Deployment boundary
The ZIP is fully usable offline for local planner/community prototypes. Real accounts, durable cloud persistence, moderation, backups, API security, rate limiting, live economy data and production SEO require a deployed backend and infrastructure.

## Recommended production checks
- HTTPS + secure session/auth implementation
- Database migrations and backups
- API validation, authorization and rate limits
- Cached economy upstream integration
- Cross-browser/mobile QA
- Accessibility and performance audits
- Moderation/reporting workflow
