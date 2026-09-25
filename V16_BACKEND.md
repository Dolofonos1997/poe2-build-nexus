# Build Nexus V16 backend contract

V16 keeps the standalone site offline-compatible and defines a small same-origin backend under `/api/v1`.

## Routes
- `GET /api/v1/health`
- `GET /api/v1/economy/leagues`
- `GET /api/v1/economy/exchange?league=<id>&type=Currency`
- `GET /api/v1/economy/items?league=<id>&type=UniqueWeapon`
- `GET /api/v1/economy/history?...`
- `POST /api/v1/trade/search`
- `POST /api/v1/pob/parse`

The economy proxy should call only the supported poe.ninja PoE 2 economy endpoints, respect upstream `ETag` / `Cache-Control`, send a descriptive User-Agent/contact, and cache normalized responses. Do not use poe.ninja internal builds/profile/character endpoints.

Suggested app cache: 60 minutes for league discovery; 15 minutes for economy responses. Store periodic normalized snapshots in your own database to power price history.

The PoB parser endpoint is intended for deflate/base64 decoding and XML normalization. Preserve the original input alongside parsed fields so imports can be reprocessed as the parser improves.
