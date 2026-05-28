(function () {
  "use strict";

  const STORAGE_KEY = "schoolfix_tasks_v1";
  const EXAMS_KEY = "schoolfix_exams_v1";
  const THEME_KEY = "schoolfix_theme";
  const PROFILE_KEY = "schoolfix_profile_v1";
  const ANNOUNCEMENTS_KEY = "announcements";
  const SCHEDULE_KEY = "schedule";
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

  const scheduleDays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
  const schedulePeriods = 8;

  const examSeed = [
    { subject: "Matemáticas", date: "2026-05-15", topic: "Álgebra y funciones", completed: false },
    { subject: "Historia", date: "2026-05-20", topic: "Revolución industrial", completed: false },
    { subject: "Biología", date: "2026-05-22", topic: "Célula y genética", completed: false },
  ];

  const defaultAnnouncements = [
    {
      title: "Reunión informativa de evaluación",
      body: "Hoy 17:00 en el salón de actos. Se revisarán fechas de entrega y criterios de evaluación.",
      tag: "Evento",
    },
    {
      title: "Biblioteca: horario extendido",
      body: "Martes y jueves hasta las 19:00. Recuerda llevar credencial para préstamo de libros.",
      tag: "Servicios",
    },
    {
      title: "Convocatoria: concurso de carteles",
      body: "Tema: cuidado del agua. Entrega en prefectura antes del viernes 14:00.",
      tag: "Convocatoria",
    },
    {
      title: "Taller de técnicas de estudio",
      body: "Jueves 13:30 en aula multimedia. Cupo limitado; registra tu asistencia en coordinación.",
      tag: "Taller",
    },
  ];

  function loadAnnouncements() {
    try {
      const raw = localStorage.getItem(ANNOUNCEMENTS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveAnnouncements(list) {
    localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(list));
  }

  function toEpoch(value) {
    const raw = String(value ?? "");
    const t = Date.parse(raw);
    return Number.isFinite(t) ? t : 0;
  }

  function tagStyles(tag) {
    const t = String(tag || "Aviso");
    const map = {
      Evento: "bg-sky-500/15 text-sky-300 border-sky-500/25",
      Servicios: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
      Convocatoria: "bg-violet-500/15 text-violet-300 border-violet-500/25",
      Taller: "bg-amber-500/15 text-amber-300 border-amber-500/25",
      "Académico": "bg-blue-500/15 text-blue-300 border-blue-500/25",
      Aviso: "bg-slate-500/15 text-slate-300 border-slate-500/25",
      Club: "bg-pink-500/15 text-pink-300 border-pink-500/25",
    };
    return map[t] || map.Aviso;
  }

  function normalizeAnnouncement(a) {
    const title = String(a?.title ?? "").trim();
    const body = String(a?.body ?? "").trim();
    const tag = String(a?.tag ?? "Aviso").trim() || "Aviso";
    const id = String(a?.id ?? "").trim() || generateId();
    const createdAt = String(a?.createdAt ?? new Date().toISOString());
    if (!title || !body) return null;
    return { id, title, body, tag, createdAt };
  }

  function ensureAnnouncementsSeeded() {
    // Migration from previous key (if exists).
    const legacy = localStorage.getItem("schoolfix_announcements_v1");
    if (legacy && !localStorage.getItem(ANNOUNCEMENTS_KEY)) {
      try {
        const parsed = JSON.parse(legacy);
        if (Array.isArray(parsed)) {
          const migrated = parsed.map((x) => normalizeAnnouncement(x)).filter(Boolean);
          saveAnnouncements(migrated);
        }
      } catch {
        // ignore
      }
    }

    const existing = loadAnnouncements().map((x) => normalizeAnnouncement(x)).filter(Boolean);
    if (existing.length) {
      saveAnnouncements(existing);
      return existing;
    }

    const seeded = defaultAnnouncements.map((x) =>
      normalizeAnnouncement({ ...x, id: generateId(), createdAt: new Date().toISOString() })
    );
    saveAnnouncements(seeded);
    return seeded;
  }

  function generateRandomAnnouncements(count) {
    const tags = ["Evento", "Servicios", "Convocatoria", "Taller", "Académico", "Aviso", "Club"];
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const day = () => {
      const d = new Date();
      d.setDate(d.getDate() + (1 + Math.floor(Math.random() * 8)));
      return d.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "short" });
    };
    const time = () => {
      const h = 8 + Math.floor(Math.random() * 10);
      const m = Math.random() < 0.5 ? "00" : "30";
      return `${String(h).padStart(2, "0")}:${m}`;
    };
    const places = ["salón de actos", "aula multimedia", "Lab 1", "Lab 2", "biblioteca", "patio central", "coordinación"];
    const templates = {
      Evento: () => ({
        title: `Evento escolar — ${day()}`,
        body: `Actividad programada a las ${time()} en ${pick(places)}. Llega 10 minutos antes.`,
      }),
      Servicios: () => ({
        title: "Servicios escolares: aviso importante",
        body: `Atención en ${pick(["biblioteca", "coordinación", "prefectura"])} disponible hoy hasta las ${time()}.`,
      }),
      Convocatoria: () => ({
        title: "Convocatoria abierta",
        body: `Participa en la convocatoria de esta semana. Entrega tu registro antes del ${day()} en coordinación.`,
      }),
      Taller: () => ({
        title: "Taller disponible",
        body: `Taller práctico el ${day()} a las ${time()} en ${pick(["aula multimedia", "Lab 1", "Lab 2"])}. Cupo limitado.`,
      }),
      "Académico": () => ({
        title: "Aviso académico",
        body: `Revisión de avances y dudas el ${day()} a las ${time()}. Consulta con tu docente para el salón asignado.`,
      }),
      Aviso: () => ({
        title: "Aviso general",
        body: `Recuerda portar tu credencial y revisar el tablero de anuncios. Actualización vigente desde ${day()}.`,
      }),
      Club: () => ({
        title: "Club: reunión",
        body: `Reunión de club el ${day()} a las ${time()} en ${pick(["Lab 1", "biblioteca", "aula multimedia"])}. Nuevos integrantes bienvenidos.`,
      }),
    };

    const out = [];
    for (let i = 0; i < count; i += 1) {
      const tag = pick(tags);
      const content = templates[tag]();
      out.push(
        normalizeAnnouncement({
          id: generateId(),
          tag,
          title: content.title,
          body: content.body,
          createdAt: new Date().toISOString(),
        })
      );
    }
    return out.filter(Boolean);
  }

  function addRandomAnnouncementsOnBoot() {
    const existing = ensureAnnouncementsSeeded();
    const n = 2 + Math.floor(Math.random() * 2); // 2–3
    const generated = generateRandomAnnouncements(n);
    const merged = [...generated, ...existing];
    // Deduplicate by id (just in case).
    const seen = new Set();
    const unique = merged.filter((x) => {
      if (!x?.id || seen.has(x.id)) return false;
      seen.add(x.id);
      return true;
    });
    saveAnnouncements(unique);
    return unique;
  }

  function loadSchedule() {
    try {
      const raw = localStorage.getItem(SCHEDULE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function saveSchedule(schedule) {
    localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule));
  }

  function softColors() {
    return [
      "#34d399", // emerald
      "#60a5fa", // blue
      "#a78bfa", // violet
      "#fb923c", // orange
      "#f472b6", // pink
      "#fbbf24", // amber
      "#22d3ee", // cyan
      "#c084fc", // purple
    ];
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function normalizeCell(cell) {
    if (!cell || typeof cell !== "object") return { name: "", color: "" };
    return {
      name: String(cell.name ?? "").trim(),
      color: String(cell.color ?? "").trim(),
    };
  }

  function buildEmptySchedule() {
    const grid = {};
    scheduleDays.forEach((d) => {
      grid[d] = Array.from({ length: schedulePeriods }, () => ({ name: "", color: "" }));
    });
    return { days: scheduleDays, periods: schedulePeriods, grid };
  }

  function generateRandomWeeklySchedule() {
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

    const palette = softColors();
    const subjectColor = new Map();
    const colorFor = (name) => {
      const key = String(name || "").trim() || "Clase";
      if (subjectColor.has(key)) return subjectColor.get(key);
      const used = new Set(Array.from(subjectColor.values()));
      const available = palette.filter((c) => !used.has(c));
      const chosen = pick(available.length ? available : palette);
      subjectColor.set(key, chosen);
      return chosen;
    };

    const schedule = buildEmptySchedule();
    scheduleDays.forEach((day) => {
      for (let p = 0; p < schedulePeriods; p += 1) {
        const s = pick(subjects);
        schedule.grid[day][p] = { name: s, color: colorFor(s) };
      }
    });
    return schedule;
  }

  function ensureSchedule() {
    const loaded = loadSchedule();
    if (
      loaded &&
      Array.isArray(loaded.days) &&
      loaded.days.length === scheduleDays.length &&
      loaded.grid &&
      typeof loaded.grid === "object"
    ) {
      // normalize cells
      scheduleDays.forEach((d) => {
        const col = Array.isArray(loaded.grid[d]) ? loaded.grid[d] : [];
        loaded.grid[d] = Array.from({ length: schedulePeriods }, (_, i) => normalizeCell(col[i]));
      });
      loaded.periods = schedulePeriods;
      loaded.days = scheduleDays;
      saveSchedule(loaded);
      return loaded;
    }
    const fresh = generateRandomWeeklySchedule();
    saveSchedule(fresh);
    return fresh;
  }

  function fgFor(bg) {
    const c = String(bg || "").replace("#", "");
    if (c.length !== 6) return "#0b1220";
    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 160 ? "#0b1220" : "#0b1220";
  }

  function scheduleRows() {
    const rows = [];
    let period = 1;
    for (let i = 1; i <= schedulePeriods; i += 1) {
      rows.push({ type: "period", label: `Periodo ${period}`, periodIndex: period - 1 });
      if (i === 3 || i === 6) rows.push({ type: "break", label: "Receso" });
      period += 1;
    }
    return rows;
  }

  function openScheduleEditor({ day, periodIndex, initial }) {
    const existing = initial || { name: "", color: "" };
    let modal = document.getElementById("scheduleEditor");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "scheduleEditor";
      modal.className = "fixed inset-0 z-[80] hidden items-center justify-center bg-black/60 p-4 backdrop-blur-sm";
      modal.innerHTML = `
        <div class="w-full max-w-md rounded-2xl border border-school-border bg-school-panel p-5 shadow-card">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h3 class="text-lg font-semibold text-white">Editar clase</h3>
              <p id="scheduleEditorMeta" class="mt-1 text-sm text-slate-400"></p>
            </div>
            <button type="button" id="scheduleEditorClose" class="grid h-9 w-9 place-items-center rounded-xl border border-school-border bg-school-navy/40 text-slate-300 transition hover:text-white" aria-label="Cerrar">✕</button>
          </div>

          <div class="mt-4 grid gap-3">
            <div>
              <label for="scheduleEditorName" class="block text-xs font-medium text-slate-400">Materia</label>
              <input id="scheduleEditorName" type="text"
                class="mt-1.5 w-full rounded-xl border border-school-border bg-school-navy px-4 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Escribe el nombre de la clase" />
            </div>

            <div>
              <p class="text-xs font-medium text-slate-400">Color</p>
              <div id="scheduleEditorColors" class="mt-2 flex flex-wrap gap-2"></div>
            </div>

            <div class="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button type="button" id="scheduleEditorClear"
                class="rounded-xl border border-school-border bg-school-navy/40 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-red-500/40 hover:text-white">
                Limpiar
              </button>
              <button type="button" id="scheduleEditorSave"
                class="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition hover:from-emerald-500 hover:to-emerald-400">
                Guardar
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    const meta = document.getElementById("scheduleEditorMeta");
    const nameInput = document.getElementById("scheduleEditorName");
    const colorsWrap = document.getElementById("scheduleEditorColors");

    const palette = softColors();
    let chosen = existing.color || pick(palette);

    if (meta) meta.textContent = `${day} · Periodo ${periodIndex + 1}`;
    if (nameInput) nameInput.value = existing.name || "";
    if (colorsWrap) {
      colorsWrap.innerHTML = palette
        .map(
          (c) => `
          <button type="button" class="schedule-color-btn grid h-9 w-9 place-items-center rounded-xl border border-school-border transition hover:border-white/20" data-color="${c}" style="background:${c}">
            <span class="text-[10px] font-black text-school-navy ${c === chosen ? "" : "opacity-0"}">✓</span>
          </button>`
        )
        .join("");
      colorsWrap.querySelectorAll("[data-color]").forEach((btn) => {
        btn.addEventListener("click", () => {
          chosen = btn.getAttribute("data-color") || chosen;
          colorsWrap.querySelectorAll("[data-color]").forEach((b) => {
            const mark = b.querySelector("span");
            const active = (b.getAttribute("data-color") || "") === chosen;
            if (mark) mark.classList.toggle("opacity-0", !active);
          });
        });
      });
    }

    const close = () => {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    };
    const open = () => {
      modal.classList.remove("hidden");
      modal.classList.add("flex");
      setTimeout(() => nameInput?.focus(), 0);
    };

    const closeBtn = document.getElementById("scheduleEditorClose");
    closeBtn?.addEventListener("click", close, { once: true });
    modal.addEventListener(
      "click",
      (e) => {
        if (e.target === modal) close();
      },
      { once: true }
    );

    document.getElementById("scheduleEditorClear")?.addEventListener(
      "click",
      () => {
        if (nameInput) nameInput.value = "";
        chosen = pick(palette);
        colorsWrap?.querySelectorAll("[data-color]").forEach((b) => {
          const mark = b.querySelector("span");
          const active = (b.getAttribute("data-color") || "") === chosen;
          if (mark) mark.classList.toggle("opacity-0", !active);
        });
      },
      { once: true }
    );

    document.getElementById("scheduleEditorSave")?.addEventListener(
      "click",
      () => {
        const name = String(nameInput?.value ?? "").replace(/\s+/g, " ").trim();
        const cell = { name, color: name ? chosen : "" };
        const schedule = ensureSchedule();
        schedule.grid[day][periodIndex] = cell;
        saveSchedule(schedule);
        renderWeeklySchedule();
        close();
        showToast("Horario actualizado");
      },
      { once: true }
    );

    open();
  }

  function renderWeeklySchedule() {
    const host = document.getElementById("weeklySchedule");
    if (!host) return;
    const schedule = ensureSchedule();

    const rows = scheduleRows();
    const table = `
      <div class="overflow-x-auto">
        <table class="w-full min-w-[720px] border-separate border-spacing-2">
          <thead>
            <tr>
              <th class="w-28 rounded-xl border border-school-border bg-school-navy/40 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Periodo</th>
              ${scheduleDays
                .map(
                  (d) =>
                    `<th class="rounded-xl border border-school-border bg-school-navy/40 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">${d}</th>`
                )
                .join("")}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map((r) => {
                if (r.type === "break") {
                  return `
                    <tr>
                      <td class="rounded-xl border border-school-border bg-school-navy/30 px-3 py-3 text-xs font-semibold text-slate-500">${r.label}</td>
                      ${scheduleDays
                        .map(
                          () =>
                            `<td class="rounded-xl border border-school-border bg-school-navy/30 px-3 py-3 text-xs font-semibold text-slate-500/80">${r.label}</td>`
                        )
                        .join("")}
                    </tr>
                  `;
                }

                const pi = r.periodIndex;
                return `
                  <tr>
                    <td class="rounded-xl border border-school-border bg-school-navy/40 px-3 py-3 text-sm font-semibold text-slate-300">${r.label}</td>
                    ${scheduleDays
                      .map((d) => {
                        const cell = normalizeCell(schedule.grid?.[d]?.[pi]);
                        const bg = cell.color || "";
                        const name = cell.name || "—";
                        const style = bg ? `background:${bg}; color:${fgFor(bg)};` : "";
                        const baseCls =
                          "schedule-cell group relative min-h-[54px] rounded-xl border border-school-border px-3 py-3 text-sm font-semibold transition hover:border-sky-500/30 focus:outline-none focus:ring-2 focus:ring-sky-500/20";
                        const emptyCls = bg ? "" : "bg-school-panel/50 text-slate-400";
                        return `
                          <td>
                            <button type="button" class="${baseCls} ${emptyCls} w-full text-left"
                              data-schedule-day="${escapeHtml(d)}" data-schedule-period="${pi}" style="${style}">
                              <span class="block truncate">${escapeHtml(name)}</span>
                              <span class="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-white/0 transition group-hover:ring-white/10"></span>
                            </button>
                          </td>
                        `;
                      })
                      .join("")}
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
      <p class="mt-2 text-xs text-slate-500">Tip: toca una celda para editar. El horario se guarda automáticamente.</p>
    `;

    host.innerHTML = table;
    host.querySelectorAll("[data-schedule-day]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const day = btn.getAttribute("data-schedule-day");
        const p = Number(btn.getAttribute("data-schedule-period"));
        if (!day || !Number.isFinite(p)) return;
        const sched = ensureSchedule();
        openScheduleEditor({ day, periodIndex: p, initial: normalizeCell(sched.grid[day][p]) });
      });
    });
  }

  function initScheduleUI() {
    document.getElementById("resetScheduleBtn")?.addEventListener("click", () => {
      localStorage.removeItem(SCHEDULE_KEY);
      const fresh = generateRandomWeeklySchedule();
      saveSchedule(fresh);
      renderWeeklySchedule();
      showToast("Horario reseteado");
    });
    renderWeeklySchedule();
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
    // Compat: sección "Clases de hoy" removida; mantenemos solo la fecha.
    const dateEl = document.getElementById("sidebarDate");
    if (dateEl) dateEl.textContent = formatDisplayDate(todayISO());
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
    const list = loadAnnouncements()
      .map((x) => normalizeAnnouncement(x))
      .filter(Boolean)
      .sort((a, b) => toEpoch(b.createdAt) - toEpoch(a.createdAt));
    container.innerHTML = list
      .map(
        (a) => `
      <article class="rounded-2xl border border-school-border bg-school-panel/70 p-5 shadow-card transition hover:border-sky-500/20">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="flex min-w-0 flex-wrap items-center gap-2">
            <span class="rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tagStyles(a.tag)}">${escapeHtml(a.tag)}</span>
            <h3 class="min-w-0 text-lg font-semibold text-white">${escapeHtml(a.title)}</h3>
          </div>
          <button type="button" class="announcement-delete-btn inline-flex items-center gap-2 rounded-xl border border-school-border bg-school-navy/40 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-red-500/40 hover:text-white" data-announcement-delete="${escapeHtml(
            a.id
          )}" aria-label="Eliminar anuncio">
            <span aria-hidden="true">🗑️</span>
            <span>Eliminar</span>
          </button>
        </div>
        <p class="mt-2 text-sm leading-relaxed text-slate-400">${escapeHtml(a.body)}</p>
      </article>`
      )
      .join("");

    container.querySelectorAll("[data-announcement-delete]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-announcement-delete");
        if (!id) return;
        const next = loadAnnouncements().filter((x) => x.id !== id);
        saveAnnouncements(next);
        showToast("Anuncio eliminado");
        renderAnnouncements();
      });
    });

    const home = document.getElementById("homeAnnouncementsList");
    if (home) {
      home.innerHTML = list
        .slice(0, 3)
        .map(
          (a) => `
      <article class="rounded-2xl border border-school-border bg-school-panel/60 p-4 shadow-card transition hover:border-sky-500/20">
        <div class="flex items-center gap-2">
          <span class="rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tagStyles(a.tag)}">${escapeHtml(a.tag)}</span>
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
            placeholder="Agrega título" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-400">Etiqueta</label>
          <div class="relative mt-1.5">
            <input type="hidden" id="announcementTag" name="tag" value="Aviso" />
            <button type="button" id="announcementTagBtn"
              class="flex w-full items-center justify-between gap-2 rounded-xl border border-school-border bg-school-navy px-4 py-2.5 text-sm font-semibold text-slate-200 outline-none transition hover:border-emerald-500/30">
              <span class="flex items-center gap-2">
                <span id="announcementTagDot" class="inline-block h-2.5 w-2.5 rounded-full bg-slate-400"></span>
                <span id="announcementTagLabel">Aviso</span>
              </span>
              <span class="text-slate-500" aria-hidden="true">▾</span>
            </button>
            <div id="announcementTagMenu" class="absolute left-0 right-0 top-[calc(100%+0.5rem)] hidden overflow-hidden rounded-2xl border border-school-border bg-school-panel/95 shadow-card backdrop-blur-md">
              <div class="grid gap-1 p-2">
                ${["Evento","Servicios","Convocatoria","Taller","Académico","Aviso","Club"]
                  .map(
                    (t) =>
                      `<button type="button" class="tag-option flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-200 transition hover:bg-school-navy/40" data-tag="${t}">
                        <span class="inline-block h-2.5 w-2.5 rounded-full"></span>
                        <span>${t}</span>
                      </button>`
                  )
                  .join("")}
              </div>
            </div>
          </div>
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
    const tagBtn = document.getElementById("announcementTagBtn");
    const tagMenu = document.getElementById("announcementTagMenu");
    const tagLabel = document.getElementById("announcementTagLabel");
    const tagHidden = document.getElementById("announcementTag");
    const tagDot = document.getElementById("announcementTagDot");

    const setTag = (tag) => {
      const t = String(tag || "Aviso");
      if (tagHidden) tagHidden.value = t;
      if (tagLabel) tagLabel.textContent = t;
      if (tagDot) {
        const cls = tagStyles(t);
        // Extract a usable dot color
        const dotMap = {
          Evento: "bg-sky-400",
          Servicios: "bg-emerald-400",
          Convocatoria: "bg-violet-400",
          Taller: "bg-amber-400",
          "Académico": "bg-blue-400",
          Aviso: "bg-slate-400",
          Club: "bg-pink-400",
        };
        tagDot.className = `inline-block h-2.5 w-2.5 rounded-full ${dotMap[t] || "bg-slate-400"}`;
        void cls;
      }
    };

    const toggleMenu = (open) => {
      if (!tagMenu) return;
      const isOpen = !tagMenu.classList.contains("hidden");
      const next = typeof open === "boolean" ? open : !isOpen;
      tagMenu.classList.toggle("hidden", !next);
    };

    tagBtn?.addEventListener("click", () => toggleMenu());
    window.addEventListener("click", (e) => {
      if (!tagMenu || !tagBtn) return;
      if (tagMenu.classList.contains("hidden")) return;
      const target = e.target;
      if (tagMenu.contains(target) || tagBtn.contains(target)) return;
      toggleMenu(false);
    });

    tagMenu?.querySelectorAll("[data-tag]").forEach((btn) => {
      const t = btn.getAttribute("data-tag") || "Aviso";
      const dot = btn.querySelector("span");
      if (dot) {
        const dotMap = {
          Evento: "bg-sky-400",
          Servicios: "bg-emerald-400",
          Convocatoria: "bg-violet-400",
          Taller: "bg-amber-400",
          "Académico": "bg-blue-400",
          Aviso: "bg-slate-400",
          Club: "bg-pink-400",
        };
        dot.className = `inline-block h-2.5 w-2.5 rounded-full ${dotMap[t] || "bg-slate-400"}`;
      }
      btn.addEventListener("click", () => {
        setTag(t);
        toggleMenu(false);
      });
    });
    setTag(String(tagHidden?.value ?? "Aviso"));

    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      const title = String(document.getElementById("announcementTitle")?.value ?? "").trim();
      const tag = String(document.getElementById("announcementTag")?.value ?? "Aviso").trim() || "Aviso";
      const body = String(document.getElementById("announcementBody")?.value ?? "").trim();
      if (!title || !tag || !body) return;

      const all = loadAnnouncements()
        .map((x) => normalizeAnnouncement(x))
        .filter(Boolean);
      all.unshift(
        normalizeAnnouncement({
          id: generateId(),
          title,
          tag,
          body,
          createdAt: new Date().toISOString(),
        })
      );
      saveAnnouncements(all.filter(Boolean));
      form.reset();
      setTag("Aviso");
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
    addRandomAnnouncementsOnBoot();
    renderClasses();
    initScheduleUI();
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
