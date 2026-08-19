# ⚡ Nonny Tunnel for Mac

เชื่อมต่อ **ChatGPT** กับ **โฟลเดอร์โปรเจกต์ในเครื่อง Mac (Local Workspace)** ได้อย่างปลอดภัย โดยไม่ต้องเปิดพอร์ตหรือเปิด MCP Server สู่สาธารณะ

**พัฒนาโดย: mr.j**

🇬🇧 English: [README.md](README.md)

---

## Nonny Tunnel คืออะไร?

Nonny Tunnel เป็นเครื่องมือเชื่อมต่อ ChatGPT เข้ากับไฟล์หรือโปรเจกต์ในเครื่อง Mac ของคุณผ่าน **OpenAI Secure MCP Tunnel** ทำให้ ChatGPT สามารถอ่านโค้ด แก้ไขไฟล์ จัดการโปรเจกต์ในเครื่องได้โดยตรงและปลอดภัยผ่านช่องทางเข้ารหัส

```
ChatGPT (Cloud)
    │
    ▼
OpenAI Secure MCP Tunnel (Cloud)
    │  เข้ารหัสความปลอดภัย
    ▼
tunnel-client (ในเครื่อง Mac ของคุณ)
    │  stdio
    ▼
MCP Server (ทำงานในเครื่อง)
    │
    ▼
โฟลเดอร์โปรเจกต์ของคุณ
```

### จุดเด่น
- 🍎 **ออกแบบมาเพื่อ macOS โดยเฉพาะ** — รองรับทั้ง Apple Silicon (M1/M2/M3/M4) และชิป Intel
- 🔐 **ปลอดภัยสูงสุด** — เก็บ API Key ใน **macOS Keychain** (ไม่บันทึกเป็น Plaintext)
- 🖥 **มีหน้า Web Setup UI** — จัดการ ตั้งค่า และดูสถานะผ่านเบราว์เซอร์อย่างสวยงาม
- 📦 **ติดตั้งง่ายในคำสั่งเดียว** — ดาวน์โหลด `tunnel-client` เวอร์ชันล่าสุดอัตโนมัติพร้อมตรวจ Checksum
- 📋 **Live Logs** — ดูการทำงานแบบเรียลไทม์ผ่านหน้าเว็บ
- 🚀 **ใช้งานง่ายทุกวัน** — รัน `./start.sh` พร้อมทำงานทันที

---

## สิ่งที่ต้องเตรียมก่อนใช้งาน (Requirements)

| รายการ | วิธีติดตั้ง / เตรียม |
|---|---|
| macOS 10.15+ | — |
| Node.js 18+ | `brew install node` หรือ [nodejs.org](https://nodejs.org) |
| uv | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| MCP Server | `uv tool install -p 3.13 serena-agent && serena init` |
| OpenAI Tunnel ID | สร้างได้ที่ [OpenAI Platform Tunnels](https://platform.openai.com/settings/organization/tunnels) |
| OpenAI Runtime API Key | สร้าง Key ที่มีสิทธิ์ **Tunnels Read + Use** |
| ChatGPT Developer Mode | เปิดใช้งานใน Workspace ของคุณ |

---

## เริ่มต้นใช้งาน (Quick Start)

### 1. โคลนโปรเจกต์

```bash
git clone https://github.com/job12345/nonny-Tunnel-for-mac.git
cd nonny-Tunnel-for-mac
```

### 2. รัน Setup ครั้งแรก

```bash
./setup.sh
```

สคริปต์จะทำงานดังนี้:
1. ✅ ตรวจสอบโปรแกรมที่จำเป็น (curl, uv, MCP Server, Node.js)
2. 📱 ตรวจจับสถาปัตยกรรมเครื่อง Mac ของคุณ (Apple Silicon หรือ Intel)
3. ⬇️ ดาวน์โหลด `tunnel-client` ตัวล่าสุดจาก GitHub
4. 🔒 ตรวจสอบความถูกต้องไฟล์ด้วย SHA-256
5. 🌐 เปิดหน้า **Web Setup UI** ที่ `http://localhost:3847` ให้อัตโนมัติ

### 3. ตั้งค่าผ่าน Web UI

หน้าเว็บแบ่งออกเป็น 3 ขั้นตอน:
- **① Prerequisites** — ตรวจสอบความพร้อมของระบบ
- **② Configuration** — กรอก Tunnel ID และ OpenAI Runtime API Key (ระบบจะเซฟลง Keychain อัตโนมัติ)
- **③ Tunnel** — กด Start เพื่อเริ่ม Tunnel และดู Log แบบเรียลไทม์

### 4. การใช้งานในแต่ละวัน (Daily Use)

เมื่อตั้งค่าเสร็จแล้ว ในวันถัดๆ ไป เพียงรันคำสั่ง:

```bash
./start.sh
```

หรือถ้าต้องการเปลี่ยน Tunnel ID / API Key ให้รัน:

```bash
./configure.sh
```

### 5. เชื่อมต่อใน ChatGPT

1. เข้าไปที่ [ChatGPT Plugins](https://chatgpt.com/plugins)
2. กดปุ่ม **+** เพื่อสร้าง Developer-mode App
3. เลือกการเชื่อมต่อแบบ **Tunnel**
4. เลือก Tunnel ของคุณ หรือใส่ Tunnel ID
5. เริ่มคุยกับ ChatGPT ได้ทันที โดยพิมพ์สั่ง เช่น:

```
Activate the project /Users/username/my-project, then show the current configuration.
```

---

## โครงสร้างไฟล์ในโปรเจกต์

```
nonny-Tunnel-for-mac/
├── setup.sh              # สคริปต์ติดตั้งครั้งแรก
├── configure.sh          # สคริปต์เปิดหน้าตั้งค่า credentials
├── start.sh              # สคริปต์เริ่มทำงาน Tunnel
├── profiles/
│   └── nonny-tunnel.yaml # Template การตั้งค่า Profile
├── config/
│   ├── README.md
│   └── team.env          # เก็บ Tunnel ID (ไม่ถูก commit ขึ้น git)
├── web-ui/
│   ├── package.json
│   ├── server.js         # Backend Express API
│   └── public/
│       └── index.html    # หน้า Dashboard UI
├── .gitignore
├── README.md             # คู่มือภาษาอังกฤษ
├── README.th.md          # คู่มือภาษาไทย
└── LICENSE
```

---

## ความปลอดภัย (Security)

- **API Key** จะถูกเข้ารหัสและบันทึกลงใน **macOS Keychain** ของผู้ใช้ปัจจุบันเท่านั้น
- **Tunnel ID** ถูกเก็บแยกไว้ที่ `config/team.env`
- ไฟล์ที่เป็นความลับทั้งหมดถูกเพิ่มใน `.gitignore` เรียบร้อยแล้ว จะไม่หลุดขึ้น GitHub แน่นอน
- ⚠️ **คำแนะนำ**: อย่าใช้ Admin API Key เด็ดขาด ให้ใช้ **Runtime API Key** ที่มีสิทธิ์เฉพาะ Tunnel เท่านั้น

---

## แก้ไขปัญหาเบื้องต้น (Troubleshooting)

### หา MCP Server ไม่เจอ
```bash
uv tool install -p 3.13 serena-agent
serena init
```

### ไม่พบ tunnel-client
```bash
./setup.sh
```

### Tunnel รันไม่ติด / Preflight Failed
- ตรวจสอบว่า API Key ถูกต้อง และมีสิทธิ์ `Tunnels Read + Use`
- ตรวจสอบว่า Tunnel ID ตรงกับ Organization / Workspace ใน OpenAI
- ตรวจสอบ log ในหน้าต่าง Terminal

---

## License

MIT License — ดูรายละเอียดที่ไฟล์ [LICENSE](LICENSE)

---

**สร้างสรรค์ด้วย ⚡ โดย mr.j**
