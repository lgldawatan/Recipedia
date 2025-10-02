import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { auth } from "./firebase";
import { signOut } from "firebase/auth";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./Favorites.css";
import "./index.css";
import Logo1 from "./Assets/logo.png";
import Logo2 from "./Assets/api.png";

export default function Favorites({ user, savedRecipes = [], setSavedRecipes }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showLoginWarn, setShowLoginWarn] = useState(false);
  const scrollLockY = useRef(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const isAuthed = Boolean(user?.uid);
  const avatar = user?.photoURL || null;
  const displayName = user?.displayName || "Profile";

  async function handleLogout() {
    await signOut(auth);
    navigate("/signin", { replace: true });
  }

  // Toggle favorite
  const isFav = (id) => savedRecipes?.some((x) => x.idMeal === id);
  const toggleFavorite = (meal) => {
    if (!isAuthed) { setShowLoginWarn(true); return; }
    setSavedRecipes((prev) => {
      const exists = prev.some((x) => x.idMeal === meal.idMeal);
      return exists ? prev.filter((x) => x.idMeal !== meal.idMeal) : [meal, ...prev];
    });
  };

  const [detailMeal, setDetailMeal] = useState(null);
  const openMeal = (m) => {
    setDetailMeal(m);
    document.body.classList.add("rp-noscroll");
  };
  const closeMeal = () => {
    setDetailMeal(null);
    document.body.classList.remove("rp-noscroll");
  };

  // Lock page scroll while modal is open
  useEffect(() => {
    if (showLoginWarn) {
      scrollLockY.current = window.scrollY || 0;
      document.body.style.top = `-${scrollLockY.current}px`;
      document.body.classList.add("rp-noscroll");
    } else {
      document.body.classList.remove("rp-noscroll");
      document.body.style.top = "";
      window.scrollTo(0, scrollLockY.current);
    }
    return () => {
      document.body.classList.remove("rp-noscroll");
      document.body.style.top = "";
    };
  }, [showLoginWarn]);

  // build ingredient objects for the modal
  function ingredientItems(m) {
    const out = [];
    for (let i = 1; i <= 20; i++) {
      const name = (m[`strIngredient${i}`] || "").trim();
      const measure = (m[`strMeasure${i}`] || "").trim();
      if (!name) continue;
      const slug = encodeURIComponent(name);
      out.push({
        name, measure,
        imgSmall: `https://www.themealdb.com/images/ingredients/${slug}-Small.png`,
        img2x: `https://www.themealdb.com/images/ingredients/${slug}.png`,
      });
    }
    return out;
  }
  function stepsFromText(txt = "") {
    return txt.split(/\r?\n+/).map(s => s.trim()).filter(Boolean);
  }


  return (
    <>
      {/* HEADER */}
      <header className="rp-header">
        <div className="rp-shell">
          {/* Brand / Logo */}
          <Link className="rp-brand" to="/" onClick={() => setMenuOpen(false)}>
            <img className="rp-logo-stack" src={Logo1} alt="Recipe Palette Logo" />
            <span className="rp-wordmark">recipe <br />palette.</span>
          </Link>

          <div className="rp-right">
            {/* Primary nav (desktop) */}
            <nav className="rp-nav">
              <NavLink to="/" end className={({ isActive }) => `rp-link ${isActive ? "rp-link--active" : ""}`}>Home</NavLink>
              <NavLink to="/about" className={({ isActive }) => `rp-link ${isActive ? "rp-link--active" : ""}`}>About</NavLink>
              <NavLink to="/recipes" className={({ isActive }) => `rp-link ${isActive ? "rp-link--active" : ""}`}>Recipes</NavLink>
              <NavLink to="/favorites" className={({ isActive }) => `rp-link ${isActive ? "rp-link--active" : ""}`}>Favorites</NavLink>
            </nav>

            {/* Profile + dropdown */}
            <div className="rp-profile-wrap">
              <button
                type="button"
                className="rp-profile"
                onClick={() => {
                  if (!isAuthed) { setShowLoginWarn(true); return; }
                  setOpen(o => !o);
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

              {isAuthed && open && (
                <div className="rp-dropdown">
                  <button className="rp-dropdown-item" onClick={async () => {
                    await signOut(auth);
                    navigate("/signin", { replace: true });
                  }}>
                    <i className="bi bi-box-arrow-right" /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Burger button (shown via CSS on small screens) */}
          <button
            type="button"
            className="rp-menu-btn"
            aria-label="Open menu"
            aria-controls="mobileMenu"
            aria-expanded={menuOpen ? "true" : "false"}
            onClick={() => setMenuOpen(v => !v)}
          >
            <i className="bi bi-list"></i>
          </button>
        </div>

        {/* Mobile panel*/}
        <div className={`mobile-panel ${menuOpen ? "is-open" : ""}`} id="mobileMenu" role="dialog" aria-modal="true">
          <div className="mobile-panel__head">
            <Link className="rp-brand" to="/" onClick={() => setMenuOpen(false)}>
              <img className="rp-logo-stack" src={Logo1} alt="Recipe Palette Logo" />
              <span className="rp-wordmark">recipe<br />palette.</span>
            </Link>
            <button type="button" className="mobile-panel__close" aria-label="Close menu" onClick={() => setMenuOpen(false)}>×</button>
          </div>

          <nav className="mobile-nav" aria-label="Mobile">
            <NavLink to="/" end onClick={() => setMenuOpen(false)}>Home</NavLink>
            <NavLink to="/about" onClick={() => setMenuOpen(false)}>About</NavLink>
            <NavLink to="/recipes" onClick={() => setMenuOpen(false)}>Recipes</NavLink>
            <NavLink to="/favorites" onClick={() => setMenuOpen(false)}>Favorites</NavLink>

            {!isAuthed ? (
              <NavLink to="/signin" className="mobile-nav__cta" onClick={() => setMenuOpen(false)}>Sign In</NavLink>
            ) : (
              <button
                className="mobile-nav__cta"
                onClick={async () => { setMenuOpen(false); await signOut(auth); navigate("/signin", { replace: true }); }}
              >
                Logout
              </button>
            )}
          </nav>
        </div>

        {/* Scrim behind the mobile panel */}
        <button
          className={`nav-overlay ${menuOpen ? "is-open" : ""}`}
          aria-hidden={!menuOpen}
          onClick={() => setMenuOpen(false)}
        />
      </header>


      {/* WRAPPER to push footer below the fold */}
      <div className="fav-wrap">
        <main className="page">
          <section className={`favorites ${savedRecipes.length ? "" : "is-empty"}`}>
            {savedRecipes.length === 0 ? (
              <div className="r-empty">
                <div className="r-empty__icon"><i className="bi bi-heart" /></div>
                <h3 className="r-empty__title">No favorites yet</h3>
                <p className="r-empty__desc">
                  Tap the heart icon to save recipes to Favorites. We’ll keep them here for quick access.
                </p>
                <Link to="/recipes" className="btn-accent">Explore Recipes</Link>
              </div>
            ) : (
              <div className="recipes-grid">
                {savedRecipes.map((m) => (
                  <article className="recipe-card" key={m.idMeal}>
                    <div className="recipe-card__imgwrap">
                      <img className="recipe-card__img" src={m.strMealThumb} alt={m.strMeal} />
                      <button
                        type="button"
                        className={`r-like-btn ${isFav(m.idMeal) ? "is-active" : ""}`}
                        onClick={() => toggleFavorite(m)}
                        aria-label={isFav(m.idMeal) ? "Remove from favorites" : "Add to favorites"}
                        title={isFav(m.idMeal) ? "Unheart" : "Heart"}
                      >
                        <i className={`bi ${isFav(m.idMeal) ? "bi-heart-fill" : "bi-heart"} r-like`} aria-hidden="true"></i>
                      </button>

                      <button
                        type="button"
                        className="recipe-card__overlay"
                        onClick={() => openMeal(m)}
                        aria-label={`View details for ${m.strMeal}`}
                      >
                        <span>View Details</span>
                      </button>

                    </div>
                    <div className="recipe-card__body">
                      <div className="recipe-card__meta">
                        {[m.strCategory, m.strArea].filter(Boolean).join(" • ")}
                      </div>
                      <h3 className="recipe-card__title">{m.strMeal}</h3>
                      <p className="recipe-card__desc">
                        {Array.from({ length: 20 }, (_, i) => {
                          const ing = m[`strIngredient${i + 1}`];
                          const meas = m[`strMeasure${i + 1}`];
                          return ing && ing.trim() ? `${(meas || "").trim()} ${ing.trim()}`.trim() : null;
                        }).filter(Boolean).slice(0, 12).join(", ")}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>

        {/* FOOTER */}
        <footer className="site-footer">
          <div className="footer-top">
            <p className="footer-tagline">
              Your Trusted Companion For Recipes That Inspire And Meals That Matter.
              <br />
              Because Every Dish Tells A Story. Cook, Share, And Enjoy With Recipe Palette.
            </p>
            <div className="footer-logos">
              <img src={Logo1} alt="Assets/logo.png" />
              <img src={Logo2} alt="Assets/api.png" />
            </div>
          </div>
          <div className="footer-bottom">
            <p>Copyright © 2025 Recipe Palette All Rights Reserved.</p>
          </div>
        </footer>
      </div>
      {/* ========= FAVORITES: RECIPE DETAILS MODAL ========= */}
      {detailMeal && (
        <div
          className="rp-modal is-open recipe-modal"
          aria-hidden="false"
          onClick={(e) => {
            if (e.target.classList.contains("rp-modal__scrim")) closeMeal();
          }}
        >
          <div className="rp-modal__scrim" />
          <div className="rp-modal__panel rp-modal--recipe recipe-modal--simple" role="dialog" aria-modal="true" aria-labelledby="favTitle">
            <button className="rp-modal__close" aria-label="Close" onClick={closeMeal}>×</button>

            <div className="rmodal__banner">
              <span>Learn About The Recipe</span>
            </div>

            <div className="rp-modal__body rmodal">
              <h3 id="favTitle" className="rmodal__name">{detailMeal.strMeal}</h3>

              <div className="rmodal__section">
                <h4 className="rmodal__label">Ingredients</h4>
                <div className="rmodal__chips rmodal__chips--grid">
                  {ingredientItems(detailMeal).map((it, i) => (
                    <figure key={i} className="ing ing--card">
                      <img
                        src={it.imgSmall}
                        srcSet={`${it.imgSmall} 1x, ${it.img2x} 2x`}
                        alt={it.name}
                        loading="lazy"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                      <figcaption>
                        <strong className="ing__name">{it.name}</strong>
                        {it.measure && <span className="ing__measure">{it.measure}</span>}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>

              <div className="rmodal__section">
                <h4 className="rmodal__label">Instructions</h4>
                <ul className="rmodal__steps">
                  {stepsFromText(detailMeal.strInstructions).map((s, i) => <li key={i}>{s}</li>)}
                </ul>

                {detailMeal.strYoutube && (
                  <a className="rmodal__yt rmodal__yt--solo" href={detailMeal.strYoutube} target="_blank" rel="noreferrer">
                    Youtube
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Login required modal */}
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
    </>
  );
}
