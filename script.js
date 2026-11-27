document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  const $ = function (id) { return document.getElementById(id); };
  const STORAGE = {
    readings: "aether_readings_v1",
    points: "aether_map_points_v1",
    journal: "aether_journal_v1",
    checks: "aether_checklist_v1"
  };

  function readStore(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value === null ? fallback : value;
    } catch (error) {
      console.warn("Не удалось прочитать локальные данные:", key, error);
      return fallback;
    }
  }

  function writeStore(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error("Не удалось сохранить данные:", key, error);
      toast("Не удалось сохранить данные в браузере.");
      return false;
    }
  }

  let readings = readStore(STORAGE.readings, []);
  let points = readStore(STORAGE.points, []);
  let journal = readStore(STORAGE.journal, []);
  let checklist = readStore(STORAGE.checks, {});
  if (!Array.isArray(readings)) readings = [];
  if (!Array.isArray(points)) points = [];
  if (!Array.isArray(journal)) journal = [];
  if (!checklist || typeof checklist !== "object") checklist = {};

  let serialPort = null;
  let serialReader = null;
  let serialConnected = false;
  let serialBuffer = "";
  let toastTimer = null;

  function toast(message) {
    const element = $("toast");
    if (!element) return;
    element.textContent = message;
    element.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      element.classList.remove("show");
    }, 2600);
  }

  function formatTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Время не указано";
    return date.toLocaleString("ru-RU", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
  }

  function displayNumber(value, digits) {
    if (typeof value !== "number" || !Number.isFinite(value)) return "—";
    return value.toFixed(digits == null ? 1 : digits).replace(".", ",");
  }

  function addJournalEntry(title, description, kind) {
    journal.unshift({
      id: Date.now() + "-" + Math.random().toString(16).slice(2),
      title: String(title),
      description: String(description || ""),
      kind: kind || "note",
      timestamp: new Date().toISOString()
    });
    journal = journal.slice(0, 500);
    writeStore(STORAGE.journal, journal);
    renderJournal();
  }

  function setConnection(connected, detail) {
    serialConnected = connected;
    const label = connected ? "Подключён" : "Не подключён";
    const sub = connected ? (detail || "Получение телеметрии") : "Ожидание источника данных";
    ["connectionLabel", "telemetryStatus"].forEach(function (id) {
      const el = $(id);
      if (el) el.textContent = connected ? (id === "telemetryStatus" ? "Получение данных от контроллера" : label) : (id === "telemetryStatus" ? "Источник данных не подключён" : label);
    });
    if ($("connectionSub")) $("connectionSub").textContent = sub;
    if ($("topConnection")) $("topConnection").textContent = connected ? "CONNECTED" : "OFFLINE";
    if ($("metricConnection")) $("metricConnection").textContent = connected ? "ONLINE" : "OFFLINE";
    if ($("metricConnectionNote")) $("metricConnectionNote").textContent = connected ? "Контроллер передаёт данные" : "Источник данных не подключён";
    const connect = $("connectSerial");
    const disconnect = $("disconnectSerial");
    if (connect) connect.disabled = connected;
    if (disconnect) disconnect.disabled = !connected;
    const dot = document.querySelector(".system-pill .live-dot");
    if (dot) dot.style.background = connected ? "#72e2b0" : "";
    renderHomeMetrics();
  }

  function addReading(raw, source) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
    const reading = {
      timestamp: raw.timestamp ? new Date(raw.timestamp).toISOString() : new Date().toISOString(),
      soil: toValidNumber(raw.soil, 0, 100),
      temperature: toValidNumber(raw.temperature, -50, 100),
      humidity: toValidNumber(raw.humidity, 0, 100),
      source: source || "Serial"
    };
    if (reading.soil === null && reading.temperature === null && reading.humidity === null) return false;
    readings.push(reading);
    readings = readings.slice(-5000);
    writeStore(STORAGE.readings, readings);
    const detail = [
      reading.soil === null ? "" : "почва " + displayNumber(reading.soil) + "%",
      reading.temperature === null ? "" : "температура " + displayNumber(reading.temperature) + " °C",
      reading.humidity === null ? "" : "влажность воздуха " + displayNumber(reading.humidity) + "%"
    ].filter(Boolean).join("; ");
    addJournalEntry("Получено измерение", detail + " · Источник: " + reading.source, "reading");
    renderAllData();
    return true;
  }

  function toValidNumber(value, min, max) {
    if (value === "" || value === null || value === undefined) return null;
    const number = Number(value);
    if (!Number.isFinite(number) || number < min || number > max) return null;
    return number;
  }

  function renderHomeMetrics() {
    const latest = readings.length ? readings[readings.length - 1] : null;
    if ($("metricSoil")) $("metricSoil").innerHTML = latest && latest.soil !== null ? displayNumber(latest.soil) + ' <small>%</small>' : '— <small>%</small>';
    if ($("metricTemp")) $("metricTemp").innerHTML = latest && latest.temperature !== null ? displayNumber(latest.temperature) + ' <small>°C</small>' : '— <small>°C</small>';
    if ($("metricAir")) $("metricAir").innerHTML = latest && latest.humidity !== null ? displayNumber(latest.humidity) + ' <small>%</small>' : '— <small>%</small>';
  }

  function renderTelemetry() {
    const latest = readings.length ? readings[readings.length - 1] : null;
    const values = [
      { value: latest ? latest.soil : null, valueId: "soilValue", barId: "soilBar", timeId: "soilTime", suffix: "%", max: 100 },
      { value: latest ? latest.temperature : null, valueId: "tempValue", barId: "tempBar", timeId: "tempTime", suffix: "°C", max: 50 },
      { value: latest ? latest.humidity : null, valueId: "airValue", barId: "airBar", timeId: "airTime", suffix: "%", max: 100 }
    ];
    values.forEach(function (item) {
      const valueEl = $(item.valueId);
      if (valueEl) valueEl.innerHTML = (item.value === null ? "—" : displayNumber(item.value)) + "<small>" + item.suffix + "</small>";
      const bar = $(item.barId);
      if (bar) bar.style.width = item.value === null ? "0%" : Math.max(0, Math.min(100, item.value / item.max * 100)) + "%";
      const time = $(item.timeId);
      if (time) time.textContent = latest && item.value !== null ? "Последнее: " + formatTime(latest.timestamp) : "Нет измерений";
    });

    const body = $("readingsBody");
    if (body) {
      const rows = readings.slice(-12).reverse();
      if (!rows.length) {
        body.innerHTML = '<tr><td colspan="5" class="empty-table">Измерений пока нет. Здесь появятся реальные полученные значения.</td></tr>';
      } else {
        body.textContent = "";
        rows.forEach(function (item) {
          const tr = document.createElement("tr");
          [formatTime(item.timestamp), item.soil == null ? "—" : displayNumber(item.soil) + " %", item.temperature == null ? "—" : displayNumber(item.temperature) + " °C", item.humidity == null ? "—" : displayNumber(item.humidity) + " %", item.source || "Импорт"].forEach(function (value) {
            const td = document.createElement("td");
            td.textContent = value;
            tr.appendChild(td);
          });
          body.appendChild(tr);
        });
      }
    }
    if ($("telemetryStatus") && !serialConnected) {
      $("telemetryStatus").textContent = readings.length ? "Показаны сохранённые измерения" : "Источник данных не подключён";
    }
  }

  function average(key) {
    const values = readings.map(function (item) { return item[key]; }).filter(function (value) { return typeof value === "number" && Number.isFinite(value); });
    if (!values.length) return null;
    return values.reduce(function (sum, value) { return sum + value; }, 0) / values.length;
  }

  function renderAnalytics() {
    if ($("totalReadings")) $("totalReadings").textContent = String(readings.length);
    if ($("avgSoil")) $("avgSoil").textContent = average("soil") === null ? "—" : displayNumber(average("soil")) + " %";
    if ($("avgTemp")) $("avgTemp").textContent = average("temperature") === null ? "—" : displayNumber(average("temperature")) + " °C";
    if ($("avgHumidity")) $("avgHumidity").textContent = average("humidity") === null ? "—" : displayNumber(average("humidity")) + " %";

    drawChart("soilChart", "soil", "soilChartEmpty");
    drawChart("tempChart", "temperature", "tempChartEmpty");
    drawChart("humidityChart", "humidity", "humidityChartEmpty");

    const insight = $("insightText");
    if (insight) {
      const count = readings.length;
      if (!count) {
        insight.textContent = "После первых измерений здесь появится краткая сводка по доступным показателям. Пороговые значения влажности почвы зависят от типа грунта и культуры — сайт не будет выдавать универсальную рекомендацию без калибровки.";
      } else {
        const parts = ["Сохранено измерений: " + count + "."];
        if (average("soil") !== null) parts.push("Средняя влажность почвы: " + displayNumber(average("soil")) + "%.");
        if (average("temperature") !== null) parts.push("Средняя температура: " + displayNumber(average("temperature")) + " °C.");
        if (average("humidity") !== null) parts.push("Средняя влажность воздуха: " + displayNumber(average("humidity")) + "%.");
        parts.push("Это статистическая сводка, а не автоматическая рекомендация по поливу.");
        insight.textContent = parts.join(" ");
      }
    }
  }

  function drawChart(canvasId, key, emptyId) {
    const canvas = $(canvasId);
    const empty = $(emptyId);
    if (!canvas) return;
    const pointsData = readings.filter(function (item) { return typeof item[key] === "number" && Number.isFinite(item[key]); }).slice(-30);
    if (empty) empty.style.display = pointsData.length ? "none" : "block";

    const rect = canvas.getBoundingClientRect();
    const width = Math.max(240, Math.floor(rect.width || canvas.parentElement.clientWidth || 320));
    const height = 190;
    const ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.height = height + "px";
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.clearRect(0, 0, width, height);

    const left = 34, right = 12, top = 12, bottom = 25;
    const chartW = width - left - right;
    const chartH = height - top - bottom;
    ctx.font = "10px Manrope, sans-serif";
    ctx.strokeStyle = "rgba(130,160,195,.22)";
    ctx.fillStyle = "#8fa7c9";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = top + chartH * i / 4;
      ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(width - right, y); ctx.stroke();
    }
    if (!pointsData.length) return;

    const raw = pointsData.map(function (item) { return item[key]; });
    let min = Math.min.apply(null, raw), max = Math.max.apply(null, raw);
    if (min === max) { min -= 1; max += 1; }
    const padding = (max - min) * .15;
    min -= padding; max += padding;
    ctx.fillStyle = "#8fa7c9";
    ctx.textAlign = "right";
    ctx.fillText(displayNumber(max), left - 6, top + 4);
    ctx.fillText(displayNumber(min), left - 6, top + chartH);
    const coords = raw.map(function (value, index) {
      return { x: left + (raw.length === 1 ? chartW / 2 : chartW * index / (raw.length - 1)), y: top + chartH - ((value - min) / (max - min)) * chartH };
    });
    ctx.beginPath();
    coords.forEach(function (point, index) { if (index === 0) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y); });
    ctx.strokeStyle = "#83e3ff";
    ctx.lineWidth = 2.4;
    ctx.lineJoin = "round";
    ctx.stroke();
    coords.forEach(function (point) {
      ctx.beginPath(); ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#ffd27c"; ctx.fill();
    });
    ctx.textAlign = "left";
    ctx.fillStyle = "#8fa7c9";
    ctx.fillText("последние " + raw.length + " точек", left, height - 5);
  }

  function renderJournal() {
    const container = $("journalEntries");
    if ($("journalCount")) $("journalCount").textContent = String(journal.length);
    if (!container) return;
    if (!journal.length) {
      container.innerHTML = '<div class="empty-state">Журнал пока пуст. Подключи источник данных или добавь заметку.</div>';
      return;
    }
    container.textContent = "";
    journal.forEach(function (entry) {
      const row = document.createElement("div");
      row.className = "journal-entry";
      const time = document.createElement("time");
      time.textContent = formatTime(entry.timestamp);
      const body = document.createElement("div");
      const title = document.createElement("b");
      title.textContent = entry.title || "Запись";
      const description = document.createElement("p");
      description.textContent = entry.description || "";
      body.appendChild(title);
      body.appendChild(description);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Удалить";
      remove.setAttribute("aria-label", "Удалить запись журнала");
      remove.addEventListener("click", function () {
        journal = journal.filter(function (item) { return item.id !== entry.id; });
        writeStore(STORAGE.journal, journal);
        renderJournal();
      });
      row.appendChild(time);
      row.appendChild(body);
      row.appendChild(remove);
      container.appendChild(row);
    });
  }

  function renderMap() {
    const layer = $("routeLayer");
    const list = $("pointList");
    if ($("mapPointCount")) $("mapPointCount").textContent = points.length + " PLANNED POINTS";
    if (layer) {
      layer.textContent = "";
      if (points.length > 1) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        path.setAttribute("points", points.map(function (p) { return p.x + "," + p.y; }).join(" "));
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "#83e3ff");
        path.setAttribute("stroke-width", "3");
        path.setAttribute("stroke-dasharray", "7 7");
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("stroke-linejoin", "round");
        layer.appendChild(path);
      }
      points.forEach(function (point, index) {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", point.x); circle.setAttribute("cy", point.y); circle.setAttribute("r", "9");
        circle.setAttribute("fill", "#ffd27c"); circle.setAttribute("stroke", "#fff0c7"); circle.setAttribute("stroke-width", "2");
        layer.appendChild(circle);
        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.setAttribute("x", point.x + 13); label.setAttribute("y", point.y - 11);
        label.setAttribute("fill", "#eaf5ff"); label.setAttribute("font-size", "13"); label.textContent = "P" + (index + 1);
        layer.appendChild(label);
      });
    }
    if (list) {
      if (!points.length) {
        list.innerHTML = '<div class="empty-state">На плане пока нет точек. Добавь первую точку на карте.</div>';
      } else {
        list.textContent = "";
        points.forEach(function (point, index) {
          const row = document.createElement("div"); row.className = "point-row";
          const title = document.createElement("b"); title.textContent = "Точка " + (index + 1);
          const coords = document.createElement("small"); coords.textContent = "X: " + Math.round(point.x) + " · Y: " + Math.round(point.y);
          const remove = document.createElement("button"); remove.type = "button"; remove.textContent = "Удалить";
          remove.addEventListener("click", function () {
            points = points.filter(function (item) { return item.id !== point.id; });
            writeStore(STORAGE.points, points); renderMap();
          });
          row.appendChild(title); row.appendChild(coords); row.appendChild(remove); list.appendChild(row);
        });
      }
    }
  }

  function addMapPoint(x, y) {
    if (points.length >= 40) { toast("В плане уже 40 точек. Удали лишние перед добавлением."); return; }
    points.push({ id: Date.now() + "-" + Math.random().toString(16).slice(2), x: Math.max(20, Math.min(880, x)), y: Math.max(20, Math.min(500, y)), createdAt: new Date().toISOString() });
    writeStore(STORAGE.points, points);
    renderMap();
  }

  function csvCell(value) {
    const text = String(value == null ? "" : value);
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type: type || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = filename;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function exportReadings() {
    if (!readings.length) { toast("Пока нет измерений для экспорта."); return; }
    const lines = [["timestamp", "soil", "temperature", "humidity", "source"].join(",")];
    readings.forEach(function (item) {
      lines.push([item.timestamp, item.soil, item.temperature, item.humidity, item.source].map(csvCell).join(","));
    });
    downloadFile("aether-readings.csv", "\uFEFF" + lines.join("\r\n"), "text/csv;charset=utf-8");
  }

  function parseCsv(text) {
    const rows = [];
    let row = [], cell = "", quoted = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i], next = text[i + 1];
      if (char === '"' && quoted && next === '"') { cell += '"'; i++; }
      else if (char === '"') quoted = !quoted;
      else if ((char === "," || char === ";" || char === "\t") && !quoted) { row.push(cell); cell = ""; }
      else if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && next === "\n") i++;
        row.push(cell); rows.push(row); row = []; cell = "";
      } else cell += char;
    }
    if (cell.length || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(function (item) { return item.some(function (v) { return String(v).trim() !== ""; }); });
  }

  async function importCsv(file) {
    const text = await file.text();
    const rows = parseCsv(text.replace(/^\uFEFF/, ""));
    if (rows.length < 2) { toast("В CSV нет строк с измерениями."); return; }
    const headers = rows[0].map(function (v) { return String(v).trim().toLowerCase(); });
    const indexes = {
      timestamp: headers.indexOf("timestamp"),
      soil: headers.indexOf("soil"),
      temperature: headers.indexOf("temperature"),
      humidity: headers.indexOf("humidity")
    };
    if (indexes.soil < 0 && indexes.temperature < 0 && indexes.humidity < 0) {
      toast("Не найдены столбцы soil, temperature или humidity."); return;
    }
    let imported = 0;
    rows.slice(1).forEach(function (cells) {
      const item = {};
      Object.keys(indexes).forEach(function (key) { if (indexes[key] >= 0) item[key] = cells[indexes[key]]; });
      if (addReading(item, "CSV: " + file.name)) imported++;
    });
    toast(imported ? "Импортировано измерений: " + imported : "Не найдено корректных измерений.");
  }

  function handleSerialLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const data = JSON.parse(trimmed);
      if (addReading(data, "USB Serial")) {
        if ($("connectionLog") && $("connectionLog").querySelector(".empty-state")) $("connectionLog").textContent = "";
      }
    } catch (error) {
      addConnectionLog("Строка пропущена: ожидался JSON с полями soil, temperature, humidity.");
    }
  }

  function addConnectionLog(message) {
    const container = $("connectionLog");
    if (!container) return;
    const empty = container.querySelector(".empty-state");
    if (empty) container.textContent = "";
    const item = document.createElement("div");
    item.className = "log-entry";
    const time = document.createElement("b");
    time.textContent = new Date().toLocaleTimeString("ru-RU");
    const text = document.createElement("span");
    text.textContent = message;
    item.appendChild(time); item.appendChild(text);
    container.prepend(item);
    while (container.children.length > 30) container.lastElementChild.remove();
  }

  async function connectSerial() {
    if (!("serial" in navigator)) {
      toast("Web Serial не поддерживается. Открой сайт в актуальном Chrome или Edge на компьютере.");
      return;
    }
    try {
      serialPort = await navigator.serial.requestPort();
      await serialPort.open({ baudRate: 9600 });
      serialBuffer = "";
      const decoder = new TextDecoder();
      serialReader = serialPort.readable.getReader();
      setConnection(true, "USB Serial · 9600 baud");
      addConnectionLog("Последовательный порт подключён (9600 baud).");
      addJournalEntry("Подключён контроллер", "USB Serial · 9600 baud", "connection");
      while (serialPort && serialPort.readable) {
        const result = await serialReader.read();
        if (result.done) break;
        serialBuffer += decoder.decode(result.value, { stream: true });
        const lines = serialBuffer.split(/\r?\n/);
        serialBuffer = lines.pop() || "";
        lines.forEach(handleSerialLine);
        if (serialBuffer.length > 10000) {
          serialBuffer = "";
          addConnectionLog("Слишком длинная строка без перевода строки была сброшена.");
        }
      }
    } catch (error) {
      if (error && error.name !== "NotFoundError" && error.name !== "AbortError") {
        console.error("Serial error:", error);
        toast("Ошибка подключения: " + (error.message || "неизвестная ошибка"));
        addConnectionLog("Ошибка: " + (error.message || "неизвестная ошибка"));
      }
    } finally {
      if (serialReader) {
        try { serialReader.releaseLock(); } catch (error) {}
        serialReader = null;
      }
      if (serialPort) {
        try { await serialPort.close(); } catch (error) {}
        serialPort = null;
      }
      if (serialConnected) {
        setConnection(false);
        addConnectionLog("Последовательное соединение закрыто.");
        addJournalEntry("Отключён контроллер", "USB Serial соединение закрыто.", "connection");
      }
    }
  }

  async function disconnectSerial() {
    if (serialReader) {
      try { await serialReader.cancel(); } catch (error) {}
    } else if (serialPort) {
      try { await serialPort.close(); } catch (error) {}
      serialPort = null;
      setConnection(false);
    }
  }

  function openPage(pageId) {
    const target = $(pageId);
    if (!target || !target.classList.contains("page")) return;
    document.querySelectorAll(".page").forEach(function (page) { page.classList.toggle("active", page === target); });
    document.querySelectorAll(".nav-btn").forEach(function (button) { button.classList.toggle("active", button.dataset.page === pageId); });
    const activeButton = document.querySelector('.nav-btn[data-page="' + pageId + '"]');
    if ($("pageTitle")) $("pageTitle").textContent = activeButton ? activeButton.textContent.trim().replace(/^[⌂◈✧⌖⌁▥✣⚙◷]\s*/, "") : "AETHER Mission Control";
    if (pageId === "analytics") renderAnalytics();
    if (pageId === "map") renderMap();
  }

  document.querySelectorAll(".nav-btn").forEach(function (button) {
    button.addEventListener("click", function () { openPage(button.dataset.page); });
  });
  document.querySelectorAll("[data-page]").forEach(function (link) {
    if (link.classList.contains("nav-btn")) return;
    link.addEventListener("click", function (event) {
      if (link.tagName === "A") event.preventDefault();
      openPage(link.dataset.page);
    });
  });
  document.querySelectorAll("[data-open]").forEach(function (button) {
    button.addEventListener("click", function () { openPage(button.dataset.open); });
  });

  const clock = $("clock");
  function updateClock() {
    if (clock) clock.textContent = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
  updateClock();
  setInterval(updateClock, 1000);

  const mapCanvas = $("mapCanvas");
  if (mapCanvas) {
    mapCanvas.addEventListener("click", function (event) {
      if (event.target.closest("button")) return;
      const rect = mapCanvas.getBoundingClientRect();
      addMapPoint((event.clientX - rect.left) / rect.width * 900, (event.clientY - rect.top) / rect.height * 520);
    });
  }
  if ($("addPoint")) $("addPoint").addEventListener("click", function () {
    const angle = points.length * 2.399963;
    const radius = 35 + (points.length % 5) * 13;
    addMapPoint(450 + Math.cos(angle) * radius * 3.2, 260 + Math.sin(angle) * radius * 2.1);
  });
  if ($("clearPoints")) $("clearPoints").addEventListener("click", function () {
    if (!points.length) { toast("План уже пуст."); return; }
    points = []; writeStore(STORAGE.points, points); renderMap(); toast("Точки плана очищены.");
  });

  if ($("exportCsv")) $("exportCsv").addEventListener("click", exportReadings);
  if ($("csvInput")) $("csvInput").addEventListener("change", async function (event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try { await importCsv(file); } catch (error) { console.error(error); toast("Не удалось прочитать CSV-файл."); }
    event.target.value = "";
  });

  if ($("connectSerial")) $("connectSerial").addEventListener("click", connectSerial);
  if ($("disconnectSerial")) $("disconnectSerial").addEventListener("click", disconnectSerial);
  if ($("serialSupport")) {
    $("serialSupport").textContent = "Web Serial: " + ("serial" in navigator ? "доступен в этом браузере" : "не поддерживается этим браузером") + ". Для подключения нужен USB-кабель и разрешение браузера.";
  }

  document.querySelectorAll(".eng-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      const id = tab.dataset.tab;
      document.querySelectorAll(".eng-tab").forEach(function (item) { item.classList.toggle("active", item === tab); });
      document.querySelectorAll(".eng-content").forEach(function (panel) { panel.classList.toggle("active", panel.id === id); });
    });
  });
  document.querySelectorAll("[data-check]").forEach(function (checkbox) {
    checkbox.checked = Boolean(checklist[checkbox.dataset.check]);
    checkbox.addEventListener("change", function () {
      checklist[checkbox.dataset.check] = checkbox.checked;
      writeStore(STORAGE.checks, checklist);
    });
  });

  if ($("saveNote")) $("saveNote").addEventListener("click", function () {
    const field = $("noteText");
    const value = field ? field.value.trim() : "";
    if (!value) { toast("Сначала напиши заметку."); return; }
    addJournalEntry("Заметка команды", value, "note");
    field.value = "";
    toast("Заметка сохранена в журнале.");
  });
  if ($("exportJournal")) $("exportJournal").addEventListener("click", function () {
    if (!journal.length) { toast("Журнал пока пуст."); return; }
    const lines = ["timestamp,title,description,kind"];
    journal.slice().reverse().forEach(function (entry) {
      lines.push([entry.timestamp, entry.title, entry.description, entry.kind].map(csvCell).join(","));
    });
    downloadFile("aether-expedition-journal.csv", "\uFEFF" + lines.join("\r\n"), "text/csv;charset=utf-8");
  });

  window.addEventListener("resize", function () {
    if ($("analytics") && $("analytics").classList.contains("active")) renderAnalytics();
  });

  function renderAllData() {
    renderHomeMetrics();
    renderTelemetry();
    renderAnalytics();
    renderJournal();
  }

  renderMap();
  renderJournal();
  renderAllData();
  setConnection(false);
});
