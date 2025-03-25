import { TFetchClient } from "@/index";
import * as Types from "@/types";

describe("TFetchClient Advanced Methods", () => {
	let client: TFetchClient;
	let fetchSpy: jest.SpyInstance;

	beforeEach(() => {
		global.fetch = jest.fn(global.fetch);
		fetchSpy = jest.spyOn(global, "fetch");
		client = new TFetchClient();
	});

	afterEach(() => {
		fetchSpy.mockRestore();
	});

	describe("HTTP Methods", () => {
		const baseUrl = "https://jsonplaceholder.typicode.com/posts";

		it("should perform POST request", async () => {
			const newPost = { title: "foo", body: "bar", userId: 1 };
			const response = await client.post<{ id: number }>(baseUrl, {
				type: "json",
				data: newPost,
			});

			expect(response.data).toBeDefined();
			expect(response.data?.id).toBeTruthy();
			expect(fetchSpy).toHaveBeenCalledTimes(1);
		});

		it("should perform PUT request", async () => {
			const updatedPost = {
				id: 1,
				title: "updated",
				body: "updated body",
				userId: 1,
			};
			const response = await client.put<{ id: number }>(`${baseUrl}/1`, {
				type: "json",
				data: updatedPost,
			});

			expect(response.data).toBeDefined();
			expect(fetchSpy).toHaveBeenCalledTimes(1);
		});

		it("should perform PATCH request", async () => {
			const partialUpdate = { title: "patched title" };
			const response = await client.patch<{ id: number }>(`${baseUrl}/1`, {
				type: "json",
				data: partialUpdate,
			});

			expect(response.data).toBeDefined();
			expect(fetchSpy).toHaveBeenCalledTimes(1);
		});

		it("should perform HEAD request", async () => {
			const response = await client.head<Headers>(`${baseUrl}/1`);

			expect(response.data).toBeDefined();
			expect(fetchSpy).toHaveBeenCalledTimes(1);
		});

		it("should perform DELETE request", async () => {
			const response = await client.delete<{ status: string }>(`${baseUrl}/1`);

			expect(response.data).toBeDefined();
			expect(fetchSpy).toHaveBeenCalledTimes(1);
		});
	});

	describe("Configuration and Initialization", () => {
		it("should create client with custom configuration", () => {
			const customClient = new TFetchClient({
				debug: true,
				headers: { "X-Custom-Header": "test" },
				retry: {
					count: 3,
					delay: 1000,
				},
				cache: {
					enabled: true,
					maxAge: Types.Time.Minute * 10,
				},
			});

			expect(customClient.config.debug).toBe(true);
			expect(customClient.config.headers).toEqual({
				"X-Custom-Header": "test",
			});
			expect(customClient.config.retry.count).toBe(3);
			expect(customClient.config.retry.delay).toBe(1000);
			expect(customClient.config.cache.enabled).toBe(true);
			expect(customClient.config.cache.maxAge).toBe(Types.Time.Minute * 10);
		});

		it("should handle different delete handling configurations", () => {
			const emptyClient = new TFetchClient({ deleteHandling: "empty" });
			const statusClient = new TFetchClient({ deleteHandling: "status" });
			const jsonClient = new TFetchClient({ deleteHandling: "json" });

			expect(emptyClient.config.deleteHandling).toBe("empty");
			expect(statusClient.config.deleteHandling).toBe("status");
			expect(jsonClient.config.deleteHandling).toBe("json");
		});
	});

	describe("Error Handling", () => {
		it("should throw TFetchError for invalid requests", async () => {
			const invalidUrl =
				"https://nonexistent-url-that-definitely-does-not-exist.com";

			const response = await client.get(invalidUrl);

			expect(response.error).toBeDefined();
			expect(response.data).toBeNull();
		});

		it("should handle network errors gracefully", async () => {
			// Simulate network error
			fetchSpy.mockImplementationOnce(() => {
				throw new Error("Network error");
			});

			const response = await client.get("https://example.com");

			expect(response.error).toBeDefined();
			expect(response.data).toBeNull();
		});
	});
});
