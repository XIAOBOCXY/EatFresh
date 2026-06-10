"""
Ingredient CRUD endpoints + preset tags.
"""
from flask import Blueprint, request, jsonify
from models import get_db, PRESET_INGREDIENTS
from datetime import datetime

ingredients_bp = Blueprint('ingredients', __name__)


@ingredients_bp.route('/api/ingredients/presets', methods=['GET'])
def get_presets():
    """Return predefined ingredient tags organized by category."""
    categories = {}
    for item in PRESET_INGREDIENTS:
        cat = item['category']
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(item)
    return jsonify({"categories": categories, "all": PRESET_INGREDIENTS})


@ingredients_bp.route('/api/ingredients', methods=['GET'])
def list_ingredients():
    """List all ingredients, sorted by expiry date (closest first)."""
    category = request.args.get('category', '')
    search = request.args.get('search', '')

    conn = get_db()
    query = "SELECT * FROM ingredients WHERE 1=1"
    params = []

    if category:
        query += " AND category = ?"
        params.append(category)
    if search:
        query += " AND name LIKE ?"
        params.append(f'%{search}%')

    query += " ORDER BY expiry_date ASC"

    rows = conn.execute(query, params).fetchall()
    conn.close()

    today = datetime.now().date()
    ingredients = []
    for row in rows:
        item = dict(row)
        # Calculate freshness
        try:
            purchase = datetime.strptime(item['purchase_date'], '%Y-%m-%d').date()
            expiry = datetime.strptime(item['expiry_date'], '%Y-%m-%d').date()
            total_days = (expiry - purchase).days
            remaining = (expiry - today).days
            if total_days <= 0:
                item['freshness'] = 0
            else:
                item['freshness'] = max(0, min(100, round(remaining / total_days * 100, 1)))
            item['days_remaining'] = remaining
        except Exception:
            item['freshness'] = 50
            item['days_remaining'] = 7
        # Freshness status
        if item['days_remaining'] < 0:
            item['status'] = 'expired'
        elif item['days_remaining'] <= 3:
            item['status'] = 'urgent'
        elif item['days_remaining'] <= 7:
            item['status'] = 'warning'
        else:
            item['status'] = 'fresh'

        ingredients.append(item)

    return jsonify(ingredients)


@ingredients_bp.route('/api/ingredients/<int:ingredient_id>', methods=['GET'])
def get_ingredient(ingredient_id):
    """Get single ingredient detail."""
    conn = get_db()
    row = conn.execute("SELECT * FROM ingredients WHERE id = ?", (ingredient_id,)).fetchone()
    conn.close()
    if not row:
        return jsonify({"error": "食材不存在"}), 404
    item = dict(row)
    today = datetime.now().date()
    try:
        purchase = datetime.strptime(item['purchase_date'], '%Y-%m-%d').date()
        expiry = datetime.strptime(item['expiry_date'], '%Y-%m-%d').date()
        total_days = (expiry - purchase).days
        remaining = (expiry - today).days
        item['freshness'] = max(0, min(100, round(remaining / total_days * 100, 1))) if total_days > 0 else 0
        item['days_remaining'] = remaining
    except Exception:
        item['freshness'] = 50
        item['days_remaining'] = 7
    return jsonify(item)


@ingredients_bp.route('/api/ingredients', methods=['POST'])
def add_ingredient():
    """Add a single ingredient."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "请求体为空"}), 400

    required = ['name', 'category', 'quantity', 'unit', 'purchase_date', 'expiry_date']
    for field in required:
        if field not in data:
            return jsonify({"error": f"缺少必填字段: {field}"}), 400

    conn = get_db()
    conn.execute('''
        INSERT INTO ingredients (name, category, emoji, quantity, unit,
                                 purchase_date, expiry_date, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data['name'],
        data.get('category', '其他'),
        data.get('emoji', '📦'),
        data['quantity'],
        data['unit'],
        data['purchase_date'],
        data['expiry_date'],
        data.get('notes', ''),
        datetime.now().isoformat(),
    ))
    conn.commit()
    new_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    conn.close()
    return jsonify({"id": new_id, "message": "添加成功"}), 201


@ingredients_bp.route('/api/ingredients/batch', methods=['POST'])
def batch_add_ingredients():
    """Batch add multiple ingredients."""
    data = request.get_json()
    if not data or 'items' not in data:
        return jsonify({"error": "缺少 items 字段"}), 400

    items = data['items']
    conn = get_db()
    now = datetime.now().isoformat()
    ids = []

    for item in items:
        conn.execute('''
            INSERT INTO ingredients (name, category, emoji, quantity, unit,
                                     purchase_date, expiry_date, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            item['name'],
            item.get('category', '其他'),
            item.get('emoji', '📦'),
            item['quantity'],
            item['unit'],
            item['purchase_date'],
            item['expiry_date'],
            item.get('notes', ''),
            now,
        ))
        new_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        ids.append(new_id)

    conn.commit()
    conn.close()
    return jsonify({"ids": ids, "message": f"成功添加 {len(ids)} 个食材"}), 201


@ingredients_bp.route('/api/ingredients/<int:ingredient_id>', methods=['PUT'])
def update_ingredient(ingredient_id):
    """Update an ingredient."""
    data = request.get_json()
    conn = get_db()
    existing = conn.execute("SELECT * FROM ingredients WHERE id = ?", (ingredient_id,)).fetchone()
    if not existing:
        conn.close()
        return jsonify({"error": "食材不存在"}), 404

    conn.execute('''
        UPDATE ingredients SET name=?, category=?, emoji=?, quantity=?, unit=?,
               purchase_date=?, expiry_date=?, notes=?
        WHERE id=?
    ''', (
        data.get('name', existing['name']),
        data.get('category', existing['category']),
        data.get('emoji', existing['emoji']),
        data.get('quantity', existing['quantity']),
        data.get('unit', existing['unit']),
        data.get('purchase_date', existing['purchase_date']),
        data.get('expiry_date', existing['expiry_date']),
        data.get('notes', existing['notes']),
        ingredient_id,
    ))
    conn.commit()
    conn.close()
    return jsonify({"message": "更新成功"})


@ingredients_bp.route('/api/ingredients/<int:ingredient_id>', methods=['DELETE'])
def delete_ingredient(ingredient_id):
    """Delete an ingredient and record as waste."""
    conn = get_db()
    row = conn.execute("SELECT * FROM ingredients WHERE id = ?", (ingredient_id,)).fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "食材不存在"}), 404

    # Record as waste
    reason = request.args.get('reason', '已用完')
    conn.execute('''
        INSERT INTO waste_records (ingredient_name, quantity, unit, reason, waste_date)
        VALUES (?, ?, ?, ?, ?)
    ''', (row['name'], row['quantity'], row['unit'], reason, datetime.now().strftime('%Y-%m-%d')))

    conn.execute("DELETE FROM ingredients WHERE id = ?", (ingredient_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "已删除并记录"})


@ingredients_bp.route('/api/ingredients/<int:ingredient_id>/waste', methods=['POST'])
def mark_as_waste(ingredient_id):
    """Mark ingredient as wasted without deleting (partial waste)."""
    data = request.get_json() or {}
    conn = get_db()
    row = conn.execute("SELECT * FROM ingredients WHERE id = ?", (ingredient_id,)).fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "食材不存在"}), 404

    waste_qty = data.get('quantity', row['quantity'])
    reason = data.get('reason', '过期')

    conn.execute('''
        INSERT INTO waste_records (ingredient_name, quantity, unit, reason, waste_date)
        VALUES (?, ?, ?, ?, ?)
    ''', (row['name'], waste_qty, row['unit'], reason, datetime.now().strftime('%Y-%m-%d')))

    # Reduce or remove
    remaining = row['quantity'] - waste_qty
    if remaining <= 0:
        conn.execute("DELETE FROM ingredients WHERE id = ?", (ingredient_id,))
    else:
        conn.execute("UPDATE ingredients SET quantity = ? WHERE id = ?", (remaining, ingredient_id))

    conn.commit()
    conn.close()
    return jsonify({"message": "已记录浪费"})
