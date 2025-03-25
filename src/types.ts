/**
 * Interface defining the configuration options for the TFetchClient.
 */
export interface TFetchClientOptions {
	/** Enable or disable debug logging. */
	debug?: boolean;
	/** Default headers to be included in all requests. */
	headers?: HeadersInit;
	/** How to handle DELETE request responses */
	deleteHandling?: "empty" | "status" | "json";
	retry: {
		/** Number of retry attempts for failed requests. @default 0 */
		count?: number;
		/** Delay between retry attempts in milliseconds. @default 1 second */
		delay?: number;
		/** Callback function executed on each retry. @default undefined */
		onRetry?: () => void;
	};
	cache: {
		/** Enable or disable caching for requests. @default false */
		enabled?: boolean;
		/** Maximum age for cache entries in milliseconds. @default 5 minutes */
		maxAge?: number;
		/**
		 * Maximum number of cache entries before a cleanup is triggered.
		 * When this limit is hit, a cleanup is triggered and the oldest 25% of entries are removed.
		 * @default 5,000
		 */
		maxCachedEntries?: number;
	};
}

/**
 * A type representing a URL or string.
 */
export type UrlOrString = string | URL;

/**
 * A generic type representing the result of an asynchronous operation.
 * @template T The type of the data returned on success.
 * @template E The type of the error returned on failure (default is TFetchError).
 */
export type Result<T, E = TFetchError> = { data: T | null; error: E | null };

/**
 * Supported content types for requests.
 */
export type ContentType =
	| "json"
	| "form"
	| "text"
	| "blob"
	| "multipart"
	| "xml"
	| "html";

/**
 * Interface wrapping content with its associated content type.
 * @template T The type of the data being wrapped.
 */
export interface ContentWrapper<T> {
	type: ContentType;
	data: T;
}

/**
 * Interface representing a cache entry.
 * @template T The type of the data stored in the cache.
 */
export interface CacheEntry<T> {
	data: T;
	timestamp: number;
	/** Optional expiration time for this specific cache entry */
	expiresAt?: number;
}

/**
 * Options for caching a specific request
 */
export interface RequestCacheOptions {
	/** Override the global cache maxAge for this specific request */
	maxAge?: number;
	/** Whether to enable caching for this specific request */
	enabled?: boolean;
}

/**
 * An error class for TFetchClient.
 * @param message The error message.
 * @param status Optional HTTP status code associated with the error.
 * @returns A new TFetchError instance.
 */
export class TFetchError extends Error {
	public readonly status?: number;
	public readonly originalError?: Error;

	constructor(message: string, status?: number, originalError?: Error) {
		super(message);
		this.name = "TFetchError";
		this.status = status;
		this.originalError = originalError;

		// Ensure proper prototype chain for instanceof checks
		Object.setPrototypeOf(this, TFetchError.prototype);
	}
}

export const DEFAULT_RETRY_COUNT = 0;
export const DEFAULT_RETRY_DELAY = 1000;
export const DEFAULT_MAX_CACHED_ENTRIES = 5000;

/**
 * Enumeration of time constants in milliseconds.
 */
export enum Time {
	Second = 1000,
	Minute = 60 * Time.Second,
	Hour = 60 * Time.Minute,
	Day = 24 * Time.Hour,
}
