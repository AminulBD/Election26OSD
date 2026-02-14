const state = {
  divisions: [],
  districts: [],
  upazilas: [],
  constituencies: [],
  unions: [],
  centers: [],
  parties: [],
  mapSlugs: new Set(),
  mapDisplayEnabled: false,
  selectedCenterId: null,
  searchSuggestionItems: [],
  searchSuggestionIndex: -1,
  filteredCenters: [],
  renderedCount: 0,
};

const pageSize = 40;

const el = {
  tabAreaBtn: document.getElementById("tabAreaBtn"),
  tabNidBtn: document.getElementById("tabNidBtn"),
  areaLookupPanel: document.getElementById("areaLookupPanel"),
  nidLookupPanel: document.getElementById("nidLookupPanel"),
  divisionSelect: document.getElementById("divisionSelect"),
  districtSelect: document.getElementById("districtSelect"),
  upazilaSelect: document.getElementById("upazilaSelect"),
  constituencySelect: document.getElementById("constituencySelect"),
  unionSelect: document.getElementById("unionSelect"),
  voterTypeSelect: document.getElementById("voterTypeSelect"),
  searchInput: document.getElementById("searchInput"),
  searchSuggestions: document.getElementById("searchSuggestions"),
  searchBtn: document.getElementById("searchBtn"),
  resetBtn: document.getElementById("resetBtn"),
  nidInput: document.getElementById("nidInput"),
  dobInput: document.getElementById("dobInput"),
  captchaInput: document.getElementById("captchaInput"),
  nidLookupBtn: document.getElementById("nidLookupBtn"),
  nidResetBtn: document.getElementById("nidResetBtn"),
  statusText: document.getElementById("statusText"),
  resultsList: document.getElementById("resultsList"),
  resultCount: document.getElementById("resultCount"),
  loadMoreBtn: document.getElementById("loadMoreBtn"),
  nearbyBtn: document.getElementById("nearbyBtn"),
  totalCenters: document.getElementById("totalCenters"),
  totalConstituencies: document.getElementById("totalConstituencies"),
  totalParties: document.getElementById("totalParties"),
  toggleMapBtn: document.getElementById("toggleMapBtn"),
  heroMapShowcase: document.getElementById("heroMapShowcase"),
  partyGrid: document.getElementById("partyGrid"),
};

const maps = {
  divisionById: new Map(),
  districtById: new Map(),
  upazilaById: new Map(),
  constituencyById: new Map(),
  unionById: new Map(),
  districtsByDivision: new Map(),
  upazilasByDistrict: new Map(),
  constituenciesByDistrict: new Map(),
  unionsByUpazila: new Map(),
};

let searchRealtimeTimer = null;

function toName(item) {
  return item?.name || item?.name_en || "-";
}

function toNameEn(item) {
  return item?.name_en && item.name_en.trim() !== "" && item.name_en !== "-" ? item.name_en : "";
}

function setStatus(msg) {
  el.statusText.textContent = msg;
}

function setOptions(selectEl, items, placeholder, labelFn) {
  const fragment = document.createDocumentFragment();
  const first = document.createElement("option");
  first.value = "";
  first.textContent = placeholder;
  fragment.appendChild(first);

  items.forEach((item) => {
    const opt = document.createElement("option");
    opt.value = String(item.id);
    opt.textContent = labelFn(item);
    fragment.appendChild(opt);
  });

  selectEl.innerHTML = "";
  selectEl.appendChild(fragment);
}

function groupBy(items, key) {
  const grouped = new Map();
  items.forEach((item) => {
    const id = item[key];
    if (!grouped.has(id)) grouped.set(id, []);
    grouped.get(id).push(item);
  });
  return grouped;
}

function parseAreaCodes(raw) {
  if (!raw || raw === "[]") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function bootstrapMaps() {
  state.divisions.forEach((d) => maps.divisionById.set(d.id, d));
  state.districts.forEach((d) => maps.districtById.set(d.id, d));
  state.upazilas.forEach((u) => maps.upazilaById.set(u.id, u));
  state.constituencies.forEach((c) => maps.constituencyById.set(c.id, c));
  state.unions.forEach((u) => maps.unionById.set(u.id, u));

  maps.districtsByDivision = groupBy(state.districts, "division_id");
  maps.upazilasByDistrict = groupBy(state.upazilas, "district_id");
  maps.constituenciesByDistrict = groupBy(state.constituencies, "district_id");
  maps.unionsByUpazila = groupBy(state.unions, "upazila_id");

  state.centers.forEach((center) => {
    center.areaCodes = parseAreaCodes(center.voter_area_codes);
    center.searchBlob = [
      center.name || "",
      center.name_en || "",
      center.slug || "",
      ...(center.areaCodes || []),
    ]
      .join(" ")
      .toLowerCase();
  });
}

function loadDistricts() {
  const divisionId = Number(el.divisionSelect.value || 0);
  const items = divisionId ? (maps.districtsByDivision.get(divisionId) || []) : [];
  items.sort((a, b) => toName(a).localeCompare(toName(b), "bn"));

  setOptions(el.districtSelect, items, "জেলা নির্বাচন করুন", (item) => toName(item));
  el.districtSelect.disabled = !divisionId;

  setOptions(el.upazilaSelect, [], "উপজেলা নির্বাচন করুন", () => "");
  setOptions(el.constituencySelect, [], "আসন নির্বাচন করুন", () => "");
  setOptions(el.unionSelect, [], "ইউনিয়ন/ওয়ার্ড নির্বাচন করুন", () => "");
  el.upazilaSelect.disabled = true;
  el.constituencySelect.disabled = true;
  el.unionSelect.disabled = true;
}

function loadUpazilasAndConstituencies() {
  const districtId = Number(el.districtSelect.value || 0);
  const upazilas = districtId ? (maps.upazilasByDistrict.get(districtId) || []) : [];
  const constituencies = districtId ? (maps.constituenciesByDistrict.get(districtId) || []) : [];

  upazilas.sort((a, b) => toName(a).localeCompare(toName(b), "bn"));
  constituencies.sort((a, b) => (a.code || 0) - (b.code || 0));

  setOptions(el.upazilaSelect, upazilas, "উপজেলা নির্বাচন করুন", (item) => toName(item));
  setOptions(el.constituencySelect, constituencies, "আসন নির্বাচন করুন", (item) => `${toName(item)} (${item.code})`);
  setOptions(el.unionSelect, [], "ইউনিয়ন/ওয়ার্ড নির্বাচন করুন", () => "");

  el.upazilaSelect.disabled = !districtId;
  el.constituencySelect.disabled = !districtId;
  el.unionSelect.disabled = true;
}

function loadUnions() {
  const upazilaId = Number(el.upazilaSelect.value || 0);
  const unions = upazilaId ? (maps.unionsByUpazila.get(upazilaId) || []) : [];
  unions.sort((a, b) => toName(a).localeCompare(toName(b), "bn"));

  setOptions(el.unionSelect, unions, "ইউনিয়ন/ওয়ার্ড নির্বাচন করুন", (item) => toName(item));
  el.unionSelect.disabled = !upazilaId;
}

function getActiveFilters(includeQuery = true) {
  return {
    divisionId: Number(el.divisionSelect.value || 0),
    districtId: Number(el.districtSelect.value || 0),
    upazilaId: Number(el.upazilaSelect.value || 0),
    constituencyId: Number(el.constituencySelect.value || 0),
    unionId: Number(el.unionSelect.value || 0),
    voterType: el.voterTypeSelect.value,
    query: includeQuery ? normalizeDigits(el.searchInput.value.trim().toLowerCase()) : "",
    selectedCenterId: state.selectedCenterId,
  };
}

function matchesFilters(center, f) {
  if (f.selectedCenterId && center.id !== f.selectedCenterId) return false;
  if (f.divisionId && center.division_id !== f.divisionId) return false;
  if (f.districtId && center.district_id !== f.districtId) return false;
  if (f.upazilaId && center.upazila_id !== f.upazilaId) return false;
  if (f.constituencyId && center.constituency_id !== f.constituencyId) return false;
  if (f.unionId && center.union_id !== f.unionId) return false;
  if (f.voterType && center.voter_type !== f.voterType) return false;
  if (f.query && !center.searchBlob.includes(f.query)) return false;
  return true;
}

function filterCenters() {
  const f = getActiveFilters();

  const result = state.centers.filter((c) => matchesFilters(c, f));

  result.sort((a, b) => {
    if (a.district_id !== b.district_id) return a.district_id - b.district_id;
    if (a.upazila_id !== b.upazila_id) return a.upazila_id - b.upazila_id;
    return (a.serial || 0) - (b.serial || 0);
  });

  state.filteredCenters = result;
  state.renderedCount = 0;
  renderMore();
}

function clearSearchSuggestions() {
  state.searchSuggestionItems = [];
  state.searchSuggestionIndex = -1;
  el.searchSuggestions.innerHTML = "";
  el.searchSuggestions.classList.add("hidden");
}

function getSuggestionLabel(center) {
  const upazila = maps.upazilaById.get(center.upazila_id);
  const district = maps.districtById.get(center.district_id);
  const firstAreaCode = (center.areaCodes || [])[0] || "-";
  return `${toName(upazila)}, ${toName(district)} | কোড: ${firstAreaCode}`;
}

function renderSearchSuggestions(items) {
  state.searchSuggestionItems = items;
  state.searchSuggestionIndex = -1;
  el.searchSuggestions.innerHTML = "";

  if (!items.length) {
    el.searchSuggestions.classList.add("hidden");
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach((center, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "suggestion-item";
    btn.setAttribute("role", "option");
    btn.dataset.index = String(index);

    const title = document.createElement("span");
    title.className = "suggestion-title";
    title.textContent = toName(center);
    btn.appendChild(title);

    const meta = document.createElement("span");
    meta.className = "suggestion-meta";
    meta.textContent = getSuggestionLabel(center);
    btn.appendChild(meta);

    btn.addEventListener("click", () => {
      selectSearchSuggestion(center);
    });

    fragment.appendChild(btn);
  });

  el.searchSuggestions.appendChild(fragment);
  el.searchSuggestions.classList.remove("hidden");
}

function selectSearchSuggestion(center) {
  state.selectedCenterId = center.id;
  el.searchInput.value = toName(center);
  clearSearchSuggestions();
  filterCenters();
  setStatus("অটোফিল সম্পন্ন হয়েছে। নির্বাচিত কেন্দ্র দেখানো হচ্ছে।");
}

function moveSuggestionFocus(direction) {
  const total = state.searchSuggestionItems.length;
  if (!total) return;

  state.searchSuggestionIndex = (state.searchSuggestionIndex + direction + total) % total;
  const buttons = el.searchSuggestions.querySelectorAll(".suggestion-item");
  buttons.forEach((btn, idx) => {
    btn.classList.toggle("active", idx === state.searchSuggestionIndex);
  });
}

function updateRealtimeSuggestions() {
  const raw = el.searchInput.value.trim();
  if (raw.length < 2) {
    clearSearchSuggestions();
    filterCenters();
    return;
  }

  const query = normalizeDigits(raw.toLowerCase());
  const filters = getActiveFilters(false);
  const picks = [];

  for (const center of state.centers) {
    if (!matchesFilters(center, filters)) continue;
    if (!center.searchBlob.includes(query)) continue;
    picks.push(center);
    if (picks.length >= 8) break;
  }

  renderSearchSuggestions(picks);
  filterCenters();
}

function bnVoterType(value) {
  if (value === "MALE") return "শুধু পুরুষ";
  if (value === "FEMALE") return "শুধু নারী";
  return "পুরুষ-নারী উভয়";
}

function getConstituencyMapSrc(constituency) {
  if (!constituency) return "";
  const slug = String(constituency.slug || "").toLowerCase().trim();
  if (slug && state.mapSlugs.has(slug)) return `maps/${slug}.svg`;
  if (constituency.map_url) return constituency.map_url;
  return "";
}

function buildCenterCard(center, options = {}) {
  const { showMap = false } = options;
  const division = maps.divisionById.get(center.division_id);
  const district = maps.districtById.get(center.district_id);
  const upazila = maps.upazilaById.get(center.upazila_id);
  const union = maps.unionById.get(center.union_id);
  const constituency = maps.constituencyById.get(center.constituency_id);

  const card = document.createElement("article");
  card.className = "card";

  const title = document.createElement("h4");
  title.textContent = toName(center);
  card.appendChild(title);

  const enName = toNameEn(center);
  if (enName) {
    const pEn = document.createElement("p");
    pEn.textContent = `EN: ${enName}`;
    card.appendChild(pEn);
  }

  const pLoc = document.createElement("p");
  pLoc.textContent = `এলাকা: ${toName(union)}, ${toName(upazila)}, ${toName(district)}, ${toName(division)}`;
  card.appendChild(pLoc);

  const pCon = document.createElement("p");
  pCon.textContent = `আসন: ${toName(constituency)} (${constituency?.code || "-"})`;
  card.appendChild(pCon);

  const pCode = document.createElement("p");
  pCode.textContent = `এরিয়া কোড: ${(center.areaCodes || []).join(", ") || "-"}`;
  card.appendChild(pCode);

  const meta = document.createElement("div");
  meta.className = "meta";

  const b1 = document.createElement("span");
  b1.className = "badge";
  b1.textContent = `টাইপ: ${bnVoterType(center.voter_type)}`;
  meta.appendChild(b1);

  const b2 = document.createElement("span");
  b2.className = "badge";
  b2.textContent = `সিরিয়াল: ${center.serial || "-"}`;
  meta.appendChild(b2);

  card.appendChild(meta);

  const constituencyMap = getConstituencyMapSrc(constituency);
  if (showMap && constituencyMap) {
    const mapWrap = document.createElement("div");
    mapWrap.className = "map-inline";
    const mapImage = document.createElement("img");
    mapImage.className = "map-thumb";
    mapImage.loading = "lazy";
    mapImage.src = constituencyMap;
    mapImage.alt = `${toName(constituency)} মানচিত্র`;
    mapWrap.appendChild(mapImage);
    card.appendChild(mapWrap);
  }

  if (typeof center.latitude === "number" && typeof center.longitude === "number") {
    const link = document.createElement("a");
    link.href = `https://www.google.com/maps?q=${center.latitude},${center.longitude}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "গুগল ম্যাপে দেখুন";
    card.appendChild(link);
  }

  return card;
}

function renderMore() {
  const total = state.filteredCenters.length;
  if (state.renderedCount === 0) {
    el.resultsList.innerHTML = "";
  }

  const next = state.filteredCenters.slice(state.renderedCount, state.renderedCount + pageSize);
  const seenConstituencies = new Set(
    state.filteredCenters.slice(0, state.renderedCount).map((c) => c.constituency_id)
  );

  next.forEach((center) => {
    const showMap = state.mapDisplayEnabled && !seenConstituencies.has(center.constituency_id);
    if (showMap) seenConstituencies.add(center.constituency_id);
    el.resultsList.appendChild(buildCenterCard(center, { showMap }));
  });

  state.renderedCount += next.length;
  el.resultCount.textContent = `${total.toLocaleString("bn-BD")} টি কেন্দ্র`;

  if (state.renderedCount < total) {
    el.loadMoreBtn.classList.remove("hidden");
    el.loadMoreBtn.textContent = `আরও দেখুন (${(total - state.renderedCount).toLocaleString("bn-BD")} বাকি)`;
  } else {
    el.loadMoreBtn.classList.add("hidden");
  }
}

function resetAll() {
  el.divisionSelect.value = "";
  el.searchInput.value = "";
  el.voterTypeSelect.value = "";
  state.selectedCenterId = null;
  clearSearchSuggestions();
  loadDistricts();
  setStatus("সব ফিল্টার রিসেট হয়েছে।");
  filterCenters();
}

function normalizeDigits(value) {
  const bn = "০১২৩৪৫৬৭৮৯";
  return String(value || "")
    .trim()
    .replace(/[০-৯]/g, (d) => String(bn.indexOf(d)));
}

function parseDobIso(value) {
  if (!value) return null;
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function yearsBetween(dob, now = new Date()) {
  let years = now.getFullYear() - dob.getFullYear();
  const monthDelta = now.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dob.getDate())) years -= 1;
  return years;
}

function switchLookupTab(mode) {
  const area = mode === "area";
  el.tabAreaBtn.classList.toggle("active", area);
  el.tabNidBtn.classList.toggle("active", !area);
  el.areaLookupPanel.classList.toggle("hidden", !area);
  el.nidLookupPanel.classList.toggle("hidden", area);
  clearSearchSuggestions();
  if (area) setStatus("এলাকা ভিত্তিক অনুসন্ধান সক্রিয়।");
  else setStatus("NID + জন্মতারিখ অনুসন্ধান সক্রিয়।");
}

function resetNidLookup() {
  el.nidInput.value = "";
  el.dobInput.value = "";
  el.captchaInput.value = "";
  setStatus("NID ফর্ম রিসেট হয়েছে।");
}

function validateNidLookup() {
  const nidRaw = normalizeDigits(el.nidInput.value).replace(/\D/g, "");
  const dob = parseDobIso(el.dobInput.value);
  const captcha = (el.captchaInput.value || "").trim();

  if (![10, 13, 17].includes(nidRaw.length)) {
    return { ok: false, message: "NID অবশ্যই ১০, ১৩ অথবা ১৭ সংখ্যার হতে হবে।" };
  }

  if (!dob) {
    return { ok: false, message: "সঠিক জন্মতারিখ দিন।" };
  }

  if (dob > new Date()) {
    return { ok: false, message: "জন্মতারিখ ভবিষ্যতের হতে পারবে না।" };
  }

  if (yearsBetween(dob) < 18) {
    return { ok: false, message: "ভোটার অনুসন্ধানের জন্য বয়স কমপক্ষে ১৮ হতে হবে।" };
  }

  if (captcha.length < 4) {
    return { ok: false, message: "যাচাইকরণের জন্য কমপক্ষে ৪ অক্ষর লিখুন।" };
  }

  return { ok: true, nid: nidRaw, dob };
}

function runNidLookup() {
  const v = validateNidLookup();
  if (!v.ok) {
    setStatus(v.message);
    return;
  }

  const areaCode = v.nid.slice(-6);
  const matched = state.centers.filter((c) => (c.areaCodes || []).includes(areaCode));

  if (!matched.length) {
    state.filteredCenters = [];
    state.renderedCount = 0;
    renderMore();
    setStatus(`কোনো কেন্দ্র মেলেনি। NID শেষ ৬ ডিজিট (${areaCode}) ডেটাসেটে নেই।`);
    return;
  }

  matched.sort((a, b) => {
    if (a.district_id !== b.district_id) return a.district_id - b.district_id;
    if (a.upazila_id !== b.upazila_id) return a.upazila_id - b.upazila_id;
    return (a.serial || 0) - (b.serial || 0);
  });

  state.filteredCenters = matched;
  state.renderedCount = 0;
  renderMore();

  setStatus(
    `NID যাচাইকরণ সম্পন্ন। জন্মতারিখ: ${v.dob.toLocaleDateString("bn-BD")} | সম্ভাব্য এরিয়া কোড: ${areaCode}`
  );
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function findNearby() {
  if (!navigator.geolocation) {
    setStatus("আপনার ব্রাউজারে লোকেশন সাপোর্ট নেই।");
    return;
  }

  setStatus("আপনার অবস্থান নেওয়া হচ্ছে...");

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      const base = state.filteredCenters.length ? state.filteredCenters : state.centers;
      const withCoords = base.filter((c) => typeof c.latitude === "number" && typeof c.longitude === "number");

      if (!withCoords.length) {
        setStatus("জিও কোঅর্ডিনেট পাওয়া যায়নি।");
        return;
      }

      withCoords.forEach((c) => {
        c.distance = haversineKm(lat, lng, c.latitude, c.longitude);
      });

      withCoords.sort((a, b) => a.distance - b.distance);
      state.filteredCenters = withCoords.slice(0, 20);
      state.renderedCount = 0;
      renderMore();
      setStatus("আপনার নিকটবর্তী কেন্দ্র দেখানো হয়েছে (সর্বোচ্চ ২০ টি)।");
    },
    () => {
      setStatus("লোকেশন পাওয়া যায়নি। লোকেশন অনুমতি দিন।");
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function renderParties() {
  el.partyGrid.innerHTML = "";
  const valid = state.parties.filter((p) => p.name && p.name !== "-" && p.name !== "---");
  valid.slice(0, 24).forEach((party) => {
    const div = document.createElement("div");
    div.className = "party-card";

    const img = document.createElement("img");
    img.loading = "lazy";
    img.src = party.symbol_url || "";
    img.alt = party.symbol_name || "প্রতীক";
    div.appendChild(img);

    const p = document.createElement("p");
    p.textContent = toName(party);
    div.appendChild(p);

    el.partyGrid.appendChild(div);
  });
}

function renderHeroMaps() {
  if (!el.heroMapShowcase) return;
  el.heroMapShowcase.innerHTML = "";

  if (!state.mapDisplayEnabled) {
    const msg = document.createElement("p");
    msg.className = "status";
    msg.textContent = "ম্যাপ ডিসপ্লে বন্ধ আছে। 'ম্যাপ চালু করুন' বাটনে ক্লিক করুন।";
    el.heroMapShowcase.appendChild(msg);
    return;
  }

  const picks = state.constituencies
    .filter((c) => Boolean(getConstituencyMapSrc(c)))
    .sort((a, b) => (b.total_voters || 0) - (a.total_voters || 0))
    .slice(0, 4);

  if (!picks.length) {
    const msg = document.createElement("p");
    msg.className = "status";
    msg.textContent = "মানচিত্র পাওয়া যায়নি।";
    el.heroMapShowcase.appendChild(msg);
    return;
  }

  picks.forEach((c) => {
    const tile = document.createElement("article");
    tile.className = "map-tile";

    const img = document.createElement("img");
    img.loading = "lazy";
    img.src = getConstituencyMapSrc(c);
    img.alt = `${toName(c)} মানচিত্র`;
    tile.appendChild(img);

    const text = document.createElement("p");
    text.textContent = `${toName(c)} | ভোটার: ${(c.total_voters || 0).toLocaleString("bn-BD")}`;
    tile.appendChild(text);

    el.heroMapShowcase.appendChild(tile);
  });
}

function syncMapToggleButton() {
  if (!el.toggleMapBtn) return;
  el.toggleMapBtn.textContent = state.mapDisplayEnabled ? "ম্যাপ বন্ধ করুন" : "ম্যাপ চালু করুন";
  el.toggleMapBtn.setAttribute("aria-pressed", state.mapDisplayEnabled ? "true" : "false");
}

function toggleMapDisplay() {
  state.mapDisplayEnabled = !state.mapDisplayEnabled;
  syncMapToggleButton();
  renderHeroMaps();
  state.renderedCount = 0;
  renderMore();
  setStatus(state.mapDisplayEnabled ? "ম্যাপ ডিসপ্লে চালু হয়েছে।" : "ম্যাপ ডিসপ্লে বন্ধ করা হয়েছে।");
}

function bindEvents() {
  el.tabAreaBtn.addEventListener("click", () => switchLookupTab("area"));
  el.tabNidBtn.addEventListener("click", () => switchLookupTab("nid"));

  el.divisionSelect.addEventListener("change", () => {
    loadDistricts();
    filterCenters();
  });

  el.districtSelect.addEventListener("change", () => {
    loadUpazilasAndConstituencies();
    filterCenters();
  });

  el.upazilaSelect.addEventListener("change", () => {
    loadUnions();
    filterCenters();
  });

  el.constituencySelect.addEventListener("change", filterCenters);
  el.unionSelect.addEventListener("change", filterCenters);
  el.voterTypeSelect.addEventListener("change", filterCenters);

  el.searchBtn.addEventListener("click", filterCenters);
  el.searchInput.addEventListener("input", () => {
    state.selectedCenterId = null;
    clearTimeout(searchRealtimeTimer);
    searchRealtimeTimer = setTimeout(updateRealtimeSuggestions, 120);
  });
  el.searchInput.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveSuggestionFocus(1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      moveSuggestionFocus(-1);
      return;
    }
    if (e.key === "Escape") {
      clearSearchSuggestions();
      return;
    }
    if (e.key === "Enter") {
      if (state.searchSuggestionIndex >= 0) {
        e.preventDefault();
        const selected = state.searchSuggestionItems[state.searchSuggestionIndex];
        if (selected) selectSearchSuggestion(selected);
        return;
      }
      clearSearchSuggestions();
      filterCenters();
    }
  });

  el.resetBtn.addEventListener("click", resetAll);
  el.nidLookupBtn.addEventListener("click", runNidLookup);
  el.nidResetBtn.addEventListener("click", resetNidLookup);
  el.nidInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") runNidLookup();
  });
  el.dobInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") runNidLookup();
  });
  el.captchaInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") runNidLookup();
  });
  el.toggleMapBtn.addEventListener("click", toggleMapDisplay);
  el.loadMoreBtn.addEventListener("click", renderMore);
  el.nearbyBtn.addEventListener("click", findNearby);
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-autocomplete")) {
      clearSearchSuggestions();
    }
  });
}

async function loadData() {
  setStatus("ডেটাসেট লোড হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...");

  const [
    divisions,
    districts,
    upazilas,
    constituencies,
    unions,
    centers,
    parties,
    mapIndex,
  ] = await Promise.all([
    fetch("data/divisions.json").then((r) => r.json()),
    fetch("data/districts.json").then((r) => r.json()),
    fetch("data/upazilas.json").then((r) => r.json()),
    fetch("data/constituencies.json").then((r) => r.json()),
    fetch("data/unions.json").then((r) => r.json()),
    fetch("data/centers.json").then((r) => r.json()),
    fetch("data/parties.json").then((r) => r.json()),
    fetch("data/maps_index.json")
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []),
  ]);

  state.divisions = divisions;
  state.districts = districts;
  state.upazilas = upazilas;
  state.constituencies = constituencies;
  state.unions = unions;
  state.centers = centers;
  state.parties = parties;
  state.mapSlugs = new Set((mapIndex || []).map((slug) => String(slug).toLowerCase()));

  bootstrapMaps();

  state.divisions.sort((a, b) => toName(a).localeCompare(toName(b), "bn"));
  setOptions(el.divisionSelect, state.divisions, "বিভাগ নির্বাচন করুন", (item) => toName(item));

  el.totalCenters.textContent = `মোট কেন্দ্র: ${state.centers.length.toLocaleString("bn-BD")}`;
  el.totalConstituencies.textContent = `মোট আসন: ${state.constituencies.length.toLocaleString("bn-BD")}`;
  el.totalParties.textContent = `মোট দল: ${state.parties.length.toLocaleString("bn-BD")}`;

  syncMapToggleButton();
  renderHeroMaps();
  renderParties();
  filterCenters();
  setStatus("ডেটা প্রস্তুত। এখন ফিল্টার করে খুঁজুন।");
}

async function init() {
  bindEvents();
  try {
    await loadData();
  } catch (err) {
    console.error(err);
    setStatus("ডেটা লোড ব্যর্থ হয়েছে। লোকাল সার্ভার চালিয়ে পুনরায় চেষ্টা করুন।");
  }
}

init();
