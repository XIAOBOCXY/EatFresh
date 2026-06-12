"""
Waste statistics endpoints.
"""
from flask import Blueprint, jsonify
from models import get_db
from datetime import datetime, timedelta

stats_bp = Blueprint('stats', __name__)

WASTE_FILTER = """
    ingredient_name NOT LIKE '%测试%' AND lower(ingredient_name) NOT LIKE '%test%'
    AND reason NOT LIKE '%测试%' AND lower(reason) NOT LIKE '%test%'
    AND reason NOT IN ('已用于烹饪', '已用完', '正常使用', '吃完了', '吃完', '使用')
"""


@stats_bp.route('/api/stats/waste', methods=['GET'])
def get_waste_stats():
    """Get waste statistics summary."""
    conn = get_db()

    # Total waste records
    total = conn.execute(f'''
        SELECT COUNT(*) as cnt, SUM(quantity) as total_qty
        FROM waste_records
        WHERE {WASTE_FILTER}
    ''').fetchone()

    # By reason
    by_reason_rows = conn.execute(f'''
        SELECT reason, COUNT(*) as cnt, SUM(quantity) as total_qty
        FROM waste_records
        WHERE {WASTE_FILTER}
        GROUP BY reason
    ''').fetchall()

    # By month (last 6 months)
    six_months_ago = (datetime.now() - timedelta(days=180)).strftime('%Y-%m')
    by_month_rows = conn.execute(f'''
        SELECT substr(waste_date, 1, 7) as month, COUNT(*) as cnt, SUM(quantity) as total_qty
        FROM waste_records
        WHERE waste_date >= ? AND {WASTE_FILTER}
        GROUP BY month ORDER BY month
    ''', (six_months_ago + '-01',)).fetchall()

    # Most wasted ingredients
    most_wasted = conn.execute(f'''
        SELECT ingredient_name, SUM(quantity) as total_qty, COUNT(*) as times
        FROM waste_records
        WHERE {WASTE_FILTER}
        GROUP BY ingredient_name ORDER BY total_qty DESC LIMIT 10
    ''').fetchall()

    # Recent waste records
    recent = conn.execute(f'''
        SELECT * FROM waste_records
        WHERE {WASTE_FILTER}
        ORDER BY waste_date DESC LIMIT 20
    ''').fetchall()

    conn.close()

    return jsonify({
        "total_count": total['cnt'] or 0,
        "total_quantity": total['total_qty'] or 0,
        "by_reason": [dict(r) for r in by_reason_rows],
        "by_month": [dict(r) for r in by_month_rows],
        "most_wasted": [dict(r) for r in most_wasted],
        "recent": [dict(r) for r in recent],
    })
