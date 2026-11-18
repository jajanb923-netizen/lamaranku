// ---------------------------------------------------------------------------
// LamaranKu AI service — Firebase AI Logic hybrid inference + local fallback.
// ---------------------------------------------------------------------------
// PRIMARY PATH (real Firebase AI Logic, used when js/firebase-config.js holds
// a real project):
//   getAI(app, { backend: new GoogleAIBackend() })
//   getGenerativeModel(ai, {
//     mode: InferenceMode.PREFER_ON_DEVICE,          // Gemini Nano first
//     inCloudParams: { model: 'gemini-3.5-flash-lite', ... },
//     onDeviceParams: { promptOptions: { ... } },
//   })
//   model.generateContent(prompt) -> response.text()
//   response.inferenceSource tells us 'ON_DEVICE' or 'IN_CLOUD'.
//   The SDK is imported dynamically so the app still loads fully offline /
//   without a Firebase project. If the Firebase console enforces App Check
//   for AI Logic, register a debug token (App Check → Manage debug tokens)
//   and set self.FIREBASE_APPCHECK_DEBUG_TOKEN in getHybridModel() below
//   (debug tokens are accepted in hackathon submissions).
//
// FALLBACK PATH (local template mode): deterministic templates
// (localLetter / localCV) build a correct formal Indonesian application
// letter and a structured CV straight from the form data. They need no
// network and no key, so the app is always usable. Every output is
// labelled with its source: ON_DEVICE / IN_CLOUD / LOCAL (shown in the UI
// as "AI · Gemini" or "Template · Lokal" — local output is NEVER presented
// as AI output).
// ---------------------------------------------------------------------------

import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";

let modelPromise = null;

async function getHybridModel() {
  if (!isFirebaseConfigured) return null;
  if (modelPromise) return modelPromise;
  modelPromise = (async () => {
    const { initializeApp } = await import("firebase/app");
    const { initializeAppCheck, ReCaptchaEnterpriseProvider } =
      await import("firebase/app-check");
    const { getAI, GoogleAIBackend, getGenerativeModel, InferenceMode } =
      await import("firebase/ai");
    // App Check debug provider (same pattern as LedgerLens, verified working
    // there): the debug token below is registered in the Firebase console
    // (App Check → Manage debug tokens, "LamaranKu Debug Token"). When
    // self.FIREBASE_APPCHECK_DEBUG_TOKEN is set, the SDK exchanges the
    // debug token for a real App Check token and never calls the
    // configured provider — so the placeholder site key below is unused.
    // Debug tokens are accepted in hackathon submissions. Production:
    // replace with a real reCAPTCHA Enterprise site key.
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = "1F632EED-F726-4644-B866-927C4686D0C8";
    const app = initializeApp(firebaseConfig);
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider("lamaranku-debug"),
      isTokenAutoRefreshEnabled: true,
    });
    const ai = getAI(app, { backend: new GoogleAIBackend() });
    return getGenerativeModel(ai, {
      mode: InferenceMode.PREFER_ON_DEVICE,
      inCloudParams: {
        model: "gemini-3.5-flash-lite",
        generationConfig: { maxOutputTokens: 1024, temperature: 0.4 },
      },
      onDeviceParams: {
        promptOptions: {
          // Keep on-device prompts short: Nano is best with focused tasks.
          systemInstruction:
            "You are LamaranKu, a helpful assistant that writes formal Indonesian job application letters and CVs for factory workers. Write in correct, polite, formal Bahasa Indonesia. Use ONLY the data given — never invent facts, never use bracket placeholders like [nama]. Output only the requested document, no introductions.",
        },
      },
    });
  })().catch((err) => {
    console.warn("[LamaranKu] Firebase AI Logic unavailable:", err);
    modelPromise = null;
    return null;
  });
  return modelPromise;
}

/** Is real Firebase AI Logic available right now? */
export function aiMode() {
  return isFirebaseConfigured ? "firebase" : "local";
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** "2026-11-18" -> "18 November 2026". Falls back to today. */
export function formatTanggal(iso) {
  let d = null;
  if (iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    if (m) d = new Date(+m[1], +m[2] - 1, +m[3]);
  }
  if (!d || Number.isNaN(d.getTime())) d = new Date();
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

/** "1998-05-12" -> "12 Mei 1998" (short month for birth dates). */
export function formatTanggalLahir(iso) {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${+m[3]} ${BULAN[+m[2] - 1]} ${m[1]}`;
}

const TONE_TEXT = {
  formal: "formal dan baku, sopan, standar yang disukai HRD",
  fresh:
    "untuk fresh graduate tanpa pengalaman kerja: tonjolkan pendidikan, keterampilan, dan kemauan belajar yang tinggi; jangan mengarang pengalaman kerja",
  exp: "untuk pelamar berpengalaman: tonjolkan pengalaman kerja dan keterampilan yang relevan dengan posisi yang dilamar",
};

/** "SMK" + "SMK Negeri 2 Tangerang" -> "SMK Negeri 2 Tangerang" (no doubling). */
function pendidikanStr(p) {
  const jenjang = (p.jenjang || "").trim();
  const sekolah = (p.sekolah || "").trim();
  if (!jenjang) return sekolah;
  if (!sekolah) return jenjang;
  return sekolah.toLowerCase().startsWith(jenjang.toLowerCase())
    ? sekolah
    : `${jenjang} ${sekolah}`;
}

function profileJson(profile) {
  return JSON.stringify(
    {
      nama: profile.nama,
      tempatTanggalLahir: [profile.tempatLahir, formatTanggalLahir(profile.tglLahir)]
        .filter(Boolean)
        .join(", "),
      alamat: profile.alamat,
      hp: profile.hp,
      email: profile.email,
      pendidikan: pendidikanStr(profile),
      tahunLulus: profile.tahunLulus,
      pengalaman: (profile.pengalaman || []).map((e) => ({
        perusahaan: e.perusahaan,
        jabatan: e.jabatan,
        lama: e.lama,
        tugas: e.tugas,
      })),
      keterampilan: profile.keterampilan,
      lamaran: {
        posisi: profile.posisi,
        perusahaan: profile.perusahaan,
        kota: profile.kota,
        tanggalSurat: formatTanggal(profile.tglSurat),
        sumberLowongan: profile.sumber,
      },
    },
    null,
    2,
  );
}

async function askModel(prompt) {
  const model = await getHybridModel();
  if (!model) return null;
  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    if (!text || !text.trim()) return null;
    const source = (response.inferenceSource || "IN_CLOUD").toUpperCase();
    return { text: text.trim(), source };
  } catch (err) {
    console.warn("[LamaranKu] Hybrid inference failed, using local template:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public generators — AI first, local template fallback.
// Each returns { text, source } with source 'ON_DEVICE' | 'IN_CLOUD' | 'LOCAL'.
// ---------------------------------------------------------------------------

export async function generateLetter(profile) {
  const tone = TONE_TEXT[profile.tone] || TONE_TEXT.formal;
  const prompt = `Tulis surat lamaran kerja formal dalam Bahasa Indonesia, gaya ${tone}.

Data pelamar (JSON):
${profileJson(profile)}

Aturan:
- Tulis HANYA isi suratnya, tanpa pengantar atau penjelasan.
- Struktur lengkap: tempat dan tanggal surat, perihal "Lamaran Pekerjaan", alamat perusahaan tujuan, salam pembuka "Dengan hormat,", isi, penutup, "Hormat saya," lalu nama pelamar.
- Pakai HANYA data di atas. Jangan mengarang fakta, jangan menulis placeholder seperti [nama] atau [tanggal].
- Jika suatu data kosong (misalnya sumber lowongan), tulis kalimat pembuka yang umum tanpa menyebut sumber.
- Jika pelamar tidak punya pengalaman kerja, tulis bahwa ia lulusan baru yang siap belajar dan bekerja keras.
- Bahasa Indonesia formal yang benar dan sopan.`;
  const ai = await askModel(prompt);
  if (ai) return ai;
  return { text: localLetter(profile), source: "LOCAL" };
}

export async function generateCV(profile) {
  const tone = TONE_TEXT[profile.tone] || TONE_TEXT.formal;
  const prompt = `Susun Curriculum Vitae (CV) yang ringkas dan rapi dalam Bahasa Indonesia, gaya ${tone}.

Data pelamar (JSON):
${profileJson(profile)}

Aturan:
- Tulis HANYA isi CV-nya, tanpa pengantar atau penjelasan.
- Bagian: CURRICULUM VITAE (judul), DATA PRIBADI, PENDIDIKAN, PENGALAMAN KERJA, KETERAMPILAN.
- Pakai HANYA data di atas. Jangan mengarang fakta, jangan menulis placeholder seperti [nama].
- Jika pelamar tidak punya pengalaman kerja, tulis "Belum memiliki pengalaman kerja formal" dan tambahkan kalimat bahwa ia siap belajar.
- Ringkas, rapi, dan siap dicetak. Bahasa Indonesia yang benar.`;
  const ai = await askModel(prompt);
  if (ai) return ai;
  return { text: localCV(profile), source: "LOCAL" };
}

// ---------------------------------------------------------------------------
// Local templates (no network, no key). Deterministic and correct — they
// are the fallback, and the UI always labels their output "Template · Lokal".
// ---------------------------------------------------------------------------

function dataDiriLines(p) {
  const ttl = [p.tempatLahir, formatTanggalLahir(p.tglLahir)]
    .filter(Boolean)
    .join(", ");
  const lines = [];
  if (p.nama) lines.push(`Nama                  : ${p.nama}`);
  if (ttl) lines.push(`Tempat, tanggal lahir : ${ttl}`);
  if (p.alamat) lines.push(`Alamat                : ${p.alamat}`);
  if (p.hp) lines.push(`No. HP                : ${p.hp}`);
  if (p.email) lines.push(`Email                 : ${p.email}`);
  return lines;
}

export function localLetter(p) {
  const kota = p.kota || p.tempatLahir || "";
  const tgl = formatTanggal(p.tglSurat);
  const pendidikan = pendidikanStr(p);
  const punyaPengalaman = (p.pengalaman || []).some((e) => e.perusahaan || e.jabatan);
  const skills = (p.keterampilan || []).join(", ");

  const pembuka = p.sumber
    ? `Berdasarkan informasi lowongan pekerjaan dari ${p.sumber}, saya yang bertanda tangan di bawah ini:`
    : `Dengan ini saya mengajukan lamaran pekerjaan. Saya yang bertanda tangan di bawah ini:`;

  let latar;
  if (punyaPengalaman) {
    const total = p.pengalaman
      .filter((e) => e.perusahaan)
      .map((e) => `${e.jabatan || "karyawan"} di ${e.perusahaan}${e.lama ? `, ${e.lama}` : ""}`)
      .join("; ");
    latar = `Saya lulusan ${pendidikan || "sekolah"}${p.tahunLulus ? ` tahun ${p.tahunLulus}` : ""} dan memiliki pengalaman kerja sebagai ${total}.`;
  } else if (p.tone === "fresh" || !pendidikan) {
    latar = `Saya lulusan ${pendidikan || "sekolah"}${p.tahunLulus ? ` tahun ${p.tahunLulus}` : ""}. Sebagai lulusan baru, saya memiliki kemauan belajar yang tinggi, disiplin, dan siap bekerja keras.`;
  } else {
    latar = `Saya lulusan ${pendidikan || "sekolah"}${p.tahunLulus ? ` tahun ${p.tahunLulus}` : ""}.`;
  }

  const skillLine = skills
    ? `Saya memiliki keterampilan antara lain: ${skills}.`
    : "";

  const parts = [
    `${kota ? kota + ", " : ""}${tgl}`,
    ``,
    `Perihal: Lamaran Pekerjaan`,
    ``,
    `Yth.`,
    `HRD ${p.perusahaan || "Perusahaan"}`,
    kota ? `di ${kota}` : `di tempat`,
    ``,
    `Dengan hormat,`,
    ``,
    pembuka,
    ``,
    ...dataDiriLines(p),
    ``,
    `Dengan ini saya mengajukan lamaran pekerjaan untuk posisi ${p.posisi || "(posisi yang dilamar)"} di ${p.perusahaan || "perusahaan Bapak/Ibu"}.`,
    ``,
    latar,
    skillLine,
    ``,
    `Besar harapan saya untuk dapat bergabung dan berkontribusi di ${p.perusahaan || "perusahaan Bapak/Ibu"}. Saya siap mengikuti seluruh proses seleksi yang berlaku.`,
    ``,
    `Demikian surat lamaran ini saya sampaikan. Atas perhatian Bapak/Ibu, saya ucapkan terima kasih.`,
    ``,
    `Hormat saya,`,
    ``,
    ``,
    p.nama || "",
  ];
  return parts.filter((line, i, arr) => !(line === "" && arr[i - 1] === "")).join("\n");
}

export function localCV(p) {
  const pendidikan = pendidikanStr(p);
  const punyaPengalaman = (p.pengalaman || []).some((e) => e.perusahaan || e.jabatan);
  const skills = (p.keterampilan || []).join(", ");

  const lines = [`CURRICULUM VITAE`, ``, `DATA PRIBADI`];
  for (const line of dataDiriLines(p)) lines.push(line);

  lines.push(``, `PENDIDIKAN`);
  if (pendidikan || p.tahunLulus) {
    lines.push(`- ${pendidikan}${p.tahunLulus ? ` (${p.tahunLulus})` : ""}`);
  } else {
    lines.push(`- (belum diisi)`);
  }

  lines.push(``, `PENGALAMAN KERJA`);
  if (punyaPengalaman) {
    for (const e of p.pengalaman) {
      if (!e.perusahaan && !e.jabatan) continue;
      lines.push(`- ${e.jabatan || "Karyawan"} — ${e.perusahaan || ""}${e.lama ? `, ${e.lama}` : ""}`);
      if (e.tugas) lines.push(`  ${e.tugas}`);
    }
  } else {
    lines.push(`- Belum memiliki pengalaman kerja formal. Siap belajar dan bekerja keras.`);
  }

  lines.push(``, `KETERAMPILAN`);
  if (skills) {
    for (const s of p.keterampilan) lines.push(`- ${s}`);
  } else {
    lines.push(`- (belum diisi)`);
  }
  return lines.join("\n");
}
