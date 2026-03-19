# searchology

![npm](https://img.shields.io/npm/v/searchology) ![license](https://img.shields.io/npm/l/searchology) ![types](https://img.shields.io/npm/types/searchology)

Turn plain English search queries into structured data — instantly.

```json
Input:  "black nike running shoes under $80"

Output: {
  "brand": "nike",
  "color": "black",
  "usage": "running",
  "product_type": "shoes",
  "price_max": 80
}
```

Instead of building dropdowns and filters, let your users search naturally. Searchology parses the query and returns only the attributes it finds — nothing is guessed or hallucinated.

---

## Requirements

- Node.js 18 or higher
- ES modules (`import`) or CommonJS (`require`) — both supported

---

## Install

```bash
npm install searchology
```

---

## Quick Start

There are only **two steps**:

1. Generate your API key (once, no account needed)
2. Call `extract()` on any search query

---

## Step 1 — Generate Your API Key

Searchology has no sign-up flow. You generate a key directly from the SDK — one network call, one key, done. Run this **once**, then save the key somewhere safe (like your `.env` file).

```javascript
import Searchology from 'searchology'

const client = new Searchology()

const registration = await client.createApiKey('my-app')
console.log(registration.key)
// sgy_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> ⚠️ **Your key is only shown once.** Copy it before moving on — it cannot be retrieved again.

**What this does:** `createApiKey()` makes a single request to Searchology's API and returns a fresh key scoped to the name you provide. You can create multiple keys for different apps or environments (e.g. `'my-app-dev'`, `'my-app-prod'`). Calling it again with the same name creates a new, separate key — it does not overwrite the old one.

**Store it in a `.env` file:**

```bash
# .env
SEARCHOLOGY_API_KEY=sgy_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Never hardcode the key directly in your source code.

---

## Step 2 — Extract from Any Search Query

```javascript
import Searchology from 'searchology'

const client = new Searchology({
  apiKey: process.env.SEARCHOLOGY_API_KEY
})

const data = await client.extract('black t-shirt for my son under $15')

console.log(data.result)
// {
//   "color": "black",
//   "product_type": "t-shirt",
//   "gender": "male",
//   "price_max": 15
// }

console.log(data.keys_found)  // 4
console.log(data.latency_ms)  // 1823
```

Only the attributes found in the query are returned. If the user doesn't mention color, `color` won't appear in the result.

---

## Using with a Filter System

The result maps directly to your database filters:

```javascript
import Searchology from 'searchology'
import express from 'express'

const client = new Searchology({ apiKey: process.env.SEARCHOLOGY_API_KEY })
const app = express()

app.get('/api/products', async (req, res) => {
  const { q } = req.query

  const { result } = await client.extract(q)

  // Build filter object from extracted attributes
  const filters = {}
  if (result.color)      filters.color      = result.color
  if (result.brand)      filters.brand      = result.brand
  if (result.price_max)  filters.price_max  = { lte: result.price_max }
  if (result.price_min)  filters.price_min  = { gte: result.price_min }
  if (result.gender)     filters.gender     = result.gender
  if (result.size)       filters.size       = result.size

  const products = await db.products.findMany({ where: filters })
  res.json(products)
})
```

---

## What Can Be Extracted

Searchology understands **50+ attributes across 9 categories**. The full attribute reference is available at [searchology.dev/docs/attributes](https://searchology.dev/docs/attributes). Here are some examples:

| Category | Attributes |
|---|---|
| Product | `product_type`, `brand`, `model`, `category` |
| Physical | `color`, `size`, `material`, `pattern` |
| Person | `gender`, `age`, `age_group`, `relationship` |
| Price | `price_max`, `price_min`, `currency`, `discount` |
| Occasion | `occasion`, `season`, `usage`, `activity` |
| Electronics | `storage`, `ram`, `display_size`, `processor` |
| Style | `style`, `fit`, `aesthetic` |
| Delivery | `delivery_speed`, `location`, `condition` |
| Special | `eco_friendly`, `gift_wrap`, `customizable` |

> **Custom attributes:** The attribute set is currently fixed. If you need domain-specific extraction (e.g. wine varietals, vehicle specs), [open an issue](https://github.com/your-repo/searchology/issues) — custom schemas are on the roadmap.

---

## More Query Examples

```javascript
// Electronics
await client.extract('gaming laptop with 16gb ram under $1000')
// { product_type: "laptop", usage: "gaming", ram: "16gb", price_max: 1000 }

// Fashion
await client.extract('formal dress for a wedding in summer')
// { product_type: "dress", style: "formal", occasion: "wedding", season: "summer" }

// Gift shopping
await client.extract('birthday gift for my 5 year old daughter')
// { occasion: "birthday", age: 5, gender: "female", relationship: "daughter", gift_wrap: true }

// Budget-conscious
await client.extract('budget smartphone with good battery')
// { product_type: "smartphone", budget_label: "budget", battery: "good battery" }

// Wireless audio
await client.extract('wireless headphones with noise cancellation under $200')
// { product_type: "headphones", connectivity: "wireless", price_max: 200 }
```

---

## Error Handling

```javascript
import Searchology, { SearchologyAPIError } from 'searchology'

const client = new Searchology({ apiKey: process.env.SEARCHOLOGY_API_KEY })

try {
  const data = await client.extract('red shoes under $50')
  console.log(data.result)

} catch (err) {
  if (err instanceof SearchologyAPIError) {
    console.error('Status:',     err.status)     // 401, 429, 500, etc.
    console.error('Error code:', err.errorCode)  // 'unauthorized', 'too_many_requests', etc.
    console.error('Message:',    err.message)    // human-readable explanation
  }
}
```

| Code | Meaning | Fix |
|---|---|---|
| `unauthorized` | Invalid or missing API key | Check your `sgy_` key is correct |
| `invalid_input` | Query is empty or missing | Pass a non-empty string |
| `query_too_long` | Query is over 500 characters | Shorten the query |
| `too_many_requests` | Over 60 requests per minute | Slow down or wait a moment |
| `extraction_failed` | Server error | Try again — usually temporary |

---

## TypeScript

Full types are included — no extra install needed:

```typescript
import Searchology, { ExtractResult, SearchAttributes } from 'searchology'

const client = new Searchology({ apiKey: process.env.SEARCHOLOGY_API_KEY })

const data: ExtractResult = await client.extract('black leather boots')

const result: SearchAttributes = data.result
// result.color      → string | undefined
// result.price_max  → number | undefined
// result.gender     → 'male' | 'female' | 'unisex' | undefined
```

---

## CommonJS

```javascript
const { Searchology } = require('searchology')

const client = new Searchology({ apiKey: process.env.SEARCHOLOGY_API_KEY })

client.extract('blue running shoes size 10')
  .then(data => console.log(data.result))
  .catch(err => console.error(err.message))
```

---

## Limits

| Limit | Value |
|---|---|
| Max query length | 500 characters |
| Rate limit | 60 requests per minute per API key |
| Average response time | 1.5 – 2.5 seconds |

---

## Pricing

See [searchology.dev/pricing](https://searchology.dev/pricing) for current plans and free tier details.

---

## Contributing & Support

Found a bug or have a feature request? [Open an issue on GitHub](https://github.com/your-repo/searchology/issues).

---

## License

MIT