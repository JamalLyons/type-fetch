import type { Config } from "jest";

const config: Config = {
	preset: "ts-jest",
	testEnvironment: "node",
	moduleNameMapper: {
		"^@/(.*)$": "<rootDir>/src/$1",
	},
	roots: ["<rootDir>/tests"],
	transform: {
		"^.+\\.ts$": "ts-jest",
	},
	testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.ts$",
	moduleFileExtensions: ["ts", "js", "json", "node"],
};

export default config;
