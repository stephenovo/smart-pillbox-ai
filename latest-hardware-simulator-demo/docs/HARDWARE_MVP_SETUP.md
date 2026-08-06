# Smart Pillbox AI 硬件 MVP 从零搭建手册

这份手册对应仓库中的 ESP32-S3 固件和 Next.js 硬件 API。第一次不要直接接八格；先完成 Slot 1 的完整闭环，再复制到其余七格。

> 本项目检测的是盒盖开合，不代表患者已经吞服药物。它是比赛演示用 MVP，不是量产医疗设备。

## 1. 最终系统怎么连接

```text
网页 Initialisation / Hardware reminder
                  |
                  v
        Next.js /api/hardware/state
                  |
            Wi-Fi 每 1.5 秒轮询
                  |
                  v
ESP32-S3 -> 绿色 Slot LED / 蜂鸣器 / OLED
   ^
   | 8 路干簧管检测盒盖
   |
   +---- POST /api/hardware/events ----> Dashboard Event Log
```

药盒正面统一编号：

```text
[ Slot 1 ] [ Slot 2 ] [ Slot 3 ] [ Slot 4 ]
[ Slot 5 ] [ Slot 6 ] [ Slot 7 ] [ Slot 8 ]
```

传感器固定在盒体，磁铁固定在对应盒盖。盒盖关闭时磁铁靠近传感器；盒盖打开时磁铁离开。

## 2. 本次要用的部件

- ESP32-S3 DevKitC 1 块，另 1 块作备用
- 三针常开干簧管模块 8 块，另 2 块作备用
- 圆片磁铁 8 块，先用 5x2 mm 测试，距离不稳定再试 6x2 mm
- 绿色 LED 8 个，每个配 220 ohm 或 330 ohm 电阻
- 红色 LED 1 个，配 220 ohm 或 330 ohm 电阻
- 高电平触发有源蜂鸣器模块 1 个
- SSD1306 I2C 128x64 OLED 1 个
- 面包板、杜邦线、USB 数据线、5V 2A USB 适配器
- 万用表、双面胶；焊接和热熔胶留到最后

## 3. ESP32-S3 引脚表

以下是固件的默认引脚。不同 DevKitC 批次的丝印和可用引脚可能不同，接线前必须对照你们手上的开发板 pinout。不要使用 GPIO 0、3、45、46 等启动配置脚，也不要占用 GPIO 19、20 的原生 USB。

| 部件 | Slot | ESP32 GPIO | 供电/另一端 | 说明 |
|---|---:|---:|---|---|
| 干簧管 DO | 1 | GPIO 4 | VCC=3.3V, GND=GND | 首次测试只接这一格 |
| 干簧管 DO | 2 | GPIO 5 | VCC=3.3V, GND=GND | |
| 干簧管 DO | 3 | GPIO 6 | VCC=3.3V, GND=GND | |
| 干簧管 DO | 4 | GPIO 7 | VCC=3.3V, GND=GND | |
| 干簧管 DO | 5 | GPIO 15 | VCC=3.3V, GND=GND | |
| 干簧管 DO | 6 | GPIO 16 | VCC=3.3V, GND=GND | |
| 干簧管 DO | 7 | GPIO 17 | VCC=3.3V, GND=GND | |
| 干簧管 DO | 8 | GPIO 18 | VCC=3.3V, GND=GND | |
| 绿色 LED 阳极 | 1 | GPIO 8 | 经 330 ohm；阴极接 GND | 电阻可放在阳极或阴极侧 |
| 绿色 LED 阳极 | 2 | GPIO 9 | 经 330 ohm；阴极接 GND | |
| 绿色 LED 阳极 | 3 | GPIO 10 | 经 330 ohm；阴极接 GND | |
| 绿色 LED 阳极 | 4 | GPIO 11 | 经 330 ohm；阴极接 GND | |
| 绿色 LED 阳极 | 5 | GPIO 12 | 经 330 ohm；阴极接 GND | |
| 绿色 LED 阳极 | 6 | GPIO 13 | 经 330 ohm；阴极接 GND | |
| 绿色 LED 阳极 | 7 | GPIO 14 | 经 330 ohm；阴极接 GND | |
| 绿色 LED 阳极 | 8 | GPIO 21 | 经 330 ohm；阴极接 GND | |
| 公共红色 LED 阳极 | - | GPIO 39 | 经 330 ohm；阴极接 GND | Wrong Slot 时亮约 2 秒 |
| 有源蜂鸣器 IN | - | GPIO 38 | 模块 VCC 按标示接 3.3V/5V，GND 共地 | 必须是带驱动的模块，不要用 GPIO 直接带大电流蜂鸣器 |
| OLED SDA | - | GPIO 41 | VCC=3.3V, GND=GND | I2C 地址默认 0x3C |
| OLED SCL | - | GPIO 42 | VCC=3.3V, GND=GND | |

所有模块必须共地。干簧管模块用 3.3V 供电，避免 DO 向 ESP32 输入 5V。LED 必须串联电阻，不能直接跨接 GPIO 和 GND。

## 4. 第一步：只让开发板工作

1. 暂时不要接任何模块。
2. 用确认可传数据的 Type-C 线连接电脑和 ESP32-S3。
3. 安装 Arduino IDE 2.x。
4. 打开 `Arduino IDE > Settings > Additional boards manager URLs`，加入：

   ```text
   https://espressif.github.io/arduino-esp32/package_esp32_index.json
   ```

5. 在 Boards Manager 搜索 `esp32 by Espressif Systems` 并安装。
6. 在 Library Manager 安装：`ArduinoJson`、`Adafruit GFX Library`、`Adafruit SSD1306`。
7. 选择开发板。如果列表有精确型号就选它；否则先选 `ESP32S3 Dev Module`。
8. 选择正确 USB Port，打开一个最简单的 Blink 示例确认可上传。

如果上传一直显示 Connecting，按住 BOOT，点一下 RESET，再松开 BOOT 后重新上传。不同板子的操作可能略有差异。

## 5. 第二步：单格干簧管

断开 USB 电源后接线：

1. 干簧管模块 `VCC` 接 ESP32 `3.3V`。
2. 干簧管模块 `GND` 接 ESP32 `GND`。
3. 干簧管模块 `DO` 接 `GPIO 4`。
4. 用双面胶临时把传感器贴在 Slot 1 盒体边缘。
5. 把磁铁临时贴在 Slot 1 盒盖内侧，关闭时正对传感器。

先不要用热熔胶。磁铁太近或太远都会让边沿不稳定，先移动位置，找到关闭稳定、打开也稳定的位置。

固件默认只有 Slot 1 传感器启用：

```cpp
const bool SLOT_ENABLED[8] = {
  true, false, false, false, false, false, false, false
};
```

上传固件后打开 Serial Monitor，波特率选 `115200`。启动时应该看到 Slot 1 是 `CLOSED`；打开盒盖后只出现一次 `OPEN`。如果关闭时显示 OPEN、打开时显示 CLOSED，把固件中的：

```cpp
constexpr int REED_CLOSED_LEVEL = LOW;
```

改为：

```cpp
constexpr int REED_CLOSED_LEVEL = HIGH;
```

持续开着盒盖时不应重复产生事件；关上以后再打开，才应产生第二次事件。

## 6. 第三步：单格 LED 和蜂鸣器

保持断电接线：

1. 绿色 LED 长脚是阳极，接 `GPIO 8`。
2. LED 短脚是阴极，串联 330 ohm 电阻后接 GND。电阻放阳极侧也可以。
3. 蜂鸣器模块 `IN` 接 `GPIO 38`。
4. 蜂鸣器模块 `GND` 接公共 GND。
5. 蜂鸣器模块 `VCC` 按模块标示接 3.3V 或 5V。先确认它是带驱动的模块。
6. 红色 LED 阳极接 `GPIO 39`，阴极经 330 ohm 接 GND。

网页启动 Slot 1 reminder 后，绿灯应亮，蜂鸣器应按慢节奏响。开正确格后两者停止。后续启用多格后，开错误格会触发快速声音和红灯。

## 7. 第四步：OLED

断电后连接：

- OLED `GND` -> ESP32 `GND`
- OLED `VCC` -> ESP32 `3.3V`
- OLED `SDA` -> `GPIO 41`
- OLED `SCL` -> `GPIO 42`

上电后应先显示 `SMART PILLBOX / CONNECTING WIFI`。如果 Serial Monitor 显示 `SSD1306 not found`：

1. 检查 SDA/SCL 是否接反。
2. 检查模块地址是否是 `0x3C`；少数模块为 `0x3D`。
3. 用 Arduino IDE 的 I2C Scanner 示例确认地址，再改 `OLED_ADDRESS`。

## 8. 第五步：配置 Wi-Fi 和网页

进入固件文件夹：

```text
hardware/esp32-s3/smart_pillbox_demo/
```

复制 `config.example.h`，把副本命名为 `config.h`，修改：

```cpp
#define WIFI_SSID "你们的 Wi-Fi 名称"
#define WIFI_PASSWORD "你们的 Wi-Fi 密码"
#define SERVER_BASE_URL "http://电脑局域网IP:3000"
#define DEVICE_ID "PILLBOX-DEMO-001"
```

Mac 查询 Wi-Fi IP：

```bash
ipconfig getifaddr en0
```

如果没有输出，再试 `ipconfig getifaddr en1`。Windows 用 `ipconfig`，找无线网卡的 IPv4 Address。

`SERVER_BASE_URL` 不能写 `localhost` 或 `127.0.0.1`，因为对 ESP32 来说那代表 ESP32 自己。

在项目根目录启动网页：

```bash
npm install
npm run dev -- -H 0.0.0.0 -p 3000
```

先用同一 Wi-Fi 下的手机打开 `http://电脑局域网IP:3000`。手机能打开，ESP32 才有机会访问。macOS 防火墙如果弹窗，要允许 Node 接收入站连接。

## 9. 第六步：烧录和单格闭环

1. 在 Arduino IDE 打开 `smart_pillbox_demo.ino`。
2. 确认 `config.h` 和 `.ino` 在同一文件夹。
3. 点击 Verify；通过后点击 Upload。
4. 打开 Serial Monitor，确认出现 `[WiFi] Connected` 和 ESP32 IP。
5. 电脑浏览器打开网页，进入 `Pillbox`。
6. 在 `Hardware reminder` 选择 `Slot 1`，点击 `Start`。
7. 最迟约 2 秒后，Slot 1 绿灯亮、蜂鸣器响、OLED 显示 `OPEN SLOT 1`。
8. 打开 Slot 1。绿灯和蜂鸣器应立即停止。
9. OLED 依次显示 `UPLOADING`、`UPLOADED`。
10. 网页 Event history 和 Dashboard 的 Device Event Log 应在约 2.5 秒内出现 Hardware 事件。

只有这 10 步连续成功两次，才开始扩展第二格。

## 10. 第七步：扩展到八格

扩展顺序固定为 1 -> 2 -> 4 -> 8 格，每次只增加已经测试过的重复单元：

1. Slot 2 的 DO 接 GPIO 5，绿灯接 GPIO 9。
2. 在 `SLOT_ENABLED` 中把第二个值改为 `true`。
3. 分别关、开 Slot 1 和 Slot 2，确认串口格号没有串线。
4. 扩展到 Slot 3、4，再重复测试。
5. 最后接 Slot 5-8，把 `SLOT_ENABLED` 八项全部设为 `true`。
6. 给每组 DO 和 LED 信号线贴 Slot 编号标签。
7. 在网页启动 Slot 3，先故意开 Slot 5，再开 Slot 3，完成 Wrong Slot 验证。

最终配置：

```cpp
const bool SLOT_ENABLED[8] = {
  true, true, true, true, true, true, true, true
};
```

八格全部在面包板上连续运行 30 分钟且没有误报后，再转移到洞洞板。每转移一格就重新测试，不要一次焊完八格。

## 11. 初始化计划和自动提醒

`Initialisation` 页面点击 Save 后会把当前 8 格计划发送到 `/api/hardware/plan`。ESP32 轮询设备状态时，服务器会在计划的 `HH:mm` 到达时激活当天该 Slot 一次。

演示现场推荐使用 `Pillbox > Hardware reminder > Start` 立即触发，避免等待整分钟。计划触发仍然保留，用于展示正常流程。

## 12. API 快速检查

查看设备状态：

```bash
curl 'http://localhost:3000/api/hardware/state?deviceId=PILLBOX-DEMO-001'
```

启动 Slot 3：

```bash
curl -X POST http://localhost:3000/api/hardware/state \
  -H 'Content-Type: application/json' \
  -d '{"deviceId":"PILLBOX-DEMO-001","status":"reminding","activeSlot":3}'
```

模拟 ESP32 上传 Slot 5 错误开盖：

```bash
curl -X POST http://localhost:3000/api/hardware/events \
  -H 'Content-Type: application/json' \
  -d '{"deviceId":"PILLBOX-DEMO-001","slotId":5,"eventType":"wrong_slot_open","firmwareVersion":"manual-test"}'
```

再上传正确 Slot 3，设备状态应自动回到 idle：

```bash
curl -X POST http://localhost:3000/api/hardware/events \
  -H 'Content-Type: application/json' \
  -d '{"deviceId":"PILLBOX-DEMO-001","slotId":3,"eventType":"lid_open","firmwareVersion":"manual-test"}'
```

## 13. 常见故障

| 现象 | 优先检查 |
|---|---|
| ESP32 不上电 | USB 线是否只支持充电、端口是否选错 |
| Wi-Fi 一直离线 | 账号密码、2.4 GHz 网络、电脑和 ESP32 是否同网段 |
| 手机能开网页但 ESP32 不能 POST | `SERVER_BASE_URL`、macOS 防火墙、3000 端口 |
| 传感器状态相反 | 切换 `REED_CLOSED_LEVEL` LOW/HIGH |
| 一次开盖出现多条 | 磁铁位置、线材松动；服务端另有 1.5 秒去重 |
| 未接的格子乱报 | 对应 `SLOT_ENABLED` 必须保持 false |
| LED 不亮 | 长短脚方向、电阻是否串联、是否共地 |
| 蜂鸣器不响 | 是否为有源高电平模块、VCC 电压、IN 是否接 GPIO 38 |
| OLED 黑屏 | SDA/SCL、0x3C/0x3D 地址、供电和共地 |
| 网页一直 Never connected | 固件是否成功 GET `/api/hardware/state?...&heartbeat=1` |
| 事件在重启后仍异常消失 | 检查项目的 `.data/hardware-demo.json` 是否可写；它只是本地 demo 存储，不是生产数据库 |

## 14. 现场演示脚本

1. 启动 Next.js，确认手机和电脑页面都能打开。
2. 给 ESP32 供电，看 Serial Monitor 或 OLED 确认 READY。
3. 网页 Initialisation 中确认 Slot 3 的药名、High Risk 和 buffer，点击 Save。
4. Pillbox 页面确认设备是 Connected。
5. Hardware reminder 选择 Slot 3 并 Start。
6. 指给观众看 Slot 3 绿灯、蜂鸣器和 OLED。
7. 先打开 Slot 5：红灯和快速声音出现，网页记录 Wrong Slot，Slot 3 提醒继续。
8. 关闭 Slot 5，再打开 Slot 3：提醒立即停止，OLED 显示 Uploaded。
9. 切到 Dashboard，展示事件来源、Device ID 和规则分类。
10. 需要演示 Delayed、Missed 或 Duplicate Risk 时，使用 Software fallback，不等待真实时间。

## 15. 搭结构时最后确认

- 盒盖关闭后磁铁不会碰撞传感器板。
- 每个磁铁都粘牢，且不会被相邻格传感器误触发。
- ESP32、面包板/洞洞板和 USB 接口放在患者不接触药物的一侧。
- 走线留出盒盖活动余量，并做拉力释放。
- 所有槽号同时贴在盒盖、传感器线和 LED 线上。
- 留出 ESP32 RESET/BOOT、USB 和 OLED 的检修空间。
