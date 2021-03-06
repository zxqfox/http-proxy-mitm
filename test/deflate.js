/**
 * Test content-encoding for deflate
 */

var assert = require('chai').assert;

var zlib = require('zlib');
var http = require('http');
var httpProxy = require('http-proxy');
var modifyResponse = require('../');

var SERVER_PORT = 5002;
var TARGET_SERVER_PORT = 5003;

// Create a proxy server
var proxy = httpProxy.createProxyServer({
    target: 'http://localhost:' + TARGET_SERVER_PORT
});

// Listen for the `proxyRes` event on `proxy`.
proxy.on('proxyRes', modifyResponse({ bodyTransform: function (body) {
    body = JSON.parse(body);
    if (body) {
        // modify some information
        body.age = 2;
        body.version = undefined;
    }
    return JSON.stringify(body);
}}));

// Create your server and then proxies the request
var server = http.createServer(function (req, res) {
    proxy.web(req, res);
}).listen(SERVER_PORT);

// Create your target server
var targetServer = http.createServer(function (req, res) {
    // Create deflated content
    var deflate = zlib.Deflate();

    res.writeHead(200, {'Content-Type': 'application/json', 'Content-Encoding': 'deflate'});
    deflate.pipe(res);

    deflate.write(JSON.stringify({name: 'node-http-proxy-json', age: 1, version: '1.0.0'}));
    deflate.end();
}).listen(TARGET_SERVER_PORT);

after(function() {
    proxy.close();
    server.close();
    targetServer.close();
});

describe("modifyResponse--deflate", function () {
    it('deflate: modify response json successfully', function (done) {
        // Test server
        http.get('http://localhost:' + SERVER_PORT, function (res) {
            var body = '';
            var inflate = zlib.Inflate();
            res.pipe(inflate);

            inflate.on('data', function (chunk) {
                body += chunk;
            }).on('end', function () {
                assert.equal(JSON.stringify({name: 'node-http-proxy-json', age: 2}), body);
                done();
            });
        });
    });
});
