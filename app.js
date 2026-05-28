(function () {
  "use strict";

  const STORAGE_KEY = "schoolfix_tasks_v1";
  const EXAMS_KEY = "schoolfix_exams_v1";
  const THEME_KEY = "schoolfix_theme";
  const PROFILE_KEY = "schoolfix_profile_v1";
  const ANNOUNCEMENTS_KEY = "schoolfix_announcements_v1";
  let currentProfile = null;
  let currentView = "home";
  let showToastTimeoutId = null;

  const todayISO = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  let classesToday = [];

  const examSeed = [
    { subject: "Matemáticas", date: "2026-05-15", topic: "Álgebra y funciones", completed: false },
    { subject: "Historia", date: "2026-05-20", topic: "Revolución industrial", completed: false },
    { subject: "Biología", date: "2026-05-22", topic: "Célula y genética", completed: false },
  ];

  const baseAnnouncements = [
    {
      title: "Reunión de padres — 12 de mayo",
      body: "Sesión informativa de evaluación trimestral en el salón de actos a las 17:00.",
      tag: "Evento",
    },
    {
      title: "Biblioteca: horario extendido",
      body: "Hasta final de curso la biblioteca permanecerá abierta los martes hasta las 19:00.",
      tag: "Servicios",
    },
    {
      title: "Día sin mochila",
      body: "El viernes 16 de mayo se promueve el uso de material reciclado; consulta la circular en el aula virtual.",
      tag: "Convocatoria",
    },
    {
      title: "Taller gratuito: Técnicas de estudio",
      body: "Este jueves a las 13:30 en el aula multimedia. Cupo limitado; inscripciones en coordinación.",
      tag: "Taller",
    },
    {
      title: "Semana de ciencias: feria de proyectos",
      body: "Presenta tu proyecto el próximo miércoles. Habrá premios a innovación y trabajo en equipo.",
      tag: "Académico",
    },
    {
      title: "Recordatorio: credencial visible",
      body: "Por seguridad, porta tu credencial durante toda la jornada. Si la perdiste, repórtala hoy.",
      tag: "Aviso",
    },
    {
      title: "Club de programación: reunión de bienvenida",
      body: "Lunes 16:00 en Lab 1. Trae tu laptop si tienes; habrá retos para principiantes y avanzados.",
      tag: "Club",
    },
  ];

  function loadUserAnnouncements() {
    try {
      const raw = localStorage.getItem(ANNOUNCEMENTS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveUserAnnouncements(list) {
    localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(list));
  }

  function allAnnouncements() {
    const user = loadUserAnnouncements().map((a) => ({ ...a, _source: "user" }));
    const base = baseAnnouncements.map((a) => ({ ...a, _source: "base" }));
    const toTime = (x) => {
      const raw = String(x?.createdAt ?? "");
      const t = Date.parse(raw);
      return Number.isFinite(t) ? t : 0;
    };
    return [...user, ...base].sort((a, b) => toTime(b) - toTime(a));
  }

  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveTasks(tasks) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  function loadExams() {
    try {
      const raw = localStorage.getItem(EXAMS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveExams(exams) {
    localStorage.setItem(EXAMS_KEY, JSON.stringify(exams));
  }

  function generateId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function seedTasksIfEmpty() {
    let tasks = loadTasks();
    if (tasks.length > 0) return tasks;
    const t = todayISO();
    tasks = [
      {
        id: generateId(),
        title: "Leer capítulo 4 — Literatura",
        subject: "Lengua",
        date: t,
        completed: false,
      },
      {
        id: generateId(),
        title: "Práctica de geometría",
        subject: "Matemáticas",
        date: t,
        completed: false,
      },
      {
        id: generateId(),
        title: "Investigación sobre ecosistemas",
        subject: "Ciencias",
        date: t,
        completed: false,
      },
    ];
    saveTasks(tasks);
    return tasks;
  }

  function seedExamsIfEmpty() {
    let list = loadExams();
    if (list.length > 0) return list;
    list = examSeed.map((e) => ({ ...e, id: generateId() }));
    saveExams(list);
    return list;
  }

  function generateRandomSchedule() {
    const subjects = [
      "Matemáticas",
      "Lengua y Literatura",
      "Historia",
      "Ciencias",
      "Inglés",
      "Física",
      "Química",
      "Biología",
      "Geografía",
      "Educación Física",
      "Arte",
      "Tecnología",
    ];

    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const pickManyUnique = (arr, n) => {
      const pool = [...arr];
      const out = [];
      while (pool.length && out.length < n) {
        const idx = Math.floor(Math.random() * pool.length);
        out.push(pool.splice(idx, 1)[0]);
      }
      return out;
    };

    const room = () => {
      const buildings = ["A", "B", "C", "D"];
      const b = pick(buildings);
      const num = String(1 + Math.floor(Math.random() * 20)).padStart(2, "0");
      const extra = Math.random() < 0.22 ? `-${1 + Math.floor(Math.random() * 3)}` : "";
      return `${b}-${num}${extra}`;
    };

    const specialRooms = ["Lab 1", "Lab 2", "Aula Multimedia", "Sala de Cómputo", "Gimnasio"];
    const pickRoom = (subject) => {
      if (subject === "Educación Física") return "Gimnasio";
      if (["Física", "Química", "Biología", "Ciencias"].includes(subject)) return Math.random() < 0.55 ? pick(specialRooms) : room();
      if (["Tecnología"].includes(subject)) return Math.random() < 0.65 ? "Sala de Cómputo" : room();
      return room();
    };

    const startHour = 7 + Math.floor(Math.random() * 3); // 07–09
    const startMinute = Math.random() < 0.5 ? 0 : 30;
    const blocks = 3 + Math.floor(Math.random() * 3); // 3–5
    const selectedSubjects = pickManyUnique(subjects, blocks);

    const pad2 = (n) => String(n).padStart(2, "0");
    const addMinutes = (h, m, delta) => {
      const total = h * 60 + m + delta;
      return { h: Math.floor(total / 60), m: total % 60 };
    };

    const out = [];
    let t = { h: startHour, m: startMinute };
    for (let i = 0; i < blocks; i += 1) {
      const subject = selectedSubjects[i];
      out.push({
        time: `${pad2(t.h)}:${pad2(t.m)}`,
        name: subject,
        room: pickRoom(subject),
      });
      // clase 60 min + recreo 10 min (excepto al final)
      t = addMinutes(t.h, t.m, i === blocks - 1 ? 60 : 70);
    }
    return out;
  }

  function formatDisplayDate(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("es", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }

  function greetingForHour() {
    const h = new Date().getHours();
    if (h < 12) return "¡Buenos días";
    if (h < 19) return "¡Buenas tardes";
    return "¡Buenas noches";
  }

  function showProfileModal() {
    const modal = document.getElementById("profileModal");
    if (!modal) return;
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }

  function hideProfileModal() {
    const modal = document.getElementById("profileModal");
    if (!modal) return;
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }

  function loadProfile() {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      const name = String(parsed.name ?? "").trim();
      const studentId = String(parsed.studentId ?? "").trim();
      if (!name) return null;
      return { name, studentId };
    } catch {
      return null;
    }
  }

  function saveProfile(profile) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }

  function ensureProfile() {
    return new Promise((resolve) => {
      const form = document.getElementById("profileForm");
      const nameInput = document.getElementById("studentName");
      const idInput = document.getElementById("studentId");

      const sanitizeNameLive = (value) => String(value ?? "").replace(/[0-9]/g, "");

      const sanitizeNameSubmit = (value) =>
        String(value ?? "")
          .replace(/[0-9]/g, "")
          .replace(/\s+/g, " ")
          .trim();

      const sanitizeStudentId = (value) => String(value ?? "").replace(/\D/g, "").trim();

      nameInput?.addEventListener("input", () => {
        const next = sanitizeNameLive(nameInput.value);
        if (nameInput.value !== next) nameInput.value = next;
      });

      idInput?.addEventListener("input", () => {
        const next = sanitizeStudentId(idInput.value);
        if (idInput.value !== next) idInput.value = next;
      });

      showProfileModal();

      const focusFirst = () => {
        if (nameInput && typeof nameInput.focus === "function") nameInput.focus();
      };
      setTimeout(focusFirst, 0);

      const onSubmit = (e) => {
        e.preventDefault();
        const name = sanitizeNameSubmit(nameInput?.value);
        const studentId = sanitizeStudentId(idInput?.value);

        if (nameInput) nameInput.value = name;
        if (idInput) idInput.value = studentId;

        if (!name) {
          nameInput?.setCustomValidity("Escribe tu nombre sin números.");
          nameInput?.reportValidity();
          return;
        }
        if (name.length < 10 || name.length > 60) {
          nameInput?.setCustomValidity("El nombre debe tener entre 10 y 60 caracteres.");
          nameInput?.reportValidity();
          return;
        }
        nameInput?.setCustomValidity("");

        if (!studentId) {
          idInput?.setCustomValidity("La matrícula debe ser solo números.");
          idInput?.reportValidity();
          return;
        }
        if (studentId.length < 10 || studentId.length > 20) {
          idInput?.setCustomValidity("La matrícula debe tener entre 10 y 20 dígitos.");
          idInput?.reportValidity();
          return;
        }
        idInput?.setCustomValidity("");

        const profile = { name, studentId };
        currentProfile = profile;
        saveProfile(profile);
        hideProfileModal();
        form?.removeEventListener("submit", onSubmit);
        resolve(profile);
      };

      form?.addEventListener("submit", onSubmit);
    });
  }

  function ensureProfileIfMissing() {
    const stored = loadProfile();
    if (stored?.name) {
      currentProfile = stored;
      return Promise.resolve(stored);
    }
    return ensureProfile();
  }

  function showToast(message) {
    const text = String(message ?? "").trim();
    if (!text) return;

    let el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.className =
        "fixed bottom-24 left-1/2 z-[70] hidden -translate-x-1/2 rounded-2xl border border-school-border bg-school-panel/90 px-4 py-3 text-sm font-semibold text-white shadow-card backdrop-blur-md";
      document.body.appendChild(el);
    }

    el.textContent = text;
    el.classList.remove("hidden");

    if (showToastTimeoutId) window.clearTimeout(showToastTimeoutId);
    showToastTimeoutId = window.setTimeout(() => {
      el?.classList.add("hidden");
    }, 1600);
  }

  function renderClasses() {
    const list = document.getElementById("classesList");
    const dateEl = document.getElementById("sidebarDate");
    if (dateEl) dateEl.textContent = formatDisplayDate(todayISO());
    if (!list) return;
    list.innerHTML = classesToday
      .map(
        (c) => `
      <li class="flex gap-3 rounded-xl border border-school-border/60 bg-school-navy/50 p-3 transition hover:border-sky-500/25">
        <span class="shrink-0 font-mono text-xs font-semibold text-sky-400">${c.time}</span>
        <div class="min-w-0">
          <p class="font-medium text-white">${escapeHtml(c.name)}</p>
          <p class="text-xs text-slate-500">Aula ${escapeHtml(c.room)}</p>
        </div>
      </li>`
      )
      .join("");
  }

  function renderExams() {
    const list = document.getElementById("examsList");
    if (!list) return;

    const allExams = loadExams();
    const sorted = [...allExams].sort((a, b) => {
      if (Boolean(a.completed) !== Boolean(b.completed)) return a.completed ? 1 : -1;
      return String(a.date || "").localeCompare(String(b.date || ""));
    });
    list.innerHTML = sorted
      .map((e) => {
        const done = Boolean(e.completed);
        const when = new Date(e.date + "T12:00:00");
        const nice = when.toLocaleDateString("es", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        return `
      <li class="exam-card flex flex-col gap-3 rounded-xl border border-school-border bg-school-panel/70 px-4 py-3 shadow-card transition hover:border-sky-500/25 sm:flex-row sm:items-center sm:justify-between ${done ? "opacity-70" : ""}" data-id="${escapeHtml(e.id)}">
        <div class="flex min-w-0 items-start gap-3">
          <button
            type="button"
            class="exam-complete-btn mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition ${
              done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-500 hover:border-emerald-400"
            }"
            aria-pressed="${done}"
            aria-label="${done ? "Marcar examen como pendiente" : "Marcar examen como completo"}"
          >
            ${done ? "✓" : ""}
          </button>
          <div class="min-w-0">
            <p class="font-semibold ${done ? "text-slate-500 line-through" : "text-white"}">${escapeHtml(e.subject)}</p>
            <p class="text-sm ${done ? "text-slate-600" : "text-slate-400"}">${escapeHtml(e.topic)}</p>
          </div>
        </div>
        <div class="flex items-center justify-between gap-3 sm:justify-end">
          <time datetime="${escapeHtml(e.date)}" class="shrink-0 rounded-lg bg-school-navy px-3 py-1.5 text-sm font-medium text-sky-300">${nice}</time>
          <button
            type="button"
            class="exam-delete-btn grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-red-500/10 hover:text-red-400"
            aria-label="Eliminar examen"
            title="Eliminar"
          >
            🗑️
          </button>
        </div>
      </li>`;
      })
      .join("");

    const heroNext = document.getElementById("nextExamSummary");
    if (heroNext) {
      const pending = [...allExams].filter((x) => !x.completed);
      const pendingSorted = pending.sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
      if (pendingSorted.length) {
        const first = pendingSorted[0];
        const when = new Date(first.date + "T12:00:00");
        heroNext.textContent = `${first.subject} · ${when.toLocaleDateString("es", { day: "numeric", month: "short" })}`;
      } else {
        heroNext.textContent = "—";
      }
    }

    list.querySelectorAll(".exam-card").forEach((card) => {
      const id = card.getAttribute("data-id");
      const completeBtn = card.querySelector(".exam-complete-btn");
      const deleteBtn = card.querySelector(".exam-delete-btn");

      completeBtn?.addEventListener("click", () => {
        const all = loadExams();
        const exam = all.find((x) => x.id === id);
        if (exam) {
          exam.completed = !Boolean(exam.completed);
          saveExams(all);
          renderExams();
        }
      });

      deleteBtn?.addEventListener("click", () => {
        const all = loadExams().filter((x) => x.id !== id);
        saveExams(all);
        renderExams();
      });
    });
  }

  function renderAnnouncements() {
    const container = document.getElementById("announcementsList");
    if (!container) return;
    const list = allAnnouncements();
    container.innerHTML = list
      .map(
        (a) => `
      <article class="rounded-2xl border border-school-border bg-school-panel/70 p-5 shadow-card transition hover:border-sky-500/20">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="flex min-w-0 flex-wrap items-center gap-2">
            <span class="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">${escapeHtml(a.tag)}</span>
            <h3 class="min-w-0 text-lg font-semibold text-white">${escapeHtml(a.title)}</h3>
          </div>
          ${
            a._source === "user" && a.id
              ? `<button type="button" class="announcement-delete-btn inline-flex items-center gap-2 rounded-xl border border-school-border bg-school-navy/40 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-red-500/40 hover:text-white" data-announcement-delete="${escapeHtml(
                  a.id
                )}" aria-label="Eliminar anuncio">
                  <span aria-hidden="true">🗑️</span>
                  <span>Eliminar</span>
                </button>`
              : ""
          }
        </div>
        <p class="mt-2 text-sm leading-relaxed text-slate-400">${escapeHtml(a.body)}</p>
      </article>`
      )
      .join("");

    container.querySelectorAll("[data-announcement-delete]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-announcement-delete");
        if (!id) return;
        const next = loadUserAnnouncements().filter((x) => x.id !== id);
        saveUserAnnouncements(next);
        showToast("Anuncio eliminado");
        renderAnnouncements();
      });
    });

    const home = document.getElementById("homeAnnouncementsList");
    if (home) {
      home.innerHTML = list
        .slice(0, 2)
        .map(
          (a) => `
      <article class="rounded-2xl border border-school-border bg-school-panel/60 p-4 shadow-card transition hover:border-sky-500/20">
        <div class="flex items-center gap-2">
          <span class="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">${escapeHtml(a.tag)}</span>
          <h3 class="text-sm font-semibold text-white">${escapeHtml(a.title)}</h3>
        </div>
        <p class="mt-2 text-sm text-slate-400">${escapeHtml(a.body)}</p>
      </article>`
        )
        .join("");
    }
  }

  function initAnnouncementsComposer() {
    const view = document.getElementById("view-announcements");
    const container = document.getElementById("announcementsList");
    if (!view || !container) return;
    if (document.getElementById("announcementComposer")) return;

    const wrap = document.createElement("section");
    wrap.id = "announcementComposer";
    wrap.className = "rounded-2xl border border-school-border bg-school-panel/40 p-4 shadow-card";
    wrap.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-base font-semibold text-white">Agregar anuncio</h2>
        <p class="text-xs text-slate-500">Se guarda en este navegador.</p>
      </div>
      <form id="announcementForm" class="mt-3 grid gap-3 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <label for="announcementTitle" class="block text-xs font-medium text-slate-400">Título</label>
          <input id="announcementTitle" name="title" type="text" required
            class="mt-1.5 w-full rounded-xl border border-school-border bg-school-navy px-4 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20"
            placeholder="Ej. Cambio de salón en 2°B" />
        </div>
        <div>
          <label for="announcementTag" class="block text-xs font-medium text-slate-400">Etiqueta</label>
          <input id="announcementTag" name="tag" type="text" required
            class="mt-1.5 w-full rounded-xl border border-school-border bg-school-navy px-4 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
            placeholder="Aviso" />
        </div>
        <div>
          <label for="announcementBody" class="block text-xs font-medium text-slate-400">Descripción</label>
          <input id="announcementBody" name="body" type="text" required
            class="mt-1.5 w-full rounded-xl border border-school-border bg-school-navy px-4 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20"
            placeholder="Escribe el contenido del anuncio" />
        </div>
        <div class="sm:col-span-2">
          <button type="submit"
            class="w-full rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-900/30 transition hover:from-sky-500 hover:to-sky-400 hover:shadow-sky-500/20 sm:w-auto sm:px-8">
            Publicar anuncio
          </button>
        </div>
      </form>
    `;

    // Insert composer after the "Urgente" card (before list).
    container.parentElement?.insertBefore(wrap, container);

    const form = document.getElementById("announcementForm");
    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      const title = String(document.getElementById("announcementTitle")?.value ?? "").trim();
      const tag = String(document.getElementById("announcementTag")?.value ?? "").trim();
      const body = String(document.getElementById("announcementBody")?.value ?? "").trim();
      if (!title || !tag || !body) return;

      const user = loadUserAnnouncements();
      user.unshift({
        id: generateId(),
        title,
        tag,
        body,
        createdAt: new Date().toISOString(),
      });
      saveUserAnnouncements(user);
      form.reset();
      showToast("Anuncio agregado");
      renderAnnouncements();
    });
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function countPending(tasks) {
    return tasks.filter((x) => !x.completed).length;
  }

  function updateHero(tasks, profile) {
    const greet = document.getElementById("heroGreeting");
    if (greet) greet.textContent = `${greetingForHour()}, ${profile?.name ?? "estudiante"}!`;
    const meta = document.getElementById("heroStudentMeta");
    if (meta) meta.textContent = profile?.studentId ? `Matrícula: ${profile.studentId}` : "";
    const pending = document.getElementById("pendingCount");
    if (pending) pending.textContent = String(countPending(tasks));
  }

  function renderTasks(tasks, profile) {
    const container = document.getElementById("tasksList");
    const empty = document.getElementById("tasksEmpty");
    if (!container) return;

    const sorted = [...tasks].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const dateCmp = String(a.date || "").localeCompare(String(b.date || ""));
      if (dateCmp !== 0) return dateCmp;
      return String(a.title || "").localeCompare(String(b.title || ""));
    });

    if (sorted.length === 0) {
      container.innerHTML = "";
      if (empty) empty.classList.remove("hidden");
    } else {
      if (empty) empty.classList.add("hidden");
      container.innerHTML = sorted
        .map((task) => {
          const done = task.completed;
          return `
        <article class="task-card rounded-2xl border border-school-border bg-school-card p-4 shadow-card ${done ? "completed" : ""}" data-id="${escapeHtml(task.id)}">
          <div class="flex items-start gap-3">
            <button
              type="button"
              class="complete-btn mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition ${
                done
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-slate-500 hover:border-emerald-400"
              }"
              aria-pressed="${done}"
              aria-label="${done ? "Marcar como pendiente" : "Marcar como completada"}"
            >
              ${done ? "✓" : ""}
            </button>
            <div class="min-w-0 flex-1">
              <h3 class="font-semibold ${done ? "text-slate-500 line-through" : "text-white"}">${escapeHtml(task.title)}</h3>
              <p class="mt-1 text-sm ${done ? "text-slate-600" : "text-sky-400/90"}">${escapeHtml(task.subject)}</p>
              <p class="mt-1 text-xs text-slate-500">${formatDisplayDate(task.date)}</p>
            </div>
            <button
              type="button"
              class="delete-btn rounded-lg p-2 text-slate-500 transition hover:bg-red-500/10 hover:text-red-400"
              aria-label="Eliminar tarea"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </article>`;
        })
        .join("");
    }

    container.querySelectorAll(".task-card").forEach((card) => {
      const id = card.getAttribute("data-id");
      const completeBtn = card.querySelector(".complete-btn");
      const deleteBtn = card.querySelector(".delete-btn");

      completeBtn?.addEventListener("click", () => {
        const all = loadTasks();
        const task = all.find((x) => x.id === id);
        if (task) {
          task.completed = !task.completed;
          saveTasks(all);
          refresh(profile);
        }
      });

      deleteBtn?.addEventListener("click", () => {
        const all = loadTasks().filter((x) => x.id !== id);
        saveTasks(all);
        refresh(profile);
      });
    });

    updateHero(tasks, profile);
  }

  function refresh(profile) {
    const tasks = loadTasks();
    renderTasks(tasks, profile);
  }

  function initForm() {
    const form = document.getElementById("taskForm");
    const dateInput = document.getElementById("taskDate");
    if (dateInput) dateInput.value = todayISO();

    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      const title = document.getElementById("taskTitle")?.value.trim();
      const subject = document.getElementById("taskSubject")?.value.trim();
      const date = document.getElementById("taskDate")?.value;
      if (!title || !subject || !date) return;

      const tasks = loadTasks();
      tasks.push({
        id: generateId(),
        title,
        subject,
        date,
        completed: false,
      });
      saveTasks(tasks);
      form.reset();
      if (dateInput) dateInput.value = todayISO();
      refresh(currentProfile);
      showToast("Tarea agregada");
    });
  }

  function initExamForm() {
    const form = document.getElementById("examForm");
    const dateInput = document.getElementById("examDate");
    if (dateInput) dateInput.value = todayISO();

    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      const subject = String(document.getElementById("examSubject")?.value ?? "").trim();
      const topic = String(document.getElementById("examTopic")?.value ?? "").trim();
      const date = String(document.getElementById("examDate")?.value ?? "").trim();
      if (!subject || !topic || !date) return;

      const exams = loadExams();
      exams.push({
        id: generateId(),
        subject,
        topic,
        date,
        completed: false,
      });
      saveExams(exams);
      form.reset();
      if (dateInput) dateInput.value = todayISO();
      renderExams();
      showToast("Examen agregado");
    });
  }

  function initTheme() {
    const html = document.documentElement;
    const stored = localStorage.getItem(THEME_KEY);
    const isLight = stored === "light";
    if (isLight) {
      html.classList.remove("dark");
      document.body.classList.remove("dark");
    } else {
      html.classList.add("dark");
      document.body.classList.add("dark");
    }
    updateThemeUI(!isLight);
  }

  function updateThemeUI(isDark) {
    const icon = document.getElementById("themeIcon");
    const label = document.getElementById("themeLabel");
    if (icon) icon.textContent = isDark ? "☀️" : "🌙";
    if (label) label.textContent = isDark ? "Claro" : "Oscuro";
  }

  function initThemeToggle() {
    document.getElementById("themeToggle")?.addEventListener("click", () => {
      const html = document.documentElement;
      const dark = html.classList.toggle("dark");
      document.body.classList.toggle("dark", dark);
      localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
      updateThemeUI(dark);
    });
  }

  function initLogout() {
    document.getElementById("logoutBtn")?.addEventListener("click", () => {
      try {
        localStorage.clear();
      } finally {
        window.location.reload();
      }
    });
  }

  function initBottomNav() {
    const buttons = Array.from(document.querySelectorAll(".nav-btn"));
    if (!buttons.length) return;

    const views = {
      home: document.getElementById("view-home"),
      tasks: document.getElementById("view-tasks"),
      exams: document.getElementById("view-exams"),
      announcements: document.getElementById("view-announcements"),
    };

    const showView = (key) => {
      const k = String(key || "home");
      Object.entries(views).forEach(([name, el]) => {
        if (!el) return;
        el.classList.toggle("hidden", name !== k);
      });
      currentView = k;
      setActive(k);
      history.replaceState(null, "", `#${k}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const setActive = (viewKey) => {
      const id = String(viewKey || "home");
      buttons.forEach((btn) => {
        const target = String(btn.getAttribute("data-view") || "");
        const active = target === id;
        btn.classList.toggle("text-white", active);
        btn.classList.toggle("text-slate-400", !active);
        btn.classList.toggle("bg-school-panel/40", active);
      });
    };

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-view");
        if (target) showView(target);
      });
    });

    const initial = String(location.hash || "#home").replace(/^#/, "");
    showView(views[initial] ? initial : "home");

    document.querySelectorAll("[data-nav]").forEach((el) => {
      el.addEventListener("click", () => showView(el.getAttribute("data-nav")));
    });

    window.addEventListener("hashchange", () => {
      const next = String(location.hash || "#home").replace(/^#/, "");
      showView(views[next] ? next : "home");
    });
  }

  function initFab() {
    const fab = document.getElementById("fabAdd");
    if (!fab) return;

    const closeMenu = () => {
      const panel = document.getElementById("fabMenu");
      const backdrop = document.getElementById("fabMenuBackdrop");
      panel?.classList.add("hidden");
      backdrop?.classList.add("hidden");
      fab.setAttribute("aria-expanded", "false");
    };

    const openMenu = () => {
      let backdrop = document.getElementById("fabMenuBackdrop");
      if (!backdrop) {
        backdrop = document.createElement("button");
        backdrop.type = "button";
        backdrop.id = "fabMenuBackdrop";
        backdrop.className = "fixed inset-0 z-[65] hidden bg-black/35 backdrop-blur-[1px]";
        backdrop.setAttribute("aria-label", "Cerrar menú");
        backdrop.addEventListener("click", closeMenu);
        document.body.appendChild(backdrop);
      }

      let panel = document.getElementById("fabMenu");
      if (!panel) {
        panel = document.createElement("div");
        panel.id = "fabMenu";
        panel.className =
          "fixed bottom-40 right-5 z-[66] hidden w-[min(280px,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-school-border bg-school-panel/90 shadow-card backdrop-blur-md";
        panel.innerHTML = `
          <div class="px-4 py-3">
            <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Agregar</p>
          </div>
          <div class="grid gap-1 px-2 pb-2">
            <button type="button" class="fab-action group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-school-navy/40" data-fab-target="tasks" data-fab-focus="taskTitle">
              <span class="grid h-9 w-9 place-items-center rounded-xl border border-school-border/60 bg-school-navy/40 text-base transition group-hover:border-emerald-500/40">📋</span>
              <span class="min-w-0">
                <span class="block text-sm font-semibold text-white">Agregar tarea</span>
                <span class="block text-xs text-slate-500">Descripción, materia y fecha</span>
              </span>
            </button>
            <button type="button" class="fab-action group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-school-navy/40" data-fab-target="exams" data-fab-focus="examSubject">
              <span class="grid h-9 w-9 place-items-center rounded-xl border border-school-border/60 bg-school-navy/40 text-base transition group-hover:border-sky-500/40">🧾</span>
              <span class="min-w-0">
                <span class="block text-sm font-semibold text-white">Agregar examen</span>
                <span class="block text-xs text-slate-500">Materia, tema y fecha</span>
              </span>
            </button>
            <button type="button" class="fab-action group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-school-navy/40" data-fab-target="announcements" data-fab-focus="announcementTitle">
              <span class="grid h-9 w-9 place-items-center rounded-xl border border-school-border/60 bg-school-navy/40 text-base transition group-hover:border-emerald-500/40">📣</span>
              <span class="min-w-0">
                <span class="block text-sm font-semibold text-white">Agregar anuncio</span>
                <span class="block text-xs text-slate-500">Publica un aviso para todos</span>
              </span>
            </button>
          </div>
        `;
        document.body.appendChild(panel);

        panel.querySelectorAll(".fab-action").forEach((btn) => {
          btn.addEventListener("click", () => {
            const target = btn.getAttribute("data-fab-target") || "tasks";
            const focusId = btn.getAttribute("data-fab-focus") || "";
            closeMenu();
            window.location.hash = `#${target}`;
            setTimeout(() => {
              if (target === "announcements") initAnnouncementsComposer();
              document.getElementById(focusId)?.focus();
            }, 0);
          });
        });
      }

      backdrop.classList.remove("hidden");
      panel.classList.remove("hidden");
      fab.setAttribute("aria-expanded", "true");
    };

    fab.setAttribute("aria-haspopup", "true");
    fab.setAttribute("aria-expanded", "false");

    fab.addEventListener("click", () => {
      const panel = document.getElementById("fabMenu");
      const open = panel && !panel.classList.contains("hidden");
      if (open) closeMenu();
      else openMenu();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });
  }

  function initLightModeStyles() {
    const style = document.createElement("style");
    style.textContent = `
      html:not(.dark) body {
        background-color: #f0f4f8;
        color: #1e293b;
      }
      html:not(.dark) .bg-school-navy { background-color: #f0f4f8 !important; }
      html:not(.dark) .bg-school-panel { background-color: #ffffff !important; }
      html:not(.dark) .bg-school-panel\\/80 { background-color: rgba(255,255,255,0.92) !important; }
      html:not(.dark) .bg-school-panel\\/60 { background-color: rgba(255,255,255,0.85) !important; }
      html:not(.dark) .bg-school-panel\\/70 { background-color: rgba(255,255,255,0.9) !important; }
      html:not(.dark) .bg-school-panel\\/50 { background-color: rgba(255,255,255,0.8) !important; }
      html:not(.dark) .bg-school-panel\\/40 { background-color: rgba(255,255,255,0.75) !important; }
      html:not(.dark) .bg-school-card { background-color: #e8eef5 !important; }
      html:not(.dark) .bg-school-navy\\/60 { background-color: rgba(241,245,249,0.95) !important; }
      html:not(.dark) .bg-school-navy\\/50 { background-color: rgba(226,232,240,0.9) !important; }
      html:not(.dark) .from-school-card { --tw-gradient-from: #e8eef5 !important; }
      html:not(.dark) .via-school-panel { --tw-gradient-via: #ffffff !important; }
      html:not(.dark) .to-school-navy { --tw-gradient-to: #f0f4f8 !important; }
      html:not(.dark) .border-school-border { border-color: #cbd5e1 !important; }
      html:not(.dark) .text-white { color: #0f172a !important; }
      html:not(.dark) .text-slate-200 { color: #334155 !important; }
      html:not(.dark) .text-slate-400 { color: #64748b !important; }
      html:not(.dark) .text-slate-500 { color: #64748b !important; }
      html:not(.dark) .text-slate-300 { color: #475569 !important; }
      html:not(.dark) .text-sky-300 { color: #0369a1 !important; }
      html:not(.dark) .text-sky-400 { color: #0284c7 !important; }
      html:not(.dark) input, html:not(.dark) .\\[color-scheme\\:dark\\] { color-scheme: light; }
      html:not(.dark) input {
        background-color: #fff !important;
        color: #0f172a !important;
        border-color: #cbd5e1 !important;
      }
      html:not(.dark) .placeholder\\:text-slate-600::placeholder { color: #94a3b8 !important; }
    `;
    document.head.appendChild(style);
  }

  async function boot() {
    initLightModeStyles();
    const profile = await ensureProfileIfMissing();
    seedTasksIfEmpty();
    seedExamsIfEmpty();
    classesToday = generateRandomSchedule();
    renderClasses();
    renderExams();
    renderAnnouncements();
    initAnnouncementsComposer();
    initForm();
    initExamForm();
    initTheme();
    initThemeToggle();
    initLogout();
    initBottomNav();
    initFab();
    refresh(profile);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
