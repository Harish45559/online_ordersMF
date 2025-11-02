import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "../styles/MasterData.css";

const MasterData = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [categoryName, setCategoryName] = useState("");
  const [editCategory, setEditCategory] = useState(null);
  const [editItem, setEditItem] = useState(null);

  // No image fields anymore
  const [newItem, setNewItem] = useState({
    name: "",
    price: "",
    isVeg: true,
    categoryId: "",
  });

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "admin") navigate("/unauthorized");
  }, [navigate]);

  useEffect(() => {
    fetchCategories();
    fetchMenuItems();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await api.get("/api/category");
      setCategories(res.data || []);
    } catch (err) {
      console.error("Failed to fetch categories", err);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const res = await api.get("/api/menu");
      setMenuItems(res.data || []);
    } catch (err) {
      console.error("Failed to fetch menu items", err);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!categoryName.trim()) return;
    try {
      if (editCategory) {
        await api.put(`/api/category/update/${editCategory.id}`, { name: categoryName });
      } else {
        await api.post("/api/category/add", { name: categoryName });
      }
      setCategoryName("");
      setEditCategory(null);
      fetchCategories();
    } catch (err) {
      console.error("Error saving category", err);
    }
  };

  const handleEditCategory = (cat) => {
    setEditCategory(cat);
    setCategoryName(cat.name);
  };

  const handleDeleteCategory = async (id) => {
    if (window.confirm("Delete this category?")) {
      try {
        await api.delete(`/api/category/delete/${id}`);
        fetchCategories();
      } catch (err) {
        console.error("Error deleting category", err);
      }
    }
  };

  const handleAddMenuItem = async (e) => {
    e.preventDefault();

    // ✅ BLOCK saving if no category selected
    if (!newItem.categoryId) {
      alert("Please select a category for this item.");
      return;
    }

    try {
      const payload = {
        name: newItem.name,
        price: newItem.price,
        isVeg: newItem.isVeg,
        categoryId: newItem.categoryId,
        // imageUrl intentionally omitted; backend derives from name
      };

      if (editItem) {
        await api.put(`/api/menu/update/${editItem.id}`, payload);
      } else {
        await api.post("/api/menu/add", payload);
      }

      setNewItem({ name: "", price: "", isVeg: true, categoryId: "" });
      setEditItem(null);
      fetchMenuItems();
    } catch (err) {
      console.error("Error saving menu item:", err);
    }
  };

  const handleEditItem = (item) => {
    setEditItem(item);
    setNewItem({
      name: item.name,
      price: item.price,
      isVeg: item.isVeg,
      categoryId: item.categoryId || "",
    });
  };

  const handleDeleteItem = async (id) => {
    if (window.confirm("Delete this menu item?")) {
      try {
        await api.delete(`/api/menu/delete/${id}`);
        fetchMenuItems();
      } catch (err) {
        console.error("Error deleting menu item", err);
      }
    }
  };

  return (
    <div className="master-container">
      <h2>Master Data</h2>

      {/* Add/Edit Category */}
      <form onSubmit={handleAddCategory} className="form-group">
        <input
          type="text"
          placeholder="Category name"
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
        />
        <button type="submit">{editCategory ? "Update Category" : "Add Category"}</button>
      </form>

      {/* Add/Edit Menu Item (no image input) */}
      <form onSubmit={handleAddMenuItem} className="form-group">
        <input
          type="text"
          placeholder="Item name"
          value={newItem.name}
          onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
        />
        <input
          type="number"
          placeholder="Price"
          value={newItem.price}
          onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
        />
        <select
          value={newItem.isVeg}
          onChange={(e) => setNewItem({ ...newItem, isVeg: e.target.value === "true" })}
        >
          <option value="true">Veg</option>
          <option value="false">Non-Veg</option>
        </select>
        <select
          value={newItem.categoryId}
          onChange={(e) => setNewItem({ ...newItem, categoryId: e.target.value })}
          required  /* ✅ HTML required to prevent blank submit */
        >
          <option value="">Select Category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        <button type="submit">{editItem ? "Update Item" : "Add Menu Item"}</button>
      </form>

      <div className="split-section">
        <div className="category-list">
          <h3>Categories</h3>
          <ul>
            {categories.map((cat) => (
              <li key={cat.id}>
                {cat.name}
                <span>
                  <button onClick={() => handleEditCategory(cat)}>✏️</button>
                  <button onClick={() => handleDeleteCategory(cat.id)}>🗑️</button>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="item-list">
          <h3>Menu Items</h3>
          {menuItems.length === 0 ? (
            <p>No menu items found</p>
          ) : (
            <ul>
              {menuItems.map((item) => (
                <li key={item.id}>
                  {item.name} - £{item.price}
                  <span>
                    <button onClick={() => handleEditItem(item)}>✏️</button>
                    <button onClick={() => handleDeleteItem(item.id)}>🗑️</button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default MasterData;
