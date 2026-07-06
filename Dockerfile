# ============================================================
# chatgpt2api-plus — v1.7.0 + 注册机整合版
# 基于官方镜像 + 注册后端 + 导航原生注册入口
# 前端源码在 web/ 目录，导航 TopNav 已加入注册 tab
# ============================================================

FROM ghcr.io/basketikun/chatgpt2api:latest

# 注册管理前端页面（独立 HTML，零外部依赖）
COPY web_dist/ /app/web_dist/

# 整合后的 Python 源码（含注册机）
COPY api/ /app/api/
COPY services/ /app/services/
COPY utils/ /app/utils/
COPY main.py /app/main.py
COPY scripts/ /app/scripts/

# 保留前端源码到镜像（方便后续二次构建）
COPY web/ /app/web-src/

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

# 在编译好的 JS 导航栏中加入"注册"入口
RUN sed -i 's|{href:"/image",label:"生图"},{href:"/accounts",label:"号池管理"},{href:"/image-manager",label:"图片管理"}|{href:"/image",label:"生图"},{href:"/accounts",label:"号池管理"},{href:"/register",label:"注册"},{href:"/image-manager",label:"图片管理"}|' /app/web_dist/_next/static/chunks/0yr6d8ut74nyx.js \
  && grep -c 'register' /app/web_dist/_next/static/chunks/0yr6d8ut74nyx.js \
  && echo "Nav patched: register tab added to top-nav ✓"

CMD ["uv", "run", "python", "main.py"]
