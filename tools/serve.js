#!/usr/bin/env node

var http = require("http");
var fs   = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..", "client");
var PORT = parseInt(process.env.PORT, 10) || 8080;

var MIME = {
    ".html":  "text/html",
    ".js":    "application/javascript",
    ".css":   "text/css",
    ".json":  "application/json",
    ".png":   "image/png",
    ".jpg":   "image/jpeg",
    ".jpeg":  "image/jpeg",
    ".gif":   "image/gif",
    ".mp3":   "audio/mpeg",
    ".ogg":   "audio/ogg",
    ".svg":   "image/svg+xml"
};

var CACHE = "no-store, no-cache, must-revalidate";

http.createServer(function (req, res) {
    var urlPath = req.url.split("?")[0];

    if (urlPath.endsWith("/")) {
        urlPath += "index.html";
    }

    var filePath = path.join(ROOT, urlPath);

    // Prevent directory traversal
    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403, { "Content-Type": "text/plain", "Cache-Control": CACHE });
        res.end("Forbidden");
        console.log(req.method + " " + req.url + " 403");
        return;
    }

    fs.readFile(filePath, function (err, data) {
        if (err) {
            res.writeHead(404, { "Content-Type": "text/plain", "Cache-Control": CACHE });
            res.end("Not Found");
            console.log(req.method + " " + req.url + " 404");
            return;
        }

        var ext  = path.extname(filePath).toLowerCase();
        var mime = MIME[ext] || "application/octet-stream";

        res.writeHead(200, { "Content-Type": mime, "Cache-Control": CACHE });
        res.end(data);
        console.log(req.method + " " + req.url + " 200");
    });
}).listen(PORT, function () {
    console.log("Serving " + ROOT + " on http://localhost:" + PORT);
});
