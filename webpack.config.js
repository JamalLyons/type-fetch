const path = require("node:path");
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");

module.exports = {
	resolve: {
		plugins: [
			new TsconfigPathsPlugin({
				configFile: "./tsconfig.json",
			}),
		],
	},
};
