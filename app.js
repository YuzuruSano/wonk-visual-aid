const express = require('express');
const app = express();
const conf = require('./config.json')[app.get('env')];
const fs = require('fs');
const PORT = process.env.PORT || 5000;
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');
const WebpackConfig = require('./webpack.dev');
const compiler = webpack(WebpackConfig);
const getLocalAddress = require('./dev/js/scripts/modules/getLocalAddress');
const addr = getLocalAddress();
// const ipv4 = addr['ipv4'][0]['address'];
const env = app.get('env');
const red = '\u001b[31m';
const green = '\u001b[32m'; 
const reset = '\u001b[0m';

/**
 * view engine
 */
app.set('view engine', 'pug');
/**
 * build
 */
if (env === 'development'){
    app.use(webpackDevMiddleware(compiler, {
        publicPath: WebpackConfig.output.publicPath,
        hot: true
    }));
    app.use(webpackHotMiddleware(compiler));
}else{
    app.use('/assets', express.static('build'));
}

const http = require('http').Server(app);

const server = http.listen(PORT, function () {
    // console.log(`Your site : ${green}:${PORT}`);
});

/**
 * routes
 */
app.get('/', function (req, res) {
    res.render('index', { 
        site: conf.site, 
        staticPath: conf.staticPath,
        env: env,
        url: conf.url
    })
});

app.get('/controller/', function (req, res) {
    res.render('controller', {
        site: conf.site,
        staticPath: conf.staticPath,
        env: env,
        url: conf.url
    })
});
