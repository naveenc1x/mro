# Popup Loader Demo

Simple Node demo page for testing a GTM-driven popup. By default, the GTM tag
posts the targeting payload to
`https://dev-cdmp.ad.ex-monotaro.com/cdmp/v3/website-promotions`, then injects
the returned popup HTML. The demo form includes a popup server URL field for
testing a different endpoint.

## Run

```bash
npm start
```

Open `http://localhost:3000`.

## Files

- `popup.html`: popup fragment with scoped styles and markup
- `server.js`: serves static files plus a local fallback `GET` and `POST /api/popup-html`
- `gtm-popup-tag.html`: self-contained GTM Custom HTML tag that posts localStorage-backed targeting values, creates the overlay, injects the popup fragment, and handles close behavior on the client
- `index.html`: simple page that loads the real GTM container `GTM-TX644L3B`
