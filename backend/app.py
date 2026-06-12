"""
AI Fridge Manager — Flask Backend
Lightweight REST API for WeChat mini-program.
"""
import socket
from flask import Flask
from flask_cors import CORS
from models import init_db
from routes.ingredients import ingredients_bp
from routes.ai import ai_bp
from routes.stats import stats_bp


def get_lan_ip():
    """Get the PC's LAN IP address."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return None


def create_app():
    app = Flask(__name__)
    CORS(app)
    app.register_blueprint(ingredients_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(stats_bp)

    @app.route('/api/health')
    def health():
        return {"status": "ok", "message": "AI Fridge Manager API is running"}

    return app


if __name__ == '__main__':
    init_db()
    app = create_app()
    lan_ip = get_lan_ip()
    print("=" * 50)
    print("  AI Fridge Manager Backend")
    print("=" * 50)
    print(f"  本机访问:     http://127.0.0.1:5000")
    if lan_ip:
        print(f"  局域网访问:   http://{lan_ip}:5000")
        print(f"  (可在设置中填写此服务地址)")
    else:
        print(f"  (无法自动检测局域网IP, 请手动查看)")
    print(f"  Health check: http://127.0.0.1:5000/api/health")
    print("=" * 50)
    app.run(host='0.0.0.0', port=5000, debug=True)
