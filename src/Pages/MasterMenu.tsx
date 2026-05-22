import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../Components/Navbar";
import { ApiError, apiFetch } from "../lib/api";
import { getFoodImage } from "../lib/getFoodImage";
import { useAuth } from "../context/AuthContext";
import type { AuthUser } from "../context/AuthContext";

type MasterItem = {
  name: string;
  station?: string;
  dietary?: string[];
  calories?: string | null;
};

function MasterMenu() {
  const [items, setItems] = useState<MasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const { session, updateUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch<{ items: MasterItem[] }>("/api/menu/master")
      .then((data) => setItems(data.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const allDietary = [...new Set(items.flatMap((item) => item.dietary ?? []))].sort();
  const allStations = [...new Set(items.map((item) => item.station).filter((s): s is string => Boolean(s)))].sort();
  const favoriteNames = new Set(session?.user.favorites ?? []);

  function toggleFilter(label: string) {
    setActiveFilters((prev) =>
      prev.includes(label) ? prev.filter((f) => f !== label) : [...prev, label]
    );
  }

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchText.toLowerCase());
    const matchesFilters = activeFilters.every(
      (f) => item.dietary?.includes(f) || item.station === f
    );
    return matchesSearch && matchesFilters;
  });

  async function addFavorite(item: MasterItem) {
    if (!session) { navigate("/login"); return; }
    try {
      const data = await apiFetch<{ user: AuthUser }>(
        "/api/favorites",
        { method: "POST", body: JSON.stringify({ name: item.name, station: item.station ?? "", dietary: item.dietary ?? [] }) },
        session.token
      );
      updateUser(data.user);
    } catch (error) {
      window.alert(error instanceof ApiError ? error.message : "Failed to save favorite");
    }
  }

  async function removeFavorite(name: string) {
    if (!session) { navigate("/login"); return; }
    try {
      const data = await apiFetch<{ user: AuthUser }>(
        `/api/favorites/${encodeURIComponent(name)}`,
        { method: "DELETE" },
        session.token
      );
      updateUser(data.user);
    } catch (error) {
      window.alert(error instanceof ApiError ? error.message : "Failed to remove favorite");
    }
  }

  return (
    <div className="page">
      <Navbar />

      <main className="home-container">
        <section className="hero-card">
          <div className="hero-content">
            <p className="small-title">All-Time Menu Archive</p>
            <h1>Master Menu</h1>
            <p className="muted">
              Every item ever served at Hamilton Dining Hall, built from daily scrapes.
            </p>
          </div>
        </section>

        <section className="menu-section">
          <div className="section-header">
            <div>
              <p className="section-label">Archive</p>
              <h2>All Menu Items</h2>
              <p className="muted">{items.length} unique items on record</p>
            </div>
            <div className="search-box">
              <input
                type="text"
                placeholder="Search items..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
          </div>

          {(allDietary.length > 0 || allStations.length > 0) && (
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
              <h3>Loading master menu</h3>
              <p>Fetching all known items…</p>
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="menu-grid">
              {filteredItems.map((item, index) => {
                const isSaved = favoriteNames.has(item.name);
                return (
                  <div className="menu-card" key={item.name}>
                    <div className="menu-card-top">
                      <span className="item-number">{String(index + 1).padStart(2, "0")}</span>
                      <span className="item-tag">{item.station ?? "Other"}</span>
                    </div>

                    <div className="food-image">
                      <img src={getFoodImage(item.name)} alt={item.name} />
                    </div>

                    <div>
                      <h3>{item.name}</h3>
                      <div className="card-meta">
                        {item.calories && <span className="calories">{item.calories}</span>}
                        {item.dietary && item.dietary.length > 0 && (
                          <div className="dietary-tags">
                            {item.dietary.map((label) => (
                              <span key={label} className="dietary-tag">{label}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="menu-card-bottom">
                      {session && isSaved ? (
                        <button
                          className="favorite-btn favorite-btn--saved"
                          onClick={() => removeFavorite(item.name)}
                        >
                          Remove Favorite
                        </button>
                      ) : (
                        <button className="favorite-btn" onClick={() => addFavorite(item)}>
                          {session ? "Add Favorite" : "Sign in to save"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No items match</h3>
              <p>{activeFilters.length > 0 ? "Try removing a filter." : "Try searching something else."}</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default MasterMenu;
