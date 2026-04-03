import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Serve static files from the dist directory
const distPath = path.join(process.cwd(), "dist");
console.log(`Serving static files from: ${distPath}`);

app.use(express.static(distPath));

// Fallback for SPA routing
app.get("*", (req, res) => {
  const indexPath = path.join(distPath, "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error(`Error sending index.html: ${err}`);
      if (!res.headersSent) {
        res.status(500).send("Internal Server Error - index.html not found");
      }
    }
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
