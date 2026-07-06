# ============================================================
# chatgpt2api-plus — v1.7.0 + 注册机整合版
# 前端完全从源码构建，注册入口原生集成无 hack
# ============================================================

# === 阶段一：构建前端 ===
FROM node:22-alpine AS web-builder

WORKDIR /app/web

# 安装依赖 (bun.lock = lockfile)
COPY web/package.json web/bun.lock ./
RUN npm install

# 构建前端 (需要 VERSION 文件)
COPY VERSION /app/VERSION
COPY web ./
ENV NEXT_PUBLIC_APP_VERSION="$(cat /app/VERSION)"
RUN npm run build

# === 阶段二：最终镜像 ===
FROM ghcr.io/basketikun/chatgpt2api:latest

# 替换为完整构建的前端产物（含 register 页面 + 原生导航入口）
COPY --from=web-builder /app/web/out /app/web_dist

# 整合后的 Python 源码（含注册机）
COPY api/ /app/api/
COPY services/ /app/services/
COPY utils/ /app/utils/
COPY main.py /app/main.py
COPY scripts/ /app/scripts/

# 保留前端源码到镜像（方便后续二次构建）
COPY web/ /app/web-src/

# 更新 Next.js 构建清单，添加 /register 路由（编译产物页）
RUN python3 << 'PYEOF'
import json, os
static_dir = "/app/web_dist/_next/static"
build_ids = [d for d in os.listdir(static_dir)
             if d not in ("chunks", "media") and os.path.isdir(os.path.join(static_dir, d))]
for bid in build_ids:
    manifest_path = os.path.join(static_dir, bid, "_buildManifest.js")
    with open(manifest_path) as f:
        content = f.read()
    prefix = "self.__BUILD_MANIFEST = "
    suffix = ";self.__BUILD_MANIFEST_CB"
    start = content.index(prefix) + len(prefix)
    end = content.index(suffix)
    manifest = json.loads(content[start:end])
    if "/register" not in manifest.get("sortedPages", []):
        manifest["sortedPages"].append("/register")
        manifest["sortedPages"] = sorted(manifest["sortedPages"])
        new_content = f'{prefix}{json.dumps(manifest)}{suffix} && self.__BUILD_MANIFEST_CB();'
        with open(manifest_path, "w") as f:
            f.write(new_content)
        print(f"Updated: {manifest_path} -> {manifest['sortedPages']}")
PYEOF

CMD ["uv", "run", "python", "main.py"]
