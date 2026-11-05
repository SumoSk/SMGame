# SMCITY 🏙️

## 5.4.12

- Prevent opposing buildings from admitting vehicles into the same narrow-street merge simultaneously.
- Detect reciprocal physical locks between two cars leaving opposite driveways. After 6 continuous game minutes, return both to their respective parking bays and stagger their retries.
- Preserve the active trips and extend deadlines for time lost to the simulation deadlock; do not count the recovery as a failed mission.
- Enlarge the temporary "เว้นระยะจากบ้าน 1 ช่อง" warning without changing other game notifications.

## 5.4.11

- Enforce one genuinely empty road-free tile beside each home using rendered carriageway widths for small, medium and large roads.
- Validate both house placement/movement and new or widened roads, while allowing entrance streets at the front corners.
- Show the temporary "เว้นระยะจากบ้าน 1 ช่อง" toast once during invalid road drawing and on an invalid placement attempt.
- Preserve existing saves, road traffic and all other game features.

## 5.4.10

- Require one empty grid block separating each home's left and right parcel edges from roads, following rotation.
- Apply rules when placing/moving a home or adding/widening roads. Front driveways remain valid.
- Existing saved cities are not changed automatically.

## 5.4.9

- Keep starter-home exit queues inside the plot, serialize departures, and migrate saved parking paths.
- Verified six cars arriving, departing and returning in all four rotations beside a junction, including blocked roads and existing saves.
**เมืองที่การเดินทางมีความหมาย**

SMCITY เป็นเกมสร้างเมือง 3 มิติแนวจำลองการจราจร คุณเป็นคนวางถนน สร้างอาคาร และดูแลการเดินทางของประชาชนที่มีตารางชีวิตของตัวเอง ตั้งแต่ออกไปทำงาน ใช้บริการ พักผ่อน จนถึงกลับบ้าน

### สนุกกับอะไรได้บ้าง
- วางถนนและสร้างบ้าน ร้านค้า ที่ทำงาน และสถานที่พักผ่อน
- จัดการทางแยกและสัญญาณไฟ ให้การจราจรไหลลื่น
- ติดตามภารกิจการเดินทางและประสิทธิภาพของเมือง
- ขยายเมือง ต้อนรับนักท่องเที่ยว และอัปเกรดรถ

**[เข้าเล่น SMCITY](https://sumosk.github.io/SMGame/)**

เล่นผ่านเบราว์เซอร์ได้ทั้งคอมพิวเตอร์ แท็บเล็ต และมือถือ
