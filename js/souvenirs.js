/* Le mur des souvenirs — dépôt et affichage via Supabase */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cfg = window.CANDICE_CONFIG || {};
const form = document.getElementById("souvenirForm");
const gallery = document.getElementById("gallery");
const galleryStatus = document.getElementById("galleryStatus");
const status = document.getElementById("formStatus");
const submitBtn = document.getElementById("submitBtn");
const photoInput = document.getElementById("fieldPhoto");
const fileLabelText = document.getElementById("fileLabelText");
const preview = document.getElementById("photoPreview");
const previewImg = document.getElementById("photoPreviewImg");
const photoRemove = document.getElementById("photoRemove");

if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
  form.hidden = true;
  galleryStatus.textContent = "le mur des souvenirs ouvre très bientôt…";
  throw new Error("Supabase non configuré (js/config.js)");
}

const supabase = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

/* ——— Aperçu photo ——— */
let selectedFile = null;

photoInput.addEventListener("change", () => {
  const file = photoInput.files && photoInput.files[0];
  if (!file) return;
  selectedFile = file;
  previewImg.src = URL.createObjectURL(file);
  preview.hidden = false;
  fileLabelText.textContent = "📷  Changer de photo";
});

photoRemove.addEventListener("click", () => {
  selectedFile = null;
  photoInput.value = "";
  preview.hidden = true;
  fileLabelText.textContent = "📷  Ajouter une photo";
});

/* ——— Compression côté client (max 1600px, JPEG) ——— */
async function compressImage(file) {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file; // format non décodable (ex. HEIC sur certains navigateurs) : on tente tel quel
  const MAX = 1600;
  const ratio = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
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
  if (!name) return setStatus("Dis-nous au moins ton prénom 🙂", "error");
  if (!message && !selectedFile) return setStatus("Un petit mot ou une photo, il faut choisir au moins l’un des deux !", "error");

  submitBtn.disabled = true;
  setStatus("On accroche ton souvenir…");

  try {
    let photoPath = null;
    if (selectedFile) {
      const blob = await compressImage(selectedFile);
      photoPath = `photos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const { error: upErr } = await supabase.storage
        .from(cfg.BUCKET)
        .upload(photoPath, blob, { contentType: "image/jpeg" });
      if (upErr) throw upErr;
    }

    const { data, error } = await supabase
      .from(cfg.TABLE)
      .insert({ name, message: message || null, photo_path: photoPath })
      .select()
      .single();
    if (error) throw error;

    gallery.prepend(buildCard(data));
    galleryStatus.hidden = true;
    form.reset();
    photoRemove.click();
    setStatus("C’est accroché, merci ! 💛", "success");
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

function buildCard(row) {
  const card = document.createElement("article");
  card.className = "card" + (row.photo_path ? "" : " card--note");

  if (row.photo_path) {
    const img = document.createElement("img");
    img.className = "card__photo";
    img.loading = "lazy";
    img.alt = `Photo déposée par ${row.name}`;
    img.src = publicUrl(row.photo_path);
    card.appendChild(img);
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
    .limit(200);

  if (error) {
    console.error(error);
    // table pas encore créée (schema.sql pas appliqué) : le mur "ouvre bientôt"
    if (error.code === "42P01" || error.code === "PGRST205") {
      form.hidden = true;
      galleryStatus.textContent = "le mur des souvenirs ouvre très bientôt…";
    } else {
      galleryStatus.textContent = "impossible de charger le mur pour l’instant…";
    }
    return;
  }
  if (!data.length) {
    galleryStatus.textContent = "sois le premier ou la première à accrocher un souvenir !";
    return;
  }
  galleryStatus.hidden = true;
  const frag = document.createDocumentFragment();
  data.forEach((row) => frag.appendChild(buildCard(row)));
  gallery.appendChild(frag);
}

loadGallery();
