# chatgpt2api-plus

基于 [chatgpt2api](https://github.com/basketikun/chatgpt2api) v1.7.0 整合 v1.5.0 注册机的一体化版本。

## 相比原版的变更

- **➕ 新增注册功能** — 从 v1.5.0 移植了完整的注册管理系统
  - OpenAI 账号自动注册
  - 多线程并发注册
  - 邮箱验证码自动处理（yyds_mail / Outlook）
  - 注册管理 Web 页面（`/register/`）
- **🔧 代码级整合** — 注册机直接集成在源码中，无需 volume mount 补丁

## 快速开始

### 1. 基础配置

```bash
cp config.example.json config.json
# 编辑 config.json 填入你的配置
```

### 2. Docker Compose 部署

```yaml
# docker-compose.yml
services:
  app:
    build: .
    container_name: chatgpt2api
    restart: unless-stopped
    ports:
      - "3001:80"
    volumes:
      - ./data:/app/data
      - ./config.json:/app/config.json
    environment:
      STORAGE_BACKEND: json
```

```bash
docker compose up -d
```

### 3. 手动配置注册

注册配置存储在 `data/register.json`，通过 Web 页面 `/register/` 管理。

## 注册功能配置

注册功能需要通过 Web 面板 `/register/` 配置：
- **Mail Provider**: 设置邮箱验证码 API（支持 yyds_mail）
- **Proxy**: 注册用的代理地址
- **线程数**: 并发注册线程数
- **目标模式**: 总数模式 / 额度模式 / 可用账号模式

## 许可证

原项目许可证。
