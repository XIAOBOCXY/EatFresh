"""
SQLite database models for AI Fridge Manager.
Uses raw sqlite3 for maximum lightweight footprint.
"""
import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), 'fridge.db')


def get_db():
    """Get database connection with row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Initialize database tables."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.executescript('''
        CREATE TABLE IF NOT EXISTS ingredients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT '其他',
            emoji TEXT NOT NULL DEFAULT '📦',
            quantity REAL NOT NULL DEFAULT 1,
            unit TEXT NOT NULL DEFAULT '个',
            purchase_date TEXT NOT NULL,
            expiry_date TEXT NOT NULL,
            notes TEXT DEFAULT '',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS recipes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            ingredients TEXT NOT NULL DEFAULT '[]',
            instructions TEXT NOT NULL DEFAULT '',
            servings INTEGER NOT NULL DEFAULT 2,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS waste_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ingredient_name TEXT NOT NULL,
            quantity REAL NOT NULL DEFAULT 0,
            unit TEXT NOT NULL DEFAULT '个',
            reason TEXT NOT NULL DEFAULT '过期',
            waste_date TEXT NOT NULL
        );
    ''')

    conn.commit()
    conn.close()


# ── Ingredient Presets ──────────────────────────────────────────
PRESET_INGREDIENTS = [
    # 蔬菜
    {"name": "番茄", "category": "蔬菜", "emoji": "🍅", "unit": "个", "expiry_days": 7},
    {"name": "土豆", "category": "蔬菜", "emoji": "🥔", "unit": "个", "expiry_days": 14},
    {"name": "白菜", "category": "蔬菜", "emoji": "🥬", "unit": "颗", "expiry_days": 10},
    {"name": "菠菜", "category": "蔬菜", "emoji": "🥬", "unit": "把", "expiry_days": 5},
    {"name": "胡萝卜", "category": "蔬菜", "emoji": "🥕", "unit": "根", "expiry_days": 14},
    {"name": "黄瓜", "category": "蔬菜", "emoji": "🥒", "unit": "根", "expiry_days": 7},
    {"name": "青椒", "category": "蔬菜", "emoji": "🫑", "unit": "个", "expiry_days": 7},
    {"name": "洋葱", "category": "蔬菜", "emoji": "🧅", "unit": "个", "expiry_days": 21},
    {"name": "西兰花", "category": "蔬菜", "emoji": "🥦", "unit": "颗", "expiry_days": 7},
    {"name": "蘑菇", "category": "蔬菜", "emoji": "🍄", "unit": "盒", "expiry_days": 5},
    {"name": "玉米", "category": "蔬菜", "emoji": "🌽", "unit": "根", "expiry_days": 7},
    {"name": "茄子", "category": "蔬菜", "emoji": "🍆", "unit": "根", "expiry_days": 7},
    {"name": "生菜", "category": "蔬菜", "emoji": "🥬", "unit": "颗", "expiry_days": 5},
    {"name": "豆腐", "category": "蔬菜", "emoji": "🫘", "unit": "块", "expiry_days": 5},
    {"name": "大蒜", "category": "蔬菜", "emoji": "🧄", "unit": "头", "expiry_days": 30},
    {"name": "生姜", "category": "蔬菜", "emoji": "🫚", "unit": "块", "expiry_days": 21},
    # 水果
    {"name": "苹果", "category": "水果", "emoji": "🍎", "unit": "个", "expiry_days": 14},
    {"name": "香蕉", "category": "水果", "emoji": "🍌", "unit": "根", "expiry_days": 5},
    {"name": "橙子", "category": "水果", "emoji": "🍊", "unit": "个", "expiry_days": 10},
    {"name": "葡萄", "category": "水果", "emoji": "🍇", "unit": "串", "expiry_days": 7},
    {"name": "草莓", "category": "水果", "emoji": "🍓", "unit": "盒", "expiry_days": 3},
    {"name": "西瓜", "category": "水果", "emoji": "🍉", "unit": "个", "expiry_days": 7},
    {"name": "柠檬", "category": "水果", "emoji": "🍋", "unit": "个", "expiry_days": 14},
    {"name": "蓝莓", "category": "水果", "emoji": "🫐", "unit": "盒", "expiry_days": 5},
    # 肉类
    {"name": "猪肉", "category": "肉类", "emoji": "🥩", "unit": "斤", "expiry_days": 3},
    {"name": "牛肉", "category": "肉类", "emoji": "🥩", "unit": "斤", "expiry_days": 3},
    {"name": "鸡肉", "category": "肉类", "emoji": "🍗", "unit": "斤", "expiry_days": 3},
    {"name": "鸡胸肉", "category": "肉类", "emoji": "🍗", "unit": "块", "expiry_days": 3},
    {"name": "排骨", "category": "肉类", "emoji": "🥩", "unit": "斤", "expiry_days": 3},
    {"name": "鸡翅", "category": "肉类", "emoji": "🍗", "unit": "个", "expiry_days": 3},
    {"name": "五花肉", "category": "肉类", "emoji": "🥓", "unit": "斤", "expiry_days": 3},
    {"name": "羊肉", "category": "肉类", "emoji": "🥩", "unit": "斤", "expiry_days": 3},
    # 水产
    {"name": "鱼", "category": "水产", "emoji": "🐟", "unit": "条", "expiry_days": 2},
    {"name": "虾", "category": "水产", "emoji": "🦐", "unit": "斤", "expiry_days": 2},
    {"name": "三文鱼", "category": "水产", "emoji": "🐟", "unit": "块", "expiry_days": 2},
    {"name": "螃蟹", "category": "水产", "emoji": "🦀", "unit": "只", "expiry_days": 2},
    # 乳制品
    {"name": "牛奶", "category": "乳制品", "emoji": "🥛", "unit": "盒", "expiry_days": 10},
    {"name": "酸奶", "category": "乳制品", "emoji": "🥛", "unit": "杯", "expiry_days": 14},
    {"name": "鸡蛋", "category": "乳制品", "emoji": "🥚", "unit": "个", "expiry_days": 21},
    {"name": "奶酪", "category": "乳制品", "emoji": "🧀", "unit": "块", "expiry_days": 30},
    {"name": "黄油", "category": "乳制品", "emoji": "🧈", "unit": "块", "expiry_days": 60},
    # 调料
    {"name": "酱油", "category": "调料", "emoji": "🫙", "unit": "瓶", "expiry_days": 180},
    {"name": "盐", "category": "调料", "emoji": "🧂", "unit": "袋", "expiry_days": 365},
    {"name": "醋", "category": "调料", "emoji": "🫙", "unit": "瓶", "expiry_days": 180},
    {"name": "食用油", "category": "调料", "emoji": "🫒", "unit": "瓶", "expiry_days": 180},
    {"name": "料酒", "category": "调料", "emoji": "🫙", "unit": "瓶", "expiry_days": 180},
    {"name": "蚝油", "category": "调料", "emoji": "🫙", "unit": "瓶", "expiry_days": 180},
    {"name": "辣椒", "category": "调料", "emoji": "🌶️", "unit": "个", "expiry_days": 7},
    {"name": "花椒", "category": "调料", "emoji": "🫘", "unit": "袋", "expiry_days": 365},
    # 主食
    {"name": "大米", "category": "主食", "emoji": "🍚", "unit": "袋", "expiry_days": 180},
    {"name": "面条", "category": "主食", "emoji": "🍜", "unit": "袋", "expiry_days": 180},
    {"name": "面粉", "category": "主食", "emoji": "🌾", "unit": "袋", "expiry_days": 180},
    {"name": "面包", "category": "主食", "emoji": "🍞", "unit": "袋", "expiry_days": 5},
    {"name": "馒头", "category": "主食", "emoji": "🥟", "unit": "个", "expiry_days": 3},
]


if __name__ == '__main__':
    init_db()
    print(f"Database initialized at {DB_PATH}")
