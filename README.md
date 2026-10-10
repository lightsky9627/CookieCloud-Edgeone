# CookieCloud-Edgeone

腾讯云 **EdgeOne Pages** 版本的 [CookieCloud](https://github.com/easychen/CookieCloud) 服务端，支持 **Edge Functions（边缘函数）** 与 **Cloud Functions（Node 云函数）** 部署，具备低延迟、高并发、免运维等特性。

原生保留并集成了原版全部特性（包括最新版的双向算法与服务端密码解密支持），并附带现代化的官方 Landing Page。

---

## ✨ 特性

- ⚡ **全球边缘网络**：基于 EdgeOne 全球加速与边缘计算，平均响应延迟极低。
- 🔒 **端到端加密 & 双算法支持**：
  - 支持经典的 `legacy` 算法（OpenSSL EVP_BytesToKey / CryptoJS）。
  - 支持官方最新的 `aes-128-cbc-fixed` 算法（标准 AES-128-CBC + 固定 IV）。
- 🔑 **密码解密模式（原版新特性）**：
  - 支持向 `/get/:uuid` 发送包含 `{ "password": "..." }` 的 POST 请求，服务端直接返回明文 Cookie 列表，便于各类脚本、爬虫与自动化工具直接消费。
- 📦 **双存储引擎支持**：
  - **EdgeOne Pages Blob Storage**（默认，免额外配置绑定，强一致性存储）。
  - **EdgeOne KV 命名空间**（低延迟键值存储）。
  - **Memory 内存回退**（用于本地快速测试）。
- 🗜️ **自动 gzip 解压**：完整支持浏览器扩展默认发送的 Gzip 压缩请求体。
- 🌐 **自带完整前端 Landing Page**：集成 CookieCloud 官网，附带 AI Agent Skill 一键复制与使用指引。
- 🛡️ **边缘健壮性保证**：内置 `withRestoredBody` 处理，解决高并发下 POST body 预读被消费的问题。

---

## 🚀 部署指南

### 方式：使用 EdgeOne Pages 一键部署

1. Fork 本仓库或导入到你的 GitHub / Git 仓库。
2. 登录 [EdgeOne 控制台](https://console.cloud.tencent.com/edgeone/pages)（或国际站 [EdgeOne Makers](https://console.edgeone.ai/makers)）。
3. 新建 Pages 项目并选择关联该仓库：
   - **构建命令**：`npm run build`
   - **安装命令**：`npm install && cd web && npm install`
   - **输出目录**：`dist`
   - **Node.js 版本**：`22`

4. （可选）环境变量配置：
   | 变量名 | 说明 | 默认值 |
   | --- | --- | --- |
   | `STORAGE_DRIVER` | 存储驱动，可选 `blob`、`kv`、`memory` | `blob` |
   | `ENVIRONMENT` | 运行环境标识 | `production` |

5. 点击 **立即部署**。部署完成后，你即可获得一个类似 `https://your-project.edgeone.app` 的访问地址。

---

## 🔌 API 接口规范

完全兼容原版 CookieCloud API：

### 1. 更新 Cookie (`POST /update`)
接收并保存浏览器插件上传的加密 Cookie 数据。
- **Headers**:
  - `Content-Type: application/json`
  - `Content-Encoding: gzip`（可选，插件默认开启）
- **Body**:
  ```json
  {
    "uuid": "用户UUID",
    "encrypted": "密文字符串",
    "crypto_type": "aes-128-cbc-fixed"
  }
  ```
- **Response**:
  ```json
  { "action": "done" }
  ```

### 2. 获取加密 Cookie (`GET /get/:uuid`)
获取客户端加密后的密文数据。
- **Response**:
  ```json
  {
    "encrypted": "密文字符串",
    "crypto_type": "aes-128-cbc-fixed"
  }
  ```

### 3. 服务端解密获取明文 Cookie (`POST /get/:uuid`)
原版新功能：直接传递密码，由服务端解密后返回明文 JSON。
- **Body**:
  ```json
  {
    "password": "你的同步密码"
  }
  ```
- **Response**:
  ```json
  {
    "cookie_data": {
      "github.com": [...]
    },
    "local_storage_data": { ... }
  }
  ```

### 4. 健康检查 (`GET /health`)
- **Response**:
  ```json
  {
    "status": "OK",
    "timestamp": "2026-10-10T05:30:00.000Z",
    "uptime": 120,
    "storage": "EdgeOne Blob Storage"
  }
  ```

---

## 🛠 本地开发与测试

```bash
# 安装依赖
npm install
cd web && npm install && cd ..

# 运行单元测试
npm test

# 全量构建验证
npm run build
```

---

## 📄 开源许可

本项目遵循 [GPL-3.0 License](LICENSE)。致谢原版项目 [CookieCloud](https://github.com/easychen/CookieCloud)。
