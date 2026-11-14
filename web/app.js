/* IrisAI web client — talks to the FastAPI backend (/api/metrics, /api/predict) */

// Same-origin on Vercel. When opened locally (file:// or a static server) fall back to the dev API.
const API_BASE = (() => {
  const { hostname, port, protocol } = window.location;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || protocol === "file:";
  if (isLocal && port !== "8000") return "http://localhost:8000";
  return "";
})();

const FEATURES = [
  { key: "sepal_length", label: "Sepal length", min: 4.0, max: 8.0, step: 0.1, def: 5.8 },
  { key: "sepal_width",  label: "Sepal width",  min: 2.0, max: 4.5, step: 0.1, def: 3.0 },
  { key: "petal_length", label: "Petal length", min: 1.0, max: 7.0, step: 0.1, def: 4.3 },
  { key: "petal_width",  label: "Petal width",  min: 0.1, max: 2.6, step: 0.1, def: 1.3 },
];

const PRESETS = {
  setosa:     { sepal_length: 5.1, sepal_width: 3.5, petal_length: 1.4, petal_width: 0.2 },
  versicolor: { sepal_length: 6.0, sepal_width: 2.9, petal_length: 4.5, petal_width: 1.5 },
  virginica:  { sepal_length: 6.7, sepal_width: 3.0, petal_length: 5.8, petal_width: 2.2 },
};

const SPECIES = {
  setosa: {
    latin: "Iris setosa",
    color: "var(--setosa)",
    desc: "Smallest of the three, with short, wide petals. It is the easiest class to separate from the others.",
  },
  versicolor: {
    latin: "Iris versicolor",
    color: "var(--versicolor)",
    desc: "A medium-sized iris with petals of intermediate length. It overlaps slightly with virginica.",
  },
  virginica: {
    latin: "Iris virginica",
    color: "var(--virginica)",
    desc: "The largest of the three, with long and wide petals and the biggest sepals on average.",
  },
};

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const pct = (v, d = 1) => (v * 100).toFixed(d) + "%";
const titleCase = (s) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/* ---------- Theme ---------- */
(function initTheme() {
  const saved = localStorage.getItem("theme");
  const dark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  $("#themeToggle").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);
  });
})();

/* ---------- Tabs ---------- */
function showView(name) {
  $$(".tab").forEach((t) => {
    const on = t.dataset.view === name;
    t.classList.toggle("active", on);
    t.setAttribute("aria-selected", on);
  });
  $$(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${name}`));
  if (name === "dashboard" && !metricsLoaded) loadMetrics();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
$$(".tab").forEach((t) => t.addEventListener("click", () => showView(t.dataset.view)));

/* ---------- API status ---------- */
function setStatus(state, text) {
  const el = $("#apiStatus");
  el.className = "status " + state;
  $("b", el).textContent = text;
}
async function checkHealth() {
  try {
    const r = await fetch(`${API_BASE}/api/health`);
    if (!r.ok) throw new Error();
    setStatus("ok", "API online");
  } catch {
    setStatus("err", "API offline");
  }
}

/* ---------- Prediction form ---------- */
function buildFields() {
  const wrap = $("#fields");
  wrap.innerHTML = FEATURES.map(
    (f) => `
    <div class="field">
      <div class="field-top">
        <label for="${f.key}">${f.label}<small>cm</small></label>
        <input class="num" id="${f.key}-num" type="number" inputmode="decimal" min="0" step="${f.step}" value="${f.def}" aria-label="${f.label} value" />
      </div>
      <input id="${f.key}" type="range" min="${f.min}" max="${f.max}" step="${f.step}" value="${f.def}" />
    </div>`
  ).join("");

  FEATURES.forEach((f) => {
    const range = $(`#${f.key}`);
    const num = $(`#${f.key}-num`);
    const paint = () => range.style.setProperty("--fill", ((range.value - f.min) / (f.max - f.min)) * 100 + "%");
    range.addEventListener("input", () => { num.value = range.value; num.classList.remove("invalid"); paint(); });
    num.addEventListener("input", () => {
      const v = parseFloat(num.value);
      if (!Number.isNaN(v)) { range.value = Math.min(Math.max(v, f.min), f.max); }
      num.classList.remove("invalid");
      paint();
    });
    paint();
  });
}

function setValues(vals) {
  FEATURES.forEach((f) => {
    $(`#${f.key}`).value = vals[f.key];
    $(`#${f.key}-num`).value = vals[f.key];
    $(`#${f.key}`).dispatchEvent(new Event("input"));
  });
}

function readValues() {
  const out = {};
  let valid = true;
  FEATURES.forEach((f) => {
    const num = $(`#${f.key}-num`);
    const v = parseFloat(num.value);
    if (Number.isNaN(v) || v <= 0 || v > 15) { num.classList.add("invalid"); valid = false; }
    out[f.key] = v;
  });
  return valid ? out : null;
}

function renderResult(data) {
  const info = SPECIES[data.species] || { latin: "", color: "var(--primary)", desc: "" };
  $("#resultEmpty").hidden = true;
  const body = $("#resultBody");
  body.hidden = false;
  body.classList.remove("pop"); void body.offsetWidth; body.classList.add("pop");

  $("#speciesName").textContent = data.species;
  $("#speciesName").style.color = info.color;
  $("#speciesLatin").textContent = info.latin;
  $("#speciesDesc").textContent = info.desc;

  const ring = $("#ring");
  ring.style.setProperty("--c", info.color);
  requestAnimationFrame(() => ring.style.setProperty("--p", (data.confidence * 100).toFixed(1)));
  $("#ringValue").textContent = pct(data.confidence, 0);

  const sorted = Object.entries(data.probabilities).sort((a, b) => b[1] - a[1]);
  $("#probs").innerHTML = sorted
    .map(([name, p]) => `
      <div class="prob-row">
        <span class="name">${name}</span>
        <div class="track"><div class="fill" data-w="${(p * 100).toFixed(1)}" style="background:${(SPECIES[name] || {}).color}"></div></div>
        <span class="val">${pct(p)}</span>
      </div>`)
    .join("");
  requestAnimationFrame(() => $$("#probs .fill").forEach((el) => (el.style.width = el.dataset.w + "%")));
}

async function onPredict(e) {
  e.preventDefault();
  const err = $("#formError");
  err.hidden = true;
  const payload = readValues();
  if (!payload) {
    err.textContent = "Please enter valid positive numbers for all four measurements.";
    err.hidden = false;
    return;
  }
  const btn = $("#predictBtn");
  btn.disabled = true;
  $(".spinner", btn).hidden = false;
  $(".btn-label", btn).textContent = "Predicting…";
  try {
    const r = await fetch(`${API_BASE}/api/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error(`Server responded with ${r.status}`);
    renderResult(await r.json());
    setStatus("ok", "API online");
    if (window.innerWidth < 860) $("#resultCard").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (ex) {
    err.textContent = "Could not reach the prediction API. " + ex.message;
    err.hidden = false;
    setStatus("err", "API offline");
  } finally {
    btn.disabled = false;
    $(".spinner", btn).hidden = true;
    $(".btn-label", btn).textContent = "Predict species";
  }
}

/* ---------- Dashboard ---------- */
let metricsLoaded = false;

function countUp(el, to, ms = 900) {
  const t0 = performance.now();
  const tick = (t) => {
    const k = Math.min((t - t0) / ms, 1);
    el.textContent = ((1 - Math.pow(1 - k, 3)) * to * 100).toFixed(1) + "%";
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function renderMetrics(m) {
  const scores = [
    ["Accuracy", m.accuracy],
    ["Precision", m.precision],
    ["Macro-Precision", m.macro_precision],
    ["Macro-Recall", m.macro_recall],
    ["Macro-F1", m.macro_f1],
    ["ROC-AUC (OvR)", m.roc_auc_ovr],
  ];

  $("#modelMeta").textContent =
    `${m.model} · ${m.hyperparameters.n_estimators} trees · ${m.split.train_size} train / ${m.split.test_size} test samples · ` +
    `5-fold CV accuracy ${pct(m.cross_validation.mean_accuracy)} ± ${pct(m.cross_validation.std_accuracy)}`;

  $("#kpis").innerHTML = scores
    .map(([label, v]) => `
      <div class="kpi">
        <div class="label">${label}</div>
        <div class="value" data-v="${v}">0.0%</div>
        <div class="mini"><i data-w="${v * 100}"></i></div>
      </div>`)
    .join("");
  $$("#kpis .value").forEach((el) => countUp(el, parseFloat(el.dataset.v)));
  requestAnimationFrame(() => $$("#kpis .mini i").forEach((el) => (el.style.width = el.dataset.w + "%")));

  $("#barChart").innerHTML = scores
    .map(([label, v]) => `
      <div class="bar-row">
        <span class="name">${label}</span>
        <div class="bar-track"><div class="bar-fill" data-w="${v * 100}"></div></div>
        <span class="val">${v.toFixed(3)}</span>
      </div>`)
    .join("");
  requestAnimationFrame(() => $$("#barChart .bar-fill").forEach((el) => (el.style.width = el.dataset.w + "%")));

  // Confusion matrix
  const cm = m.confusion_matrix;
  const names = m.class_names;
  const max = Math.max(...cm.flat(), 1);
  let html = `<div class="cm-grid"><div></div>${names.map((n) => `<div class="cm-head">${n}</div>`).join("")}`;
  cm.forEach((row, i) => {
    html += `<div class="cm-row">${names[i]}</div>`;
    row.forEach((v, j) => {
      const intensity = v / max;
      const strong = intensity > 0.45 ? "strong" : "";
      html += `<div class="cm-cell ${strong}" style="--i:${Math.max(intensity * 0.92, v ? 0.08 : 0)}" title="Actual ${names[i]} → predicted ${names[j]}">${v}<small>${i === j ? "correct" : v ? "error" : ""}</small></div>`;
    });
  });
  html += `</div><div class="cm-axis">Predicted label →</div>`;
  $("#confusion").innerHTML = html;

  // Per-class table
  $("#perClass").innerHTML =
    `<thead><tr><th>Species</th><th>Precision</th><th>Recall</th><th>F1</th><th>Support</th></tr></thead><tbody>` +
    names.map((n) => {
      const c = m.per_class[n];
      return `<tr><td><i class="dot ${n}"></i> ${n}</td><td>${c.precision.toFixed(3)}</td><td>${c.recall.toFixed(3)}</td><td>${c.f1.toFixed(3)}</td><td>${c.support}</td></tr>`;
    }).join("") + `</tbody>`;

  // Feature importance
  const imp = Object.entries(m.feature_importance).sort((a, b) => b[1] - a[1]);
  const maxImp = imp[0][1];
  $("#importance").innerHTML = imp
    .map(([f, v]) => `
      <div class="imp-row"><span class="name">${titleCase(f)}</span>
        <div class="bar-track"><div class="bar-fill" data-w="${(v / maxImp) * 100}"></div></div>
        <span class="val">${pct(v)}</span></div>`)
    .join("");

  // Dataset overview
  const d = m.dataset;
  $("#datasetMeta").textContent = `${d.samples} samples · ${d.features.length} features · ${d.classes.length} classes`;
  $("#classDist").innerHTML =
    `<h4 style="margin-top:0">Class distribution</h4>` +
    d.classes.map((c) => `
      <div class="imp-row"><span class="name" style="text-transform:capitalize">${c}</span>
        <div class="bar-track"><div class="bar-fill" data-w="${(d.class_counts[c] / d.samples) * 300}" style="background:${SPECIES[c].color}"></div></div>
        <span class="val">${d.class_counts[c]}</span></div>`).join("");
  $("#featureStats").innerHTML =
    `<thead><tr><th>Feature</th><th>Min</th><th>Mean</th><th>Max</th></tr></thead><tbody>` +
    d.features.map((f) => {
      const r = d.feature_ranges[f];
      return `<tr><td>${titleCase(f)}</td><td>${r.min.toFixed(1)}</td><td>${r.mean.toFixed(2)}</td><td>${r.max.toFixed(1)}</td></tr>`;
    }).join("") + `</tbody>`;

  requestAnimationFrame(() => $$("#importance .bar-fill, #classDist .bar-fill").forEach((el) => (el.style.width = Math.min(el.dataset.w, 100) + "%")));
}

async function loadMetrics() {
  $("#kpis").innerHTML = Array.from({ length: 6 }, () => '<div class="skeleton"></div>').join("");
  try {
    const r = await fetch(`${API_BASE}/api/metrics`);
    if (!r.ok) throw new Error(`Server responded with ${r.status}`);
    renderMetrics(await r.json());
    metricsLoaded = true;
    setStatus("ok", "API online");
  } catch (ex) {
    $("#kpis").innerHTML = `<div class="card" style="grid-column:1/-1"><h3>Could not load metrics</h3><p class="muted">${ex.message}. Make sure the backend is running and try again.</p></div>`;
    setStatus("err", "API offline");
  }
}

/* ---------- Init ---------- */
buildFields();
$("#predictForm").addEventListener("submit", onPredict);
$("#resetBtn").addEventListener("click", () => {
  setValues(Object.fromEntries(FEATURES.map((f) => [f.key, f.def])));
  $("#formError").hidden = true;
  $("#resultBody").hidden = true;
  $("#resultEmpty").hidden = false;
});
$$(".chip").forEach((c) => c.addEventListener("click", () => setValues(PRESETS[c.dataset.preset])));
$("#refreshMetrics").addEventListener("click", loadMetrics);
checkHealth();
