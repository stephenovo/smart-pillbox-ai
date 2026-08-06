# Codex Prompt：Smart Pillbox AI 硬件 MVP 与现有软件集成

## 你的角色

你正在协助完成 **IFF 2026 — Smart Pillbox AI** 项目的硬件 MVP 集成。

请先完整检查当前仓库的目录结构、已有页面、数据模型、API Route、状态管理方式，以及与硬件模拟相关的代码，再开始修改。特别搜索以下关键词：

- `hardwareSimulation`
- `Pillbox`
- `Dashboard`
- `Initialisation`
- `EventLog`
- `adherence`
- `caregiver`
- `slot`
- `device`

不要重写现有项目，也不要破坏已经可以运行的软件 Demo。应在现有架构上增加真实 ESP32 硬件入口，并继续保留现有的软件模拟能力。

---

# 1. 项目背景

Smart Pillbox AI 是一个面向老年人、慢性病患者及其照护者的 AIoT 用药安全系统。

系统由三层组成：

1. **Pillbox Device**
   - 正确药格 LED 指引
   - 蜂鸣器提醒
   - 干簧管开盖检测
   - OLED 本地信息显示
   - ESP32-S3 Wi-Fi 数据上传

2. **Medication Safety Control System**
   - 由规则逻辑判断：On-Time、Delayed、Missed、Duplicate Risk、Wrong Slot
   - 这部分不是 AI

3. **AI Helper System**
   - 学习用户正常的响应延迟习惯
   - 推荐 Continue Reminder、Second Reminder 或 Caregiver Alert
   - 生成 caregiver insight、weekly report 和 clinic-visit note

## 重要产品边界

- AI **不决定**服药时间。
- AI **不决定**药物或剂量。
- Medication schedule、high-risk flag 和 buffer time 由 caregiver 或医护人员初始化。
- 硬件检测的是 **compartment access / lid-opening event**，不是证明患者已经吞服药物。
- 规则引擎负责安全分类；AI 只负责 adherence pattern learning 和 caregiver insights。

---

# 2. 已确认的 MVP 硬件

我们已经按照以下硬件方案准备材料。请基于这些部件开发，不要默认存在未列出的传感器或扩展板。

## 主控制与供电

- ESP32-S3 DevKitC，Type-C 接口 × 2
- Type-C 数据线 × 2
- 5V 2A USB 电源适配器 × 1
- MVP 使用 USB 供电，不使用锂电池

## 八格开盖检测

- 常开型干簧管传感器模块，三针、带数字输出 DO、支持 3.3V × 10
- 钕铁硼圆片磁铁：5×2 mm 与 6×2 mm
- 3D 打印的 4×2 八格药盒
- 每个独立盒盖内安装一个磁铁
- 每个格子对应一个干簧管模块

## 灯光与声音

- 5 mm 高亮绿色 LED：每格一个，共 8 个，另有备用
- 公共红色 LED：用于 wrong-slot / error 提示
- 220Ω 或 330Ω 电阻
- 3.3V/5V 有源蜂鸣器模块，高电平触发
- 0.96 英寸 OLED，SSD1306、I²C、4 针、128×64

## 接线与原型结构

- MB-102 面包板
- 公对公、公对母、母对母杜邦线
- 28AWG 多色软硅胶线
- 洞洞板/万能板
- 3D 打印 4×2 八格药盒主体及独立盒盖

## 本 MVP 明确不使用

- MCP23017
- WS2812B
- 74AHCT125
- 18650 电池
- TP4056
- MT3608
- 舵机或电子锁
- 称重传感器
- 摄像头
- 麦克风
- RTC 模块
- 触摸屏
- 定制 PCB

---

# 3. MVP 最终演示目标

完整演示必须证明以下链路真实连通：

```text
Caregiver 初始化
    ↓
软件设置目标 Slot 与提醒时间
    ↓
ESP32 获取当前提醒状态
    ↓
正确 Slot 的绿色 LED 亮起
    ↓
蜂鸣器响起，OLED 显示应打开的 Slot
    ↓
用户打开盒盖
    ↓
干簧管检测真实开盖事件
    ↓
ESP32 通过 Wi-Fi 上传事件
    ↓
Dashboard 实时出现新的 Event Log
    ↓
规则系统更新 On-Time / Delayed / Wrong Slot 等状态
    ↓
AI adherence analysis 与 caregiver insight 使用该事件
```

## 必须演示的场景

### 场景 A：Caregiver 初始化

在现有 Initialisation 页面设置类似：

```text
Patient: Demo Patient
Slot: 3
Medication: Blood Pressure Medication
Scheduled Time: 当前时间后 30 秒
High Risk: Yes
Buffer Time: 30 min
```

### 场景 B：正确药格提醒

到达提醒时间后：

- Slot 3 绿色 LED 亮起
- 蜂鸣器响起
- OLED 显示：

```text
MEDICATION TIME
OPEN SLOT 3
```

### 场景 C：打开正确药格

用户打开 Slot 3 后：

- 干簧管检测到从 closed 到 open 的状态变化
- 蜂鸣器停止
- Slot 3 LED 熄灭
- OLED 显示：

```text
SLOT 3 OPENED
EVENT UPLOADED
```

- ESP32 上传真实事件
- Dashboard Event Log 出现该事件

### 场景 D：错误药格警告

当 active slot 是 Slot 3 时，故意打开 Slot 5：

- 公共红色 LED 亮起约 2 秒
- 蜂鸣器产生与正常提醒不同的错误提示
- OLED 显示：

```text
WRONG SLOT
OPEN SLOT 3
```

- Dashboard 记录 `wrong_slot_open` 或等价事件
- 正常提醒继续，直到正确 Slot 被打开

### 场景 E：Dashboard 与 AI

在真实开盖事件上传后：

- Event Log 新增记录
- 显示真实打开的 slot 和时间
- 显示事件来源为 `hardware`
- 规则系统更新 On-Time / Delayed 等分类
- 现有 Dashboard、Adherence Analysis 和 AI Insight 继续正常工作

延迟、Missed Dose、Reminder Escalation 可以继续使用现有 Demo Mode 快速模拟，不要求现场真实等待 20–30 分钟。

---

# 4. 实现原则

## 4.1 先完成单格垂直闭环

虽然最终结构是 8 格，但请把开发和调试顺序设计成：

1. 单个干簧管
2. 单个绿色 LED
3. 蜂鸣器
4. OLED
5. Wi-Fi 上传
6. Dashboard 显示真实事件
7. 再扩展到 8 格

代码结构必须从一开始支持 8 格数组配置，但文档要明确说明可以只启用 Slot 1 进行首次测试。

## 4.2 保留软件模拟

现有 hardware simulation 仍然要保留，用于：

- 没有连接 ESP32 时演示完整软件
- 快速模拟 Delayed / Missed / Duplicate Risk
- 自动测试

真实硬件事件和模拟事件必须使用相同的核心数据模型及规则分析流程，只通过 `source` 字段区分：

```ts
source: "hardware" | "simulation"
```

## 4.3 不进行大规模重构

- 不要重做现有 UI
- 不要替换现有状态管理方案，除非它确实阻止硬件集成
- 不要引入云数据库
- 不要引入 WebSocket，除非仓库本身已在使用
- 本地 Demo 优先，使用简单、稳定、容易解释的方案
- 不要为了“架构优雅”增加大量依赖

---

# 5. 建议的数据模型

请先检查仓库是否已有可复用类型。如果已有，优先扩展已有类型，不要重复创建冲突模型。

建议统一硬件和模拟事件：

```ts
export type PillboxEventType =
  | "lid_open"
  | "lid_close"
  | "wrong_slot_open"
  | "device_online"
  | "device_offline";

export interface PillboxDeviceEvent {
  id: string;
  deviceId: string;
  slotId?: number;
  eventType: PillboxEventType;
  source: "hardware" | "simulation";
  deviceTimestamp?: string;
  receivedAt: string;
  activeSlotAtEvent?: number | null;
  metadata?: Record<string, unknown>;
}
```

事件最少应支持：

```json
{
  "deviceId": "PILLBOX-DEMO-001",
  "slotId": 3,
  "eventType": "lid_open",
  "source": "hardware",
  "deviceTimestamp": "2026-08-02T15:30:00Z"
}
```

服务器必须生成可信的 `receivedAt`，即使 ESP32 的时间未同步也能正确记录事件。

---

# 6. 必需的 API

请先检查是否已经存在类似 API。如果已有，应复用或扩展，不要创建重复端点。

## 6.1 ESP32 上传事件

建议：

```http
POST /api/device-events
Content-Type: application/json
X-Device-Key: <optional-demo-key>
```

请求示例：

```json
{
  "deviceId": "PILLBOX-DEMO-001",
  "slotId": 3,
  "eventType": "lid_open",
  "deviceTimestamp": "2026-08-02T15:30:00Z"
}
```

响应示例：

```json
{
  "ok": true,
  "event": {
    "id": "...",
    "source": "hardware",
    "receivedAt": "..."
  }
}
```

要求：

- 验证 `slotId` 必须在 1–8
- 验证允许的 `eventType`
- 不信任客户端传入的 `source`，硬件入口统一在服务器标记为 `hardware`
- 返回清晰错误信息
- 相同格子因传感器抖动产生的短时间重复事件应被固件防抖；服务端可再提供轻量去重保护

## 6.2 ESP32 获取当前提醒状态

建议提供简单轮询端点：

```http
GET /api/device-state?deviceId=PILLBOX-DEMO-001
```

建议响应：

```json
{
  "deviceId": "PILLBOX-DEMO-001",
  "status": "idle",
  "activeSlot": null,
  "scheduledAt": null,
  "message": "No active reminder",
  "serverTime": "2026-08-02T15:30:00Z"
}
```

提醒中：

```json
{
  "deviceId": "PILLBOX-DEMO-001",
  "status": "reminding",
  "activeSlot": 3,
  "scheduledAt": "2026-08-02T15:31:00Z",
  "message": "Open Slot 3",
  "serverTime": "2026-08-02T15:31:05Z"
}
```

ESP32 每 1–2 秒轮询一次即可。MVP 不需要 WebSocket。

## 6.3 Dashboard 获取新事件

优先复用现有数据流。如果目前没有服务端事件入口，可增加：

```http
GET /api/device-events?deviceId=PILLBOX-DEMO-001&limit=50
```

Dashboard 可以每 1 秒轮询一次，或者使用仓库已有的刷新机制。

本地 Demo 不要求云数据库。如果仓库没有持久化层，可实现一个清晰标记为 `demo-only` 的本地存储方案，但必须避免把临时实现伪装成生产级数据库。

---

# 7. ESP32 固件要求

请在仓库内新增清晰独立的固件目录，例如：

```text
firmware/
  smart-pillbox-mvp/
    smart-pillbox-mvp.ino
    config.example.h
    config.h              # 应加入 .gitignore，避免提交 Wi-Fi 密码
    README.md
```

如果当前仓库已有 `firmware` 或 `hardware` 目录，请沿用已有结构。

## 7.1 开发环境

优先提供 **Arduino IDE 可直接打开的 `.ino` 固件**，因为硬件团队是初学者。

不要强制迁移到 PlatformIO，除非仓库已经使用 PlatformIO。

## 7.2 固件必须包含

- 连接 Wi-Fi
- OLED 初始化
- 8 路干簧管数字输入
- 8 路绿色 LED 输出
- 1 路公共红色 LED 输出
- 1 路有源蜂鸣器输出
- 轮询 `/api/device-state`
- 根据 `activeSlot` 控制正确格 LED 和蜂鸣器
- 检测盒盖从 closed 到 open 的边沿事件
- 传感器防抖
- 打开正确格后上传 `lid_open`
- 打开错误格后上传 `wrong_slot_open`
- 错误格不会关闭正常提醒
- 串口输出清晰日志
- 网络失败时不阻塞传感器检测
- 上传失败时至少进行有限次数重试

## 7.3 引脚配置

不要把引脚散落写在代码各处。集中放在配置区，例如：

```cpp
const uint8_t REED_PINS[8] = { /* update after wiring */ };
const uint8_t GREEN_LED_PINS[8] = { /* update after wiring */ };
const uint8_t RED_LED_PIN = ...;
const uint8_t BUZZER_PIN = ...;
const uint8_t OLED_SDA_PIN = ...;
const uint8_t OLED_SCL_PIN = ...;
```

请为 ESP32-S3 DevKitC 选择合理默认 GPIO，并在文档中明确：

- 哪些针脚被使用
- 哪些针脚不要使用
- 所有模块必须共地
- LED 必须串联 220Ω 或 330Ω 电阻
- 实际引脚如与所购开发板版本不同，可在一处修改

不要假设存在 MCP23017。

## 7.4 干簧管逻辑

所购物料为常开型、带 DO 的干簧管模块，但不同模块可能出现输出逻辑相反的问题。

请提供单一配置常量：

```cpp
const int REED_CLOSED_LEVEL = LOW; // may need to change to HIGH
```

固件通过该常量判断盒盖状态，README 必须说明如何通过串口测试并确认实际逻辑。

要求：

- 防抖建议 50–100 ms
- 只在状态从 closed 转为 open 时上传一次事件
- 盒盖持续打开时不能反复上传
- 重新关闭后才允许下一次 open 事件

## 7.5 OLED 状态

至少支持以下状态：

```text
SMART PILLBOX
CONNECTING WIFI
```

```text
READY
NO REMINDER
```

```text
MEDICATION TIME
OPEN SLOT 3
```

```text
WRONG SLOT 5
OPEN SLOT 3
```

```text
SLOT 3 OPENED
UPLOADED
```

```text
UPLOAD FAILED
RETRYING
```

## 7.6 本地服务器地址

ESP32 不能访问电脑的 `localhost`。

请在 `config.example.h` 中提供：

```cpp
#define WIFI_SSID "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define SERVER_BASE_URL "http://192.168.x.x:3000"
#define DEVICE_ID "PILLBOX-DEMO-001"
#define DEVICE_API_KEY "change-me"
```

并在文档中解释：

- Mac/电脑与 ESP32 必须连接同一 Wi-Fi
- Next.js 开发服务器必须监听局域网，例如 `0.0.0.0`
- 用户需要把 `SERVER_BASE_URL` 改成电脑的局域网 IP
- 不能填写 `http://localhost:3000`

---

# 8. 前端需要增加或确认的内容

请保持现有设计风格，只做必要扩展。

## 8.1 硬件连接状态

在 Sidebar、Pillbox 页面或现有合适位置显示：

- Device ID
- `Connected / Offline / Never Connected`
- Last event time
- Event source

连接状态可根据最近一次硬件事件或 heartbeat 推导，不需要复杂 IoT 平台。

## 8.2 Hardware Demo Control

为了比赛现场稳定，增加一个小型 Demo Control，不要替代正常 Initialisation 流程。

建议包括：

- 选择 Active Slot：1–8
- `Start Hardware Reminder`
- `Stop / Reset Reminder`
- 当前 device state
- 最近一次 hardware event

正常演示仍可从 medication schedule 触发；Demo Control 作为现场备份，避免等待或时间同步问题。

## 8.3 Event Log

每条事件至少显示：

- 时间
- Slot
- Event type
- Source：Hardware / Simulation
- 分类结果（若已有）
- Device ID

真实硬件事件必须进入现有 Safety Control 和 Adherence Analysis 流程，不能只显示在独立的调试面板中。

---

# 9. 推荐实现顺序

请按以下阶段实施，并在每个阶段结束后确保项目仍可运行。

## Phase 0：检查现有仓库

输出一个简短计划，说明：

- 当前项目结构
- 现有事件模型
- 现有模拟硬件入口
- 需要修改的文件
- 计划如何避免重复逻辑

然后开始编码，不需要因为可从代码中解决的问题反复询问用户。

## Phase 1：统一事件模型

- 复用或扩展已有 Pillbox Event 类型
- 增加 `source`
- 确保现有模拟事件不失效

## Phase 2：设备 API

- `POST /api/device-events`
- `GET /api/device-state`
- 必要时增加 `GET /api/device-events`
- 参数验证、错误处理和最小测试

## Phase 3：Dashboard 集成

- 显示 hardware source
- 实时更新 Event Log
- 显示连接状态
- 增加 Hardware Demo Control

## Phase 4：单格固件

- Slot 1 干簧管
- Slot 1 LED
- 蜂鸣器
- OLED
- 上传事件

## Phase 5：扩展到八格

- 数组式配置 8 个输入与 8 个输出
- Wrong Slot 逻辑
- 防抖与重复事件保护

## Phase 6：文档与验证

- 接线表
- Arduino IDE 安装与库安装步骤
- Wi-Fi 与本地 IP 配置
- 单格测试步骤
- 八格扩展步骤
- 常见故障排查
- 现场 Demo 操作顺序

---

# 10. 必须新增的文档

建议新增：

```text
docs/HARDWARE_MVP_SETUP.md
```

文档必须适合零基础团队，包含：

1. 所需硬件清单
2. ESP32-S3 引脚接线表
3. 单格接线步骤
4. 八格接线步骤
5. 干簧管开关原理
6. LED 电阻说明
7. OLED I²C 接线
8. Arduino IDE 板卡与库安装
9. `config.h` 配置
10. 如何查看电脑局域网 IP
11. 如何让 Next.js 在局域网可访问
12. 如何上传固件
13. 如何看 Serial Monitor
14. 如何测试 closed/open 状态
15. 如何启动完整 Demo
16. 常见错误排查

还需提供一张文本形式的接线表，例如：

| Component | Slot | ESP32 GPIO | Power | Notes |
|---|---:|---:|---|---|
| Reed sensor DO | 1 | GPIO xx | 3.3V | Configurable logic |
| Green LED | 1 | GPIO xx | GPIO via 330Ω | Common GND |
| ... | ... | ... | ... | ... |

---

# 11. 验收标准

完成后必须满足：

## 软件

- `npm run build` 或仓库等价构建命令通过
- 现有 Dashboard 和模拟功能不被破坏
- 真实硬件和模拟事件进入同一数据与分析流程
- 事件可区分 `hardware` 与 `simulation`
- API 对无效 slot 和 event type 返回正确错误

## 固件

- 可在 Arduino IDE 编译
- Wi-Fi 失败时不会卡死整个程序
- 单格干簧管打开只产生一个事件
- 盒盖持续打开不会重复上传
- 关闭并再次打开后可再次产生事件
- 正确格开盖停止提醒
- 错误格开盖不会停止正确格提醒
- OLED 和串口均能显示当前状态

## 完整演示

1. 在网页选择 Slot 3 并启动提醒
2. ESP32 在 1–2 秒内获取 active slot
3. Slot 3 绿色 LED 亮，蜂鸣器响
4. 打开 Slot 5：显示 Wrong Slot，网页记录错误格事件
5. 打开 Slot 3：提醒停止
6. Dashboard 在数秒内出现真实硬件事件
7. Event Log 显示 Slot、时间、Device ID 和 Hardware Source
8. 现有 adherence classification / AI insight 可以使用该事件

---

# 12. 最终交付要求

完成后请提供：

1. 修改文件列表
2. 新增文件列表
3. 架构说明
4. API 说明
5. ESP32 引脚表
6. Arduino IDE 所需库清单
7. 从零启动软件的命令
8. 从零上传固件的步骤
9. 单格测试步骤
10. 八格扩展步骤
11. 现场 Demo 操作脚本
12. 仍需人工确认的事项，例如实际开发板 GPIO、干簧管输出逻辑、Wi-Fi IP

不要只生成伪代码。请实现可以运行的最小版本，并用仓库已有命令进行 lint、type-check、test 和 build；若某项命令不存在，请明确说明，而不是伪造执行结果。

---

# 13. 优先级

如果时间不足，请严格按以下优先级：

## P0：必须完成

- 单格 LED、蜂鸣器、干簧管
- ESP32 上传真实事件
- Dashboard 显示真实事件
- 正确格开盖停止提醒
- 保留模拟功能

## P1：高优先级

- 扩展至 8 格
- OLED 状态显示
- Wrong Slot 警告
- Device connection status

## P2：可后续完善

- 更漂亮的硬件控制 UI
- 更丰富的重试与离线队列
- 更完整的测试覆盖
- 洞洞板与外壳整理说明

本次目标是一个稳定、真实、可解释的 AIoT MVP，不是量产级医疗设备。
