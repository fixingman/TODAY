# Vendored MiniSearch

MiniSearch **7.2.0**, MIT licensed by Luca Ongaro. The unmodified ESM distribution
is pinned at `minisearch-7.2.0.js`; the license is in `minisearch-LICENSE.txt`.

- Upstream: https://github.com/lucaong/minisearch/tree/v7.2.0
- Distribution: https://unpkg.com/minisearch@7.2.0/dist/es/index.js
- SHA-256 (base64): `A5OzuiU7gJ1eVXB8ewh175tRiilqAGxnObKIduFU7bM=`

Gmail dynamically imports this same-origin module only when candidate emails need
ranking. The service worker precaches it for offline availability; there is no
runtime CDN dependency, new eager script, build step, or permanent mailbox index.
The upstream source-map reference is retained; its map is not needed at runtime.
