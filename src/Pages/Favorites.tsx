import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../Components/Navbar";
import { ApiError, apiFetch } from "../lib/api";
import { getFoodImage } from "../lib/getFoodImage";
import { useAuth } from "../context/AuthContext";
import type { AuthUser } from "../context/AuthContext";

type FavoriteItem = {
  name: string;
  station?: string;
  dietary?: string[];
};

function Favorites() {
  const { session, loading: authLoading, updateUser } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [favLoading, setFavLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  useEffect(() => {
    if (!session) { setFavLoading(false); return; }
    setFavLoading(true);
    apiFetch<{ favorites: FavoriteItem[] }>("/api/favorites", {}, session.token)
      .then((data) => setFavorites(data.favorites))
      .catch(() => setFavorites([]))
      .finally(() => setFavLoading(false));
  }, [session?.token]);

  const allDietary = [...new Set(favorites.flatMap((f) => f.dietary ?? []))].sort();
  const allStations = [...new Set(favorites.map((f) => f.station).filter((s): s is string => Boolean(s)))].sort();

  function toggleFilter(label: string) {
    setActiveFilters((prev) =>
      prev.includes(label) ? prev.filter((f) => f !== label) : [...prev, label]
    );
  }

  const filteredFavorites = favorites.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchText.toLowerCase());
    const matchesFilters = activeFilters.every(
      (f) => item.dietary?.includes(f) || item.station === f
    );
    return matchesSearch && matchesFilters;
  });

  async function removeFavorite(name: string) {
    if (!session) return;
    setRemoving(name);
    try {
      const data = await apiFetch<{ user: AuthUser }>(
        `/api/favorites/${encodeURIComponent(name)}`,
        { method: "DELETE" },
        session.token
      );
      setFavorites((prev) => prev.filter((f) => f.name !== name));
      updateUser(data.user);
    } catch (error) {
      window.alert(error instanceof ApiError ? error.message : "Failed to remove favorite");
    } finally {
      setRemoving(null);
    }
  }

  async function clearFavorites() {
    if (!session) return;
    try {
      const data = await apiFetch<{ user: AuthUser }>(
        "/api/favorites",
        { method: "DELETE" },
        session.token
      );
      setFavorites([]);
      updateUser(data.user);
    } catch (error) {
      window.alert(error instanceof ApiError ? error.message : "Failed to clear favorites");
    }
  }

  const loading = authLoading || favLoading;

  return (
    <div className="page">
      <Navbar />

      <main className="home-container">
        <section className="hero-card">
          <div>
            <p className="small-title">Saved Menu Items</p>
            <h1>Favorites</h1>
            <p className="muted">
              Dining hall items saved to your account.
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
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Search favorites..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                </div>
                <button className="clear-btn" onClick={clearFavorites}>
                  Clear All
                </button>
              </div>
            )}
          </div>

          {session && favorites.length > 0 && (allDietary.length > 0 || allStations.length > 0) && (
            <div className="filter-bar">
              {allDietary.map((label) => (
                <button
                  key={label}
                  className={`filter-btn${activeFilters.includes(label) ? " active" : ""}`}
                  onClick={() => toggleFilter(label)}
                >
                  {label}
                </button>
              ))}
              {allDietary.length > 0 && allStations.length > 0 && <div className="filter-divider" />}
              {allStations.map((label) => (
                <button
                  key={label}
                  className={`filter-btn${activeFilters.includes(label) ? " active" : ""}`}
                  onClick={() => toggleFilter(label)}
                >
                  {label}
                </button>
              ))}
              {activeFilters.length > 0 && (
                <button className="filter-btn filter-clear" onClick={() => setActiveFilters([])}>
                  × Clear
                </button>
              )}
            </div>
          )}

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
                <Link to="/login" className="primary-action">Sign in</Link>
                <Link to="/signup" className="secondary-action">Create account</Link>
              </div>
            </div>
          ) : filteredFavorites.length > 0 ? (
            <div className="menu-grid">
              {filteredFavorites.map((item, index) => (
                <div className="menu-card" key={item.name}>
                  <div className="menu-card-top">
                    <span className="item-number">{String(index + 1).padStart(2, "0")}</span>
                    <span className="item-tag">{item.station ?? "Favorite"}</span>
                  </div>

                  <div className="food-image">
                    <img src={getFoodImage(item.name)} alt={item.name} />
                  </div>

                  <div>
                    <h3>{item.name}</h3>
                    {item.dietary && item.dietary.length > 0 && (
                      <div className="card-meta">
                        <div className="dietary-tags">
                          {item.dietary.map((label) => (
                            <span key={label} className="dietary-tag">{label}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="menu-card-bottom">
                    <button
                      className="favorite-btn"
                      onClick={() => removeFavorite(item.name)}
                      disabled={removing === item.name}
                    >
                      {removing === item.name ? "Removing..." : "Remove"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : favorites.length > 0 ? (
            <div className="empty-state">
              <h3>No items match</h3>
              <p>{activeFilters.length > 0 ? "Try removing a filter." : "Try searching something else."}</p>
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
