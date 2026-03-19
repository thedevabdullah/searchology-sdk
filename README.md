# searchology

Turn plain English search queries into structured data — instantly.

Instead of building dropdowns and filters, let your users search naturally:

> *"black nike running shoes under $80"*

And your app receives clean, structured JSON:

```json
{
  "brand": "nike",
  "color": "black",
  "usage": "running",
  "product_type": "shoes",
  "price_max": 80
}
```

---

## Install

```bash
npm install searchology
```

---

## Quick Start

There are only **two steps** to using Searchology:

1. Create your API key (once)
2. Call extract() with any search query

---

## Step 1 — Get Your API Key

You only do this **once**. Run this code one time, copy the key it gives you, and save it somewhere safe (like your `.env` file).

```javascript
import Searchology from 'searchology'

const client = new Searchology()

const registration = await client.createApiKey('my-app')

console.log(registration.key)
// sgy_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> ⚠️ **Important:** Your key is only shown once. Copy it and save it before moving on.

---

## Step 2 — Extract from any search query

Now use your saved key to extract structured data from any natural language query:

```javascript
import Searchology from 'searchology'

const client = new Searchology({
  apiKey: 'sgy_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
})

const data = await client.extract('black t-shirt for my son under $15')

console.log(data.result)
```

Response:

```json
{
  "color": "black",
  "product_type": "t-shirt",
  "gender": "male",
  "price_max": 15
}
```

That's it. Only keys found in the query are returned — nothing is guessed.

---

## Saving Your API Key (Recommended)

Never hardcode your key directly in your code. Store it in a `.env` file:

```bash
# .env
SEARCHOLOGY_API_KEY=sgy_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Then use it like this:

```javascript
const client = new Searchology({
  apiKey: process.env.SEARCHOLOGY_API_KEY
})
```

---

## Full Working Example

```javascript
import Searchology from 'searchology'

const client = new Searchology({
  apiKey: process.env.SEARCHOLOGY_API_KEY
})

const data = await client.extract('wireless headphones with noise cancellation under $200')

console.log(data.result)
// {
//   product_type:  "headphones",
//   connectivity:  "wireless",
//   price_max:     200
// }

console.log(data.keys_found)   // 3
console.log(data.latency_ms)   // 1842
```

---

## Using with a Search or Filter System

The result object maps directly to your database filters:

```javascript
const { result } = await client.extract(userSearchQuery)

// use the extracted attributes to filter your products
const filters = {}

if (result.color)      filters.color      = result.color
if (result.brand)      filters.brand      = result.brand
if (result.price_max)  filters.price_max  = result.price_max
if (result.gender)     filters.gender     = result.gender
if (result.size)       filters.size       = result.size

// now pass filters to your database query
```

---

## What Can Be Extracted

Searchology understands 50+ attributes across 9 categories. Here are some examples:

| Category | What it extracts |
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

Only the keys found in the query are included in the response. If a user doesn't mention color, `color` won't appear in the result.

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

// With budget label
await client.extract('budget smartphone with good battery')
// { product_type: "smartphone", budget_label: "budget", battery: "good battery" }
```

---

## Error Handling

Wrap your calls in try/catch to handle errors gracefully:

```javascript
import Searchology, { SearchologyAPIError } from 'searchology'

const client = new Searchology({ apiKey: process.env.SEARCHOLOGY_API_KEY })

try {
  const data = await client.extract('red shoes under $50')
  console.log(data.result)

} catch (err) {
  if (err instanceof SearchologyAPIError) {
    console.error('Status:',    err.status)      // 401, 429, 500 etc.
    console.error('Error code:', err.errorCode)  // 'unauthorized', 'too_many_requests' etc.
    console.error('Message:',   err.message)     // human readable explanation
  }
}
```

**Error codes you might see:**

| Code | Meaning | How to fix |
|---|---|---|
| `unauthorized` | Invalid or missing API key | Check your `sgy_` key is correct |
| `invalid_input` | Query is empty or missing | Make sure you're passing a non-empty string |
| `query_too_long` | Query is over 500 characters | Shorten the query |
| `too_many_requests` | Over 60 requests per minute | Slow down or wait a moment |
| `extraction_failed` | Server error | Try again — usually temporary |

---

## CommonJS (require) Support

If you're not using ES modules, you can use `require`:

```javascript
const { Searchology } = require('searchology')

const client = new Searchology({ apiKey: 'sgy_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' })

client.extract('blue running shoes size 10')
  .then(data => console.log(data.result))
  .catch(err => console.error(err.message))
```

---

## TypeScript Support

The package includes full TypeScript types out of the box — no extra install needed:

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

## Limits

| Limit | Value |
|---|---|
| Max query length | 500 characters |
| Rate limit | 60 requests per minute per API key |
| Response time | ~1.5 – 2.5 seconds average |

---

## License

MIT