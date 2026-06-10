# AI 冰箱管家 — AI Refrigerator Manager

大语言模型理论与应用 期末大作业

一个基于微信小程序的 AI 智能冰箱管理系统。通过自然语言对话或标签选择录入食材，AI 自动解析并管理库存，提供保质期提醒、智能菜谱推荐和食材浪费统计。

## 功能特性

- 💬 **智能对话输入** — 像聊天一样说"今天买了三个番茄两斤排骨"，AI 自动识别并入库
- 🏷️ **快速标签选择** — 50+ 预定义食材标签，按分类快速录入
- 🏠 **卡通冰箱可视化** — 食材以可爱卡通卡片散落在冰箱中，新鲜度光环一目了然
- 🔔 **保质期智能提醒** — 自动计算新鲜度，绿/黄/红三色预警
- 🍳 **AI 菜谱推荐** — 基于现有食材，DeepSeek 生成个性化菜谱
- 📊 **浪费统计分析** — 记录食材浪费，按原因/月度/食材分类统计
- 🔒 **Token 隐私保护** — API Token 仅保存在用户手机本地，不上传服务器

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | 微信小程序原生框架 |
| 后端 | Python Flask + SQLite |
| AI | DeepSeek API (deepseek-chat) |
| 环境管理 | Conda |

## 项目结构

```
test02/
├── backend/                 # Flask 后端
│   ├── app.py              # 主入口
│   ├── models.py           # 数据库模型 + 预置标签
│   ├── routes/
│   │   ├── ingredients.py  # 食材 CRUD
│   │   ├── ai.py           # AI 接口
│   │   └── stats.py        # 统计接口
│   ├── services/
│   │   └── deepseek.py     # DeepSeek API 封装
│   └── requirements.txt
├── miniprogram/             # 微信小程序
│   ├── app.js / app.json / app.wxss
│   ├── utils/
│   │   ├── api.js          # HTTP 请求封装
│   │   └── util.js         # 工具函数
│   ├── pages/
│   │   ├── index/          # 🏠 冰箱首页
│   │   ├── ingredients/    # 📋 食材清单
│   │   ├── add/            # ➕ 添加食材
│   │   ├── detail/         # 食材详情/编辑
│   │   ├── recipes/        # 🍳 智能菜谱
│   │   ├── settings/       # ⚙️ 设置
│   │   └── stats/          # 📊 浪费统计
│   └── components/
│       └── custom-tab-bar/ # 自定义底部导航
└── README.md
```

## 运行步骤

### 1. 创建 Conda 环境并安装依赖

打开终端，进入项目目录：

```bash
cd D:\homework\大语言模型理论与应用\test02

# 创建环境
conda create -n llm_finalwork python=3.10 -y

# 激活环境
conda activate llm_finalwork

# 安装依赖
cd backend
pip install flask flask-cors requests
```

### 2. 启动后端服务

```bash
# 确保在 backend 目录下，环境已激活
conda activate llm_finalwork
cd D:\homework\大语言模型理论与应用\test02\backend
python app.py
```

看到以下输出表示启动成功：
```
🍳 AI Fridge Manager Backend
📍 Running at: http://127.0.0.1:5000
📋 Health check: http://127.0.0.1:5000/api/health
```

### 3. 配置微信开发者工具

1. 下载并安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 打开工具，选择「导入项目」
3. 项目目录选择：`D:\homework\大语言模型理论与应用\test02\miniprogram`
4. AppID 选择「测试号」或填入你的 AppID
5. 点击「确定」

### 4. 配置 API Token

1. 访问 [platform.deepseek.com](https://platform.deepseek.com) 注册并获取 API Key
2. 在小程序中，点击冰箱首页的「⚙️ 设置」或通过食材清单页进入设置
3. 输入你的 DeepSeek API Token（以 sk- 开头）
4. 点击「保存 Token」
5. 确认后端地址为 `http://127.0.0.1:5000`（默认）

### 5. 开始使用

1. **添加食材** — 点击冰箱首页的「➕ 添加食材」
   - 💬 智能输入：说"今天买了三个番茄、两斤排骨"
   - 🏷️ 快速选择：从预置标签中选择
2. **查看冰箱** — 回到首页看到卡通食材卡片
3. **生成菜谱** — 切换到「智能菜谱」tab，选择人数和偏好，AI 生成推荐
4. **管理食材** — 点击食材查看详情、编辑或标记用完
5. **查看统计** — 了解食材浪费情况

## 注意事项

1. **后端地址**：小程序默认连接 `http://127.0.0.1:5000`，如需修改请在设置中更改
2. **网络要求**：手机预览时需要确保手机和电脑在同一局域网，并将后端地址改为电脑 IP
3. **API Token**：Token 仅保存在手机本地存储中，每次 AI 请求时通过请求头传给后端，后端使用后即丢弃，不会存储
4. **微信开发者工具**：开发时需在工具中设置「不校验合法域名」（设置 → 项目设置 → 本地设置）
