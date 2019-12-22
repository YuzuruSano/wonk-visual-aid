const path = require("path");
const webpack = require("webpack");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const globImporter = require("node-sass-glob-importer");
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const postcssAssets = require('postcss-assets');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
    entry: {
        main: [path.resolve(__dirname, "./dev/js/scripts/main.js")]
    },
    output: {
        filename: "js/bundle.js",
        path: path.resolve(__dirname, "./build"),
        publicPath: "/"
    },
    mode: "production",
    optimization: {
        namedChunks: true,
        splitChunks: {
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/].*\.js$/,
              name: 'vendor',
              chunks: 'all'
            }
          }
        },
        minimizer: [
          new TerserPlugin({
            parallel: true,
            terserOptions: {
              compress: {
                drop_console: false
              }
            }
        })
        ]
    },
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
                    MiniCssExtractPlugin.loader,
                    {
                        loader: "css-loader",
                        options: {
                            sourceMap: false,
                            importLoaders: 1,
                            url: false
                        }
                    },
                    {
                        loader: "postcss-loader",
                        options: {
                            sourceMap: false,
                            plugins: [
                                autoprefixer(),
                                cssnano(),
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
                            sourceMap: false,
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
        modules: ["node_modules", "dev/js/scripts"],
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
        new webpack.NamedModulesPlugin(),
    ]
};
