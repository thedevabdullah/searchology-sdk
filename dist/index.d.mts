interface SearchologyConfig {
    apiKey?: string;
    baseUrl?: string;
}
interface CreateKeyResult {
    message: string;
    id: string;
    key: string;
    name: string;
    created_at: string;
}
interface ExtractResult {
    query: string;
    result: SearchAttributes;
    keys_found: number;
    latency_ms: number;
}
interface SearchAttributes {
    product_type?: string;
    product_name?: string;
    brand?: string;
    model?: string;
    category?: string;
    subcategory?: string;
    color?: string;
    color_secondary?: string;
    size?: string;
    size_type?: string;
    material?: string;
    pattern?: string;
    shape?: string;
    weight?: string;
    dimensions?: string;
    gender?: 'male' | 'female' | 'unisex';
    age?: number;
    age_group?: string;
    relationship?: string;
    profession?: string;
    occasion?: string;
    season?: string;
    weather?: string;
    usage?: string;
    activity?: string;
    price_max?: number;
    price_min?: number;
    currency?: string;
    budget_label?: 'budget' | 'mid-range' | 'premium' | 'luxury';
    discount?: boolean;
    condition?: 'new' | 'used' | 'refurbished' | 'open-box';
    quality_tier?: string;
    rating_min?: number;
    certification?: string;
    delivery_speed?: 'same-day' | 'next-day' | 'express' | 'standard';
    location?: string;
    availability?: string;
    seller_type?: string;
    storage?: string;
    ram?: string;
    battery?: string;
    display_size?: string;
    connectivity?: string;
    operating_system?: string;
    processor?: string;
    style?: string;
    fit?: string;
    neckline?: string;
    sleeve?: string;
    aesthetic?: string;
    eco_friendly?: boolean;
    handmade?: boolean;
    customizable?: boolean;
    gift_wrap?: boolean;
    quantity?: number | string;
    language?: string;
    [key: string]: unknown;
}
interface SearchologyError {
    error: string;
    message: string;
}
declare class Searchology {
    private apiKey;
    private baseUrl;
    constructor(config?: SearchologyConfig);
    /**
     * Create a new API key. No authentication needed.
     * Call this once, save the returned key, then use it for extract().
     *
     * @param name — a label for this key (your app name, your name, etc.)
     * @returns CreateKeyResult with your key — save it, shown only once
     *
     * @example
     * const client = new Searchology()
     * const { key } = await client.createApiKey('my-app')
     * // save key to your .env or config
     * // key = 'sk_live_xxxxxxxxxxxxxxxx'
     */
    createApiKey(name: string): Promise<CreateKeyResult>;
    /**
     * Extract structured attributes from a natural language query.
     * Requires an API key — either passed in constructor or via createApiKey().
     *
     * @param query — plain English search query (max 500 chars)
     * @returns structured JSON with extracted attributes
     *
     * @example
     * const client = new Searchology({ apiKey: 'sk_live_xxxxxxxx' })
     * const { result } = await client.extract('black t-shirt under $15')
     * // { color: 'black', product_type: 't-shirt', price_max: 15 }
     */
    extract(query: string): Promise<ExtractResult>;
}
declare class SearchologyAPIError extends Error {
    status: number;
    errorCode: string;
    constructor(message: string, status: number, errorCode: string);
}

export { type CreateKeyResult, type ExtractResult, type SearchAttributes, Searchology, SearchologyAPIError, type SearchologyConfig, type SearchologyError, Searchology as default };
