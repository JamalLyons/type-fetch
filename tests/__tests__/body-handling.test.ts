import { TFetchClient } from "@/index";
import * as Types from "@/types";

describe("TFetchClient Body Handling", () => {
	let tfetch: TFetchClient;

	beforeEach(() => {
		tfetch = new TFetchClient();
	});

	describe("Body Preparation", () => {
		it("should throw error for invalid body", () => {
			expect(() => (tfetch as any).prepareBody({})).toThrow(Types.TFetchError);
			expect(() => (tfetch as any).prepareBody({ type: "json" })).toThrow(
				Types.TFetchError,
			);
		});

		it("should convert object to FormData for form content type", () => {
			const body = {
				type: "form",
				data: { key: "value", file: new File([""], "test.txt") },
			};
			const prepared = (tfetch as any).prepareBody(body);

			expect(prepared.type).toBe("form");
			expect(prepared.data instanceof FormData).toBe(true);
			expect(prepared.data.get("key")).toBe("value");
		});

		it("should handle text content type conversion", () => {
			const body = { type: "text", data: 123 };
			const prepared = (tfetch as any).prepareBody(body);

			expect(prepared.type).toBe("text");
			expect(prepared.data).toBe("123");
		});

		it("should handle blob content type", () => {
			const jsonData = { key: "value" };
			const body = { type: "blob", data: jsonData };
			const prepared = (tfetch as any).prepareBody(body);

			expect(prepared.type).toBe("blob");
			expect(prepared.data instanceof Blob).toBe(true);
		});

		it("should throw error for unsupported content type", () => {
			const body = { type: "unsupported", data: "test" };
			expect(() => (tfetch as any).prepareBody(body)).toThrow(
				Types.TFetchError,
			);
		});
	});

	describe("Body Serialization", () => {
		it("should return undefined for null/undefined data", () => {
			const body = { type: "json", data: null };
			const serialized = (tfetch as any).serializeBody(body);

			expect(serialized).toBeUndefined();
		});

		it("should serialize JSON data", () => {
			const body = { type: "json", data: { key: "value" } };
			const serialized = (tfetch as any).serializeBody(body);

			expect(serialized).toBe(JSON.stringify({ key: "value" }));
		});

		it("should handle text serialization", () => {
			const body = { type: "text", data: 123 };
			const serialized = (tfetch as any).serializeBody(body);

			expect(serialized).toBe("123");
		});

		it("should handle blob serialization", () => {
			const blob = new Blob(["test"], { type: "text/plain" });
			const body = { type: "blob", data: blob };
			const serialized = (tfetch as any).serializeBody(body);

			expect(serialized).toBe(blob);
		});

		it("should throw error for unsupported content type", () => {
			const body = { type: "unsupported", data: "test" };
			expect(() => (tfetch as any).serializeBody(body)).toThrow(
				Types.TFetchError,
			);
		});
	});
});
