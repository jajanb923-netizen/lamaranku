// ---------------------------------------------------------------------------
// LamaranKu UI wiring — form, experience rows, skill chips, localStorage,
// generation, copy/print. No framework, no build step.
// ---------------------------------------------------------------------------

import { generateLetter, generateCV, aiMode, formatTanggal } from "./ai.js";
import { DEMO_PROFILE, SKILL_CHIPS } from "./seed.js";

const STORAGE_KEY = "lamaranku-v1";

const $ = (id) => document.getElementById(id);

// --- Form fields -----------------------------------------------------------
const FIELDS = [
  "nama", "tempatLahir", "tglLahir", "alamat", "hp", "email",
  "jenjang", "sekolah", "tahunLulus",
  "skillFree", "posisi", "perusahaan", "kota", "tglSurat", "sumber",
];
const field = (name) => $(`f-${name}`);

// --- State -----------------------------------------------------------------
let experiences = []; // [{ perusahaan, jabatan, lama, tugas }]
let selectedSkills = new Set();
let saveTimer = null;

// --- Badges ----------------------------------------------------------------
function badgeFor(source) {
  if (source === "ON_DEVICE") return { text: "AI · Gemini Nano (perangkat)", cls: "chip chip-ai" };
  if (source === "IN_CLOUD") return { text: "AI · Gemini (cloud)", cls: "chip chip-ai" };
  return { text: "Template · Lokal", cls: "chip chip-local" };
}

function setBadge(el, source) {
  const b = badgeFor(source);
  el.textContent = b.text;
  el.className = b.cls;
}

function setStatusChip(source) {
  const el = $("aiStatus");
  if (source === "ON_DEVICE" || source === "IN_CLOUD") {
    el.textContent = source === "ON_DEVICE" ? "AI: Gemini Nano (perangkat)" : "AI: Gemini (cloud)";
    el.className = "chip chip-ai";
  } else {
    el.textContent = aiMode() === "firebase" ? "AI: Firebase (siap)" : "AI: Mode template lokal";
    el.className = "chip chip-local";
  }
}

// --- Skill chips -----------------------------------------------------------
function renderChips() {
  const box = $("skillChips");
  box.innerHTML = "";
  for (const skill of SKILL_CHIPS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip-btn";
    btn.textContent = skill;
    btn.setAttribute("aria-pressed", selectedSkills.has(skill) ? "true" : "false");
    btn.addEventListener("click", () => {
      if (selectedSkills.has(skill)) selectedSkills.delete(skill);
      else selectedSkills.add(skill);
      renderChips();
      scheduleSave();
    });
    box.appendChild(btn);
  }
}

// --- Experience rows -------------------------------------------------------
function renderExperiences() {
  const box = $("expList");
  box.innerHTML = "";
  if (experiences.length === 0) {
    const p = document.createElement("p");
    p.className = "small";
    p.textContent = "Belum ada pengalaman — tidak apa-apa, pilih gaya “Fresh graduate” saat membuat surat.";
    box.appendChild(p);
    return;
  }
  experiences.forEach((exp, i) => {
    const row = document.createElement("div");
    row.className = "exp-row";
    row.innerHTML = `
      <div class="exp-head"><strong>Pengalaman ${i + 1}</strong>
        <button type="button" class="btn-remove" data-i="${i}">Hapus ✕</button></div>
      <label>Perusahaan <input type="text" data-k="perusahaan" value="${esc(exp.perusahaan)}" placeholder="cth: PT Sinar Jaya Plastik"></label>
      <div class="row">
        <label>Jabatan <input type="text" data-k="jabatan" value="${esc(exp.jabatan)}" placeholder="cth: Operator Produksi"></label>
        <label>Lama kerja <input type="text" data-k="lama" value="${esc(exp.lama)}" placeholder="cth: 2018 – 2021 (3 tahun)"></label>
      </div>
      <label>Tugas singkat <textarea rows="2" data-k="tugas" placeholder="Apa yang Anda kerjakan di sana?">${esc(exp.tugas)}</textarea></label>`;
    row.querySelectorAll("input, textarea").forEach((input) => {
      input.addEventListener("input", () => {
        experiences[i][input.dataset.k] = input.value;
        scheduleSave();
      });
    });
    row.querySelector(".btn-remove").addEventListener("click", () => {
      experiences.splice(i, 1);
      renderExperiences();
      scheduleSave();
    });
    box.appendChild(row);
  });
}

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// --- Profile collect / fill -----------------------------------------------
function collectProfile() {
  const free = field("skillFree").value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const keterampilan = [...selectedSkills, ...free.filter((s) => !selectedSkills.has(s))];
  const tone = document.querySelector('input[name="tone"]:checked')?.value || "formal";
  const profile = { tone, keterampilan };
  for (const name of FIELDS) profile[name] = field(name).value.trim();
  profile.pengalaman = experiences
    .map((e) => ({
      perusahaan: (e.perusahaan || "").trim(),
      jabatan: (e.jabatan || "").trim(),
      lama: (e.lama || "").trim(),
      tugas: (e.tugas || "").trim(),
    }))
    .filter((e) => e.perusahaan || e.jabatan || e.lama || e.tugas);
  return profile;
}

function fillForm(profile) {
  for (const name of FIELDS) {
    if (profile[name] !== undefined && profile[name] !== null) field(name).value = profile[name];
  }
  experiences = (profile.pengalaman || []).map((e) => ({ ...e }));
  selectedSkills = new Set(profile.keterampilan || []);
  if (profile.tone) {
    const radio = document.querySelector(`input[name="tone"][value="${profile.tone}"]`);
    if (radio) radio.checked = true;
  }
  renderChips();
  renderExperiences();
}

// --- Persistence -----------------------------------------------------------
function saveProfile(showToast) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collectProfile()));
    if (showToast) {
      const btn = $("btnSave");
      const old = btn.textContent;
      btn.textContent = "Tersimpan ✓";
      setTimeout(() => { btn.textContent = old; }, 1500);
    }
  } catch (err) {
    console.warn("[LamaranKu] Could not save:", err);
  }
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveProfile(false), 500);
}

function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function todayISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// --- Generation ------------------------------------------------------------
function validate(profile) {
  const missing = [];
  if (!profile.nama) missing.push("Nama lengkap");
  if (!profile.posisi) missing.push("Posisi yang dilamar");
  if (!profile.perusahaan) missing.push("Nama perusahaan tujuan");
  return missing;
}

async function onGenerate(event) {
  event.preventDefault();
  const profile = collectProfile();
  const missing = validate(profile);
  const errEl = $("formError");
  if (missing.length > 0) {
    errEl.textContent = `Mohon isi dulu: ${missing.join(", ")}.`;
    errEl.hidden = false;
    errEl.scrollIntoView?.({ behavior: "smooth", block: "center" });
    return;
  }
  errEl.hidden = true;

  const btn = $("btnGenerate");
  btn.disabled = true;
  btn.textContent = "⏳ Menyusun surat & CV…";
  $("letterOut").textContent = "Menyusun surat lamaran…";
  $("cvOut").textContent = "Menyusun CV…";
  saveProfile(false);

  try {
    const [letter, cv] = await Promise.all([
      generateLetter(profile),
      generateCV(profile),
    ]);
    $("letterOut").textContent = letter.text;
    $("cvOut").textContent = cv.text;
    setBadge($("letterBadge"), letter.source);
    setBadge($("cvBadge"), cv.source);
    setStatusChip(letter.source === "LOCAL" ? cv.source : letter.source);
    document.querySelector(".preview-col")?.scrollIntoView?.({ behavior: "smooth" });
  } catch (err) {
    console.error("[LamaranKu] Generation failed:", err);
    errEl.textContent = "Terjadi kesalahan saat membuat surat. Periksa koneksi internet Anda lalu coba lagi.";
    errEl.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = "✨ Buat Surat & CV dengan AI";
  }
}

// --- Copy / print / demo / clear -------------------------------------------
async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  const old = btn.textContent;
  btn.textContent = "Disalin ✓";
  setTimeout(() => { btn.textContent = old; }, 1500);
}

function loadDemo() {
  const demo = { ...DEMO_PROFILE, tglSurat: todayISO() };
  fillForm(demo);
  saveProfile(false);
  $("formError").hidden = true;
  document.querySelector(".preview-col")?.scrollIntoView?.({ behavior: "smooth" });
  // Generate immediately so judges see the result in one tap.
  onGenerate(new Event("submit"));
}

function clearAll() {
  if (!window.confirm("Hapus semua data yang tersimpan di perangkat ini?")) return;
  localStorage.removeItem(STORAGE_KEY);
  experiences = [];
  selectedSkills = new Set();
  document.querySelector("#profileForm").reset();
  field("tglSurat").value = todayISO();
  renderChips();
  renderExperiences();
  $("letterOut").textContent = "Surat lamaran Anda akan muncul di sini setelah Anda mengisi data dan menekan “Buat Surat & CV dengan AI”.";
  $("cvOut").textContent = "CV Anda akan muncul di sini.";
  setBadge($("letterBadge"), "LOCAL");
  setBadge($("cvBadge"), "LOCAL");
  $("letterBadge").textContent = "Belum dibuat";
  $("cvBadge").textContent = "Belum dibuat";
  setStatusChip("LOCAL");
}

// --- Init ------------------------------------------------------------------
function init() {
  renderChips();
  const saved = loadProfile();
  if (saved) {
    fillForm(saved);
  } else {
    renderExperiences();
    field("tglSurat").value = todayISO();
  }
  setStatusChip("LOCAL");

  $("profileForm").addEventListener("submit", onGenerate);
  $("profileForm").addEventListener("input", scheduleSave);
  $("profileForm").addEventListener("change", scheduleSave);
  $("btnAddExp").addEventListener("click", () => {
    experiences.push({ perusahaan: "", jabatan: "", lama: "", tugas: "" });
    renderExperiences();
    scheduleSave();
  });
  $("btnDemo").addEventListener("click", loadDemo);
  $("btnSave").addEventListener("click", () => saveProfile(true));
  $("btnClear").addEventListener("click", clearAll);
  $("btnPrint").addEventListener("click", () => window.print());
  document.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", () => copyText($(btn.dataset.copy).innerText, btn));
  });
}

init();
