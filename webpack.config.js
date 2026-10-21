const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const ThemeWatcher = require('@salla.sa/twilight/watcher.js');
const CopyPlugin = require('copy-webpack-plugin');
const path = require('path');

const asset = file => path.resolve('src/assets', file || '');
const public = file => path.resolve("public", file || '');

module.exports = {
    entry  : {
        app     : [asset('styles/app.scss'), asset('js/wishlist.js'), asset('js/app.js'), asset('js/blog.js')],
        home    : asset('js/home.js'),
        'product-card' : asset('js/partials/product-card.js'),
        'wishlist-card': asset('js/partials/wishlist-card.js'),
        'add-product-toast': asset('js/partials/add-product-toast.js'),
        'digital-files': asset('js/partials/digital-files.js'),
        checkout: [asset('js/cart.js'), asset('js/thankyou.js')],
        pages   : [asset('js/loyalty.js'), asset('js/brands.js'),],
        product : [asset('js/product.js'), asset('js/products.js')],
        order   : asset('js/order.js'),
        testimonials   : asset('js/testimonials.js'),
        // Azel layer. Every entry pairs a stylesheet with a real script so
        // webpack never emits a 0-byte .js beside a CSS-only entry.
        // `azel` is the shell (master.twig, every page); the others are loaded
        // by their own page only.
        'azel'        : [asset('styles/azel-chrome.scss'), asset('js/azel.js')],
        'azel-home'   : [asset('styles/azel-home.scss'), asset('js/azel-home.js')],
        'azel-catalog': [asset('styles/azel-catalog.scss'), asset('js/azel-catalog.js')],
        'azel-product': [asset('styles/azel-product.scss'), asset('js/azel-product.js')]
    },
    output : {
        path: public(),
        clean: true,
        chunkFilename: "[name].[contenthash].js"
    },
    stats  : {modules: false, assetsSort: "size", assetsSpace: 50},
    module : {
        rules: [
            {
                test   : /\.js$/,
                exclude: [
                    /(node_modules)/,
                    asset('js/twilight.js')
                ],
                use    : {
                    loader : 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                        plugins: [
                          "@babel/plugin-transform-runtime"
                        ],
                    }
                }
            },
            {
                test: /\.(s(a|c)ss)$/,
                use : [
                    MiniCssExtractPlugin.loader,
                    {loader: "css-loader", options: {url: false}},
                    "postcss-loader",
                    "sass-loader",
                ]
            },
        ],
    },
    plugins: [
        new ThemeWatcher(),
        new MiniCssExtractPlugin(),
        // No `fonts` pattern: Alexandria and IBM Plex Sans Arabic are served
        // from Google Fonts (see layouts/master.twig), so the theme vendors no
        // face of its own and an empty src/assets/fonts would fail the glob.
        new CopyPlugin({patterns: [
            {from: asset('images'), to: public('images')},
        ]}),
    ],
    optimization: {
        minimizer: [
            `...`,
            new CssMinimizerPlugin(),
        ],
    },
}
;
