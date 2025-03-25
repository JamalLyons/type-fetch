import { TFetchClient } from "@/index";
import * as Types from "@/types";

describe("TFetchClient Configuration", () => {
	describe("Default Configuration", () => {
		const client = new TFetchClient();

		it("should have default debug settings", () => {
			expect(client.config.debug).toBe(false);
		});

		it("should have empty default headers", () => {
			expect(client.config.headers).toEqual({});
		});

		it("should have default delete handling", () => {
			expect(client.config.deleteHandling).toBe("empty");
		});

		it("should have default retry configuration", () => {
			expect(client.config.retry.count).toBe(0);
			expect(client.config.retry.delay).toBe(1000);
			expect(client.config.retry.onRetry).toBeUndefined();
		});

		it("should have default cache configuration", () => {
			expect(client.config.cache.enabled).toBe(false);
			expect(client.config.cache.maxAge).toBe(Types.Time.Minute * 5);
			expect(client.config.cache.maxCachedEntries).toBe(5000);
		});
	});

	describe("Custom Configuration", () => {
		it("should allow overriding all configuration options", () => {
			const customClient = new TFetchClient({
				debug: true,
				headers: { "X-Custom-Header": "test" },
				deleteHandling: "json",
				retry: {
					count: 3,
					delay: 2000,
					onRetry: () => console.log("Retrying"),
				},
				cache: {
					enabled: true,
					maxAge: Types.Time.Hour,
					maxCachedEntries: 1000,
				},
			});

			expect(customClient.config.debug).toBe(true);
			expect(customClient.config.headers).toEqual({
				"X-Custom-Header": "test",
			});
			expect(customClient.config.deleteHandling).toBe("json");
			expect(customClient.config.retry.count).toBe(3);
			expect(customClient.config.retry.delay).toBe(2000);
			expect(customClient.config.retry.onRetry).toBeDefined();
			expect(customClient.config.cache.enabled).toBe(true);
			expect(customClient.config.cache.maxAge).toBe(Types.Time.Hour);
			expect(customClient.config.cache.maxCachedEntries).toBe(1000);
		});

		it("should allow partial configuration overrides", () => {
			const partialClient = new TFetchClient({
				debug: true,
				retry: { count: 5 },
			});

			expect(partialClient.config.debug).toBe(true);
			expect(partialClient.config.retry.count).toBe(5);
			expect(partialClient.config.retry.delay).toBe(1000);
		});
	});
});
