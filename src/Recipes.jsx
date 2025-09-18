import React, { useEffect, useRef, useState, useCallback } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { auth } from "./firebase";
import "bootstrap-icons/font/bootstrap-icons.css";
import { signOut } from "firebase/auth";
import "./Recipes.css";
import Logo1 from "./Assets/logo.png";
import Logo2 from "./Assets/api logo.png";
/**
 * Recipes Page
 * - Fetches recipes from TheMealDB
 * - Search by name/ingredient
 * - Filter by category & cuisine
 * - Pagination & favorites (requires sign-in)
 * - Profile dropdown & access guard modal
 */
export default function Recipes({ user, savedRecipes, setSavedRecipes }) {
  // ==============================
  // Constants / Config
  // ==============================
  const API = "https://www.themealdb.com/api/json/v1/1";
  const LABEL_ALL = "All Recipes";
  const PER_PAGE = 16;

  // ==============================
  // UI state
  // ==============================
  const [open, setOpen] = useState(false);           // profile dropdown open?
  const navigate = useNavigate();
  const scrollLockY = useRef(0);                     // remembers scroll position during modal lock

  // ==============================
  // Refs for measuring UI
  // ==============================
  const barRef = useRef(null);       // bar containing the breadcrumb text
  const crumbsRef = useRef(null);    // the breadcrumb element (for width calc)

  // ==============================
  // Data / Control state
  // ==============================
  const [crumbs, setCrumbs] = useState(LABEL_ALL);   // "All Recipes", "Search: x", or filter summary
  const [full, setFull] = useState([]);              // full current dataset (search result base)
  const [all, setAll] = useState([]);                // filtered + paginated source array
  const [page, setPage] = useState(1);               // current page number
  const [q, setQ] = useState("");                    // search query string
  const [status, setStatus] = useState("idle");      // "idle" | "loading" | "success" | "error"
  const [errMsg, setErrMsg] = useState("");          // error text when status === "error"

  // Filter modal controls and options
  const [isOpen, setIsOpen] = useState(false);       // filters modal open?
  const [categories, setCategories] = useState([]);  // list of category strings
  const [areas, setAreas] = useState([]);            // list of cuisine/area strings
  const [selCats, setSelCats] = useState(new Set()); // selected categories
  const [selAreas, setSelAreas] = useState(new Set());// selected areas

  // details modal
  const [detailMeal, setDetailMeal] = useState(null);
  const openMeal = (m) => { setDetailMeal(m); document.body.classList.add("rp-noscroll"); };
  const closeMeal = () => { setDetailMeal(null); document.body.classList.remove("rp-noscroll"); };

  // build full ingredients list (measure + ingredient)
  const listIngredients = (m) => {
    const out = [];
    for (let i = 1; i <= 20; i++) {
      const ing = m[`strIngredient${i}`];
      const mea = m[`strMeasure${i}`];
      if (ing && ing.trim()) out.push(`${(mea || "").trim()} ${ing.trim()}`.trim());
    }
    return out;
  };

  // split instructions into bullets
  const stepsFromText = (txt = "") =>
    txt
      .split(/\r?\n+/)           // split on new lines
      .map(s => s.trim())
      .filter(Boolean);


  // Login-required prompt modal
  const [showLoginWarn, setShowLoginWarn] = useState(false);

  // ==============================
  // Auth-derived helpers
  // ==============================
  const isAuthed = Boolean(user && user.uid);
  const avatar = user?.photoURL || null;
  const displayName = user?.displayName || "Profile";

  // ==============================
  // Small utilities
  // ==============================
  const j = useCallback(async (u) => (await fetch(u)).json(), []);      // fetch -> json
  const dotJoin = (...xs) => xs.filter(Boolean).join(" • ");            // join with bullets
  const ingredientSummary = (m, take = 8) => {                          // compose "measure ingredient" list
    const items = [];
    for (let i = 1; i <= 20; i++) {
      const ing = m[`strIngredient${i}`];
      const mea = m[`strMeasure${i}`];
      if (ing && ing.trim()) items.push(`${(mea || "").trim()} ${ing.trim()}`.trim());
    }
    return items.slice(0, take).join(", ");
  };

  // ==============================
  // Responsive UI: keep crumb bar underline sized to text
  // ==============================
  function updateCrumbsWidth() {
    if (barRef.current && crumbsRef.current) {
      barRef.current.style.setProperty("--crumbs-w", `${crumbsRef.current.offsetWidth}px`);
    }
  }
  useEffect(updateCrumbsWidth, [crumbs]);

  // ==============================
  // Body scroll lock when "login required" modal is shown
  // - Stores current scroll Y
  // - Applies fixed positioning via class & style
  // - Restores on cleanup
  // ==============================
  useEffect(() => {
    if (showLoginWarn) {
      // lock scroll
      scrollLockY.current = window.scrollY || 0;
      document.body.style.top = `-${scrollLockY.current}px`;
      document.body.classList.add("rp-noscroll");
    } else {
      // unlock scroll
      document.body.classList.remove("rp-noscroll");
      document.body.style.top = "";
      window.scrollTo(0, scrollLockY.current);
    }
    // cleanup if component unmounts while locked
    return () => {
      document.body.classList.remove("rp-noscroll");
      document.body.style.top = "";
    };
  }, [showLoginWarn]);

  // ==============================
  // Data loading
  // - loadAll(): fetches A-Z meals, de-dupes, sorts
  // - Effect: initial load + fetch lists for categories & areas
  // ==============================
  const loadAll = useCallback(async () => {
    setStatus("loading");
    setErrMsg("");
    try {
      const letters = "abcdefghijklmnopqrstuvwxyz".split("");
      const responses = await Promise.all(letters.map((l) => j(`${API}/search.php?f=${l}`)));
      // merge all results, drop nulls
      let results = [];
      for (const r of responses) if (r?.meals) results.push(...r.meals);

      // de-duplicate by idMeal and sort by meal name
      const seen = new Set();
      const unique = results
        .filter((m) => {
          if (!m?.idMeal || seen.has(m.idMeal)) return false;
          seen.add(m.idMeal);
          return true;
        })
        .sort((a, b) => a.strMeal.localeCompare(b.strMeal));

      // set data sources
      setFull(unique);
      setAll(unique);
      setCrumbs(LABEL_ALL);
      setPage(1);
      setStatus("success");
    } catch {
      setErrMsg("Failed to load recipes.");
      setFull([]); setAll([]);
      setStatus("error");
    }
  }, [API, LABEL_ALL, j]);

  useEffect(() => {
  (async () => {
    await loadAll();

    try {
      const cats = await j(`${API}/list.php?c=list`);
      setCategories((cats.meals || []).map(x => x.strCategory).sort());
    } catch {}

    try {
      const ars = await j(`${API}/list.php?a=list`);
      setAreas((ars.meals || []).map(x => x.strArea).sort());
    } catch {}
  })();
}, [loadAll, j]); // ⬅ add j here


  // ==============================
  // Searching helpers
  // - mergeMeals: unify results by id
  // - searchByName: /search.php?s=
  // - searchByIngredient: /filter.php?i= -> hydrate with /lookup.php?i=
  // - runSearch: performs both and merges
  // ==============================
  const mergeMeals = (...lists) => {
    const map = new Map();
    lists.flat().forEach((m) => { if (m?.idMeal) map.set(m.idMeal, m); });
    return Array.from(map.values()).sort((a, b) => a.strMeal.localeCompare(b.strMeal));
  };
  const searchByName = async (term) => {
    try { const r = await j(`${API}/search.php?s=${encodeURIComponent(term)}`); return r?.meals || []; }
    catch { return []; }
  };
  const searchByIngredient = async (term) => {
    try {
      const r = await j(`${API}/filter.php?i=${encodeURIComponent(term)}`);
      const ids = (r?.meals || []).map((m) => m.idMeal);
      if (!ids.length) return [];
      const detail = await Promise.all(ids.map((id) => j(`${API}/lookup.php?i=${id}`)));
      return detail.map((d) => d?.meals?.[0]).filter(Boolean);
    } catch { return []; }
  };
  const runSearch = async (term) => {
    const qq = term.trim();
    if (!qq) { await loadAll(); return; }
    setStatus("loading"); setErrMsg("");
    try {
      const [byName, byIng] = await Promise.all([searchByName(qq), searchByIngredient(qq)]);
      const merged = mergeMeals(byName, byIng);
      setFull(merged); setAll(merged);
      setCrumbs(`Search: ${qq}`); setPage(1);
      setStatus("success");
    } catch {
      setErrMsg("Search failed."); setFull([]); setAll([]); setStatus("error");
    }
  };

  // ==============================
  // Filtering helpers
  // - Build ID sets from category/area filters, intersect with current base
  // - Hydrate final details, then sort and render
  // ==============================
  const idsFromMeals = (meals) => (meals || []).map((m) => m.idMeal);
  const idsByCategories = async (set) => {
    if (!set.size) return null;
    const arr = Array.from(set);
    const res = await Promise.all(arr.map((c) => j(`${API}/filter.php?c=${encodeURIComponent(c)}`)));
    const out = new Set();
    res.forEach((r) => idsFromMeals(r.meals).forEach((id) => out.add(id)));
    return out;
  };
  const idsByAreas = async (set) => {
    if (!set.size) return null;
    const arr = Array.from(set);
    const res = await Promise.all(arr.map((a) => j(`${API}/filter.php?a=${encodeURIComponent(a)}`)));
    const out = new Set();
    res.forEach((r) => idsFromMeals(r.meals).forEach((id) => out.add(id)));
    return out;
  };
  const intersectSets = (a, b) => {
    if (!a && !b) return null;
    if (!a) return b;
    if (!b) return a;
    const out = new Set();
    for (const v of a) if (b.has(v)) out.add(v);
    return out;
  };

  // Apply selected filters (category + area) to current "full" base
  async function applyFilters(selCats, selAreas) {
    if (selCats.size === 0 && selAreas.size === 0) {
      // nothing selected → show everything in current base
      setAll(full.slice()); setPage(1);
      setCrumbs(q.trim() ? `Search: ${q.trim()}` : LABEL_ALL);
      setStatus("success");
      return;
    }
    setStatus("loading"); setErrMsg("");
    try {
      const [byC, byA] = await Promise.all([idsByCategories(selCats), idsByAreas(selAreas)]);
      let ids = intersectSets(byC, byA);

      // Intersect with current base (in case user filtered after search)
      const baseIds = new Set(full.map((m) => m.idMeal));
      ids = intersectSets(ids, baseIds);

      // If no matches, show empty state but keep crumb summary
      if (!ids || !ids.size) {
        setAll([]); setPage(1);
        const catTxt = selCats.size ? Array.from(selCats).join(", ") : "Any";
        const areaTxt = selAreas.size ? Array.from(selAreas).join(", ") : "Any";
        setCrumbs(`${catTxt} • ${areaTxt}`);
        setStatus("success");
        return;
      }

      // Hydrate minimal items back to full details
      const details = await Promise.all(Array.from(ids).map((id) => j(`${API}/lookup.php?i=${id}`)));
      const out = details
        .map((d) => d?.meals?.[0])
        .filter(Boolean)
        .sort((a, b) => a.strMeal.localeCompare(b.strMeal));

      setAll(out); setPage(1);
      const catTxt = selCats.size ? Array.from(selCats).join(", ") : "Any";
      const areaTxt = selAreas.size ? Array.from(selAreas).join(", ") : "Any";
      setCrumbs(`${catTxt} • ${areaTxt}`);
      setStatus("success");
    } catch {
      setErrMsg("Failed to apply filters."); setAll([]); setStatus("error");
    }
  }

  // ==============================
  // Pagination slice
  // ==============================
  const pages = Math.ceil(all.length / PER_PAGE) || 0;
  const start = (page - 1) * PER_PAGE;
  const slice = all.slice(start, start + PER_PAGE);

  // ==============================
  // Favorites: requires auth
  // - Toggle adds/removes from savedRecipes
  // - If unauthenticated, show login modal
  // ==============================
  const toggleFavorite = (meal) => {
    if (!isAuthed) { setShowLoginWarn(true); return; }
    setSavedRecipes((prev) => {
      const exists = prev.some((x) => x.idMeal === meal.idMeal);
      return exists ? prev.filter((x) => x.idMeal !== meal.idMeal) : [meal, ...prev];
    });
  };
  const isFav = (id) => savedRecipes?.some((x) => x.idMeal === id);

  // Block Favorites nav if not signed in
  const handleFavoritesNav = (e) => {
    if (!isAuthed) {
      e.preventDefault();
      setShowLoginWarn(true);
    }
  };

  // ==============================
  // Render
  // ==============================
  return (
    <>
      {/* ================= Header (brand + primary nav + profile) ================= */}
      <header className="rp-header">
        <div className="rp-shell">
          {/* Brand / Logo */}
          <Link className="rp-brand" to="/">
            <img className="rp-logo-stack" src={Logo1} alt="Recipe Palette Logo" />
            <span className="rp-wordmark">recipe <br />palette.</span>
          </Link>

          <div className="rp-right">
            {/* Primary nav links */}
            <nav className="rp-nav">
              <NavLink to="/" end className={({ isActive }) => `rp-link ${isActive ? "rp-link--active" : ""}`}>Home</NavLink>
              <NavLink to="/about" className={({ isActive }) => `rp-link ${isActive ? "rp-link--active" : ""}`}>About</NavLink>
              <NavLink to="/recipes" className={({ isActive }) => `rp-link ${isActive ? "rp-link--active" : ""}`}>Recipes</NavLink>
              <NavLink to="/favorites" onClick={handleFavoritesNav} className={({ isActive }) => `rp-link ${isActive ? "rp-link--active" : ""}`}>Favorites</NavLink>
            </nav>

            {/* Profile button + dropdown (logout) */}
            <div className="rp-profile-wrap">
              <button
                type="button"
                className="rp-profile"
                onClick={() => {
                  if (!isAuthed) { setShowLoginWarn(true); return; }
                  setOpen((o) => !o);
                }}
                aria-label={displayName}
                title={displayName}
              >
                {isAuthed && avatar ? (
                  <img className="rp-avatar" src={avatar} alt={displayName} />
                ) : (
                  <i className="bi bi-person-circle" />
                )}
              </button>

              {/* Dropdown panel */}
              {isAuthed && open && (
                <div className="rp-dropdown">
                  <button
                    className="rp-dropdown-item"
                    onClick={async () => {
                      // sign out then redirect to Sign In
                      await signOut(auth);
                      navigate("/signin", { replace: true });
                    }}
                  >
                    <i className="bi bi-box-arrow-right" /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ================= Main content ================= */}
      <main className="page recipes-page">
        {/* ---------- HERO: title + search + filter trigger ---------- */}
        <section className="hero-recipes">
          <div className="hero-wrap">
            <h1 className="hero-title">AUTHENTIC FLAVORS AND<br />CUISINES AT YOUR FINGERTIPS</h1>
            <p className="hero-sub">
              With hundreds of recipes ready to inspire your next meal. Bring people together with
              good food and explore our collection of smart recipes that make every day special.
            </p>

            {/* Search form (Enter submit) + Filter button (opens modal) */}
            <form className="hero-search" onSubmit={(e) => { e.preventDefault(); runSearch(q); }}>
              <div className="search-box">
                <i className="bi bi-search" aria-hidden="true"></i>
                <input
                  type="search"
                  name="q"
                  placeholder="Search by dish, ingredient, …"
                  value={q}
                  onChange={(e) => {
                    const v = e.target.value;
                    setQ(v);
                    // If cleared, reload full set
                    if (v.trim() === "") runSearch("");
                  }}
                />
              </div>

              <button
                type="button"
                className="filter-btn"
                onClick={() => { setIsOpen(true); document.body.classList.add("rp-noscroll"); }}
                aria-label="Open filters"
              >
                <i className="bi bi-sliders2-vertical" aria-hidden="true"></i>
              </button>
            </form>
          </div>
        </section>

        {/* ---------- LIST: crumbs + reload + cards + empty/error states + pager ---------- */}
        <section className="r-list">
          {/* Crumbs bar (shows current context) */}
          <div className="r-bar" ref={barRef}>
            <div className="r-crumbs" ref={crumbsRef}>{crumbs}</div>
            {/* Reload resets filters and query context */}
            <button
              className="reload-btn"
              aria-label="Reload recipes"
              onClick={async () => {
                setSelCats(new Set()); setSelAreas(new Set());
                await loadAll(); setCrumbs(LABEL_ALL);
              }}
            >
              <i className="bi bi-arrow-clockwise" />
            </button>
          </div>

          {/* Grid wrapper: shows loading, error, empty, or cards */}
          <div className={`r-grid ${status === "success" && slice.length === 0 ? "is-empty" : ""}`}>
            {/* Loading text */}
            {status === "loading" && <p style={{ color: "#777", textAlign: "center", width: "100%" }}>Loading recipes…</p>}

            {/* Error state */}
            {status === "error" && (
              <div className="r-empty">
                <i className="bi bi-emoji-frown r-empty__icon" aria-hidden="true"></i>
                <h3 className="r-empty__title">{errMsg || "Something went wrong"}</h3>
                <p className="r-empty__desc">Try reloading.</p>
              </div>
            )}

            {/* Empty state when no matches */}
            {status === "success" && slice.length === 0 && (
              <div className="r-empty">
                <i className="bi bi-emoji-frown r-empty__icon" aria-hidden="true"></i>
                <h3 className="r-empty__title">Nothing matches your filters</h3>
                <p className="r-empty__desc">Try exploring other categories or cuisine.</p>
              </div>
            )}

            {/* Cards list */}
            {status === "success" && slice.length > 0 && slice.map((m) => (
              <article className="r-card" key={m.idMeal}>
                <div className="r-card__imgwrap">
                  <img className="r-card__img" src={m.strMealThumb} alt={m.strMeal} />

                  {/* Hover overlay */}
                    <button
                      type="button"
                      className="r-card__overlay"
                      onClick={() => openMeal(m)}
                      aria-label={`View details for ${m.strMeal}`}
                    >
                      <span>View Details</span>
                    </button>
                  
                  {/* Favorite toggle (heart) */}
                  <button
                    type="button"
                    className={`r-like-btn ${isFav(m.idMeal) ? "is-active" : ""}`}
                    onClick={() => toggleFavorite(m)}
                    aria-label={isFav(m.idMeal) ? "Remove from favorites" : "Add to favorites"}
                    title={isFav(m.idMeal) ? "Unheart" : "Heart"}
                  >
                    <i className={`bi ${isFav(m.idMeal) ? "bi-heart-fill" : "bi-heart"} r-like`} aria-hidden="true"></i>
                  </button>
                </div>

                <div className="r-card__body">
                  <div className="r-meta">{dotJoin(m.strCategory, m.strArea)}</div>
                  <h3 className="r-title">{m.strMeal}</h3>
                  <p className="r-desc">{ingredientSummary(m)}</p>
                </div>
              </article>
            ))}
          </div>

          {/* Pagination controls */}
          {status === "success" && slice.length > 0 && pages > 1 && (
            <nav className="r-pager" aria-label="Recipe pagination">
              <button className="r-page icon" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>{"<"}</button>
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <button key={p} className={`r-page ${p === page ? "is-active" : ""}`} onClick={() => setPage(p)}>
                  {p}
                </button>
              ))}
              <button className="r-page icon" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages}>{">"}</button>
            </nav>
          )}
        </section>

        {/* ---------- FILTER MODAL ---------- */}
        {isOpen && (
          <div
            className="rp-modal is-open"
            aria-hidden="false"
            onClick={(e) => {
              // click scrim to close
              if (e.target.classList.contains("rp-modal__scrim")) {
                setIsOpen(false);
                document.body.classList.remove("rp-noscroll");
              }
            }}
          >
            <div className="rp-modal__scrim" />
            <div className="rp-modal__panel" role="dialog" aria-modal="true" aria-labelledby="fltTitle">
              <div className="rp-modal__head"><h3 id="fltTitle">Filters</h3></div>

              <div className="rp-modal__body">
                {/* Category chips */}
                <div className="rp-field">
                  <label className="rp-field__label">Category</label>
                  <div className="chip-list" aria-label="Categories">
                    {categories.map((c) => {
                      const checked = selCats.has(c);
                      return (
                        <label className="chip" key={c}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = new Set(selCats);
                              e.target.checked ? next.add(c) : next.delete(c);
                              setSelCats(next);
                            }}
                          />
                          <span>{c}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Cuisine/Area chips */}
                <div className="rp-field">
                  <label className="rp-field__label">Cuisine</label>
                  <div className="chip-list" aria-label="Cuisines">
                    {areas.map((a) => {
                      const checked = selAreas.has(a);
                      return (
                        <label className="chip" key={a}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = new Set(selAreas);
                              e.target.checked ? next.add(a) : next.delete(a);
                              setSelAreas(next);
                            }}
                          />
                          <span>{a}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal footer: clear/cancel/apply */}
              <div className="rp-modal__foot">
                <button
                  className={`btn-ghost ${selCats.size + selAreas.size > 0 ? "enabled" : ""}`}
                  type="button"
                  disabled={selCats.size + selAreas.size === 0}
                  onClick={() => { setSelCats(new Set()); setSelAreas(new Set()); setAll(full.slice()); setPage(1); }}
                >
                  Clear all (<span>{selCats.size + selAreas.size}</span>)
                </button>

                <div className="rp-modal__actions">
                  <button
                    className="btn-cancel"
                    type="button"
                    onClick={() => { setIsOpen(false); document.body.classList.remove("rp-noscroll"); }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-apply"
                    type="button"
                    onClick={async () => {
                      await applyFilters(selCats, selAreas);
                      setIsOpen(false);
                      document.body.classList.remove("rp-noscroll");
                    }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ================= Footer ================= */}
      <footer className="site-footer">
        <div className="footer-top">
          <p className="footer-tagline">
            Your Trusted Companion For Recipes That Inspire And Meals That Matter.<br />
            Because Every Dish Tells A Story. Cook, Share, And Enjoy With Recipe Palette.
          </p>
          <div className="footer-logos">
            <img src={Logo1} alt="Assets/logo.png" />
            <img src={Logo2} alt="Assets/api logo.png" />
          </div>
        </div>
        <div className="footer-bottom">
          <p>Copyright © 2025 Recipe Palette All Rights Reserved.</p>
        </div>
      </footer>

      {/* ================= Login required modal (blocks favorites & /favorites) ================= */}
      {showLoginWarn && (
        <div
          className="rp-modal is-open login-modal"
          aria-hidden="false"
          onClick={(e) => {
            if (e.target.classList.contains("rp-modal__scrim")) setShowLoginWarn(false);
          }}
        >
          <div className="rp-modal__scrim" />
          <div className="rp-modal__panel" role="dialog" aria-modal="true" aria-labelledby="needLogin">
            {/* Warning icon */}
            <div className="login-modal__icon" aria-hidden="true">
              <i className="bi bi-exclamation-circle" />
            </div>

            <div className="rp-modal__head"><h3 id="needLogin">Sign in required</h3></div>

            <div className="rp-modal__body">
              <p>Sign in first to open the Favorites page or save recipes.</p>
            </div>

            <div className="rp-modal__foot">
              <div className="rp-modal__actions">
                <button className="btn-plain" type="button" onClick={() => setShowLoginWarn(false)}>Cancel</button>
                <Link className="btn-accent" to="/signin">Sign in</Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========= RECIPE DETAILS MODAL ========= */}
      {detailMeal && (
        <div
          className="rp-modal is-open recipe-modal"
          aria-hidden="false"
          onClick={(e) => { if (e.target.classList.contains("rp-modal__scrim")) closeMeal(); }}
        >
          <div className="rp-modal__scrim" />
          <div className="rp-modal__panel rp-modal--recipe" role="dialog" aria-modal="true" aria-labelledby="rmTitle">
            <button className="rp-modal__close" aria-label="Close" onClick={closeMeal}>×</button>

            <div className="rp-modal__body rmodal">
              <h3 id="rmTitle" className="rmodal__name">{detailMeal.strMeal}</h3>

              <div className="rmodal__section">
                <h4>Ingredients</h4>
                <div className="rmodal__chips">
                  {listIngredients(detailMeal).map((x, i) => (
                    <span key={i} className="rmodal__chip">{x}</span>
                  ))}
                </div>
              </div>

              <div className="rmodal__section">
                <h4>Instructions</h4>
                <ul className="rmodal__steps">
                  {stepsFromText(detailMeal.strInstructions).map((s, i) => <li key={i}>{s}</li>)}
                </ul>

                {detailMeal.strYoutube && (
                  <a
                    className="rmodal__yt"
                    href={detailMeal.strYoutube}
                    target="_blank"
                    rel="noreferrer"
                  >
                    YouTube
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
