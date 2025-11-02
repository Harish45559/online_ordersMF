import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "../styles/Menu.css";

/* ---------- helpers ---------- */
const slugify = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .replace(/--+/g, "-");

const getImgSrc = (item) => {
  const url = item?.imageUrl || item?.image || item?.img;
  if (url) return /^https?:\/\//i.test(url) ? url : process.env.PUBLIC_URL + url;
  return process.env.PUBLIC_URL + `/images/menu/${slugify(item?.name)}.jpg`;
};

/* ---------- extra helpers (UI & status) ---------- */
const getVegStatus = (item) => {
  const t = (item?.type || item?.foodType || item?.categoryType || "").toString().toLowerCase();
  const vegFlag = item?.isVeg ?? item?.veg ?? item?.isVegetarian ?? item?.vegetarian;
  const nonVegFlag = item?.isNonVeg ?? item?.nonVeg ?? item?.non_veg ?? item?.nonVegetarian;
  if (vegFlag === true) return "veg";
  if (nonVegFlag === true) return "nonveg";
  if (t === "veg" || t === "vegetarian") return "veg";
  if (t === "nonveg" || t === "non-veg" || t === "non vegetarian" || t === "egg") return "nonveg";
  const text = `${item?.name || ""} ${item?.description || item?.desc || ""}`.toLowerCase();
  const nonVegWords = ["chicken", "egg", "mutton", "fish", "prawn", "beef", "lamb"];
  if (nonVegWords.some((w) => text.includes(w))) return "nonveg";
  return "veg";
};

const norm = (s) => String(s || "").toLowerCase().trim();

const VegBadge = ({ item }) => {
  const st = getVegStatus(item);
  const dotStyle = {
    display: "inline-block",
    width: 10,
    height: 10,
    borderRadius: "50%",
    marginRight: 8,
    backgroundColor: st === "nonveg" ? "#d32f2f" : "#2e7d32",
  };
  return <span title={st === "nonveg" ? "Non-Veg" : "Veg"} style={dotStyle} />;
};

const pickItemCatId = (item) => {
  const cand =
    item?.categoryId ??
    item?.category_id ??
    item?.category?.id ??
    item?.category;
  return cand == null ? "" : String(cand);
};

/* Accept many shapes from the API */
const parseCategories = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.categories)) return data.categories;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.rows)) return data.rows;
  return [];
};
const parseItems = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.items?.rows)) return data.items.rows;
  return [];
};

export default function Menu() {
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [activeCat, setActiveCat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showCatPicker, setShowCatPicker] = useState(false); // ☰ dropdown below ribbon

  // cart
  const [cart, setCart] = useState([]);
  const navigate = useNavigate();

  const ribbonRef = useRef(null);
  const observerRef = useRef(null);
  const pickerRef = useRef(null);
  const ribbonWrapRef = useRef(null);

  const [orderNotes, setOrderNotes] = useState(
  () => localStorage.getItem("orderNotes") || ""
);
useEffect(() => {
  localStorage.setItem("orderNotes", orderNotes);
}, [orderNotes]);

  // Close category dropdown when clicking outside or pressing Esc
  useEffect(() => {
    if (!showCatPicker) return;
    const onDocDown = (e) => {
      const picker = pickerRef.current;
      const wrap = ribbonWrapRef.current;
      if (picker && wrap && !picker.contains(e.target) && !wrap.contains(e.target)) {
        setShowCatPicker(false);
      }
    };
    const onEsc = (e) => { if (e.key === "Escape") setShowCatPicker(false); };
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [showCatPicker]);

  useEffect(() => {
    (async () => {
      try {
        const [menuRes, catRes] = await Promise.all([
          api.get("/api/menu"),
          api.get("/api/category"),
        ]);
        const cats = parseCategories(catRes.data);
        const items = parseItems(menuRes.data);

        if (cats.length === 0 && items.length > 0) {
          setCategories([{ id: 0, name: "All Items (auto)" }]);
          setMenuItems(items);
          setActiveCat(0);
        } else {
          setCategories([...cats].sort((a, b) => a.id - b.id));
          setMenuItems(items);
          if (cats.length) setActiveCat(cats[0].id);
        }
      } catch (e) {
        console.error("Error loading menu/categories:", e?.response?.data || e);
      } finally {
        setLoading(false);
      }
    })();

    try {
      const saved = localStorage.getItem("cartItems");
      if (saved) setCart(JSON.parse(saved) || []);
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("cartItems", JSON.stringify(cart));
  }, [cart]);

  // group items by category; if nothing matches, fallback to All Items
  const groupedRaw = useMemo(() => {
    const hasItems = menuItems.length > 0;
    const hasCats = categories.length > 0;

    if (!hasCats && hasItems) {
      return [{ id: 0, name: "All Items", items: menuItems }];
    }
    if (hasCats) {
      const map = new Map(categories.map((c) => [String(c.id), []]));
      for (const it of menuItems) {
        const cid = pickItemCatId(it);
        if (!map.has(cid)) map.set(cid, []);
        map.get(cid).push(it);
      }
      return categories.map((c) => ({
        ...c,
        items: map.get(String(c.id)) || [],
      }));
    }
    return [];
  }, [categories, menuItems]);

  // search mode
  const isSearching = q.trim().length > 0;
  const filteredItemsAll = useMemo(() => {
    if (!isSearching) return [];
    const ql = q.trim().toLowerCase();
    return menuItems.filter((it) =>
      `${it.name || ""} ${it.description || it.desc || ""}`.toLowerCase().includes(ql)
    );
  }, [isSearching, q, menuItems]);

  const grouped = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return groupedRaw;
    return groupedRaw.map((sec) => ({
      ...sec,
      items: sec.items.filter((it) =>
        String(it.name || "").toLowerCase().includes(term)
      ),
    }));
  }, [groupedRaw, q]);

  // observe sections → active chip
  useEffect(() => {
    if (!grouped.length) return;
    if (observerRef.current) observerRef.current.disconnect();

    const io = new IntersectionObserver(
      (entries) => {
        const topVisible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (!topVisible) return;
        const id = Number(topVisible.target.getAttribute("data-catid"));
        setActiveCat(id);

        // ⬇️ keep the active chip visible/centered in the horizontal scroller
        const chip = ribbonRef.current?.querySelector(`[data-chip="${id}"]`);
        if (chip) {
          chip.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        }
      },
      { rootMargin: "-64px 0px -60% 0px", threshold: [0, 0.1, 0.5, 1] }
    );

    grouped.forEach((c) => {
      const el = document.getElementById(`cat-${c.id}`);
      if (el) io.observe(el);
    });

    observerRef.current = io;
    return () => io.disconnect();
  }, [grouped]);

  const scrollTo = (id) => {
    const el = document.getElementById(`cat-${id}`);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 72;
    window.scrollTo({ top: y, behavior: "smooth" });
    setShowCatPicker(false);
  };

  // cart ops
  const qtyOf = (id) => cart.find((c) => c.id === id)?.quantity || 0;
  const addToCart = (item) => {
    setCart((prev) => {
      const i = prev.findIndex((p) => p.id === item.id);
      if (i > -1) {
        const copy = [...prev];
        copy[i] = { ...copy[i], quantity: Math.max(1, (copy[i].quantity || 0) + 1) };
        return copy;
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          price: Number(item.price || 0),
          imageUrl: item.imageUrl || null,
          quantity: 1,
        },
      ];
    });
  };
  const inc = (id) =>
    setCart((p) => p.map((x) => (x.id === id ? { ...x, quantity: x.quantity + 1 } : x)));
  const dec = (id) =>
    setCart((p) =>
      p
        .map((x) => (x.id === id ? { ...x, quantity: Math.max(0, x.quantity - 1) } : x))
        .filter((x) => x.quantity > 0)
    );
  const removeItem = (id) => setCart((p) => p.filter((x) => x.id !== id));
  const clearCart = () => setCart([]);

  const subtotal = cart.reduce(
    (s, it) => s + Number(it.price || 0) * Number(it.quantity || 0),
    0
  );

    const proceedToCheckout = () => {
    const snapshot = cart.map((it) => ({
      ...it,
      price: Number(it.price || 0),
      quantity: Math.max(1, Number(it.quantity || 1)),
    }));
    localStorage.setItem("cartItems", JSON.stringify(snapshot));
    localStorage.setItem("orderNotes", orderNotes);   // <- keep notes
    navigate("/checkout", { state: { cart: snapshot, notes: orderNotes, ts: Date.now() } });
  };


  // skeleton
  if (loading) {
    return (
      <div className="ue-wrap with-cart" style={{maxWidth:"1440px"}}>
        <div className="ue-ribbon ue-ribbon--sticky" />
        <div className="ue-content">
          <div className="ue-main">
            <div className="ue-skel">
              {Array.from({ length: 3 }).map((_, i) => (
                <div className="ue-skel-sec" key={i}>
                  <div className="ue-skel-title" />
                  <div className="ue-skel-grid">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <div className="ue-skel-card" key={j} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <aside className="ue-cart" />
        </div>
      </div>
    );
  }

  if (!grouped.length) {
    return (
      <div className="ue-wrap with-cart" style={{maxWidth:"1440px"}}>
        <div className="ue-ribbon ue-ribbon--sticky" />
        <div className="ue-content">
          <div className="ue-main">
            <div className="ue-empty">
              No menu items to show. Please check categories and item category mapping.
            </div>
          </div>
          <aside className="ue-cart" />
        </div>
      </div>
    );
  }

  return (
    <div className="ue-wrap with-cart" style={{maxWidth:"1440px"}}>
      {/* ===== Sticky ribbon (stable) ===== */}
      <div className="ue-ribbon ue-ribbon--sticky" ref={ribbonWrapRef}>
        {/* Search on top (full width row, centered) */}
        <div className="ue-ribbon-row ue-ribbon-row--search">
          <input
            className="ue-search"
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {/* Row: ☰ button + horizontal chips scroller */}
        <div className="ue-ribbon-row ue-ribbon-row--chips">
          <button
            className="ue-chip"
            onClick={() => setShowCatPicker((v) => !v)}
            title="Show all categories"
          >
            ☰
          </button>

          {!isSearching && (
            <div className="ue-ribbon-inner" ref={ribbonRef}>
              {groupedRaw.map((c) => (
                <button
                  key={c.id}
                  data-chip={c.id}
                  onClick={() => scrollTo(c.id)}
                  className={`ue-chip ${activeCat === c.id ? "is-active" : ""}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {/* Small dropdown list under the ☰ button */}
          {showCatPicker && !isSearching && (
            <div ref={pickerRef} className="ue-cat-dropdown">
              <strong>All Categories</strong>
              <div className="ue-cat-list">
                {groupedRaw.map((c) => (
                  <button
                    key={c.id}
                    className={`ue-chip ${activeCat === c.id ? "is-active" : ""}`}
                    onClick={() => scrollTo(c.id)}
                    style={{ width: "100%", justifyContent: "flex-start" }}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== Two-column layout ===== */}
      <div className="ue-content">
        <div className="ue-main">
          {isSearching ? (
  <section className="ue-section" data-catid="search">
    <h3 className="ue-section-title">Search Results</h3>
    <div className="ue-grid">
      {filteredItemsAll.length === 0 ? (
        <div className="ue-empty">No matching dishes.</div>
      ) : (
        filteredItemsAll.map((item) => {
          const qy = qtyOf(item.id);
          return (
            <article className="ue-card" key={item.id || item.name}>
              <div className="ue-info">
                <h4 className="ue-name">
                  <VegBadge item={item} />
                  {item.name}
                </h4>
                {item.description ? <p className="ue-desc">{item.description || item.desc}</p> : null}
                <div className="ue-meta">
                  <span className="ue-price">£{Number(item.price || 0).toFixed(2)}</span>
                </div>
                {qy === 0 ? (
                  <button className="ue-add-btn" onClick={() => addToCart(item)}>Add</button>
                ) : (
                  <div className="ue-stepper">
                    <button onClick={() => dec(item.id)} aria-label="decrease">−</button>
                    <span>{qy}</span>
                    <button onClick={() => inc(item.id)} aria-label="increase">+</button>
                  </div>
                )}
              </div>
              <div className="ue-img">
                <img src={getImgSrc(item)} alt={item.name} loading="lazy" />
              </div>
            </article>
          );
        })
      )}
    </div>
  </section>
) : (

            <>
              {grouped.map((c) => (
                <section key={c.id} id={`cat-${c.id}`} data-catid={c.id} className="ue-section">
                  <h3 className="ue-section-title">{c.name}</h3>
                  <div className="ue-grid">
                    {c.items.length === 0 ? (
                      <div className="ue-empty-cat">No items in this category.</div>
                    ) : (
                      c.items.map((item) => {
                        const qy = qtyOf(item.id);
                        return (
                          <article className="ue-card" key={item.id}>
                            <div className="ue-info">
                              <h4 className="ue-name"><VegBadge item={item} />{item.name}</h4>
                              {item.description ? <p className="ue-desc">{item.description}</p> : null}
                              <div className="ue-meta">
                                <span className="ue-price">£{Number(item.price || 0).toFixed(2)}</span>
                              </div>
                              {qy === 0 ? (
                                <button className="ue-add-btn" onClick={() => addToCart(item)}>Add</button>
                              ) : (
                                <div className="ue-stepper">
                                  <button onClick={() => dec(item.id)} aria-label="decrease">−</button>
                                  <span>{qy}</span>
                                  <button onClick={() => inc(item.id)} aria-label="increase">+</button>
                                </div>
                              )}
                            </div>
                            <div className="ue-img">
                              <img src={getImgSrc(item)} alt={item.name} loading="lazy" />
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                </section>
              ))}
            </>
          )}
        </div>

        {/* Cart */}
        <aside className="ue-cart">
          <div className="ue-cart-card">
            <div className="ue-cart-head">
              <h4>Your Cart</h4>
              {cart.length > 0 && <button className="ue-link" onClick={clearCart}>Clear</button>}
            </div>

            {cart.length === 0 ? (
              <div className="ue-cart-empty">No items yet</div>
            ) : (
              <>
                <div className="ue-cart-list">
                  {cart.map((ci) => (
                    <div className="ue-cart-row" key={ci.id}>
                      <div className="ue-cart-title">
                        <strong>{ci.name}</strong>
                        <div className="ue-cart-meta">£{Number(ci.price || 0).toFixed(2)}</div>
                      </div>
                      <div className="ue-cart-qty">
                        <button onClick={() => dec(ci.id)}>−</button>
                        <span>{ci.quantity}</span>
                        <button onClick={() => inc(ci.id)}>+</button>
                      </div>
                      <div className="ue-cart-sub">
                        £{(Number(ci.price || 0) * Number(ci.quantity || 0)).toFixed(2)}
                      </div>
                      <button className="ue-remove" onClick={() => removeItem(ci.id)} aria-label="remove">×</button>
                    </div>
                  ))}
                </div>

                <div className="ue-cart-total">
                  {/* Order notes */}
                  <div className="ue-notes">
                    <label htmlFor="order-notes"><strong>Notes</strong></label>
                    <textarea
                      id="order-notes"
                      className="ue-notes-input"
                      placeholder="e.g., No onions, extra spicy, ring the bell…"
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div>Subtotal</div>
                  <div className="ue-total-amt">£{subtotal.toFixed(2)}</div>
                </div>
                <button className="ue-checkout-btn" onClick={proceedToCheckout} disabled={cart.length === 0}>
                  Proceed to Checkout
                </button>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
