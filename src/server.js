import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware untuk CORS - memungkinkan Vue.js mengakses API
app.use(cors());

// Middleware untuk parsing JSON
app.use(express.json());

// Static files untuk gambar
app.use("/images", express.static(path.join(__dirname, "../public/images")));

// Fungsi untuk mendapatkan data mahasiswa dari file gambar
function getPeopleData() {
  try {
    const imagesDir = path.join(__dirname, "../public/images");
    const files = fs.readdirSync(imagesDir);
    
    return files
      .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file))
      .map((file, index) => {
        // Ekstrak NIM dan nama dari nama file
        const match = file.match(/^(\d+)\s*-\s*(.+)\.(jpg|jpeg|png|gif)$/i);
        if (match) {
          const nim = match[1];
          const name = match[2].trim();
          return {
            id: index + 1,
            nim: nim,
            name: name,
            image: `/images/${encodeURIComponent(file)}`
          };
        } else {
          // Fallback untuk file yang tidak mengikuti format
          const nameWithoutExt = file.replace(/\.(jpg|jpeg|png|gif)$/i, '');
          return {
            id: index + 1,
            nim: null,
            name: nameWithoutExt,
            image: `/images/${encodeURIComponent(file)}`
          };
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Error reading images directory:", error);
    return [];
  }
}

// API endpoint untuk mendapatkan data mahasiswa
app.get("/people", (req, res) => {
  try {
    const people = getPeopleData();
    res.json({
      success: true,
      data: people,
      count: people.length
    });
  } catch (error) {
    console.error("Error in /people endpoint:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message
    });
  }
});

// API endpoint untuk mendapatkan data mahasiswa berdasarkan ID
app.get("/people/:id", (req, res) => {
  try {
    const people = getPeopleData();
    const person = people.find(p => p.id === parseInt(req.params.id));
    
    if (!person) {
      return res.status(404).json({
        success: false,
        error: "Person not found"
      });
    }
    
    res.json({
      success: true,
      data: person
    });
  } catch (error) {
    console.error("Error in /people/:id endpoint:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message
    });
  }
});

// API endpoint untuk pencarian
app.get("/search", (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({
        success: false,
        error: "Query parameter 'q' is required"
      });
    }
    
    const people = getPeopleData();
    const results = people.filter(person => 
      person.name.toLowerCase().includes(q.toLowerCase()) ||
      (person.nim && person.nim.includes(q))
    );
    
    res.json({
      success: true,
      data: results,
      count: results.length,
      query: q
    });
  } catch (error) {
    console.error("Error in /search endpoint:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Not found",
    message: `Route ${req.method} ${req.path} not found`
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server jalan di http://localhost:${PORT}`);
  console.log(`👉 Cek API semua mahasiswa: http://localhost:${PORT}/people`);
  console.log(`👉 Cek pencarian: http://localhost:${PORT}/search?q=nama`);
  console.log(`👉 Cek health: http://localhost:${PORT}/health`);
  console.log(`👉 Total gambar tersedia: ${getPeopleData().length} mahasiswa`);
});
