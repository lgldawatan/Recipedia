import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { auth } from "./firebase";
import "bootstrap-icons/font/bootstrap-icons.css";
import { signOut } from "firebase/auth";
import "./Home.css";
import Logo2 from "./Assets/api logo.png";
import Logo1 from "./Assets/logo.png";

export default function Home({ user, savedRecipes, setSavedRecipes }) {
  /* ================================
     UI STATE / NAV HELPERS
     ================================ */
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const scrollLockY = useRef(0);

  /* Sign out + redirect to /signin */
  async function handleLogout() {
    await signOut(auth);
    navigate("/signin", { replace: true });
  }

  /* ================================
     DATA CONFIG
     ================================ */
  const API = "https://www.themealdb.com/api/json/v1/1";
  const CATEGORY = "Chicken";
  const LIMIT = 8;

  /* ================================
     DATA STATE
     ================================ */
  const [meals, setMeals] = useState([]);
  const [status, setStatus] = useState("idle"); // "idle" | "loading" | "success" | "error"
  const [showLoginWarn, setShowLoginWarn] = useState(false);
  const [detailMeal, setDetailMeal] = useState(null);
  const openMeal = (m) => {
    setDetailMeal(m);
    document.body.classList.add("rp-noscroll");
  };
  const closeMeal = () => {
    setDetailMeal(null);
    document.body.classList.remove("rp-noscroll");
  };

  /* Small utilities */
  const dotJoin = (...xs) => xs.filter(Boolean).join(" • ");

  /* Build short ingredient list (measure + ingredient) */
  function ingredientSummary(meal, take = 8) {
    const items = [];
    for (let i = 1; i <= 20; i++) {
      const ing = meal[`strIngredient${i}`];
      const meas = meal[`strMeasure${i}`];
      if (ing && ing.trim()) items.push(`${(meas || "").trim()} ${ing.trim()}`.trim());
    }
    return items.slice(0, take).join(", ");
  }

  /* Build ingredient items (with images) + split steps */
  function ingredientItems(m) {
    const out = [];
    for (let i = 1; i <= 20; i++) {
      const name = (m[`strIngredient${i}`] || "").trim();
      const measure = (m[`strMeasure${i}`] || "").trim();
      if (!name) continue;
      const slug = encodeURIComponent(name);
      out.push({
        name,
        measure,
        imgSmall: `https://www.themealdb.com/images/ingredients/${slug}-Small.png`,
        img2x: `https://www.themealdb.com/images/ingredients/${slug}.png`,
      });
    }
    return out;
  }
  function stepsFromText(txt = "") {
    return txt.split(/\r?\n+/).map((s) => s.trim()).filter(Boolean);
  }

  /* ================================
     BODY SCROLL-LOCK WHEN MODAL IS OPEN
     ================================ */
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

  /* ================================
     INITIAL LOAD: get featured meals
     ================================ */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      try {
        const listRes = await fetch(`${API}/filter.php?c=${encodeURIComponent(CATEGORY)}`);
        const list = await listRes.json();

        const base = (list.meals || []).slice(0, LIMIT);
        const detailJsons = await Promise.all(
          base.map((m) =>
            fetch(`${API}/lookup.php?i=${m.idMeal}`)
              .then((r) => r.json())
              .catch(() => null)
          )
        );
        const data = detailJsons.map((d) => d?.meals?.[0]).filter(Boolean);

        if (!cancelled) {
          setMeals(data);
          setStatus("success");
        }
      } catch {
        if (!cancelled) {
          setMeals([]);
          setStatus("error");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []); // run once

  /* ================================
     AUTH HELPERS
     ================================ */
  const isAuthed = Boolean(user && user.uid);
  const avatar = user?.photoURL || null;
  const displayName = user?.displayName || "Profile";

  /* Toggle favorites (requires auth) */
  const toggleFavorite = (meal) => {
    if (!isAuthed) {
      setShowLoginWarn(true);
      return;
    }
    setSavedRecipes((prev) => {
      const exists = prev.some((x) => x.idMeal === meal.idMeal);
      return exists ? prev.filter((x) => x.idMeal !== meal.idMeal) : [meal, ...prev];
    });
  };
  const isFav = (id) => savedRecipes?.some((x) => x.idMeal === id);

  /* Block /favorites route if not signed in */
  const handleFavoritesNav = (e) => {
    if (!isAuthed) {
      e.preventDefault();
      setShowLoginWarn(true);
    }
  };

  /* ================================
     RENDER
     ================================ */
  return (
    <>
      {/* ======================================================
          HEADER (brand + primary nav + profile dropdown)
          ====================================================== */}
      <header className="rp-header">
        <div className="rp-shell">
          {/* Brand / Logo */}
          <Link className="rp-brand" to="/">
            <img className="rp-logo-stack" src={Logo1} alt="Recipe Palette Logo" />
            <span className="rp-wordmark">
              recipe <br />
              palette.
            </span>
          </Link>

          <div className="rp-right">
            {/* Primary navigation */}
            <nav className="rp-nav">
              <NavLink to="/" end className={({ isActive }) => `rp-link ${isActive ? "rp-link--active" : ""}`}>
                Home
              </NavLink>
              <NavLink to="/about" className={({ isActive }) => `rp-link ${isActive ? "rp-link--active" : ""}`}>
                About
              </NavLink>
              <NavLink to="/recipes" className={({ isActive }) => `rp-link ${isActive ? "rp-link--active" : ""}`}>
                Recipes
              </NavLink>
              <NavLink to="/favorites" onClick={handleFavoritesNav} className={({ isActive }) => `rp-link ${isActive ? "rp-link--active" : ""}`}>
                Favorites
              </NavLink>
            </nav>

            {/* Profile button + dropdown (logout) */}
            <div className="rp-profile-wrap">
              <button
                type="button"
                className="rp-profile"
                onClick={() => {
                  if (!isAuthed) {
                    setShowLoginWarn(true);
                    return;
                  }
                  setOpen((o) => !o);
                }}
                aria-label={displayName}
                title={displayName}
              >
                {isAuthed && avatar ? <img className="rp-avatar" src={avatar} alt={displayName} /> : <i className="bi bi-person-circle" />}
              </button>

              {isAuthed && open && (
                <div className="rp-dropdown">
                  <button className="rp-dropdown-item" onClick={handleLogout}>
                    <i className="bi bi-box-arrow-right" /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ======================================================
          MAIN CONTENT
          ====================================================== */}
      <main className="page">
        <section className="hero">
          <div className="hero__bg"></div>

          <div className="hero__content">
            <h1>DISCOVER TASTE INSPIRATION</h1>
            <p className="lead">
              Explore a palette of recipes, discover vibrant flavors, and let your kitchen become the canvas for your culinary art. Turn everyday cooking
              into moments of creativity and delight.
            </p>
            <Link to="/recipes" className="btn-accent">
              Discover More
            </Link>
          </div>
        </section>

        {/* ---------- ABOUT SECTION (small card) ---------- */}
        <section className="about">
          <div className="about__bg"></div>
          <div className="about__card">
            <h2>About Us</h2>
            <p>
              At <strong>recipe palette.,</strong> we believe cooking is more than just making meals. It’s an art form. Like colors on a canvas, every
              ingredient adds depth, flavor, and creativity to your kitchen.
            </p>
            <Link to="/about" className="btn-about">
              Learn More
            </Link>
          </div>
        </section>

        {/* ---------- FEATURED RECIPES (Chicken x 8) ---------- */}
        <section className="recipes">
          <div className="recipes__bar">
            <h2 className="recipes__title">SMART RECIPES. TASTIER MEALS.</h2>
            <Link to="/recipes" className="btn-seeall">
              See All
            </Link>
          </div>

          <div className="recipes-grid" id="recipesGrid">
            {status === "loading" && <p style={{ color: "#888" }}>Loading recipes…</p>}
            {status === "error" && <p style={{ color: "#b00" }}>Failed to load recipes.</p>}

            {status === "success" &&
              meals.map((m) => {
                const meta = dotJoin(m.strCategory, m.strArea);
                const summary = ingredientSummary(m);
                return (
                  <article className="recipe-card" key={m.idMeal}>
                    <div className="recipe-card__imgwrap">
                      <img className="recipe-card__img" src={m.strMealThumb} alt={m.strMeal} />
                      <button
                        type="button"
                        className="recipe-card__overlay"
                        onClick={() => openMeal(m)}
                        aria-label={`View details for ${m.strMeal}`}
                      >
                        <span>View Details</span>
                      </button>

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

                    <div className="recipe-card__body">
                      <div className="recipe-card__meta">{meta}</div>
                      <h3 className="recipe-card__title">{m.strMeal}</h3>
                      <p className="recipe-card__desc">{summary}</p>
                    </div>
                  </article>
                );
              })}
          </div>
        </section>

        {/* ---------- CTA: SIGN IN TO SAVE FAVORITES ---------- */}
        <section className="cta-fav">
          <div className="cta-fav__bg"></div>
          <div className="cta-fav__card">
            <h3>Add to Favorites</h3>
            <p>
              Whether you’re trying something new or perfecting a family favorite,
              <strong> recipe palette.</strong> is your space to learn, create, and celebrate the joy of food. Sign up to save your favorite recipes and
              build your personal flavor palette.
            </p>

            {isAuthed ? (
              <button type="button" className="btn-cta is-disabled" disabled>
                Signed In
              </button>
            ) : (
              <Link to="/signin" className="btn-cta">
                Sign In
              </Link>
            )}
          </div>
        </section>
      </main>

      {/* ======================================================
          FOOTER
          ====================================================== */}
      <footer className="site-footer">
        <div className="footer-top">
          <p className="footer-tagline">
            Your Trusted Companion For Recipes That Inspire And Meals That Matter.
            <br />
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

      {/* ======================================================
          LOGIN-REQUIRED MODAL (for guests)
          ====================================================== */}
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

            <div className="rp-modal__head">
              <h3 id="needLogin">Sign in required</h3>
            </div>

            <div className="rp-modal__body">
              <p>Sign in first to open the Favorites page or save recipes.</p>
            </div>

            <div className="rp-modal__foot">
              <div className="rp-modal__actions">
                <button className="btn-plain" type="button" onClick={() => setShowLoginWarn(false)}>
                  Cancel
                </button>
                <Link className="btn-accent" to="/signin">
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========= HOME: RECIPE DETAILS MODAL ========= */}
      {detailMeal && (
        <div className="rp-modal is-open recipe-modal" aria-hidden="false" onClick={(e) => {
          if (e.target.classList.contains("rp-modal__scrim")) closeMeal();
        }}>
          <div className="rp-modal__scrim" />
          <div className="rp-modal__panel rp-modal--recipe recipe-modal--simple" role="dialog" aria-modal="true" aria-labelledby="hmTitle">
            <button className="rp-modal__close" aria-label="Close" onClick={closeMeal}>
              ×
            </button>

            <div className="rmodal__banner">
              <span>Learn About The Recipe</span>
            </div>

            <div className="rp-modal__body rmodal">
              <h3 id="hmTitle" className="rmodal__name">
                {detailMeal.strMeal}
              </h3>

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
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
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
                  {stepsFromText(detailMeal.strInstructions).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
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
    </>
  );
}
