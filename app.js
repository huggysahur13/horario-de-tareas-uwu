(function () {
  "use strict";

  const STORAGE_KEY = "schoolfix_tasks_v1";
  const EXAMS_KEY = "schoolfix_exams_v1";
  const THEME_KEY = "schoolfix_theme";
  let currentProfile = null;

  const todayISO = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const classesToday = [
    { time: "08:00", name: "Matemáticas", room: "A-12" },
    { time: "09:30", name: "Historia", room: "B-04" },
    { time: "11:00", name: "Ciencias", room: "Lab 2" },
    { time: "12:30", name: "Inglés", room: "C-08" },
  ];

  const examSeed = [
    { subject: "Matemáticas", date: "2026-05-15", topic: "Álgebra y funciones", completed: false },
    { subject: "Historia", date: "2026-05-20", topic: "Revolución industrial", completed: false },
    { subject: "Biología", date: "2026-05-22", topic: "Célula y genética", completed: false },
  ];

  const announcements = [
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
  ];

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

  function ensureProfile() {
    return new Promise((resolve) => {
      const form = document.getElementById("profileForm");
      const nameInput = document.getElementById("studentName");
      const idInput = document.getElementById("studentId");

      showProfileModal();

      const focusFirst = () => {
        if (nameInput && typeof nameInput.focus === "function") nameInput.focus();
      };
      setTimeout(focusFirst, 0);

      const onSubmit = (e) => {
        e.preventDefault();
        const name = String(nameInput?.value ?? "").trim();
        const studentId = String(idInput?.value ?? "").trim();
        if (!name || !studentId) return;

        const profile = { name, studentId };
        currentProfile = profile;
        hideProfileModal();
        form?.removeEventListener("submit", onSubmit);
        resolve(profile);
      };

      form?.addEventListener("submit", onSubmit);
    });
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
    container.innerHTML = announcements
      .map(
        (a) => `
      <article class="rounded-2xl border border-school-border bg-school-panel/70 p-5 shadow-card transition hover:border-sky-500/20">
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">${escapeHtml(a.tag)}</span>
          <h3 class="text-lg font-semibold text-white">${escapeHtml(a.title)}</h3>
        </div>
        <p class="mt-2 text-sm leading-relaxed text-slate-400">${escapeHtml(a.body)}</p>
      </article>`
      )
      .join("");

    const home = document.getElementById("homeAnnouncementsList");
    if (home) {
      home.innerHTML = announcements
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

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function countPendingToday(tasks) {
    const t = todayISO();
    return tasks.filter((x) => x.date === t && !x.completed).length;
  }

  function updateHero(tasks, profile) {
    const greet = document.getElementById("heroGreeting");
    if (greet) greet.textContent = `${greetingForHour()}, ${profile?.name ?? "estudiante"}!`;
    const meta = document.getElementById("heroStudentMeta");
    if (meta) meta.textContent = profile?.studentId ? `Matrícula: ${profile.studentId}` : "";
    const pending = document.getElementById("pendingCount");
    if (pending) pending.textContent = String(countPendingToday(tasks));
  }

  function renderTasks(tasks, profile) {
    const container = document.getElementById("tasksList");
    const empty = document.getElementById("tasksEmpty");
    if (!container) return;

    const t = todayISO();
    const todayTasks = tasks.filter((x) => x.date === t);
    const sorted = [...todayTasks].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return a.title.localeCompare(b.title);
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
  }

  function initFab() {
    document.getElementById("fabAdd")?.addEventListener("click", () => {
      const btn = document.querySelector('.nav-btn[data-view="tasks"]');
      btn?.dispatchEvent(new Event("click"));
      setTimeout(() => document.getElementById("taskTitle")?.focus(), 0);
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
    const profile = await ensureProfile();
    seedTasksIfEmpty();
    seedExamsIfEmpty();
    renderClasses();
    renderExams();
    renderAnnouncements();
    initForm();
    initExamForm();
    initTheme();
    initThemeToggle();
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
