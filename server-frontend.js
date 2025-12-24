// Servidor simple para el frontend
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 5500;

const mimeTypes = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
};

const server = http.createServer((req, res) => {
  // Parsear URL para separar el path de los query params
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let filePath = "." + url.pathname;
  if (filePath === "./") filePath = "./index.html";

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || "application/octet-stream";

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === "ENOENT") {
        res.writeHead(404, { "Content-Type": "text/html" });
        res.end("<h1>404 - Página no encontrada</h1>", "utf-8");
      } else {
        res.writeHead(500);
        res.end("Error del servidor: " + error.code, "utf-8");
      }
    } else {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content, "utf-8");
    }
  });
});

server.listen(PORT, () => {
  console.log("\n🚀 Servidor Frontend iniciado!");
  console.log(`📂 Sirviendo archivos en: http://localhost:${PORT}`);
  console.log(`🌐 Abra en navegador: http://localhost:${PORT}/index.html`);
  console.log("\n✅ CORS resuelto - Frontend y Backend en servidores HTTP\n");
});
