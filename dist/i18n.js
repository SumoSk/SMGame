/* SMCITY bilingual presentation layer.
   The game keeps its Thai data, simulation state and saves unchanged.
   Only visible DOM text and accessibility labels are translated.
   Mutation batches run only in English mode (never in the 3D render loop). */
(function(){
 'use strict';
 const STORAGE='smcity-ui-language-v1';
 const TH=/[\u0E00-\u0E7F]/;
 const pairs=[
 ['ภาษาไทย','Thai'],['ภาษาอังกฤษ','English'],
 ['SMCITY เวอร์ชัน','SMCITY version'],['เมืองที่ทุกการเดินทางมีความหมาย','A city where every journey matters'],
 ['สร้างเมืองไทย วางถนน และแก้ปัญหาจราจรจากชีวิตประชาชนแต่ละคน','Build a city, connect roads, and solve real-life traffic challenges'],
 ['ทุกการเดินทาง เริ่มจากเมืองที่คุณสร้าง','Every journey begins with the city you build'],
 ['สร้างเมืองในแบบคุณ','Build your city'],['สร้างเมือง','Build City'],
 ['แผนที่เมือง ลากเพื่อเลื่อน เลือกเครื่องมือเพื่อสร้างถนนและอาคาร','City map: drag to pan; select a tool to build roads and buildings'],
 ['เครื่องมือด่วนด้านซ้าย','Quick tools on the left'],['โหมดด่วนของเมือง','City quick modes'],
 ['บัญชีและเซฟเกม','Account and Saves'],['บัญชีผู้ใช้และเข้าสู่ระบบ','Account and Sign In'],
 ['บัญชีผู้ใช้ / เข้าสู่ระบบ','Account / Sign In'],['บัญชีผู้ใช้','Account'],['เข้าสู่ระบบ','Sign In'],
 ['กราฟิก','Graphics'],['ตั้งค่ากราฟิก','Graphics Settings'],
 ['กลับเมนูหลัก','Main Menu'],['เมนูหลัก','Main Menu'],['กลับไปเล่น','Back to Game'],
 ['เริ่มเล่น','Start Playing'],['เริ่มเมืองใหม่','New City'],['เลือกเมือง','Choose a City'],['ยกเลิก','Cancel'],['ยืนยัน','Confirm'],['เข้าใจแล้ว','Got It'],['ตกลง','OK'],
 ['บันทึกเมือง','Save City'],['บันทึกเกม','Save Game'],['เซป/โหลด','Save / Load'],['เซฟ/โหลด','Save / Load'],
 ['บันทึกเป็นเซฟใหม่','Save as New'],['บันทึก','Save'],['โหลดเมือง','Load City'],['โหลด','Load'],['เขียนทับ','Overwrite'],['ลบเซฟ','Delete Save'],
 ['ลบ','Delete'],['แก้ไข','Edit'],['รีเฟรช','Refresh'],['ย้อนกลับ','Back'],['ดูเพิ่มเติม','More Details'],
 ['ปิดหน้าต่าง','Close Window'],['ปิดรายละเอียด','Close Details'],['ปิดรายงาน','Close Report'],
 ['ดูรายงานเมื่อวาน','Yesterday’s Report'],['ดูวันนี้','View Today'],['รายงานเมือง','City Report'],
 ['สรุปเมืองรายวัน','Daily City Report'],['รายวัน','Daily'],['สรุปวันใหม่','New Day Summary'],
 ['เปิดถึง 10:00 น.','Available until 10:00'],['ตรวจเมือง / รายงานบัค','City Diagnostics / Bug Report'],
 ['ดาวน์โหลดรายงานเมือง','Download City Report'],['รายงานบัค','Bug Report'],
 ['รายงานการเดินทาง','Travel Report'],['ดู Log รายงาน','View Incident Log'],
 ['แสดงปุ่ม','Show Button'],['ซ่อนปุ่ม','Hide Button'],
 ['แผงควบคุมเมือง','City Controls'],['ความต้องการของเมือง','City Needs'],['ภาพรวมเมือง','City Overview'],
 ['ตัวชี้วัดของเมือง','City Indicators'],['ผู้ช่วยเมือง','City Assistant'],
 ['กำลังตรวจความต้องการ','Checking City Needs'],['ที่ปรึกษาเมือง','City Advisor'],
 ['มาดูเมืองของเรากันค่ะ','Let’s look at your city'],['สิ่งที่ไปได้ดี','What’s Going Well'],
 ['เรื่องที่ควรดูแล','Needs Attention'],['ทำอะไรก่อนดี','What to Do Next'],
 ['ปิดคำแนะนำชั่วคราว','Dismiss Suggestion'],['ซ่อนคำแนะนำชั่วคราว','Hide Suggestion'],
 ['ควบคุมมุมก้มเงยกล้อง','Camera Pitch Controls'],['คืนมุมกล้องพื้นฐาน','Reset Camera View'],
 ['มุมก้มเงยกล้อง','Camera Pitch'],['จอยควบคุมมุมกล้อง 3D','3D Camera Controls'],
 ['เงยกล้อง มองจากมุมสูงขึ้น','Raise Camera Angle'],['ก้มกล้อง มองจากมุมต่ำลง','Lower Camera Angle'],
 ['หมุนกล้องซ้าย','Rotate Camera Left'],['หมุนกล้องขวา','Rotate Camera Right'],
 ['คืนค่ามุมกล้องเริ่มต้น','Reset Camera to Default'],['รีเซ็ตมุมกล้อง','Reset Camera'],
 ['หมุนซ้าย','Rotate Left'],['หมุนขวา','Rotate Right'],['มุมสูงขึ้น','Higher Angle'],['มุมต่ำลง','Lower Angle'],
 ['คลิกซ้ายและขวาพร้อมกันเพื่อหมุนจอ','Hold left and right mouse buttons to rotate the camera'],
 ['เวลา ความเร็ว และการแสดงผลเมือง','Time, Speed, and Display'],
 ['วัน วันที่ และเวลาในเกม','Game Day, Date, and Time'],
 ['หยุดหรือเล่นต่อ','Pause / Resume'],['ข้ามไปเช้าวันใหม่','Skip to Next Morning'],['ข้ามวัน','Skip Day'],
 ['ตัวเลือกการแสดงผล','Display Options'],['เปิดป้ายอาคารบนแผนที่','Show Building Labels'],
 ['ซ่อนหรือแสดงชื่อและตัวเลขบนป้ายอาคาร','Toggle building names and values'],
 ['เปิดป้าย','Show Labels'],['ปิดป้าย','Hide Labels'],['สถานะรถ','Vehicle Status'],
 ['แสดงสถานะรถใกล้สายหรือสายแล้ว','Show vehicles that are running late'],
 ['แสดงสถานะรถ','Show Vehicle Status'],['ใกล้สาย','Running Late'],['สายแล้ว','Late'],
 ['เปิดธีมดำตัวหนังสือขาว','Enable Dark Theme'],['สลับธีมดำ / ธีมปกติ','Switch Dark / Light Theme'],
 ['ขาว/ดำ','Light / Dark'],['หุบแถบเครื่องมือ','Collapse Toolbar'],
 ['กางแถบเครื่องมือ','Expand Toolbar'],['หุบเครื่องมือ','Collapse Tools'],['กางเครื่องมือ','Expand Tools'],
 ['จัดการอาคารที่เลือก','Manage Selected Building'],['ย้ายอาคาร','Move Building'],['รื้อถอนอาคาร','Demolish Building'],
 ['รื้อถอนถนนและอาคาร','Demolish Roads and Buildings'],['รื้อถอน','Demolish'],['ย้าย','Move'],
 ['ยกเลิกย้ายอาคาร','Cancel Building Move'],['หมุน 90°','Rotate 90°'],
 ['งบประมาณ — ดูรายละเอียด','Budget — View Details'],['ประชาชน — ดูรายละเอียด','Citizens — View Details'],
 ['นักท่องเที่ยว — ดูรายละเอียด','Tourists — View Details'],['ความสุข — ดูรายละเอียด','Happiness — View Details'],
 ['การจราจร — ดูรายละเอียด','Traffic — View Details'],
 ['งบประมาณ','Budget'],['เงินคงเหลือ','Remaining Funds'],['เงินต้นวัน','Starting Balance'],
 ['รายได้','Income'],['รายรับ','Revenue'],['ค่าใช้จ่าย','Expenses'],['ค่าดูแลเมือง','City Maintenance'],
 ['ค่าดูแล / วัน','Maintenance / Day'],['ค่าดูแล','Maintenance'],['ค่าก่อสร้าง','Construction Cost'],
 ['ราคาติดตั้ง','Installation Cost'],['งบประมาณหลังซื้อ','Budget After Purchase'],
 ['ความสุขเฉลี่ย','Average Happiness'],['ความสุข','Happiness'],['คุณภาพชีวิต','Quality of Life'],
 ['การจราจร','Traffic'],['จราจร','Traffic'],['ประชากร','Population'],['ประชาชน','Citizens'],
 ['นักท่องเที่ยว','Tourists'],['นักท่องเที่ยวในเมือง','Tourists in City'],
 ['รายได้ท่องเที่ยววันนี้','Tourism Revenue Today'],
 ['แดชบอร์ดประชาชน','Citizen Dashboard'],['แดชบอร์ดชีวิตประชาชน','Citizen Life Dashboard'],
 ['ชีวิตประชาชน','Citizen Life'],['ปิดแดชบอร์ดประชาชน','Close Citizen Dashboard'],
 ['ปิดรายชื่อนักท่องเที่ยว','Close Tourists'],['ค้นหาประชาชน','Search Citizens'],
 ['ค้นหานักท่องเที่ยว','Search Tourists'],['ชื่อหรือหมายเลขประชาชน','Citizen Name or ID'],
 ['ชื่อหรือหมายเลขนักท่องเที่ยว','Tourist Name or ID'],['กรองประชาชน','Filter Citizens'],
 ['กรองสถานะนักท่องเที่ยว','Filter Tourist Status'],
 ['ผู้เล่น','Player'],['ผู้สร้าง','Creator'],['ข้อมูลล่าสุดจาก Supabase','Latest data from Supabase'],
 ['ออนไลน์','Online'],['กำลังเล่น','Playing'],['จำนวนผู้เล่น','Number of Players'],['อุปกรณ์','Device'],
 ['เวลาเล่น','Play Time'],['โหลดเมืองสด','Load Live City'],['ดูเมืองสด','View Live City'],
 ['สถานะ','Status'],['ล่าสุด','Latest'],['ทั้งหมด','All'],
 ['ไม่มีความสุข','Unhappy'],['วิกฤต','Critical'],['มีปัญหา','Issues'],
 ['ไม่มีงาน','Unemployed'],['ว่างงาน','Unemployed'],['กำลังเดินทาง','Traveling'],
 ['สาย / พลาดงาน','Late / Missed Work'],['กำลังย้ายเข้า','Moving In'],
 ['เตรียมย้ายออก','Preparing to Leave'],['ย้ายเข้าใหม่','New Arrivals'],['ย้ายออก / ถูกนำออก','Departures / Removals'],
 ['บ้านเริ่มต้น','Starter Home'],['บ้านรุ่นเก่า 2 คน','Legacy Home (2 people)'],
 ['บ้านรุ่นเก่า 10 คน','Legacy Home (10 people)'],['บ้านเล็ก','Small Home'],['บ้านกลาง','Medium Home'],['บ้านใหญ่','Large Home'],
 ['ร้านค้าเล็ก','Small Shop'],['ร้านค้ากลาง','Medium Shop'],['ร้านค้าใหญ่','Large Shop'],
 ['ร้านอาหารเล็ก','Small Restaurant'],['ร้านอาหารกลาง','Medium Restaurant'],['ร้านอาหารใหญ่','Large Restaurant'],
 ['ห้างเล็ก','Small Mall'],['ห้างกลาง','Medium Mall'],['ห้างใหญ่','Large Mall'],
 ['สำนักงานเล็ก','Small Office'],['สำนักงานกลาง','Medium Office'],['สำนักงานใหญ่','Large Office'],
 ['โรงงานเล็ก','Small Factory'],['โรงงานกลาง','Medium Factory'],['โรงงานใหญ่','Large Factory'],
 ['สวนเล็ก','Small Park'],['สวนกลาง','Medium Park'],['สวนใหญ่','Large Park'],
 ['โรงแรมเล็ก','Small Hotel'],['โรงแรมกลาง','Medium Hotel'],['โรงแรมใหญ่','Large Hotel'],
 ['คาสิโนเล็ก','Small Casino'],['คาสิโนกลาง','Medium Casino'],['คาสิโนใหญ่','Large Casino'],
 ['ผับเล็ก','Small Club'],['ผับกลาง','Medium Club'],['ผับใหญ่','Large Club'],
 ['บ้าน','Homes'],['ร้านค้า','Shops'],['ร้านอาหาร','Restaurants'],['ห้าง','Malls'],['สำนักงาน','Offices'],
 ['โรงงาน','Factories'],['สวน','Parks'],['โรงแรม','Hotels'],['คาสิโน','Casino'],['ผับ','Clubs'],
 ['งานและโรงงาน','Work & Industry'],['ร้านค้าและอาหาร','Shops & Food'],['พักผ่อน','Leisure'],
 ['ต้นไม้และตกแต่ง','Landscaping'],['ต้นไม้และของตกแต่ง','Trees & Decorations'],
 ['ถนน','Roads'],['ถนนเล็ก','Small Road'],['ถนนกลาง','Medium Road'],['ถนนใหญ่','Large Road'],
 ['ถนนหลัก','Main Road'],['ทางแยก','Junction'],['ไฟจราจร','Traffic Lights'],['ไฟแดง','Red Light'],
 ['ควบคุมไฟจราจร','Traffic Light Control'],['ควบคุมไฟแยกนี้','Control This Junction'],
 ['ความหนาแน่นจราจร','Traffic Congestion'],['รถติด','Congestion'],
 ['อัปเกรดรถของประชาชน','Upgrade Citizen Vehicles'],['อัปเกรดรถ','Vehicle Upgrade'],
 ['อัปเกรด!','Upgrade!'],['อัปเกรด','Upgrade'],['ซื้อ','Buy'],['ซื้อตอนนี้','Buy Now'],
 ['อัปเกรดทางแยก AI','Upgrade to AI Junction'],['ระบบควบคุมสัญญาณจราจรอัจฉริยะ','Smart Traffic Signal Control'],
 ['ติดตั้งระบบ AI 1 แยก','Install AI at One Junction'],['ยืนยันการติดตั้ง','Confirm Installation'],
 ['งบประมาณไม่เพียงพอค่ะ','Insufficient Funds'],['แยกที่เลือก','Selected Junction'],
 ['เลือก','Select'],['เลือกบ้าน','Select Home'],['เลือกอาคาร','Select Building'],
 ['โควต้าสร้างได้อีก','Remaining Build Quota'],['ยังสร้าง','Cannot Build '],
 ['สร้างตึกขั้นก่อนหน้า 1 ตึก จะได้สิทธิ์สร้างตึกนี้ 1 ตึกค่ะ','Build one lower-tier building to unlock one of this tier.'],
 ['ต้องสร้าง','Build '],['เพื่อปลดล็อก',' to unlock '],['เพิ่มอีก',' more'],['ไม่ได้',' unavailable'],
 ['สร้าง','Build'],['ก่อสร้าง','Construct'],['พื้นที่รวมลานจอด','Footprint Including Parking'],
 ['จำนวนที่จอดรถ','Parking Spaces'],['ที่จอด','Parking'],['ช่องจอด','Parking Space'],
 ['ค่าก่อสร้างถนน','Road Construction Cost'],['ขนาด','Size'],['ราคา','Price'],
 ['จอดปกติ','Parked'],['รถจอด','Parked Vehicles'],['รอออก','Waiting to Exit'],
 ['กำลังเดินทางมา','Approaching'],['ผู้อยู่อาศัย','Residents'],['พนักงาน','Employees'],
 ['ผู้ใช้บริการ','Customers'],['จองที่พัก','Room Reservations'],['เปิดบริการ','Opening Hours'],
 ['สถานที่ปิดบริการ','Venue Closed'],['กำลังพักโรงแรม','Staying at Hotel'],
 ['จองเดินทางมา','Reservations En Route'],['รอเส้นทาง','Waiting for Route'],
 ['กำลังเดินทาง','On the Way'],['กำลังไป','Heading to'],['กลับบ้าน','Going Home'],
 ['ไปทำงาน','Going to Work'],['ทำงาน','Working'],['อยู่ที่ทำงาน','At Work'],
 ['อยู่บ้าน','At Home'],['พักโรงแรม','Hotel Stay'],
 ['เริ่มเดินทางรวม','Trips Started'],['ถึงจุดหมายจริง','Arrived at Destination'],
 ['ภารกิจสำเร็จ','Successful Trips'],['อัตราสำเร็จ','Success Rate'],
 ['ภารกิจไม่สำเร็จ','Failed Trips'],['เฉลี่ยต่อบล็อก','Average per Block'],
 ['รายรับที่บันทึกได้','Recorded Revenue'],['เงินเปลี่ยนสุทธิ','Net Cash Change'],
 ['ประชากรและนักท่องเที่ยว','Population & Tourism'],['ผลภารกิจทั้งหมด','All Trip Results'],
 ['การเงินและการก่อสร้าง','Finances & Construction'],['โครงสร้างเมืองและสภาพการจราจร','City Layout & Traffic'],
 ['ภารกิจตัดสินผลแล้ว','Completed Trip Evaluations'],['สำเร็จตามเป้าหมาย','Reached Target'],
 ['สำเร็จแต่สาย','Completed Late'],['ตรงเวลา','On Time'],['ไปไม่ทัน','Missed'],
 ['ไม่มีเส้นทาง / ใช้บริการไม่ได้','No Route / Unavailable Service'],
 ['ยกเลิกภารกิจ','Cancelled Trips'],['ยังเดินทางอยู่ ณ ตอนนี้','Currently Traveling'],
 ['เวลาเฉลี่ยเมื่อถึง','Average Arrival Time'],['ความเร็วเฉลี่ย','Average Travel Time per Block'],
 ['ระยะทางทริปที่มีผลและวัดได้','Measured Trip Distance'],['เฉลี่ยเวลารถติด','Average Congestion Delay'],
 ['รถที่มากที่สุดระหว่างวัน','Peak Vehicles'],['รถรอคิวสูงสุด','Peak Queued Vehicles'],
 ['รายได้ภาษีที่ปิดบัญชี','Settled Tax Revenue'],['รายได้ธุรกิจที่ปิดบัญชี','Settled Business Revenue'],
 ['รายได้จากนักท่องเที่ยว','Tourism Revenue'],['เงินคืน / ส่วนลดนักท่องเที่ยว','Tourism Refunds / Discounts'],
 ['เงินรางวัลแก้จราจร','Traffic Resolution Rewards'],['ปรับภาษีหลังปิดบัญชี','Tax Adjustments'],
 ['ก่อสร้างถนน','Roads Built'],['สร้างอาคาร','Buildings Built'],['อาคารสร้างใหม่','New Buildings'],
 ['อาคารรื้อถอน','Buildings Demolished'],['ยอดเงินสุทธิเปลี่ยน','Net Cash Change'],
 ['รายงานแสดงวันนี้และวันล่าสุด ไม่เก็บย้อนหลัง 7 วัน · ภาษีและรายได้ธุรกิจสรุปเมื่อจบวัน','The report covers today and yesterday only. Taxes and business income settle at the end of each day.'],
 ['วิธีอ่านรายงาน','How to Read This Report'],
 ['สรุปผลวันก่อนหน้า','Previous Day — Final'],['สถานะระหว่างวัน','Live Day — Updating'],
 ['รายงานเมือง','City Report'],['วันที่','Day'],['เวลาเกม','Game Time'],['วันก่อนหน้า','Previous Day'],
 ['วันจันทร์','Monday'],['วันอังคาร','Tuesday'],['วันพุธ','Wednesday'],['วันพฤหัสบดี','Thursday'],
 ['วันศุกร์','Friday'],['วันเสาร์','Saturday'],['วันอาทิตย์','Sunday'],
 ['จ.','Mon'],['อ.','Tue'],['พ.','Wed'],['พฤ.','Thu'],['ศ.','Fri'],['ส.','Sat'],['อา.','Sun'],
 ['ชั่วโมง','hours'],['นาทีในเกม','game minutes'],['วินาทีในเกม','game seconds'],
 ['วินาที/บล็อก','seconds/block'],['วินาที','seconds'],['นาที','minutes'],['วัน','day'],
 ['ต่อวัน','per day'],['คน','people'],['คัน','vehicles'],['เที่ยว','trips'],['บล็อก','blocks'],
 ['แห่ง','buildings'],['ช่อง','slots'],['ตึก','buildings'],['บาท','THB'],
 ['รถชน','Vehicle Collision'],['รถเสีย','Vehicle Breakdown'],['เหตุจราจร','Traffic Incident'],
 ['ช่วยเหลือ','Resolve'],['ดูเหตุการณ์','View Incident'],['เหตุการณ์','Incident'],
 ['ดูรถ','Inspect Vehicle'],['ลากรถออก','Tow Vehicle'],['ไม่ลบ','Keep'],
 ['ยืนยันการรื้อถอน','Confirm Demolition'],['รื้อถอนถนน','Demolish Road'],
 ['ควบคุมเอง','Manual Control'],['อัตโนมัติ','Automatic'],['อัจฉริยะ','Smart'],
 ['ทิศแนวนอน','East / West'],['ทิศแนวตั้ง','North / South'],
 ['เขียว','Green'],['เหลือง','Yellow'],['แดง','Red'],['แดงทุกทิศ','All Red'],
 ['ตั้งเวลาและควบคุมไฟ','Traffic Timing & Control'],['เวลาไฟเดิม','Current Light Timing'],
 ['รอสั่งสลับไฟ','Awaiting Phase Change'],['ไฟเหลือง','Yellow Light'],
 ['เส้นทางเดิมขาด','Route Disconnected'],['ไม่มีเส้นทาง','No Route'],
 ['รถคันหน้าขวาง','Vehicle Ahead Blocking'],['รถหยุดผิดปกติ','Unusual Vehicle Stop'],
 ['ลานจอดปลายทางเต็ม','Destination Parking Full'],['คิวแยก','Junction Queue'],
 ['รถทับซ้อนหรือแย่งช่องทาง','Vehicle Overlap / Lane Conflict'],
 ['รอเข้าเมือง','Waiting to Enter'],['เข้าชม 30 วัน','Visits (30 Days)'],
 ['เลือกผู้เล่นออนไลน์แล้วกด','Select an online player and tap'],
 ['อ่านสำเนาเซฟของบัญชีอื่น โดยไม่แก้ไขเซฟต้นฉบับ','Read a copy of another account’s save without changing the original.'],
 ['โหลดเซฟผู้เล่น','Load Player Saves'],['ค้นหาผู้เล่นหรือชื่อเซฟ','Search Player or Save Name'],
 ['ชื่อผู้เล่น / ชื่อเซฟ','Player / Save Name'],['เจ้าของเซฟ','Save Owner'],
 ['ชื่อเซฟ','Save Name'],['บันทึกล่าสุด','Last Saved'],['คำสั่ง','Actions'],
 ['ยังไม่มีนักท่องเที่ยวที่กำลังพักโรงแรม','No Tourists Currently Staying at Hotels'],
 ['อัตราความสุข','Happiness Rate'],['ใช้บริการอยู่','Using Services'],['พักโรงแรมอยู่','Staying at Hotels'],
 ['รอเข้าเมือง','Waiting to Enter City'],['รอกิจกรรม/กลับ','Awaiting Activity / Return'],
 ['จองห้องแต่ยังไม่พัก','Reserved, Not Checked In'],['กำลังนอนพัก','Sleeping'],
 ['ไม่มีตำแหน่งงาน','No Available Job'],['ดูชีวิตประชาชน','Inspect Citizen Life'],
 ['ดูข้อมูลประชาชน','View Citizen'],['ปิด','Close'],['เปิด','Open'],['กลับ','Return'],
 ['เพิ่ม','Add'],['ลด','Reduce'],['สูงมาก','Very High'],['กลาง','Medium'],['ต่ำ','Low'],
 ['ยังไม่มี','No '],['ไม่สำเร็จ','Failed'],['สำเร็จ','Success'],['กำลังบันทึก','Saving'],
 ['กรุณา','Please '],['ลองอีกครั้ง','Try Again'],['แล้วค่ะ',''],['ค่ะ','']
 ];
 const exact=new Map(pairs);
 // Long phrases always win over shorter building names/units in composite text.
 const ordered=[...pairs].sort((a,b)=>b[0].length-a[0].length);
 const cache=new Map();
 function translate(source){
  if(typeof source!=='string'||!TH.test(source))return source;
  const left=(source.match(/^\s*/)||[''])[0],right=(source.match(/\s*$/)||[''])[0],word=source.slice(left.length,source.length-right.length);
  if(!word)return source;
  if(cache.has(word))return left+cache.get(word)+right;
  let english=exact.get(word);
  if(english==null){
   english=word;
   for(const [th,en] of ordered)if(english.includes(th))english=english.split(th).join(en);
   // Clean small Thai polite endings only; leave unknown names intact rather than corrupting them.
   english=english.replace(/\s{2,}/g,' ').replace(/ ?· ?/g,' · ').trim();
  }
  if(cache.size>3000)cache.clear();
  cache.set(word,english);
  return left+english+right;
 }
 let language='th';
 try{language=localStorage.getItem(STORAGE)==='en'?'en':'th'}catch(_){}
 const originals=new WeakMap(),attrOriginals=new WeakMap();
 const watched=['title','aria-label','placeholder'];
 let observer=null,queued=false;
 const pending=new Set();
 const invalidTags=new Set(['SCRIPT','STYLE','TEXTAREA','NOSCRIPT','CODE','PRE','SVG']);
 function excluded(node){
  let el=node.nodeType===1?node:node.parentElement;
  if(!el)return true;
  if(el.closest('#smcityLanguage,[data-no-translate],.smcity-welcome-image'))return true;
  while(el){if(invalidTags.has(el.tagName))return true;el=el.parentElement;}
  return false;
 }
 function textNode(node){
  if(node.nodeType!==3||excluded(node))return;
  const now=node.nodeValue||'',old=originals.get(node);
  if(language==='en'){
   if(old&&now===old.en)return;
   const next=translate(now);
   if(next!==now){originals.set(node,{th:now,en:next});node.nodeValue=next;}
   else if(old)originals.delete(node);
  }else if(old&&now===old.en){node.nodeValue=old.th;originals.delete(node);}
 }
 function attrs(el){
  if(el.nodeType!==1||excluded(el))return;
  let map=attrOriginals.get(el);
  for(const key of watched){
   if(!el.hasAttribute(key))continue;
   const now=el.getAttribute(key)||'',old=map?.get(key);
   if(language==='en'){
    if(old&&old.en===now)continue;
    const next=translate(now);
    if(next!==now){if(!map){map=new Map();attrOriginals.set(el,map);}map.set(key,{th:now,en:next});el.setAttribute(key,next);}
    else if(old)map.delete(key);
   }else if(old&&now===old.en){el.setAttribute(key,old.th);map.delete(key);}
  }
 }
 function walk(root){
  if(!root)return;
  if(root.nodeType===3){textNode(root);return;}
  if(root.nodeType!==1&&root.nodeType!==9&&root.nodeType!==11)return;
  if(root.nodeType===1){
   if(excluded(root))return;
   attrs(root);
  }
  // Text nodes get exact reverse mapping; no replacements inside scripts, SVG or inputs.
  const iter=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{
   acceptNode(n){
    if(n.nodeType===1&&excluded(n))return NodeFilter.FILTER_REJECT;
    return NodeFilter.FILTER_ACCEPT;
   }
  });
  let n;while((n=iter.nextNode()))if(n.nodeType===3)textNode(n);else attrs(n);
 }
 function scan(){walk(document.body);}
 function queue(node){
  if(language!=='en')return;
  pending.add(node||document.body);
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{
   queued=false;if(language!=='en'){pending.clear();return;}
   if(pending.size>180){pending.clear();scan();return;}
   const list=[...pending];pending.clear();
   for(const n of list)if(n.isConnected||n===document.body)walk(n);
  });
 }
 function begin(){
  if(observer)return;
  observer=new MutationObserver(records=>{
   for(const m of records){
    if(m.type==='characterData')queue(m.target);
    else if(m.type==='attributes')queue(m.target);
    else for(const n of m.addedNodes)if(n.nodeType===1||n.nodeType===3)queue(n);
   }
  });
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:watched});
 }
 function stop(){observer?.disconnect();observer=null;pending.clear();}
 const originalTitle=document.title;
 function setLanguage(lang){
  language=lang==='en'?'en':'th';
  try{localStorage.setItem(STORAGE,language)}catch(_){}
  document.documentElement.lang=language;
  document.documentElement.dataset.language=language;
  document.title=language==='en'?translate(originalTitle):originalTitle;
  stop();scan();
  document.querySelectorAll('#smcityLanguage [data-language]').forEach(button=>{
   const active=button.dataset.language===language;
   button.setAttribute('aria-pressed',String(active));
  });
  if(language==='en')begin();
  window.dispatchEvent(new CustomEvent('smcity-language-change',{detail:{language}}));
 }
 function start(){
  if(!document.body)return;
  const control=document.createElement('div');
  control.id='smcityLanguage';
  control.setAttribute('role','group');
  control.setAttribute('aria-label','Language / ภาษา');
  control.setAttribute('data-no-translate','');
  control.innerHTML='<button type="button" data-language="th" lang="th" aria-label="ภาษาไทย" title="ภาษาไทย">ไทย</button><button type="button" data-language="en" lang="en" aria-label="English" title="English">EN</button>';
  document.body.prepend(control);
  control.addEventListener('click',event=>{
   const button=event.target.closest('[data-language]');
   if(button)setLanguage(button.dataset.language);
  });
  setLanguage(language);
 }
 window.SMCITY_I18N={getLanguage:()=>language,setLanguage,translate};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();