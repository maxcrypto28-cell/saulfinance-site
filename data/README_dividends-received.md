# Dividends received ledger

- **Live file:** `dividends-received.json` — summed per ticker on the Stock Performance page.
- An empty `entries` array means every public holding shows **C$0.00**.
- Values increase only when a real payment is appended here. Do not invent amounts.

## Add a payment

Append one object to `entries`:

```json
{
  "ticker": "ENB",
  "paid_date": "2026-12-15",
  "amount_cad": 12.34,
  "ex_date": "2026-11-13",
  "note": "optional"
}
```

- `ticker` and `amount_cad` are required. `ticker` may be `ENB` or `ENB.TO` (normalized to the public display ticker).
- `amount_cad` is the cash actually received, already booked in CAD. Convert any USD receipt before adding it.
- `paid_date` and `ex_date` are optional ISO dates (`YYYY-MM-DD`).
- Multiple payments for the same ticker are summed.
- Do not add CTGO or VGFCQ; those names stay off the public site.

After editing, commit `data/dividends-received.json` and deploy the static site (same as covered calls). If the page still shows the old total, bump the `?v=ccXX` query on the ledger fetch in `assets/app.js` together with the usual css+js cache-bust.
