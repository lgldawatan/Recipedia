
import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";
import "bootstrap-icons/font/bootstrap-icons.css";

import "./About.css";
import brandLogo from "./Assets/logo.png";

export default function About({ user }) {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [showLoginWarn, setShowLoginWarn] = useState(false);

    const scrollLockY = useRef(0);

    const isAuthed = Boolean(user?.uid);
    const avatar = user?.photoURL || null;
    const displayName = user?.displayName || "Profile";

    async function handleLogout() {
        await signOut(auth);
        navigate("/signin", { replace: true });
    }

    // Guard Favorites nav when logged out
    const handleFavoritesNav = (e) => {
        if (!isAuthed) {
            e.preventDefault();
            setShowLoginWarn(true);
        }
    };

    // Freeze background scroll while modal is open
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

    return (
        <>
            {/* Header */}
            <header className="rp-header">
                <div className="rp-shell">
                    <Link className="rp-brand" to="/">
                        <img className="rp-logo-stack" src={brandLogo} alt="Recipe Palette Logo" />
                        <span className="rp-wordmark">recipe <br />palette.</span>
                    </Link>

                    <div className="rp-right">
                        <nav className="rp-nav">
                            <NavLink to="/" end className={({ isActive }) => `rp-link ${isActive ? "rp-link--active" : ""}`}>Home</NavLink>
                            <NavLink to="/about" className={({ isActive }) => `rp-link ${isActive ? "rp-link--active" : ""}`}>About</NavLink>
                            <NavLink to="/recipes" className={({ isActive }) => `rp-link ${isActive ? "rp-link--active" : ""}`}>Recipes</NavLink>
                            <NavLink
                                to="/favorites"
                                onClick={handleFavoritesNav}
                                className={({ isActive }) => `rp-link ${isActive ? "rp-link--active" : ""}`}
                            >
                                Favorites
                            </NavLink>
                        </nav>

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

            {/* Empty page body; footer stays below the fold via CSS */}
            <div className="about-wrap">
                <main className="page about-main">
                    <section className="about-page" />
                </main>

                <footer className="site-footer">
                    <div className="footer-top">
                        <p className="footer-tagline">
                            Your Trusted Companion For Recipes That Inspire And Meals That Matter.<br />
                            Because Every Dish Tells A Story. Cook, Share, And Enjoy With Recipe Palette.
                        </p>
                        <div className="footer-logos">
                            <img src={brandLogo} alt="logo" />
                            <img src={brandLogo} alt="logo" />
                        </div>
                    </div>
                    <div className="footer-bottom">
                        <p>Copyright © 2025 Recipe Palette All Rights Reserved.</p>
                    </div>
                </footer>
            </div>

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
