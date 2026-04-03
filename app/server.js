const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const dbFolder = path.join(__dirname, "db");
if (!fs.existsSync(dbFolder)) {
  fs.mkdirSync(dbFolder, { recursive: true });
}

const dbPath = path.join(dbFolder, "database.sqlite");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Database connection error:", err.message);
  } else {
    console.log("Connected to SQLite.");
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      subtareas TEXT,
      fecha_limite TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'To Do',
      fecha_creacion TEXT NOT NULL
    )
  `);
});

app.get("/api/projects", (req, res) => {
  db.all("SELECT * FROM projects ORDER BY id DESC", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Error fetching projects." });
    }

    const projects = rows.map((project) => ({
      ...project,
      subtareas: project.subtareas ? JSON.parse(project.subtareas) : []
    }));

    res.json(projects);
  });
});

app.post("/api/projects", (req, res) => {
  const { nombre, descripcion, subtareas, fecha_limite, estado } = req.body;

  if (!nombre || !fecha_limite) {
    return res.status(400).json({
      error: "El nombre del proyecto y la fecha límite son obligatorios."
    });
  }

  const allowedStates = ["To Do", "In Progress", "Completed"];
  const finalState = allowedStates.includes(estado) ? estado : "To Do";
  const subtareasJson = JSON.stringify(Array.isArray(subtareas) ? subtareas : []);
  const fecha_creacion = new Date().toISOString().split("T")[0];

  const sql = `
    INSERT INTO projects (nombre, descripcion, subtareas, fecha_limite, estado, fecha_creacion)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.run(
    sql,
    [nombre, descripcion || "", subtareasJson, fecha_limite, finalState, fecha_creacion],
    function (err) {
      if (err) {
        return res.status(500).json({ error: "Error creating project." });
      }

      res.status(201).json({
        id: this.lastID,
        nombre,
        descripcion: descripcion || "",
        subtareas: Array.isArray(subtareas) ? subtareas : [],
        fecha_limite,
        estado: finalState,
        fecha_creacion
      });
    }
  );
});

app.put("/api/projects/:id", (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, subtareas, fecha_limite, estado } = req.body;

  if (!nombre || !fecha_limite || !estado) {
    return res.status(400).json({
      error: "Nombre, fecha límite y estado son obligatorios."
    });
  }

  const allowedStates = ["To Do", "In Progress", "Completed"];
  if (!allowedStates.includes(estado)) {
    return res.status(400).json({ error: "Estado no válido." });
  }

  const subtareasJson = JSON.stringify(Array.isArray(subtareas) ? subtareas : []);

  const sql = `
    UPDATE projects
    SET nombre = ?, descripcion = ?, subtareas = ?, fecha_limite = ?, estado = ?
    WHERE id = ?
  `;

  db.run(
    sql,
    [nombre, descripcion || "", subtareasJson, fecha_limite, estado, id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: "Error updating project." });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: "Project not found." });
      }

      res.json({ message: "Project updated successfully." });
    }
  );
});

app.patch("/api/projects/:id/status", (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  const allowedStates = ["To Do", "In Progress", "Completed"];
  if (!allowedStates.includes(estado)) {
    return res.status(400).json({ error: "Estado no válido." });
  }

  db.run(
    "UPDATE projects SET estado = ? WHERE id = ?",
    [estado, id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: "Error updating status." });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: "Project not found." });
      }

      res.json({ message: "Status updated successfully." });
    }
  );
});

app.delete("/api/projects/:id", (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM projects WHERE id = ?", [id], function (err) {
    if (err) {
      return res.status(500).json({ error: "Error deleting project." });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: "Project not found." });
    }

    res.json({ message: "Project deleted successfully." });
  });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});