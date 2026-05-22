import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../Components/Navbar";
import { ApiError, apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { AuthUser } from "../context/AuthContext";

function Favorites() {
  const { session, loading, updateUser } = useAuth();
  const [removing, setRemoving] = useState<string | null>(null);

  const favorites = session?.user.favorites ?? [];

  async function removeFavorite(item: string) {
    if (!session) {
      return;
    }

    setRemoving(item);

    try {
      const data = await apiFetch<{ user: AuthUser }>(
        `/api/favorites/${encodeURIComponent(item)}`,
        { method: "DELETE" },
        session.token
      );

      updateUser(data.user);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Failed to remove favorite";
      window.alert(message);
    } finally {
      setRemoving(null);
    }
  }

  async function clearFavorites() {
    if (!session) {
      return;
    }

    try {
      const data = await apiFetch<{ user: AuthUser }>(
        "/api/favorites",
        { method: "DELETE" },
        session.token
      );

      updateUser(data.user);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Failed to clear favorites";
      window.alert(message);
    }
  }

  return (
    <div className="page">
      <Navbar />

      <main className="home-container">
        <section className="hero-card">
          <div>
            <p className="small-title">Saved Menu Items</p>
            <h1>Favorites</h1>
            <p className="muted">
              These are the dining hall items saved on your account.
            </p>
          </div>
        </section>

        <section className="menu-section">
          <div className="section-header">
            <div>
              <p className="section-label">My List</p>
              <h2>Favorite Items</h2>
              <p className="muted">{favorites.length} saved items</p>
            </div>

            {session && favorites.length > 0 && (
              <button className="clear-btn" onClick={clearFavorites}>
                Clear All
              </button>
            )}
          </div>

          {loading ? (
            <div className="empty-state">
              <h3>Loading favorites</h3>
              <p>Checking your account.</p>
            </div>
          ) : !session ? (
            <div className="empty-state">
              <h3>Sign in to see your favorites</h3>
              <p>
                Your saved dining items are stored on your account, so they follow you
                across devices.
              </p>
              <div className="empty-state-actions">
                <Link to="/login" className="primary-action">
                  Sign in
                </Link>
                <Link to="/signup" className="secondary-action">
                  Create account
                </Link>
              </div>
            </div>
          ) : favorites.length > 0 ? (
            <div className="menu-grid">
              {favorites.map((item, index) => (
                <div className="menu-card" key={item}>
                  <div className="menu-card-top">
                    <span className="item-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="item-tag">Favorite</span>
                  </div>

                  <h3>{item}</h3>

                  <div className="menu-card-bottom">
                    <button
                      className="favorite-btn"
                      onClick={() => removeFavorite(item)}
                      disabled={removing === item}
                    >
                      {removing === item ? "Removing..." : "Remove"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No favorites yet</h3>
              <p>Go to the menu and add items to your account.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Favorites;
