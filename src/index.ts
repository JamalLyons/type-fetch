import {
	type CacheEntry,
	type ContentType,
	type ContentWrapper,
	DEFAULT_MAX_CACHED_ENTRIES,
	DEFAULT_RETRY_COUNT,
	DEFAULT_RETRY_DELAY,
	type RequestCacheOptions,
	type Result,
	type TFetchClientOptions,
	TFetchError,
	Time,
	type UrlOrString,
} from "@/types";

/**
 * TFetchClient class provides a wrapper around the Fetch API with features
 * such as retry logic, request caching, and configurable content types.
 *
 * @param opts Configuration options for the client.
 *
 * @returns An instance of TFetchClient.
 */
class TFetchClient {
	public readonly config: TFetchClientOptions;
	private cache: Map<string, CacheEntry<unknown>>;

	/**
	 * Creates an instance of TFetchClient with optional configuration.
	 * @param opts Configuration options for the client.
	 */
	public constructor(opts?: Partial<TFetchClientOptions>) {
		this.config = {
			debug: opts?.debug ?? false,
			headers: opts?.headers ?? {},
			deleteHandling: opts?.deleteHandling ?? "empty",
			retry: {
				count: opts?.retry?.count ?? DEFAULT_RETRY_COUNT,
				delay: opts?.retry?.delay ?? DEFAULT_RETRY_DELAY,
				onRetry: opts?.retry?.onRetry,
			},
			cache: {
				enabled: opts?.cache?.enabled ?? false,
				maxAge: opts?.cache?.maxAge ?? Time.Minute * 5,
				maxCachedEntries:
					opts?.cache?.maxCachedEntries ?? DEFAULT_MAX_CACHED_ENTRIES,
			},
		};
		this.cache = new Map();
		this.debug("TFetch Client initialized");
	}

	/**
	 * Performs a GET request with optional cache configuration.
	 * @template T The expected response type.
	 * @param url The URL to fetch from.
	 * @param options Optional request options including headers and cache configuration.
	 * @returns A promise resolving to the result of the request.
	 */
	public async get<T>(
		url: UrlOrString,
		options?: {
			headers?: HeadersInit;
			cache?: RequestCacheOptions;
		},
	): Promise<Result<T>> {
		const mergedHeaders = this.mergeHeaders(
			this.config.headers ?? {},
			options?.headers ?? {},
		);
		const ckey = this.generateCacheKey(url, "GET", mergedHeaders);

		// Determine cache configuration, prioritizing per-request over global
		const cacheEnabled = options?.cache?.enabled ?? this.config.cache?.enabled;
		const cacheMaxAge = options?.cache?.maxAge ?? this.config.cache?.maxAge;

		if (cacheEnabled) {
			const cached = this.getFromCache<T>(ckey);
			if (cached) {
				this.debug(`Cached response found for ${url}`);
				return { data: cached, error: null };
			}
		}

		const result = await this.handleRequest<T>(
			() => fetch(url.toString(), { headers: mergedHeaders }),
			"GET",
		);

		if (cacheEnabled && result.data)
			this.saveToCache(ckey, result.data, cacheMaxAge);

		return result;
	}

	/**
	 * Prepares the body for a request based on the content type.
	 * Focuses on transforming and validating the input data.
	 * @param body The content wrapper containing the type and data.
	 * @returns A prepared content wrapper with potentially transformed data.
	 */
	private prepareBody(body: ContentWrapper<unknown>): ContentWrapper<unknown> {
		// Validate input
		if (!body || !body.type || body.data === undefined) {
			throw new TFetchError("Invalid body: type and data are required", 400);
		}

		// Handle different content types
		switch (body.type) {
			case "form":
				// Convert object to FormData
				if (typeof body.data === "object" && !(body.data instanceof FormData)) {
					const formData = new FormData();
					for (const [key, value] of Object.entries(
						body.data as Record<string, unknown>,
					)) {
						// Handle different types of form data
						if (value instanceof File) {
							formData.append(key, value);
						} else if (value instanceof Blob) {
							formData.append(key, value, key);
						} else {
							formData.append(key, String(value));
						}
					}
					return { type: "form", data: formData };
				}
				break;

			case "multipart":
				// Ensure data is FormData
				if (!(body.data instanceof FormData)) {
					throw new TFetchError(
						"Multipart data must be a FormData instance",
						400,
					);
				}
				break;

			case "json":
				// Validate JSON data
				if (body.data === null || body.data === undefined) {
					throw new TFetchError("JSON body cannot be null or undefined", 400);
				}
				break;

			case "text":
				// Convert to string
				return {
					type: "text",
					data:
						body.data !== null && body.data !== undefined
							? String(body.data)
							: "",
				};

			case "blob":
				// Ensure data is a Blob
				if (!(body.data instanceof Blob)) {
					try {
						return {
							type: "blob",
							data: new Blob([JSON.stringify(body.data)], {
								type: "application/json",
							}),
						};
					} catch (error) {
						throw new TFetchError("Unable to convert data to Blob", 400);
					}
				}
				break;

			default:
				throw new TFetchError(`Unsupported content type: ${body.type}`, 400);
		}

		return body;
	}

	/**
	 * Serializes the body for network transmission.
	 * Converts prepared body to a format suitable for fetch.
	 * @param body The prepared content wrapper.
	 * @returns Serialized body ready for network transmission.
	 */
	private serializeBody(
		body: ContentWrapper<unknown>,
	): string | FormData | Blob | undefined {
		// Handle null or undefined data
		if (body.data === null || body.data === undefined) {
			return undefined;
		}

		switch (body.type) {
			case "json":
				try {
					return JSON.stringify(body.data);
				} catch (error) {
					throw new TFetchError(
						`Failed to serialize JSON data: ${
							error instanceof Error ? error.message : "Unknown error"
						}`,
						400,
					);
				}

			case "form":
			case "multipart":
				// FormData is already in the correct format
				return body.data as FormData;

			case "text":
				return String(body.data);

			case "blob":
				return body.data as Blob;

			default:
				throw new TFetchError(
					`Cannot serialize content type: ${body.type}`,
					400,
				);
		}
	}

	/**
	 * Performs a POST request with optional cache configuration.
	 * @template T The expected response type.
	 * @param url The URL to post to.
	 * @param body The request body.
	 * @param options Optional request options including headers and cache configuration.
	 * @returns A promise resolving to the result of the request.
	 */
	public async post<T>(
		url: UrlOrString,
		body: ContentWrapper<unknown>,
		options?: {
			headers?: HeadersInit;
			cache?: RequestCacheOptions;
		},
	): Promise<Result<T>> {
		const mergedHeaders = this.mergeHeaders(
			this.config.headers ?? {},
			this.getHeaders(body.type),
			options?.headers ?? {},
		);
		const actualBody = this.prepareBody(body);
		const serialized = this.serializeBody(actualBody);
		const ckey = this.generateCacheKey(url, "POST", mergedHeaders, serialized);

		// Determine cache configuration, prioritizing per-request over global
		const cacheEnabled = options?.cache?.enabled ?? this.config.cache?.enabled;
		const cacheMaxAge = options?.cache?.maxAge ?? this.config.cache?.maxAge;

		if (cacheEnabled) {
			const cached = this.getFromCache<T>(ckey);
			if (cached) {
				this.debug(`Cached response found for ${url}`);
				return { data: cached, error: null };
			}
		}

		const result = await this.handleRequest<T>(
			() =>
				fetch(url.toString(), {
					method: "POST",
					headers: mergedHeaders,
					body: serialized,
				}),
			"POST",
		);

		if (cacheEnabled && result.data)
			this.saveToCache(ckey, result.data, cacheMaxAge);

		return result;
	}

	/**
	 * Performs a PUT request with optional cache configuration.
	 * @template T The expected response type.
	 * @param url The URL to put to.
	 * @param body The request body.
	 * @param options Optional request options including headers and cache configuration.
	 * @returns A promise resolving to the result of the request.
	 */
	public async put<T>(
		url: UrlOrString,
		body: ContentWrapper<unknown>,
		options?: {
			headers?: HeadersInit;
			cache?: RequestCacheOptions;
		},
	): Promise<Result<T>> {
		const mergedHeaders = this.mergeHeaders(
			this.config.headers ?? {},
			this.getHeaders(body.type),
			options?.headers ?? {},
		);
		const actualBody = this.prepareBody(body);
		const serialized = this.serializeBody(actualBody);
		const ckey = this.generateCacheKey(url, "PUT", mergedHeaders, serialized);

		// Determine cache configuration, prioritizing per-request over global
		const cacheEnabled = options?.cache?.enabled ?? this.config.cache?.enabled;
		const cacheMaxAge = options?.cache?.maxAge ?? this.config.cache?.maxAge;

		if (cacheEnabled) {
			const cached = this.getFromCache<T>(ckey);
			if (cached) {
				this.debug(`Cached response found for ${url}`);
				return { data: cached, error: null };
			}
		}

		const result = await this.handleRequest<T>(
			() =>
				fetch(url.toString(), {
					method: "PUT",
					headers: mergedHeaders,
					body: serialized,
				}),
			"PUT",
		);

		if (cacheEnabled && result.data)
			this.saveToCache(ckey, result.data, cacheMaxAge);

		return result;
	}

	/**
	 * Performs a PATCH request with optional cache configuration.
	 * @template T The expected response type.
	 * @param url The URL to patch to.
	 * @param body The request body.
	 * @param options Optional request options including headers and cache configuration.
	 * @returns A promise resolving to the result of the request.
	 */
	public async patch<T>(
		url: UrlOrString,
		body: ContentWrapper<unknown>,
		options?: {
			headers?: HeadersInit;
			cache?: RequestCacheOptions;
		},
	): Promise<Result<T>> {
		const mergedHeaders = this.mergeHeaders(
			this.config.headers ?? {},
			this.getHeaders(body.type),
			options?.headers ?? {},
		);
		const actualBody = this.prepareBody(body);
		const serialized = this.serializeBody(actualBody);
		const ckey = this.generateCacheKey(url, "PATCH", mergedHeaders, serialized);

		// Determine cache configuration, prioritizing per-request over global
		const cacheEnabled = options?.cache?.enabled ?? this.config.cache?.enabled;
		const cacheMaxAge = options?.cache?.maxAge ?? this.config.cache?.maxAge;

		if (cacheEnabled) {
			const cached = this.getFromCache<T>(ckey);
			if (cached) {
				this.debug(`Cached response found for ${url}`);
				return { data: cached, error: null };
			}
		}

		const result = await this.handleRequest<T>(
			() =>
				fetch(url.toString(), {
					method: "PATCH",
					headers: mergedHeaders,
					body: serialized,
				}),
			"PATCH",
		);

		if (cacheEnabled && result.data)
			this.saveToCache(ckey, result.data, cacheMaxAge);

		return result;
	}

	/**
	 * Performs a DELETE request with optional cache configuration.
	 * @template T The expected response type.
	 * @param url The URL to delete from.
	 * @param options Optional request options including headers and cache configuration.
	 * @returns A promise resolving to the result of the request.
	 */
	public async delete<T>(
		url: UrlOrString,
		options?: {
			headers?: HeadersInit;
			cache?: RequestCacheOptions;
		},
	): Promise<Result<T>> {
		const mergedHeaders = this.mergeHeaders(
			this.config.headers ?? {},
			options?.headers ?? {},
		);
		const ckey = this.generateCacheKey(url, "DELETE", mergedHeaders);

		// Determine cache configuration, prioritizing per-request over global
		const cacheEnabled = options?.cache?.enabled ?? this.config.cache?.enabled;
		const cacheMaxAge = options?.cache?.maxAge ?? this.config.cache?.maxAge;

		if (cacheEnabled) {
			const cached = this.getFromCache<T>(ckey);
			if (cached) {
				this.debug(`Cached response found for ${url}`);
				return { data: cached, error: null };
			}
		}

		const result = await this.handleRequest<T>(
			() => fetch(url.toString(), { method: "DELETE", headers: mergedHeaders }),
			"DELETE",
		);

		if (cacheEnabled && result.data)
			this.saveToCache(ckey, result.data, cacheMaxAge);

		return result;
	}

	/**
	 * Performs a HEAD request with optional cache configuration.
	 * @template T The expected response type.
	 * @param url The URL to head to.
	 * @param options Optional request options including headers and cache configuration.
	 * @returns A promise resolving to the result of the request.
	 */
	public async head<T>(
		url: UrlOrString,
		options?: {
			headers?: HeadersInit;
			cache?: RequestCacheOptions;
		},
	): Promise<Result<T>> {
		const mergedHeaders = this.mergeHeaders(
			this.config.headers ?? {},
			options?.headers ?? {},
		);
		const ckey = this.generateCacheKey(url, "HEAD", mergedHeaders);

		// Determine cache configuration, prioritizing per-request over global
		const cacheEnabled = options?.cache?.enabled ?? this.config.cache?.enabled;
		const cacheMaxAge = options?.cache?.maxAge ?? this.config.cache?.maxAge;

		if (cacheEnabled) {
			const cached = this.getFromCache<T>(ckey);
			if (cached) {
				this.debug(`Cached response found for ${url}`);
				return { data: cached, error: null };
			}
		}

		const result = await this.handleRequest<T>(
			() => fetch(url.toString(), { method: "HEAD", headers: mergedHeaders }),
			"HEAD",
		);

		if (cacheEnabled && result.data)
			this.saveToCache(ckey, result.data, cacheMaxAge);

		return result;
	}

	/**
	 * Handles the execution of a request with retry logic.
	 * @template T The expected type of the response data.
	 * @param request A function that returns a promise resolving to a Response object.
	 * @param method The HTTP method used for the request.
	 * @returns A promise resolving to the result of the request.
	 */
	private async handleRequest<T>(
		request: () => Promise<Response>,
		method?: string,
	): Promise<Result<T>> {
		let attempts = 0;
		const maxRetries = this.config.retry.count ?? DEFAULT_RETRY_COUNT;
		const delay = this.config.retry.delay ?? DEFAULT_RETRY_DELAY;
		let lastError: Error | null = null;

		while (attempts <= maxRetries) {
			try {
				const res = await request();
				if (!res.ok) {
					const errorText = await res.text();
					return {
						data: null,
						error: new TFetchError(errorText, res.status),
					};
				}
				// Handle DELETE request responses based on configuration
				if (method === "DELETE" && res.headers.get("Content-Length") === "0") {
					switch (this.config.deleteHandling) {
						case "empty":
							return { data: null, error: null };
						case "status":
							return { data: res.status as unknown as T, error: null };
						case "json":
							try {
								return { data: (await res.json()) as T, error: null };
							} catch {
								return { data: null, error: null };
							}
					}
				}
				return { data: (await res.json()) as T, error: null };
			} catch (error) {
				lastError = error as Error;
				if (attempts++ < maxRetries) {
					this.config.retry.onRetry?.();
					await new Promise((r) => setTimeout(r, delay));
				} else {
					return {
						data: null,
						error: new TFetchError(
							lastError.message || "Request failed after max retries",
							lastError instanceof TFetchError ? lastError.status : undefined,
						),
					};
				}
			}
		}
		return {
			data: null,
			error: new TFetchError("Max retries exceeded"),
		};
	}

	/**
	 * Merges multiple header sources into a single Headers object.
	 * @param sources Header sources to merge.
	 * @returns Merged Headers object.
	 */
	private mergeHeaders(...sources: (HeadersInit | undefined)[]): Headers {
		const headers = new Headers();
		for (const src of sources) {
			if (!src) continue;
			new Headers(src).forEach((v, k) => headers.set(k, v));
		}
		return headers;
	}

	/**
	 * Generates a comprehensive cache key based on the request details.
	 * @param url The URL or string representing the endpoint.
	 * @param method The HTTP method used.
	 * @param headers Headers used in the request.
	 * @param body Optional request body for non-GET requests.
	 * @returns A string representing the cache key.
	 */
	private generateCacheKey(
		url: UrlOrString,
		method: string,
		headers?: HeadersInit,
		body?: string | Blob | FormData,
	): string {
		// Normalize URL
		const normalizedUrl = url.toString();

		// Include method in the cache key to differentiate between request types
		const methodPart = method.toUpperCase();

		// Only include essential headers for caching
		const essentialHeaders = headers
			? Object.entries(headers)
					.filter(
						([key]) =>
							key.toLowerCase() === "authorization" ||
							key.toLowerCase() === "content-type",
					)
					.sort(([a], [b]) => a.localeCompare(b))
					.map(([key, value]) => `${key}:${value}`)
					.join("|")
			: "";

		// Include body hash for non-GET requests to create unique cache entries
		const bodyPart = body
			? body instanceof FormData
				? Array.from(body.entries())
						.map(([k, v]) => `${k}:${v}`)
						.join("|")
				: this.hashCode(body.toString())
			: "";

		return `${methodPart}|${normalizedUrl}|${essentialHeaders}|${bodyPart}`;
	}

	/**
	 * Simple hash function to create a unique identifier for body content.
	 * @param str The string to hash.
	 * @returns A numeric hash of the input string.
	 */
	private hashCode(str: string): number {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return Math.abs(hash);
	}

	/**
	 * Saves the response data to the cache with the specified key.
	 * @template T The type of the data being cached.
	 * @param key The cache key under which the data will be stored.
	 * @param data The data to be cached.
	 * @param customMaxAge Optional custom max age for this specific cache entry.
	 */
	private saveToCache<T>(key: string, data: T, customMaxAge?: number): void {
		this.cleanupCache();

		// Use custom max age if provided, otherwise use global setting
		const maxAge = customMaxAge ?? this.config.cache?.maxAge ?? Time.Minute * 5;

		this.cache.set(key, {
			data,
			timestamp: Date.now(),
			expiresAt: Date.now() + maxAge,
		});
	}

	/**
	 * Retrieves data from the cache using the specified key.
	 * @template T The expected type of the cached data.
	 * @param key The cache key to look up.
	 * @returns The cached data if found and not expired, or null if not found.
	 */
	private getFromCache<T>(key: string): T | null {
		const entry = this.cache.get(key);
		if (!entry) return null;

		// Check if entry has expired
		const now = Date.now();
		if (entry.expiresAt && now > entry.expiresAt) {
			this.cache.delete(key);
			return null;
		}

		return entry.data as T;
	}

	/**
	 * Removes the oldest entries from the cache if the maxCachedEntries limit has been reached.
	 */
	private cleanupCache(): void {
		const maxEntries = this.config.cache?.maxCachedEntries ?? 0;
		if (this.cache.size >= maxEntries) {
			// Only create array of entries that need to be deleted
			const entriesToDelete = Array.from(this.cache.entries())
				.sort((a, b) => a[1].timestamp - b[1].timestamp)
				.slice(0, Math.floor(this.cache.size * 0.25))
				.map(([key]) => key);

			// Batch delete operations
			for (const key of entriesToDelete) {
				this.cache.delete(key);
			}
		}
	}

	/**
	 * Returns appropriate headers for the specified content type.
	 * @param type The content type for which headers are needed.
	 * @returns An object representing the headers.
	 */
	private getHeaders(type: ContentType): HeadersInit {
		return (
			{
				json: { "Content-Type": "application/json" },
				form: { "Content-Type": "application/x-www-form-urlencoded" },
				text: { "Content-Type": "text/plain" },
				blob: { "Content-Type": "application/octet-stream" },
				multipart: { "Content-Type": "multipart/form-data" },
				xml: { "Content-Type": "application/xml" },
				html: { "Content-Type": "text/html" },
			}[type] ?? {}
		);
	}

	/**
	 * Logs a debug message if debug mode is enabled.
	 * @param message The message to log.
	 */
	private debug(message: string): void {
		if (this.config.debug) console.log(`[DEBUG] ${message}`);
	}
}

export { TFetchClient };
export type { TFetchClientOptions };
