from __future__ import annotations

import os
from uuid import uuid4
from pathlib import Path
from typing import Any

import psycopg2
from psycopg2.extras import RealDictCursor
from supabase import create_client
from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, request, send_from_directory
from werkzeug.utils import secure_filename

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}

DATABASE_URL = (
    os.getenv("DATABASE_URL")
    or os.getenv("SUPABASE_DATABASE_URL")
    or os.getenv("POSTGRES_URL")
)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

SUPABASE_STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "uploads")

supabase = (
    create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
    else None
)

_db_ready = False

app = Flask(__name__, static_folder=".", static_url_path="")


def get_db() -> psycopg2.extensions.connection:
    if not DATABASE_URL:
        raise RuntimeError("Missing DATABASE_URL environment variable")
    return psycopg2.connect(DATABASE_URL, sslmode="require", cursor_factory=RealDictCursor)


def init_db() -> None:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    conn = get_db()
    cur = conn.cursor()

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS profile (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            avatar_url TEXT,
            badges_count INTEGER NOT NULL DEFAULT 4,
            description TEXT
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            image_url TEXT,
            link TEXT
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS featured (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            image_url TEXT,
            product_id INTEGER REFERENCES products (id)
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS categories (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL UNIQUE
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS admin_users (
            id SERIAL PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS contacts (
            id SERIAL PRIMARY KEY,
            facebook TEXT,
            instagram TEXT,
            tiktok TEXT,
            shopee TEXT
        )
        """
    )

    cur.execute("ALTER TABLE profile ADD COLUMN IF NOT EXISTS description TEXT")
    cur.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS link TEXT")
    cur.execute("ALTER TABLE featured ADD COLUMN IF NOT EXISTS product_id INTEGER")

    cur.execute("SELECT COUNT(*) AS count FROM profile")
    if cur.fetchone()["count"] == 0:
        cur.execute(
            "INSERT INTO profile (name, avatar_url, badges_count, description) VALUES (%s, %s, %s, %s)",
            ("Đin 1m60", "", 4, "Mô tả cửa hàng"),
        )

    cur.execute("SELECT COUNT(*) AS count FROM featured")
    if cur.fetchone()["count"] == 0:
        featured_items = [
            ("Áo dài Zarcen", ""),
            ("Áo dài Zarcen", ""),
            ("Áo dài Zarcen", ""),
            ("D276", ""),
        ]
        cur.executemany("INSERT INTO featured (name, image_url) VALUES (%s, %s)", featured_items)

    cur.execute("SELECT COUNT(*) AS count FROM products")
    if cur.fetchone()["count"] == 0:
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
            "INSERT INTO products (name, category, image_url, link) VALUES (%s, %s, %s, %s)",
            products,
        )

    cur.execute("SELECT COUNT(*) AS count FROM categories")
    if cur.fetchone()["count"] == 0:
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
        cur.executemany("INSERT INTO categories (name) VALUES (%s)", categories)

    cur.execute("SELECT COUNT(*) AS count FROM admin_users")
    if cur.fetchone()["count"] == 0:
        cur.execute(
            "INSERT INTO admin_users (username, password) VALUES (%s, %s)",
            ("hailua", "admin1302"),
        )

    cur.execute("SELECT COUNT(*) AS count FROM contacts")
    if cur.fetchone()["count"] == 0:
        cur.execute(
            "INSERT INTO contacts (facebook, instagram, tiktok, shopee) VALUES (%s, %s, %s, %s)",
            ("", "", "", ""),
        )

    conn.commit()
    conn.close()


def rows_to_dicts(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [dict(row) for row in rows]


def ensure_db_ready() -> None:
    global _db_ready
    if _db_ready:
        return
    init_db()
    _db_ready = True


def upload_to_storage(file) -> str:
    if not supabase:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    filename = secure_filename(file.filename)
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext and ext not in ALLOWED_EXTENSIONS:
        raise ValueError("invalid file type")

    unique_name = f"{uuid4().hex}_{filename}"
    data = file.stream.read()
    content_type = file.mimetype or "application/octet-stream"
    supabase.storage.from_(SUPABASE_STORAGE_BUCKET).upload(
        unique_name,
        data,
        file_options={"content-type": content_type},
    )
    return supabase.storage.from_(SUPABASE_STORAGE_BUCKET).get_public_url(unique_name)


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
    ensure_db_ready()
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM profile LIMIT 1")
    row = cur.fetchone()
    conn.close()
    return jsonify(dict(row) if row else {})


@app.route("/api/profile", methods=["POST"])
def update_profile() -> Any:
    ensure_db_ready()
    payload = request.get_json(silent=True) or {}
    form = request.form or {}
    name = str(form.get("name") or payload.get("name", "")).strip()
    avatar_url = str(form.get("avatar_url") or payload.get("avatar_url", "")).strip()
    description = str(form.get("description") or payload.get("description", "")).strip()

    file = request.files.get("avatar")
    if file and file.filename:
        try:
            avatar_url = upload_to_storage(file)
        except ValueError:
            return jsonify({"error": "invalid file type"}), 400
        except RuntimeError as exc:
            return jsonify({"error": str(exc)}), 500

    if not name:
        return jsonify({"error": "name is required"}), 400

    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "UPDATE profile SET name = %s, avatar_url = %s, description = %s WHERE id = 1",
        (name, avatar_url, description),
    )
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})


@app.route("/api/featured")
def featured() -> Any:
    ensure_db_ready()
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
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
    )
    rows = cur.fetchall()
    conn.close()
    return jsonify(rows_to_dicts(rows))


@app.route("/api/featured", methods=["POST"])
def create_featured() -> Any:
    ensure_db_ready()
    payload = request.get_json(silent=True) or {}
    form = request.form or {}

    name = str(form.get("name") or payload.get("name", "")).strip()
    image_url = str(form.get("image_url") or payload.get("image_url", "")).strip()
    product_id_value = form.get("product_id") or payload.get("product_id")
    product_id = int(product_id_value) if product_id_value else None

    file = request.files.get("image")
    if file and file.filename:
        try:
            image_url = upload_to_storage(file)
        except ValueError:
            return jsonify({"error": "invalid file type"}), 400
        except RuntimeError as exc:
            return jsonify({"error": str(exc)}), 500

    if not name and not product_id:
        return jsonify({"error": "name or product_id is required"}), 400

    if product_id and not name:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT name FROM products WHERE id = %s", (product_id,))
        row = cur.fetchone()
        conn.close()
        if row:
            name = row["name"]
        else:
            return jsonify({"error": "invalid product_id"}), 400

    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO featured (name, image_url, product_id) VALUES (%s, %s, %s) RETURNING id",
        (name, image_url, product_id),
    )
    new_id = cur.fetchone()["id"]
    conn.commit()
    conn.close()
    return jsonify({"id": new_id, "name": name, "image_url": image_url, "product_id": product_id}), 201


@app.route("/api/featured/<int:featured_id>", methods=["DELETE"])
def delete_featured(featured_id: int) -> Any:
    ensure_db_ready()
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM featured WHERE id = %s", (featured_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})


@app.route("/api/categories")
def categories() -> Any:
    ensure_db_ready()
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM categories ORDER BY id ASC")
    rows = cur.fetchall()
    conn.close()
    return jsonify(rows_to_dicts(rows))


@app.route("/api/categories", methods=["POST"])
def create_category() -> Any:
    ensure_db_ready()
    payload = request.get_json(silent=True) or {}
    name = str(payload.get("name", "")).strip()
    if not name:
        return jsonify({"error": "name is required"}), 400

    conn = get_db()
    cur = conn.cursor()
    cur.execute("INSERT INTO categories (name) VALUES (%s) RETURNING id", (name,))
    new_id = cur.fetchone()["id"]
    conn.commit()
    conn.close()
    return jsonify({"id": new_id, "name": name}), 201


@app.route("/api/categories/<int:category_id>", methods=["PUT"])
def update_category(category_id: int) -> Any:
    ensure_db_ready()
    payload = request.get_json(silent=True) or {}
    name = str(payload.get("name", "")).strip()
    if not name:
        return jsonify({"error": "name is required"}), 400

    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT name FROM categories WHERE id = %s", (category_id,))
    old_row = cur.fetchone()
    cur.execute("UPDATE categories SET name = %s WHERE id = %s", (name, category_id))
    if old_row:
        cur.execute("UPDATE products SET category = %s WHERE category = %s", (name, old_row["name"]))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})


@app.route("/api/categories/<int:category_id>", methods=["DELETE"])
def delete_category(category_id: int) -> Any:
    ensure_db_ready()
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM categories WHERE id = %s", (category_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})


@app.route("/api/products")
def products() -> Any:
    ensure_db_ready()
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM products ORDER BY id ASC")
    rows = cur.fetchall()
    conn.close()
    return jsonify(rows_to_dicts(rows))


@app.route("/api/products", methods=["POST"])
def create_product() -> Any:
    ensure_db_ready()
    payload = request.get_json(silent=True) or {}
    form = request.form or {}

    name = str(form.get("name") or payload.get("name", "")).strip()
    category = str(form.get("category") or payload.get("category", "")).strip()
    image_url = str(form.get("image_url") or payload.get("image_url", "")).strip()
    link = str(form.get("link") or payload.get("link", "")).strip()

    file = request.files.get("image")
    if file and file.filename:
        try:
            image_url = upload_to_storage(file)
        except ValueError:
            return jsonify({"error": "invalid file type"}), 400
        except RuntimeError as exc:
            return jsonify({"error": str(exc)}), 500

    if not name or not category:
        return jsonify({"error": "name and category are required"}), 400

    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO products (name, category, image_url, link) VALUES (%s, %s, %s, %s) RETURNING id",
        (name, category, image_url, link),
    )
    new_id = cur.fetchone()["id"]
    conn.commit()
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
    ensure_db_ready()
    payload = request.get_json(silent=True) or {}
    form = request.form or {}

    name = str(form.get("name") or payload.get("name", "")).strip()
    category = str(form.get("category") or payload.get("category", "")).strip()
    image_url = str(form.get("image_url") or payload.get("image_url", "")).strip()
    link = str(form.get("link") or payload.get("link", "")).strip()

    file = request.files.get("image")
    if file and file.filename:
        try:
            image_url = upload_to_storage(file)
        except ValueError:
            return jsonify({"error": "invalid file type"}), 400
        except RuntimeError as exc:
            return jsonify({"error": str(exc)}), 500

    if not name or not category:
        return jsonify({"error": "name and category are required"}), 400

    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "UPDATE products SET name = %s, category = %s, image_url = %s, link = %s WHERE id = %s",
        (name, category, image_url, link, product_id),
    )
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})


@app.route("/api/products/<int:product_id>", methods=["DELETE"])
def delete_product(product_id: int) -> Any:
    ensure_db_ready()
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM products WHERE id = %s", (product_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})


@app.route("/api/admin/login", methods=["POST"])
def admin_login() -> Any:
    ensure_db_ready()
    payload = request.get_json(silent=True) or {}
    username = str(payload.get("username", "")).strip()
    password = str(payload.get("password", "")).strip()

    if not username or not password:
        return jsonify({"error": "missing credentials"}), 400

    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT id FROM admin_users WHERE username = %s AND password = %s",
        (username, password),
    )
    row = cur.fetchone()
    conn.close()

    if not row:
        return jsonify({"error": "invalid credentials"}), 401

    return jsonify({"status": "ok"})


@app.route("/api/contacts")
def get_contacts() -> Any:
    ensure_db_ready()
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM contacts LIMIT 1")
    row = cur.fetchone()
    conn.close()
    return jsonify(dict(row) if row else {})


@app.route("/api/contacts", methods=["POST"])
def update_contacts() -> Any:
    ensure_db_ready()
    payload = request.get_json(silent=True) or {}
    facebook = str(payload.get("facebook", "")).strip()
    instagram = str(payload.get("instagram", "")).strip()
    tiktok = str(payload.get("tiktok", "")).strip()
    shopee = str(payload.get("shopee", "")).strip()

    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "UPDATE contacts SET facebook = %s, instagram = %s, tiktok = %s, shopee = %s WHERE id = 1",
        (facebook, instagram, tiktok, shopee),
    )
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})


@app.route("/r/<int:product_id>")
def affiliate_redirect(product_id: int) -> Any:
    ensure_db_ready()
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT link FROM products WHERE id = %s", (product_id,))
    row = cur.fetchone()
    conn.close()
    if not row or not row["link"]:
        return jsonify({"error": "link not found"}), 404
    return redirect(row["link"], code=302)


@app.route("/uploads/<path:filename>")
def uploads(filename: str) -> Any:
    return send_from_directory(UPLOAD_DIR, filename)


if __name__ == "__main__":
    app.run(debug=True, port=5500)
