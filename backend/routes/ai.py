"""
AI-powered endpoints: text parsing, recipe generation, smart tips.
DeepSeek API token is extracted from Authorization header per-request.
"""
from flask import Blueprint, request, jsonify
from services.deepseek import call_deepseek, extract_json_from_response
from models import get_db
from datetime import datetime, timedelta

ai_bp = Blueprint('ai', __name__)


def get_token():
    """Extract Bearer token from Authorization header."""
    auth = request.headers.get('Authorization', '')
    if auth.startswith('Bearer '):
        return auth[7:]
    return ''


def require_token():
    """Get token or return error response."""
    token = get_token()
    if not token:
        return None, jsonify({"error": "请先在设置中配置 DeepSeek API Token"}), 401
    return token, None, None


# ── System Prompts ──────────────────────────────────────────────

PARSE_TEXT_SYSTEM = """你是一个食材管理助手。用户会用自然语言描述他们购买了哪些食材。
请从用户的描述中提取所有食材信息，严格返回 JSON 数组格式。

每个食材对象包含以下字段：
- name: 食材名称（中文）
- quantity: 数量（数字）
- unit: 单位（个/斤/kg/盒/瓶/袋/把/颗/根/条/只/块/头/串/杯）
- category: 分类（蔬菜/水果/肉类/水产/乳制品/调料/主食/其他）
- emoji: 对应的 emoji 表情（单个）
- typical_expiry_days: 该食材的典型保质期天数（整数）
- purchase_date_offset_days: 购买日期相对今天的偏移，今天为0，昨天为-1，前天为-2；如果一句话里不同食材有不同日期，要分别写

规则：
1. 仔细解析数量词，如"三个"→quantity=3, unit="个"；"两斤"→quantity=2, unit="斤"
2. 合理推断保质期，如肉类通常3-5天，蔬菜通常5-7天，乳制品7-14天，调料180天+
3. 口味、品种会影响识别时，要写进 name，例如"草莓口味冰激凌"、"哈密瓜口味冰激凌"，不要合并成同一个普通"冰激凌"
4. 如果没有明确数量，默认 quantity=1
5. 只返回 JSON 数组，不要其他内容
6. 如果用户没有提到任何食材，返回空数组 []

示例输入："今天买了三个番茄、两斤排骨和一盒牛奶"
示例输出：[{"name":"番茄","quantity":3,"unit":"个","category":"蔬菜","emoji":"🍅","typical_expiry_days":7,"purchase_date_offset_days":0},{"name":"排骨","quantity":2,"unit":"斤","category":"肉类","emoji":"🥩","typical_expiry_days":3,"purchase_date_offset_days":0},{"name":"牛奶","quantity":1,"unit":"盒","category":"乳制品","emoji":"🥛","typical_expiry_days":10,"purchase_date_offset_days":0}]

示例输入："昨天买了一个冰激凌，草莓口味的，今天又买了一个哈密瓜口味的"
示例输出：[{"name":"草莓口味冰激凌","quantity":1,"unit":"个","category":"乳制品","emoji":"🍦","typical_expiry_days":30,"purchase_date_offset_days":-1},{"name":"哈密瓜口味冰激凌","quantity":1,"unit":"个","category":"乳制品","emoji":"🍦","typical_expiry_days":30,"purchase_date_offset_days":0}]"""


RECIPE_SYSTEM = """你是一个创意烹饪助手。根据用户冰箱里现有的食材，推荐可以制作的菜品。

用户会提供：
1. 当前冰箱里的食材列表（含名称和数量，required=true 表示必须使用）
2. 必须包含的食材（每道菜都必须用到）
3. 用餐人数
4. 需要的菜品数量
5. 口味偏好（可选）

请返回严格 JSON 数组，每个菜品对象包含：
- dish_name: 菜名
- used_ingredients: 冰箱里已有的食材列表 [{name, emoji}]
- missing_ingredients: 需要额外购买的食材 [{name, emoji}]
- cuisine_type: 菜系或风格（如家常菜/川菜/粤菜/西餐/日料/创意料理）
- dish_icon: 能代表菜品的单个 emoji 图标，尽量贴近菜本身，不要总是用 🍽️
- instructions: 详细烹饪步骤，面向厨房新手，每个步骤包含具体的食材用量、时间、火候、操作细节。如"1. 使用番茄2个洗净切成约2cm小块，鸡蛋2个打散，加1小撮盐。（3分钟）\n2. 中火热锅倒油1汤匙，倒入蛋液，边缘凝固后快速划散，盛出备用。（1分钟）\n3. ..." 步骤要具体到让第一次下厨的人也能跟着做。
- tips: 烹饪小贴士（字符串，如何判断火候、替代食材等实用建议）
- difficulty: 难度（简单/中等/复杂）

核心规则：
1. 【最重要】如果指定了必须包含的食材，那么每一道菜都必须使用这些食材！这是硬性要求！
2. 优先使用冰箱已有的食材，减少需要购买的
3. 必须结合用户冰箱里给出的食材数量和用餐人数，说明本菜实际使用多少，不能只写泛泛的"适量"
4. 菜品不重复，多样化
5. instructions 中的每一步都要足够详细，包含时间、用量、火候、食材形态、判断熟度的方法；步骤以"1. "、"2. "、"3. "格式编号，建议4到7步
6. 如果 strict_mode 为 true（严格模式），则只能使用冰箱已有食材，不能有任何 missing_ingredients；调味料（油、盐、酱油、糖、醋、料酒、蚝油、淀粉、葱、姜、蒜、辣椒、花椒、八角等）不受此限制，即使冰箱里没有也可以用
7. 如果 strict_mode 为 false（灵活模式），可以建议需要额外购买的食材，但仍必须包含所有 required=true 的食材
8. 只返回 JSON 数组"""


TIPS_SYSTEM = """你是冰箱管理助手。根据用户冰箱里的食材情况，给出实用建议。

返回严格 JSON 格式：
{
  "summary": "一句话总结冰箱状况",
  "tips": ["建议1", "建议2", "建议3"],
  "urgent": ["需要立即处理的食材提示"]
}

建议类型：
- 提醒快过期的食材尽早食用
- 建议可以搭配的食材组合
- 给出储存建议（如某些食材需要冷藏）
- 推荐最近可以做的菜
- 根据当前季节推荐适合的吃法

每条建议简洁实用，尽量不超过18个字。tips 数组最多8条。不要使用课堂项目、样例数据或临时调试相关表达。"""


# ── Routes ──────────────────────────────────────────────────────

@ai_bp.route('/api/ai/parse-text', methods=['POST'])
def parse_text():
    """Parse natural language ingredient description into structured data."""
    token, err_resp, code = require_token()
    if err_resp:
        return err_resp, code

    data = request.get_json()
    if not data or 'text' not in data:
        return jsonify({"error": "请输入食材描述"}), 400

    text = data['text'].strip()
    if not text:
        return jsonify({"error": "输入内容为空"}), 400

    try:
        raw = call_deepseek(token, PARSE_TEXT_SYSTEM, text, temperature=0.3, max_tokens=1024)
        result = extract_json_from_response(raw)
        if not isinstance(result, list):
            return jsonify({"error": "AI 解析结果格式异常"}), 500
        # Enrich with purchase/expiry dates
        today = datetime.now()
        for item in result:
            offset = int(item.get('purchase_date_offset_days', 0) or 0)
            purchase_day = today + timedelta(days=offset)
            item['purchase_date'] = purchase_day.strftime('%Y-%m-%d')
            days = item.get('typical_expiry_days', 7)
            item['expiry_date'] = (purchase_day + timedelta(days=int(days))).strftime('%Y-%m-%d')
            if 'quantity' not in item:
                item['quantity'] = 1
            if 'unit' not in item:
                item['unit'] = '个'
            if 'category' not in item:
                item['category'] = '其他'
            if 'emoji' not in item:
                item['emoji'] = '📦'
        return jsonify(result)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@ai_bp.route('/api/ai/recipes', methods=['POST'])
def generate_recipes():
    """Generate recipe suggestions based on available ingredients."""
    token, err_resp, code = require_token()
    if err_resp:
        return err_resp, code

    data = request.get_json()
    if not data:
        return jsonify({"error": "请求体为空"}), 400

    ingredients = data.get('ingredients', [])
    if not ingredients:
        # Fallback: load from database
        conn = get_db()
        rows = conn.execute("SELECT name, quantity, unit, emoji FROM ingredients").fetchall()
        conn.close()
        ingredients = [dict(r) for r in rows]

    people = data.get('people', 2)
    dish_count = data.get('dish_count', 3)
    cuisine_pref = data.get('cuisine_pref', '家常菜')
    strict_mode = data.get('strict_mode', False)
    required_names = data.get('required_ingredients', [])

    # Build ingredient list, marking required ones
    required_set = set(required_names)
    ingr_lines = []
    for i in ingredients:
        name = i.get('name', '')
        emoji = i.get('emoji', '')
        qty = i.get('quantity', '?')
        unit = i.get('unit', '个')
        req = i.get('required', False) or name in required_set
        tag = ' 【必选】' if req else ''
        ingr_lines.append(f"- {emoji} {name} ({qty}{unit}){tag}")

    ingr_text = "\n".join(ingr_lines)

    # Build must-include section
    required_text = ""
    if required_names:
        required_text = f"""
【硬性要求 - 每道菜必须包含以下食材】
{', '.join(required_names)}

以上食材必须在每一道菜中都出现！"""
    else:
        required_text = "\n（没有强制要求的食材，可自由搭配。）"

    # Build mode description
    if strict_mode:
        mode_text = "严格模式：只能使用冰箱已有食材（调味料除外），不能有 missing_ingredients"
    else:
        mode_text = "灵活模式：必须包含【必选】食材，其他食材可以建议额外购买"

    user_msg = f"""冰箱食材：
{ingr_text}
{required_text}

用餐人数：{people}人
需要菜品数量：{dish_count}道
口味偏好：{cuisine_pref}
{mode_text}

请根据以上信息推荐菜品。"""

    try:
        raw = call_deepseek(token, RECIPE_SYSTEM, user_msg, temperature=0.8, max_tokens=4096)
        result = extract_json_from_response(raw)
        if not isinstance(result, list):
            return jsonify({"error": "AI 生成结果格式异常"}), 500
        return jsonify(result)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@ai_bp.route('/api/ai/tips', methods=['POST'])
def get_tips():
    """Generate smart tips based on fridge contents."""
    token, err_resp, code = require_token()
    if err_resp:
        return err_resp, code

    data = request.get_json() or {}
    ingredients = data.get('ingredients', [])

    if not ingredients:
        # Load from database
        conn = get_db()
        rows = conn.execute("SELECT name, emoji, quantity, unit, expiry_date FROM ingredients").fetchall()
        conn.close()
        today = datetime.now().date()
        ingredients = []
        for r in rows:
            item = dict(r)
            try:
                expiry = datetime.strptime(item['expiry_date'], '%Y-%m-%d').date()
                remaining = (expiry - today).days
            except Exception:
                remaining = 7
            item['days_remaining'] = remaining
            ingredients.append(item)

    ingr_text = "\n".join(
        f"- {i.get('emoji','')} {i['name']} ({i.get('quantity','?')}{i.get('unit','个')})，"
        f"还有{i.get('days_remaining','?')}天过期"
        for i in ingredients
    )

    try:
        raw = call_deepseek(token, TIPS_SYSTEM, ingr_text, temperature=0.7, max_tokens=512)
        result = extract_json_from_response(raw)
        if not isinstance(result, dict):
            return jsonify({"error": "AI 生成结果格式异常"}), 500
        return jsonify(result)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
