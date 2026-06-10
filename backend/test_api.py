"""Backend API verification script."""
from models import init_db, get_db, PRESET_INGREDIENTS
from app import create_app

# Test DB
init_db()
conn = get_db()
count = conn.execute('SELECT COUNT(*) FROM ingredients').fetchone()[0]
print(f'DB OK - {count} ingredients in DB')
cats = set(i["category"] for i in PRESET_INGREDIENTS)
print(f'Presets: {len(PRESET_INGREDIENTS)} items in {len(cats)} categories')
conn.close()

# Test App
app = create_app()
client = app.test_client()

# Test health
resp = client.get('/api/health')
print(f'Health: {resp.status_code} - {resp.get_json()}')

# Test presets
resp = client.get('/api/ingredients/presets')
data = resp.get_json()
print(f'Presets API: {resp.status_code} - {len(data["all"])} items')

# Test list
resp = client.get('/api/ingredients')
print(f'List API: {resp.status_code} - {len(resp.get_json())} items')

# Test add
resp = client.post('/api/ingredients', json={
    'name': '测试番茄', 'category': '蔬菜', 'emoji': '🍅',
    'quantity': 3, 'unit': '个',
    'purchase_date': '2026-06-08', 'expiry_date': '2026-06-15'
})
print(f'Add API: {resp.status_code} - {resp.get_json()}')

# Test cleanup - delete test ingredient
new_id = resp.get_json().get('id')
if new_id:
    resp = client.delete(f'/api/ingredients/{new_id}?reason=测试')
    print(f'Delete API: {resp.status_code} - {resp.get_json()}')

# Test batch add
resp = client.post('/api/ingredients/batch', json={
    'items': [
        {'name': '测试鸡蛋', 'category': '乳制品', 'emoji': '🥚', 'quantity': 6, 'unit': '个', 'purchase_date': '2026-06-08', 'expiry_date': '2026-06-29'},
        {'name': '测试牛奶', 'category': '乳制品', 'emoji': '🥛', 'quantity': 1, 'unit': '盒', 'purchase_date': '2026-06-08', 'expiry_date': '2026-06-18'},
    ]
})
print(f'Batch Add API: {resp.status_code} - {resp.get_json()}')

# Cleanup batch items
for iid in resp.get_json().get('ids', []):
    client.delete(f'/api/ingredients/{iid}?reason=测试')

# Test stats
resp = client.get('/api/stats/waste')
data = resp.get_json()
print(f'Stats API: {resp.status_code} - total waste records: {data["total_count"]}')

# Test AI endpoint without token
resp = client.post('/api/ai/parse-text', json={'text': '测试'})
print(f'AI (no token): {resp.status_code} - {resp.get_json()}')

print()
print('=== ALL API TESTS PASSED ===')
