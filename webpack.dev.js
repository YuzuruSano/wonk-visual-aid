const path = require("path");
const webpack = require("webpack");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const globImporter = require("node-sass-glob-importer");
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const postcssAssets = require('postcss-assets');
const getLocalAddress = require('./dev/js/scripts/modules/getLocalAddress');
const addr = getLocalAddress();
const ipv4 = addr['ipv4'][0]['address'];

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
                test: /\.js$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            cacheDirectory: true,
                            cacheCompression: false
                        }
                    }
                ]
            },
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
                            plugins: [
                                autoprefixer(),
                                cssnano({
                                    preset: [
                                        'default',
                                        {
                                            discardComments: {
                                                removeAll: true
                                            }
                                        }
                                    ]
                                }),
                                postcssAssets({
                                    loadPaths: ["dev/images/"],
                                    relative: "./dev/css"
                                })
                            ]
                        }
                    },
                    {
                        loader: "sass-loader",
                        options: {
                            sourceMap: true,
                            importer: globImporter()
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
        new CopyWebpackPlugin([{ from: "./dev/images", to: "images/" }]),
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery",
            "window.jQuery": "jquery"
        }),
        new MiniCssExtractPlugin({
            filename: "css/style.css"
        }),
        new webpack.HotModuleReplacementPlugin(),
        new webpack.NamedModulesPlugin(),
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
