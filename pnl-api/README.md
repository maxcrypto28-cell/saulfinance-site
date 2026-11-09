# saulfinance PNL live feed

Tiny Python HTTP server that serves `GET /daily-pnl.json` with `Cache-Control: no-store` and CORS `*`.
Updates arrive via authenticated `POST` from the box loop (Bearer token in Render env `PNL_PUBLISH_TOKEN`).
No secrets are ever returned to browsers.
