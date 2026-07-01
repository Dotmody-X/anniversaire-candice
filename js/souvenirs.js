/* Les photos de la soirée — dépôt et affichage via Supabase */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cfg = window.CANDICE_CONFIG || {};
const form = document.getElementById("souvenirForm");
const gallery = document.getElementById("gallery");
const galleryStatus = document.getElementById("galleryStatus");
const status = document.getElementById("formStatus");
const submitBtn = document.getElementById("submitBtn");
const photoInput = document.getElementById("fieldPhoto");
const fileLabelText = document.getElementById("fileLabelText");
const previews = document.getElementById("photoPreviews");

const MAX_PHOTOS = 10;

/* La catégorie est encodée dans le chemin du fichier : photos/soiree-… ou photos/souvenir-…
   (pas de colonne dédiée : le schéma SQL reste inchangé) */
const catOf = (row) => (row.photo_path && row.photo_path.startsWith("photos/souvenir-") ? "souvenir" : "soiree");

if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
  form.hidden = true;
  galleryStatus.textContent = "le mur des photos ouvre très bientôt…";
  throw new Error("Supabase non configuré (js/config.js)");
}

const supabase = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

/* ——— Sélection et aperçus (plusieurs photos possibles) ——— */
let selectedFiles = [];

photoInput.addEventListener("change", () => {
  const incoming = Array.from(photoInput.files || []);
  selectedFiles = selectedFiles.concat(incoming).slice(0, MAX_PHOTOS);
  photoInput.value = ""; // permet de re-sélectionner les mêmes fichiers
  renderPreviews();
});

function renderPreviews() {
  previews.innerHTML = "";
  selectedFiles.forEach((file, i) => {
    const item = document.createElement("div");
    item.className = "field__preview";
    const img = document.createElement("img");
    img.alt = `Aperçu photo ${i + 1}`;
    img.src = URL.createObjectURL(file);
    img.addEventListener("load", () => URL.revokeObjectURL(img.src));
    const rm = document.createElement("button");
    rm.type = "button";
    rm.className = "field__preview-remove";
    rm.setAttribute("aria-label", `Retirer la photo ${i + 1}`);
    rm.textContent = "✕";
    rm.addEventListener("click", () => {
      selectedFiles.splice(i, 1);
      renderPreviews();
    });
    item.append(img, rm);
    previews.appendChild(item);
  });
  fileLabelText.textContent = selectedFiles.length
    ? `📷  Ajouter d’autres photos (${selectedFiles.length}/${MAX_PHOTOS})`
    : "📷  Ajouter tes photos";
}

/* ——— Compression côté client (max 1600px, JPEG) ——— */
async function compressImage(file) {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file; // format non décodable (ex. HEIC sur certains navigateurs) : on tente tel quel
  const MAX = 1600;
  const ratio = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff"; // fond blanc : un PNG transparent deviendrait noir en JPEG
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.82));
  return blob || file;
}

/* ——— Envoi ——— */
function setStatus(msg, kind) {
  status.textContent = msg;
  status.className = "souvenir-form__status" + (kind ? ` is-${kind}` : "");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (form.website.value) return; // robot repéré, on ignore poliment

  const name = form.name.value.trim();
  const message = form.message.value.trim();
  if (!selectedFiles.length) return setStatus("Ajoute au moins une photo de la soirée 📷", "error");
  if (!name) return setStatus("Dis-nous qui a pris ces photos 🙂", "error");

  submitBtn.disabled = true;

  try {
    const inserted = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      setStatus(`On accroche ta photo ${i + 1}/${selectedFiles.length}…`);
      const blob = await compressImage(selectedFiles[i]);
      const category = form.category.value === "souvenir" ? "souvenir" : "soiree";
      const photoPath = `photos/${category}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const { error: upErr } = await supabase.storage
        .from(cfg.BUCKET)
        .upload(photoPath, blob, { contentType: "image/jpeg" });
      if (upErr) throw upErr;

      const { data, error } = await supabase
        .from(cfg.TABLE)
        .insert({ name, message: message || null, photo_path: photoPath })
        .select()
        .single();
      if (error) throw error;
      inserted.push(data);
    }

    inserted.reverse().forEach((row) => gallery.prepend(buildCard(row, { eager: true })));
    applyFilter();
    form.reset();
    form.message.placeholder = PLACEHOLDERS.soiree;
    selectedFiles = [];
    renderPreviews();
    setStatus(inserted.length > 1 ? `${inserted.length} photos accrochées, merci ! 💛` : "C’est accroché, merci ! 💛", "success");
  } catch (err) {
    console.error(err);
    setStatus("Oups, ça n’a pas marché… Réessaie dans un instant !", "error");
  } finally {
    submitBtn.disabled = false;
  }
});

/* ——— Galerie ——— */
function publicUrl(path) {
  return supabase.storage.from(cfg.BUCKET).getPublicUrl(path).data.publicUrl;
}

function buildCard(row, { eager = false } = {}) {
  const card = document.createElement("article");
  card.className = "card" + (row.photo_path ? "" : " card--note");
  card.dataset.category = catOf(row);

  if (row.photo_path) {
    const img = document.createElement("img");
    img.className = "card__photo";
    // eager pour ses propres photos tout juste postées (on veut les voir apparaître direct)
    img.loading = eager ? "eager" : "lazy";
    img.alt = `Photo de la soirée par ${row.name}`;
    img.src = publicUrl(row.photo_path);
    card.appendChild(img);
  }
  if (catOf(row) === "souvenir") {
    const badge = document.createElement("p");
    badge.className = "card__badge hand";
    badge.textContent = "souvenir 💛";
    card.appendChild(badge);
  }
  if (row.message) {
    const p = document.createElement("p");
    p.className = "card__message";
    p.textContent = row.message;
    card.appendChild(p);
  }
  const by = document.createElement("p");
  by.className = "card__name";
  by.textContent = `— ${row.name}`;
  card.appendChild(by);
  return card;
}

async function loadGallery() {
  const { data, error } = await supabase
    .from(cfg.TABLE)
    .select("id, created_at, name, message, photo_path")
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) {
    console.error(error);
    // table pas encore créée (schema.sql pas appliqué) : le mur "ouvre bientôt"
    if (error.code === "42P01" || error.code === "PGRST205") {
      form.hidden = true;
      galleryStatus.textContent = "le mur des photos ouvre très bientôt…";
    } else {
      galleryStatus.textContent = "impossible de charger le mur pour l’instant…";
    }
    return;
  }
  const frag = document.createDocumentFragment();
  data.forEach((row) => frag.appendChild(buildCard(row)));
  gallery.appendChild(frag);
  applyFilter();
}

/* ——— Filtres (tout / la soirée / souvenirs) ——— */
const filterBar = document.getElementById("galleryFilter");
let currentFilter = "all";

const EMPTY_MSG = {
  all: "sois le premier ou la première à accrocher une photo !",
  soiree: "aucune photo de la soirée pour l’instant…",
  souvenir: "aucun souvenir accroché pour l’instant…",
};

function applyFilter() {
  let visible = 0;
  gallery.querySelectorAll(".card").forEach((card) => {
    const show = currentFilter === "all" || card.dataset.category === currentFilter;
    card.hidden = !show;
    if (show) visible++;
  });
  galleryStatus.hidden = visible > 0;
  if (!visible) galleryStatus.textContent = EMPTY_MSG[currentFilter];
}

filterBar.addEventListener("click", (e) => {
  const btn = e.target.closest(".gallery-filter__btn");
  if (!btn) return;
  currentFilter = btn.dataset.filter;
  filterBar.querySelectorAll(".gallery-filter__btn").forEach((b) => b.classList.toggle("is-active", b === btn));
  applyFilter();
});

/* Le placeholder de la légende suit la catégorie choisie */
const PLACEHOLDERS = { soiree: "Ex. : le discours de minuit 😂", souvenir: "Ex. : l’été 98 en Ardèche 🌞" };
Array.from(form.category).forEach((radio) =>
  radio.addEventListener("change", () => {
    form.message.placeholder = PLACEHOLDERS[form.category.value] || PLACEHOLDERS.soiree;
  })
);

loadGallery();
