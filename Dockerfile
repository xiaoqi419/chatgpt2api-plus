# ============================================================
# chatgpt2api-plus — v1.7.0 + 注册机整合版
# 前端从源码构建（主机上执行 npm run build）
# 注册入口原生集成（top-nav.tsx 源代码已加 /register）
# ============================================================

FROM ghcr.io/basketikun/chatgpt2api:latest

# 替换为完整构建的前端产物（含 /register 页面 + 原生导航入口）
COPY web_dist/ /app/web_dist/

# 整合后的 Python 源码（含注册机）
COPY api/ /app/api/
COPY services/ /app/services/
COPY utils/ /app/utils/
COPY main.py /app/main.py
COPY scripts/ /app/scripts/

# 保留前端源码到镜像（方便后续二次构建）
COPY web/ /app/web-src/

CMD ["uv", "run", "python", "main.py"]
