import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../Components/Navbar";
import { ApiError, apiFetch } from "../lib/api";
import { getFoodImage } from "../lib/getFoodImage";
import { useAuth } from "../context/AuthContext";
import type { AuthUser } from "../context/AuthContext";

type MenuItem = { name: string; station?: string; dietary?: string[]; calories?: string | null };
type MenuSnapshot = { scrapedAt: string; url: string };
type MenuResponse = { snapshot: MenuSnapshot | null; items: (MenuItem & { itemOrder?: number })[] };
type MenuData = { scrapedAt: string; url: string; items: (MenuItem | string)[] };

function Home() {
  const [menu, setMenu] = useState<MenuData | null>(null);
  const [searchText, setSearchText] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const { session, updateUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    async function loadMenu() {
      try {
        const data = await apiFetch<MenuResponse>("/api/menu/latest");

        if (!active) {
          return;
        }

        if (data.snapshot) {
          setMenu({
            scrapedAt: data.snapshot.scrapedAt,
            url: data.snapshot.url,
            items: data.items,
          });
          return;
        }
      } catch {
        // Fall back to the checked-in JSON if Mongo has no snapshot yet.
      }

      try {
        const response = await fetch("/menu.json");
        const data = await response.json();

        if (active) {
          setMenu(data);
        }
      } catch {
        if (active) {
          setMenu(null);
        }
      }
    }

    loadMenu();

    return () => {
      active = false;
    };
  }, []);

  const scrapedAt = menu?.scrapedAt ?? null;
  const items: MenuItem[] = (menu?.items ?? []).map((item) =>
    typeof item === "string" ? { name: item } : item
  );

  const allDietary = [...new Set(items.flatMap((item) => item.dietary ?? []))].sort();
  const allStations = [...new Set(items.map((item) => item.station).filter((station): station is string => Boolean(station)))].sort();
  const favoriteNames = new Set(session?.user.favorites ?? []);

  function toggleFilter(label: string) {
    setActiveFilters((prev) =>
      prev.includes(label) ? prev.filter((filter) => filter !== label) : [...prev, label]
    );
  }

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchText.toLowerCase());
    const matchesFilters = activeFilters.every((filter) => item.dietary?.includes(filter) || item.station === filter);
    return matchesSearch && matchesFilters;
  });

  async function addFavorite(item: MenuItem) {
    if (!session) {
      navigate("/login");
      return;
    }

    try {
      const data = await apiFetch<{ user: AuthUser }>(
        "/api/favorites",
        {
            method: "POST",
            body: JSON.stringify({
              name: item.name,
              station: item.station ?? "",
              dietary: item.dietary ?? [],
            }),
          },
          session.token
      );

      updateUser(data.user);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Failed to save favorite";
      window.alert(message);
    }
  }

  async function removeFavorite(item: string) {
    if (!session) {
      navigate("/login");
      return;
    }

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
    }
  }

  return (
    <div className="page">
      <Navbar />

      <main className="home-container">
        <section className="hero-card hero-with-image">
          <div className="hero-content">
            <p className="small-title">Live College Dining Menu</p>
            <h1>Hamilton Dining Hall</h1>

            {!scrapedAt ? (
              <p className="muted">
                No data yet — run <code>npm run scrape</code> then refresh.
              </p>
            ) : (
              <p className="muted">
                Updated from the latest scraped dining hall data.
              </p>
            )}

            <div className="hero-actions">
              <a href="#menu" className="primary-action">
                View Menu
              </a>

              <Link to="/favorites" className="secondary-action">
                My Favorites
              </Link>
            </div>
          </div>

          <div className="hero-image-card">
            <img src="/college.jpg" alt="New College campus" />
          </div>

          <div className="hero-stats">
            <div className="stat-card">
              <span>{items.length}</span>
              <p>Total Items</p>
            </div>

            <div className="stat-card">
              <span>{filteredItems.length}</span>
              <p>Showing Now</p>
            </div>

            <div className="stat-card">
              <span>{scrapedAt ? "Live" : "Off"}</span>
              <p>Status</p>
            </div>
          </div>
        </section>

        {scrapedAt && (
          <section className="menu-section" id="menu">
            <div className="section-header">
              <div>
                <p className="section-label">Today’s Selection</p>
                <h2>Available Menu Items</h2>
                <p className="muted">
                  {items.length} items · scraped{" "}
                  {new Date(scrapedAt).toLocaleString()}
                </p>
              </div>

              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search menu item..."
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
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
                {allDietary.length > 0 && allStations.length > 0 && (
                  <div className="filter-divider" />
                )}
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
                  <button
                    className="filter-btn filter-clear"
                    onClick={() => setActiveFilters([])}
                  >
                    × Clear
                  </button>
                )}
              </div>
            )}

            {filteredItems.length > 0 ? (
              <div className="menu-grid">
                {filteredItems.map((item, index) => {
                  const isSaved = favoriteNames.has(item.name);

                  return (
                    <div className="menu-card" key={item.name}>
                      <div className="menu-card-top">
                        <span className="item-number">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="item-tag">{item.station ?? "Dining Item"}</span>
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
                          <button
                            className="favorite-btn"
                            onClick={() => addFavorite(item)}
                          >
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
        )}
      </main>
    </div>
  );
}

export default Home;
