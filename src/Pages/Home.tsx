import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../Components/Navbar";

type MenuItem = { name: string; station?: string; dietary?: string[] };
type MenuData = { scrapedAt: string; url: string; items: (MenuItem | string)[] };

function Home() {
  const [menu, setMenu] = useState<MenuData | null>(null);
  const [searchText, setSearchText] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  useEffect(() => {
    fetch("/menu.json")
      .then(r => r.json())
      .then(setMenu)
      .catch(() => setMenu(null));
  }, []);

  const scrapedAt = menu?.scrapedAt ?? null;
  const items: MenuItem[] = (menu?.items ?? []).map(i =>
    typeof i === "string" ? { name: i } : i
  );

  const allDietary = [...new Set(items.flatMap(i => i.dietary ?? []))].sort();
  const allStations = [...new Set(items.map(i => i.station).filter((s): s is string => Boolean(s)))].sort();

  function toggleFilter(label: string) {
    setActiveFilters(prev =>
      prev.includes(label) ? prev.filter(f => f !== label) : [...prev, label]
    );
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchText.toLowerCase());
    const matchesFilters = activeFilters.every(f =>
      item.dietary?.includes(f) || item.station === f
    );
    return matchesSearch && matchesFilters;
  });

  function getFoodImage(item: string): string {
    const name = item.toLowerCase();

    if (name.includes("pizza")) return "/food/pizza.jpg";
    if (name.includes("seasoned chicken")) return "/food/chicken.jpg";
    if (name.includes("diced")) return "/food/dicedchicken.jpg";
    if (name.includes("turkey")) return "/food/turkey.jpg";
    if (name.includes("fish")) return "/food/fish.jpg";
    if (name.includes("tuna")) return "/food/tuna.jpg";
    if (name.includes("clam")) return "/food/clam.jpg";
    if (name.includes("burger") || name.includes("hamburger") || name.includes("sandwich")) return "/food/burger.jpg";

    if (
      name.includes("salad") ||
      name.includes("lettuce") ||
      name.includes("spinach") ||
      name.includes("cucumber")
    ) {
      return "/food/salad.jpg";
    }

    if (name.includes("cookie") || name.includes("cake")) return "/food/dessert.jpg";
    if (name.includes("soup") || name.includes("stew") || name.includes("chowder")) return "/food/soup.jpg";
    if (name.includes("rice")) return "/food/rice.jpg";
    if (name.includes("beans")) return "/food/beans.jpg";
    if (name.includes("noodles")) return "/food/noodles.jpg";
    if (name.includes("cheese") || name.includes("feta")) return "/food/cheese.jpg";

    if (
      name.includes("tomato") ||
      name.includes("zucchini") ||
      name.includes("carrot") ||
      name.includes("cauliflower") ||
      name.includes("beets") ||
      name.includes("peppers")
    ) {
      return "/food/veggie.jpg";
    }

    if (name.includes("fries") || name.includes("tater")) return "/food/fries.jpg";
    if (name.includes("hummus") || name.includes("naan")) return "/food/naan.jpg";
    if (name.includes("dressing")) return "/food/dressings.jpg";
    if (name.includes("vinaigrette")) return "/food/vinaigrette.jpg";

    return "/food/default.jpg";
  }

  function addFavorite(item: string) {
    const oldFavorites = JSON.parse(
      localStorage.getItem("favorites") || "[]"
    );

    if (oldFavorites.includes(item)) {
      alert("This item is already in favorites.");
      return;
    }

    const newFavorites = [...oldFavorites, item];
    localStorage.setItem("favorites", JSON.stringify(newFavorites));
    alert("Added to favorites!");
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

              <Link to="/Favorites" className="secondary-action">
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
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
            </div>

            {(allDietary.length > 0 || allStations.length > 0) && (
              <div className="filter-bar">
                {allDietary.map(label => (
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
                {allStations.map(label => (
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
                {filteredItems.map((item, i) => (
                  <div className="menu-card" key={item.name}>
                    <div className="menu-card-top">
                      <span className="item-number">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="item-tag">{item.station ?? "Dining Item"}</span>
                    </div>

                    <div className="food-image">
                      <img src={getFoodImage(item.name)} alt={item.name} />
                    </div>

                    <div>
                      <h3>{item.name}</h3>
                      {item.dietary && item.dietary.length > 0 && (
                        <div className="dietary-tags">
                          {item.dietary.map(label => (
                            <span key={label} className="dietary-tag">{label}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="menu-card-bottom">
                      <button
                        className="favorite-btn"
                        onClick={() => addFavorite(item.name)}
                      >
                        Add Favorite
                      </button>
                    </div>
                  </div>
                ))}
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