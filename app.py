from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Any

from flask import Flask, jsonify, redirect, request, send_from_directory
from werkzeug.utils import secure_filename

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "data.db"
UPLOAD_DIR = BASE_DIR / "uploads"
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}

app = Flask(__name__, static_folder=".", static_url_path="")


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    conn = get_db()
    cur = conn.cursor()

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS profile (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            avatar_url TEXT,
            badges_count INTEGER NOT NULL DEFAULT 4,
            description TEXT
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS featured (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            image_url TEXT,
            product_id INTEGER,
            FOREIGN KEY (product_id) REFERENCES products (id)
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            image_url TEXT,
            link TEXT
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS admin_users (
            id INTEGER PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY,
            facebook TEXT,
            instagram TEXT,
            tiktok TEXT,
            shopee TEXT
        )
        """
    )

    cur.execute("SELECT COUNT(*) FROM profile")
    if cur.fetchone()[0] == 0:
        cur.execute(
            "INSERT INTO profile (name, avatar_url, badges_count, description) VALUES (?, ?, ?, ?)",
            ("Đin 1m60", "", 4, "Mô tả cửa hàng"),
        )

    cur.execute("PRAGMA table_info(profile)")
    profile_columns = {row[1] for row in cur.fetchall()}
    if "description" not in profile_columns:
        cur.execute("ALTER TABLE profile ADD COLUMN description TEXT")
        cur.execute("UPDATE profile SET description = ? WHERE description IS NULL", ("Mô tả cửa hàng",))

    cur.execute("SELECT COUNT(*) FROM featured")
    if cur.fetchone()[0] == 0:
        featured_items = [
            ("Áo dài Zarcen", ""),
            ("Áo dài Zarcen", ""),
            ("Áo dài Zarcen", ""),
            ("D276", ""),
        ]
        cur.executemany("INSERT INTO featured (name, image_url) VALUES (?, ?)", featured_items)

    cur.execute("PRAGMA table_info(featured)")
    columns = {row[1] for row in cur.fetchall()}
    if "product_id" not in columns:
        cur.execute("ALTER TABLE featured ADD COLUMN product_id INTEGER")
        cur.execute(
            """
            UPDATE featured
            SET product_id = (
                SELECT id FROM products WHERE products.name = featured.name LIMIT 1
            )
            """
        )

    cur.execute("SELECT COUNT(*) FROM products")
    if cur.fetchone()[0] == 0:
        products = [
            ("AD Annoo", "Áo dài", "", ""),
            ("Túi Fidé", "Túi", "", ""),
            ("AD Kim sa", "Áo dài", "", ""),
            ("Thùy", "Áo dài", "", ""),
            ("Quần ống suông", "Quần", "", ""),
            ("Chân váy Tulip", "Chân váy", "", ""),
            ("Ghi-lê Linen", "Ghi-lê", "", ""),
            ("Set hoa nhí", "Đồ theo set", "", ""),
            ("Giày Mary Jane", "Giày / Dép", "", ""),
            ("Bông tai ngọc", "Trang sức", "", ""),
            ("Quần jean pastel", "Quần jean", "", ""),
        ]
        cur.executemany(
            "INSERT INTO products (name, category, image_url, link) VALUES (?, ?, ?, ?)",
            products,
        )

    cur.execute("PRAGMA table_info(products)")
    product_columns = {row[1] for row in cur.fetchall()}
    if "link" not in product_columns:
        cur.execute("ALTER TABLE products ADD COLUMN link TEXT")

    cur.execute("SELECT COUNT(*) FROM categories")
    if cur.fetchone()[0] == 0:
        categories = [
            ("Tất cả",),
            ("Quần",),
            ("Chân váy",),
            ("Ghi-lê",),
            ("Đồ theo set",),
            ("Áo dài",),
            ("Giày / Dép",),
            ("Trang sức",),
            ("Quần jean",),
            ("Túi",),
        ]
        cur.executemany("INSERT INTO categories (name) VALUES (?)", categories)

    cur.execute("SELECT COUNT(*) FROM admin_users")
    if cur.fetchone()[0] == 0:
        cur.execute(
            "INSERT INTO admin_users (username, password) VALUES (?, ?)",
            ("hailua", "admin1302"),
        )

    cur.execute("SELECT COUNT(*) FROM contacts")
    if cur.fetchone()[0] == 0:
        cur.execute(
            "INSERT INTO contacts (facebook, instagram, tiktok, shopee) VALUES (?, ?, ?, ?)",
            ("", "", "", ""),
        )

    conn.commit()
    conn.close()


def rows_to_dicts(rows: list[sqlite3.Row]) -> list[dict[str, Any]]:
    return [dict(row) for row in rows]


@app.route("/")
def index() -> Any:
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/admin")
def admin() -> Any:
    return send_from_directory(BASE_DIR, "admin.html")


@app.route("/privacy")
def privacy() -> Any:
    return send_from_directory(BASE_DIR, "privacy.html")


@app.route("/api/profile")
def profile() -> Any:
    conn = get_db()
    row = conn.execute("SELECT * FROM profile LIMIT 1").fetchone()
    conn.close()
    return jsonify(dict(row) if row else {})


@app.route("/api/profile", methods=["POST"])
def update_profile() -> Any:
    payload = request.get_json(silent=True) or {}
    form = request.form or {}
    name = str(form.get("name") or payload.get("name", "")).strip()
    avatar_url = str(form.get("avatar_url") or payload.get("avatar_url", "")).strip()
    description = str(form.get("description") or payload.get("description", "")).strip()

    file = request.files.get("avatar")
    if file and file.filename:
        filename = secure_filename(file.filename)
        ext = filename.rsplit(".", 1)[-1].lower()
        if ext in ALLOWED_EXTENSIONS:
            target = UPLOAD_DIR / filename
            counter = 1
            while target.exists():
                stem = Path(filename).stem
                target = UPLOAD_DIR / f"{stem}-{counter}.{ext}"
                counter += 1
            file.save(target)
            avatar_url = f"/uploads/{target.name}"

    if not name:
        return jsonify({"error": "name is required"}), 400

    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "UPDATE profile SET name = ?, avatar_url = ?, description = ? WHERE id = 1",
        (name, avatar_url, description),
    )
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})


@app.route("/api/featured")
def featured() -> Any:
    conn = get_db()
    rows = conn.execute(
        """
        SELECT featured.id,
               featured.name,
               featured.image_url,
               featured.product_id,
               products.name AS product_name,
             products.image_url AS product_image,
             products.link AS product_link
        FROM featured
        LEFT JOIN products ON products.id = featured.product_id
        ORDER BY featured.id ASC
        """
    ).fetchall()
    conn.close()
    return jsonify(rows_to_dicts(rows))


@app.route("/api/featured", methods=["POST"])
def create_featured() -> Any:
    payload = request.get_json(silent=True) or {}
    form = request.form or {}

    name = str(form.get("name") or payload.get("name", "")).strip()
    image_url = str(form.get("image_url") or payload.get("image_url", "")).strip()
    product_id_value = form.get("product_id") or payload.get("product_id")
    product_id = int(product_id_value) if product_id_value else None

    file = request.files.get("image")
    if file and file.filename:
        filename = secure_filename(file.filename)
        ext = filename.rsplit(".", 1)[-1].lower()
        if ext in ALLOWED_EXTENSIONS:
            target = UPLOAD_DIR / filename
            counter = 1
            while target.exists():
                stem = Path(filename).stem
                target = UPLOAD_DIR / f"{stem}-{counter}.{ext}"
                counter += 1
            file.save(target)
            image_url = f"/uploads/{target.name}"

    if not name and not product_id:
        return jsonify({"error": "name or product_id is required"}), 400

    if product_id and not name:
        conn = get_db()
        row = conn.execute("SELECT name FROM products WHERE id = ?", (product_id,)).fetchone()
        conn.close()
        if row:
            name = row["name"]
        else:
            return jsonify({"error": "invalid product_id"}), 400

    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO featured (name, image_url, product_id) VALUES (?, ?, ?)",
        (name, image_url, product_id),
    )
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return jsonify({"id": new_id, "name": name, "image_url": image_url, "product_id": product_id}), 201


@app.route("/api/featured/<int:featured_id>", methods=["DELETE"])
def delete_featured(featured_id: int) -> Any:
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM featured WHERE id = ?", (featured_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})


@app.route("/api/categories")
def categories() -> Any:
    conn = get_db()
    rows = conn.execute("SELECT * FROM categories ORDER BY id ASC").fetchall()
    conn.close()
    return jsonify(rows_to_dicts(rows))


@app.route("/api/categories", methods=["POST"])
def create_category() -> Any:
    payload = request.get_json(silent=True) or {}
    name = str(payload.get("name", "")).strip()
    if not name:
        return jsonify({"error": "name is required"}), 400

    conn = get_db()
    cur = conn.cursor()
    cur.execute("INSERT INTO categories (name) VALUES (?)", (name,))
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return jsonify({"id": new_id, "name": name}), 201


@app.route("/api/categories/<int:category_id>", methods=["PUT"])
def update_category(category_id: int) -> Any:
    payload = request.get_json(silent=True) or {}
    name = str(payload.get("name", "")).strip()
    if not name:
        return jsonify({"error": "name is required"}), 400

    conn = get_db()
    cur = conn.cursor()
    old_row = cur.execute("SELECT name FROM categories WHERE id = ?", (category_id,)).fetchone()
    cur.execute("UPDATE categories SET name = ? WHERE id = ?", (name, category_id))
    if old_row:
        cur.execute("UPDATE products SET category = ? WHERE category = ?", (name, old_row["name"]))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})


@app.route("/api/categories/<int:category_id>", methods=["DELETE"])
def delete_category(category_id: int) -> Any:
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM categories WHERE id = ?", (category_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})


@app.route("/api/products")
def products() -> Any:
    conn = get_db()
    rows = conn.execute("SELECT * FROM products ORDER BY id ASC").fetchall()
    conn.close()
    return jsonify(rows_to_dicts(rows))


@app.route("/api/products", methods=["POST"])
def create_product() -> Any:
    payload = request.get_json(silent=True) or {}
    form = request.form or {}

    name = str(form.get("name") or payload.get("name", "")).strip()
    category = str(form.get("category") or payload.get("category", "")).strip()
    image_url = str(form.get("image_url") or payload.get("image_url", "")).strip()
    link = str(form.get("link") or payload.get("link", "")).strip()

    file = request.files.get("image")
    if file and file.filename:
        filename = secure_filename(file.filename)
        ext = filename.rsplit(".", 1)[-1].lower()
        if ext in ALLOWED_EXTENSIONS:
            target = UPLOAD_DIR / filename
            counter = 1
            while target.exists():
                stem = Path(filename).stem
                target = UPLOAD_DIR / f"{stem}-{counter}.{ext}"
                counter += 1
            file.save(target)
            image_url = f"/uploads/{target.name}"

    if not name or not category:
        return jsonify({"error": "name and category are required"}), 400

    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO products (name, category, image_url, link) VALUES (?, ?, ?, ?)",
        (name, category, image_url, link),
    )
    conn.commit()
    new_id = cur.lastrowid
    conn.close()

    return jsonify(
        {
            "id": new_id,
            "name": name,
            "category": category,
            "image_url": image_url,
            "link": link,
        }
    ), 201


@app.route("/api/products/<int:product_id>", methods=["PUT"])
def update_product(product_id: int) -> Any:
    payload = request.get_json(silent=True) or {}
    form = request.form or {}

    name = str(form.get("name") or payload.get("name", "")).strip()
    category = str(form.get("category") or payload.get("category", "")).strip()
    image_url = str(form.get("image_url") or payload.get("image_url", "")).strip()
    link = str(form.get("link") or payload.get("link", "")).strip()

    file = request.files.get("image")
    if file and file.filename:
        filename = secure_filename(file.filename)
        ext = filename.rsplit(".", 1)[-1].lower()
        if ext in ALLOWED_EXTENSIONS:
            target = UPLOAD_DIR / filename
            counter = 1
            while target.exists():
                stem = Path(filename).stem
                target = UPLOAD_DIR / f"{stem}-{counter}.{ext}"
                counter += 1
            file.save(target)
            image_url = f"/uploads/{target.name}"

    if not name or not category:
        return jsonify({"error": "name and category are required"}), 400

    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "UPDATE products SET name = ?, category = ?, image_url = ?, link = ? WHERE id = ?",
        (name, category, image_url, link, product_id),
    )
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})


@app.route("/api/products/<int:product_id>", methods=["DELETE"])
def delete_product(product_id: int) -> Any:
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM products WHERE id = ?", (product_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})


@app.route("/api/admin/login", methods=["POST"])
def admin_login() -> Any:
    payload = request.get_json(silent=True) or {}
    username = str(payload.get("username", "")).strip()
    password = str(payload.get("password", "")).strip()

    if not username or not password:
        return jsonify({"error": "missing credentials"}), 400

    conn = get_db()
    row = conn.execute(
        "SELECT id FROM admin_users WHERE username = ? AND password = ?",
        (username, password),
    ).fetchone()
    conn.close()

    if not row:
        return jsonify({"error": "invalid credentials"}), 401

    return jsonify({"status": "ok"})


@app.route("/api/contacts")
def get_contacts() -> Any:
    conn = get_db()
    row = conn.execute("SELECT * FROM contacts LIMIT 1").fetchone()
    conn.close()
    return jsonify(dict(row) if row else {})


@app.route("/api/contacts", methods=["POST"])
def update_contacts() -> Any:
    payload = request.get_json(silent=True) or {}
    facebook = str(payload.get("facebook", "")).strip()
    instagram = str(payload.get("instagram", "")).strip()
    tiktok = str(payload.get("tiktok", "")).strip()
    shopee = str(payload.get("shopee", "")).strip()

    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "UPDATE contacts SET facebook = ?, instagram = ?, tiktok = ?, shopee = ? WHERE id = 1",
        (facebook, instagram, tiktok, shopee),
    )
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})


@app.route("/r/<int:product_id>")
def affiliate_redirect(product_id: int) -> Any:
    conn = get_db()
    row = conn.execute("SELECT link FROM products WHERE id = ?", (product_id,)).fetchone()
    conn.close()
    if not row or not row["link"]:
        return jsonify({"error": "link not found"}), 404
    return redirect(row["link"], code=302)


@app.route("/uploads/<path:filename>")
def uploads(filename: str) -> Any:
    return send_from_directory(UPLOAD_DIR, filename)


if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5500)
