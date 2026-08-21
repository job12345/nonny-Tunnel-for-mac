# ⚡ Nonny Tunnel & Nonny Swarm for Mac

เชื่อมต่อ **ChatGPT** กับ **โฟลเดอร์โปรเจกต์ในเครื่อง Mac** ได้อย่างปลอดภัย และสั่งงาน **ทีม Multi-Agent AI (ผู้จัดการ + พนักงาน)** พร้อมหน้าแดชบอร์ด Kanban และ Live Chat ดูการทำงานร่วมกันแบบเรียลไทม์

**พัฒนาโดย: mr.j**

🇬🇧 English: [README.md](README.md)

---

## 🌟 2 ระบบสุดทรงพลังในโปรเจกต์เดียว

### 1. 🔐 Nonny Tunnel (Secure MCP Tunnel)
สะพานเชื่อมต่อ ChatGPT กับเครื่อง Mac ผ่าน **OpenAI Secure MCP Tunnel** โดยไม่ต้องเปิดพอร์ตหรือเปิดเซิร์ฟเวอร์สู่สาธารณะ
- เข้ารหัส API Key ใน **macOS Keychain** ปลอดภัย 100%
- หน้าเว็บแดชบอร์ดจัดการ Tunnel: `http://localhost:3847`
- โหมดเปิดเร็วพิเศษ: `./start.sh --fast` (<1 วินาที)

### 2. 👥 Nonny Swarm (ระบบทีม AI อัจฉริยะแบบอัตโนมัติ)
เปลี่ยน AI ให้กลายเป็นทีมพัฒนาซอฟต์แวร์เต็มรูปแบบ:
- 🧠 **AI Manager (ผู้จัดการ)**: วางแผนระบบ แตก Task ย่อยลง Kanban Board และคอยตรวจโค้ด
- 🤖 **ChatGPT Web Workers (พนักงาน)**: แบ่งหน้าที่เขียน Frontend, Backend, Database, และรันเทสต์ผ่าน Nonny Tunnel
- 📊 **หน้า Swarm Dashboard สุดพรีเมียม (`http://localhost:3847/swarm`)**:
  - **📌 Live Kanban Board**: แตกการ์ดและขยับสถานะงานอัตโนมัติ (Backlog ➔ Coding ➔ Review ➔ Completed)
  - **💬 Inter-Agent Live Chat Feed**: หน้าต่างแชทดูบทสนทนาจริง ว่าผู้จัดการสั่งอะไร พนักงานตอบอะไร และตรวจงานอย่างไร
  - **🤖 Worker Fleet Monitor**: มอนิเตอร์สถานะพนักงานแต่ละตัวแบบ Real-time

---

## สถาปัตยกรรมระบบ (Architecture)

```
                            [ 👤 สั่งโจทย์ใหญ่ใน Dashboard ]
                                          │
                                          ▼
       ┌─────────────────────────────────────────────────────────────┐
       │  🧠 Manager Engine (Gemini / OpenAI / Ollama / Smart Plan)  │
       │  - แตกโจทย์เป็น Tickets ลง Kanban                           │
       │  - มอบหมายงานให้ Worker แต่ละตัว                             │
       │  - รีวิวโค้ดและประเมินผลงาน                                  │
       └──────────────┬───────────────────────────────┬──────────────┘
                      │ Real-time Event Stream (SSE)  │
                      ▼                               ▼
       ┌──────────────────────────────┐┌──────────────────────────────┐
       │ 🤖 Worker 1 (Frontend & UI)  ││ 🤖 Worker 2 (Backend & Logic)│
       │ (ChatGPT Web + Nonny Tunnel) ││ (ChatGPT Web + Nonny Tunnel) │
       │ - เขียน UI Components & CSS  ││ - เขียน API & Database Schema│
       └──────────────────────────────┘└──────────────────────────────┘
```

---

## เริ่มต้นใช้งาน (Quick Start)

### 1. ติดตั้ง

```bash
git clone https://github.com/job12345/nonny-Tunnel-for-mac.git
cd nonny-Tunnel-for-mac
./setup.sh
```

### 2. เข้าใช้งานแดชบอร์ด

- 🔐 **หน้าจัดการ Tunnel & Credentials**: [http://localhost:3847](http://localhost:3847)
- 👥 **หน้า Multi-Agent Swarm Dashboard**: [http://localhost:3847/swarm](http://localhost:3847/swarm)

---

## ความปลอดภัย (Security)

- **API Key** เข้ารหัสใน **macOS Keychain** ของผู้ใช้ปัจจุบัน ไม่มีการบันทึก Plaintext
- **Git Safe**: ข้อมูลความลับและ Token ทั้งหมดถูกแยกใน `.gitignore` เรียบร้อย

---

## License

MIT License — ดูรายละเอียดที่ไฟล์ [LICENSE](LICENSE)

**สร้างสรรค์ด้วย ⚡ โดย mr.j**
