import {
  initDatabase,
  getCategories,
  addCategory,
  deleteCategory,
  getItemsByCategory,
  addItem,
  updateItemStatus,
  updateItemStar,
  updateItemDetails,
  deleteItem
} from "./db.js";

const state = {
  categories: [],
  currentCategoryId: null,
  activeSection: null,
  items: [],
  searchTerm: "",
  viewFilter: "all",
  homeAddCategoryOpen: false,
  homeRemoveCategoryOpen: false,
  addItemDrawerOpen: false,
  expandedItemId: null,
  popup: null
};

const iconMap = {
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
  edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l10-10-4-4L4 16v4z"/><path d="m12 6 4 4"/></svg>',
  move: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 8 7-8 7"/><path d="M4 12h11"/></svg>',
  undo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m16 5-8 7 8 7"/><path d="M20 12H9"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L2.5 9.8l6.5-.9Z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/></svg>'
};

const viewEl = document.getElementById("view");
const homeButton = document.getElementById("homeButton");
const toastContainer = document.getElementById("toastContainer");

function icon(name) {
  return `<span class="svg-icon">${iconMap[name] || ""}</span>`;
}

function setHeaderIconPlaceholders() {
  document.querySelectorAll("[data-icon]").forEach((el) => {
    const name = el.getAttribute("data-icon");
    el.innerHTML = iconMap[name] || "";
  });
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getTitleInitial(title) {
  return String(title || "").trim().charAt(0).toUpperCase() || "?";
}

function showToast(message, tone = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${tone}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 2300);
}

function navigateHome() {
  window.location.hash = "#/";
}

function navigateCategory(categoryId) {
  window.location.hash = `#/category/${categoryId}`;
}

function navigateCategorySection(categoryId, section) {
  window.location.hash = `#/category/${categoryId}/${section}`;
}

function getCurrentCategory() {
  return state.categories.find((category) => category.id === state.currentCategoryId) || null;
}

function filteredItems() {
  const query = state.searchTerm.trim().toLowerCase();
  const statusFilter = state.viewFilter;

  return state.items.filter((item) => {
    const matchesQuery = !query || item.title.toLowerCase().includes(query);
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;

    return matchesQuery && matchesStatus;
  });
}

function sortItemsByTitle(items) {
  return [...items].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
}

function getCategoryViewItems() {
  const matches = filteredItems();

  return {
    watchedItems: sortItemsByTitle(matches.filter((item) => item.status === "watched")),
    toWatchItems: matches.filter((item) => item.status === "to-watch"),
    starredItems: sortItemsByTitle(matches.filter((item) => item.starred))
  };
}

function sectionIdToKey(sectionId) {
  if (sectionId === "watchedSection") {
    return "watched";
  }

  if (sectionId === "toWatchSection") {
    return "to-watch";
  }

  if (sectionId === "starredSection") {
    return "starred";
  }

  return null;
}

function sectionKeyToMeta(sectionKey) {
  if (sectionKey === "watched") {
    return { id: "watchedSection", title: "Watched", status: "watched", droppable: true };
  }

  if (sectionKey === "to-watch") {
    return { id: "toWatchSection", title: "To Watch", status: "to-watch", droppable: true };
  }

  if (sectionKey === "starred") {
    return { id: "starredSection", title: "Starred", status: "starred", droppable: false };
  }

  return null;
}

function getSearchResults() {
  const query = state.searchTerm.trim().toLowerCase();
  if (!query) {
    return [];
  }

  return sortItemsByTitle(
    state.items.filter((item) => item.title.toLowerCase().includes(query))
  );
}

function locationLabelForItem(item) {
  const labels = [item.status === "watched" ? "Watched" : "To Watch"];
  if (item.starred) {
    labels.push("Starred");
  }

  return labels.join(" • ");
}

function searchResultTemplate(item) {
  return `
    <article class="search-result-card">
      <p class="item-title">${escapeHTML(item.title)}</p>
      <p class="item-status">${escapeHTML(locationLabelForItem(item))}</p>
    </article>
  `;
}

function categorySearchResultsTemplate() {
  const query = state.searchTerm.trim();
  if (!query) {
    return '<div class="empty-state">Search items to see where they are: Watched, To Watch, or Starred.</div>';
  }

  const results = getSearchResults();
  if (results.length === 0) {
    return '<div class="empty-state">No matching items found.</div>';
  }

  return `<div class="search-results-list">${results.map((item) => searchResultTemplate(item)).join("")}</div>`;
}

function filterButtonTemplate(value, label) {
  const isActive = state.viewFilter === value;

  return `<button
    class="filter-chip ${isActive ? "active" : ""}"
    type="button"
    data-action="set-filter"
    data-filter="${value}"
    aria-pressed="${isActive}"
  >${label}</button>`;
}

function itemCardTemplate(item) {
  const isExpanded = state.expandedItemId === item.id;
  const initial = getTitleInitial(item.title);
  const fallback = `<div class="poster poster-fallback" aria-hidden="true">${escapeHTML(initial)}</div>`;
  const poster = item.image
    ? `<img class="poster" src="${escapeHTML(item.image)}" alt="${escapeHTML(item.title)} poster" data-fallback-initial="${escapeHTML(initial)}" loading="lazy" decoding="async" fetchpriority="low" width="58" height="78" referrerpolicy="no-referrer" />`
    : fallback;

  const isStarred = Boolean(item.starred);
  const starAction = isStarred
    ? `<button class="action-btn star-btn active" type="button" data-action="toggle-star" data-id="${item.id}" aria-pressed="true">${icon("star")} Unstar</button>`
    : `<button class="action-btn star-btn" type="button" data-action="toggle-star" data-id="${item.id}" aria-pressed="false">${icon("star")} Star</button>`;

  const moveAction = item.status === "to-watch"
    ? `<button class="action-btn" type="button" data-action="move-item" data-id="${item.id}" data-next-status="watched">${icon("move")} Mark Watched</button>`
    : `<button class="action-btn" type="button" data-action="move-item" data-id="${item.id}" data-next-status="to-watch">${icon("undo")} Move To Watch</button>`;

  return `
    <article class="item-card ${isExpanded ? "expanded" : ""} ${isStarred ? "starred" : ""}" draggable="true" data-action="toggle-item" data-id="${item.id}" data-draggable-item="${item.id}" data-current-status="${item.status}" aria-expanded="${isExpanded}">
      ${poster}
      <div class="item-main">
        <p class="item-title">${escapeHTML(item.title)}</p>
        <p class="item-status">${item.status === "watched" ? "Watched" : "To Watch"}${isStarred ? " • Starred" : ""} • Tap card for options</p>
        <div class="item-actions">
          ${starAction}
          <button class="action-btn" type="button" data-action="edit-item" data-id="${item.id}">${icon("edit")} Edit</button>
          ${moveAction}
          <button class="action-btn danger" type="button" data-action="delete-item" data-id="${item.id}">${icon("trash")} Remove</button>
        </div>
      </div>
    </article>
  `;
}

function sectionTileTemplate(sectionId, title, count, description) {
  const sectionKey = sectionIdToKey(sectionId);
  const isActive = sectionKey !== null && state.activeSection === sectionKey;

  return `
    <button class="section-tile ${isActive ? "active" : ""}" type="button" data-action="scroll-to-section" data-section-id="${sectionId}">
      <span class="section-tile-count">${count}</span>
      <span class="section-tile-title">${title}</span>
      <span class="section-tile-description">${description}</span>
    </button>
  `;
}

function listSectionTemplate({ sectionId, status, title, items, droppable = true }) {
  const emptyMessage = sectionId === "starredSection"
    ? "No starred items yet. Mark one with the star button."
    : status === "watched"
      ? "Nothing marked as watched yet."
      : "No items yet. Add one below.";

  if (items.length === 0) {
    return `
      <section id="${sectionId}" class="list-panel ${droppable ? "list-dropzone" : ""}" ${droppable ? `data-drop-status="${status}"` : ""}>
        <div class="list-header">
          <h3>${title}</h3>
          <span class="badge">0</span>
        </div>
        <div class="empty-state">
          ${emptyMessage}
        </div>
      </section>
    `;
  }

  return `
    <section id="${sectionId}" class="list-panel ${droppable ? "list-dropzone" : ""}" ${droppable ? `data-drop-status="${status}"` : ""}>
      <div class="list-header">
        <h3>${title}</h3>
        <span class="badge">${items.length}</span>
      </div>
      <div class="items">
        ${items.map((item) => itemCardTemplate(item)).join("")}
      </div>
    </section>
  `;
}

function addItemDrawerTemplate() {
  return `
    <section class="panel add-item-drawer">
      <div class="panel-title-row">
        <h3>New Item Details</h3>
        <button class="ghost-btn" type="button" data-action="close-add-item">Close</button>
      </div>
      <form id="addItemForm" class="form-row">
        <div>
          <label for="itemTitleInput">Title</label>
          <input id="itemTitleInput" name="title" type="text" placeholder="Enter title" required maxlength="80" />
        </div>
        <div>
          <label for="itemStatusInput">Start in list</label>
          <select id="itemStatusInput" name="status">
            <option value="to-watch">To Watch</option>
            <option value="watched">Watched</option>
          </select>
        </div>
        <div class="actions-row">
          <button class="primary-btn" type="submit">${icon("plus")} Add Item</button>
        </div>
      </form>
    </section>
  `;
}

function popupTemplate() {
  if (!state.popup) {
    return "";
  }

  if (state.popup.type === "edit-item") {
    const item = state.popup.item;
    return `
      <section class="modal-backdrop" data-action="close-popup" aria-hidden="false">
        <div class="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="editItemTitle">
          <div class="modal-header">
            <h3 id="editItemTitle">Edit Item</h3>
            <button class="ghost-btn" type="button" data-action="close-popup">Close</button>
          </div>
          <form id="editItemForm" class="form-row" data-item-id="${item.id}">
            <div>
              <label for="editItemTitleInput">Name</label>
              <input id="editItemTitleInput" name="title" type="text" value="${escapeHTML(item.title)}" maxlength="80" required />
            </div>
            <div class="modal-actions">
              <button class="ghost-btn" type="button" data-action="close-popup">Cancel</button>
              <button class="primary-btn" type="submit">Save Changes</button>
            </div>
          </form>
        </div>
      </section>
    `;
  }

  if (state.popup.type === "delete-item") {
    return `
      <section class="modal-backdrop" data-action="close-popup" aria-hidden="false">
        <div class="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="deleteItemTitle">
          <div class="modal-header">
            <h3 id="deleteItemTitle">Remove Item?</h3>
            <button class="ghost-btn" type="button" data-action="close-popup">Close</button>
          </div>
          <p class="small-note">This will remove <strong>${escapeHTML(state.popup.itemTitle)}</strong> from your tracker.</p>
          <div class="modal-actions" style="margin-top: 0.9rem;">
            <button class="ghost-btn" type="button" data-action="close-popup">Cancel</button>
            <button class="action-btn danger" type="button" data-action="confirm-delete-item" data-id="${state.popup.itemId}">${icon("trash")} Remove</button>
          </div>
        </div>
      </section>
    `;
  }

  if (state.popup.type === "remove-categories") {
    const selectedIds = new Set(Array.isArray(state.popup.selectedIds) ? state.popup.selectedIds : []);
    const categoriesMarkup = state.categories.length === 0
      ? '<div class="empty-state">No categories available to remove.</div>'
      : `<div class="category-remove-list">${state.categories
        .map((category) => `
          <div class="category-remove-row">
            <label class="category-remove-toggle" for="remove-category-${category.id}">
              <span class="category-remove-name">${escapeHTML(category.name)}</span>
              <input
                class="category-remove-checkbox"
                id="remove-category-${category.id}"
                type="checkbox"
                data-action="toggle-category-select"
                data-id="${category.id}"
                ${selectedIds.has(category.id) ? "checked" : ""}
              />
            </label>
          </div>
        `)
        .join("")}
      </div>
      <div class="modal-actions" style="margin-top: 0.9rem;">
        <button class="ghost-btn" type="button" data-action="close-popup">Cancel</button>
        <button class="action-btn danger" type="button" data-action="open-confirm-delete-categories" ${selectedIds.size === 0 ? "disabled" : ""}>${icon("trash")} Delete Selected</button>
      </div>`;

    return `
      <section class="modal-backdrop" data-action="close-popup" aria-hidden="false">
        <div class="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="removeCategoryTitle">
          <div class="modal-header">
            <h3 id="removeCategoryTitle">Remove Categories</h3>
            <button class="ghost-btn" type="button" data-action="close-popup">Close</button>
          </div>
          ${categoriesMarkup}
        </div>
      </section>
    `;
  }

  if (state.popup.type === "confirm-delete-categories") {
    const selectedIds = Array.isArray(state.popup.selectedIds) ? state.popup.selectedIds : [];
    const selectedNames = state.categories
      .filter((category) => selectedIds.includes(category.id))
      .map((category) => category.name);

    return `
      <section class="modal-backdrop" data-action="close-popup" aria-hidden="false">
        <div class="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="confirmDeleteCategoriesTitle">
          <div class="modal-header">
            <h3 id="confirmDeleteCategoriesTitle">Confirm Category Deletion</h3>
            <button class="ghost-btn" type="button" data-action="back-to-remove-categories">Back</button>
          </div>
          <p class="small-note">You are about to remove ${selectedIds.length} categorie(s). This also deletes their items.</p>
          <div class="category-remove-list" style="margin-top: 0.7rem;">
            ${selectedNames.map((name) => `<div class="category-remove-row"><p class="category-remove-name">${escapeHTML(name)}</p></div>`).join("")}
          </div>
          <div class="modal-actions" style="margin-top: 0.9rem;">
            <button class="ghost-btn" type="button" data-action="back-to-remove-categories">Cancel</button>
            <button class="action-btn danger" type="button" data-action="confirm-delete-categories">${icon("trash")} Confirm Delete</button>
          </div>
        </div>
      </section>
    `;
  }

  return "";
}

function renderHome() {
  homeButton.hidden = true;

  const categories = state.categories
    .map(
      (category) => `
        <button class="category-card" type="button" data-action="open-category" data-id="${category.id}">
          <h3 class="category-name">${escapeHTML(category.name)}</h3>
        </button>
      `
    )
    .join("");

  viewEl.innerHTML = `
    <div class="home-layout">
      <section class="panel">
        <div class="panel-title-row">
          <h2>Categories</h2>
        </div>
        <div class="category-grid">
          ${categories}
        </div>
      </section>

      <section class="panel">
        <div class="home-action-row" style="margin-top: 0.8rem;">
          <button class="ghost-btn home-round-btn" type="button" data-action="toggle-home-add" aria-label="Add category" title="Add category">${icon("plus")}</button>
          <button class="ghost-btn danger home-round-btn" type="button" data-action="open-remove-categories" aria-label="Remove category" title="Remove category">${icon("trash")}</button>
        </div>

        ${state.homeAddCategoryOpen
          ? `<form id="addCategoryForm" class="form-row" style="margin-top: 0.8rem;">
              <div>
                <label for="categoryNameInput">Category name</label>
                <input id="categoryNameInput" name="categoryName" type="text" placeholder="e.g. Documentaries" maxlength="36" required />
              </div>
              <div class="actions-row">
                <button class="primary-btn" type="submit">${icon("plus")} Add Category</button>
              </div>
            </form>`
          : ""
        }

      </section>

      ${popupTemplate()}
    </div>
  `;
}

function renderCategoryPage() {
  const category = getCurrentCategory();
  if (!category) {
    renderHome();
    return;
  }

  homeButton.hidden = false;

  const { watchedItems, toWatchItems, starredItems } = getCategoryViewItems();

  viewEl.innerHTML = `
    <div class="category-layout">
      <section class="panel">
        <div class="panel-title-row">
          <div>
            <h2>${escapeHTML(category.name)}</h2>
          </div>
          <div class="top-corner-actions">
            <button class="plus-tab" type="button" data-action="open-add-item">${icon("plus")} New Item</button>
            <button class="ghost-btn" type="button" data-action="back-home">${icon("home")} Back</button>
          </div>
        </div>

        <div class="form-row" style="margin-top: 0.9rem;">
          <div>
            <label for="searchInput">Search titles</label>
            <input id="searchInput" name="search" type="text" placeholder="Type to filter watched and to watch" value="${escapeHTML(state.searchTerm)}" />
          </div>
          <div>
            <label>View</label>
            <div class="filter-row" role="group" aria-label="Filter list by status">
              ${filterButtonTemplate("all", "All")}
              ${filterButtonTemplate("to-watch", "To Watch")}
              ${filterButtonTemplate("watched", "Watched")}
            </div>
          </div>
        </div>
      </section>

      <section id="categoryContent" class="category-content">
        ${state.addItemDrawerOpen ? addItemDrawerTemplate() : ""}

        <section class="panel tile-panel">
          <div class="section-tiles">
            ${sectionTileTemplate("watchedSection", "Watched", watchedItems.length, "Completed items")}
            ${sectionTileTemplate("toWatchSection", "To Watch", toWatchItems.length, "Up next")}
            ${sectionTileTemplate("starredSection", "Starred", starredItems.length, "Special picks")}
          </div>
        </section>

        <section class="panel">
          <div class="panel-title-row">
            <h3>Search Results</h3>
          </div>
          <section id="categorySearchResults" class="list-columns search-results-wrap">
            ${categorySearchResultsTemplate()}
          </section>
        </section>
      </section>

      ${popupTemplate()}
    </div>
  `;
}

function renderCategorySearchResultsOnly() {
  if (state.currentCategoryId === null || state.activeSection !== null) {
    return;
  }

  const searchResultsEl = viewEl.querySelector("#categorySearchResults");
  if (!(searchResultsEl instanceof HTMLElement)) {
    return;
  }

  searchResultsEl.innerHTML = categorySearchResultsTemplate();
}

function renderCategorySectionPage(sectionKey) {
  const category = getCurrentCategory();
  if (!category) {
    renderHome();
    return;
  }

  const meta = sectionKeyToMeta(sectionKey);
  if (!meta) {
    navigateCategory(category.id);
    return;
  }

  homeButton.hidden = false;
  const { watchedItems, toWatchItems, starredItems } = getCategoryViewItems();
  const items = sectionKey === "watched"
    ? watchedItems
    : sectionKey === "to-watch"
      ? toWatchItems
      : starredItems;

  viewEl.innerHTML = `
    <div class="category-layout">
      <section class="panel">
        <div class="panel-title-row">
          <div>
            <h2>${escapeHTML(category.name)} • ${meta.title}</h2>
          </div>
          <div class="top-corner-actions">
            <button class="plus-tab" type="button" data-action="open-add-item">${icon("plus")} New Item</button>
            <button class="ghost-btn" type="button" data-action="back-category">Back to Category</button>
            <button class="ghost-btn" type="button" data-action="back-home">${icon("home")} Home</button>
          </div>
        </div>
      </section>

      ${state.addItemDrawerOpen ? addItemDrawerTemplate() : ""}

      <section class="list-columns">
        ${listSectionTemplate({ sectionId: meta.id, status: meta.status, title: meta.title, items, droppable: meta.droppable })}
      </section>

      ${popupTemplate()}
    </div>
  `;
}

function renderRoute() {
  document.body.classList.toggle("modal-open", Boolean(state.popup));

  if (state.currentCategoryId === null) {
    renderHome();
    return;
  }

  if (state.activeSection) {
    renderCategorySectionPage(state.activeSection);
    return;
  }

  renderCategoryPage();
}

async function loadCategories() {
  state.categories = await getCategories();
}

async function loadCurrentCategoryItems() {
  if (state.currentCategoryId === null) {
    state.items = [];
    return;
  }

  state.items = await getItemsByCategory(state.currentCategoryId);
}

async function handleHashRoute() {
  const hash = window.location.hash || "#/";

  if (!hash.startsWith("#/category/")) {
    state.currentCategoryId = null;
    state.activeSection = null;
    state.searchTerm = "";
    state.viewFilter = "all";
    state.homeAddCategoryOpen = false;
    state.homeRemoveCategoryOpen = false;
    state.addItemDrawerOpen = false;
    state.expandedItemId = null;
    state.popup = null;
    renderRoute();
    return;
  }

  const parts = hash.split("/");
  const maybeId = Number(parts[2]);

  if (!Number.isInteger(maybeId)) {
    navigateHome();
    return;
  }

  state.currentCategoryId = maybeId;
  const sectionKey = parts[3] || null;
  state.activeSection = ["watched", "to-watch", "starred"].includes(sectionKey) ? sectionKey : null;
  state.searchTerm = "";
  state.viewFilter = "all";
  state.homeAddCategoryOpen = false;
  state.homeRemoveCategoryOpen = false;
  state.addItemDrawerOpen = false;
  state.expandedItemId = null;
  state.popup = null;
  await loadCurrentCategoryItems();
  renderRoute();
}

async function refreshAndRenderCategory() {
  await loadCurrentCategoryItems();
  renderRoute();
}

function updateSelectedCategoryIds(categoryId, isChecked) {
  const selectedIds = new Set(Array.isArray(state.popup?.selectedIds) ? state.popup.selectedIds : []);

  if (isChecked) {
    selectedIds.add(categoryId);
  } else {
    selectedIds.delete(categoryId);
  }

  state.popup = {
    ...(state.popup || { type: "remove-categories" }),
    type: "remove-categories",
    selectedIds: [...selectedIds]
  };

  const deleteButton = viewEl.querySelector('[data-action="open-confirm-delete-categories"]');
  if (deleteButton instanceof HTMLButtonElement) {
    deleteButton.disabled = selectedIds.size === 0;
  }
}

async function onViewClick(event) {
  const trigger = event.target.closest("[data-action]");
  if (!trigger) {
    return;
  }

  const action = trigger.getAttribute("data-action");

  if (action === "open-category") {
    const id = Number(trigger.getAttribute("data-id"));
    navigateCategory(id);
    return;
  }

  if (action === "back-home") {
    navigateHome();
    return;
  }

  if (action === "back-category") {
    if (state.currentCategoryId !== null) {
      navigateCategory(state.currentCategoryId);
    }
    return;
  }

  if (action === "close-popup") {
    if (trigger.classList.contains("modal-backdrop") && trigger !== event.target) {
      return;
    }
    state.popup = null;
    renderRoute();
    return;
  }

  if (action === "open-add-item") {
    state.addItemDrawerOpen = true;
    renderRoute();
    return;
  }

  if (action === "toggle-home-add") {
    state.homeAddCategoryOpen = !state.homeAddCategoryOpen;
    if (state.homeAddCategoryOpen) {
      state.homeRemoveCategoryOpen = false;
    }
    renderRoute();
    return;
  }

  if (action === "toggle-home-remove") {
    state.homeRemoveCategoryOpen = !state.homeRemoveCategoryOpen;
    if (state.homeRemoveCategoryOpen) {
      state.homeAddCategoryOpen = false;
    }
    renderRoute();
    return;
  }

  if (action === "scroll-to-section") {
    const sectionId = trigger.getAttribute("data-section-id");
    if (!sectionId) {
      return;
    }

    const sectionKey = sectionIdToKey(sectionId);
    if (sectionKey && state.currentCategoryId !== null) {
      navigateCategorySection(state.currentCategoryId, sectionKey);
    }
    return;
  }

  if (action === "open-remove-categories") {
    state.popup = { type: "remove-categories", selectedIds: [] };
    renderRoute();
    return;
  }

  if (action === "open-confirm-delete-categories") {
    const selectedIds = Array.isArray(state.popup?.selectedIds) ? state.popup.selectedIds : [];
    if (selectedIds.length === 0) {
      showToast("Select at least one category.", "warning");
      return;
    }

    state.popup = {
      type: "confirm-delete-categories",
      selectedIds: [...selectedIds]
    };
    renderRoute();
    return;
  }

  if (action === "back-to-remove-categories") {
    const selectedIds = Array.isArray(state.popup?.selectedIds) ? state.popup.selectedIds : [];
    state.popup = {
      type: "remove-categories",
      selectedIds: [...selectedIds]
    };
    renderRoute();
    return;
  }

  if (action === "close-add-item") {
    state.addItemDrawerOpen = false;
    renderRoute();
    return;
  }

  if (action === "move-item") {
    const id = Number(trigger.getAttribute("data-id"));
    const nextStatus = trigger.getAttribute("data-next-status");

    await updateItemStatus(id, nextStatus);
    state.expandedItemId = null;
    await refreshAndRenderCategory();
    showToast(nextStatus === "watched" ? "Moved to Watched." : "Moved back to To Watch.", "success");
    return;
  }

  if (action === "toggle-star") {
    const id = Number(trigger.getAttribute("data-id"));
    const currentItem = state.items.find((item) => item.id === id);

    if (!currentItem) {
      showToast("Item not found.", "warning");
      return;
    }

    await updateItemStar(id, !currentItem.starred);
    await refreshAndRenderCategory();
    showToast(currentItem.starred ? "Item unstarred." : "Item starred.", "success");
    return;
  }

  if (action === "toggle-item") {
    const id = Number(trigger.getAttribute("data-id"));
    state.expandedItemId = state.expandedItemId === id ? null : id;
    renderRoute();
    return;
  }

  if (action === "set-filter") {
    const nextFilter = trigger.getAttribute("data-filter");
    if (["all", "to-watch", "watched"].includes(nextFilter)) {
      state.viewFilter = nextFilter;
      renderRoute();
    }
    return;
  }

  if (action === "edit-item") {
    const id = Number(trigger.getAttribute("data-id"));
    const currentItem = state.items.find((item) => item.id === id);

    if (!currentItem) {
      showToast("Item not found.", "warning");
      return;
    }

    state.popup = {
      type: "edit-item",
      item: {
        id: currentItem.id,
        title: currentItem.title,
        image: currentItem.image || ""
      }
    };
    renderRoute();
    return;
  }

  if (action === "delete-item") {
    const id = Number(trigger.getAttribute("data-id"));
    const currentItem = state.items.find((item) => item.id === id);
    if (!currentItem) {
      showToast("Item not found.", "warning");
      return;
    }

    state.popup = {
      type: "delete-item",
      itemId: id,
      itemTitle: currentItem.title
    };
    renderRoute();
    return;
  }

  if (action === "confirm-delete-item") {
    const id = Number(trigger.getAttribute("data-id"));
    await deleteItem(id);
    state.expandedItemId = null;
    state.popup = null;
    await refreshAndRenderCategory();
    showToast("Item removed.", "warning");
    return;
  }

  if (action === "confirm-delete-categories") {
    const selectedIds = Array.isArray(state.popup?.selectedIds) ? state.popup.selectedIds : [];

    if (selectedIds.length === 0) {
      showToast("Select at least one category.", "warning");
      return;
    }

    for (const categoryId of selectedIds) {
      await deleteCategory(categoryId);
    }

    await loadCategories();
    const removedCurrentCategory = selectedIds.includes(state.currentCategoryId);

    if (removedCurrentCategory) {
      state.currentCategoryId = null;
      state.activeSection = null;
      state.items = [];
      state.searchTerm = "";
      state.viewFilter = "all";
      state.addItemDrawerOpen = false;
      state.expandedItemId = null;
    }

    state.popup = null;

    if (removedCurrentCategory) {
      navigateHome();
    } else {
      renderRoute();
    }

    showToast("Selected categories removed.", "warning");
    return;
  }
}

async function onViewSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  if (form.id === "addCategoryForm") {
    event.preventDefault();
    const input = form.elements.namedItem("categoryName");
    const name = input?.value || "";

    try {
      await addCategory(name);
      await loadCategories();
      state.homeAddCategoryOpen = false;
      renderRoute();
      showToast("Category added.", "success");
      form.reset();
    } catch (error) {
      showToast(error.message || "Could not add category.", "warning");
    }
    return;
  }

  if (form.id === "addItemForm") {
    event.preventDefault();

    const title = form.elements.namedItem("title")?.value || "";
    const status = form.elements.namedItem("status")?.value || "to-watch";

    await addItem({
      categoryId: state.currentCategoryId,
      title,
      image: "",
      status
    });

    state.addItemDrawerOpen = false;
    state.expandedItemId = null;
    await refreshAndRenderCategory();
    showToast("Item added.", "success");
    form.reset();
    return;
  }

  if (form.id === "editItemForm") {
    event.preventDefault();

    const itemId = Number(form.getAttribute("data-item-id"));
    const title = form.elements.namedItem("title")?.value || "";

    await updateItemDetails(itemId, {
      title
    });

    state.popup = null;
    state.expandedItemId = itemId;
    await refreshAndRenderCategory();
    showToast("Item updated.", "success");
  }
}

function onViewInput(event) {
  const target = event.target;

  if (target instanceof HTMLInputElement && target.id === "searchInput") {
    state.searchTerm = target.value;
    renderCategorySearchResultsOnly();
  }
}

function onViewChange(event) {
  const target = event.target;

  if (
    target instanceof HTMLInputElement
    && target.getAttribute("data-action") === "toggle-category-select"
  ) {
    const id = Number(target.getAttribute("data-id"));
    updateSelectedCategoryIds(id, target.checked);
  }
}

function onViewMediaError(event) {
  const target = event.target;

  if (!(target instanceof HTMLImageElement) || !target.classList.contains("poster")) {
    return;
  }

  const fallback = document.createElement("div");
  fallback.className = "poster poster-fallback";
  fallback.setAttribute("aria-hidden", "true");
  fallback.textContent = (target.dataset.fallbackInitial || "?").toUpperCase();
  target.replaceWith(fallback);
}

function handleNativeBackAction() {
  if (state.popup) {
    state.popup = null;
    renderRoute();
    return true;
  }

  if (state.addItemDrawerOpen) {
    state.addItemDrawerOpen = false;
    renderRoute();
    return true;
  }

  if (state.expandedItemId !== null) {
    state.expandedItemId = null;
    renderRoute();
    return true;
  }

  const isCategoryRoute = window.location.hash.startsWith("#/category/");
  if (isCategoryRoute && state.currentCategoryId !== null && state.activeSection) {
    navigateCategory(state.currentCategoryId);
    return true;
  }

  if (isCategoryRoute || state.currentCategoryId !== null) {
    navigateHome();
    return true;
  }

  return false;
}

function wireMobileBackButton() {
  const appPlugin = window.Capacitor?.Plugins?.App;

  const onBack = () => {
    const handled = handleNativeBackAction();
    if (handled) {
      return;
    }

    if (typeof appPlugin?.exitApp === "function") {
      appPlugin.exitApp();
      return;
    }

    window.history.back();
  };

  if (appPlugin?.addListener) {
    appPlugin.addListener("backButton", onBack);
  }

  document.addEventListener("backbutton", (event) => {
    event.preventDefault();
    onBack();
  }, false);
}

function onDragStart(event) {
  const itemCard = event.target.closest("[data-draggable-item]");
  if (!itemCard || !event.dataTransfer) {
    return;
  }

  const itemId = itemCard.getAttribute("data-draggable-item");
  const currentStatus = itemCard.getAttribute("data-current-status");

  event.dataTransfer.setData("text/plain", JSON.stringify({ itemId, currentStatus }));
  event.dataTransfer.effectAllowed = "move";
}

function onDragOver(event) {
  const zone = event.target.closest(".list-dropzone");
  if (!zone) {
    return;
  }

  event.preventDefault();
  zone.classList.add("drag-over");
}

function onDragLeave(event) {
  const zone = event.target.closest(".list-dropzone");
  if (!zone) {
    return;
  }

  if (!zone.contains(event.relatedTarget)) {
    zone.classList.remove("drag-over");
  }
}

async function onDrop(event) {
  const zone = event.target.closest(".list-dropzone");
  if (!zone || !event.dataTransfer) {
    return;
  }

  event.preventDefault();
  zone.classList.remove("drag-over");

  const data = event.dataTransfer.getData("text/plain");
  if (!data) {
    return;
  }

  const payload = JSON.parse(data);
  const targetStatus = zone.getAttribute("data-drop-status");

  if (!payload?.itemId || payload.currentStatus === targetStatus) {
    return;
  }

  await updateItemStatus(Number(payload.itemId), targetStatus);
  await refreshAndRenderCategory();
  showToast(targetStatus === "watched" ? "Moved to Watched." : "Moved to To Watch.", "success");
}

function wireEvents() {
  homeButton.addEventListener("click", navigateHome);
  viewEl.addEventListener("click", (event) => {
    onViewClick(event).catch((error) => {
      showToast(error.message || "Action failed.", "warning");
    });
  });

  viewEl.addEventListener("submit", (event) => {
    onViewSubmit(event).catch((error) => {
      showToast(error.message || "Submit failed.", "warning");
    });
  });

  viewEl.addEventListener("input", onViewInput);
  viewEl.addEventListener("change", onViewChange);
  viewEl.addEventListener("error", onViewMediaError, true);
  viewEl.addEventListener("dragstart", onDragStart);
  viewEl.addEventListener("dragover", onDragOver);
  viewEl.addEventListener("dragleave", onDragLeave);
  viewEl.addEventListener("drop", (event) => {
    onDrop(event).catch((error) => {
      showToast(error.message || "Drop failed.", "warning");
    });
  });

  window.addEventListener("hashchange", () => {
    handleHashRoute().catch((error) => {
      showToast(error.message || "Route error.", "warning");
    });
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.popup) {
      state.popup = null;
      renderRoute();
    }
  });
}

async function boot() {
  await initDatabase();
  await loadCategories();
  wireEvents();
  wireMobileBackButton();
  setHeaderIconPlaceholders();

  if (!window.location.hash) {
    navigateHome();
    return;
  }

  await handleHashRoute();
}

boot().catch((error) => {
  viewEl.innerHTML = `<section class="panel"><h2>Something went wrong</h2><p class="small-note" style="margin-top: 0.5rem;">${escapeHTML(error.message || "Unknown error")}</p></section>`;
});
