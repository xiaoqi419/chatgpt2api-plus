FROM ghcr.io/basketikun/chatgpt2api:latest

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

# 更新 Next.js 构建清单，添加 /register 路由
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

# 保持原镜像的入口
CMD ["uv", "run", "python", "main.py"]

# 注入注册导航到设置页面
COPY web_dist/settings/index.html /app/web_dist/settings/index.html
