const path = require("path");
const webpack = require("webpack");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const globImporter = require("node-sass-glob-importer");
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");

module.exports = {
    entry: {
        main: [`webpack-hot-middleware/client?path=http://localhost:5000/__webpack_hmr`,path.resolve(__dirname, "./dev/js/scripts/main.js")]
    },
    output: {
        filename: "js/bundle.js",
        path: path.resolve(__dirname, "./build"),
        publicPath: `http://localhost:5000/`
    },
    mode: "development",
    devtool: "inline-source-map",
    module: {
        rules: [
            {
                test: /\.scss$/,
                exclude: /node_modules/,
                use: [
                    "css-hot-loader",
                    MiniCssExtractPlugin.loader,
                    {
                        loader: "css-loader",
                        options: {
                            sourceMap: true,
                            importLoaders: 1,
                            url: false
                        }
                    },
                    {
                        loader: "postcss-loader",
                        options: {
                            sourceMap: true,
                        }
                    },
                    {
                        loader: "sass-loader",
                        options: {
                            sourceMap: true,
                            sassOptions: {
                                importer: globImporter(),
                            },
                        }
                    }
                ]
            },
            { test: /\.html$/, exclude: /node_modules/, loader: "html-loader" }
        ]
    },
    externals: {
        jquery: "jQuery"
    },
    resolve: {
        modules: ["dev/js/scripts","node_modules"],
        extensions: [".js", ".jsx", ".css"]
    },
    performance: { hints: false },
    plugins: [
        new CopyWebpackPlugin([
            { from: "./dev/images", to: "images/" },
            { from: './dev/fonts', to: 'fonts/' },
            { from: './dev/movie', to: 'movie/' },
        ]),
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery",
            "window.jQuery": "jquery"
        }),
        new MiniCssExtractPlugin({
            filename: "css/style.css"
        }),
        new webpack.HotModuleReplacementPlugin(),
    ],
    optimization: {
        minimizer: [
            new OptimizeCSSAssetsPlugin({
                cssProcessorOptions: {
                    map: {
                        inline: false,
                        annotation: true,
                    }
                }
            }),
        ],
    },
};
