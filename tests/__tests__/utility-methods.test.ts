import { TFetchClient } from "@/index";

describe("TFetchClient Utility Methods", () => {
	let tfetch: TFetchClient;

	beforeEach(() => {
		tfetch = new TFetchClient();
	});

	describe("Headers Handling", () => {
		it("should merge multiple header sources", () => {
			const headers1 = { "X-Test1": "value1" };
			const headers2 = { "X-Test2": "value2" };
			const mergedHeaders = (tfetch as any).mergeHeaders(headers1, headers2);

			expect(mergedHeaders.get("X-Test1")).toBe("value1");
			expect(mergedHeaders.get("X-Test2")).toBe("value2");
		});

		it("should return appropriate headers for different content types", () => {
			const jsonHeaders = (tfetch as any).getHeaders("json");
			const formHeaders = (tfetch as any).getHeaders("form");
			const textHeaders = (tfetch as any).getHeaders("text");
			const blobHeaders = (tfetch as any).getHeaders("blob");

			expect(jsonHeaders).toEqual({ "Content-Type": "application/json" });
			expect(formHeaders).toEqual({
				"Content-Type": "application/x-www-form-urlencoded",
			});
			expect(textHeaders).toEqual({ "Content-Type": "text/plain" });
			expect(blobHeaders).toEqual({
				"Content-Type": "application/octet-stream",
			});
		});
	});

	describe("Cache Key Generation", () => {
		it("should generate unique cache keys", () => {
			const url = "https://example.com";
			const method = "GET";
			const headers = new Headers({ "Content-Type": "application/json" });
			const body = JSON.stringify({ key: "value" });

			const key1 = (tfetch as any).generateCacheKey(url, method, headers, body);
			const key2 = (tfetch as any).generateCacheKey(url, method, headers, body);
			const key3 = (tfetch as any).generateCacheKey(url, "POST", headers, body);

			expect(key1).toBe(key2);
			expect(key1).not.toBe(key3);
		});

		it("should handle different body types in cache key generation", () => {
			const url = "https://example.com";
			const method = "POST";
			const headers = new Headers({ "Content-Type": "application/json" });

			const jsonBody = JSON.stringify({ key: "value" });
			const formBody = new FormData();
			formBody.append("key", "value");

			const jsonKey = (tfetch as any).generateCacheKey(
				url,
				method,
				headers,
				jsonBody,
			);
			const formKey = (tfetch as any).generateCacheKey(
				url,
				method,
				headers,
				formBody,
			);

			expect(jsonKey).not.toBe(formKey);
		});
	});

	describe("Debug Logging", () => {
		it("should not log when debug is false", () => {
			const consoleSpy = jest.spyOn(console, "log").mockImplementation();

			tfetch = new TFetchClient();
			(tfetch as any).debug("Test message");

			expect(consoleSpy).not.toHaveBeenCalled();

			consoleSpy.mockRestore();
		});

		it("should log when debug is true", () => {
			const consoleSpy = jest.spyOn(console, "log").mockImplementation();

			tfetch = new TFetchClient({ debug: true });
			(tfetch as any).debug("Test message");

			expect(consoleSpy).toHaveBeenCalledWith("[DEBUG] Test message");

			consoleSpy.mockRestore();
		});
	});
});
