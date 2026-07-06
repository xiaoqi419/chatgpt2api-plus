FROM ghcr.io/basketikun/chatgpt2api:latest AS base

# ============================================================
# chatgpt2api-plus — v1.7.0 + 注册机整合版
# 基于官方镜像，叠加注册功能代码
# ============================================================

# 复制整合后的 Python 源码（含注册机）
COPY api/ /app/api/
COPY services/ /app/services/
COPY utils/ /app/utils/
COPY main.py /app/main.py
COPY scripts/ /app/scripts/

# 复制注册管理前端页面
COPY web_dist/ /app/web_dist/

# 保持原镜像的入口
CMD ["uv", "run", "python", "main.py"]
