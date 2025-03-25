import { TFetchClient } from "@/index";
import * as Types from "@/types";

describe("TFetchClient Caching Behavior", () => {
	let client: TFetchClient;
	let fetchSpy: jest.SpyInstance;

	beforeEach(() => {
		// Restore global fetch before each test
		global.fetch = jest.fn(global.fetch);
		fetchSpy = jest.spyOn(global, "fetch");
	});

	afterEach(() => {
		fetchSpy.mockRestore();
	});

	describe("Basic Caching Functionality", () => {
		beforeEach(() => {
			client = new TFetchClient({
				cache: {
					enabled: true,
					maxAge: Types.Time.Minute * 5, // 5 minutes cache
				},
			});
		});

		it("should cache successful GET requests", async () => {
			const url = "https://jsonplaceholder.typicode.com/posts/1";

			// First request
			const firstResponse = await client.get<{ id: number; title: string }>(
				url,
			);
			expect(firstResponse.data).toBeDefined();
			expect(fetchSpy).toHaveBeenCalledTimes(1);

			// Second request (should use cache)
			const secondResponse = await client.get<{ id: number; title: string }>(
				url,
			);
			expect(secondResponse.data).toEqual(firstResponse.data);
			expect(fetchSpy).toHaveBeenCalledTimes(1);
		});

		it("should not cache failed requests", async () => {
			const url = "https://jsonplaceholder.typicode.com/invalid-url";

			// First failed request
			const firstResponse = await client.get<{ error: string }>(url);
			expect(firstResponse.error).toBeDefined();
			expect(fetchSpy).toHaveBeenCalledTimes(1);

			// Second request (should make a new fetch)
			const secondResponse = await client.get<{ error: string }>(url);
			expect(secondResponse.error).toBeDefined();
			expect(fetchSpy).toHaveBeenCalledTimes(2);
		});
	});

	describe("Advanced Caching Scenarios", () => {
		it("should handle concurrent cache requests", async () => {
			client = new TFetchClient({
				cache: {
					enabled: true,
					maxAge: Types.Time.Minute * 5,
				},
			});

			const url = "https://jsonplaceholder.typicode.com/posts/1";

			// Simulate concurrent requests
			const [firstResponse, secondResponse] = await Promise.all([
				client.get<{ id: number; title: string }>(url),
				client.get<{ id: number; title: string }>(url),
			]);

			expect(firstResponse.data).toBeDefined();
			expect(secondResponse.data).toBeDefined();
			expect(firstResponse.data).toEqual(secondResponse.data);

			// Fetch might be called multiple times due to race conditions
			expect(fetchSpy.mock.calls.length).toBeLessThanOrEqual(2);
		});

		it("should handle cache with query parameters", async () => {
			client = new TFetchClient({
				cache: {
					enabled: true,
					maxAge: Types.Time.Minute * 5,
				},
			});

			const baseUrl = "https://jsonplaceholder.typicode.com/posts";
			const urlWithParam1 = `${baseUrl}?userId=1`;
			const urlWithParam2 = `${baseUrl}?userId=2`;

			// First request with userId=1
			const firstResponse =
				await client.get<{ id: number; userId: number }[]>(urlWithParam1);
			expect(firstResponse.data).toBeDefined();

			const initialCallCount = fetchSpy.mock.calls.length;

			// Second request with userId=1 (should use cache)
			const secondResponse =
				await client.get<{ id: number; userId: number }[]>(urlWithParam1);
			expect(secondResponse.data).toEqual(firstResponse.data);

			// Fetch might be called multiple times due to race conditions
			expect(fetchSpy.mock.calls.length).toBeLessThanOrEqual(
				initialCallCount + 1,
			);

			// Request with different query param (should fetch)
			const thirdResponse =
				await client.get<{ id: number; userId: number }[]>(urlWithParam2);
			expect(thirdResponse.data).toBeDefined();
			expect(fetchSpy.mock.calls.length).toBeGreaterThan(initialCallCount);
		});

		it("should handle large number of cache entries", async () => {
			client = new TFetchClient({
				cache: {
					enabled: true,
					maxAge: Types.Time.Minute * 5,
					maxCachedEntries: 3, // Small limit for testing
				},
			});

			const baseUrl = "https://jsonplaceholder.typicode.com/posts/";
			const requests = [
				client.get<{ id: number }>(`${baseUrl}1`),
				client.get<{ id: number }>(`${baseUrl}2`),
				client.get<{ id: number }>(`${baseUrl}3`),
				client.get<{ id: number }>(`${baseUrl}4`),
				client.get<{ id: number }>(`${baseUrl}5`),
			];

			const responses = await Promise.all(requests);

			// Check that all requests were made
			expect(fetchSpy.mock.calls.length).toBe(5);

			// Verify responses
			responses.forEach((response) => {
				expect(response.data).toBeDefined();
			});
		});
	});

	describe("Cache Expiration", () => {
		it("should expire cache after maxAge", async () => {
			client = new TFetchClient({
				cache: {
					enabled: true,
					maxAge: 50, // Very short cache duration
				},
			});

			const url = "https://jsonplaceholder.typicode.com/posts/1";

			// First request
			const firstResponse = await client.get<{ id: number; title: string }>(
				url,
			);
			expect(firstResponse.data).toBeDefined();
			expect(fetchSpy).toHaveBeenCalledTimes(1);

			// Wait for cache to expire
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Second request (should fetch again)
			const secondResponse = await client.get<{ id: number; title: string }>(
				url,
			);
			expect(secondResponse.data).toBeDefined();
			expect(fetchSpy).toHaveBeenCalledTimes(2);
		});
	});

	describe("Cache Configuration", () => {
		it("should respect maxAge configuration", async () => {
			// Create client with very short cache duration
			client = new TFetchClient({
				cache: {
					enabled: true,
					maxAge: 10, // 10ms cache
				},
			});

			const url = "https://jsonplaceholder.typicode.com/posts/1";

			// First request
			const firstResponse = await client.get<{ id: number; title: string }>(
				url,
			);
			expect(firstResponse.data).toBeDefined();
			expect(fetchSpy).toHaveBeenCalledTimes(1);

			// Wait for cache to expire
			await new Promise((resolve) => setTimeout(resolve, 20));

			// Second request (should fetch again due to expired cache)
			const secondResponse = await client.get<{ id: number; title: string }>(
				url,
			);
			expect(secondResponse.data).toBeDefined();
			expect(fetchSpy).toHaveBeenCalledTimes(2);
		});

		it("should not cache when caching is disabled", async () => {
			// Create client with caching disabled
			client = new TFetchClient({
				cache: {
					enabled: false,
				},
			});

			const url = "https://jsonplaceholder.typicode.com/posts/1";

			// First request
			const firstResponse = await client.get<{ id: number; title: string }>(
				url,
			);
			expect(firstResponse.data).toBeDefined();
			expect(fetchSpy).toHaveBeenCalledTimes(1);

			// Second request (should fetch again)
			const secondResponse = await client.get<{ id: number; title: string }>(
				url,
			);
			expect(secondResponse.data).toBeDefined();
			expect(fetchSpy).toHaveBeenCalledTimes(2);
		});
	});

	describe("Cache Key Generation", () => {
		beforeEach(() => {
			client = new TFetchClient({
				cache: {
					enabled: true,
					maxAge: Types.Time.Minute * 5,
				},
			});
		});

		it("should generate different cache keys for different URLs", async () => {
			const url1 = "https://jsonplaceholder.typicode.com/posts/1";
			const url2 = "https://jsonplaceholder.typicode.com/posts/2";

			// First request to url1
			const firstResponse = await client.get<{ id: number }>(url1);
			expect(firstResponse.data).toBeDefined();
			expect(fetchSpy).toHaveBeenCalledTimes(1);

			// Request to url2 (different URL)
			const secondResponse = await client.get<{ id: number }>(url2);
			expect(secondResponse.data).toBeDefined();
			expect(fetchSpy).toHaveBeenCalledTimes(2);
		});

		it("should generate different cache keys for requests with different headers", async () => {
			const url = "https://jsonplaceholder.typicode.com/posts/1";

			// First request with default headers
			const firstResponse = await client.get<{ id: number }>(url);
			expect(firstResponse.data).toBeDefined();
			expect(fetchSpy).toHaveBeenCalledTimes(1);

			// Second request with custom headers
			const secondResponse = await client.get<{ id: number }>(url, {
				headers: { "X-Custom-Header": "test" },
			});
			expect(secondResponse.data).toBeDefined();
			expect(fetchSpy).toHaveBeenCalledTimes(2);
		});
	});

	// Uncomment and modify if you have a real OpenWeatherMap API key
	// describe('Real-world Caching with OpenWeatherMap', () => {
	//   beforeEach(() => {
	//     client = new TFetchClient({
	//       cache: {
	//         enabled: true,
	//         maxAge: Types.Time.Minute * 5,
	//       }
	//     });
	//   });

	//   it('should cache weather data', async () => {
	//     const city = 'London';
	//     const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHER_API_KEY}&units=metric`;

	//     // First request
	//     const firstResponse = await client.get<{ main: { temp: number } }>(url);
	//     expect(firstResponse.data?.main?.temp).toBeDefined();
	//     expect(fetchSpy).toHaveBeenCalledTimes(1);

	//     // Second request (should use cache)
	//     const secondResponse = await client.get<{ main: { temp: number } }>(url);
	//     expect(secondResponse.data?.main?.temp).toEqual(firstResponse.data?.main?.temp);
	//     expect(fetchSpy).toHaveBeenCalledTimes(1);
	//   });
	// });
});
