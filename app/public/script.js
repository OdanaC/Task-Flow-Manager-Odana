const loginView = document.getElementById("loginView");
const appView = document.getElementById("appView");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const loginError = document.getElementById("loginError");

const openFormBtn = document.getElementById("openFormBtn");
const cancelFormBtn = document.getElementById("cancelFormBtn");
const projectFormWrapper = document.getElementById("projectFormWrapper");
const projectForm = document.getElementById("projectForm");
const formTitle = document.getElementById("formTitle");

const projectIdInput = document.getElementById("projectId");
const projectNameInput = document.getElementById("projectName");
const projectDescriptionInput = document.getElementById("projectDescription");
const projectDeadlineInput = document.getElementById("projectDeadline");

const subtasksContainer = document.getElementById("subtasksContainer");
const addSubtaskBtn = document.getElementById("addSubtaskBtn");
const projectsContainer = document.getElementById("projectsContainer");

const totalCount = document.getElementById("totalCount");
const todoCount = document.getElementById("todoCount");
const progressCount = document.getElementById("progressCount");
const completedCount = document.getElementById("completedCount");

let currentFilter = "all";
let allProjects = [];

function showLogin() {
  loginView.classList.remove("d-none");
  appView.classList.add("d-none");
}

function showApp() {
  loginView.classList.add("d-none");
  appView.classList.remove("d-none");
}

function checkLogin() {
  const loggedIn = localStorage.getItem("loggedIn");
  if (loggedIn === "true") {
    showApp();
    loadProjects();
  } else {
    showLogin();
  }
}

loginBtn.addEventListener("click", () => {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (username === "admin" && password === "1234") {
    localStorage.setItem("loggedIn", "true");
    loginError.textContent = "";
    showApp();
    loadProjects();
  } else {
    loginError.textContent = "Usuario o contraseña incorrectos.";
  }
});

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("loggedIn");
  showLogin();
});

openFormBtn.addEventListener("click", () => {
  resetForm();
  formTitle.textContent = "Crear nuevo proyecto";
  projectFormWrapper.classList.remove("d-none");
});

cancelFormBtn.addEventListener("click", () => {
  resetForm();
  projectFormWrapper.classList.add("d-none");
});

addSubtaskBtn.addEventListener("click", () => {
  addSubtaskField("");
});

function addSubtaskField(value = "") {
  const row = document.createElement("div");
  row.className = "subtask-row";

  row.innerHTML = `
    <input type="text" class="form-control subtask-input" placeholder="Escribe una subtarea" value="${escapeHtml(value)}">
    <button type="button" class="btn btn-outline-danger remove-subtask-btn">Quitar</button>
  `;

  const removeBtn = row.querySelector(".remove-subtask-btn");
  removeBtn.addEventListener("click", () => {
    row.remove();
  });

  subtasksContainer.appendChild(row);
}

function getSubtasks() {
  return [...document.querySelectorAll(".subtask-input")]
    .map((input) => input.value.trim())
    .filter((text) => text !== "");
}

function resetForm() {
  projectIdInput.value = "";
  projectNameInput.value = "";
  projectDescriptionInput.value = "";
  projectDeadlineInput.value = "";
  subtasksContainer.innerHTML = "";
  addSubtaskField("");
}

projectForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const projectId = projectIdInput.value;
  const existingProject = allProjects.find((project) => String(project.id) === String(projectId));

  const payload = {
    nombre: projectNameInput.value.trim(),
    descripcion: projectDescriptionInput.value.trim(),
    subtareas: getSubtasks(),
    fecha_limite: projectDeadlineInput.value,
    estado: existingProject ? existingProject.estado : "To Do"
  };

  if (!payload.nombre || !payload.fecha_limite) {
    alert("Debes completar el nombre y la fecha límite.");
    return;
  }

  try {
    if (projectId) {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Error updating project");
      }
    } else {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Error creating project");
      }
    }

    resetForm();
    projectFormWrapper.classList.add("d-none");
    loadProjects();
  } catch (error) {
    console.error(error);
    alert("Ocurrió un error guardando el proyecto.");
  }
});

async function loadProjects() {
  try {
    const response = await fetch("/api/projects");

    if (!response.ok) {
      throw new Error("Error loading projects");
    }

    allProjects = await response.json();

    updateStats(allProjects);

    const filteredProjects =
      currentFilter === "all"
        ? allProjects
        : allProjects.filter((project) => project.estado === currentFilter);

    renderProjects(filteredProjects);
  } catch (error) {
    console.error(error);
    projectsContainer.innerHTML = `
      <div class="col-12">
        <div class="alert alert-danger">No se pudieron cargar los proyectos.</div>
      </div>
    `;
  }
}

function updateStats(projects) {
  totalCount.textContent = projects.length;
  todoCount.textContent = projects.filter((p) => p.estado === "To Do").length;
  progressCount.textContent = projects.filter((p) => p.estado === "In Progress").length;
  completedCount.textContent = projects.filter((p) => p.estado === "Completed").length;
}

function renderProjects(projects) {
  projectsContainer.innerHTML = "";

  if (projects.length === 0) {
    projectsContainer.innerHTML = `
      <div class="col-12">
        <div class="empty-state">
          <h4 class="fw-bold">No hay proyectos para mostrar</h4>
          <p class="text-muted mb-0">Crea un nuevo proyecto o cambia el filtro actual.</p>
        </div>
      </div>
    `;
    return;
  }

  projects.forEach((project) => {
    const col = document.createElement("div");
    col.className = "col-12 col-md-6 col-xl-4";

    const statusClass = getStatusClass(project.estado);
    const statusBadge = getStatusBadge(project.estado);
    const subtasksHtml = renderSubtasks(project.subtareas);

    col.innerHTML = `
      <div class="card shadow-sm project-card ${statusClass} h-100">
        <div class="card-body d-flex flex-column">
          <div class="d-flex justify-content-between align-items-start gap-2 mb-3">
            <h5 class="card-title fw-bold mb-0">${escapeHtml(project.nombre)}</h5>
            <span class="badge-status ${statusBadge.className}">${statusBadge.label}</span>
          </div>

          <p class="text-muted mb-3">${escapeHtml(project.descripcion || "Sin descripción")}</p>

          <div class="mb-3">
            <p class="mb-1"><strong>Fecha límite:</strong> ${escapeHtml(project.fecha_limite)}</p>
            <p class="mb-1"><strong>Fecha de creación:</strong> ${escapeHtml(project.fecha_creacion)}</p>
          </div>

          <div class="mb-3">
            <strong class="d-block mb-2">Subtareas:</strong>
            ${subtasksHtml}
          </div>

          <div class="mt-auto">
            <div class="mb-3">
              <label class="form-label">Cambiar estado</label>
              <select class="form-select" data-status-id="${project.id}">
                <option value="To Do" ${project.estado === "To Do" ? "selected" : ""}>To Do</option>
                <option value="In Progress" ${project.estado === "In Progress" ? "selected" : ""}>In Progress</option>
                <option value="Completed" ${project.estado === "Completed" ? "selected" : ""}>Completed</option>
              </select>
            </div>

            <div class="d-flex gap-2">
              <button class="btn btn-primary w-100 edit-btn" data-edit-id="${project.id}">
                Editar
              </button>
              <button class="btn btn-danger w-100 delete-btn" data-delete-id="${project.id}">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    projectsContainer.appendChild(col);
  });

  bindCardEvents();
}

function renderSubtasks(subtasks) {
  if (!Array.isArray(subtasks) || subtasks.length === 0) {
    return `<p class="text-muted mb-0">Sin subtareas</p>`;
  }

  return `
    <ul class="card-subtasks">
      ${subtasks.map((task) => `<li>${escapeHtml(task)}</li>`).join("")}
    </ul>
  `;
}

function bindCardEvents() {
  document.querySelectorAll(".edit-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.editId;
      const project = allProjects.find((item) => String(item.id) === String(id));
      if (project) {
        editProject(project);
      }
    });
  });

  document.querySelectorAll(".delete-btn").forEach((button) => {
    button.addEventListener("click", () => {
      deleteProject(button.dataset.deleteId);
    });
  });

  document.querySelectorAll("[data-status-id]").forEach((select) => {
    select.addEventListener("change", () => {
      changeStatus(select.dataset.statusId, select.value);
    });
  });
}

function editProject(project) {
  formTitle.textContent = "Editar proyecto";
  projectFormWrapper.classList.remove("d-none");

  projectIdInput.value = project.id;
  projectNameInput.value = project.nombre;
  projectDescriptionInput.value = project.descripcion || "";
  projectDeadlineInput.value = project.fecha_limite;

  subtasksContainer.innerHTML = "";
  if (project.subtareas && project.subtareas.length > 0) {
    project.subtareas.forEach((task) => addSubtaskField(task));
  } else {
    addSubtaskField("");
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteProject(id) {
  const confirmed = confirm("¿Seguro que deseas eliminar este proyecto?");
  if (!confirmed) return;

  try {
    const response = await fetch(`/api/projects/${id}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      throw new Error("Error deleting project");
    }

    loadProjects();
  } catch (error) {
    console.error(error);
    alert("No se pudo eliminar el proyecto.");
  }
}

async function changeStatus(id, estado) {
  try {
    const response = await fetch(`/api/projects/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado })
    });

    if (!response.ok) {
      throw new Error("Error changing status");
    }

    loadProjects();
  } catch (error) {
    console.error(error);
    alert("No se pudo cambiar el estado.");
  }
}

function getStatusClass(status) {
  if (status === "To Do") return "status-todo";
  if (status === "In Progress") return "status-progress";
  return "status-completed";
}

function getStatusBadge(status) {
  if (status === "To Do") {
    return { className: "badge-todo", label: "Por hacer" };
  }
  if (status === "In Progress") {
    return { className: "badge-progress", label: "En proceso" };
  }
  return { className: "badge-completed", label: "Completado" };
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.querySelectorAll(".filter-btn").forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    loadProjects();
  });
});

checkLogin();