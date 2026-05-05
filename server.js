const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "127.0.0.1";
const ROOT = __dirname;
const POPUP_FRAGMENT_PATH = path.join(ROOT, "popup.html");
const MAX_POST_BYTES = 1024 * 1024;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

function writeResponse(response, statusCode, headers, body) {
  response.writeHead(statusCode, headers);
  response.end(body);
}

function sendFile(filePath, response) {
  const extension = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[extension] || "application/octet-stream";

  fs.readFile(filePath, (error, content) => {
    if (error) {
      writeResponse(
        response,
        500,
        { "Content-Type": "text/plain; charset=utf-8" },
        "Internal Server Error"
      );
      return;
    }

    writeResponse(response, 200, { "Content-Type": contentType }, content);
  });
}

function sendPopupFragment(response) {
  fs.readFile(POPUP_FRAGMENT_PATH, "utf8", (error, html) => {
    if (error) {
      writeResponse(
        response,
        500,
        { "Content-Type": "text/plain; charset=utf-8" },
        "Popup fragment could not be loaded"
      );
      return;
    }

    writeResponse(
      response,
      200,
      {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "no-store",
        "Content-Type": "text/html; charset=utf-8"
      },
      html
    );
  });
}

function readJsonBody(request, callback) {
  let body = "";

  request.on("data", (chunk) => {
    body += chunk;

    if (body.length > MAX_POST_BYTES) {
      request.destroy();
    }
  });

  request.on("end", () => {
    if (!body) {
      callback(null, {});
      return;
    }

    try {
      callback(null, JSON.parse(body));
    } catch (error) {
      callback(error);
    }
  });

  request.on("error", callback);
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || `${HOST}:${PORT}`}`);

  if (url.pathname === "/api/popup-html") {
    if (request.method === "OPTIONS") {
      writeResponse(
        response,
        204,
        {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Cache-Control": "no-store"
        }
      );
      return;
    }

    if (request.method === "POST") {
      readJsonBody(request, (error, payload) => {
        if (error) {
          writeResponse(
            response,
            400,
            {
              "Access-Control-Allow-Origin": "*",
              "Content-Type": "application/json; charset=utf-8"
            },
            JSON.stringify({ error: "Invalid JSON payload" })
          );
          return;
        }

        console.log("Popup request payload:", JSON.stringify(payload, null, 2));
        sendPopupFragment(response);
      });
      return;
    }

    if (request.method !== "GET") {
      writeResponse(
        response,
        405,
        {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "text/plain; charset=utf-8"
        },
        "Method Not Allowed"
      );
      return;
    }

    sendPopupFragment(response);
    return;
  }

  const requestPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const safePath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(ROOT, safePath);

  if (!filePath.startsWith(ROOT)) {
    writeResponse(
      response,
      403,
      { "Content-Type": "text/plain; charset=utf-8" },
      "Forbidden"
    );
    return;
  }

  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      if (
        (request.method === "GET" || request.method === "HEAD") &&
        !path.extname(filePath)
      ) {
        sendFile(path.join(ROOT, "index.html"), response);
        return;
      }

      writeResponse(
        response,
        404,
        { "Content-Type": "text/plain; charset=utf-8" },
        "Not Found"
      );
      return;
    }

    sendFile(filePath, response);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`GTM test site running at http://${HOST}:${PORT}`);
});
