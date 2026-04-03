# searchology

[![npm version](https://img.shields.io/npm/v/searchology.svg)](https://www.npmjs.com/package/searchology)
[![npm downloads](https://img.shields.io/npm/dm/searchology.svg)](https://www.npmjs.com/package/searchology)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-blue.svg)](https://www.typescriptlang.org)

**Official JavaScript / TypeScript SDK for the Searchology API.**

Turn plain English search queries into structured, actionable JSON — instantly. No dropdowns. No filter panels. No complex UI logic. Just a sentence from your user, and a clean object your database can query directly.

```
"red nike running shoes size 10 under $80"
                        ↓
{
  product_type: { value: "shoes",   confidence: 1.0 },
  brand:        { value: "nike",    confidence: 1.0 },
  color:        { value: "red",     confidence: 1.0 },
  activity:     { value: "running", confidence: 1.0 },
  size:         { value: "10",      confidence: 1.0 },
  price_max:    { value: 80,        confidence: 1.0 },
  currency:     { value: "USD",     confidence: 1.0 }
}
```

---

## Table of Contents

- [How It Works](#how-it-works)
- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Getting Your API Key](#getting-your-api-key)
- [Client Configuration](#client-configuration)
- [Methods](#methods)
  - [createApiKey()](#createapikeyname)
  - [setApiKey()](#setapikeykey)
  - [extract()](#extractquery-options)
  - [getKeyStatus()](#getkeystatus)
  - [refreshKey()](#refreshkey)
  - [getSchema()](#getschema)
  - [saveSchema()](#saveschemaschema)
  - [getCustomSchema()](#getcustomschema)
  - [deleteCustomSchema()](#deletecustomschema)
- [Understanding Confidence Scores](#understanding-confidence-scores)
- [Query Suggestions](#query-suggestions)
- [Custom Schema](#custom-schema)
- [Full Schema Reference](#full-schema-reference)
- [TypeScript Support](#typescript-support)
- [Error Handling](#error-handling)
- [CommonJS Support](#commonjs-support)
- [Examples](#examples)
- [Rate Limits](#rate-limits)
- [License](#license)

---

## How It Works

Searchology sits between your search input and your database. When a user types a natural language query, you pass it to the API. The API uses a large language model to parse and extract every meaningful attribute from the sentence — normalising typos, expanding slang, inferring implied values, and scoring each extraction with a confidence rating. You get back a clean JSON object. You use it to query your database.

```
User types:   "affordable waterproof hiking boots for men size 11"
                                    ↓
         ┌──────────────────────────────────────┐
         │          Searchology API             │
         │  1. Classify — is this a search?     │
         │  2. Normalize — fix typos/slang      │
         │  3. Extract — pull attributes        │
         │  4. Score — confidence per field     │
         └──────────────────────────────────────┘
                                    ↓
{
  product_type:  { value: "boots",       confidence: 1.0  },
  subcategory:   { value: "hiking boots",confidence: 1.0  },
  activity:      { value: "hiking",      confidence: 1.0  },
  certification: { value: "waterproof",  confidence: 1.0  },
  gender:        { value: "male",        confidence: 1.0  },
  size:          { value: "11",          confidence: 1.0  },
  budget_label:  { value: "budget",      confidence: 0.75 }
}
                                    ↓
         Your database query using these fields
```

The API never guesses. Every returned attribute has a direct basis in the query text. If a field has no real basis, it is excluded entirely rather than filled with a low-confidence assumption.

---

## Features

- **Natural Language Extraction** — converts any plain English search query into a structured JSON object
- **Confidence Scoring** — every extracted attribute carries a `0.0–1.0` confidence score so you can filter by certainty
- **Typo Tolerance** — automatically corrects spelling errors before extraction (`"nikee sneekers"` → extracts `brand: nike`, `product_type: sneakers`)
- **Slang & Synonym Normalisation** — maps informal language to standard terms (`kicks` → `shoes`, `tee` → `t-shirt`, `mobile` → `phone`)
- **Query Suggestions** — when a query is too vague to extract anything, the API returns 2–3 better-phrased alternatives automatically
- **Custom Schema** — save your own set of fields against your API key; the API will extract only the attributes your database actually has columns for
- **70 Extractable Attributes** — covering product identity, pricing, size, materials, occasion, style, electronics specs, beauty, food, pets, and more
- **Full TypeScript Support** — complete type definitions shipped in the package, no `@types` installation needed
- **Zero Dependencies** — the SDK uses only the native `fetch` API; nothing is installed into your `node_modules` at runtime
- **Request Timeout** — configurable timeout with clean error handling; no hung promises

---

## Requirements

- Node.js **18.0.0** or higher (required for native `fetch`)
- A Searchology API key — [get one free in seconds](#getting-your-api-key)

---

## Installation

```bash
npm install searchology
```

```bash
yarn add searchology
```

```bash
pnpm add searchology
```

---

## Quick Start

```typescript
import Searchology from 'searchology'

// Step 1 — get your API key (run this once, then store the key)
const client = new Searchology()
const { key } = await client.createApiKey('my-app')
console.log(key) // sgy_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// Save this to your .env file as SEARCHOLOGY_API_KEY

// Step 2 — extract structured data from any search query
const client = new Searchology({ apiKey: process.env.SEARCHOLOGY_API_KEY })
const data = await client.extract('black leather sofa for living room under $800')

console.log(data.result)
// {
//   product_type: { value: 'sofa',        confidence: 1.0 },
//   material:     { value: 'leather',     confidence: 1.0 },
//   color:        { value: 'black',       confidence: 1.0 },
//   room:         { value: 'living room', confidence: 1.0 },
//   price_max:    { value: 800,           confidence: 1.0 }
// }
```

---

## Getting Your API Key

API keys are free and take about 5 seconds to generate. Pass any descriptive name — your project name, your app, anything you'll recognise later.

```typescript
import Searchology from 'searchology'

const client = new Searchology()
const result = await client.createApiKey('my-store')

console.log(result.key)        // sgy_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
console.log(result.name)       // "my-store"
console.log(result.expires_in) // "30 days"
```

> **Important:** Your key is shown only once in this response. Copy it immediately and store it securely. If you lose it, you will need to generate a new one.

Store it in your environment:

```bash
# .env
SEARCHOLOGY_API_KEY=sgy_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Then use it in your application:

```typescript
const client = new Searchology({
  apiKey: process.env.SEARCHOLOGY_API_KEY
})
```

Keys are valid for **30 days**. You can check the remaining time and refresh them at any point — see [`getKeyStatus()`](#getkeystatus) and [`refreshKey()`](#refreshkey).

---

## Client Configuration

```typescript
const client = new Searchology({
  apiKey:  'sgy_xxx',           // Your API key
  timeout: 30000                // Optional — request timeout in ms (default: 30000)
})
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | — | Your API key. Can also be set later via `setApiKey()`. |
| `timeout` | `number` | `30000` | Milliseconds before a request times out. Set to `0` to disable. |

---

## Methods

### `createApiKey(name)`

Creates a new API key. No authentication needed — call this once to get your key.

After a successful call, the key is automatically set on the client instance, so you can immediately call `extract()` or other authenticated methods on the same instance.

```typescript
const result = await client.createApiKey('my-project')
```

**Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | A label for this key. Max 64 characters. |

**Returns:** `Promise<CreateKeyResult>`

```typescript
{
  message:    "API key created successfully",
  key:        "sgy_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  name:       "my-project",
  expires_in: "30 days"
}
```

---

### `setApiKey(key)`

Sets or replaces the API key on an existing client instance. Useful when you load your key asynchronously after constructing the client.

```typescript
const client = new Searchology()

// ... later, after loading from a secrets manager or env
client.setApiKey(process.env.SEARCHOLOGY_API_KEY!)
```

**Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `string` | A valid API key string. |

**Returns:** `void`

---

### `extract(query, options?)`

Extracts structured attributes from a plain English search query. This is the core method of the SDK.

```typescript
const data = await client.extract('wireless noise cancelling headphones under $200')

console.log(data.result)
// {
//   product_type: { value: 'headphones',          confidence: 1.0 },
//   connectivity: { value: 'wireless',            confidence: 1.0 },
//   certification:{ value: 'noise cancelling',    confidence: 1.0 },
//   price_max:    { value: 200,                   confidence: 1.0 }
// }

console.log(data.keys_found)  // 4
console.log(data.latency_ms)  // 843
console.log(data.schema_used) // "builtin"
```

To extract using your saved custom schema instead of the built-in one:

```typescript
const data = await client.extract('wireless headphones under $200', {
  useCustomSchema: true
})
```

**Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | `string` | — | The natural language search query. Max 500 characters. |
| `options.useCustomSchema` | `boolean` | `false` | Use your saved custom schema instead of the built-in one. Requires a schema to be saved via `saveSchema()` first. |

**Returns:** `Promise<ExtractResult>`

```typescript
{
  query:        string                          // The original query
  result:       Record<string, ExtractedField>  // Extracted attributes
  keys_found:   number                          // Count of extracted attributes
  latency_ms:   number                          // API processing time in ms
  schema_used:  'builtin' | 'custom'            // Which schema was used
  suggestions?: string[]                        // Query rephrasings (only when keys_found === 0)
  hint?:        string                          // Guidance message (only when keys_found === 0)
}
```

Each entry in `result` is an `ExtractedField`:

```typescript
{
  value:      unknown  // The extracted value — string, number, or boolean
  confidence: number   // Confidence score from 0.3 to 1.0
}
```

---

### `getKeyStatus()`

Returns the current status of your API key — expiry, total requests made, and whether a custom schema is saved.

```typescript
const status = await client.getKeyStatus()

console.log(status.expires_in)    // "18 days"
console.log(status.requests)      // 1842
console.log(status.custom_schema) // true
```

**Returns:** `Promise<KeyStatusResult>`

```typescript
{
  status:        "active",
  name:          "my-store",
  expires_in:    "18 days",     // null if no expiry set
  requests:      1842,
  custom_schema: true
}
```

---

### `refreshKey()`

Resets your API key expiry to 30 days from today. Call this before your key expires to avoid downtime.

```typescript
const result = await client.refreshKey()
console.log(result.expires_in) // "30 days"
```

**Returns:** `Promise<KeyRefreshResult>`

```typescript
{
  message:    "Key expiry refreshed successfully",
  expires_in: "30 days"
}
```

**Tip:** Check your expiry and refresh automatically before it runs out:

```typescript
const status = await client.getKeyStatus()
const daysLeft = parseInt(status.expires_in ?? '0')

if (daysLeft <= 7) {
  await client.refreshKey()
  console.log('Key refreshed — 30 days remaining')
}
```

---

### `getSchema()`

Returns the full built-in schema — all 70 extractable keys, grouped by category, with descriptions. No API key required.

```typescript
const client = new Searchology()
const schema = await client.getSchema()

console.log(schema.total_keys) // 70
console.log(schema.schema)
// {
//   product_identity: { product_type: '...', brand: '...', ... },
//   physical:         { color: '...', size: '...', ... },
//   ...
// }
```

**Returns:** `Promise<SchemaResult>`

```typescript
{
  total_keys: number,
  schema: Record<string, Record<string, string>>  // category → { key: description }
}
```

---

### `saveSchema(schema)`

Saves a custom schema against your API key. When you call `extract()` with `{ useCustomSchema: true }`, the API will extract **only** the fields you define here — nothing else. This is useful when your database has a specific set of columns and you don't want to process irrelevant fields.

You can use any of the 70 built-in key names, or define entirely custom keys for your domain.

```typescript
// Save once — matches your database columns exactly
await client.saveSchema({
  // built-in keys with your own descriptions
  product_type: 'type of product the user wants',
  color:        'main color of the product',
  price_max:    'maximum price as a plain number',
  material:     'material or fabric',

  // completely custom keys for your domain
  room:     'room the furniture is for e.g. bedroom, living room',
  warranty: 'warranty period if mentioned e.g. 1 year, lifetime',
})
```

Max 50 keys. Each value must be a plain string description that tells the AI what to extract.

**Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `schema` | `Record<string, string>` | An object where each key is a field name and each value is a string description. |

**Returns:** `Promise<SaveSchemaResult>`

```typescript
{
  message:    "Custom schema saved successfully",
  keys_saved: 6,
  keys:       ["product_type", "color", "price_max", "material", "room", "warranty"]
}
```

---

### `getCustomSchema()`

Returns the custom schema currently saved against your key.

```typescript
const result = await client.getCustomSchema()

if ('schema' in result) {
  console.log(result.keys_count) // 6
  console.log(result.schema)     // { product_type: '...', color: '...', ... }
} else {
  console.log(result.message) // "No custom schema saved. Using built-in schema."
}
```

**Returns:** `Promise<CustomSchemaResult | { custom_schema: null; message: string }>`

---

### `deleteCustomSchema()`

Removes your saved custom schema. Subsequent `extract()` calls (without `useCustomSchema: true`) will use the full built-in schema.

```typescript
await client.deleteCustomSchema()
```

**Returns:** `Promise<{ message: string }>`

---

## Understanding Confidence Scores

Every extracted attribute includes a `confidence` value between `0.3` and `1.0` that tells you how strongly the value is grounded in the query. The API only returns attributes that pass the `0.3` minimum threshold — anything below is considered unsupported and is excluded entirely.

| Score | Meaning | Example |
|-------|---------|---------|
| `1.0` | Explicitly stated word-for-word | `"black shoes"` → `color: black` |
| `0.85 – 0.95` | Strongly and unambiguously implied | `"MacBook Pro"` → `brand: apple` |
| `0.6 – 0.8` | Reasonably inferred from context | `"office outfit"` → `style: formal` |
| `0.3 – 0.55` | Weakly implied — plausible but uncertain | `"party dress"` → `style: formal` |

### Filtering by confidence

```typescript
const { result } = await client.extract('probably something casual maybe blue')

// Only use high-confidence extractions (≥ 0.8)
const confident = Object.fromEntries(
  Object.entries(result).filter(([, field]) => field.confidence >= 0.8)
)

// Or loop through all fields
for (const [key, field] of Object.entries(result)) {
  if (field.confidence >= 0.9) {
    console.log(`${key}: ${field.value} (very confident)`)
  }
}
```

### Accessing values

```typescript
const { result } = await client.extract('size 10 nike shoes under $80')

// Safe access with optional chaining
const brand    = result.brand?.value         // 'nike'
const maxPrice = result.price_max?.value     // 80
const size     = result.size?.value          // '10'

// TypeScript: value is typed as `unknown`, cast as needed
const price = result.price_max?.value as number
const color = result.color?.value as string
```

---

## Query Suggestions

When a query contains no extractable attributes — either because it is too vague or has no clear product intent — the API automatically generates 2–3 rephrased suggestions that a user could try instead.

```typescript
const data = await client.extract('something nice for the house')

if (data.keys_found === 0 && data.suggestions) {
  console.log(data.hint)
  // "No attributes found. Try one of the suggested queries above."

  console.log(data.suggestions)
  // [
  //   "modern grey sofa for living room under $600",
  //   "ceramic vase set for home decor",
  //   "LED floor lamp for bedroom"
  // ]
}
```

Suggestions are always diverse — they vary in product type, price range, and use-case so users have genuinely different directions to explore.

Suggestions are only present in the response when `keys_found === 0`. When at least one attribute is found, the `suggestions` and `hint` fields are omitted entirely.

---

## Custom Schema

By default, `extract()` uses the full built-in schema of 70 attributes. If your application only uses a subset of those — or needs fields that don't exist in the built-in schema — you can define exactly what to extract.

### When to use custom schema

- Your database has specific column names and you want the API output to match them directly
- You are building for a niche domain (car parts, medical supplies, industrial tools) with attributes the built-in schema doesn't cover
- You want to reduce response size and processing time by limiting extraction to only relevant fields

### Step-by-step

**1. Define and save your schema (do this once)**

```typescript
await client.saveSchema({
  // You can use built-in key names — the model understands them
  product_type: 'type of furniture e.g. sofa, table, chair, bed',
  material:     'material e.g. wood, fabric, leather, metal',
  color:        'main color of the item',
  price_max:    'maximum budget as a plain number',

  // Or define completely custom keys for your domain
  room:         'which room it is for e.g. living room, bedroom, kitchen',
  dimensions:   'size mentioned e.g. 3-seater, king size, L-shaped',
  assembly:     'return true if user wants ready-assembled or no-assembly items',
})
```

**2. Use it on any request**

```typescript
const data = await client.extract(
  '3-seater grey fabric sofa for living room under $700',
  { useCustomSchema: true }
)

console.log(data.result)
// {
//   product_type: { value: 'sofa',        confidence: 1.0 },
//   material:     { value: 'fabric',      confidence: 1.0 },
//   color:        { value: 'grey',        confidence: 1.0 },
//   room:         { value: 'living room', confidence: 1.0 },
//   price_max:    { value: 700,           confidence: 1.0 },
//   dimensions:   { value: '3-seater',    confidence: 1.0 }
// }

console.log(data.schema_used) // "custom"
```

**3. Manage your schema**

```typescript
// Check what's saved
const saved = await client.getCustomSchema()

// Remove it and revert to built-in
await client.deleteCustomSchema()
```

### Writing good descriptions

The quality of your extraction depends on how clearly you describe each field. A few principles:

```typescript
// ❌ Too vague — the model doesn't know what format to return
color: 'color'

// ✅ Clear — tells the model what to extract and how to return it
color: 'main color of the product e.g. red, blue, black, navy'

// ❌ Ambiguous boolean — doesn't tell the model when to fire
assembly: 'assembly info'

// ✅ Clear boolean — explicit trigger condition
assembly: 'return true if user wants ready-assembled or no-assembly required'

// ❌ No format guidance for a number field
price: 'price'

// ✅ Explicit format — avoids returning "$200" instead of 200
price_max: 'maximum price as a plain number without any currency symbol'
```

---

## Full Schema Reference

The built-in schema covers **70 attributes** across 12 categories. Call `getSchema()` to retrieve them programmatically with their full descriptions.

### Product Identity

| Key | Description |
|-----|-------------|
| `product_type` | The specific product object — `t-shirt`, `laptop`, `sofa`, `perfume`, `dog collar` |
| `product_name` | Named product — `iPhone 15 Pro`, `Air Jordan 1`, `Nutella` |
| `brand` | Brand name — `nike`, `apple`, `ikea`, `loreal` |
| `model` | Specific model or variant — `Galaxy S24 Ultra`, `MacBook Air M2` |
| `category` | Broad category — only when no `product_type` is found — `clothing`, `electronics` |
| `subcategory` | Refinement alongside `product_type` — `gaming laptop`, `noise-cancelling headphones` |

### Physical Attributes

| Key | Description |
|-----|-------------|
| `color` | Primary color — normalised to standard name — `black`, `navy blue`, `rose gold` |
| `color_secondary` | Second color if two are explicitly stated |
| `size` | Size as stated — `M`, `XL`, `UK 9`, `EU 42`, `queen`, `55 inch` |
| `size_type` | Sizing standard — `US`, `UK`, `EU`, `Asian` |
| `material` | Material or fabric — `cotton`, `leather`, `oak`, `stainless steel`, `ceramic` |
| `pattern` | Surface pattern — `striped`, `floral`, `checkered`, `solid`, `polka dot` |
| `shape` | Physical shape — `round`, `square`, `rectangular`, `oval` |
| `weight` | Weight — `lightweight`, `5kg`, `heavy duty`, `portable` |
| `dimensions` | Physical size — `55 inch`, `180×90cm`, `A4`, `L-shaped`, `compact` |
| `volume` | Liquid content — `100ml`, `500ml`, `1L` — perfumes, beverages, cleaning products |
| `capacity` | Holding capacity — `20L backpack`, `7kg washing machine`, `10000mAh power bank` |

### Target Person

| Key | Description |
|-----|-------------|
| `gender` | `male` \| `female` \| `unisex` |
| `age` | Numeric age — `8`, `25` |
| `age_group` | `newborn` \| `infant` \| `toddler` \| `kids` \| `tweens` \| `teen` \| `adult` \| `senior` |
| `relationship` | Who it is for — `daughter`, `wife`, `friend`, `colleague` |
| `profession` | Occupation — `doctor`, `chef`, `teacher`, `athlete` |
| `pet_type` | Pet the product is for — `dog`, `cat`, `bird`, `rabbit` |

### Occasion & Usage

| Key | Description |
|-----|-------------|
| `occasion` | Event — `birthday`, `wedding`, `eid`, `christmas`, `graduation`, `valentine's day` |
| `season` | `summer` \| `winter` \| `spring` \| `autumn` \| `monsoon` \| `all-season` |
| `weather` | Climate condition — `rain`, `snow`, `heat`, `humid`, `extreme cold` |
| `usage` | Use context — `office`, `gym`, `outdoor`, `travel`, `gaming`, `daily` |
| `activity` | Named activity — `running`, `hiking`, `swimming`, `yoga`, `cycling` |

### Pricing & Value

| Key | Description |
|-----|-------------|
| `price_max` | Maximum price — plain number — `80`, `5000`, `299` |
| `price_min` | Minimum price — plain number |
| `currency` | Inferred from symbol — `USD` `GBP` `EUR` `INR` `PKR` `AED` `JPY` |
| `budget_label` | `budget` \| `mid-range` \| `premium` \| `luxury` |
| `discount` | `true` when user wants sale / discounted items |

### Quality & Condition

| Key | Description |
|-----|-------------|
| `condition` | `new` \| `used` \| `refurbished` \| `open-box` |
| `quality_tier` | `basic` \| `standard` \| `premium` \| `professional` \| `industrial` |
| `rating_min` | Minimum rating — `4.5` (5-star), `4.0` (highly rated), `3.5` (well reviewed) |
| `certification` | `organic`, `waterproof`, `FDA approved`, `halal`, `cruelty-free`, `IP68` |

### Delivery & Availability

| Key | Description |
|-----|-------------|
| `delivery_speed` | `same-day` \| `next-day` \| `express` \| `standard` |
| `location` | Delivery destination — `Karachi`, `London`, `UAE` |
| `availability` | `in-stock` when user needs currently available items |
| `seller_type` | `official-store` \| `local-seller` \| `any` |

### Electronics & Tech

| Key | Description |
|-----|-------------|
| `storage` | Digital storage — `128GB`, `1TB`, `512GB` |
| `ram` | RAM — `8GB`, `16GB`, `32GB` |
| `battery` | Battery — `5000mAh`, `65W charging`, `all-day battery` |
| `display_size` | Screen size — `6.7 inch`, `27 inch`, `55 inch` |
| `refresh_rate` | Refresh rate — `60Hz`, `120Hz`, `144Hz`, `165Hz` |
| `camera` | Camera spec — `108MP`, `triple camera`, `4K video`, `OIS` |
| `connectivity` | Connections — `5G`, `WiFi 6`, `Bluetooth 5.0`, `USB-C`, `HDMI` |
| `operating_system` | OS — `Android`, `iOS`, `Windows 11`, `macOS`, `Linux` |
| `processor` | CPU/chip — `M2`, `Snapdragon 8 Gen 3`, `Intel Core i7`, `Ryzen 5` |
| `wattage` | Power rating — `65W`, `1500W`, `10W LED` |

### Style & Aesthetics

| Key | Description |
|-----|-------------|
| `style` | Design style — `casual`, `formal`, `vintage`, `streetwear`, `minimalist`, `Scandinavian` |
| `fit` | Garment fit — `slim fit`, `oversized`, `regular fit`, `relaxed`, `skinny` |
| `neckline` | Neckline — `v-neck`, `crew neck`, `turtleneck`, `off-shoulder`, `polo` |
| `sleeve` | Sleeve — `full sleeve`, `sleeveless`, `half sleeve`, `puff sleeve` |
| `length` | Length — `maxi`, `midi`, `mini`, `cropped`, `knee-length`, `longline` |
| `aesthetic` | Vibe — `cute`, `edgy`, `elegant`, `sporty`, `dark academia`, `Y2K` |

### Food, Health & Beauty

| Key | Description |
|-----|-------------|
| `dietary` | Dietary need — `halal`, `kosher`, `vegan`, `gluten-free`, `keto`, `organic` |
| `fragrance` | Scent — `unscented`, `lavender`, `oud`, `citrus`, `vanilla`, `fragrance-free` |

### Compatibility & Format

| Key | Description |
|-----|-------------|
| `compatibility` | Must work with — `iPhone 15`, `PS5`, `MacBook Pro`, `Toyota Camry 2023` |
| `format` | Product format — `hardcover`, `ebook`, `audiobook`, `vinyl`, `digital download` |
| `platform` | Platform — `PlayStation`, `Xbox`, `iOS`, `Android`, `Nintendo Switch` |
| `room` | Room — `living room`, `bedroom`, `kitchen`, `nursery`, `home office` |
| `skin_type` | Skin/hair type — `oily`, `dry`, `sensitive`, `acne-prone`, `curly`, `damaged` |

### Special Requirements

| Key | Description |
|-----|-------------|
| `eco_friendly` | `true` when user wants sustainable / recycled / biodegradable products |
| `handmade` | `true` when user wants handmade or artisan products |
| `customizable` | `true` when user wants personalized / engraved / custom products |
| `gift_wrap` | `true` when product is being bought as a gift for someone |
| `quantity` | Count or pack size — `2`, `5`, `bulk`, `pack of 6`, `dozen` |
| `language` | Language preference — `English`, `Urdu`, `Arabic`, `French` |

---

## TypeScript Support

The SDK ships with complete TypeScript definitions. No additional `@types` package is needed.

```typescript
import Searchology, {
  SearchologyConfig,
  SearchologyAPIError,
  CreateKeyResult,
  KeyStatusResult,
  KeyRefreshResult,
  SchemaResult,
  SaveSchemaResult,
  CustomSchemaResult,
  ExtractResult,
  ExtractedField,
} from 'searchology'

// All return types are fully typed
const data: ExtractResult = await client.extract('red shoes under $50')

// Access typed fields
const colorField: ExtractedField | undefined = data.result.color
const value: unknown = colorField?.value       // 'red'
const conf:  number  = colorField?.confidence  // 1.0

// Cast values to their expected types
const price = data.result.price_max?.value as number
const brand = data.result.brand?.value as string
const eco   = data.result.eco_friendly?.value as boolean
```

---

## Error Handling

All methods throw a `SearchologyAPIError` on failure. Always wrap calls in `try/catch`.

```typescript
import Searchology, { SearchologyAPIError } from 'searchology'

const client = new Searchology({ apiKey: process.env.SEARCHOLOGY_API_KEY })

try {
  const data = await client.extract('red shoes under $50')
  console.log(data.result)

} catch (err) {
  if (err instanceof SearchologyAPIError) {
    console.error('Status:',     err.status)     // e.g. 401
    console.error('Error code:', err.errorCode)  // e.g. 'unauthorized'
    console.error('Message:',    err.message)    // human-readable description
  } else {
    // Network failure, local validation error, or request timeout
    console.error(err)
  }
}
```

### Error codes

| HTTP Status | Error Code | Cause | Resolution |
|-------------|------------|-------|------------|
| `400` | `invalid_input` | Query is empty, missing, or not a string | Ensure `query` is a non-empty string |
| `400` | `query_too_long` | Query exceeds 500 characters | Shorten the query before sending |
| `400` | `no_custom_schema` | `useCustomSchema: true` but no schema saved | Call `saveSchema()` first |
| `400` | `invalid_schema` | Custom schema is malformed | Check schema format — each value must be a string |
| `401` | `unauthorized` | Invalid, revoked, or expired API key | Verify your key or call `refreshKey()` |
| `408` | `request_timeout` | Request exceeded the configured timeout | Increase `timeout` in config or retry |
| `413` | `prompt_too_large` | Query too large for the active model | Contact support or use a custom schema with fewer keys |
| `429` | `too_many_requests` | Exceeded 60 requests per minute | Wait and retry — see [Rate Limits](#rate-limits) |
| `500` | `extraction_failed` | Server or model error | Retry — this is usually transient |

### Handling rate limits with retry

```typescript
async function extractWithRetry(
  client: Searchology,
  query: string,
  retries = 3
): Promise<ExtractResult> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await client.extract(query)
    } catch (err) {
      if (err instanceof SearchologyAPIError && err.status === 429 && attempt < retries) {
        // Wait 60 seconds before retrying a rate-limited request
        await new Promise(resolve => setTimeout(resolve, 60_000))
        continue
      }
      throw err
    }
  }
  throw new Error('Max retries reached')
}
```

---

## CommonJS Support

The package ships both ESM (`.mjs`) and CommonJS (`.js`) builds. It works in any Node.js environment without configuration.

```javascript
// CommonJS
const { Searchology, SearchologyAPIError } = require('searchology')

const client = new Searchology({ apiKey: 'sgy_xxxxxxxx' })

client.extract('blue running shoes size 10')
  .then(data => {
    for (const [key, field] of Object.entries(data.result)) {
      console.log(`${key}: ${field.value} (${field.confidence})`)
    }
  })
  .catch(err => {
    if (err instanceof SearchologyAPIError) {
      console.error(err.errorCode, err.message)
    }
  })
```

---

## Examples

### E-commerce product search

```typescript
import Searchology from 'searchology'

const client = new Searchology({ apiKey: process.env.SEARCHOLOGY_API_KEY })

async function searchProducts(userQuery: string) {
  const { result, keys_found, suggestions } = await client.extract(userQuery)

  // Handle vague query — show suggestions to the user
  if (keys_found === 0) {
    return { products: [], suggestions }
  }

  // Build your database filters from the extracted attributes
  const filters: Record<string, unknown> = {}

  if (result.product_type)  filters.type       = result.product_type.value
  if (result.brand)         filters.brand      = result.brand.value
  if (result.color)         filters.color      = result.color.value
  if (result.size)          filters.size       = result.size.value
  if (result.material)      filters.material   = result.material.value
  if (result.gender)        filters.gender     = result.gender.value
  if (result.price_max)     filters.price_lte  = result.price_max.value
  if (result.price_min)     filters.price_gte  = result.price_min.value
  if (result.condition)     filters.condition  = result.condition.value

  // Apply confidence threshold — only use reliable extractions
  const reliableFilters = Object.fromEntries(
    Object.entries(result)
      .filter(([, field]) => field.confidence >= 0.7)
      .map(([key, field]) => [key, field.value])
  )

  const products = await db.products.findMany({ where: reliableFilters })
  return { products, filters: reliableFilters, keys_found }
}
```

### Electronics store with custom schema

```typescript
// Define schema matching your electronics database columns — save once
await client.saveSchema({
  product_type:     'type of device e.g. phone, laptop, tablet, earbuds, smartwatch',
  brand:            'brand name e.g. apple, samsung, sony, dell',
  ram:              'RAM in GB e.g. 8GB, 16GB, 32GB',
  storage:          'storage in GB or TB e.g. 128GB, 512GB, 1TB',
  display_size:     'screen size e.g. 6.7 inch, 15.6 inch, 27 inch',
  processor:        'chip or CPU e.g. M2, Snapdragon 8 Gen 3, Intel i7',
  battery:          'battery capacity e.g. 5000mAh, 65W charging, all-day',
  operating_system: 'OS e.g. Android, iOS, Windows 11, macOS',
  price_max:        'maximum budget as a plain number',
  condition:        'return one of: new, used, refurbished',
})

// Every extract call now returns only these 10 fields
const data = await client.extract(
  'MacBook Pro M3 16GB RAM 512GB SSD under $2000',
  { useCustomSchema: true }
)

// Build Elasticsearch / DB query directly from result
const query = Object.fromEntries(
  Object.entries(data.result).map(([key, field]) => [key, field.value])
)
// { product_type: 'laptop', brand: 'apple', ram: '16GB', storage: '512GB',
//   processor: 'M3', price_max: 2000, operating_system: 'macos' }
```

### Gift finder

```typescript
const data = await client.extract('birthday gift for my 10 year old son under £40')

const { result } = data

// result.occasion.value    → 'birthday'
// result.gift_wrap.value   → true
// result.age.value         → 10
// result.age_group.value   → 'kids'
// result.gender.value      → 'male'
// result.relationship.value→ 'son'
// result.price_max.value   → 40
// result.currency.value    → 'GBP'
```

### Auto-refresh before expiry

```typescript
async function initClient(): Promise<Searchology> {
  const client = new Searchology({ apiKey: process.env.SEARCHOLOGY_API_KEY })

  try {
    const status = await client.getKeyStatus()
    const daysLeft = parseInt(status.expires_in ?? '0')

    if (daysLeft <= 7) {
      await client.refreshKey()
      console.log('API key refreshed — 30 more days')
    }
  } catch {
    // Non-fatal — continue with existing key
  }

  return client
}
```

### Food and grocery search

```typescript
await client.saveSchema({
  product_type: 'type of food or grocery product',
  brand:        'brand name e.g. nestle, heinz, kelloggs',
  dietary:      'dietary restriction e.g. halal, vegan, gluten-free, organic',
  volume:       'size or volume e.g. 500ml, 1kg, 6-pack',
  price_max:    'maximum price as a plain number',
})

const data = await client.extract(
  'organic halal chicken stock 1L under £3',
  { useCustomSchema: true }
)
// {
//   product_type: { value: 'chicken stock', confidence: 1.0 },
//   dietary:      { value: 'organic, halal', confidence: 1.0 },
//   volume:       { value: '1L',            confidence: 1.0 },
//   price_max:    { value: 3,               confidence: 1.0 },
//   currency:     { value: 'GBP',           confidence: 1.0 }
// }
```

---

## Rate Limits

| Limit | Value |
|-------|-------|
| Requests per minute | 60 per API key |
| Query max length | 500 characters |
| Custom schema max keys | 50 |
| API key expiry | 30 days (refreshable) |

When you exceed 60 requests per minute, the API returns HTTP `429` with `retry_after_seconds: 60`. Wait the specified time before retrying. See the [error handling example](#handling-rate-limits-with-retry) above for a retry pattern.

---

## License

MIT — see [LICENSE](LICENSE) for details.

---
