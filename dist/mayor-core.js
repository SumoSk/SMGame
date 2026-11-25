'use strict';
// Mayor engine; city adapters supply live ledger, buildings, treasury and AI credits.
// All times are absolute simulated minutes; serialize state in the existing city save.
const MAYOR_CATEGORIES = {
  "admin": "การบริหาร",
  "image": "ภาพลักษณ์นายก",
  "fame": "ชื่อเสียงเมือง",
  "government": "ความสัมพันธ์กับรัฐบาล",
  "people": "ความสัมพันธ์กับประชาชน",
  "business": "ความสัมพันธ์กับเจ้าของกิจการ",
  "integrity": "ความโปร่งใส"
};
const MAYOR_EVENTS = [
  {
    "id": "admin-rain",
    "category": "admin",
    "minLevel": 1,
    "title": "ฝนตั้งเค้าทางชายฝั่ง",
    "story": "เจ้าหน้าที่เตือนว่าพื้นที่อยู่อาศัยเสี่ยงน้ำท่วม หากเตรียมรับมือทันทีจะลดความเสียหายได้",
    "choices": [
      {
        "title": "อนุมัติงบป้องกันเต็มรูปแบบ",
        "cost": 200000,
        "success": {
          "scores": {
            "admin": 10,
            "people": 5
          },
          "effects": [
            {
              "kind": "tripMultiplier",
              "scope": "all",
              "value": 2
            }
          ],
          "report": "เจ้าหน้าที่ระบายน้ำทันเวลา เมืองรอดจากน้ำท่วม"
        }
      },
      {
        "title": "ขออุปกรณ์จากรัฐบาล",
        "requires": {
          "government": 71
        },
        "success": {
          "scores": {
            "admin": 10,
            "government": 5
          },
          "report": "รัฐบาลส่งอุปกรณ์มาให้ เมืองปลอดภัยโดยไม่ต้องจ่ายเงิน"
        }
      },
      {
        "title": "รอดูทิศทางฝน ไม่ใช้งบ",
        "chance": 0.3,
        "success": {
          "report": "โชคดี พายุเปลี่ยนทิศทาง เมืองไม่เสียหาย"
        },
        "failure": {
          "scores": {
            "admin": -10,
            "people": -5
          },
          "effects": [
            {
              "kind": "floodDamage",
              "scope": "homes",
              "value": 0.1
            }
          ],
          "report": "ฝนตกหนักและเกิดความเสียหายในเขตชุมชน"
        }
      }
    ]
  },
  {
    "id": "admin-traffic",
    "category": "admin",
    "minLevel": 1,
    "title": "รถติดจนกลายเป็นข่าว",
    "story": "ประชาชนส่งคำร้องเรื่องการเดินทางล่าช้า ขอให้เทศบาลปรับปรุงประสิทธิภาพ",
    "choices": [
      {
        "title": "รับปากปรับปรุงการเดินทางให้สำเร็จ 80%",
        "requires": {
          "admin": 51
        },
        "task": {
          "kind": "performance",
          "target": 80
        },
        "success": {
          "scores": {
            "admin": 10
          },
          "effects": [
            {
              "kind": "tripMultiplier",
              "scope": "all",
              "value": 2
            }
          ],
          "report": "เมืองผ่านเป้าหมายการเดินทาง"
        },
        "failure": {
          "scores": {
            "admin": -10
          },
          "report": "เมืองไม่ผ่านเป้าหมาย"
        }
      },
      {
        "title": "จ่ายงบจัดการจราจร",
        "cost": 80000,
        "success": {
          "scores": {
            "admin": 5
          },
          "report": "เจ้าหน้าที่จัดระเบียบการจราจรแล้ว"
        }
      },
      {
        "title": "ตำหนิผู้ร้องเรียน",
        "chance": 0.3,
        "success": {
          "scores": {
            "admin": 5
          },
          "report": "ข้อร้องเรียนยุติลง"
        },
        "failure": {
          "scores": {
            "admin": -10,
            "image": -10
          },
          "report": "ประชาชนไม่พอใจคำตอบของนายก"
        }
      }
    ]
  },
  {
    "id": "image-interview",
    "category": "image",
    "minLevel": 1,
    "title": "ไมโครโฟนหน้าศาลาว่าการ",
    "story": "นักข่าวท้องถิ่นรอสัมภาษณ์นายกเรื่องการใช้งบประมาณ",
    "choices": [
      {
        "title": "ชี้แจงต่อสื่อด้วยข้อมูล",
        "requires": {
          "image": 71
        },
        "success": {
          "scores": {
            "image": 10
          },
          "report": "คำชี้แจงได้รับการตอบรับดี"
        }
      },
      {
        "title": "จัดแถลงข่าว",
        "cost": 30000,
        "success": {
          "scores": {
            "image": 10
          },
          "report": "สื่อรายงานข่าวในเชิงบวก"
        }
      },
      {
        "title": "ปฏิเสธให้สัมภาษณ์",
        "success": {
          "scores": {
            "image": -5
          },
          "report": "สื่อวิจารณ์ว่านายกไม่ยอมตอบคำถาม"
        }
      },
      {
        "title": "ท้าให้สื่อพิสูจน์ข้อกล่าวหา",
        "chance": 0.3,
        "success": {
          "scores": {
            "image": 10
          },
          "report": "สื่อถอนข้อกล่าวหา"
        },
        "failure": {
          "scores": {
            "image": -15
          },
          "report": "คำพูดของนายกกลายเป็นกระแสวิจารณ์"
        }
      }
    ]
  },
  {
    "id": "image-party",
    "category": "image",
    "minLevel": 1,
    "title": "งานเลี้ยงนายก",
    "story": "คณะทำงานเสนอจัดงานเลี้ยงให้ท่านนายกโดยใช้งบเมือง",
    "choices": [
      {
        "title": "บริจาคงบให้กิจกรรมชุมชน",
        "cost": 50000,
        "success": {
          "scores": {
            "image": 10,
            "people": 5
          },
          "report": "ประชาชนชื่นชมการจัดสรรงบ"
        }
      },
      {
        "title": "รับจัดงานหรูจากผู้สนับสนุน",
        "success": {
          "money": 80000,
          "scores": {
            "image": -10,
            "business": 5
          },
          "report": "งานเลี้ยงจบลงพร้อมกระแสวิจารณ์ แต่คลังได้รับเงินสนับสนุน"
        }
      },
      {
        "title": "ยกเลิกงาน",
        "success": {
          "report": "ไม่มีการใช้งบจัดงาน"
        }
      }
    ]
  },
  {
    "id": "fame-food",
    "category": "fame",
    "minLevel": 1,
    "requiresBuildings": {
      "restaurant_starter": 1
    },
    "title": "เทศกาลอาหารริมทะเล",
    "story": "ผู้จัดงานขอใช้เมืองเป็นสถานที่จัดเทศกาลอาหารในวันนี้",
    "choices": [
      {
        "title": "ขอผู้สนับสนุนจัดงาน",
        "requires": {
          "fame": 86
        },
        "success": {
          "scores": {
            "fame": 10
          },
          "effects": [
            {
              "kind": "tripMultiplier",
              "scope": "restaurant",
              "value": 3
            }
          ],
          "report": "ผู้สนับสนุนรับผิดชอบค่าใช้จ่ายทั้งหมด"
        }
      },
      {
        "title": "จัดงานด้วยงบเมือง",
        "cost": 100000,
        "success": {
          "scores": {
            "fame": 10
          },
          "effects": [
            {
              "kind": "tripMultiplier",
              "scope": "restaurant",
              "value": 2
            }
          ],
          "report": "เทศกาลดึงดูดผู้เดินทางมาร้านอาหาร"
        }
      },
      {
        "title": "ไม่จัดงาน",
        "success": {
          "report": "เมืองดำเนินกิจกรรมตามปกติ"
        }
      }
    ]
  },
  {
    "id": "fame-news",
    "category": "fame",
    "minLevel": 1,
    "title": "นักท่องเที่ยวบอกต่อ",
    "story": "สื่อท่องเที่ยวสนใจนำเสนอเมือง แต่ต้องการข้อมูลและการอำนวยความสะดวก",
    "choices": [
      {
        "title": "สนับสนุนการประชาสัมพันธ์",
        "cost": 75000,
        "success": {
          "scores": {
            "fame": 10
          },
          "effects": [
            {
              "kind": "touristMultiplier",
              "scope": "tourist",
              "value": 2
            }
          ],
          "report": "เมืองได้รับความสนใจเพิ่มขึ้น"
        }
      },
      {
        "title": "ให้สื่อทำงานตามปกติ",
        "success": {
          "scores": {
            "fame": 3
          },
          "report": "สื่อเผยแพร่ข้อมูลเมืองตามจริง"
        }
      },
      {
        "title": "ปฏิเสธความร่วมมือ",
        "success": {
          "scores": {
            "fame": -5
          },
          "report": "เมืองพลาดโอกาสประชาสัมพันธ์"
        }
      }
    ]
  },
  {
    "id": "government-home",
    "category": "government",
    "minLevel": 1,
    "title": "บ้านหลังใหม่เพื่อชุมชน",
    "story": "รัฐบาลเปิดโครงการเพิ่มที่อยู่อาศัยและพร้อมออกค่าก่อสร้าง",
    "choices": [
      {
        "title": "รับเงินและสร้างบ้านเริ่มต้น 3 หลัง",
        "requires": {
          "admin": 51
        },
        "grant": 72000,
        "task": {
          "kind": "build",
          "key": "home_starter",
          "count": 3
        },
        "success": {
          "scores": {
            "admin": 10,
            "government": 5
          },
          "report": "สร้างบ้านครบตามสัญญา"
        },
        "failure": {
          "scores": {
            "admin": -10,
            "government": -5
          },
          "report": "สร้างบ้านไม่ครบ ต้องคืนเงินสนับสนุน"
        }
      },
      {
        "title": "ไม่รับโครงการ",
        "success": {
          "scores": {
            "fame": -5
          },
          "report": "รัฐบาลจัดสรรโครงการให้เมืองอื่น"
        }
      }
    ]
  },
  {
    "id": "government-landmark",
    "category": "government",
    "minLevel": 1,
    "title": "แลนด์มาร์กระดับประเทศ",
    "story": "รัฐบาลเสนอสนับสนุนการก่อสร้างตึกมหานครให้แล้วเสร็จภายในวันนี้",
    "choices": [
      {
        "title": "รับเงิน 2 ล้านบาท และสร้างตึกมหานคร 1 แห่ง",
        "requires": {
          "admin": 71
        },
        "grant": 2000000,
        "task": {
          "kind": "build",
          "key": "home_mahanakhon",
          "count": 1
        },
        "success": {
          "scores": {
            "admin": 10,
            "fame": 5
          },
          "report": "ตึกมหานครสร้างเสร็จตามสัญญา"
        },
        "failure": {
          "scores": {
            "admin": -10
          },
          "report": "ไม่สามารถส่งมอบโครงการ ต้องคืนเงินสนับสนุน"
        }
      },
      {
        "title": "รับเงิน 1 ล้านบาท และสร้างตึกมหานคร 1 แห่ง",
        "requires": {
          "admin": 51
        },
        "grant": 1000000,
        "task": {
          "kind": "build",
          "key": "home_mahanakhon",
          "count": 1
        },
        "success": {
          "scores": {
            "admin": 10,
            "fame": 5
          },
          "report": "ส่งมอบตึกมหานครสำเร็จ"
        },
        "failure": {
          "scores": {
            "admin": -10
          },
          "report": "โครงการไม่สำเร็จ ต้องคืนเงินสนับสนุน"
        }
      },
      {
        "title": "ใช้งบเมืองเอง สร้างตึกมหานคร 1 แห่ง",
        "task": {
          "kind": "build",
          "key": "home_mahanakhon",
          "count": 1
        },
        "success": {
          "scores": {
            "admin": 10,
            "fame": 5
          },
          "report": "เมืองสร้างแลนด์มาร์กด้วยงบของตนเอง"
        },
        "failure": {
          "scores": {
            "admin": -10
          },
          "report": "ก่อสร้างไม่ทันเวลา"
        }
      },
      {
        "title": "ชะลอการก่อสร้าง",
        "success": {
          "scores": {
            "admin": -5
          },
          "report": "เลื่อนแผนก่อสร้างออกไป"
        }
      },
      {
        "title": "ไม่รับโครงการ",
        "success": {
          "scores": {
            "fame": -5
          },
          "report": "รัฐบาลจัดสรรโครงการให้เมืองอื่น"
        }
      }
    ]
  },
  {
    "id": "people-welcome",
    "category": "people",
    "minLevel": 1,
    "title": "คนอยากย้ายเข้ามาอยู่",
    "story": "กลุ่มผู้สนใจย้ายเข้ามาอยู่ในเมือง ขอให้เทศบาลช่วยเรื่องการย้ายถิ่นฐาน",
    "choices": [
      {
        "title": "อนุมัติเงินรับขวัญ",
        "cost": 100000,
        "success": {
          "scores": {
            "people": 10
          },
          "effects": [
            {
              "kind": "fillPopulation",
              "scope": "residents",
              "value": 1
            }
          ],
          "report": "ผู้สมัครได้รับสิทธิย้ายเข้าเมื่อมีบ้านรองรับ"
        }
      },
      {
        "title": "ใช้ความสัมพันธ์ช่วยประสานงาน",
        "requires": {
          "people": 86
        },
        "success": {
          "scores": {
            "people": 10
          },
          "effects": [
            {
              "kind": "fillPopulation",
              "scope": "residents",
              "value": 1
            }
          ],
          "report": "ประชาชนยินดีย้ายเข้าโดยไม่ต้องจ่ายเงิน"
        }
      },
      {
        "title": "ไม่สนับสนุน",
        "success": {
          "scores": {
            "people": -5
          },
          "report": "ผู้สมัครบางส่วนตัดสินใจไม่ย้ายเข้า"
        }
      }
    ]
  },
  {
    "id": "people-cost",
    "category": "people",
    "minLevel": 1,
    "title": "เงินในกระเป๋าประชาชนเริ่มไม่พอ",
    "story": "ชาวเมืองขอให้เทศบาลช่วยลดค่าครองชีพเฉพาะวันนี้",
    "choices": [
      {
        "title": "อุดหนุนประชาชน",
        "cost": 80000,
        "success": {
          "scores": {
            "people": 10,
            "image": 5
          },
          "report": "ประชาชนได้รับความช่วยเหลือ"
        }
      },
      {
        "title": "ลดรายได้ภารกิจลง 100 บาทวันนี้",
        "success": {
          "scores": {
            "people": 10
          },
          "effects": [
            {
              "kind": "tripDelta",
              "scope": "all",
              "value": -100
            }
          ],
          "report": "เมืองลดภาระการจัดเก็บรายได้"
        }
      },
      {
        "title": "ขู่งดสวัสดิการ",
        "chance": 0.3,
        "success": {
          "scores": {
            "people": 5
          },
          "report": "การร้องเรียนยุติลง"
        },
        "failure": {
          "scores": {
            "people": -15,
            "image": -10
          },
          "effects": [
            {
              "kind": "populationBlock",
              "scope": "residents",
              "value": 1
            }
          ],
          "report": "ประชาชนไม่พอใจและงดย้ายเข้าวันนี้"
        }
      }
    ]
  },
  {
    "id": "business-restaurant",
    "category": "business",
    "minLevel": 1,
    "requiresBuildings": {
      "restaurant_starter": 1
    },
    "title": "ร้านอาหารไม่ใช่ตู้เอทีเอ็ม",
    "story": "สมาคมร้านอาหารขอลดรายได้จากการเดินทางมายังร้านอาหารเหลือ 200 บาทเฉพาะวันนี้",
    "choices": [
      {
        "title": "เจรจาให้เหลือ 400 บาท",
        "requires": {
          "business": 86
        },
        "success": {
          "scores": {
            "business": 10
          },
          "effects": [
            {
              "kind": "tripDelta",
              "scope": "restaurant",
              "value": -100
            }
          ],
          "report": "สมาคมยอมรับข้อเสนอ"
        }
      },
      {
        "title": "สร้างร้านอาหารเริ่มต้นเพิ่ม 3 แห่ง",
        "requires": {
          "business": 51
        },
        "task": {
          "kind": "build",
          "key": "restaurant_starter",
          "count": 3
        },
        "success": {
          "scores": {
            "business": 10
          },
          "effects": [
            {
              "kind": "tripMultiplier",
              "scope": "restaurant",
              "value": 2
            }
          ],
          "report": "ร้านอาหารเพิ่มขึ้นตามสัญญา"
        },
        "failure": {
          "scores": {
            "business": -10
          },
          "report": "นายกทำตามข้อตกลงไม่สำเร็จ"
        }
      },
      {
        "title": "จ่ายเงินช่วยเหลือ",
        "cost": 100000,
        "success": {
          "scores": {
            "business": 10
          },
          "report": "สมาคมถอนข้อเรียกร้อง"
        }
      },
      {
        "title": "ขู่รื้อร้านอาหารเริ่มต้น 3 แห่ง",
        "requiresBuildings": {
          "restaurant_starter": 3
        },
        "chance": 0.3,
        "success": {
          "scores": {
            "business": 10
          },
          "report": "สมาคมยอมถอย รายได้ไม่ลด"
        },
        "failure": {
          "scores": {
            "business": -15,
            "image": -10
          },
          "effects": [
            {
              "kind": "tripDelta",
              "scope": "restaurant",
              "value": -400
            }
          ],
          "report": "ข้อข่มขู่ถูกเปิดเผยและธุรกิจต่อต้าน"
        }
      },
      {
        "title": "ยอมลดรายได้เหลือ 200 บาท",
        "success": {
          "scores": {
            "business": 10
          },
          "effects": [
            {
              "kind": "tripDelta",
              "scope": "restaurant",
              "value": -300
            }
          ],
          "report": "สมาคมยอมถอนข้อเรียกร้อง"
        }
      }
    ]
  },
  {
    "id": "business-pub",
    "category": "business",
    "minLevel": 1,
    "requiresBuildings": {
      "pub_starter": 1
    },
    "title": "สมาคมเจ้าของผับยื่นคำขาด",
    "story": "ผู้ประกอบการขอลดการจัดเก็บรายได้ลง 400 บาทต่อภารกิจเฉพาะวันนี้",
    "choices": [
      {
        "title": "เจรจาให้ลดเพียง 100 บาท",
        "requires": {
          "business": 86
        },
        "success": {
          "scores": {
            "business": 10
          },
          "effects": [
            {
              "kind": "tripDelta",
              "scope": "pub",
              "value": -100
            }
          ],
          "report": "สมาคมตกลง"
        }
      },
      {
        "title": "สร้างผับใหญ่ 1 แห่ง",
        "requires": {
          "business": 51
        },
        "task": {
          "kind": "build",
          "key": "pub_large",
          "count": 1
        },
        "success": {
          "scores": {
            "business": 10
          },
          "effects": [
            {
              "kind": "tripMultiplier",
              "scope": "pub",
              "value": 2
            }
          ],
          "report": "เปิดผับใหญ่ตามสัญญา"
        },
        "failure": {
          "scores": {
            "business": -10
          },
          "report": "ก่อสร้างไม่ทันเวลา"
        }
      },
      {
        "title": "ยอมลดรายได้เหลือ 100 บาท",
        "success": {
          "scores": {
            "business": 10
          },
          "effects": [
            {
              "kind": "tripDelta",
              "scope": "pub",
              "value": -400
            }
          ],
          "report": "ผู้ประกอบการถอนคำร้อง"
        }
      },
      {
        "title": "ปฏิเสธ",
        "success": {
          "scores": {
            "business": -10
          },
          "report": "สมาคมไม่พอใจ"
        }
      }
    ]
  },
  {
    "id": "integrity-donor",
    "category": "integrity",
    "minLevel": 1,
    "title": "เงินที่ไม่มีใครต้องรู้",
    "story": "นักธุรกิจเสนอเงินเข้าคลังแลกกับการพิจารณาสิทธิพิเศษในอนาคต",
    "choices": [
      {
        "title": "รับเงินตามข้อเสนอ",
        "success": {
          "money": 150000,
          "scores": {
            "integrity": -15,
            "business": 5
          },
          "flags": [
            "secretDonor"
          ],
          "report": "เงินเข้าคลังเมืองแล้ว ข้อตกลงยังเป็นความลับ"
        }
      },
      {
        "title": "เจรจาเป็นเงินบริจาคเปิดเผย",
        "requires": {
          "integrity": 71
        },
        "success": {
          "money": 50000,
          "scores": {
            "integrity": 10
          },
          "report": "เมืองรับเงินอย่างเปิดเผย"
        }
      },
      {
        "title": "ขอเงินเพิ่มเป็นสองเท่า",
        "chance": 0.3,
        "success": {
          "money": 300000,
          "scores": {
            "integrity": -15
          },
          "flags": [
            "secretDonor"
          ],
          "report": "นักธุรกิจตกลงเพิ่มเงิน"
        },
        "failure": {
          "scores": {
            "integrity": -10,
            "business": -10
          },
          "report": "นักธุรกิจถอนข้อเสนอ"
        }
      },
      {
        "title": "ปฏิเสธ",
        "success": {
          "scores": {
            "integrity": 10,
            "business": -5
          },
          "report": "นายกปฏิเสธเงินนอกระบบ"
        }
      }
    ]
  },
  {
    "id": "integrity-audit",
    "category": "integrity",
    "minLevel": 1,
    "title": "สมุดบัญชีที่ไม่ตรงกัน",
    "story": "เจ้าหน้าที่ตรวจพบรายการงบประมาณที่ผิดปกติ ขอคำสั่งจากนายก",
    "choices": [
      {
        "title": "ตรวจสอบโดยเปิดเผย",
        "cost": 50000,
        "success": {
          "scores": {
            "integrity": 10,
            "government": 5
          },
          "report": "รายการผิดปกติได้รับการตรวจสอบแล้ว"
        }
      },
      {
        "title": "ให้คืนเงินที่ผิดพลาด",
        "success": {
          "money": 50000,
          "scores": {
            "integrity": 5
          },
          "report": "เงินถูกส่งคืนเข้าคลัง"
        }
      },
      {
        "title": "รับส่วนแบ่งและยุติเรื่อง",
        "success": {
          "money": 150000,
          "scores": {
            "integrity": -15
          },
          "flags": [
            "secretDonor"
          ],
          "report": "เมืองได้เงินเพิ่ม แต่เกิดประวัติความไม่โปร่งใส"
        }
      }
    ]
  }
];
MAYOR_EVENTS.push(...[
  {
    "id": "admin-crossing",
    "category": "admin",
    "minLevel": 1,
    "title": "ทางแยกที่ไม่มีใครยอมกัน",
    "story": "คนขับรถร้องเรียนว่าการเดินทางเสียเวลามากจนไม่อยากออกจากบ้าน",
    "choices": [
      {
        "title": "จัดทีมประสานการจราจร",
        "success": {
          "report": "เทศบาลจัดระเบียบข้อร้องเรียนแล้ว",
          "scores": {
            "admin": 5,
            "people": 3
          }
        },
        "cost": 45000
      },
      {
        "title": "รับการประเมินการเดินทาง 80% วันนี้",
        "requires": {
          "admin": 51
        },
        "task": {
          "kind": "performance",
          "target": 80
        },
        "success": {
          "report": "ผลการเดินทางผ่านเกณฑ์",
          "scores": {
            "admin": 10
          },
          "effects": [
            {
              "kind": "tripMultiplier",
              "scope": "all",
              "value": 2
            }
          ]
        },
        "failure": {
          "report": "ไม่ผ่านการประเมิน",
          "scores": {
            "admin": -10
          }
        }
      },
      {
        "title": "ให้คนขับจัดการกันเอง",
        "chance": 0.3,
        "success": {
          "report": "ข้อร้องเรียนยุติลง",
          "scores": {}
        },
        "failure": {
          "report": "ประชาชนส่งเรื่องร้องเรียนเพิ่ม",
          "scores": {
            "admin": -10,
            "people": -5
          }
        }
      }
    ]
  },
  {
    "id": "admin-office",
    "category": "admin",
    "minLevel": 3,
    "title": "เจ้าหน้าที่หมดแรง",
    "story": "ภาระงานเพิ่มขึ้น เจ้าหน้าที่ขอเครื่องมือทำงานเพิ่มเพื่อจัดการเอกสารเมือง",
    "choices": [
      {
        "title": "สนับสนุนอุปกรณ์",
        "success": {
          "report": "งานเอกสารถูกจัดการเรียบร้อย",
          "scores": {
            "admin": 10
          }
        },
        "cost": 60000
      },
      {
        "title": "ขอใช้ทรัพยากรจากหน่วยงานกลาง",
        "success": {
          "report": "รัฐบาลอนุมัติอุปกรณ์ให้",
          "scores": {
            "admin": 10
          }
        },
        "requires": {
          "government": 71
        }
      },
      {
        "title": "ไม่เพิ่มงบ",
        "success": {
          "report": "เจ้าหน้าที่ต้องใช้เครื่องมือเดิม",
          "scores": {
            "admin": -5
          }
        }
      }
    ]
  },
  {
    "id": "admin-inspection",
    "category": "admin",
    "minLevel": 6,
    "title": "ผลตรวจเมืองรอบพิเศษ",
    "story": "คณะประเมินเสนอให้เมืองเข้าร่วมทดสอบประสิทธิภาพการเดินทาง",
    "choices": [
      {
        "title": "รับการประเมิน 85% วันนี้",
        "requires": {
          "admin": 71
        },
        "task": {
          "kind": "performance",
          "target": 85
        },
        "success": {
          "report": "ได้รับใบรับรองและเงินรางวัล",
          "scores": {
            "admin": 10
          },
          "money": 120000
        },
        "failure": {
          "report": "เมืองไม่ผ่านเกณฑ์",
          "scores": {
            "admin": -10
          }
        }
      },
      {
        "title": "ไม่เข้ารับการประเมิน",
        "success": {
          "report": "เมืองไม่ร่วมการประเมิน",
          "scores": {}
        }
      },
      {
        "title": "รับรองผลงานโดยไม่ตรวจ",
        "chance": 0.3,
        "success": {
          "report": "คณะประเมินยอมรับรายงาน",
          "scores": {
            "admin": 5
          }
        },
        "failure": {
          "report": "รายงานมีข้อผิดพลาดถูกทักท้วง",
          "scores": {
            "admin": -10,
            "integrity": -10
          }
        }
      }
    ]
  },
  {
    "id": "admin-park",
    "category": "admin",
    "minLevel": 1,
    "title": "ชุมชนขาดพื้นที่พักผ่อน",
    "story": "เทศบาลได้รับคำร้องเรื่องพื้นที่สาธารณะไม่เพียงพอ",
    "choices": [
      {
        "title": "สร้างสวนเริ่มต้น 2 แห่ง",
        "task": {
          "kind": "build",
          "key": "park_starter",
          "count": 2
        },
        "success": {
          "report": "สร้างพื้นที่พักผ่อนครบ",
          "scores": {
            "admin": 10,
            "people": 5
          }
        },
        "failure": {
          "report": "สร้างสวนไม่ครบ",
          "scores": {
            "admin": -10
          }
        },
        "requires": {
          "admin": 51
        }
      },
      {
        "title": "สนับสนุนกิจกรรมชุมชน",
        "success": {
          "report": "จัดกิจกรรมทดแทนพื้นที่พักผ่อน",
          "scores": {
            "people": 5
          }
        },
        "cost": 35000
      },
      {
        "title": "ปฏิเสธคำร้อง",
        "success": {
          "report": "ชุมชนไม่พอใจ",
          "scores": {
            "admin": -5,
            "people": -5
          }
        }
      }
    ]
  },
  {
    "id": "admin-restaurant",
    "category": "admin",
    "minLevel": 1,
    "title": "บริการในชุมชนไม่เพียงพอ",
    "story": "เจ้าหน้าที่ขอเพิ่มพื้นที่บริการอาหารเพื่อลดข้อร้องเรียน",
    "choices": [
      {
        "title": "สร้างร้านอาหารเริ่มต้น 2 แห่ง",
        "task": {
          "kind": "build",
          "key": "restaurant_starter",
          "count": 2
        },
        "success": {
          "report": "เพิ่มจุดบริการอาหารสำเร็จ",
          "scores": {
            "admin": 10
          },
          "effects": [
            {
              "kind": "tripMultiplier",
              "scope": "restaurant",
              "value": 2
            }
          ]
        },
        "failure": {
          "report": "สร้างไม่ครบ",
          "scores": {
            "admin": -10
          }
        }
      },
      {
        "title": "จัดงบประสานชุมชน",
        "success": {
          "report": "จัดการคำร้องบางส่วนได้",
          "scores": {
            "admin": 5
          }
        },
        "cost": 35000
      },
      {
        "title": "ไม่ดำเนินการ",
        "success": {
          "report": "คำร้องไม่ได้รับการแก้ไข",
          "scores": {
            "admin": -10
          }
        }
      }
    ]
  },
  {
    "id": "admin-shops",
    "category": "admin",
    "minLevel": 3,
    "title": "จุดซื้อของกระจุกตัว",
    "story": "เมืองขอเพิ่มจุดให้บริการร้านค้าพื้นฐาน",
    "choices": [
      {
        "title": "สร้างร้านค้าเริ่มต้น 3 แห่ง",
        "task": {
          "kind": "build",
          "key": "shop_starter",
          "count": 3
        },
        "success": {
          "report": "เพิ่มจุดบริการครบ",
          "scores": {
            "admin": 10
          },
          "effects": [
            {
              "kind": "tripMultiplier",
              "scope": "shop",
              "value": 2
            }
          ]
        },
        "failure": {
          "report": "ทำไม่ครบตามแผน",
          "scores": {
            "admin": -10
          }
        },
        "requires": {
          "admin": 51
        }
      },
      {
        "title": "สำรองงบแก้ปัญหา",
        "success": {
          "report": "จัดระบบช่วยเหลือชั่วคราว",
          "scores": {
            "admin": 5
          }
        },
        "cost": 40000
      },
      {
        "title": "พักแผนไว้ก่อน",
        "success": {
          "report": "เจ้าหน้าที่เลื่อนโครงการ",
          "scores": {
            "admin": -5
          }
        }
      }
    ]
  },
  {
    "id": "admin-audit-cost",
    "category": "admin",
    "minLevel": 5,
    "title": "ต้นทุนการบริหารสูงเกินคาด",
    "story": "ฝ่ายการเงินเตือนให้ทบทวนรายจ่ายที่ไม่จำเป็น",
    "choices": [
      {
        "title": "จ้างผู้ตรวจสอบงบ",
        "success": {
          "report": "พบรายการที่ปรับปรุงได้",
          "scores": {
            "admin": 10,
            "integrity": 5
          }
        },
        "cost": 55000
      },
      {
        "title": "ใช้ทีมงานเดิมตรวจสอบ",
        "success": {
          "report": "ปรับปรุงรายการได้บางส่วน",
          "scores": {
            "admin": 5
          }
        },
        "requires": {
          "admin": 71
        }
      },
      {
        "title": "ไม่ทบทวน",
        "success": {
          "report": "เสียโอกาสปรับปรุงงบ",
          "scores": {
            "admin": -5
          }
        }
      }
    ]
  },
  {
    "id": "admin-office-supply",
    "category": "admin",
    "minLevel": 3,
    "title": "สถานที่ทำงานไม่พอ",
    "story": "ผู้ประสานงานเมืองเสนอเพิ่มสำนักงานพื้นฐาน",
    "choices": [
      {
        "title": "สร้างสำนักงานเริ่มต้น 2 แห่ง",
        "task": {
          "kind": "build",
          "key": "office_starter",
          "count": 2
        },
        "success": {
          "report": "เปิดพื้นที่ทำงานครบ",
          "scores": {
            "admin": 10,
            "people": 5
          }
        },
        "failure": {
          "report": "สร้างไม่ทัน",
          "scores": {
            "admin": -10
          }
        }
      },
      {
        "title": "อนุมัติงบประสานงาน",
        "success": {
          "report": "แก้ปัญหาเฉพาะหน้า",
          "scores": {
            "admin": 5
          }
        },
        "cost": 30000
      },
      {
        "title": "ปฏิเสธ",
        "success": {
          "report": "การจัดสรรงานไม่เปลี่ยนแปลง",
          "scores": {
            "admin": -5
          }
        }
      }
    ]
  },
  {
    "id": "admin-city-fair",
    "category": "admin",
    "minLevel": 15,
    "title": "ข้อเสนอประเมินเมืองน่าอยู่",
    "story": "ผู้ประเมินให้เมืองพิสูจน์ผลงานด้วยการเดินทางที่มีประสิทธิภาพ",
    "choices": [
      {
        "title": "รักษาคะแนนเดินทาง 90% วันนี้",
        "requires": {
          "admin": 86
        },
        "task": {
          "kind": "performance",
          "target": 90
        },
        "success": {
          "report": "เมืองผ่านมาตรฐานระดับสูง",
          "scores": {
            "admin": 15,
            "fame": 5
          },
          "money": 250000
        },
        "failure": {
          "report": "เมืองไม่ผ่านมาตรฐาน",
          "scores": {
            "admin": -10
          }
        }
      },
      {
        "title": "ขอคำแนะนำเบื้องต้น",
        "success": {
          "report": "ได้รับคำแนะนำจากคณะประเมิน",
          "scores": {
            "admin": 5
          }
        },
        "cost": 40000
      },
      {
        "title": "ไม่เข้าร่วม",
        "success": {
          "report": "ไม่มีผลต่อโครงการ",
          "scores": {}
        }
      }
    ]
  },
  {
    "id": "admin-bridge-review",
    "category": "admin",
    "minLevel": 8,
    "title": "ตรวจสอบทางเข้าเมือง",
    "story": "วิศวกรเสนอให้ตรวจสภาพสะพานและถนนทางเข้าก่อนเกิดปัญหา",
    "choices": [
      {
        "title": "จ้างทีมตรวจสภาพ",
        "success": {
          "report": "รายงานตรวจสภาพเสร็จสิ้น",
          "scores": {
            "admin": 10
          }
        },
        "cost": 120000
      },
      {
        "title": "ขอวิศวกรจากส่วนกลาง",
        "success": {
          "report": "รัฐบาลช่วยตรวจสอบให้",
          "scores": {
            "admin": 10,
            "government": 3
          }
        },
        "requires": {
          "government": 71
        }
      },
      {
        "title": "เลื่อนตรวจไปก่อน",
        "chance": 0.3,
        "success": {
          "report": "ไม่พบปัญหาเพิ่มเติมในวันนี้",
          "scores": {}
        },
        "failure": {
          "report": "คำร้องเรื่องความปลอดภัยเพิ่มขึ้น",
          "scores": {
            "admin": -10,
            "image": -5
          }
        }
      }
    ]
  },
  {
    "id": "admin-paper",
    "category": "admin",
    "minLevel": 1,
    "title": "หนังสืออนุมัติที่กองเต็มโต๊ะ",
    "story": "เจ้าหน้าที่ขอให้เร่งสะสางเอกสารที่รออนุมัติ",
    "choices": [
      {
        "title": "จัดทีมสะสางเอกสาร",
        "success": {
          "report": "เอกสารดำเนินการครบ",
          "scores": {
            "admin": 10
          }
        },
        "cost": 30000
      },
      {
        "title": "มอบหมายทีมเดิม",
        "success": {
          "report": "งานเอกสารดำเนินต่อได้",
          "scores": {
            "admin": 5
          }
        },
        "requires": {
          "admin": 71
        }
      },
      {
        "title": "ปล่อยกองเอกสารไว้",
        "success": {
          "report": "เจ้าหน้าที่รายงานความล่าช้า",
          "scores": {
            "admin": -10
          }
        }
      }
    ]
  },
  {
    "id": "admin-public-work",
    "category": "admin",
    "minLevel": 5,
    "title": "โครงการปรับปรุงพื้นที่สาธารณะ",
    "story": "เจ้าหน้าที่เสนอให้มีสถานที่พักผ่อนขนาดใหญ่ขึ้น",
    "choices": [
      {
        "title": "สร้างสวนเล็ก 1 แห่ง",
        "task": {
          "kind": "build",
          "key": "park_small",
          "count": 1
        },
        "success": {
          "report": "เปิดสวนเล็กตามแผน",
          "scores": {
            "admin": 10
          }
        },
        "failure": {
          "report": "สวนยังไม่สร้างเสร็จ",
          "scores": {
            "admin": -10
          }
        },
        "requires": {
          "admin": 51
        }
      },
      {
        "title": "ใช้งบกิจกรรมชุมชนแทน",
        "success": {
          "report": "กิจกรรมดำเนินการสำเร็จ",
          "scores": {
            "admin": 5
          }
        },
        "cost": 30000
      },
      {
        "title": "เลื่อนโครงการ",
        "success": {
          "report": "โครงการยังไม่เริ่ม",
          "scores": {
            "admin": -5
          }
        }
      }
    ]
  },
  {
    "id": "admin-training",
    "category": "admin",
    "minLevel": 3,
    "title": "ทีมบริหารขออบรม",
    "story": "เจ้าหน้าที่เสนออบรมการจัดการคำร้องเรียนในเมือง",
    "choices": [
      {
        "title": "อนุมัติอบรม",
        "success": {
          "report": "ทีมงานผ่านการอบรม",
          "scores": {
            "admin": 10
          }
        },
        "cost": 40000
      },
      {
        "title": "ขอวิทยากรจากรัฐบาล",
        "success": {
          "report": "ได้รับการสนับสนุนฟรี",
          "scores": {
            "admin": 10
          }
        },
        "requires": {
          "government": 71
        }
      },
      {
        "title": "ไม่อนุมัติ",
        "success": {
          "report": "เจ้าหน้าที่ต้องเรียนรู้ด้วยตนเอง",
          "scores": {
            "admin": -5
          }
        }
      }
    ]
  },
  {
    "id": "image-birthday",
    "category": "image",
    "minLevel": 1,
    "title": "วันเกิดที่ทุกคนจับตามอง",
    "story": "คณะทำงานเสนอให้จัดงานวันเกิดนายกจากงบเทศบาล",
    "choices": [
      {
        "title": "บริจาคงบให้ชุมชน",
        "success": {
          "report": "ประชาชนชื่นชม",
          "scores": {
            "image": 10,
            "people": 5
          }
        },
        "cost": 45000
      },
      {
        "title": "รับเงินจัดงานจากกลุ่มทุน",
        "success": {
          "report": "ผู้สนับสนุนโอนเงินให้เมือง แต่สื่อวิจารณ์",
          "scores": {
            "image": -10,
            "business": 5
          },
          "money": 100000
        }
      },
      {
        "title": "ไม่จัดงาน",
        "success": {
          "report": "นายกใช้ชีวิตตามปกติ",
          "scores": {}
        }
      }
    ]
  },
  {
    "id": "image-photo",
    "category": "image",
    "minLevel": 4,
    "title": "ภาพรถหรูหลุดสู่สื่อ",
    "story": "ภาพถ่ายรถของผู้สนับสนุนจอดหน้าสำนักงานนายกกลายเป็นข่าว",
    "choices": [
      {
        "title": "เปิดเผยค่าใช้จ่าย",
        "success": {
          "report": "สื่อยอมรับคำชี้แจง",
          "scores": {
            "image": 10,
            "integrity": 5
          }
        },
        "requires": {
          "integrity": 71
        }
      },
      {
        "title": "จัดแถลงข่าว",
        "success": {
          "report": "ทีมประชาสัมพันธ์ชี้แจงแล้ว",
          "scores": {
            "image": 5
          }
        },
        "cost": 35000
      },
      {
        "title": "ท้าให้สื่อพิสูจน์",
        "chance": 0.3,
        "success": {
          "report": "เรื่องเงียบลง",
          "scores": {
            "image": 5
          }
        },
        "failure": {
          "report": "กระแสวิจารณ์รุนแรงขึ้น",
          "scores": {
            "image": -15
          }
        }
      }
    ]
  },
  {
    "id": "image-walk",
    "category": "image",
    "minLevel": 1,
    "title": "เสียงจากตลาดเช้า",
    "story": "ชาวเมืองอยากพบและพูดคุยกับนายกโดยตรง",
    "choices": [
      {
        "title": "จัดเวทีรับฟัง",
        "success": {
          "report": "ประชาชนชื่นชมการรับฟัง",
          "scores": {
            "image": 10,
            "people": 5
          }
        },
        "cost": 25000
      },
      {
        "title": "ให้เจ้าหน้าที่รับฟังแทน",
        "success": {
          "report": "มีการรับเรื่องเบื้องต้น",
          "scores": {
            "image": 3
          }
        }
      },
      {
        "title": "ไม่เข้าร่วม",
        "success": {
          "report": "ประชาชนผิดหวัง",
          "scores": {
            "image": -5
          }
        }
      }
    ]
  },
  {
    "id": "image-award",
    "category": "image",
    "minLevel": 6,
    "title": "รางวัลนายกดีเด่น",
    "story": "สมาคมท้องถิ่นเสนอรางวัลและเงินสนับสนุนงานชุมชน",
    "choices": [
      {
        "title": "รับรางวัลและเงินสนับสนุน",
        "success": {
          "report": "เทศบาลได้รับรางวัล",
          "scores": {
            "image": 5
          },
          "money": 80000
        },
        "requires": {
          "image": 71
        }
      },
      {
        "title": "ร่วมงานโดยไม่รับเงิน",
        "success": {
          "report": "ได้รับเสียงชื่นชม",
          "scores": {
            "image": 10
          }
        }
      },
      {
        "title": "ปฏิเสธการเข้าร่วม",
        "success": {
          "report": "นายกไม่ได้รับรางวัล",
          "scores": {}
        }
      }
    ]
  },
  {
    "id": "image-rumor",
    "category": "image",
    "minLevel": 3,
    "title": "ข่าวลือเรื่องงบลับ",
    "story": "มีข่าวลือว่านายกใช้งบในทางที่ไม่เหมาะสม",
    "choices": [
      {
        "title": "เปิดเอกสารให้ตรวจสอบ",
        "success": {
          "report": "เอกสารทำให้ความสงสัยลดลง",
          "scores": {
            "image": 10,
            "integrity": 5
          }
        },
        "requires": {
          "integrity": 51
        }
      },
      {
        "title": "ตั้งคณะชี้แจง",
        "success": {
          "report": "สื่อได้รับข้อมูลเพิ่มเติม",
          "scores": {
            "image": 5
          }
        },
        "cost": 50000
      },
      {
        "title": "ไม่ตอบโต้",
        "chance": 0.3,
        "success": {
          "report": "ข่าวลือหายไปเอง",
          "scores": {}
        },
        "failure": {
          "report": "ข่าวลือถูกแชร์ต่อ",
          "scores": {
            "image": -10
          }
        }
      }
    ]
  },
  {
    "id": "image-speech",
    "category": "image",
    "minLevel": 1,
    "title": "สุนทรพจน์เปิดงานเมือง",
    "story": "ผู้จัดงานอยากให้นายกขึ้นกล่าวเปิดงาน",
    "choices": [
      {
        "title": "พูดถึงผลงานและรับฟังคำถาม",
        "success": {
          "report": "ผู้ฟังตอบรับดี",
          "scores": {
            "image": 10
          }
        },
        "requires": {
          "admin": 71
        }
      },
      {
        "title": "เตรียมทีมช่วยร่างคำพูด",
        "success": {
          "report": "การกล่าวเปิดงานราบรื่น",
          "scores": {
            "image": 5
          }
        },
        "cost": 15000
      },
      {
        "title": "ไม่ไปงาน",
        "success": {
          "report": "ผู้จัดงานผิดหวัง",
          "scores": {
            "image": -5
          }
        }
      }
    ]
  },
  {
    "id": "image-friend",
    "category": "image",
    "minLevel": 4,
    "title": "เพื่อนเก่ามาขอความช่วยเหลือ",
    "story": "เพื่อนของนายกอยากให้เทศบาลสนับสนุนกิจกรรมส่วนตัว",
    "choices": [
      {
        "title": "อนุมัติเงินตามคำขอ",
        "success": {
          "report": "เพื่อนได้รับความช่วยเหลือ แต่สื่อไม่พอใจ",
          "scores": {
            "image": -10,
            "integrity": -5
          }
        },
        "cost": 60000
      },
      {
        "title": "เสนอให้จัดเป็นกิจกรรมสาธารณะ",
        "success": {
          "report": "กิจกรรมได้รับการปรับให้เป็นประโยชน์ส่วนรวม",
          "scores": {
            "image": 5
          }
        },
        "cost": 30000
      },
      {
        "title": "ปฏิเสธ",
        "success": {
          "report": "ไม่ใช้งบเมืองเพื่อเรื่องส่วนตัว",
          "scores": {
            "integrity": 5
          }
        }
      }
    ]
  },
  {
    "id": "image-camera",
    "category": "image",
    "minLevel": 5,
    "title": "สารคดีติดตามชีวิตนายก",
    "story": "ทีมสารคดีขอเข้าถ่ายทำการทำงานของนายก",
    "choices": [
      {
        "title": "เปิดสำนักงานให้ถ่ายทำ",
        "success": {
          "report": "สารคดีนำเสนอผลงานในทางดี",
          "scores": {
            "image": 10,
            "fame": 5
          }
        },
        "requires": {
          "admin": 71
        }
      },
      {
        "title": "อนุญาตเฉพาะพื้นที่สาธารณะ",
        "success": {
          "report": "รายการเผยแพร่ตามปกติ",
          "scores": {
            "image": 5
          }
        }
      },
      {
        "title": "ไม่อนุญาต",
        "success": {
          "report": "พลาดโอกาสประชาสัมพันธ์",
          "scores": {}
        }
      }
    ]
  },
  {
    "id": "image-promise",
    "category": "image",
    "minLevel": 5,
    "title": "คำสัญญาที่ประชาชนจำได้",
    "story": "สื่อถามนายกว่าจะทำให้เมืองเดินทางสะดวกขึ้นจริงหรือไม่",
    "choices": [
      {
        "title": "พิสูจน์ด้วยอัตราสำเร็จ 80% วันนี้",
        "task": {
          "kind": "performance",
          "target": 80
        },
        "success": {
          "report": "นายกพิสูจน์ผลงานได้",
          "scores": {
            "image": 10
          }
        },
        "failure": {
          "report": "ทำไม่สำเร็จตามที่รับปาก",
          "scores": {
            "image": -10
          }
        }
      },
      {
        "title": "ขอไม่ให้คำมั่นที่วัดผลไม่ได้",
        "success": {
          "report": "สื่อรับทราบคำตอบ",
          "scores": {
            "image": -3
          }
        }
      },
      {
        "title": "ประกาศชัยชนะก่อนผลออก",
        "chance": 0.3,
        "success": {
          "report": "ข่าวได้รับการตอบรับ",
          "scores": {
            "image": 5
          }
        },
        "failure": {
          "report": "ประชาชนตั้งคำถามกับคำประกาศ",
          "scores": {
            "image": -15
          }
        }
      }
    ]
  },
  {
    "id": "image-gift",
    "category": "image",
    "minLevel": 3,
    "title": "ของขวัญที่ไม่ควรเก็บไว้",
    "story": "ผู้ประกอบการส่งของขวัญราคาแพงให้สำนักงานนายก",
    "choices": [
      {
        "title": "นำมูลค่าเข้าคลังและเปิดเผย",
        "success": {
          "report": "เทศบาลรับทรัพย์สินอย่างเปิดเผย",
          "scores": {
            "integrity": 5,
            "image": 5
          },
          "money": 30000
        }
      },
      {
        "title": "ส่งคืน",
        "success": {
          "report": "ผู้ส่งรับของคืน",
          "scores": {
            "image": 5
          }
        }
      },
      {
        "title": "รับไว้โดยไม่เปิดเผย",
        "success": {
          "report": "เกิดประวัติรับผลประโยชน์",
          "scores": {
            "integrity": -10
          },
          "flags": [
            "secretDonor"
          ]
        }
      }
    ]
  },
  {
    "id": "image-survey",
    "category": "image",
    "minLevel": 7,
    "title": "ผลสำรวจความนิยม",
    "story": "สำนักข่าวเสนอสำรวจความคิดเห็นของประชาชน",
    "choices": [
      {
        "title": "เผยแพร่ผลสำรวจตามจริง",
        "success": {
          "report": "ประชาชนเห็นข้อมูลอย่างเปิดเผย",
          "scores": {
            "image": 5,
            "integrity": 5
          }
        }
      },
      {
        "title": "จัดแคมเปญรับฟังเพิ่มเติม",
        "success": {
          "report": "ภาพลักษณ์ดีขึ้น",
          "scores": {
            "image": 10
          }
        },
        "cost": 70000
      },
      {
        "title": "ไม่สนับสนุน",
        "success": {
          "report": "ไม่มีการสำรวจเพิ่มเติม",
          "scores": {}
        }
      }
    ]
  },
  {
    "id": "image-critic",
    "category": "image",
    "minLevel": 6,
    "title": "คลิปวิจารณ์นายกกำลังดัง",
    "story": "ชาวเมืองแชร์คลิปการตอบคำถามที่ดูไม่สุภาพ",
    "choices": [
      {
        "title": "กล่าวขอโทษต่อสาธารณะ",
        "success": {
          "report": "กระแสวิจารณ์เบาลง",
          "scores": {
            "image": 10
          }
        }
      },
      {
        "title": "จัดเวทีตอบคำถาม",
        "success": {
          "report": "ประชาชนได้รับคำอธิบาย",
          "scores": {
            "image": 5,
            "people": 5
          }
        },
        "cost": 40000
      },
      {
        "title": "โต้กลับผู้เผยแพร่คลิป",
        "chance": 0.3,
        "success": {
          "report": "ผู้เผยแพร่ยุติเรื่อง",
          "scores": {
            "image": 5
          }
        },
        "failure": {
          "report": "กระแสต่อต้านขยายตัว",
          "scores": {
            "image": -15,
            "people": -5
          }
        }
      }
    ]
  },
  {
    "id": "image-community",
    "category": "image",
    "minLevel": 1,
    "title": "งานเลี้ยงรับรองประชาชน",
    "story": "ตัวแทนชุมชนเชิญนายกมาร่วมงานพบปะ",
    "choices": [
      {
        "title": "สนับสนุนงานชุมชน",
        "success": {
          "report": "งานประสบความสำเร็จ",
          "scores": {
            "image": 10,
            "people": 5
          }
        },
        "cost": 30000
      },
      {
        "title": "รับเชิญแบบเรียบง่าย",
        "success": {
          "report": "นายกได้พบประชาชน",
          "scores": {
            "image": 5
          }
        }
      },
      {
        "title": "ปฏิเสธ",
        "success": {
          "report": "ผู้จัดงานผิดหวังเล็กน้อย",
          "scores": {
            "image": -3
          }
        }
      }
    ]
  },
  {
    "id": "fame-tour-film",
    "category": "fame",
    "minLevel": 5,
    "title": "กองถ่ายริมชายหาด",
    "story": "ทีมภาพยนตร์ขอใช้ภาพเมืองเป็นฉากประกอบ",
    "choices": [
      {
        "title": "รับข้อเสนอประชาสัมพันธ์เมือง",
        "success": {
          "report": "ภาพยนตร์โปรโมตเมือง",
          "scores": {
            "fame": 10
          },
          "money": 120000
        },
        "requires": {
          "fame": 71
        }
      },
      {
        "title": "อนุญาตโดยไม่รับเงิน",
        "success": {
          "report": "เมืองได้รับการเผยแพร่",
          "scores": {
            "fame": 5
          }
        }
      },
      {
        "title": "ไม่อนุญาต",
        "success": {
          "report": "พลาดโอกาสประชาสัมพันธ์",
          "scores": {}
        }
      }
    ]
  },
  {
    "id": "fame-hotel-guide",
    "category": "fame",
    "minLevel": 3,
    "title": "คู่มือโรงแรมท้องถิ่น",
    "story": "สมาคมที่พักอยากทำคู่มือประชาสัมพันธ์โรงแรมเมือง",
    "requiresBuildings": {
      "hotel_starter": 1
    },
    "choices": [
      {
        "title": "สนับสนุนคู่มือ",
        "success": {
          "report": "นักท่องเที่ยวรู้จักเมืองมากขึ้น",
          "scores": {
            "fame": 10
          },
          "effects": [
            {
              "kind": "touristMultiplier",
              "scope": "tourist",
              "value": 2
            }
          ]
        },
        "cost": 70000
      },
      {
        "title": "ขอผู้สนับสนุน",
        "success": {
          "report": "สมาคมออกค่าใช้จ่ายให้",
          "scores": {
            "fame": 10
          },
          "effects": [
            {
              "kind": "touristMultiplier",
              "scope": "tourist",
              "value": 2
            }
          ]
        },
        "requires": {
          "fame": 71
        }
      },
      {
        "title": "ไม่ร่วมโครงการ",
        "success": {
          "report": "คู่มือไม่ได้จัดทำ",
          "scores": {}
        }
      }
    ]
  },
  {
    "id": "fame-restaurant-star",
    "category": "fame",
    "minLevel": 3,
    "title": "นักชิมชื่อดังมาเยือน",
    "story": "นักชิมเสนอเผยแพร่เรื่องร้านอาหารในเมือง",
    "requiresBuildings": {
      "restaurant_starter": 1
    },
    "choices": [
      {
        "title": "สนับสนุนกิจกรรมชิมอาหาร",
        "success": {
          "report": "ร้านอาหารได้รับความสนใจ",
          "scores": {
            "fame": 10
          },
          "effects": [
            {
              "kind": "tripMultiplier",
              "scope": "restaurant",
              "value": 2
            }
          ]
        },
        "cost": 50000
      },
      {
        "title": "ปล่อยให้รีวิวตามจริง",
        "success": {
          "report": "เมืองได้รับการกล่าวถึง",
          "scores": {
            "fame": 5
          }
        }
      },
      {
        "title": "ท้าให้รีวิวอาหารเมือง",
        "chance": 0.3,
        "success": {
          "report": "นักชิมชื่นชอบ",
          "scores": {
            "fame": 10
          }
        },
        "failure": {
          "report": "รีวิวออกมาในเชิงลบ",
          "scores": {
            "fame": -10
          }
        }
      }
    ]
  },
  {
    "id": "fame-shopping",
    "category": "fame",
    "minLevel": 6,
    "title": "งานช้อปปิ้งริมทะเล",
    "story": "ผู้จัดกิจกรรมเสนอโปรโมตศูนย์การค้าเมือง",
    "requiresBuildings": {
      "mall_starter": 1
    },
    "choices": [
      {
        "title": "สนับสนุนงาน",
        "success": {
          "report": "ห้างได้รับความนิยมวันนี้",
          "scores": {
            "fame": 10
          },
          "effects": [
            {
              "kind": "tripMultiplier",
              "scope": "mall",
              "value": 2
            }
          ]
        },
        "cost": 90000
      },
      {
        "title": "ให้เอกชนออกงบ",
        "success": {
          "report": "ผู้จัดงานรับผิดชอบค่าใช้จ่าย",
          "scores": {
            "fame": 5
          },
          "effects": [
            {
              "kind": "tripMultiplier",
              "scope": "mall",
              "value": 2
            }
          ]
        },
        "requires": {
          "business": 71
        }
      },
      {
        "title": "ไม่จัดงาน",
        "success": {
          "report": "เมืองดำเนินตามปกติ",
          "scores": {}
        }
      }
    ]
  },
  {
    "id": "fame-night",
    "category": "fame",
    "minLevel": 6,
    "title": "เมืองแห่งเสียงเพลงวันนี้",
    "story": "ผู้จัดงานขอทำแคมเปญสถานบันเทิงในเมือง",
    "requiresBuildings": {
      "pub_starter": 1
    },
    "choices": [
      {
        "title": "อนุมัติงบโปรโมต",
        "success": {
          "report": "แคมเปญได้รับความนิยม",
          "scores": {
            "fame": 10,
            "people": -5
          },
          "effects": [
            {
              "kind": "tripMultiplier",
              "scope": "pub",
              "value": 2
            }
          ]
        },
        "cost": 80000
      },
      {
        "title": "จัดแบบประหยัด",
        "success": {
          "report": "แคมเปญขนาดเล็กสำเร็จ",
          "scores": {
            "fame": 5
          }
        },
        "cost": 20000
      },
      {
        "title": "ไม่ร่วม",
        "success": {
          "report": "ไม่เกิดผลกระทบ",
          "scores": {}
        }
      }
    ]
  },
  {
    "id": "fame-coast",
    "category": "fame",
    "minLevel": 1,
    "title": "ภาพชายหาดติดอันดับข่าว",
    "story": "สื่อขอให้เมืองช่วยทำกิจกรรมรักษาความสะอาดชายฝั่ง",
    "choices": [
      {
        "title": "จัดกิจกรรมทำความสะอาด",
        "success": {
          "report": "ชายหาดได้รับเสียงชื่นชม",
          "scores": {
            "fame": 10
          },
          "effects": [
            {
              "kind": "touristMultiplier",
              "scope": "tourist",
              "value": 2
            }
          ]
        },
        "cost": 45000
      },
      {
        "title": "ประสานอาสาสมัคร",
        "success": {
          "report": "กิจกรรมสำเร็จโดยไม่ใช้งบ",
          "scores": {
            "fame": 5
          }
        },
        "requires": {
          "people": 71
        }
      },
      {
        "title": "ไม่เข้าร่วม",
        "success": {
          "report": "สื่อไม่พอใจการเพิกเฉย",
          "scores": {
            "fame": -5
          }
        }
      }
    ]
  },
  {
    "id": "fame-rival",
    "category": "fame",
    "minLevel": 6,
    "title": "เมืองคู่แข่งเปิดตัวแคมเปญ",
    "story": "เมืองข้างเคียงได้รับความสนใจจากนักท่องเที่ยว",
    "choices": [
      {
        "title": "ร่วมโปรโมตทั้งสองเมือง",
        "success": {
          "report": "เมืองได้รับการประชาสัมพันธ์ร่วมกัน",
          "scores": {
            "fame": 5
          }
        },
        "cost": 45000
      },
      {
        "title": "จัดแคมเปญของเราเอง",
        "success": {
          "report": "เมืองได้รับความสนใจเพิ่ม",
          "scores": {
            "fame": 10
          },
          "effects": [
            {
              "kind": "touristMultiplier",
              "scope": "tourist",
              "value": 2
            }
          ]
        },
        "cost": 90000
      },
      {
        "title": "ไม่แข่งขัน",
        "chance": 0.3,
        "success": {
          "report": "กระแสคู่แข่งเงียบลง",
          "scores": {}
        },
        "failure": {
          "report": "เมืองเสียโอกาสและชื่อเสียงลดลง",
          "scores": {
            "fame": -10
          }
        }
      }
    ]
  },
  {
    "id": "fame-landmark",
    "category": "fame",
    "minLevel": 12,
    "title": "สื่อสถาปัตยกรรมสนใจเมือง",
    "story": "สื่ออยากเผยแพร่เรื่องตึกมหานครของเรา",
    "requiresBuildings": {
      "home_mahanakhon": 1
    },
    "choices": [
      {
        "title": "สนับสนุนงานนำเสนอ",
        "success": {
          "report": "แลนด์มาร์กได้รับการประชาสัมพันธ์",
          "scores": {
            "fame": 15
          },
          "effects": [
            {
              "kind": "touristMultiplier",
              "scope": "tourist",
              "value": 3
            }
          ]
        },
        "cost": 80000
      },
      {
        "title": "ให้ข้อมูลอย่างเดียว",
        "success": {
          "report": "สื่อเผยแพร่ข้อมูลเมือง",
          "scores": {
            "fame": 5
          }
        }
      },
      {
        "title": "ไม่ร่วมงาน",
        "success": {
          "report": "ไม่มีการประชาสัมพันธ์",
          "scores": {}
        }
      }
    ]
  },
  {
    "id": "fame-park",
    "category": "fame",
    "minLevel": 3,
    "title": "งานครอบครัววันหยุด",
    "story": "ผู้จัดงานขอโปรโมตกิจกรรมพักผ่อนในสวนเมือง",
    "requiresBuildings": {
      "park_starter": 1
    },
    "choices": [
      {
        "title": "สนับสนุนงาน",
        "success": {
          "report": "กิจกรรมครอบครัวได้รับการตอบรับ",
          "scores": {
            "fame": 10,
            "people": 5
          },
          "effects": [
            {
              "kind": "tripMultiplier",
              "scope": "park",
              "value": 2
            }
          ]
        },
        "cost": 40000
      },
      {
        "title": "ให้ผู้จัดรับผิดชอบงบ",
        "success": {
          "report": "กิจกรรมจัดขึ้นโดยเอกชน",
          "scores": {
            "fame": 5
          }
        },
        "requires": {
          "business": 71
        }
      },
      {
        "title": "ไม่อนุญาต",
        "success": {
          "report": "งานไม่ได้จัด",
          "scores": {}
        }
      }
    ]
  },
  {
    "id": "fame-visitor",
    "category": "fame",
    "minLevel": 5,
    "title": "นักท่องเที่ยวไม่พอใจบริการ",
    "story": "ตัวแทนกลุ่มทัวร์ขอคำชี้แจงจากเทศบาล",
    "choices": [
      {
        "title": "จ่ายงบช่วยเหลือ",
        "success": {
          "report": "กลุ่มทัวร์ถอนคำร้อง",
          "scores": {
            "fame": 10
          }
        },
        "cost": 65000
      },
      {
        "title": "เจรจาด้วยผลงานเมือง",
        "success": {
          "report": "กลุ่มทัวร์ยอมรับคำชี้แจง",
          "scores": {
            "fame": 10
          }
        },
        "requires": {
          "fame": 71
        }
      },
      {
        "title": "ไม่ตอบคำร้อง",
        "chance": 0.3,
        "success": {
          "report": "กลุ่มทัวร์ยุติเรื่อง",
          "scores": {}
        },
        "failure": {
          "report": "กลุ่มทัวร์ยกเลิกการเดินทาง",
          "scores": {
            "fame": -10
          },
          "effects": [
            {
              "kind": "touristBlock",
              "scope": "tourist",
              "value": 1
            }
          ]
        }
      }
    ]
  },
  {
    "id": "fame-press-trip",
    "category": "fame",
    "minLevel": 8,
    "title": "คณะสื่อเดินทางมาดูเมือง",
    "story": "สมาคมท่องเที่ยวขอพาสื่อเยี่ยมชมสถานที่ต่าง ๆ",
    "choices": [
      {
        "title": "ต้อนรับเต็มรูปแบบ",
        "success": {
          "report": "ข่าวท่องเที่ยวเผยแพร่ทั่วประเทศ",
          "scores": {
            "fame": 10
          },
          "effects": [
            {
              "kind": "touristMultiplier",
              "scope": "tourist",
              "value": 3
            }
          ]
        },
        "cost": 100000
      },
      {
        "title": "ต้อนรับแบบประหยัด",
        "success": {
          "report": "ได้รับข่าวประชาสัมพันธ์เล็กน้อย",
          "scores": {
            "fame": 5
          }
        },
        "cost": 25000
      },
      {
        "title": "ไม่รับคณะ",
        "success": {
          "report": "ไม่มีการเปลี่ยนแปลง",
          "scores": {}
        }
      }
    ]
  },
  {
    "id": "fame-city-award",
    "category": "fame",
    "minLevel": 10,
    "title": "คัดเลือกเมืองท่องเที่ยวดีเด่น",
    "story": "คณะกรรมการให้เมืองแสดงความพร้อมด้านการเดินทาง",
    "choices": [
      {
        "title": "ผ่านเกณฑ์การเดินทาง 85% วันนี้",
        "requires": {
          "fame": 51
        },
        "task": {
          "kind": "performance",
          "target": 85
        },
        "success": {
          "report": "เมืองได้รับรางวัล",
          "scores": {
            "fame": 15
          },
          "money": 180000
        },
        "failure": {
          "report": "เมืองไม่ผ่านการคัดเลือก",
          "scores": {
            "fame": -10
          }
        }
      },
      {
        "title": "ไม่สมัคร",
        "success": {
          "report": "เมืองไม่เข้าร่วม",
          "scores": {}
        }
      },
      {
        "title": "ขอคำแนะนำเพื่อปรับปรุง",
        "success": {
          "report": "ได้รับคำแนะนำจากกรรมการ",
          "scores": {
            "fame": 5
          }
        },
        "cost": 35000
      }
    ]
  },
  {
    "id": "fame-festival-sponsor",
    "category": "fame",
    "minLevel": 8,
    "title": "ผู้สนับสนุนอยากจัดงานใหญ่",
    "story": "ผู้สนับสนุนเสนอเงินเข้าคลังแลกพื้นที่ประชาสัมพันธ์ในเมือง",
    "choices": [
      {
        "title": "รับเงินพร้อมประชาสัมพันธ์",
        "success": {
          "report": "ผู้สนับสนุนโอนเงินให้",
          "scores": {
            "fame": 5,
            "image": -5
          },
          "money": 200000
        }
      },
      {
        "title": "ขอรูปแบบไม่รบกวนชุมชน",
        "success": {
          "report": "ผู้สนับสนุนตกลงข้อเสนอ",
          "scores": {
            "fame": 10
          },
          "money": 100000
        },
        "requires": {
          "fame": 86
        }
      },
      {
        "title": "ไม่รับ",
        "success": {
          "report": "ไม่มีเงินสนับสนุน",
          "scores": {}
        }
      }
    ]
  },
  {
    "id": "government-grant-shop",
    "category": "government",
    "minLevel": 1,
    "title": "โครงการภาครัฐ: ร้านค้าเริ่มต้น",
    "story": "รัฐบาลจัดงบให้เทศบาลเพิ่ม ร้านค้าเริ่มต้น จำนวน 3 แห่ง ภายในวันนี้ พร้อมตรวจผลงานก่อนปิดรอบ",
    "choices": [
      {
        "title": "รับงบ 18,000 บาท สร้างร้านค้าเริ่มต้น 3 แห่ง",
        "task": {
          "kind": "build",
          "key": "shop_starter",
          "count": 3
        },
        "success": {
          "report": "ส่งมอบโครงการภาครัฐสำเร็จ",
          "scores": {
            "government": 10,
            "admin": 5
          }
        },
        "failure": {
          "report": "สร้างไม่ครบตามสัญญา",
          "scores": {
            "government": -10
          }
        },
        "grant": 18000,
        "requires": {
          "government": 71
        }
      },
      {
        "title": "รับงบ 9,000 บาท สร้างร้านค้าเริ่มต้น 3 แห่ง",
        "task": {
          "kind": "build",
          "key": "shop_starter",
          "count": 3
        },
        "success": {
          "report": "ส่งมอบโครงการตามสัญญา",
          "scores": {
            "government": 10
          }
        },
        "failure": {
          "report": "ก่อสร้างไม่ครบ",
          "scores": {
            "government": -10
          }
        },
        "grant": 9000,
        "requires": {
          "government": 51
        }
      },
      {
        "title": "ไม่รับโครงการ",
        "success": {
          "report": "รัฐบาลนำงบไปให้เมืองอื่น",
          "scores": {
            "fame": -5
          }
        }
      }
    ]
  },
  {
    "id": "government-grant-food",
    "category": "government",
    "minLevel": 1,
    "title": "โครงการภาครัฐ: ร้านอาหารเริ่มต้น",
    "story": "รัฐบาลจัดงบให้เทศบาลเพิ่ม ร้านอาหารเริ่มต้น จำนวน 3 แห่ง ภายในวันนี้ พร้อมตรวจผลงานก่อนปิดรอบ",
    "choices": [
      {
        "title": "รับงบ 30,000 บาท สร้างร้านอาหารเริ่มต้น 3 แห่ง",
        "task": {
          "kind": "build",
          "key": "restaurant_starter",
          "count": 3
        },
        "success": {
          "report": "ส่งมอบโครงการภาครัฐสำเร็จ",
          "scores": {
            "government": 10,
            "admin": 5
          }
        },
        "failure": {
          "report": "สร้างไม่ครบตามสัญญา",
          "scores": {
            "government": -10
          }
        },
        "grant": 30000,
        "requires": {
          "government": 71
        }
      },
      {
        "title": "รับงบ 15,000 บาท สร้างร้านอาหารเริ่มต้น 3 แห่ง",
        "task": {
          "kind": "build",
          "key": "restaurant_starter",
          "count": 3
        },
        "success": {
          "report": "ส่งมอบโครงการตามสัญญา",
          "scores": {
            "government": 10
          }
        },
        "failure": {
          "report": "ก่อสร้างไม่ครบ",
          "scores": {
            "government": -10
          }
        },
        "grant": 15000,
        "requires": {
          "government": 51
        }
      },
      {
        "title": "ไม่รับโครงการ",
        "success": {
          "report": "รัฐบาลนำงบไปให้เมืองอื่น",
          "scores": {
            "fame": -5
          }
        }
      }
    ]
  },
  {
    "id": "government-grant-office",
    "category": "government",
    "minLevel": 2,
    "title": "โครงการภาครัฐ: สำนักงานเริ่มต้น",
    "story": "รัฐบาลจัดงบให้เทศบาลเพิ่ม สำนักงานเริ่มต้น จำนวน 2 แห่ง ภายในวันนี้ พร้อมตรวจผลงานก่อนปิดรอบ",
    "choices": [
      {
        "title": "รับงบ 24,000 บาท สร้างสำนักงานเริ่มต้น 2 แห่ง",
        "task": {
          "kind": "build",
          "key": "office_starter",
          "count": 2
        },
        "success": {
          "report": "ส่งมอบโครงการภาครัฐสำเร็จ",
          "scores": {
            "government": 10,
            "admin": 5
          }
        },
        "failure": {
          "report": "สร้างไม่ครบตามสัญญา",
          "scores": {
            "government": -10
          }
        },
        "grant": 24000,
        "requires": {
          "government": 71
        }
      },
      {
        "title": "รับงบ 12,000 บาท สร้างสำนักงานเริ่มต้น 2 แห่ง",
        "task": {
          "kind": "build",
          "key": "office_starter",
          "count": 2
        },
        "success": {
          "report": "ส่งมอบโครงการตามสัญญา",
          "scores": {
            "government": 10
          }
        },
        "failure": {
          "report": "ก่อสร้างไม่ครบ",
          "scores": {
            "government": -10
          }
        },
        "grant": 12000,
        "requires": {
          "government": 51
        }
      },
      {
        "title": "ไม่รับโครงการ",
        "success": {
          "report": "รัฐบาลนำงบไปให้เมืองอื่น",
          "scores": {
            "fame": -5
          }
        }
      }
    ]
  },
  {
    "id": "government-grant-park",
    "category": "government",
    "minLevel": 2,
    "title": "โครงการภาครัฐ: สวนเริ่มต้น",
    "story": "รัฐบาลจัดงบให้เทศบาลเพิ่ม สวนเริ่มต้น จำนวน 3 แห่ง ภายในวันนี้ พร้อมตรวจผลงานก่อนปิดรอบ",
    "choices": [
      {
        "title": "รับงบ 15,000 บาท สร้างสวนเริ่มต้น 3 แห่ง",
        "task": {
          "kind": "build",
          "key": "park_starter",
          "count": 3
        },
        "success": {
          "report": "ส่งมอบโครงการภาครัฐสำเร็จ",
          "scores": {
            "government": 10,
            "admin": 5
          }
        },
        "failure": {
          "report": "สร้างไม่ครบตามสัญญา",
          "scores": {
            "government": -10
          }
        },
        "grant": 15000,
        "requires": {
          "government": 71
        }
      },
      {
        "title": "รับงบ 7,500 บาท สร้างสวนเริ่มต้น 3 แห่ง",
        "task": {
          "kind": "build",
          "key": "park_starter",
          "count": 3
        },
        "success": {
          "report": "ส่งมอบโครงการตามสัญญา",
          "scores": {
            "government": 10
          }
        },
        "failure": {
          "report": "ก่อสร้างไม่ครบ",
          "scores": {
            "government": -10
          }
        },
        "grant": 7500,
        "requires": {
          "government": 51
        }
      },
      {
        "title": "ไม่รับโครงการ",
        "success": {
          "report": "รัฐบาลนำงบไปให้เมืองอื่น",
          "scores": {
            "fame": -5
          }
        }
      }
    ]
  },
  {
    "id": "government-grant-hotel",
    "category": "government",
    "minLevel": 3,
    "title": "โครงการภาครัฐ: โรงแรมเริ่มต้น",
    "story": "รัฐบาลจัดงบให้เทศบาลเพิ่ม โรงแรมเริ่มต้น จำนวน 2 แห่ง ภายในวันนี้ พร้อมตรวจผลงานก่อนปิดรอบ",
    "choices": [
      {
        "title": "รับงบ 10,000 บาท สร้างโรงแรมเริ่มต้น 2 แห่ง",
        "task": {
          "kind": "build",
          "key": "hotel_starter",
          "count": 2
        },
        "success": {
          "report": "ส่งมอบโครงการภาครัฐสำเร็จ",
          "scores": {
            "government": 10,
            "admin": 5
          }
        },
        "failure": {
          "report": "สร้างไม่ครบตามสัญญา",
          "scores": {
            "government": -10
          }
        },
        "grant": 10000,
        "requires": {
          "government": 71
        }
      },
      {
        "title": "รับงบ 5,000 บาท สร้างโรงแรมเริ่มต้น 2 แห่ง",
        "task": {
          "kind": "build",
          "key": "hotel_starter",
          "count": 2
        },
        "success": {
          "report": "ส่งมอบโครงการตามสัญญา",
          "scores": {
            "government": 10
          }
        },
        "failure": {
          "report": "ก่อสร้างไม่ครบ",
          "scores": {
            "government": -10
          }
        },
        "grant": 5000,
        "requires": {
          "government": 51
        }
      },
      {
        "title": "ไม่รับโครงการ",
        "success": {
          "report": "รัฐบาลนำงบไปให้เมืองอื่น",
          "scores": {
            "fame": -5
          }
        }
      }
    ]
  },
  {
    "id": "government-grant-factory",
    "category": "government",
    "minLevel": 3,
    "title": "โครงการภาครัฐ: โรงงานเริ่มต้น",
    "story": "รัฐบาลจัดงบให้เทศบาลเพิ่ม โรงงานเริ่มต้น จำนวน 2 แห่ง ภายในวันนี้ พร้อมตรวจผลงานก่อนปิดรอบ",
    "choices": [
      {
        "title": "รับงบ 32,000 บาท สร้างโรงงานเริ่มต้น 2 แห่ง",
        "task": {
          "kind": "build",
          "key": "factory_starter",
          "count": 2
        },
        "success": {
          "report": "ส่งมอบโครงการภาครัฐสำเร็จ",
          "scores": {
            "government": 10,
            "admin": 5
          }
        },
        "failure": {
          "report": "สร้างไม่ครบตามสัญญา",
          "scores": {
            "government": -10
          }
        },
        "grant": 32000,
        "requires": {
          "government": 71
        }
      },
      {
        "title": "รับงบ 16,000 บาท สร้างโรงงานเริ่มต้น 2 แห่ง",
        "task": {
          "kind": "build",
          "key": "factory_starter",
          "count": 2
        },
        "success": {
          "report": "ส่งมอบโครงการตามสัญญา",
          "scores": {
            "government": 10
          }
        },
        "failure": {
          "report": "ก่อสร้างไม่ครบ",
          "scores": {
            "government": -10
          }
        },
        "grant": 16000,
        "requires": {
          "government": 51
        }
      },
      {
        "title": "ไม่รับโครงการ",
        "success": {
          "report": "รัฐบาลนำงบไปให้เมืองอื่น",
          "scores": {
            "fame": -5
          }
        }
      }
    ]
  },
  {
    "id": "government-grant-mall",
    "category": "government",
    "minLevel": 5,
    "title": "โครงการภาครัฐ: ห้างเริ่มต้น",
    "story": "รัฐบาลจัดงบให้เทศบาลเพิ่ม ห้างเริ่มต้น จำนวน 2 แห่ง ภายในวันนี้ พร้อมตรวจผลงานก่อนปิดรอบ",
    "choices": [
      {
        "title": "รับงบ 48,000 บาท สร้างห้างเริ่มต้น 2 แห่ง",
        "task": {
          "kind": "build",
          "key": "mall_starter",
          "count": 2
        },
        "success": {
          "report": "ส่งมอบโครงการภาครัฐสำเร็จ",
          "scores": {
            "government": 10,
            "admin": 5
          }
        },
        "failure": {
          "report": "สร้างไม่ครบตามสัญญา",
          "scores": {
            "government": -10
          }
        },
        "grant": 48000,
        "requires": {
          "government": 71
        }
      },
      {
        "title": "รับงบ 24,000 บาท สร้างห้างเริ่มต้น 2 แห่ง",
        "task": {
          "kind": "build",
          "key": "mall_starter",
          "count": 2
        },
        "success": {
          "report": "ส่งมอบโครงการตามสัญญา",
          "scores": {
            "government": 10
          }
        },
        "failure": {
          "report": "ก่อสร้างไม่ครบ",
          "scores": {
            "government": -10
          }
        },
        "grant": 24000,
        "requires": {
          "government": 51
        }
      },
      {
        "title": "ไม่รับโครงการ",
        "success": {
          "report": "รัฐบาลนำงบไปให้เมืองอื่น",
          "scores": {
            "fame": -5
          }
        }
      }
    ]
  },
  {
    "id": "government-grant-pub",
    "category": "government",
    "minLevel": 5,
    "title": "โครงการภาครัฐ: ผับเริ่มต้น",
    "story": "รัฐบาลจัดงบให้เทศบาลเพิ่ม ผับเริ่มต้น จำนวน 2 แห่ง ภายในวันนี้ พร้อมตรวจผลงานก่อนปิดรอบ",
    "choices": [
      {
        "title": "รับงบ 24,000 บาท สร้างผับเริ่มต้น 2 แห่ง",
        "task": {
          "kind": "build",
          "key": "pub_starter",
          "count": 2
        },
        "success": {
          "report": "ส่งมอบโครงการภาครัฐสำเร็จ",
          "scores": {
            "government": 10,
            "admin": 5
          }
        },
        "failure": {
          "report": "สร้างไม่ครบตามสัญญา",
          "scores": {
            "government": -10
          }
        },
        "grant": 24000,
        "requires": {
          "government": 71
        }
      },
      {
        "title": "รับงบ 12,000 บาท สร้างผับเริ่มต้น 2 แห่ง",
        "task": {
          "kind": "build",
          "key": "pub_starter",
          "count": 2
        },
        "success": {
          "report": "ส่งมอบโครงการตามสัญญา",
          "scores": {
            "government": 10
          }
        },
        "failure": {
          "report": "ก่อสร้างไม่ครบ",
          "scores": {
            "government": -10
          }
        },
        "grant": 12000,
        "requires": {
          "government": 51
        }
      },
      {
        "title": "ไม่รับโครงการ",
        "success": {
          "report": "รัฐบาลนำงบไปให้เมืองอื่น",
          "scores": {
            "fame": -5
          }
        }
      }
    ]
  },
  {
    "id": "government-grant-home-small",
    "category": "government",
    "minLevel": 6,
    "title": "โครงการภาครัฐ: บ้านเล็ก",
    "story": "รัฐบาลจัดงบให้เทศบาลเพิ่ม บ้านเล็ก จำนวน 1 แห่ง ภายในวันนี้ พร้อมตรวจผลงานก่อนปิดรอบ",
    "choices": [
      {
        "title": "รับงบ 260,000 บาท สร้างบ้านเล็ก 1 แห่ง",
        "task": {
          "kind": "build",
          "key": "home_large",
          "count": 1
        },
        "success": {
          "report": "ส่งมอบโครงการภาครัฐสำเร็จ",
          "scores": {
            "government": 10,
            "admin": 5
          }
        },
        "failure": {
          "report": "สร้างไม่ครบตามสัญญา",
          "scores": {
            "government": -10
          }
        },
        "grant": 260000,
        "requires": {
          "government": 71
        }
      },
      {
        "title": "รับงบ 130,000 บาท สร้างบ้านเล็ก 1 แห่ง",
        "task": {
          "kind": "build",
          "key": "home_large",
          "count": 1
        },
        "success": {
          "report": "ส่งมอบโครงการตามสัญญา",
          "scores": {
            "government": 10
          }
        },
        "failure": {
          "report": "ก่อสร้างไม่ครบ",
          "scores": {
            "government": -10
          }
        },
        "grant": 130000,
        "requires": {
          "government": 51
        }
      },
      {
        "title": "ไม่รับโครงการ",
        "success": {
          "report": "รัฐบาลนำงบไปให้เมืองอื่น",
          "scores": {
            "fame": -5
          }
        }
      }
    ]
  },
  {
    "id": "government-grant-pub-large",
    "category": "government",
    "minLevel": 12,
    "title": "โครงการภาครัฐ: ผับใหญ่",
    "story": "รัฐบาลจัดงบให้เทศบาลเพิ่ม ผับใหญ่ จำนวน 1 แห่ง ภายในวันนี้ พร้อมตรวจผลงานก่อนปิดรอบ",
    "choices": [
      {
        "title": "รับงบ 170,000 บาท สร้างผับใหญ่ 1 แห่ง",
        "task": {
          "kind": "build",
          "key": "pub_large",
          "count": 1
        },
        "success": {
          "report": "ส่งมอบโครงการภาครัฐสำเร็จ",
          "scores": {
            "government": 10,
            "admin": 5
          }
        },
        "failure": {
          "report": "สร้างไม่ครบตามสัญญา",
          "scores": {
            "government": -10
          }
        },
        "grant": 170000,
        "requires": {
          "government": 71
        }
      },
      {
        "title": "รับงบ 85,000 บาท สร้างผับใหญ่ 1 แห่ง",
        "task": {
          "kind": "build",
          "key": "pub_large",
          "count": 1
        },
        "success": {
          "report": "ส่งมอบโครงการตามสัญญา",
          "scores": {
            "government": 10
          }
        },
        "failure": {
          "report": "ก่อสร้างไม่ครบ",
          "scores": {
            "government": -10
          }
        },
        "grant": 85000,
        "requires": {
          "government": 51
        }
      },
      {
        "title": "ไม่รับโครงการ",
        "success": {
          "report": "รัฐบาลนำงบไปให้เมืองอื่น",
          "scores": {
            "fame": -5
          }
        }
      }
    ]
  },
  {
    "id": "government-grant-mall-large",
    "category": "government",
    "minLevel": 15,
    "title": "โครงการภาครัฐ: ห้างใหญ่",
    "story": "รัฐบาลจัดงบให้เทศบาลเพิ่ม ห้างใหญ่ จำนวน 1 แห่ง ภายในวันนี้ พร้อมตรวจผลงานก่อนปิดรอบ",
    "choices": [
      {
        "title": "รับงบ 380,000 บาท สร้างห้างใหญ่ 1 แห่ง",
        "task": {
          "kind": "build",
          "key": "mall_large",
          "count": 1
        },
        "success": {
          "report": "ส่งมอบโครงการภาครัฐสำเร็จ",
          "scores": {
            "government": 10,
            "admin": 5
          }
        },
        "failure": {
          "report": "สร้างไม่ครบตามสัญญา",
          "scores": {
            "government": -10
          }
        },
        "grant": 380000,
        "requires": {
          "government": 71
        }
      },
      {
        "title": "รับงบ 190,000 บาท สร้างห้างใหญ่ 1 แห่ง",
        "task": {
          "kind": "build",
          "key": "mall_large",
          "count": 1
        },
        "success": {
          "report": "ส่งมอบโครงการตามสัญญา",
          "scores": {
            "government": 10
          }
        },
        "failure": {
          "report": "ก่อสร้างไม่ครบ",
          "scores": {
            "government": -10
          }
        },
        "grant": 190000,
        "requires": {
          "government": 51
        }
      },
      {
        "title": "ไม่รับโครงการ",
        "success": {
          "report": "รัฐบาลนำงบไปให้เมืองอื่น",
          "scores": {
            "fame": -5
          }
        }
      }
    ]
  },
  {
    "id": "government-visit",
    "category": "government",
    "minLevel": 3,
    "title": "คณะรัฐบาลขอเข้าพบ",
    "story": "เจ้าหน้าที่ส่วนกลางต้องการรับฟังแผนพัฒนาเมือง",
    "choices": [
      {
        "title": "ต้อนรับและเสนอแผนงาน",
        "success": {
          "report": "รัฐบาลพอใจการประสานงาน",
          "scores": {
            "government": 10
          }
        },
        "cost": 35000
      },
      {
        "title": "ประชุมแบบประหยัด",
        "success": {
          "report": "หารือสำเร็จ",
          "scores": {
            "government": 5
          }
        }
      },
      {
        "title": "ไม่สะดวกเข้าพบ",
        "success": {
          "report": "รัฐบาลไม่พอใจ",
          "scores": {
            "government": -5
          }
        }
      }
    ]
  },
  {
    "id": "government-fund-return",
    "category": "government",
    "minLevel": 7,
    "title": "เงินสนับสนุนเมืองเพื่อนบ้าน",
    "story": "รัฐบาลขอให้เมืองร่วมช่วยเหลือพื้นที่ที่ประสบปัญหา",
    "choices": [
      {
        "title": "ร่วมสมทบงบ",
        "success": {
          "report": "รัฐบาลชื่นชมความร่วมมือ",
          "scores": {
            "government": 10,
            "image": 5
          }
        },
        "cost": 100000
      },
      {
        "title": "สมทบตามกำลัง",
        "success": {
          "report": "ได้รับคำขอบคุณจากรัฐบาล",
          "scores": {
            "government": 5
          }
        },
        "cost": 25000
      },
      {
        "title": "ไม่ร่วมสมทบ",
        "success": {
          "report": "รัฐบาลรับทราบการปฏิเสธ",
          "scores": {
            "government": -5
          }
        }
      }
    ]
  },
  {
    "id": "people-housing",
    "category": "people",
    "minLevel": 1,
    "title": "บ้านว่างไม่พอรับคนใหม่",
    "story": "ชาวเมืองขอให้เทศบาลเพิ่มที่อยู่อาศัยพื้นฐาน",
    "choices": [
      {
        "title": "สร้างบ้านเริ่มต้น 3 หลัง",
        "task": {
          "kind": "build",
          "key": "home_starter",
          "count": 3
        },
        "success": {
          "report": "สร้างบ้านครบตามคำขอ",
          "scores": {
            "people": 10
          }
        },
        "failure": {
          "report": "สร้างบ้านไม่ครบ",
          "scores": {
            "people": -10
          }
        },
        "requires": {
          "people": 51
        }
      },
      {
        "title": "สนับสนุนค่าใช้จ่ายย้ายถิ่น",
        "success": {
          "report": "ประชาชนพอใจมาตรการช่วยเหลือ",
          "scores": {
            "people": 5
          }
        },
        "cost": 45000
      },
      {
        "title": "ไม่ดำเนินการ",
        "success": {
          "report": "ประชาชนชะลอการย้ายเข้า",
          "scores": {
            "people": -10
          },
          "effects": [
            {
              "kind": "populationBlock",
              "scope": "residents",
              "value": 1
            }
          ]
        }
      }
    ]
  },
  {
    "id": "people-food",
    "category": "people",
    "minLevel": 1,
    "title": "อยากมีร้านอาหารใกล้บ้าน",
    "story": "ตัวแทนชุมชนขอเพิ่มสถานที่รับประทานอาหาร",
    "choices": [
      {
        "title": "สร้างร้านอาหารเริ่มต้น 2 แห่ง",
        "task": {
          "kind": "build",
          "key": "restaurant_starter",
          "count": 2
        },
        "success": {
          "report": "เพิ่มร้านอาหารครบ",
          "scores": {
            "people": 10
          }
        },
        "failure": {
          "report": "ทำตามคำขอไม่ครบ",
          "scores": {
            "people": -10
          }
        }
      },
      {
        "title": "ช่วยเหลืองบชุมชน",
        "success": {
          "report": "ประชาชนได้รับความช่วยเหลือ",
          "scores": {
            "people": 5
          }
        },
        "cost": 25000
      },
      {
        "title": "ปฏิเสธ",
        "success": {
          "report": "ประชาชนไม่พอใจ",
          "scores": {
            "people": -5
          }
        }
      }
    ]
  },
  {
    "id": "people-shopping",
    "category": "people",
    "minLevel": 1,
    "title": "ของใช้ประจำวันหาซื้อยาก",
    "story": "ชุมชนขอให้มีร้านค้าใกล้ที่อยู่อาศัยมากขึ้น",
    "choices": [
      {
        "title": "สร้างร้านค้าเริ่มต้น 2 แห่ง",
        "task": {
          "kind": "build",
          "key": "shop_starter",
          "count": 2
        },
        "success": {
          "report": "เปิดร้านค้าเพิ่มตามคำขอ",
          "scores": {
            "people": 10
          }
        },
        "failure": {
          "report": "สร้างไม่ครบ",
          "scores": {
            "people": -10
          }
        }
      },
      {
        "title": "จัดงบช่วยเหลือ",
        "success": {
          "report": "ชุมชนได้รับความช่วยเหลือ",
          "scores": {
            "people": 5
          }
        },
        "cost": 30000
      },
      {
        "title": "ไม่แก้ไข",
        "success": {
          "report": "คำร้องไม่ถูกดำเนินการ",
          "scores": {
            "people": -10
          }
        }
      }
    ]
  },
  {
    "id": "people-green",
    "category": "people",
    "minLevel": 2,
    "title": "ขอพื้นที่ให้เด็กและครอบครัว",
    "story": "ครอบครัวในเมืองขอพื้นที่พักผ่อนเพิ่ม",
    "choices": [
      {
        "title": "สร้างสวนเริ่มต้น 3 แห่ง",
        "task": {
          "kind": "build",
          "key": "park_starter",
          "count": 3
        },
        "success": {
          "report": "เปิดสวนครบตามข้อตกลง",
          "scores": {
            "people": 10
          }
        },
        "failure": {
          "report": "สร้างสวนไม่ครบ",
          "scores": {
            "people": -10
          }
        }
      },
      {
        "title": "จัดกิจกรรมชุมชน",
        "success": {
          "report": "ประชาชนชื่นชมกิจกรรม",
          "scores": {
            "people": 5,
            "image": 5
          }
        },
        "cost": 30000
      },
      {
        "title": "ไม่อนุมัติ",
        "success": {
          "report": "ชุมชนผิดหวัง",
          "scores": {
            "people": -5
          }
        }
      }
    ]
  },
  {
    "id": "people-jobs",
    "category": "people",
    "minLevel": 3,
    "title": "ชุมชนอยากมีงานเพิ่ม",
    "story": "ตัวแทนแรงงานขอพื้นที่ทำงานเพิ่มเติม",
    "choices": [
      {
        "title": "สร้างสำนักงานเริ่มต้น 3 แห่ง",
        "task": {
          "kind": "build",
          "key": "office_starter",
          "count": 3
        },
        "success": {
          "report": "เพิ่มสถานที่ทำงานสำเร็จ",
          "scores": {
            "people": 10
          }
        },
        "failure": {
          "report": "สร้างสำนักงานไม่ครบ",
          "scores": {
            "people": -10
          }
        },
        "requires": {
          "people": 51
        }
      },
      {
        "title": "สนับสนุนค่าเดินทาง",
        "success": {
          "report": "คนทำงานได้รับความช่วยเหลือ",
          "scores": {
            "people": 5
          }
        },
        "cost": 45000
      },
      {
        "title": "ปฏิเสธ",
        "success": {
          "report": "ประชาชนชะลอการย้ายเข้า",
          "scores": {
            "people": -10
          },
          "effects": [
            {
              "kind": "populationBlock",
              "scope": "residents",
              "value": 1
            }
          ]
        }
      }
    ]
  },
  {
    "id": "people-night-noise",
    "category": "people",
    "minLevel": 5,
    "title": "เสียงเพลงดังถึงบ้าน",
    "story": "ชาวเมืองร้องเรียนเสียงจากสถานบันเทิง",
    "requiresBuildings": {
      "pub_starter": 1
    },
    "choices": [
      {
        "title": "ลดรายได้จากผับ 200 บาทวันนี้",
        "success": {
          "report": "ชุมชนพอใจการประนีประนอม",
          "scores": {
            "people": 10,
            "business": -5
          },
          "effects": [
            {
              "kind": "tripDelta",
              "scope": "pub",
              "value": -200
            }
          ]
        }
      },
      {
        "title": "จ่ายงบประสานชุมชน",
        "success": {
          "report": "ข้อร้องเรียนลดลง",
          "scores": {
            "people": 5
          }
        },
        "cost": 40000
      },
      {
        "title": "ยืนยันนโยบายเดิม",
        "success": {
          "report": "กลุ่มเจ้าของผับพอใจแต่ชุมชนไม่พอใจ",
          "scores": {
            "people": -10,
            "business": 5
          }
        }
      }
    ]
  },
  {
    "id": "people-casino",
    "category": "people",
    "minLevel": 8,
    "title": "ชุมชนต่อต้านสิทธิพิเศษคาสิโน",
    "story": "ผู้แทนชุมชนขอให้ทบทวนการสนับสนุนคาสิโน",
    "requiresBuildings": {
      "casino_starter": 1
    },
    "choices": [
      {
        "title": "ลดรายได้คาสิโน 250 บาทวันนี้",
        "success": {
          "report": "ประชาชนพอใจที่เมืองทบทวนนโยบาย",
          "scores": {
            "people": 10,
            "business": -5
          },
          "effects": [
            {
              "kind": "tripDelta",
              "scope": "casino",
              "value": -250
            }
          ]
        }
      },
      {
        "title": "ช่วยเหลืองบชุมชน",
        "success": {
          "report": "ประชาชนยอมรับมาตรการบางส่วน",
          "scores": {
            "people": 5
          }
        },
        "cost": 85000
      },
      {
        "title": "ยืนยันข้อตกลงกับธุรกิจ",
        "success": {
          "report": "ชุมชนไม่พอใจ",
          "scores": {
            "people": -15,
            "business": 5
          }
        }
      }
    ]
  },
  {
    "id": "people-fairness",
    "category": "people",
    "minLevel": 4,
    "title": "เสียงสะท้อนเรื่องความเป็นธรรม",
    "story": "ประชาชนขอให้เทศบาลใช้งบอย่างเท่าเทียม",
    "choices": [
      {
        "title": "เปิดประชุมรับฟัง",
        "success": {
          "report": "ข้อเรียกร้องได้รับการพิจารณา",
          "scores": {
            "people": 10,
            "image": 5
          }
        },
        "cost": 35000
      },
      {
        "title": "เจรจาผ่านตัวแทนชุมชน",
        "success": {
          "report": "ตัวแทนยอมรับข้อตกลง",
          "scores": {
            "people": 10
          }
        },
        "requires": {
          "people": 71
        }
      },
      {
        "title": "ขู่งดงบชุมชน",
        "chance": 0.3,
        "success": {
          "report": "ตัวแทนยอมถอย",
          "scores": {
            "people": 5
          }
        },
        "failure": {
          "report": "เกิดกระแสต่อต้าน",
          "scores": {
            "people": -15,
            "image": -10
          }
        }
      }
    ]
  },
  {
    "id": "people-commute",
    "category": "people",
    "minLevel": 3,
    "title": "คนงานขอเดินทางสะดวกขึ้น",
    "story": "ผู้พักอาศัยเรียกร้องให้แก้การเดินทางในวันนี้",
    "choices": [
      {
        "title": "ทำคะแนนเดินทาง 80% วันนี้",
        "task": {
          "kind": "performance",
          "target": 80
        },
        "success": {
          "report": "เมืองทำตามคำมั่นสำเร็จ",
          "scores": {
            "people": 10,
            "admin": 5
          }
        },
        "failure": {
          "report": "แก้ปัญหาไม่สำเร็จ",
          "scores": {
            "people": -10
          }
        }
      },
      {
        "title": "ช่วยเหลือค่าเดินทาง",
        "success": {
          "report": "ประชาชนได้รับความช่วยเหลือ",
          "scores": {
            "people": 5
          }
        },
        "cost": 40000
      },
      {
        "title": "เพิกเฉย",
        "success": {
          "report": "ประชาชนไม่พอใจ",
          "scores": {
            "people": -10
          }
        }
      }
    ]
  },
  {
    "id": "people-family",
    "category": "people",
    "minLevel": 1,
    "title": "ค่าใช้จ่ายครอบครัวเพิ่มขึ้น",
    "story": "ครอบครัวจำนวนมากร้องขอเงินสนับสนุนกิจกรรมเด็ก",
    "choices": [
      {
        "title": "อนุมัติงบเต็มจำนวน",
        "success": {
          "report": "ครอบครัวได้รับการช่วยเหลือ",
          "scores": {
            "people": 10
          }
        },
        "cost": 60000
      },
      {
        "title": "ช่วยเหลือเฉพาะส่วนจำเป็น",
        "success": {
          "report": "ได้รับการตอบรับบางส่วน",
          "scores": {
            "people": 5
          }
        },
        "cost": 20000
      },
      {
        "title": "ปฏิเสธ",
        "success": {
          "report": "ประชาชนผิดหวัง",
          "scores": {
            "people": -5
          }
        }
      }
    ]
  },
  {
    "id": "people-petition",
    "category": "people",
    "minLevel": 4,
    "title": "จดหมายจากกลุ่มผู้ย้ายเข้า",
    "story": "กลุ่มผู้สนใจย้ายเข้าขอให้เมืองปรับปรุงสิ่งอำนวยความสะดวก",
    "choices": [
      {
        "title": "สร้างบ้านเริ่มต้น 2 หลัง",
        "task": {
          "kind": "build",
          "key": "home_starter",
          "count": 2
        },
        "success": {
          "report": "เพิ่มบ้านรองรับตามคำขอ",
          "scores": {
            "people": 10
          }
        },
        "failure": {
          "report": "สร้างบ้านไม่ครบ",
          "scores": {
            "people": -10
          }
        }
      },
      {
        "title": "เปิดรับฟังความต้องการ",
        "success": {
          "report": "ผู้สมัครพอใจการสื่อสาร",
          "scores": {
            "people": 5
          }
        }
      },
      {
        "title": "ไม่ตอบรับ",
        "success": {
          "report": "ผู้สมัครชะลอการย้ายเข้า",
          "scores": {
            "people": -10
          },
          "effects": [
            {
              "kind": "populationBlock",
              "scope": "residents",
              "value": 1
            }
          ]
        }
      }
    ]
  },
  {
    "id": "people-recreation",
    "category": "people",
    "minLevel": 5,
    "title": "กิจกรรมวันหยุดของคนเมือง",
    "story": "ประชาชนขอให้จัดกิจกรรมพักผ่อนในวันนี้",
    "requiresBuildings": {
      "park_starter": 1
    },
    "choices": [
      {
        "title": "สนับสนุนกิจกรรม",
        "success": {
          "report": "ประชาชนได้รับความสุขจากกิจกรรม",
          "scores": {
            "people": 10
          },
          "effects": [
            {
              "kind": "tripMultiplier",
              "scope": "park",
              "value": 2
            }
          ]
        },
        "cost": 40000
      },
      {
        "title": "ขอผู้สนับสนุน",
        "success": {
          "report": "กิจกรรมเกิดขึ้นโดยไม่ใช้งบเมือง",
          "scores": {
            "people": 5
          }
        },
        "requires": {
          "business": 71
        }
      },
      {
        "title": "ไม่จัดกิจกรรม",
        "success": {
          "report": "ไม่มีผลกระทบ",
          "scores": {}
        }
      }
    ]
  },
  {
    "id": "people-complaint",
    "category": "people",
    "minLevel": 3,
    "title": "กล่องรับเรื่องร้องเรียนเต็ม",
    "story": "ตัวแทนประชาชนขอคำตอบเรื่องการบริการเมือง",
    "choices": [
      {
        "title": "ตั้งเวทีแก้ปัญหา",
        "success": {
          "report": "ชุมชนยินดีที่นายกรับฟัง",
          "scores": {
            "people": 10
          }
        },
        "cost": 35000
      },
      {
        "title": "รับปากติดตามเรื่อง",
        "success": {
          "report": "ตัวแทนยอมรับคำตอบ",
          "scores": {
            "people": 5
          }
        },
        "requires": {
          "people": 71
        }
      },
      {
        "title": "ประกาศปิดกล่องร้องเรียน",
        "chance": 0.3,
        "success": {
          "report": "คำร้องหยุดลง",
          "scores": {}
        },
        "failure": {
          "report": "ประชาชนต่อต้านหนักขึ้น",
          "scores": {
            "people": -15,
            "image": -10
          }
        }
      }
    ]
  },
  {
    "id": "business-association-shop",
    "category": "business",
    "minLevel": 1,
    "title": "ข้อเรียกร้องสมาคมร้านค้า",
    "story": "ผู้ประกอบการร้านค้าขอลดการจัดเก็บรายได้จากภารกิจในวันนี้ หรือให้เทศบาลเพิ่มพื้นที่บริการ",
    "requiresBuildings": {
      "shop_starter": 1
    },
    "choices": [
      {
        "title": "เจรจาลดรายได้เพียง 100 บาท",
        "success": {
          "report": "สมาคมยอมรับข้อเสนอ",
          "scores": {
            "business": 10
          },
          "effects": [
            {
              "kind": "tripDelta",
              "scope": "shop",
              "value": -100
            }
          ]
        },
        "requires": {
          "business": 86
        }
      },
      {
        "title": "สร้างร้านค้าเริ่มต้น 2 แห่ง",
        "task": {
          "kind": "build",
          "key": "shop_starter",
          "count": 2
        },
        "success": {
          "report": "สร้างสถานที่เพิ่มตามสัญญา",
          "scores": {
            "business": 10
          },
          "effects": [
            {
              "kind": "tripMultiplier",
              "scope": "shop",
              "value": 2
            }
          ]
        },
        "failure": {
          "report": "ทำตามข้อตกลงไม่สำเร็จ",
          "scores": {
            "business": -10
          }
        },
        "requires": {
          "business": 51
        }
      },
      {
        "title": "ยอมลดรายได้ลง 300 บาทวันนี้",
        "success": {
          "report": "สมาคมถอนข้อเรียกร้อง",
          "scores": {
            "business": 10
          },
          "effects": [
            {
              "kind": "tripDelta",
              "scope": "shop",
              "value": -300
            }
          ]
        }
      },
      {
        "title": "ขู่ว่าจะรื้อร้านค้าเริ่มต้น 2 แห่ง",
        "chance": 0.3,
        "success": {
          "report": "กลุ่มผู้ประกอบการยอมถอนคำร้อง",
          "scores": {
            "business": 10
          }
        },
        "failure": {
          "report": "ผู้ประกอบการเปิดเผยคำข่มขู่",
          "scores": {
            "business": -15,
            "image": -10
          },
          "effects": [
            {
              "kind": "tripDelta",
              "scope": "shop",
              "value": -400
            }
          ]
        },
        "requiresBuildings": {
          "shop_starter": 2
        }
      },
      {
        "title": "ปฏิเสธ",
        "success": {
          "report": "เจ้าของกิจการไม่พอใจ",
          "scores": {
            "business": -10
          }
        }
      }
    ]
  },
  {
    "id": "business-association-mall",
    "category": "business",
    "minLevel": 5,
    "title": "ข้อเรียกร้องสมาคมห้าง",
    "story": "ผู้ประกอบการห้างขอลดการจัดเก็บรายได้จากภารกิจในวันนี้ หรือให้เทศบาลเพิ่มพื้นที่บริการ",
    "requiresBuildings": {
      "mall_starter": 1
    },
    "choices": [
      {
        "title": "เจรจาลดรายได้เพียง 100 บาท",
        "success": {
          "report": "สมาคมยอมรับข้อเสนอ",
          "scores": {
            "business": 10
          },
          "effects": [
            {
              "kind": "tripDelta",
              "scope": "mall",
              "value": -100
            }
          ]
        },
        "requires": {
          "business": 86
        }
      },
      {
        "title": "สร้างห้างเริ่มต้น 2 แห่ง",
        "task": {
          "kind": "build",
          "key": "mall_starter",
          "count": 2
        },
        "success": {
          "report": "สร้างสถานที่เพิ่มตามสัญญา",
          "scores": {
            "business": 10
          },
          "effects": [
            {
              "kind": "tripMultiplier",
              "scope": "mall",
              "value": 2
            }
          ]
        },
        "failure": {
          "report": "ทำตามข้อตกลงไม่สำเร็จ",
          "scores": {
            "business": -10
          }
        },
        "requires": {
          "business": 51
        }
      },
      {
        "title": "ยอมลดรายได้ลง 300 บาทวันนี้",
        "success": {
          "report": "สมาคมถอนข้อเรียกร้อง",
          "scores": {
            "business": 10
          },
          "effects": [
            {
              "kind": "tripDelta",
              "scope": "mall",
              "value": -300
            }
          ]
        }
      },
      {
        "title": "ขู่ว่าจะรื้อห้างเริ่มต้น 2 แห่ง",
        "chance": 0.3,
        "success": {
          "report": "กลุ่มผู้ประกอบการยอมถอนคำร้อง",
          "scores": {
            "business": 10
          }
        },
        "failure": {
          "report": "ผู้ประกอบการเปิดเผยคำข่มขู่",
          "scores": {
            "business": -15,
            "image": -10
          },
          "effects": [
            {
              "kind": "tripDelta",
              "scope": "mall",
              "value": -400
            }
          ]
        },
        "requiresBuildings": {
          "mall_starter": 2
        }
      },
      {
        "title": "ปฏิเสธ",
        "success": {
          "report": "เจ้าของกิจการไม่พอใจ",
          "scores": {
            "business": -10
          }
        }
      }
    ]
  },
  {
    "id": "business-association-office",
    "category": "business",
    "minLevel": 3,
    "title": "ข้อเรียกร้องสมาคมสำนักงาน",
    "story": "ผู้ประกอบการสำนักงานขอลดการจัดเก็บรายได้จากภารกิจในวันนี้ หรือให้เทศบาลเพิ่มพื้นที่บริการ",
    "requiresBuildings": {
      "office_starter": 1
    },
    "choices": [
      {
        "title": "เจรจาลดรายได้เพียง 100 บาท",
        "success": {
          "report": "สมาคมยอมรับข้อเสนอ",
          "scores": {
            "business": 10
          },
          "effects": [
            {
              "kind": "tripDelta",
              "scope": "office",
              "value": -100
            }
          ]
        },
        "requires": {
          "business": 86
        }
      },
      {
        "title": "สร้างสำนักงานเริ่มต้น 2 แห่ง",
        "task": {
          "kind": "build",
          "key": "office_starter",
          "count": 2
        },
        "success": {
          "report": "สร้างสถานที่เพิ่มตามสัญญา",
          "scores": {
            "business": 10
          },
          "effects": [
            {
              "kind": "tripMultiplier",
              "scope": "office",
              "value": 2
            }
          ]
        },
        "failure": {
          "report": "ทำตามข้อตกลงไม่สำเร็จ",
          "scores": {
            "business": -10
          }
        },
        "requires": {
          "business": 51
        }
      },
      {
        "title": "ยอมลดรายได้ลง 300 บาทวันนี้",
        "success": {
          "report": "สมาคมถอนข้อเรียกร้อง",
          "scores": {
            "business": 10
          },
          "effects": [
            {
              "kind": "tripDelta",
              "scope": "office",
              "value": -300
            }
          ]
        }
      },
      {
        "title": "ขู่ว่าจะรื้อสำนักงานเริ่มต้น 2 แห่ง",
        "chance": 0.3,
        "success": {
          "report": "กลุ่มผู้ประกอบการยอมถอนคำร้อง",
          "scores": {
            "business": 10
          }
        },
        "failure": {
          "report": "ผู้ประกอบการเปิดเผยคำข่มขู่",
          "scores": {
            "business": -15,
            "image": -10
          },
          "effects": [
            {
              "kind": "tripDelta",
              "scope": "office",
              "value": -400
            }
          ]
        },
        "requiresBuildings": {
          "office_starter": 2
        }
      },
      {
        "title": "ปฏิเสธ",
        "success": {
          "report": "เจ้าของกิจการไม่พอใจ",
          "scores": {
            "business": -10
          }
        }
      }
    ]
  },
  {
    "id": "business-association-factory",
    "category": "business",
    "minLevel": 4,
    "title": "ข้อเรียกร้องสมาคมโรงงาน",
    "story": "ผู้ประกอบการโรงงานขอลดการจัดเก็บรายได้จากภารกิจในวันนี้ หรือให้เทศบาลเพิ่มพื้นที่บริการ",
    "requiresBuildings": {
      "factory_starter": 1
    },
    "choices": [
      {
        "title": "เจรจาลดรายได้เพียง 100 บาท",
        "success": {
          "report": "สมาคมยอมรับข้อเสนอ",
          "scores": {
            "business": 10
          },
          "effects": [
            {
              "kind": "tripDelta",
              "scope": "factory",
              "value": -100
            }
          ]
        },
        "requires": {
          "business": 86
        }
      },
      {
        "title": "สร้างโรงงานเริ่มต้น 2 แห่ง",
        "task": {
          "kind": "build",
          "key": "factory_starter",
          "count": 2
        },
        "success": {
          "report": "สร้างสถานที่เพิ่มตามสัญญา",
          "scores": {
            "business": 10
          },
          "effects": [
            {
              "kind": "tripMultiplier",
              "scope": "factory",
              "value": 2
            }
          ]
        },
        "failure": {
          "report": "ทำตามข้อตกลงไม่สำเร็จ",
          "scores": {
            "business": -10
          }
        },
        "requires": {
          "business": 51
        }
      },
      {
        "title": "ยอมลดรายได้ลง 300 บาทวันนี้",
        "success": {
          "report": "สมาคมถอนข้อเรียกร้อง",
          "scores": {
            "business": 10
          },
          "effects": [
            {
              "kind": "tripDelta",
              "scope": "factory",
              "value": -300
            }
          ]
        }
      },
      {
        "title": "ขู่ว่าจะรื้อโรงงานเริ่มต้น 2 แห่ง",
        "chance": 0.3,
        "success": {
          "report": "กลุ่มผู้ประกอบการยอมถอนคำร้อง",
          "scores": {
            "business": 10
          }
        },
        "failure": {
          "report": "ผู้ประกอบการเปิดเผยคำข่มขู่",
          "scores": {
            "business": -15,
            "image": -10
          },
          "effects": [
            {
              "kind": "tripDelta",
              "scope": "factory",
              "value": -400
            }
          ]
        },
        "requiresBuildings": {
          "factory_starter": 2
        }
      },
      {
        "title": "ปฏิเสธ",
        "success": {
          "report": "เจ้าของกิจการไม่พอใจ",
          "scores": {
            "business": -10
          }
        }
      }
    ]
  },
  {
    "id": "business-association-casino",
    "category": "business",
    "minLevel": 8,
    "title": "ข้อเรียกร้องสมาคมคาสิโน",
    "story": "ผู้ประกอบการคาสิโนขอลดการจัดเก็บรายได้จากภารกิจในวันนี้ หรือให้เทศบาลเพิ่มพื้นที่บริการ",
    "requiresBuildings": {
      "casino_starter": 1
    },
    "choices": [
      {
        "title": "เจรจาลดรายได้เพียง 100 บาท",
        "success": {
          "report": "สมาคมยอมรับข้อเสนอ",
          "scores": {
            "business": 10
          },
          "effects": [
            {
              "kind": "tripDelta",
              "scope": "casino",
              "value": -100
            }
          ]
        },
        "requires": {
          "business": 86
        }
      },
      {
        "title": "สร้างคาสิโนเริ่มต้น 1 แห่ง",
        "task": {
          "kind": "build",
          "key": "casino_starter",
          "count": 1
        },
        "success": {
          "report": "สร้างสถานที่เพิ่มตามสัญญา",
          "scores": {
            "business": 10
          },
          "effects": [
            {
              "kind": "tripMultiplier",
              "scope": "casino",
              "value": 2
            }
          ]
        },
        "failure": {
          "report": "ทำตามข้อตกลงไม่สำเร็จ",
          "scores": {
            "business": -10
          }
        },
        "requires": {
          "business": 51
        }
      },
      {
        "title": "ยอมลดรายได้ลง 300 บาทวันนี้",
        "success": {
          "report": "สมาคมถอนข้อเรียกร้อง",
          "scores": {
            "business": 10
          },
          "effects": [
            {
              "kind": "tripDelta",
              "scope": "casino",
              "value": -300
            }
          ]
        }
      },
      {
        "title": "ขู่ว่าจะรื้อคาสิโนเริ่มต้น 1 แห่ง",
        "chance": 0.3,
        "success": {
          "report": "กลุ่มผู้ประกอบการยอมถอนคำร้อง",
          "scores": {
            "business": 10
          }
        },
        "failure": {
          "report": "ผู้ประกอบการเปิดเผยคำข่มขู่",
          "scores": {
            "business": -15,
            "image": -10
          },
          "effects": [
            {
              "kind": "tripDelta",
              "scope": "casino",
              "value": -400
            }
          ]
        },
        "requiresBuildings": {
          "casino_starter": 1
        }
      },
      {
        "title": "ปฏิเสธ",
        "success": {
          "report": "เจ้าของกิจการไม่พอใจ",
          "scores": {
            "business": -10
          }
        }
      }
    ]
  },
  {
    "id": "business-association-hotel",
    "category": "business",
    "minLevel": 3,
    "title": "ข้อเรียกร้องสมาคมโรงแรม",
    "story": "ผู้ประกอบการโรงแรมขอลดการจัดเก็บรายได้จากภารกิจในวันนี้ หรือให้เทศบาลเพิ่มพื้นที่บริการ",
    "requiresBuildings": {
      "hotel_starter": 1
    },
    "choices": [
      {
        "title": "เจรจาลดรายได้เพียง 100 บาท",
        "success": {
          "report": "สมาคมยอมรับข้อเสนอ",
          "scores": {
            "business": 10
          },
          "effects": [
            {
              "kind": "tripDelta",
              "scope": "hotel",
              "value": -100
            }
          ]
        },
        "requires": {
          "business": 86
        }
      },
      {
        "title": "สร้างโรงแรมเริ่มต้น 2 แห่ง",
        "task": {
          "kind": "build",
          "key": "hotel_starter",
          "count": 2
        },
        "success": {
          "report": "สร้างสถานที่เพิ่มตามสัญญา",
          "scores": {
            "business": 10
          },
          "effects": [
            {
              "kind": "tripMultiplier",
              "scope": "hotel",
              "value": 2
            }
          ]
        },
        "failure": {
          "report": "ทำตามข้อตกลงไม่สำเร็จ",
          "scores": {
            "business": -10
          }
        },
        "requires": {
          "business": 51
        }
      },
      {
        "title": "ยอมลดรายได้ลง 300 บาทวันนี้",
        "success": {
          "report": "สมาคมถอนข้อเรียกร้อง",
          "scores": {
            "business": 10
          },
          "effects": [
            {
              "kind": "tripDelta",
              "scope": "hotel",
              "value": -300
            }
          ]
        }
      },
      {
        "title": "ขู่ว่าจะรื้อโรงแรมเริ่มต้น 2 แห่ง",
        "chance": 0.3,
        "success": {
          "report": "กลุ่มผู้ประกอบการยอมถอนคำร้อง",
          "scores": {
            "business": 10
          }
        },
        "failure": {
          "report": "ผู้ประกอบการเปิดเผยคำข่มขู่",
          "scores": {
            "business": -15,
            "image": -10
          },
          "effects": [
            {
              "kind": "tripDelta",
              "scope": "hotel",
              "value": -400
            }
          ]
        },
        "requiresBuildings": {
          "hotel_starter": 2
        }
      },
      {
        "title": "ปฏิเสธ",
        "success": {
          "report": "เจ้าของกิจการไม่พอใจ",
          "scores": {
            "business": -10
          }
        }
      }
    ]
  },
  {
    "id": "business-association-park",
    "category": "business",
    "minLevel": 2,
    "title": "ข้อเรียกร้องสมาคมสวน",
    "story": "ผู้ประกอบการสวนขอลดการจัดเก็บรายได้จากภารกิจในวันนี้ หรือให้เทศบาลเพิ่มพื้นที่บริการ",
    "requiresBuildings": {
      "park_starter": 1
    },
    "choices": [
      {
        "title": "เจรจาลดรายได้เพียง 100 บาท",
        "success": {
          "report": "สมาคมยอมรับข้อเสนอ",
          "scores": {
            "business": 10
          },
          "effects": [
            {
              "kind": "tripDelta",
              "scope": "park",
              "value": -100
            }
          ]
        },
        "requires": {
          "business": 86
        }
      },
      {
        "title": "สร้างสวนเริ่มต้น 2 แห่ง",
        "task": {
          "kind": "build",
          "key": "park_starter",
          "count": 2
        },
        "success": {
          "report": "สร้างสถานที่เพิ่มตามสัญญา",
          "scores": {
            "business": 10
          },
          "effects": [
            {
              "kind": "tripMultiplier",
              "scope": "park",
              "value": 2
            }
          ]
        },
        "failure": {
          "report": "ทำตามข้อตกลงไม่สำเร็จ",
          "scores": {
            "business": -10
          }
        },
        "requires": {
          "business": 51
        }
      },
      {
        "title": "ยอมลดรายได้ลง 300 บาทวันนี้",
        "success": {
          "report": "สมาคมถอนข้อเรียกร้อง",
          "scores": {
            "business": 10
          },
          "effects": [
            {
              "kind": "tripDelta",
              "scope": "park",
              "value": -300
            }
          ]
        }
      },
      {
        "title": "ขู่ว่าจะรื้อสวนเริ่มต้น 2 แห่ง",
        "chance": 0.3,
        "success": {
          "report": "กลุ่มผู้ประกอบการยอมถอนคำร้อง",
          "scores": {
            "business": 10
          }
        },
        "failure": {
          "report": "ผู้ประกอบการเปิดเผยคำข่มขู่",
          "scores": {
            "business": -15,
            "image": -10
          },
          "effects": [
            {
              "kind": "tripDelta",
              "scope": "park",
              "value": -400
            }
          ]
        },
        "requiresBuildings": {
          "park_starter": 2
        }
      },
      {
        "title": "ปฏิเสธ",
        "success": {
          "report": "เจ้าของกิจการไม่พอใจ",
          "scores": {
            "business": -10
          }
        }
      }
    ]
  },
  {
    "id": "business-food-cost",
    "category": "business",
    "minLevel": 3,
    "title": "ราคาวัตถุดิบพุ่ง",
    "story": "สมาคมร้านอาหารขอให้ช่วยลดภาระในวันนี้",
    "requiresBuildings": {
      "restaurant_starter": 1
    },
    "choices": [
      {
        "title": "จ่ายเงินช่วยเหลือ",
        "success": {
          "report": "สมาคมยอมถอนคำร้อง",
          "scores": {
            "business": 10
          }
        },
        "cost": 60000
      },
      {
        "title": "ลดรายได้ร้านอาหาร 150 บาท",
        "success": {
          "report": "เมืองลดการจัดเก็บตามข้อตกลง",
          "scores": {
            "business": 5
          },
          "effects": [
            {
              "kind": "tripDelta",
              "scope": "restaurant",
              "value": -150
            }
          ]
        }
      },
      {
        "title": "ไม่ช่วย",
        "success": {
          "report": "ผู้ประกอบการผิดหวัง",
          "scores": {
            "business": -10
          }
        }
      }
    ]
  },
  {
    "id": "business-mall-sponsor",
    "category": "business",
    "minLevel": 6,
    "title": "เจ้าของห้างอยากจัดงานลดราคา",
    "story": "ผู้จัดกิจกรรมขอสนับสนุนเทศกาลซื้อสินค้า",
    "requiresBuildings": {
      "mall_starter": 1
    },
    "choices": [
      {
        "title": "สนับสนุนการจัดงาน",
        "success": {
          "report": "ห้างมีรายได้ภารกิจเพิ่มวันนี้",
          "scores": {
            "business": 10
          },
          "effects": [
            {
              "kind": "tripMultiplier",
              "scope": "mall",
              "value": 3
            }
          ]
        },
        "cost": 90000
      },
      {
        "title": "ขอผู้จัดออกค่าใช้จ่าย",
        "success": {
          "report": "ผู้จัดยอมรับภาระค่าใช้จ่าย",
          "scores": {
            "business": 10
          },
          "effects": [
            {
              "kind": "tripMultiplier",
              "scope": "mall",
              "value": 2
            }
          ]
        },
        "requires": {
          "business": 86
        }
      },
      {
        "title": "ไม่จัดงาน",
        "success": {
          "report": "ไม่มีผล",
          "scores": {}
        }
      }
    ]
  },
  {
    "id": "business-night-event",
    "category": "business",
    "minLevel": 6,
    "title": "เจ้าของผับเสนองานคืนนี้",
    "story": "ผู้ประกอบการอยากโปรโมตงานดนตรีเพื่อเพิ่มรายได้",
    "requiresBuildings": {
      "pub_starter": 1
    },
    "choices": [
      {
        "title": "รับการสนับสนุนจากเจ้าของผับ",
        "success": {
          "report": "เมืองได้รับเงินและโปรโมตผับ",
          "scores": {
            "business": 10,
            "people": -5
          },
          "money": 100000,
          "effects": [
            {
              "kind": "tripMultiplier",
              "scope": "pub",
              "value": 2
            }
          ]
        }
      },
      {
        "title": "สนับสนุนงานแบบประหยัด",
        "success": {
          "report": "งานได้รับความสนใจ",
          "scores": {
            "business": 5
          },
          "effects": [
            {
              "kind": "tripMultiplier",
              "scope": "pub",
              "value": 2
            }
          ]
        },
        "cost": 35000
      },
      {
        "title": "ไม่สนับสนุน",
        "success": {
          "report": "เจ้าของผับผิดหวัง",
          "scores": {
            "business": -5
          }
        }
      }
    ]
  },
  {
    "id": "business-casino-deal",
    "category": "business",
    "minLevel": 10,
    "title": "ข้อเสนอจากผู้ประกอบการคาสิโน",
    "story": "กลุ่มทุนเสนอให้เมืองสนับสนุนรายได้จากคาสิโนในวันนี้",
    "requiresBuildings": {
      "casino_starter": 1
    },
    "choices": [
      {
        "title": "รับข้อเสนออย่างเปิดเผย",
        "success": {
          "report": "เมืองได้รับเงินสนับสนุน",
          "scores": {
            "business": 10,
            "image": -10
          },
          "money": 200000,
          "effects": [
            {
              "kind": "tripMultiplier",
              "scope": "casino",
              "value": 2
            }
          ]
        }
      },
      {
        "title": "เจรจาข้อตกลงทั่วไป",
        "success": {
          "report": "กลุ่มทุนสนับสนุนเมืองโดยเปิดเผย",
          "scores": {
            "business": 5
          },
          "money": 80000
        },
        "requires": {
          "integrity": 71
        }
      },
      {
        "title": "ปฏิเสธ",
        "success": {
          "report": "กลุ่มทุนถอนตัว",
          "scores": {
            "business": -5
          }
        }
      }
    ]
  },
  {
    "id": "business-invest-office",
    "category": "business",
    "minLevel": 4,
    "title": "บริษัทเสนอเปิดสำนักงาน",
    "story": "นักลงทุนพร้อมออกเงินหากเมืองเพิ่มสำนักงานให้ทันวันนี้",
    "choices": [
      {
        "title": "รับเงิน 60,000 บาท สร้างสำนักงานเริ่มต้น 3 แห่ง",
        "task": {
          "kind": "build",
          "key": "office_starter",
          "count": 3
        },
        "success": {
          "report": "บริษัทรับมอบพื้นที่สำนักงาน",
          "scores": {
            "business": 10
          },
          "effects": [
            {
              "kind": "tripMultiplier",
              "scope": "office",
              "value": 2
            }
          ]
        },
        "failure": {
          "report": "ไม่สามารถส่งมอบพื้นที่",
          "scores": {
            "business": -10
          }
        },
        "grant": 60000,
        "requires": {
          "business": 51
        }
      },
      {
        "title": "ปฏิเสธข้อเสนอ",
        "success": {
          "report": "นักลงทุนไปเมืองอื่น",
          "scores": {}
        }
      },
      {
        "title": "จัดประชุมเพื่อรักษาความสัมพันธ์",
        "success": {
          "report": "นักลงทุนรับทราบแผนในอนาคต",
          "scores": {
            "business": 5
          }
        },
        "cost": 15000
      }
    ]
  },
  {
    "id": "business-monopoly",
    "category": "business",
    "minLevel": 8,
    "title": "ผู้ค้ารายใหญ่ขอสิทธิ์พิเศษ",
    "story": "เจ้าของห้างขอให้ลดการสนับสนุนร้านค้ารายย่อยเพื่อแลกเงินเข้าคลัง",
    "requiresBuildings": {
      "mall_starter": 1
    },
    "choices": [
      {
        "title": "รับเงินตามข้อเสนอ",
        "success": {
          "report": "เงินเข้าคลังแต่ร้านค้ารายย่อยเสียประโยชน์",
          "scores": {
            "business": 10,
            "image": -10
          },
          "money": 180000,
          "effects": [
            {
              "kind": "tripDelta",
              "scope": "shop",
              "value": -200
            }
          ]
        }
      },
      {
        "title": "เจรจาไม่ผูกขาด",
        "success": {
          "report": "กลุ่มทุนตกลงสนับสนุนเมือง",
          "scores": {
            "business": 5
          },
          "money": 60000
        },
        "requires": {
          "business": 71
        }
      },
      {
        "title": "ปฏิเสธ",
        "success": {
          "report": "รักษาความเป็นธรรมแก่ร้านค้า",
          "scores": {
            "business": -5,
            "image": 5
          }
        }
      }
    ]
  },
  {
    "id": "integrity-gift-supplier",
    "category": "integrity",
    "minLevel": 3,
    "title": "ของขวัญจากผู้รับเหมา",
    "story": "บริษัทก่อสร้างมอบเงินสนับสนุนโดยขอให้พิจารณาเป็นพิเศษ",
    "choices": [
      {
        "title": "รับเงินนอกข้อตกลง",
        "success": {
          "report": "เงินเข้าคลังโดยมีประวัติผลประโยชน์",
          "scores": {
            "integrity": -15,
            "business": 5
          },
          "money": 160000,
          "flags": [
            "secretDonor"
          ]
        }
      },
      {
        "title": "รับเฉพาะเงินบริจาคเปิดเผย",
        "success": {
          "report": "เอกสารถูกเปิดเผยต่อสาธารณะ",
          "scores": {
            "integrity": 10
          },
          "money": 50000
        },
        "requires": {
          "integrity": 71
        }
      },
      {
        "title": "ส่งคืนทั้งหมด",
        "success": {
          "report": "เทศบาลปฏิเสธผลประโยชน์",
          "scores": {
            "integrity": 10
          }
        }
      }
    ]
  },
  {
    "id": "integrity-contract",
    "category": "integrity",
    "minLevel": 4,
    "title": "สัญญาที่มีข้อความแปลก ๆ",
    "story": "ฝ่ายกฎหมายพบข้อกำหนดที่อาจให้ประโยชน์แก่เอกชนมากเกินไป",
    "choices": [
      {
        "title": "จ้างตรวจสัญญา",
        "success": {
          "report": "ข้อกำหนดที่ไม่เป็นธรรมถูกทบทวน",
          "scores": {
            "integrity": 10
          }
        },
        "cost": 50000
      },
      {
        "title": "ขอทีมกฎหมายรัฐบาล",
        "success": {
          "report": "รัฐบาลช่วยตรวจสัญญา",
          "scores": {
            "integrity": 10,
            "government": 5
          }
        },
        "requires": {
          "government": 71
        }
      },
      {
        "title": "อนุมัติตามเดิม",
        "success": {
          "report": "เมืองได้รับเงินแต่เสียความโปร่งใส",
          "scores": {
            "integrity": -15
          },
          "money": 120000,
          "flags": [
            "secretDonor"
          ]
        }
      }
    ]
  },
  {
    "id": "integrity-relative",
    "category": "integrity",
    "minLevel": 4,
    "title": "ญาติขอสิทธิพิเศษ",
    "story": "คนใกล้ชิดนายกขอให้สนับสนุนกิจการโดยไม่ผ่านการพิจารณาปกติ",
    "choices": [
      {
        "title": "อนุมัติผลประโยชน์",
        "success": {
          "report": "คลังได้รับเงินสนับสนุนที่ไม่โปร่งใส",
          "scores": {
            "integrity": -15
          },
          "money": 100000,
          "flags": [
            "secretDonor"
          ]
        }
      },
      {
        "title": "เปิดให้พิจารณาตามปกติ",
        "success": {
          "report": "ทุกฝ่ายได้รับเงื่อนไขเท่าเทียม",
          "scores": {
            "integrity": 10
          }
        }
      },
      {
        "title": "ปฏิเสธ",
        "success": {
          "report": "ไม่เกิดข้อตกลง",
          "scores": {
            "integrity": 5
          }
        }
      }
    ]
  },
  {
    "id": "integrity-documents",
    "category": "integrity",
    "minLevel": 3,
    "title": "เอกสารงบประมาณหาย",
    "story": "เจ้าหน้าที่ขอให้ตรวจสอบเอกสารรายการใช้จ่าย",
    "choices": [
      {
        "title": "ตรวจสอบโดยเปิดเผย",
        "success": {
          "report": "เอกสารได้รับการตรวจสอบ",
          "scores": {
            "integrity": 10
          }
        },
        "cost": 30000
      },
      {
        "title": "เปิดเผยเอกสารที่มี",
        "success": {
          "report": "ประชาชนได้ข้อมูลบางส่วน",
          "scores": {
            "integrity": 5
          }
        }
      },
      {
        "title": "ปล่อยเรื่องผ่านไป",
        "chance": 0.3,
        "success": {
          "report": "พบเอกสารภายหลัง",
          "scores": {}
        },
        "failure": {
          "report": "หน่วยงานตรวจสอบตั้งข้อสงสัย",
          "scores": {
            "integrity": -15,
            "government": -5
          }
        }
      }
    ]
  },
  {
    "id": "integrity-public-ledger",
    "category": "integrity",
    "minLevel": 3,
    "title": "เปิดบัญชีรายจ่ายเมือง",
    "story": "สื่อขอให้เทศบาลเผยแพร่ข้อมูลการเงิน",
    "choices": [
      {
        "title": "เผยแพร่ข้อมูลทั้งหมด",
        "success": {
          "report": "สื่อได้รับข้อมูลตามคำขอ",
          "scores": {
            "integrity": 10,
            "image": 5
          }
        }
      },
      {
        "title": "จ้างผู้ตรวจสอบอิสระ",
        "success": {
          "report": "งบได้รับการตรวจสอบอย่างเป็นทางการ",
          "scores": {
            "integrity": 15
          }
        },
        "cost": 70000
      },
      {
        "title": "ไม่เปิดเผย",
        "success": {
          "report": "ความน่าเชื่อถือลดลง",
          "scores": {
            "integrity": -10
          }
        }
      }
    ]
  },
  {
    "id": "integrity-donation",
    "category": "integrity",
    "minLevel": 1,
    "title": "เงินบริจาคไม่มีชื่อผู้ให้",
    "story": "มีผู้ติดต่อขอโอนเงินให้เทศบาลโดยไม่ประสงค์ออกนาม",
    "choices": [
      {
        "title": "รับเงินโดยไม่ตรวจสอบ",
        "success": {
          "report": "เงินเข้าคลังแต่ไม่ทราบที่มา",
          "scores": {
            "integrity": -10
          },
          "money": 90000,
          "flags": [
            "secretDonor"
          ]
        }
      },
      {
        "title": "ตรวจสอบและรับเงินอย่างเปิดเผย",
        "success": {
          "report": "ตรวจสอบแหล่งเงินแล้ว",
          "scores": {
            "integrity": 5
          },
          "money": 70000
        },
        "cost": 15000
      },
      {
        "title": "ปฏิเสธเงิน",
        "success": {
          "report": "เงินถูกส่งคืน",
          "scores": {
            "integrity": 5
          }
        }
      }
    ]
  },
  {
    "id": "integrity-secret-deal",
    "category": "integrity",
    "minLevel": 8,
    "title": "ผู้มีอิทธิพลส่งตัวแทนมา",
    "story": "ตัวแทนเสนอเงินสนับสนุนแลกกับการพิจารณาเป็นพิเศษ",
    "choices": [
      {
        "title": "ยอมรับข้อเสนอ",
        "success": {
          "report": "เงินเข้าคลังและเกิดพันธะทางการเมือง",
          "scores": {
            "integrity": -20,
            "business": 10
          },
          "money": 250000,
          "flags": [
            "secretDonor"
          ]
        }
      },
      {
        "title": "เปลี่ยนเป็นสัญญาเปิดเผย",
        "success": {
          "report": "กลุ่มทุนยอมลดวงเงิน",
          "scores": {
            "integrity": 10
          },
          "money": 80000
        },
        "requires": {
          "integrity": 71
        }
      },
      {
        "title": "ปฏิเสธ",
        "success": {
          "report": "ข้อตกลงไม่เกิดขึ้น",
          "scores": {
            "integrity": 5
          }
        }
      }
    ]
  },
  {
    "id": "integrity-clerk",
    "category": "integrity",
    "minLevel": 6,
    "title": "เจ้าหน้าที่ขอส่วนแบ่ง",
    "story": "ฝ่ายตรวจสอบพบข้อเสนอผลประโยชน์จากเจ้าหน้าที่",
    "choices": [
      {
        "title": "ตั้งคณะสอบสวน",
        "success": {
          "report": "การตรวจสอบเริ่มดำเนินการ",
          "scores": {
            "integrity": 10
          }
        },
        "cost": 45000
      },
      {
        "title": "เรียกคืนเงิน",
        "success": {
          "report": "เงินกลับเข้าคลัง",
          "scores": {
            "integrity": 5
          },
          "money": 50000
        }
      },
      {
        "title": "ยุติเรื่องแลกเงินเข้าคลัง",
        "success": {
          "report": "เทศบาลรับเงินแต่ความโปร่งใสลดลง",
          "scores": {
            "integrity": -20
          },
          "money": 180000,
          "flags": [
            "secretDonor"
          ]
        }
      }
    ]
  },
  {
    "id": "integrity-tender",
    "category": "integrity",
    "minLevel": 6,
    "title": "การประมูลงานเมือง",
    "story": "บริษัทหนึ่งเสนอเงื่อนไขพิเศษหากได้รับการพิจารณาก่อนคู่แข่ง",
    "choices": [
      {
        "title": "พิจารณาตามเกณฑ์เปิดเผย",
        "success": {
          "report": "การพิจารณาดำเนินอย่างเป็นธรรม",
          "scores": {
            "integrity": 10
          }
        }
      },
      {
        "title": "รับข้อเสนอแลกเงิน",
        "success": {
          "report": "เมืองได้เงินแต่เสียความโปร่งใส",
          "scores": {
            "integrity": -15,
            "business": 5
          },
          "money": 150000,
          "flags": [
            "secretDonor"
          ]
        }
      },
      {
        "title": "ระงับการพิจารณา",
        "success": {
          "report": "โครงการถูกเลื่อน",
          "scores": {
            "admin": -5,
            "integrity": 5
          }
        }
      }
    ]
  },
  {
    "id": "integrity-audit-government",
    "category": "integrity",
    "minLevel": 7,
    "title": "หน่วยตรวจสอบขอเข้าพบ",
    "story": "ส่วนกลางขอตรวจความถูกต้องของบัญชีเทศบาล",
    "choices": [
      {
        "title": "ให้ความร่วมมือเต็มรูปแบบ",
        "success": {
          "report": "การตรวจสอบเสร็จสิ้น",
          "scores": {
            "integrity": 10,
            "government": 5
          }
        },
        "cost": 40000
      },
      {
        "title": "ขอให้ตรวจจากข้อมูลที่มี",
        "success": {
          "report": "ตรวจสอบบางส่วนสำเร็จ",
          "scores": {
            "integrity": 5
          }
        },
        "requires": {
          "government": 71
        }
      },
      {
        "title": "ปฏิเสธการตรวจสอบ",
        "chance": 0.3,
        "success": {
          "report": "เรื่องตรวจสอบถูกยกเลิก",
          "scores": {}
        },
        "failure": {
          "report": "รัฐบาลตั้งข้อสงสัยเพิ่มเติม",
          "scores": {
            "integrity": -15,
            "government": -10
          }
        }
      }
    ]
  },
  {
    "id": "integrity-press-ethics",
    "category": "integrity",
    "minLevel": 7,
    "title": "สื่อถามถึงจริยธรรมของนายก",
    "story": "นักข่าวถามว่าการให้สิทธิพิเศษกับผู้สนับสนุนมีความเป็นธรรมหรือไม่",
    "choices": [
      {
        "title": "ชี้แจงและเปิดเอกสาร",
        "success": {
          "report": "สื่อยอมรับข้อมูล",
          "scores": {
            "integrity": 10,
            "image": 5
          }
        },
        "requires": {
          "integrity": 51
        }
      },
      {
        "title": "ยอมรับข้อบกพร่อง",
        "success": {
          "report": "ความโปร่งใสเพิ่มขึ้นแต่ภาพลักษณ์เสียหาย",
          "scores": {
            "integrity": 10,
            "image": -5
          }
        }
      },
      {
        "title": "ปฏิเสธทุกข้อกล่าวหา",
        "chance": 0.3,
        "success": {
          "report": "สื่อไม่มีข้อมูลเพิ่มเติม",
          "scores": {}
        },
        "failure": {
          "report": "ข้อกล่าวหาถูกขยายผล",
          "scores": {
            "integrity": -10,
            "image": -10
          }
        }
      }
    ]
  },
  {
    "id": "integrity-compensation",
    "category": "integrity",
    "minLevel": 5,
    "title": "ข้อเสนอให้ปิดเรื่องร้องเรียน",
    "story": "ตัวแทนกลุ่มธุรกิจเสนอเงินให้เมืองเพื่อยุติข้อพิพาท",
    "choices": [
      {
        "title": "รับเงินเพื่อยุติเรื่อง",
        "success": {
          "report": "เมืองได้รับเงินแต่มีประวัติไม่โปร่งใส",
          "scores": {
            "integrity": -15
          },
          "money": 120000,
          "flags": [
            "secretDonor"
          ]
        }
      },
      {
        "title": "เปิดเจรจาสาธารณะ",
        "success": {
          "report": "ข้อพิพาทได้รับการพิจารณา",
          "scores": {
            "integrity": 10
          }
        },
        "requires": {
          "integrity": 71
        }
      },
      {
        "title": "ปฏิเสธ",
        "success": {
          "report": "การร้องเรียนดำเนินตามปกติ",
          "scores": {
            "integrity": 5,
            "business": -5
          }
        }
      }
    ]
  },
  {
    "id": "integrity-ethics",
    "category": "integrity",
    "minLevel": 1,
    "title": "คำปฏิญาณเรื่องงบเมือง",
    "story": "เจ้าหน้าที่เสนอจัดทำหลักเกณฑ์การรับผลประโยชน์ฉบับใหม่",
    "choices": [
      {
        "title": "อนุมัติและเปิดเผย",
        "success": {
          "report": "เมืองได้รับการยอมรับด้านความโปร่งใส",
          "scores": {
            "integrity": 10
          }
        },
        "cost": 25000
      },
      {
        "title": "ประกาศแนวทางโดยไม่ใช้งบ",
        "success": {
          "report": "เจ้าหน้าที่รับทราบแนวปฏิบัติ",
          "scores": {
            "integrity": 5
          }
        }
      },
      {
        "title": "ไม่กำหนดหลักเกณฑ์",
        "success": {
          "report": "ภาพลักษณ์ด้านความโปร่งใสลดลง",
          "scores": {
            "integrity": -5
          }
        }
      }
    ]
  }
]);
MAYOR_EVENTS.push(...[
  {
    "id": "government-liaison-daily",
    "category": "government",
    "minLevel": 1,
    "fallbackOnly": true,
    "title": "หนังสือประสานงานจากส่วนกลาง",
    "story": "รัฐบาลขอข้อมูลแผนพัฒนาเมืองและเชิญนายกหารือเรื่องการสนับสนุนโครงการในอนาคต แม้เมืองยังไม่มีอาคารพร้อมรับโครงการ",
    "choices": [
      {
        "title": "จัดทีมจัดทำแผนและประสานงาน",
        "cost": 25000,
        "success": {
          "report": "รัฐบาลได้รับแผนและชื่นชมความร่วมมือ",
          "scores": {
            "government": 10
          }
        }
      },
      {
        "title": "หารือด้วยข้อมูลที่มีอยู่",
        "requires": {
          "government": 71
        },
        "success": {
          "report": "รัฐบาลยอมรับข้อมูลโดยไม่ต้องใช้งบ",
          "scores": {
            "government": 10
          }
        }
      },
      {
        "title": "ตอบหนังสือรับทราบโดยไม่ขอรับโครงการ",
        "success": {
          "report": "รัฐบาลรับทราบ เมืองยังไม่มีภาระผูกพัน",
          "scores": {}
        }
      },
      {
        "title": "ไม่ให้ความร่วมมือ",
        "success": {
          "report": "ส่วนกลางไม่พอใจการปฏิเสธ",
          "scores": {
            "government": -10
          }
        }
      }
    ]
  },
  {
    "id": "business-new-market-daily",
    "category": "business",
    "minLevel": 1,
    "fallbackOnly": true,
    "title": "ผู้ประกอบการกลุ่มแรกอยากเข้ามาลงทุน",
    "story": "กลุ่มผู้สนใจเปิดร้านค้าในเมืองขอให้นายกชี้แจงแนวทางสนับสนุนธุรกิจ ก่อนตัดสินใจเข้ามาลงทุน",
    "choices": [
      {
        "title": "จัดเวทีรับฟังผู้สนใจลงทุน",
        "cost": 20000,
        "success": {
          "report": "กลุ่มธุรกิจชื่นชมการเปิดรับความคิดเห็น",
          "scores": {
            "business": 10
          }
        }
      },
      {
        "title": "เจรจาโดยใช้ความสัมพันธ์ที่มีอยู่",
        "requires": {
          "business": 71
        },
        "success": {
          "report": "ผู้สนใจลงทุนยอมรับแนวทางของเมือง",
          "scores": {
            "business": 10
          }
        }
      },
      {
        "title": "รับข้อเสนอไว้โดยไม่ผูกพันงบเมือง",
        "success": {
          "report": "ผู้ประกอบการได้รับคำตอบและจะพิจารณาแผนของตนต่อไป",
          "scores": {}
        }
      },
      {
        "title": "ปฏิเสธการเข้าพบ",
        "success": {
          "report": "กลุ่มผู้ประกอบการผิดหวัง",
          "scores": {
            "business": -10
          }
        }
      }
    ]
  }
]);
// Append only: saved choice indices from 7.0 remain unchanged.
const MAYOR_EXTRA_CHOICES = {
  "admin-rain": [
    {
      "title": "ประสานทีมอาสาสมัคร",
      "success": {
        "report": "ทีมชุมชนพร้อมรับมือฝน",
        "scores": {
          "admin": 10
        }
      },
      "requires": {
        "people": 71
      }
    },
    {
      "title": "ตั้งศูนย์รับแจ้งเหตุ",
      "success": {
        "report": "เจ้าหน้าที่พร้อมรับเรื่องฉุกเฉิน",
        "scores": {
          "admin": 5,
          "people": 3
        }
      },
      "cost": 30000
    }
  ],
  "admin-traffic": [
    {
      "title": "ขอความร่วมมือประชาชนจัดระเบียบการเดินทาง",
      "success": {
        "report": "ตัวแทนชุมชนยอมประสานงาน",
        "scores": {
          "admin": 10
        }
      },
      "requires": {
        "people": 71
      }
    },
    {
      "title": "ลดเงินรางวัลเดินทาง 100 บาท แลกงบประสานงานวันนี้",
      "success": {
        "report": "เมืองประหยัดงบจากภารกิจในวันนี้",
        "scores": {
          "admin": 5,
          "people": -5
        },
        "effects": [
          {
            "scope": "all",
            "kind": "tripDelta",
            "value": -100
          }
        ]
      }
    }
  ],
  "image-interview": [
    {
      "title": "เชิญผู้แทนประชาชนร่วมให้ข้อมูล",
      "success": {
        "report": "สื่อรับฟังข้อมูลจากทั้งสองฝ่าย",
        "scores": {
          "image": 10
        }
      },
      "requires": {
        "people": 71
      }
    }
  ],
  "image-party": [
    {
      "title": "ให้ชุมชนเป็นเจ้าภาพโดยไม่ใช้งบเมือง",
      "success": {
        "report": "ประชาชนจัดงานเรียบง่ายเอง",
        "scores": {
          "image": 10
        }
      },
      "requires": {
        "people": 71
      }
    },
    {
      "title": "จัดงานปิด ไม่เปิดเผยรายชื่อผู้สนับสนุน",
      "chance": 0.3,
      "success": {
        "report": "งานผ่านไปโดยไม่มีเสียงวิจารณ์",
        "scores": {
          "image": 5
        }
      },
      "failure": {
        "report": "ข้อมูลผู้สนับสนุนกลายเป็นประเด็นข่าว",
        "scores": {
          "image": -15,
          "integrity": -5
        }
      }
    }
  ],
  "fame-food": [
    {
      "title": "เก็บรายได้ร้านอาหารลดลง 100 บาทวันนี้ เพื่อร่วมงาน",
      "success": {
        "report": "สมาคมตอบรับส่วนลด",
        "scores": {
          "fame": 5,
          "business": 5
        },
        "effects": [
          {
            "scope": "restaurant",
            "kind": "tripDelta",
            "value": -100
          }
        ]
      }
    },
    {
      "title": "ให้ผู้จัดโปรโมตงานด้วยตนเอง",
      "chance": 0.3,
      "success": {
        "report": "งานได้รับความสนใจเกินคาด",
        "scores": {
          "fame": 10
        }
      },
      "failure": {
        "report": "ผู้จัดทำประชาสัมพันธ์ไม่สำเร็จ",
        "scores": {
          "fame": -10
        }
      }
    }
  ],
  "fame-news": [
    {
      "title": "ขอความร่วมมือสมาคมธุรกิจส่งข้อมูลท่องเที่ยว",
      "success": {
        "report": "สมาคมส่งข้อมูลให้สื่อโดยไม่ใช้งบ",
        "scores": {
          "fame": 10
        }
      },
      "requires": {
        "business": 71
      }
    },
    {
      "title": "ให้สื่อเลือกมุมโปรโมตเองทั้งหมด",
      "chance": 0.3,
      "success": {
        "report": "ข่าวได้รับความนิยม",
        "scores": {
          "fame": 10
        }
      },
      "failure": {
        "report": "เมืองถูกนำเสนอในแง่ลบ",
        "scores": {
          "fame": -10,
          "image": -5
        }
      }
    }
  ],
  "government-home": [
    {
      "title": "เจรจารับงบ 144,000 บาท สร้างบ้านเริ่มต้น 3 หลัง",
      "task": {
        "kind": "build",
        "key": "home_starter",
        "count": 3
      },
      "grant": 144000,
      "requires": {
        "government": 86
      },
      "success": {
        "report": "ส่งมอบบ้านเริ่มต้นตามข้อตกลงแล้ว",
        "scores": {
          "government": 10,
          "admin": 5
        }
      },
      "failure": {
        "report": "ส่งมอบบ้านเริ่มต้นไม่ครบตามเวลาที่กำหนด",
        "scores": {
          "government": -10,
          "admin": -5
        }
      }
    },
    {
      "title": "ขอรับงบ 24,000 บาท สร้างบ้านเริ่มต้น 1 หลัง",
      "task": {
        "kind": "build",
        "key": "home_starter",
        "count": 1
      },
      "grant": 24000,
      "requires": {
        "government": 51
      },
      "success": {
        "report": "ส่งมอบบ้านเริ่มต้นตามข้อตกลงแล้ว",
        "scores": {
          "government": 10,
          "admin": 5
        }
      },
      "failure": {
        "report": "ส่งมอบบ้านเริ่มต้นไม่ครบตามเวลาที่กำหนด",
        "scores": {
          "government": -10,
          "admin": -5
        }
      }
    },
    {
      "title": "ใช้งบเมืองเอง สร้างบ้านเริ่มต้น 1 หลัง",
      "task": {
        "kind": "build",
        "key": "home_starter",
        "count": 1
      },
      "success": {
        "report": "ส่งมอบบ้านเริ่มต้นตามข้อตกลงแล้ว",
        "scores": {
          "government": 10,
          "admin": 5
        }
      },
      "failure": {
        "report": "ส่งมอบบ้านเริ่มต้นไม่ครบตามเวลาที่กำหนด",
        "scores": {
          "government": -10,
          "admin": -5
        }
      }
    }
  ],
  "people-welcome": [
    {
      "title": "ให้ชุมชนช่วยต้อนรับผู้สมัคร",
      "success": {
        "report": "ชุมชนร่วมประสานผู้สนใจ",
        "scores": {
          "people": 10
        }
      },
      "requires": {
        "image": 71
      }
    },
    {
      "title": "เปิดจุดให้คำปรึกษาการย้ายถิ่น",
      "success": {
        "report": "ผู้สนใจได้รับข้อมูลครบถ้วน",
        "scores": {
          "people": 5
        }
      },
      "cost": 20000
    }
  ],
  "people-cost": [
    {
      "title": "ขอธุรกิจร่วมช่วยเหลือโดยไม่ใช้งบเมือง",
      "success": {
        "report": "เจ้าของกิจการยอมร่วมประสานมาตรการ",
        "scores": {
          "people": 10
        }
      },
      "requires": {
        "business": 71
      }
    },
    {
      "title": "ลดรายได้จากร้านค้า 150 บาทวันนี้",
      "success": {
        "report": "ชุมชนได้รับมาตรการลดรายได้เฉพาะร้านค้า",
        "scores": {
          "people": 5,
          "business": -5
        },
        "effects": [
          {
            "scope": "shop",
            "kind": "tripDelta",
            "value": -150
          }
        ]
      }
    }
  ],
  "business-pub": [
    {
      "title": "ออกเงินสนับสนุนการประสานงานกับชุมชน",
      "success": {
        "report": "สมาคมผับพอใจกับมาตรการ",
        "scores": {
          "business": 10,
          "people": 5
        }
      },
      "cost": 45000
    }
  ],
  "integrity-donor": [
    {
      "title": "แจ้งหน่วยงานตรวจสอบข้อเสนอ",
      "success": {
        "report": "เจ้าหน้าที่รับเรื่องและตรวจสอบ",
        "scores": {
          "integrity": 15,
          "government": 5,
          "business": -5
        }
      },
      "cost": 50000
    }
  ],
  "integrity-audit": [
    {
      "title": "เชิญผู้แทนรัฐบาลตรวจเอกสารร่วมกัน",
      "success": {
        "report": "เจ้าหน้าที่ส่วนกลางช่วยตรวจสอบ",
        "scores": {
          "integrity": 10
        }
      },
      "requires": {
        "government": 71
      }
    },
    {
      "title": "รับรองบัญชีตามเอกสารเดิม",
      "chance": 0.3,
      "success": {
        "report": "การตรวจเอกสารผ่านโดยไม่มีข้อทักท้วง",
        "scores": {
          "integrity": 3
        }
      },
      "failure": {
        "report": "ความคลาดเคลื่อนถูกเปิดเผย",
        "scores": {
          "integrity": -15,
          "image": -5
        }
      }
    }
  ],
  "admin-crossing": [
    {
      "title": "ประสานตัวแทนผู้ใช้ถนนโดยตรง",
      "success": {
        "report": "ผู้แทนร่วมแก้ข้อร้องเรียน",
        "scores": {
          "admin": 10
        }
      },
      "requires": {
        "people": 71
      }
    },
    {
      "title": "รับเรื่องแต่ไม่อนุมัติงบเพิ่ม",
      "success": {
        "report": "ข้อร้องเรียนยังไม่ได้แก้ครบ",
        "scores": {
          "admin": -5,
          "people": -3
        }
      }
    }
  ],
  "admin-office": [
    {
      "title": "ให้หัวหน้าฝ่ายจัดสรรคนใหม่",
      "success": {
        "report": "ทีมงานจัดคิวงานได้ดีขึ้น",
        "scores": {
          "admin": 10
        }
      },
      "requires": {
        "admin": 71
      }
    },
    {
      "title": "ยกเลิกงานเอกสารบางส่วนโดยไม่หารือ",
      "chance": 0.3,
      "success": {
        "report": "งานค้างลดลง",
        "scores": {
          "admin": 5
        }
      },
      "failure": {
        "report": "งานสำคัญตกหล่น",
        "scores": {
          "admin": -15,
          "integrity": -5
        }
      }
    }
  ],
  "admin-inspection": [
    {
      "title": "ขอผู้ตรวจประเมินให้คำแนะนำก่อนเริ่ม",
      "success": {
        "report": "ทีมประเมินยอมให้คำแนะนำฟรี",
        "scores": {
          "admin": 5
        }
      },
      "requires": {
        "government": 71
      }
    },
    {
      "title": "ส่งเจ้าหน้าที่อบรมมาตรฐานการตรวจ",
      "success": {
        "report": "ทีมงานเข้าใจมาตรฐานมากขึ้น",
        "scores": {
          "admin": 10
        }
      },
      "cost": 40000
    }
  ],
  "admin-park": [
    {
      "title": "ขอสมาคมชุมชนร่วมดูแลพื้นที่เดิม",
      "success": {
        "report": "ชุมชนช่วยจัดการพื้นที่สาธารณะ",
        "scores": {
          "admin": 10
        }
      },
      "requires": {
        "people": 71
      }
    },
    {
      "title": "ลดรายได้จากสวน 100 บาทวันนี้",
      "success": {
        "report": "ประชาชนพอใจกับมาตรการชั่วคราว",
        "scores": {
          "admin": 5,
          "people": 5
        },
        "effects": [
          {
            "scope": "park",
            "kind": "tripDelta",
            "value": -100
          }
        ]
      }
    }
  ],
  "admin-restaurant": [
    {
      "title": "ขอสมาคมร้านอาหารช่วยประสานคำร้อง",
      "success": {
        "report": "สมาคมร่วมจัดการปัญหาบริการ",
        "scores": {
          "admin": 10
        }
      },
      "requires": {
        "business": 71
      }
    },
    {
      "title": "ลดรายได้ร้านอาหาร 150 บาทวันนี้",
      "success": {
        "report": "ประชาชนพอใจกับข้อตกลงชั่วคราว",
        "scores": {
          "admin": 5,
          "people": 5
        },
        "effects": [
          {
            "scope": "restaurant",
            "kind": "tripDelta",
            "value": -150
          }
        ]
      }
    }
  ],
  "admin-shops": [
    {
      "title": "เชิญร้านค้าช่วยสำรวจจุดบริการ",
      "success": {
        "report": "สมาคมส่งข้อมูลให้เทศบาล",
        "scores": {
          "admin": 10
        }
      },
      "requires": {
        "business": 71
      }
    },
    {
      "title": "ลดรายได้ร้านค้า 100 บาทวันนี้",
      "success": {
        "report": "เมืองช่วยบรรเทาข้อร้องเรียน",
        "scores": {
          "admin": 5,
          "people": 5
        },
        "effects": [
          {
            "scope": "shop",
            "kind": "tripDelta",
            "value": -100
          }
        ]
      }
    }
  ],
  "admin-audit-cost": [
    {
      "title": "ขอให้ส่วนกลางส่งผู้ตรวจงบ",
      "success": {
        "report": "ผู้ตรวจจากรัฐบาลช่วยทบทวนงบ",
        "scores": {
          "admin": 10
        }
      },
      "requires": {
        "government": 71
      }
    },
    {
      "title": "ข้ามการตรวจและรับรองรายจ่ายเดิม",
      "chance": 0.3,
      "success": {
        "report": "รายจ่ายผ่านการตรวจรอบแรก",
        "scores": {
          "admin": 5
        }
      },
      "failure": {
        "report": "พบรายการที่อธิบายไม่ได้",
        "scores": {
          "admin": -15,
          "integrity": -10
        }
      }
    }
  ],
  "admin-office-supply": [
    {
      "title": "ขอบริษัทช่วยสำรวจความต้องการแรงงาน",
      "success": {
        "report": "ภาคธุรกิจร่วมส่งข้อมูล",
        "scores": {
          "admin": 10
        }
      },
      "requires": {
        "business": 71
      }
    },
    {
      "title": "ลดรายได้ภารกิจไปสำนักงาน 100 บาทวันนี้",
      "success": {
        "report": "เกิดมาตรการช่วยเหลือสำนักงาน",
        "scores": {
          "admin": 5,
          "business": 5
        },
        "effects": [
          {
            "scope": "office",
            "kind": "tripDelta",
            "value": -100
          }
        ]
      }
    }
  ],
  "admin-city-fair": [
    {
      "title": "ขอรับการประเมินเบื้องต้นโดยไม่ชิงรางวัล",
      "success": {
        "report": "กรรมการช่วยประเมินโดยไม่ใช้งบ",
        "scores": {
          "admin": 10
        }
      },
      "requires": {
        "government": 71
      }
    },
    {
      "title": "ประกาศว่าเมืองผ่านมาตรฐานก่อนประเมิน",
      "chance": 0.3,
      "success": {
        "report": "ข่าวได้รับการตอบรับ",
        "scores": {
          "admin": 5
        }
      },
      "failure": {
        "report": "กรรมการออกมาทักท้วง",
        "scores": {
          "admin": -15,
          "fame": -10
        }
      }
    }
  ],
  "admin-bridge-review": [
    {
      "title": "ให้ทีมช่างเมืองนำเสนอรายงานเดิม",
      "success": {
        "report": "ทีมงานยืนยันรายการตรวจสอบ",
        "scores": {
          "admin": 5
        }
      },
      "requires": {
        "admin": 71
      }
    },
    {
      "title": "เปิดช่องให้ประชาชนแจ้งจุดเสี่ยง",
      "success": {
        "report": "ได้รับข้อมูลจุดเสี่ยงเพิ่มเติม",
        "scores": {
          "admin": 5,
          "people": 5
        }
      },
      "cost": 20000
    }
  ],
  "admin-paper": [
    {
      "title": "ขอส่วนกลางส่งเจ้าหน้าที่ประสานงาน",
      "success": {
        "report": "ส่วนกลางช่วยจัดลำดับเอกสาร",
        "scores": {
          "admin": 10
        }
      },
      "requires": {
        "government": 71
      }
    },
    {
      "title": "อนุมัติเอกสารค้างโดยไม่ตรวจทีละฉบับ",
      "chance": 0.3,
      "success": {
        "report": "เอกสารผ่านไปโดยไม่มีปัญหา",
        "scores": {
          "admin": 5
        }
      },
      "failure": {
        "report": "เอกสารผิดเงื่อนไขถูกตรวจพบ",
        "scores": {
          "admin": -15,
          "integrity": -10
        }
      }
    }
  ],
  "admin-public-work": [
    {
      "title": "ขอชุมชนช่วยจัดกิจกรรมในพื้นที่เดิม",
      "success": {
        "report": "ชุมชนตกลงช่วยโดยไม่ใช้งบ",
        "scores": {
          "admin": 10
        }
      },
      "requires": {
        "people": 71
      }
    },
    {
      "title": "ลดรายได้จากสวน 150 บาทวันนี้",
      "success": {
        "report": "ชุมชนยอมรับมาตรการชั่วคราว",
        "scores": {
          "admin": 5,
          "people": 5
        },
        "effects": [
          {
            "scope": "park",
            "kind": "tripDelta",
            "value": -150
          }
        ]
      }
    }
  ],
  "admin-training": [
    {
      "title": "ขอหัวหน้าฝ่ายสอนงานภายใน",
      "success": {
        "report": "ทีมงานจัดอบรมภายในสำเร็จ",
        "scores": {
          "admin": 10
        }
      },
      "requires": {
        "admin": 71
      }
    },
    {
      "title": "รับรองว่าทีมผ่านอบรมโดยไม่จัดจริง",
      "chance": 0.3,
      "success": {
        "report": "ไม่มีผู้ทักท้วงใบรับรอง",
        "scores": {
          "admin": 5
        }
      },
      "failure": {
        "report": "เอกสารถูกตรวจพบว่าไม่ตรงจริง",
        "scores": {
          "admin": -15,
          "integrity": -10
        }
      }
    }
  ],
  "image-birthday": [
    {
      "title": "ให้ชุมชนร่วมจัดงานเล็ก ๆ โดยไม่ใช้งบเมือง",
      "success": {
        "report": "ชุมชนจัดงานเอง",
        "scores": {
          "image": 10
        }
      },
      "requires": {
        "people": 71
      }
    },
    {
      "title": "จัดงานเฉพาะผู้สนับสนุนรายใหญ่",
      "chance": 0.3,
      "success": {
        "report": "งานผ่านไปอย่างเงียบ ๆ",
        "scores": {
          "image": 5
        }
      },
      "failure": {
        "report": "รายชื่อแขกทำให้สื่อวิจารณ์",
        "scores": {
          "image": -15,
          "integrity": -5
        }
      }
    }
  ],
  "image-photo": [
    {
      "title": "ให้ตัวแทนชุมชนร่วมตรวจข้อเท็จจริง",
      "success": {
        "report": "ชุมชนยืนยันข้อมูลต่อสื่อ",
        "scores": {
          "image": 10
        }
      },
      "requires": {
        "people": 71
      }
    },
    {
      "title": "ยอมรับว่าการรับรองไม่เหมาะสม",
      "success": {
        "report": "สื่อชื่นชมการยอมรับข้อบกพร่อง",
        "scores": {
          "image": 5,
          "integrity": 5
        }
      }
    }
  ],
  "image-walk": [
    {
      "title": "ลงพื้นที่ร่วมกับตัวแทนชุมชนโดยไม่จัดงาน",
      "success": {
        "report": "ประชาชนได้พูดคุยกับนายกโดยตรง",
        "scores": {
          "image": 10
        }
      },
      "requires": {
        "people": 71
      }
    },
    {
      "title": "จัดเฉพาะการพบปะผู้สนับสนุน",
      "chance": 0.3,
      "success": {
        "report": "กิจกรรมได้รับการตอบรับ",
        "scores": {
          "image": 5
        }
      },
      "failure": {
        "report": "ผู้ร้องเรียนรู้สึกถูกกันออก",
        "scores": {
          "image": -15,
          "people": -5
        }
      }
    }
  ],
  "image-award": [
    {
      "title": "ชวนคณะกรรมการประเมินผลงานต่อหน้าประชาชน",
      "success": {
        "report": "คณะกรรมการยอมเปิดเผยการประเมิน",
        "scores": {
          "image": 10
        }
      },
      "requires": {
        "integrity": 71
      }
    },
    {
      "title": "รับเงินจากผู้จัดงานแต่ไม่ขึ้นเวที",
      "success": {
        "report": "เมืองได้เงินแต่พลาดการพบปะชุมชน",
        "scores": {
          "image": -5,
          "integrity": -5
        },
        "money": 50000
      }
    }
  ],
  "image-rumor": [
    {
      "title": "ให้รัฐบาลช่วยยืนยันข้อมูล",
      "success": {
        "report": "ส่วนกลางยืนยันเอกสารที่เกี่ยวข้อง",
        "scores": {
          "image": 10
        }
      },
      "requires": {
        "government": 71
      }
    },
    {
      "title": "ยอมรับว่ามีขั้นตอนที่ยังต้องปรับปรุง",
      "success": {
        "report": "สื่อยอมรับคำชี้แจงตรงไปตรงมา",
        "scores": {
          "image": 5,
          "integrity": 5
        }
      }
    }
  ],
  "image-speech": [
    {
      "title": "ชวนตัวแทนชุมชนขึ้นเวทีร่วมกัน",
      "success": {
        "report": "เวทีได้รับคำชื่นชม",
        "scores": {
          "image": 10
        }
      },
      "requires": {
        "people": 71
      }
    },
    {
      "title": "ประกาศผลงานเกินกว่าที่ทำได้",
      "chance": 0.3,
      "success": {
        "report": "ผู้ฟังตอบรับคำพูด",
        "scores": {
          "image": 5
        }
      },
      "failure": {
        "report": "ข้อมูลถูกทักท้วงหลังงาน",
        "scores": {
          "image": -15,
          "integrity": -5
        }
      }
    }
  ],
  "image-friend": [
    {
      "title": "ให้คณะกรรมการอิสระพิจารณาคำขอ",
      "success": {
        "report": "คำขอได้รับการพิจารณาตามเกณฑ์",
        "scores": {
          "image": 10
        }
      },
      "requires": {
        "integrity": 71
      }
    },
    {
      "title": "ให้สิทธิพิเศษโดยไม่ลงเอกสาร",
      "chance": 0.3,
      "success": {
        "report": "ไม่มีข้อร้องเรียนในวันนี้",
        "scores": {
          "image": 5
        }
      },
      "failure": {
        "report": "ข้อตกลงถูกเปิดเผย",
        "scores": {
          "image": -15,
          "integrity": -10
        }
      }
    }
  ],
  "image-camera": [
    {
      "title": "เปิดให้ผู้แทนชุมชนร่วมเล่าเรื่องเมือง",
      "success": {
        "report": "สารคดีสะท้อนชีวิตชุมชน",
        "scores": {
          "image": 10
        }
      },
      "requires": {
        "people": 71
      }
    },
    {
      "title": "ขายสิทธิ์ประชาสัมพันธ์ให้ผู้ผลิต",
      "success": {
        "report": "คลังได้เงินแต่สื่อบางส่วนวิจารณ์",
        "scores": {
          "image": -5,
          "integrity": -5
        },
        "money": 80000
      }
    }
  ],
  "image-promise": [
    {
      "title": "ขอผู้แทนชุมชนร่วมกำหนดเป้าหมาย",
      "success": {
        "report": "ชุมชนชื่นชมการตั้งเป้าหมายร่วมกัน",
        "scores": {
          "image": 10
        }
      },
      "requires": {
        "people": 71
      }
    },
    {
      "title": "จัดเวทีติดตามผลต่อสาธารณะ",
      "success": {
        "report": "ประชาชนได้รับข้อมูลอย่างเป็นระบบ",
        "scores": {
          "image": 5,
          "integrity": 5
        }
      },
      "cost": 25000
    }
  ],
  "image-gift": [
    {
      "title": "ขอเจ้าหน้าที่รัฐรับรองการส่งคืนของขวัญ",
      "success": {
        "report": "การส่งคืนมีหลักฐานเปิดเผย",
        "scores": {
          "image": 10
        }
      },
      "requires": {
        "government": 71
      }
    },
    {
      "title": "ให้ผู้ส่งเปลี่ยนเป็นของขวัญส่วนตัว",
      "chance": 0.3,
      "success": {
        "report": "เรื่องไม่ถูกนำเสนอในข่าว",
        "scores": {
          "image": 3
        }
      },
      "failure": {
        "report": "สื่อพบการรับของขวัญ",
        "scores": {
          "image": -15,
          "integrity": -10
        }
      }
    }
  ],
  "image-survey": [
    {
      "title": "ขอชุมชนร่วมตรวจวิธีสำรวจ",
      "success": {
        "report": "ตัวแทนชุมชนยอมรับกระบวนการ",
        "scores": {
          "image": 10
        }
      },
      "requires": {
        "people": 71
      }
    },
    {
      "title": "เผยแพร่เฉพาะผลสำรวจด้านบวก",
      "chance": 0.3,
      "success": {
        "report": "ข่าวได้รับความนิยม",
        "scores": {
          "image": 5
        }
      },
      "failure": {
        "report": "ผู้สำรวจเปิดเผยข้อมูลที่ถูกตัดออก",
        "scores": {
          "image": -15,
          "integrity": -5
        }
      }
    }
  ],
  "image-critic": [
    {
      "title": "เชิญผู้วิจารณ์มาร่วมรับฟังข้อเท็จจริง",
      "success": {
        "report": "ผู้วิจารณ์ยอมรับการพูดคุย",
        "scores": {
          "image": 10
        }
      },
      "requires": {
        "people": 71
      }
    },
    {
      "title": "ยอมรับข้อผิดพลาดพร้อมเปิดข้อมูล",
      "success": {
        "report": "ความน่าเชื่อถือกลับมาบางส่วน",
        "scores": {
          "image": 5,
          "integrity": 5
        }
      }
    }
  ],
  "image-community": [
    {
      "title": "ขอชุมชนจัดงานด้วยทรัพยากรที่มี",
      "success": {
        "report": "งานจัดได้โดยไม่ใช้งบเมือง",
        "scores": {
          "image": 10
        }
      },
      "requires": {
        "people": 71
      }
    },
    {
      "title": "รับเงินสนับสนุนจากผู้ประกอบการในงาน",
      "success": {
        "report": "คลังได้เงินแต่ชุมชนบางส่วนไม่พอใจ",
        "scores": {
          "image": 5,
          "people": -5
        },
        "money": 40000
      }
    }
  ],
  "fame-tour-film": [
    {
      "title": "ขอผู้ผลิตนำเสนอเมืองโดยใช้เรื่องราวชุมชน",
      "success": {
        "report": "ผู้ผลิตยอมรับรูปแบบที่เมืองเสนอ",
        "scores": {
          "fame": 10
        }
      },
      "requires": {
        "people": 71
      }
    },
    {
      "title": "อนุญาตให้ใช้ชื่อเมืองโดยไม่ตรวจเนื้อหา",
      "chance": 0.3,
      "success": {
        "report": "ภาพยนตร์โปรโมตเมืองได้ดี",
        "scores": {
          "fame": 10
        }
      },
      "failure": {
        "report": "เนื้อหาทำให้เมืองเสียชื่อเสียง",
        "scores": {
          "fame": -15
        }
      }
    }
  ],
  "fame-hotel-guide": [
    {
      "title": "ลดรายได้ภารกิจโรงแรม 100 บาทวันนี้",
      "success": {
        "report": "สมาคมที่พักยอมรับการสนับสนุน",
        "scores": {
          "fame": 5,
          "business": 5
        },
        "effects": [
          {
            "scope": "hotel",
            "kind": "tripDelta",
            "value": -100
          }
        ]
      }
    },
    {
      "title": "ให้สมาคมเผยแพร่คู่มือโดยไม่ตรวจทาน",
      "chance": 0.3,
      "success": {
        "report": "คู่มือได้รับความนิยม",
        "scores": {
          "fame": 10
        }
      },
      "failure": {
        "report": "ข้อมูลที่พักผิดพลาดและถูกตำหนิ",
        "scores": {
          "fame": -10
        }
      }
    }
  ],
  "fame-restaurant-star": [
    {
      "title": "ชวนสมาคมร้านอาหารดูแลการต้อนรับ",
      "success": {
        "report": "สมาคมจัดกิจกรรมให้เอง",
        "scores": {
          "fame": 10
        }
      },
      "requires": {
        "business": 71
      }
    },
    {
      "title": "ลดรายได้ร้านอาหาร 100 บาทวันนี้",
      "success": {
        "report": "ร้านอาหารได้รับการสนับสนุนชั่วคราว",
        "scores": {
          "fame": 5,
          "business": 5
        },
        "effects": [
          {
            "scope": "restaurant",
            "kind": "tripDelta",
            "value": -100
          }
        ]
      }
    }
  ],
  "fame-shopping": [
    {
      "title": "ใช้เครือข่ายรัฐบาลช่วยเผยแพร่ข่าวงาน",
      "success": {
        "report": "หน่วยงานกลางช่วยประชาสัมพันธ์",
        "scores": {
          "fame": 10
        }
      },
      "requires": {
        "government": 71
      }
    },
    {
      "title": "ให้ผู้จัดโฆษณาเกินจริงเพื่อเรียกความสนใจ",
      "chance": 0.3,
      "success": {
        "report": "งานเป็นกระแส",
        "scores": {
          "fame": 10
        }
      },
      "failure": {
        "report": "นักท่องเที่ยวตำหนิโฆษณา",
        "scores": {
          "fame": -15,
          "integrity": -5
        }
      }
    }
  ],
  "fame-night": [
    {
      "title": "ให้ชุมชนช่วยกำหนดแนวทางกิจกรรม",
      "success": {
        "report": "ชุมชนยอมรับแผนประชาสัมพันธ์",
        "scores": {
          "fame": 10
        }
      },
      "requires": {
        "people": 71
      }
    },
    {
      "title": "รับสปอนเซอร์จากผู้จัดงาน",
      "success": {
        "report": "คลังได้เงิน แต่ชุมชนกังวลเรื่องงาน",
        "scores": {
          "fame": 5,
          "people": -5
        },
        "money": 80000
      }
    }
  ],
  "fame-coast": [
    {
      "title": "ขอเครือข่ายส่วนกลางช่วยรณรงค์",
      "success": {
        "report": "รัฐบาลสนับสนุนการประชาสัมพันธ์",
        "scores": {
          "fame": 10
        }
      },
      "requires": {
        "government": 71
      }
    },
    {
      "title": "เผยแพร่ภาพชายฝั่งโดยไม่ตรวจสภาพ",
      "chance": 0.3,
      "success": {
        "report": "ภาพได้รับการแชร์",
        "scores": {
          "fame": 10
        }
      },
      "failure": {
        "report": "สื่อทักท้วงสภาพพื้นที่จริง",
        "scores": {
          "fame": -15,
          "image": -5
        }
      }
    }
  ],
  "fame-rival": [
    {
      "title": "ขอภาคธุรกิจร่วมทำแคมเปญ",
      "success": {
        "report": "ผู้ประกอบการช่วยเผยแพร่เมือง",
        "scores": {
          "fame": 10
        }
      },
      "requires": {
        "business": 71
      }
    },
    {
      "title": "ประกาศว่าเมืองดีกว่าคู่แข่งโดยไม่เปรียบเทียบข้อมูล",
      "chance": 0.3,
      "success": {
        "report": "แคมเปญได้รับความสนใจ",
        "scores": {
          "fame": 10
        }
      },
      "failure": {
        "report": "เกิดกระแสวิจารณ์การกล่าวอ้าง",
        "scores": {
          "fame": -15,
          "image": -5
        }
      }
    }
  ],
  "fame-landmark": [
    {
      "title": "ขอส่วนกลางช่วยเผยแพร่ผลงานสถาปัตยกรรม",
      "success": {
        "report": "เมืองได้รับการประชาสัมพันธ์จากส่วนกลาง",
        "scores": {
          "fame": 10
        }
      },
      "requires": {
        "government": 71
      }
    },
    {
      "title": "รับเงินสนับสนุนงานนำเสนอแบบมีผู้สนับสนุน",
      "success": {
        "report": "คลังได้รับเงินและชื่อเมืองถูกกล่าวถึง",
        "scores": {
          "fame": 5,
          "image": -5
        },
        "money": 100000
      }
    }
  ],
  "fame-park": [
    {
      "title": "ให้ตัวแทนครอบครัวจัดกิจกรรมเอง",
      "success": {
        "report": "ชุมชนร่วมจัดงานโดยไม่ใช้งบเมือง",
        "scores": {
          "fame": 10
        }
      },
      "requires": {
        "people": 71
      }
    },
    {
      "title": "ลดรายได้จากสวน 100 บาทวันนี้",
      "success": {
        "report": "ผู้จัดได้รับการสนับสนุน",
        "scores": {
          "fame": 5,
          "people": 5
        },
        "effects": [
          {
            "scope": "park",
            "kind": "tripDelta",
            "value": -100
          }
        ]
      }
    }
  ],
  "fame-visitor": [
    {
      "title": "ขอผู้แทนธุรกิจร่วมไกล่เกลี่ย",
      "success": {
        "report": "กลุ่มทัวร์ยอมรับคำชี้แจงร่วมกัน",
        "scores": {
          "fame": 10
        }
      },
      "requires": {
        "business": 71
      }
    },
    {
      "title": "ยอมรับปัญหาอย่างเปิดเผย",
      "success": {
        "report": "ผู้ร้องเรียนเห็นว่าเมืองรับผิดชอบ",
        "scores": {
          "fame": 5,
          "integrity": 5
        }
      }
    }
  ],
  "fame-press-trip": [
    {
      "title": "ขอเครือข่ายรัฐบาลช่วยประสานสื่อ",
      "success": {
        "report": "ส่วนกลางช่วยต้อนรับคณะสื่อ",
        "scores": {
          "fame": 10
        }
      },
      "requires": {
        "government": 71
      }
    },
    {
      "title": "ให้สปอนเซอร์รับผิดชอบงานต้อนรับ",
      "success": {
        "report": "เมืองได้รับเงินสนับสนุนแต่สื่อบางส่วนไม่พอใจ",
        "scores": {
          "fame": 5,
          "image": -5
        },
        "money": 70000
      }
    }
  ],
  "fame-city-award": [
    {
      "title": "ขอผู้ประเมินแนะนำโดยไม่เข้าชิง",
      "success": {
        "report": "เมืองได้รับคำแนะนำโดยไม่ใช้งบ",
        "scores": {
          "fame": 5
        }
      },
      "requires": {
        "government": 71
      }
    },
    {
      "title": "อ้างรางวัลก่อนผลประเมิน",
      "chance": 0.3,
      "success": {
        "report": "ข่าวได้รับการตอบรับ",
        "scores": {
          "fame": 5
        }
      },
      "failure": {
        "report": "คณะกรรมการปฏิเสธคำกล่าวอ้าง",
        "scores": {
          "fame": -15,
          "integrity": -10
        }
      }
    }
  ],
  "fame-festival-sponsor": [
    {
      "title": "ให้ชุมชนกำหนดขอบเขตประชาสัมพันธ์",
      "success": {
        "report": "ผู้สนับสนุนยอมรับแนวทางชุมชน",
        "scores": {
          "fame": 10
        }
      },
      "requires": {
        "people": 71
      }
    },
    {
      "title": "ขอเงินสนับสนุนเพิ่มโดยยืนยันสิทธิ์ผู้จัด",
      "chance": 0.3,
      "success": {
        "report": "ผู้จัดยอมเพิ่มเงิน",
        "scores": {
          "fame": 5
        },
        "money": 120000
      },
      "failure": {
        "report": "ผู้จัดถอนตัวและข่าวแพร่ออกไป",
        "scores": {
          "fame": -15,
          "business": -5
        }
      }
    }
  ],
  "government-grant-shop": [
    {
      "title": "ใช้งบเมืองเอง สร้างร้านค้าเริ่มต้น 3 แห่ง",
      "task": {
        "kind": "build",
        "key": "shop_starter",
        "count": 3
      },
      "success": {
        "report": "ส่งมอบร้านค้าเริ่มต้นตามข้อตกลงแล้ว",
        "scores": {
          "government": 10,
          "admin": 5
        }
      },
      "failure": {
        "report": "ส่งมอบร้านค้าเริ่มต้นไม่ครบตามเวลาที่กำหนด",
        "scores": {
          "government": -10,
          "admin": -5
        }
      }
    },
    {
      "title": "ขอชะลอโครงการโดยส่งแผนพัฒนาแทน",
      "success": {
        "report": "รัฐบาลรับทราบข้อจำกัดและเลื่อนโครงการ",
        "scores": {
          "government": -3,
          "admin": 3
        }
      }
    }
  ],
  "government-grant-food": [
    {
      "title": "ใช้งบเมืองเอง สร้างร้านอาหารเริ่มต้น 3 แห่ง",
      "task": {
        "kind": "build",
        "key": "restaurant_starter",
        "count": 3
      },
      "success": {
        "report": "ส่งมอบร้านอาหารเริ่มต้นตามข้อตกลงแล้ว",
        "scores": {
          "government": 10,
          "admin": 5
        }
      },
      "failure": {
        "report": "ส่งมอบร้านอาหารเริ่มต้นไม่ครบตามเวลาที่กำหนด",
        "scores": {
          "government": -10,
          "admin": -5
        }
      }
    },
    {
      "title": "ขอชะลอโครงการโดยส่งแผนพัฒนาแทน",
      "success": {
        "report": "รัฐบาลรับทราบข้อจำกัดและเลื่อนโครงการ",
        "scores": {
          "government": -3,
          "admin": 3
        }
      }
    }
  ],
  "government-grant-office": [
    {
      "title": "ใช้งบเมืองเอง สร้างสำนักงานเริ่มต้น 2 แห่ง",
      "task": {
        "kind": "build",
        "key": "office_starter",
        "count": 2
      },
      "success": {
        "report": "ส่งมอบสำนักงานเริ่มต้นตามข้อตกลงแล้ว",
        "scores": {
          "government": 10,
          "admin": 5
        }
      },
      "failure": {
        "report": "ส่งมอบสำนักงานเริ่มต้นไม่ครบตามเวลาที่กำหนด",
        "scores": {
          "government": -10,
          "admin": -5
        }
      }
    },
    {
      "title": "ขอชะลอโครงการโดยส่งแผนพัฒนาแทน",
      "success": {
        "report": "รัฐบาลรับทราบข้อจำกัดและเลื่อนโครงการ",
        "scores": {
          "government": -3,
          "admin": 3
        }
      }
    }
  ],
  "government-grant-park": [
    {
      "title": "ใช้งบเมืองเอง สร้างสวนเริ่มต้น 3 แห่ง",
      "task": {
        "kind": "build",
        "key": "park_starter",
        "count": 3
      },
      "success": {
        "report": "ส่งมอบสวนเริ่มต้นตามข้อตกลงแล้ว",
        "scores": {
          "government": 10,
          "admin": 5
        }
      },
      "failure": {
        "report": "ส่งมอบสวนเริ่มต้นไม่ครบตามเวลาที่กำหนด",
        "scores": {
          "government": -10,
          "admin": -5
        }
      }
    },
    {
      "title": "ขอชะลอโครงการโดยส่งแผนพัฒนาแทน",
      "success": {
        "report": "รัฐบาลรับทราบข้อจำกัดและเลื่อนโครงการ",
        "scores": {
          "government": -3,
          "admin": 3
        }
      }
    }
  ],
  "government-grant-hotel": [
    {
      "title": "ใช้งบเมืองเอง สร้างโรงแรมเริ่มต้น 2 แห่ง",
      "task": {
        "kind": "build",
        "key": "hotel_starter",
        "count": 2
      },
      "success": {
        "report": "ส่งมอบโรงแรมเริ่มต้นตามข้อตกลงแล้ว",
        "scores": {
          "government": 10,
          "admin": 5
        }
      },
      "failure": {
        "report": "ส่งมอบโรงแรมเริ่มต้นไม่ครบตามเวลาที่กำหนด",
        "scores": {
          "government": -10,
          "admin": -5
        }
      }
    },
    {
      "title": "ขอชะลอโครงการโดยส่งแผนพัฒนาแทน",
      "success": {
        "report": "รัฐบาลรับทราบข้อจำกัดและเลื่อนโครงการ",
        "scores": {
          "government": -3,
          "admin": 3
        }
      }
    }
  ],
  "government-grant-factory": [
    {
      "title": "ใช้งบเมืองเอง สร้างโรงงานเริ่มต้น 2 แห่ง",
      "task": {
        "kind": "build",
        "key": "factory_starter",
        "count": 2
      },
      "success": {
        "report": "ส่งมอบโรงงานเริ่มต้นตามข้อตกลงแล้ว",
        "scores": {
          "government": 10,
          "admin": 5
        }
      },
      "failure": {
        "report": "ส่งมอบโรงงานเริ่มต้นไม่ครบตามเวลาที่กำหนด",
        "scores": {
          "government": -10,
          "admin": -5
        }
      }
    },
    {
      "title": "ขอชะลอโครงการโดยส่งแผนพัฒนาแทน",
      "success": {
        "report": "รัฐบาลรับทราบข้อจำกัดและเลื่อนโครงการ",
        "scores": {
          "government": -3,
          "admin": 3
        }
      }
    }
  ],
  "government-grant-mall": [
    {
      "title": "ใช้งบเมืองเอง สร้างห้างเริ่มต้น 2 แห่ง",
      "task": {
        "kind": "build",
        "key": "mall_starter",
        "count": 2
      },
      "success": {
        "report": "ส่งมอบห้างเริ่มต้นตามข้อตกลงแล้ว",
        "scores": {
          "government": 10,
          "admin": 5
        }
      },
      "failure": {
        "report": "ส่งมอบห้างเริ่มต้นไม่ครบตามเวลาที่กำหนด",
        "scores": {
          "government": -10,
          "admin": -5
        }
      }
    },
    {
      "title": "ขอชะลอโครงการโดยส่งแผนพัฒนาแทน",
      "success": {
        "report": "รัฐบาลรับทราบข้อจำกัดและเลื่อนโครงการ",
        "scores": {
          "government": -3,
          "admin": 3
        }
      }
    }
  ],
  "government-grant-pub": [
    {
      "title": "ใช้งบเมืองเอง สร้างผับเริ่มต้น 2 แห่ง",
      "task": {
        "kind": "build",
        "key": "pub_starter",
        "count": 2
      },
      "success": {
        "report": "ส่งมอบผับเริ่มต้นตามข้อตกลงแล้ว",
        "scores": {
          "government": 10,
          "admin": 5
        }
      },
      "failure": {
        "report": "ส่งมอบผับเริ่มต้นไม่ครบตามเวลาที่กำหนด",
        "scores": {
          "government": -10,
          "admin": -5
        }
      }
    },
    {
      "title": "ขอชะลอโครงการโดยส่งแผนพัฒนาแทน",
      "success": {
        "report": "รัฐบาลรับทราบข้อจำกัดและเลื่อนโครงการ",
        "scores": {
          "government": -3,
          "admin": 3
        }
      }
    }
  ],
  "government-grant-home-small": [
    {
      "title": "ใช้งบเมืองเอง สร้างบ้านเล็ก 1 แห่ง",
      "task": {
        "kind": "build",
        "key": "home_large",
        "count": 1
      },
      "success": {
        "report": "ส่งมอบบ้านเล็กตามข้อตกลงแล้ว",
        "scores": {
          "government": 10,
          "admin": 5
        }
      },
      "failure": {
        "report": "ส่งมอบบ้านเล็กไม่ครบตามเวลาที่กำหนด",
        "scores": {
          "government": -10,
          "admin": -5
        }
      }
    },
    {
      "title": "ขอชะลอโครงการโดยส่งแผนพัฒนาแทน",
      "success": {
        "report": "รัฐบาลรับทราบข้อจำกัดและเลื่อนโครงการ",
        "scores": {
          "government": -3,
          "admin": 3
        }
      }
    }
  ],
  "government-grant-pub-large": [
    {
      "title": "ใช้งบเมืองเอง สร้างผับใหญ่ 1 แห่ง",
      "task": {
        "kind": "build",
        "key": "pub_large",
        "count": 1
      },
      "success": {
        "report": "ส่งมอบผับใหญ่ตามข้อตกลงแล้ว",
        "scores": {
          "government": 10,
          "admin": 5
        }
      },
      "failure": {
        "report": "ส่งมอบผับใหญ่ไม่ครบตามเวลาที่กำหนด",
        "scores": {
          "government": -10,
          "admin": -5
        }
      }
    },
    {
      "title": "ขอชะลอโครงการโดยส่งแผนพัฒนาแทน",
      "success": {
        "report": "รัฐบาลรับทราบข้อจำกัดและเลื่อนโครงการ",
        "scores": {
          "government": -3,
          "admin": 3
        }
      }
    }
  ],
  "government-grant-mall-large": [
    {
      "title": "ใช้งบเมืองเอง สร้างห้างใหญ่ 1 แห่ง",
      "task": {
        "kind": "build",
        "key": "mall_large",
        "count": 1
      },
      "success": {
        "report": "ส่งมอบห้างใหญ่ตามข้อตกลงแล้ว",
        "scores": {
          "government": 10,
          "admin": 5
        }
      },
      "failure": {
        "report": "ส่งมอบห้างใหญ่ไม่ครบตามเวลาที่กำหนด",
        "scores": {
          "government": -10,
          "admin": -5
        }
      }
    },
    {
      "title": "ขอชะลอโครงการโดยส่งแผนพัฒนาแทน",
      "success": {
        "report": "รัฐบาลรับทราบข้อจำกัดและเลื่อนโครงการ",
        "scores": {
          "government": -3,
          "admin": 3
        }
      }
    }
  ],
  "government-visit": [
    {
      "title": "ใช้ความโปร่งใสของเมืองนำเสนอข้อมูลโดยตรง",
      "success": {
        "report": "รัฐบาลชื่นชมเอกสารที่ตรวจสอบได้",
        "scores": {
          "government": 10
        }
      },
      "requires": {
        "integrity": 71
      }
    },
    {
      "title": "เสนอผลงานเกินจริงเพื่อสร้างความประทับใจ",
      "chance": 0.3,
      "success": {
        "report": "คณะดูงานตอบรับดี",
        "scores": {
          "government": 5
        }
      },
      "failure": {
        "report": "เจ้าหน้าที่ตรวจพบข้อมูลไม่ตรง",
        "scores": {
          "government": -15,
          "integrity": -10
        }
      }
    }
  ],
  "government-fund-return": [
    {
      "title": "ประสานผู้บริจาคในเมืองแทนเงินเทศบาล",
      "success": {
        "report": "ภาคธุรกิจช่วยประสานเงินสนับสนุน",
        "scores": {
          "government": 10
        }
      },
      "requires": {
        "business": 71
      }
    },
    {
      "title": "เสนอช่วยด้านข้อมูลโดยไม่สมทบเงิน",
      "success": {
        "report": "รัฐบาลรับทราบข้อเสนอ",
        "scores": {
          "government": 3
        }
      }
    }
  ],
  "people-housing": [
    {
      "title": "ขอชุมชนช่วยประสานผู้สมัคร",
      "success": {
        "report": "ชุมชนให้ข้อมูลบ้านที่ว่างจริง",
        "scores": {
          "people": 10
        }
      },
      "requires": {
        "image": 71
      }
    },
    {
      "title": "รับเรื่องและแจ้งข้อจำกัดพื้นที่อย่างเปิดเผย",
      "success": {
        "report": "ประชาชนเข้าใจข้อจำกัด",
        "scores": {
          "people": 5,
          "integrity": 5
        }
      }
    }
  ],
  "people-food": [
    {
      "title": "ประสานสมาคมร้านอาหารร่วมรับฟัง",
      "success": {
        "report": "สมาคมตกลงประสานปัญหา",
        "scores": {
          "people": 10
        }
      },
      "requires": {
        "business": 71
      }
    },
    {
      "title": "ลดรายได้ร้านอาหาร 150 บาทวันนี้",
      "success": {
        "report": "ชุมชนได้รับมาตรการชั่วคราว",
        "scores": {
          "people": 5,
          "business": 3
        },
        "effects": [
          {
            "scope": "restaurant",
            "kind": "tripDelta",
            "value": -150
          }
        ]
      }
    }
  ],
  "people-shopping": [
    {
      "title": "เชิญสมาคมร้านค้าหารือกับชุมชน",
      "success": {
        "report": "สมาคมยอมรับข้อเสนอชุมชน",
        "scores": {
          "people": 10
        }
      },
      "requires": {
        "business": 71
      }
    },
    {
      "title": "ลดรายได้จากร้านค้า 150 บาทวันนี้",
      "success": {
        "report": "เมืองสนับสนุนร้านค้าชั่วคราว",
        "scores": {
          "people": 5
        },
        "effects": [
          {
            "scope": "shop",
            "kind": "tripDelta",
            "value": -150
          }
        ]
      }
    }
  ],
  "people-green": [
    {
      "title": "ขออาสาสมัครร่วมดูแลพื้นที่เดิม",
      "success": {
        "report": "ชุมชนร่วมจัดพื้นที่กิจกรรม",
        "scores": {
          "people": 10
        }
      },
      "requires": {
        "image": 71
      }
    },
    {
      "title": "ลดรายได้จากสวน 100 บาทวันนี้",
      "success": {
        "report": "ประชาชนพอใจกับมาตรการ",
        "scores": {
          "people": 5
        },
        "effects": [
          {
            "scope": "park",
            "kind": "tripDelta",
            "value": -100
          }
        ]
      }
    }
  ],
  "people-jobs": [
    {
      "title": "ขอภาคธุรกิจช่วยรับฟังความต้องการงาน",
      "success": {
        "report": "ภาคธุรกิจร่วมประสาน",
        "scores": {
          "people": 10
        }
      },
      "requires": {
        "business": 71
      }
    },
    {
      "title": "ลดรายได้ภารกิจไปสำนักงาน 100 บาทวันนี้",
      "success": {
        "report": "คนทำงานได้รับมาตรการชั่วคราว",
        "scores": {
          "people": 5,
          "business": 5
        },
        "effects": [
          {
            "scope": "office",
            "kind": "tripDelta",
            "value": -100
          }
        ]
      }
    }
  ],
  "people-night-noise": [
    {
      "title": "ไกล่เกลี่ยกับสมาคมผับโดยตรง",
      "success": {
        "report": "ผู้ประกอบการยอมร่วมแก้คำร้องเรียน",
        "scores": {
          "people": 10
        }
      },
      "requires": {
        "business": 71
      }
    },
    {
      "title": "ขู่กลุ่มผู้ร้องเรียนให้หยุดประท้วง",
      "chance": 0.3,
      "success": {
        "report": "กลุ่มผู้ร้องเรียนยุติการประท้วง",
        "scores": {
          "people": 5
        }
      },
      "failure": {
        "report": "คำขู่ถูกเผยแพร่ต่อสาธารณะ",
        "scores": {
          "people": -15,
          "image": -10
        }
      }
    }
  ],
  "people-casino": [
    {
      "title": "ให้ส่วนกลางร่วมตรวจข้อร้องเรียน",
      "success": {
        "report": "รัฐบาลส่งผู้ประสานงานให้",
        "scores": {
          "people": 10
        }
      },
      "requires": {
        "government": 71
      }
    },
    {
      "title": "กล่าวว่าผู้ประท้วงบิดเบือนข้อมูล",
      "chance": 0.3,
      "success": {
        "report": "การประท้วงยุติลง",
        "scores": {
          "people": 5
        }
      },
      "failure": {
        "report": "ชุมชนรวมตัวต่อต้านหนักขึ้น",
        "scores": {
          "people": -15,
          "image": -10
        }
      }
    }
  ],
  "people-fairness": [
    {
      "title": "เปิดรายการใช้งบให้ชุมชนตรวจสอบ",
      "success": {
        "report": "ชุมชนพอใจความโปร่งใส",
        "scores": {
          "people": 10
        }
      },
      "requires": {
        "integrity": 71
      }
    },
    {
      "title": "จ้างผู้ประสานอิสระรับฟังทุกกลุ่ม",
      "success": {
        "report": "ข้อร้องเรียนได้รับการรับฟัง",
        "scores": {
          "people": 5,
          "integrity": 5
        }
      },
      "cost": 25000
    }
  ],
  "people-commute": [
    {
      "title": "ให้ผู้แทนแรงงานและธุรกิจร่วมเจรจา",
      "success": {
        "report": "ทั้งสองฝ่ายยอมรับการประสานงาน",
        "scores": {
          "people": 10
        }
      },
      "requires": {
        "business": 71
      }
    },
    {
      "title": "ลดรายได้ภารกิจทั้งหมด 100 บาทวันนี้",
      "success": {
        "report": "เมืองยอมลดการจัดเก็บชั่วคราว",
        "scores": {
          "people": 5
        },
        "effects": [
          {
            "scope": "all",
            "kind": "tripDelta",
            "value": -100
          }
        ]
      }
    }
  ],
  "people-family": [
    {
      "title": "ขอผู้ประกอบการช่วยสนับสนุนกิจกรรมเด็ก",
      "success": {
        "report": "ผู้ประกอบการร่วมช่วยโดยไม่ใช้งบเมือง",
        "scores": {
          "people": 10
        }
      },
      "requires": {
        "business": 71
      }
    },
    {
      "title": "รับปากจัดเงินช่วยเหลือโดยไม่อนุมัติงบ",
      "chance": 0.3,
      "success": {
        "report": "ครอบครัวยอมรับการชี้แจง",
        "scores": {
          "people": 3
        }
      },
      "failure": {
        "report": "ครอบครัวไม่พอใจที่ไม่ได้รับความช่วยเหลือ",
        "scores": {
          "people": -15,
          "image": -5
        }
      }
    }
  ],
  "people-petition": [
    {
      "title": "ขอตัวแทนชุมชนช่วยดูแลผู้สมัคร",
      "success": {
        "report": "ตัวแทนร่วมประสานโดยไม่ใช้งบ",
        "scores": {
          "people": 10
        }
      },
      "requires": {
        "image": 71
      }
    },
    {
      "title": "เปิดจุดรับคำปรึกษาที่อยู่อาศัย",
      "success": {
        "report": "ผู้สมัครได้รับคำแนะนำ",
        "scores": {
          "people": 5
        }
      },
      "cost": 20000
    }
  ],
  "people-recreation": [
    {
      "title": "ให้ชุมชนเป็นผู้จัดกิจกรรมเอง",
      "success": {
        "report": "ชุมชนช่วยจัดงานโดยไม่ใช้งบ",
        "scores": {
          "people": 10
        }
      },
      "requires": {
        "image": 71
      }
    },
    {
      "title": "รับผู้สนับสนุนที่ขอพื้นที่โฆษณาเพิ่ม",
      "success": {
        "report": "คลังได้เงินแต่ผู้ร่วมงานบางส่วนไม่พอใจ",
        "scores": {
          "people": -5,
          "business": 5
        },
        "money": 50000
      }
    }
  ],
  "people-complaint": [
    {
      "title": "เปิดข้อมูลคำร้องให้ตัวแทนชุมชนตรวจสอบ",
      "success": {
        "report": "ชุมชนเห็นความคืบหน้า",
        "scores": {
          "people": 10
        }
      },
      "requires": {
        "integrity": 71
      }
    },
    {
      "title": "เพิ่มช่องทางรับฟังผ่านผู้ประสานอิสระ",
      "success": {
        "report": "ประชาชนได้รับช่องทางสื่อสารเพิ่มเติม",
        "scores": {
          "people": 5
        }
      },
      "cost": 30000
    }
  ],
  "business-food-cost": [
    {
      "title": "ขอภาครัฐช่วยประสานข้อเรียกร้อง",
      "success": {
        "report": "รัฐบาลช่วยเจรจากับสมาคม",
        "scores": {
          "business": 10
        }
      },
      "requires": {
        "government": 71
      }
    },
    {
      "title": "ขู่ว่าจะไม่รับข้อเรียกร้องอีก",
      "chance": 0.3,
      "success": {
        "report": "สมาคมถอนคำร้อง",
        "scores": {
          "business": 5
        }
      },
      "failure": {
        "report": "สมาคมวิจารณ์นโยบายของเมือง",
        "scores": {
          "business": -15,
          "image": -5
        }
      }
    }
  ],
  "business-mall-sponsor": [
    {
      "title": "ขอส่วนกลางช่วยประชาสัมพันธ์งาน",
      "success": {
        "report": "รัฐบาลช่วยโปรโมตงาน",
        "scores": {
          "business": 10
        }
      },
      "requires": {
        "government": 71
      }
    },
    {
      "title": "ให้ห้างซื้อสิทธิ์ประชาสัมพันธ์ในวันนี้",
      "success": {
        "report": "เมืองได้รับเงินสนับสนุน",
        "scores": {
          "business": 5,
          "image": -5
        },
        "money": 80000
      }
    }
  ],
  "business-night-event": [
    {
      "title": "ให้ชุมชนร่วมกำหนดเงื่อนไขงาน",
      "success": {
        "report": "ชุมชนยอมรับการประสานงาน",
        "scores": {
          "business": 10
        }
      },
      "requires": {
        "people": 71
      }
    },
    {
      "title": "เรียกเงินสนับสนุนเพิ่มจากผู้จัด",
      "chance": 0.3,
      "success": {
        "report": "ผู้จัดตกลงโอนเพิ่ม",
        "scores": {
          "business": 5
        },
        "money": 60000
      },
      "failure": {
        "report": "ผู้จัดถอนข้อเสนอและวิจารณ์เมือง",
        "scores": {
          "business": -15,
          "image": -5
        }
      }
    }
  ],
  "business-casino-deal": [
    {
      "title": "ขอรัฐบาลร่วมตรวจเงื่อนไขก่อนรับข้อเสนอ",
      "success": {
        "report": "ข้อตกลงได้รับการพิจารณาอย่างเปิดเผย",
        "scores": {
          "business": 10
        }
      },
      "requires": {
        "government": 71
      }
    },
    {
      "title": "ขอเงินเพิ่มแลกกับการประชาสัมพันธ์เฉพาะกลุ่ม",
      "chance": 0.3,
      "success": {
        "report": "กลุ่มทุนตกลงเพิ่มเงิน",
        "scores": {
          "business": 5
        },
        "money": 150000
      },
      "failure": {
        "report": "ข้อเสนอถูกเปิดเผยและถูกวิจารณ์",
        "scores": {
          "business": -15,
          "integrity": -10
        }
      }
    }
  ],
  "business-invest-office": [
    {
      "title": "ขอส่วนกลางช่วยประสานนักลงทุน",
      "success": {
        "report": "นักลงทุนพอใจการเจรจา",
        "scores": {
          "business": 10
        }
      },
      "requires": {
        "government": 71
      }
    },
    {
      "title": "แจ้งข้อจำกัดการก่อสร้างตรงไปตรงมา",
      "success": {
        "report": "นักลงทุนรับทราบเงื่อนไขเมือง",
        "scores": {
          "business": 5,
          "integrity": 5
        }
      }
    }
  ],
  "business-monopoly": [
    {
      "title": "ให้รัฐบาลร่วมตรวจข้อเสนอ",
      "success": {
        "report": "มีการหารือเงื่อนไขโดยเปิดเผย",
        "scores": {
          "business": 10
        }
      },
      "requires": {
        "government": 71
      }
    },
    {
      "title": "เรียกเงินเพิ่มแลกสิทธิ์ประชาสัมพันธ์",
      "chance": 0.3,
      "success": {
        "report": "ผู้ค้ารายใหญ่ตกลงจ่ายเพิ่ม",
        "scores": {
          "business": 5
        },
        "money": 100000
      },
      "failure": {
        "report": "ผู้ค้ารายย่อยเปิดเผยการต่อรอง",
        "scores": {
          "business": -15,
          "integrity": -10
        }
      }
    }
  ],
  "integrity-gift-supplier": [
    {
      "title": "ขอหน่วยงานรัฐรับรองกระบวนการปฏิเสธ",
      "success": {
        "report": "เจ้าหน้าที่ส่วนกลางร่วมตรวจสอบ",
        "scores": {
          "integrity": 10
        }
      },
      "requires": {
        "government": 71
      }
    },
    {
      "title": "ขอเปลี่ยนเป็นเงินสนับสนุนโดยไม่ลงรายชื่อ",
      "chance": 0.3,
      "success": {
        "report": "ผู้ให้โอนเงิน",
        "scores": {
          "integrity": -5
        },
        "money": 80000
      },
      "failure": {
        "report": "รายละเอียดผู้ให้ถูกเปิดเผย",
        "scores": {
          "integrity": -20,
          "image": -10
        }
      }
    }
  ],
  "integrity-contract": [
    {
      "title": "ให้คณะกรรมการประชาชนร่วมอ่านสัญญา",
      "success": {
        "report": "ตัวแทนชุมชนร่วมตรวจเอกสาร",
        "scores": {
          "integrity": 10
        }
      },
      "requires": {
        "people": 71
      }
    },
    {
      "title": "ระงับสัญญาจนกว่าจะชี้แจงได้",
      "success": {
        "report": "เมืองยังไม่รับข้อผูกพัน",
        "scores": {
          "integrity": 5,
          "admin": -5
        }
      }
    }
  ],
  "integrity-relative": [
    {
      "title": "ขอรัฐบาลส่งผู้ประเมินอิสระ",
      "success": {
        "report": "ส่วนกลางช่วยพิจารณาคำขอ",
        "scores": {
          "integrity": 10
        }
      },
      "requires": {
        "government": 71
      }
    },
    {
      "title": "ให้ญาติได้รับสิทธิ์โดยไม่เปิดเผย",
      "chance": 0.3,
      "success": {
        "report": "ข้อตกลงผ่านไปโดยไม่มีข่าว",
        "scores": {
          "integrity": -5
        },
        "money": 70000
      },
      "failure": {
        "report": "หลักฐานความสัมพันธ์ถูกเปิดเผย",
        "scores": {
          "integrity": -20,
          "image": -10
        }
      }
    }
  ],
  "integrity-documents": [
    {
      "title": "ขอส่วนกลางส่งสำเนาเอกสารที่เกี่ยวข้อง",
      "success": {
        "report": "ได้รับเอกสารยืนยันจากส่วนกลาง",
        "scores": {
          "integrity": 10
        }
      },
      "requires": {
        "government": 71
      }
    },
    {
      "title": "พักการอนุมัติรายการที่เอกสารไม่ครบ",
      "success": {
        "report": "เมืองไม่อนุมัติรายการที่ตรวจสอบไม่ได้",
        "scores": {
          "integrity": 5,
          "admin": -5
        }
      }
    }
  ],
  "integrity-public-ledger": [
    {
      "title": "เชิญตัวแทนชุมชนตรวจบัญชี",
      "success": {
        "report": "ชุมชนได้ตรวจข้อมูลโดยไม่ใช้งบ",
        "scores": {
          "integrity": 10
        }
      },
      "requires": {
        "people": 71
      }
    },
    {
      "title": "เผยแพร่เฉพาะรายการที่ตรวจง่าย",
      "chance": 0.3,
      "success": {
        "report": "การเผยแพร่ไม่มีข้อทักท้วง",
        "scores": {
          "integrity": 3
        }
      },
      "failure": {
        "report": "สื่อพบรายการที่ไม่เปิดเผย",
        "scores": {
          "integrity": -15,
          "image": -10
        }
      }
    }
  ],
  "integrity-donation": [
    {
      "title": "ขอรัฐบาลตรวจแหล่งที่มาให้",
      "success": {
        "report": "เจ้าหน้าที่ตรวจสอบและรับรองผู้ให้",
        "scores": {
          "integrity": 10
        }
      },
      "requires": {
        "government": 71
      }
    },
    {
      "title": "ขอเงินเพิ่มโดยยอมไม่เปิดเผยชื่อ",
      "chance": 0.3,
      "success": {
        "report": "ผู้บริจาคโอนเพิ่ม",
        "scores": {
          "integrity": -5
        },
        "money": 120000
      },
      "failure": {
        "report": "มีการเปิดเผยการต่อรอง",
        "scores": {
          "integrity": -20,
          "image": -5
        }
      }
    }
  ],
  "integrity-secret-deal": [
    {
      "title": "ส่งข้อเสนอให้คณะตรวจสอบ",
      "success": {
        "report": "เจ้าหน้าที่รับเรื่องตรวจสอบ",
        "scores": {
          "integrity": 15,
          "government": 5,
          "business": -5
        }
      },
      "cost": 50000
    },
    {
      "title": "ขอเงื่อนไขเพิ่มเติมโดยไม่เปิดเผย",
      "chance": 0.3,
      "success": {
        "report": "ตัวแทนยอมเพิ่มเงิน",
        "scores": {
          "integrity": -10
        },
        "money": 180000
      },
      "failure": {
        "report": "ตัวแทนเปิดเผยการต่อรอง",
        "scores": {
          "integrity": -20,
          "image": -10
        }
      }
    }
  ],
  "integrity-clerk": [
    {
      "title": "ขอส่วนกลางส่งผู้สอบสวน",
      "success": {
        "report": "รัฐบาลส่งเจ้าหน้าที่มาตรวจสอบ",
        "scores": {
          "integrity": 10
        }
      },
      "requires": {
        "government": 71
      }
    },
    {
      "title": "ให้เจ้าหน้าที่ชี้แจงภายในโดยไม่เปิดผล",
      "chance": 0.3,
      "success": {
        "report": "เรื่องยุติโดยไม่มีข่าว",
        "scores": {
          "integrity": 3
        }
      },
      "failure": {
        "report": "ข้อมูลการสอบสวนรั่วไหล",
        "scores": {
          "integrity": -15,
          "image": -5
        }
      }
    }
  ],
  "integrity-tender": [
    {
      "title": "ให้ตัวแทนประชาชนร่วมสังเกตการณ์",
      "success": {
        "report": "ขั้นตอนพิจารณาเปิดเผยมากขึ้น",
        "scores": {
          "integrity": 10
        }
      },
      "requires": {
        "people": 71
      }
    },
    {
      "title": "ขอเงินเพิ่มจากผู้เสนอสิทธิ์พิเศษ",
      "chance": 0.3,
      "success": {
        "report": "บริษัทเพิ่มข้อเสนอ",
        "scores": {
          "integrity": -10
        },
        "money": 120000
      },
      "failure": {
        "report": "คู่แข่งเปิดเผยการต่อรอง",
        "scores": {
          "integrity": -20,
          "image": -10
        }
      }
    }
  ],
  "integrity-audit-government": [
    {
      "title": "เปิดเอกสารต่อสาธารณะพร้อมการตรวจ",
      "success": {
        "report": "ส่วนกลางและประชาชนเห็นข้อมูลตรงกัน",
        "scores": {
          "integrity": 10
        }
      },
      "requires": {
        "people": 71
      }
    },
    {
      "title": "พักรายการที่ยังตรวจสอบไม่เสร็จ",
      "success": {
        "report": "รายการค้างถูกพักเพื่อรอข้อมูล",
        "scores": {
          "integrity": 5,
          "admin": -5
        }
      }
    }
  ],
  "integrity-press-ethics": [
    {
      "title": "ขอรัฐบาลร่วมตอบคำถามต่อสื่อ",
      "success": {
        "report": "รัฐบาลยืนยันขั้นตอนตรวจสอบ",
        "scores": {
          "integrity": 10
        }
      },
      "requires": {
        "government": 71
      }
    },
    {
      "title": "จ้างผู้ตรวจสอบอิสระเผยแพร่ผล",
      "success": {
        "report": "สื่อได้รับผลการตรวจสอบ",
        "scores": {
          "integrity": 15,
          "image": 5
        }
      },
      "cost": 60000
    }
  ],
  "integrity-compensation": [
    {
      "title": "ให้ตัวแทนชุมชนร่วมพิจารณาข้อพิพาท",
      "success": {
        "report": "ตัวแทนร่วมตรวจเงื่อนไข",
        "scores": {
          "integrity": 10
        }
      },
      "requires": {
        "people": 71
      }
    },
    {
      "title": "เรียกเงินเพิ่มแลกการยุติเรื่อง",
      "chance": 0.3,
      "success": {
        "report": "กลุ่มธุรกิจยอมเพิ่มเงิน",
        "scores": {
          "integrity": -10
        },
        "money": 100000
      },
      "failure": {
        "report": "รายละเอียดการต่อรองถูกเปิดเผย",
        "scores": {
          "integrity": -20,
          "image": -10
        }
      }
    }
  ],
  "integrity-ethics": [
    {
      "title": "ขอรัฐบาลร่วมรับรองหลักเกณฑ์",
      "success": {
        "report": "รัฐบาลช่วยรับรองแนวทาง",
        "scores": {
          "integrity": 10
        }
      },
      "requires": {
        "government": 71
      }
    },
    {
      "title": "ประกาศหลักเกณฑ์ที่ไม่ผ่านการตรวจ",
      "chance": 0.3,
      "success": {
        "report": "ไม่มีผู้ทักท้วง",
        "scores": {
          "integrity": 3
        }
      },
      "failure": {
        "report": "เจ้าหน้าที่พบข้อกำหนดที่ไม่เป็นธรรม",
        "scores": {
          "integrity": -15,
          "government": -5
        }
      }
    }
  ],
  "government-liaison-daily": [
    {
      "title": "เปิดแผนพัฒนาให้ชุมชนร่วมตรวจสอบก่อนส่ง",
      "success": {
        "report": "ส่วนกลางชื่นชมข้อมูลที่เปิดเผย",
        "scores": {
          "government": 10
        }
      },
      "requires": {
        "integrity": 71
      }
    }
  ],
  "business-new-market-daily": [
    {
      "title": "ให้ชุมชนร่วมเจรจาเงื่อนไขการลงทุน",
      "success": {
        "report": "ผู้สนใจลงทุนชื่นชมการมีส่วนร่วม",
        "scores": {
          "business": 10
        }
      },
      "requires": {
        "people": 71
      }
    }
  ]
};
for(const event of MAYOR_EVENTS)event.choices.push(...(MAYOR_EXTRA_CHOICES[event.id]||[]));
// Free guaranteed large score rewards now have political opportunity costs, without changing saved choice indices.
const MAYOR_POLITICAL_TRADEOFF={admin:['people','ความรวดเร็วทำให้ชุมชนบางส่วนรู้สึกว่าไม่ได้รับฟัง'],image:['admin','ฝ่ายบริหารต้องโยกเวลาจากงานประจำ'],fame:['people','ชุมชนบางส่วนกังวลว่าทรัพยากรถูกใช้เพื่อชื่อเสียง'],government:['admin','ฝ่ายบริหารต้องปรับแผนเพื่อประสานส่วนกลาง'],people:['business','ผู้ประกอบการบางส่วนมองว่าภาระเพิ่มขึ้น'],business:['people','ประชาชนบางส่วนรู้สึกว่าธุรกิจได้รับความสำคัญมากกว่า'],integrity:['admin','การตรวจสอบเพิ่มภาระให้ฝ่ายบริหาร']};
for(const event of MAYOR_EVENTS)for(const option of event.choices){const r=option.success,values=Object.values(r?.scores||{});if(!r||option.cost||option.task||option.chance!==undefined||option.grant||!values.some(v=>v>=10)||values.some(v=>v<0))continue;const [key,report]=MAYOR_POLITICAL_TRADEOFF[event.category];if(Object.hasOwn(r.scores,key))continue;r.scores[key]=-5;r.report=(r.report||'')+' แต่'+report;}
MAYOR_EVENTS.push(...[
  {
    "id": "night-fire",
    "category": "admin",
    "title": "ด่วน! เพลิงไหม้ที่ {target}",
    "story": "ศูนย์ประสานงานโทรแจ้งว่าพบควันไฟในอาคาร เจ้าหน้าที่ขอคำสั่งทันที งบฉุกเฉินมีจำกัดและยังไม่ทราบว่าควบคุมเหตุได้หรือไม่",
    "choices": [
      {
        "title": "อนุมัติงบฉุกเฉินและส่งทีมช่วยเหลือ",
        "success": {
          "report": "ทีมประสานงานควบคุมเหตุได้ แต่ต้องโยกงบส่วนอื่น",
          "scores": {
            "admin": 10,
            "people": 5,
            "business": -5
          }
        },
        "cost": 120000
      },
      {
        "title": "ขอทีมเสริมจากจังหวัด",
        "success": {
          "report": "ทีมเสริมมาถึงทัน",
          "scores": {
            "government": 10,
            "admin": 5
          }
        },
        "chance": 0.65,
        "failure": {
          "report": "ทีมเสริมมาช้า บริการหยุดชะงัก",
          "scores": {
            "admin": -10,
            "people": -8
          },
          "money": -25000,
          "effects": [
            {
              "kind": "tripDelta",
              "scope": "all",
              "value": -100
            }
          ]
        }
      },
      {
        "title": "ให้ผู้ประกอบการร่วมรับผิดชอบค่าใช้จ่าย",
        "success": {
          "report": "เจ้าหน้าที่จัดการเหตุได้ แต่ผู้ประกอบการไม่พอใจ",
          "scores": {
            "admin": 5,
            "business": -12,
            "people": 5
          }
        }
      },
      {
        "title": "ให้เจ้าหน้าที่จัดการตามงบเดิม",
        "success": {
          "report": "ทีมเดิมจัดการได้",
          "scores": {
            "admin": 5
          }
        },
        "chance": 0.4,
        "failure": {
          "report": "ทรัพยากรไม่พอ เมืองเสียค่าประสานงาน",
          "scores": {
            "admin": -15,
            "people": -10
          },
          "money": -35000,
          "effects": [
            {
              "kind": "tripDelta",
              "scope": "all",
              "value": -150
            }
          ]
        }
      },
      {
        "title": "ลงพื้นที่ประสานการช่วยเหลือด้วยตนเอง",
        "success": {
          "report": "ชุมชนชื่นชม แต่ภารกิจฝ่ายบริหารอื่นล่าช้า",
          "scores": {
            "image": 8,
            "people": 8,
            "admin": -5
          }
        },
        "cost": 30000
      }
    ],
    "ignored": {
      "report": "ไม่มีคำสั่งทันเวลา ต้องเบิกงบสำรอง",
      "scores": {
        "admin": -15,
        "people": -10
      },
      "money": -30000,
      "effects": [
        {
          "kind": "tripDelta",
          "scope": "all",
          "value": -100
        }
      ]
    },
    "target": [
      "home",
      "shop",
      "restaurant",
      "office",
      "factory",
      "hotel",
      "mall",
      "pub",
      "casino"
    ],
    "minLevel": 1,
    "emergencyOnly": true
  },
  {
    "id": "night-power",
    "category": "admin",
    "title": "ไฟฟ้าขัดข้องที่ {target}",
    "story": "ผู้ดูแลอาคารแจ้งเหตุไฟดับ ผู้รับเหมารายเดิมเสนอเข้าช่วยทันทีหากไม่ต้องรอขั้นตอนเปรียบเทียบราคา",
    "choices": [
      {
        "title": "เรียกทีมช่างตามขั้นตอนปกติ",
        "success": {
          "report": "ประสานงานสำเร็จ แต่เจ้าของกิจการต้องรอ",
          "scores": {
            "admin": 8,
            "integrity": 5,
            "business": -5
          }
        },
        "cost": 65000
      },
      {
        "title": "อนุมัติผู้รับเหมารายเดิมทันที",
        "success": {
          "report": "แก้เหตุได้รวดเร็ว แต่เอกสารถูกทักท้วง",
          "scores": {
            "admin": 10,
            "integrity": -15,
            "business": 5
          }
        },
        "cost": 35000
      },
      {
        "title": "ขอแรงสนับสนุนจากจังหวัด",
        "success": {
          "report": "จังหวัดส่งทีมช่วยทัน",
          "scores": {
            "government": 10,
            "admin": 5
          }
        },
        "chance": 0.6,
        "failure": {
          "report": "ทีมไม่พร้อมตามเวลา",
          "scores": {
            "admin": -12,
            "people": -8
          },
          "effects": [
            {
              "kind": "tripDelta",
              "scope": "all",
              "value": -100
            }
          ]
        }
      },
      {
        "title": "ให้ผู้ประกอบการรับผิดชอบเอง",
        "success": {
          "report": "ผู้ประกอบการดำเนินการ แต่ไม่พอใจเมือง",
          "scores": {
            "business": -12,
            "admin": 3
          }
        }
      },
      {
        "title": "รอประเมินสาเหตุก่อนอนุมัติงบ",
        "success": {
          "report": "ปัญหาแก้ไขได้โดยทีมเดิม",
          "scores": {
            "admin": 5
          }
        },
        "chance": 0.35,
        "failure": {
          "report": "การรอเพิ่มข้อร้องเรียน",
          "scores": {
            "admin": -10,
            "people": -10
          },
          "effects": [
            {
              "kind": "tripDelta",
              "scope": "all",
              "value": -100
            }
          ]
        }
      }
    ],
    "ignored": {
      "report": "ข้อร้องเรียนเพิ่มขึ้นเพราะไม่ได้รับคำตอบ",
      "scores": {
        "admin": -10,
        "business": -10
      },
      "effects": [
        {
          "kind": "tripDelta",
          "scope": "all",
          "value": -100
        }
      ]
    },
    "target": [
      "shop",
      "restaurant",
      "office",
      "factory",
      "hotel",
      "mall",
      "pub",
      "casino"
    ],
    "minLevel": 1,
    "emergencyOnly": true
  },
  {
    "id": "night-road",
    "category": "admin",
    "title": "ด่วน! รายงานอุบัติเหตุบนถนนหลัก",
    "story": "เจ้าหน้าที่ได้รับรายงานรถเสียและการเดินทางติดขัด ทีมประสานงานขอคำสั่งจัดการเหตุคืนนี้",
    "choices": [
      {
        "title": "อนุมัติทีมช่วยเหลือฉุกเฉิน",
        "success": {
          "report": "ทีมประสานงานรับมือเหตุได้รวดเร็ว",
          "scores": {
            "admin": 10,
            "people": 5
          }
        },
        "cost": 80000
      },
      {
        "title": "ขอให้จังหวัดส่งเจ้าหน้าที่",
        "success": {
          "report": "จังหวัดช่วยประสานเหตุ",
          "scores": {
            "government": 8,
            "admin": 5
          }
        },
        "chance": 0.65,
        "failure": {
          "report": "ทีมจังหวัดติดภารกิจอื่น",
          "scores": {
            "admin": -10,
            "people": -8
          },
          "effects": [
            {
              "kind": "tripDelta",
              "scope": "all",
              "value": -100
            }
          ]
        }
      },
      {
        "title": "ขอผู้ประกอบการช่วยค่าใช้จ่าย",
        "success": {
          "report": "ได้ความร่วมมือแต่ธุรกิจไม่พอใจ",
          "scores": {
            "admin": 7,
            "business": -10
          }
        }
      },
      {
        "title": "ประกาศชี้แจงและใช้ทีมที่มีอยู่",
        "success": {
          "report": "ประชาชนพอใจการสื่อสาร แต่ฝ่ายบริหารงานล่าช้า",
          "scores": {
            "people": 5,
            "image": 5,
            "admin": -5
          }
        }
      },
      {
        "title": "รอให้การเดินทางเบาบางเอง",
        "success": {
          "report": "ข้อร้องเรียนลดลงเอง",
          "scores": {
            "admin": 3
          }
        },
        "chance": 0.35,
        "failure": {
          "report": "ปัญหายืดเยื้อและเสียงวิจารณ์เพิ่ม",
          "scores": {
            "admin": -15,
            "image": -8
          },
          "effects": [
            {
              "kind": "tripDelta",
              "scope": "all",
              "value": -150
            }
          ]
        }
      }
    ],
    "ignored": {
      "report": "เมืองถูกตำหนิว่าขาดการประสานงาน",
      "scores": {
        "admin": -12,
        "people": -8
      },
      "effects": [
        {
          "kind": "tripDelta",
          "scope": "all",
          "value": -100
        }
      ]
    },
    "minLevel": 1,
    "emergencyOnly": true
  },
  {
    "id": "night-aid",
    "category": "people",
    "title": "สายด่วนจากชุมชน",
    "story": "ตัวแทนชุมชนขอเงินช่วยเหลือกรณีฉุกเฉินคืนนี้ เอกสารบางส่วนไม่ครบ อีกกลุ่มขอให้ตรวจสอบเพื่อความเป็นธรรม",
    "choices": [
      {
        "title": "อนุมัติผ่านคณะทำงานฉุกเฉิน",
        "success": {
          "report": "ชุมชนได้รับการดูแล แต่ต้องเลื่อนงบงานอื่น",
          "scores": {
            "people": 10,
            "admin": -5,
            "integrity": 5
          }
        },
        "cost": 75000
      },
      {
        "title": "ขอจังหวัดตรวจเอกสารและสมทบ",
        "success": {
          "report": "จังหวัดช่วยประสานได้ทัน",
          "scores": {
            "government": 8,
            "people": 5
          }
        },
        "chance": 0.6,
        "failure": {
          "report": "เอกสารไม่ทันเวลา ชุมชนผิดหวัง",
          "scores": {
            "people": -12,
            "image": -5
          }
        }
      },
      {
        "title": "โอนตามรายชื่อที่ตัวแทนส่งมา",
        "success": {
          "report": "เงินถึงผู้ขอ แต่พบรายชื่อที่ตรวจสอบไม่ได้",
          "scores": {
            "people": 10,
            "integrity": -15
          }
        },
        "cost": 50000
      },
      {
        "title": "ให้ภาคธุรกิจช่วยหาเงินแทนเมือง",
        "success": {
          "report": "ชุมชนได้รับความช่วยเหลือ แต่ธุรกิจไม่พอใจ",
          "scores": {
            "people": 8,
            "business": -8
          }
        }
      },
      {
        "title": "รอเอกสารครบก่อนดำเนินการ",
        "success": {
          "report": "ขั้นตอนถูกต้อง แต่ครอบครัวบางส่วนผิดหวัง",
          "scores": {
            "integrity": 10,
            "people": -10,
            "image": -5
          }
        }
      }
    ],
    "ignored": {
      "report": "ชุมชนไม่ได้คำตอบและร้องเรียนต่อสื่อ",
      "scores": {
        "people": -15,
        "image": -8
      }
    },
    "minLevel": 1,
    "emergencyOnly": true
  },
  {
    "id": "night-tourist",
    "category": "fame",
    "title": "ด่วน! นักท่องเที่ยวร้องเรียนที่ {target}",
    "story": "ผู้มาเยือนร้องเรียนเรื่องบริการ ผู้ประกอบการขอให้เมืองช่วยออกค่าใช้จ่ายและไม่เปิดเผยชื่อสถานที่",
    "choices": [
      {
        "title": "ชดเชยผ่านช่องทางที่ตรวจสอบได้",
        "success": {
          "report": "ผู้มาเยือนพอใจและขั้นตอนโปร่งใส",
          "scores": {
            "fame": 10,
            "integrity": 5
          }
        },
        "cost": 65000
      },
      {
        "title": "ให้ผู้ประกอบการรับผิดชอบตามข้อตกลง",
        "success": {
          "report": "ผู้มาเยือนได้รับการดูแล แต่เจ้าของกิจการไม่พอใจ",
          "scores": {
            "fame": 5,
            "business": -12
          }
        }
      },
      {
        "title": "จ่ายเงินแลกกับการไม่เผยแพร่เรื่อง",
        "success": {
          "report": "ข่าวไม่ลุกลาม แต่ข้อตกลงไม่โปร่งใส",
          "scores": {
            "fame": 8,
            "integrity": -15
          }
        },
        "cost": 45000
      },
      {
        "title": "เปิดเผยข้อร้องเรียนและข้อเท็จจริง",
        "success": {
          "report": "การเปิดเผยได้รับคำชม แต่เมืองและธุรกิจเสียภาพลักษณ์",
          "scores": {
            "integrity": 12,
            "fame": -8,
            "business": -5
          }
        }
      },
      {
        "title": "ให้คู่กรณีตกลงกันเอง",
        "success": {
          "report": "ทั้งสองฝ่ายตกลงกันได้",
          "scores": {
            "fame": 3
          }
        },
        "chance": 0.4,
        "failure": {
          "report": "ข้อร้องเรียนแพร่กระจาย",
          "scores": {
            "fame": -15,
            "image": -5
          }
        }
      }
    ],
    "ignored": {
      "report": "ข้อร้องเรียนแพร่กระจายโดยไม่มีคำชี้แจง",
      "scores": {
        "fame": -15,
        "business": -5
      }
    },
    "target": [
      "hotel",
      "restaurant",
      "mall",
      "pub",
      "casino"
    ],
    "minLevel": 1,
    "emergencyOnly": true
  },
  {
    "id": "night-leak",
    "category": "integrity",
    "title": "ด่วน! เอกสารภายในรั่วไหล",
    "story": "นักข่าวมีเอกสารงบประมาณบางส่วนและจะเผยแพร่คืนนี้ ผู้ประสานงานเสนอช่วยเจรจาให้เงียบ",
    "choices": [
      {
        "title": "เผยแพร่เอกสารที่ตรวจสอบแล้ว",
        "success": {
          "report": "ประชาชนเห็นความโปร่งใส แต่ประเด็นงบกระทบภาพลักษณ์",
          "scores": {
            "integrity": 12,
            "image": -8
          }
        },
        "cost": 30000
      },
      {
        "title": "ขอหน่วยงานรัฐตรวจข้อเท็จจริง",
        "success": {
          "report": "รัฐส่งผู้ตรวจมา แต่ข่าวยังกระทบชื่อเสียงเมือง",
          "scores": {
            "government": 8,
            "integrity": 6,
            "fame": -5
          }
        }
      },
      {
        "title": "ให้ผู้ประสานงานเจรจาเป็นการภายใน",
        "success": {
          "report": "ข่าวเงียบลงชั่วคราว",
          "scores": {
            "image": 5,
            "integrity": -8
          }
        },
        "cost": 25000,
        "chance": 0.4,
        "failure": {
          "report": "การเจรจาถูกเปิดเผยซ้ำ",
          "scores": {
            "integrity": -25,
            "image": -15
          }
        }
      },
      {
        "title": "ปฏิเสธทันทีโดยไม่ตรวจเอกสาร",
        "success": {
          "report": "สื่อยอมรับคำปฏิเสธ",
          "scores": {
            "image": 5
          }
        },
        "chance": 0.3,
        "failure": {
          "report": "หลักฐานเพิ่มเติมขัดกับคำปฏิเสธ",
          "scores": {
            "integrity": -20,
            "image": -15
          }
        }
      },
      {
        "title": "ยอมรับข้อจำกัดและขอเวลาตรวจสอบ",
        "success": {
          "report": "สื่อยอมรับคำชี้แจง แต่บางส่วนวิจารณ์ความล่าช้า",
          "scores": {
            "integrity": 8,
            "image": -5,
            "admin": -5
          }
        }
      }
    ],
    "ignored": {
      "report": "ข่าวถูกเผยแพร่โดยไม่มีคำชี้แจง",
      "scores": {
        "image": -12,
        "integrity": -10
      }
    },
    "minLevel": 1,
    "emergencyOnly": true
  },
  {
    "id": "night-protest",
    "category": "people",
    "title": "ด่วน! ประชาชนขอพบนายก",
    "story": "ชุมชนร้องเรียนการใช้งบช่วยธุรกิจ ผู้ประกอบการยืนยันว่าตนกำลังเดือดร้อน ทั้งสองฝ่ายต้องการคำตอบคืนนี้",
    "choices": [
      {
        "title": "จัดเวทีร่วมทั้งสองฝ่าย",
        "success": {
          "report": "ทั้งสองฝ่ายได้พูด แต่ฝ่ายบริหารต้องโยกกำลังงาน",
          "scores": {
            "people": 7,
            "business": 5,
            "admin": -6
          }
        },
        "cost": 30000
      },
      {
        "title": "ให้คำมั่นเพิ่มความช่วยเหลือชุมชน",
        "success": {
          "report": "ชุมชนพอใจ ธุรกิจมองว่าเมืองเลือกข้าง",
          "scores": {
            "people": 12,
            "business": -12
          }
        },
        "cost": 45000
      },
      {
        "title": "ยืนยันมาตรการช่วยธุรกิจตามเดิม",
        "success": {
          "report": "ธุรกิจพอใจ ผู้ร้องเรียนผิดหวัง",
          "scores": {
            "business": 12,
            "people": -12
          }
        }
      },
      {
        "title": "มอบให้ตัวแทนรัฐบาลไกล่เกลี่ย",
        "success": {
          "report": "ทั้งสองฝ่ายยอมรับคนกลาง",
          "scores": {
            "government": 8,
            "people": 3
          }
        },
        "chance": 0.6,
        "failure": {
          "report": "การเจรจาล้มเหลว",
          "scores": {
            "government": -5,
            "people": -10,
            "business": -8
          }
        }
      },
      {
        "title": "ไม่รับข้อเสนอใดจนกว่าจะมีข้อมูลครบ",
        "success": {
          "report": "รักษาความเป็นกลาง แต่ทั้งสองฝ่ายไม่พอใจ",
          "scores": {
            "integrity": 8,
            "people": -7,
            "business": -7
          }
        }
      }
    ],
    "ignored": {
      "report": "เหตุการณ์กลายเป็นข่าว ทั้งสองฝ่ายไม่พอใจ",
      "scores": {
        "people": -12,
        "image": -10
      }
    },
    "minLevel": 1,
    "emergencyOnly": true
  },
  {
    "id": "moral-public-grant",
    "category": "integrity",
    "title": "เงินสนับสนุนจากกองทุนพัฒนาเมือง",
    "story": "กองทุนจดทะเบียนส่งหนังสือระบุเงิน 350,000 บาท มีเลขเอกสาร อนุญาตเปิดเผยผู้สนับสนุน และไม่มีข้อกำหนดเลือกผู้รับเหมา",
    "choices": [
      {
        "title": "รับเงินเข้าคลังตามหนังสือ",
        "success": {
          "report": "เอกสารผ่านการตรวจ เงินเข้าคลังโดยไม่มีผลเสีย",
          "scores": {},
          "money": 350000
        }
      },
      {
        "title": "ขอตรวจเอกสารกับส่วนกลางก่อนรับ",
        "success": {
          "report": "ส่วนกลางยืนยันที่มา เงินเข้าคลัง",
          "scores": {
            "integrity": 5,
            "government": 3
          },
          "money": 350000
        },
        "cost": 10000
      },
      {
        "title": "ขอเปิดเผยรายชื่อผู้สนับสนุนเพิ่มเติม",
        "success": {
          "report": "กองทุนยินดีเปิดข้อมูลและโอนเงิน",
          "scores": {
            "integrity": 8
          },
          "money": 350000
        }
      },
      {
        "title": "ปฏิเสธตามหลักเกณฑ์ของเมือง",
        "success": {
          "report": "กองทุนรับทราบ เมืองไม่ได้งบ",
          "scores": {
            "integrity": 3,
            "government": -3
          }
        }
      },
      {
        "title": "ขอเพิ่มยอดโดยไม่แจ้งเหตุผล",
        "success": {
          "report": "กองทุนยุติการพิจารณา",
          "scores": {
            "integrity": -10,
            "government": -8
          }
        }
      }
    ],
    "ignored": null,
    "minLevel": 1,
    "moralOnly": true
  },
  {
    "id": "moral-envelope",
    "category": "integrity",
    "title": "ข้อเสนอเงิน 750,000 บาท",
    "story": "ตัวแทนกลุ่มทุนเสนอเงินช่วยเมือง ขอไม่ลงชื่อผู้ให้ในเอกสารและนัดส่งผ่านคนกลาง ย้ำว่าไม่มีอะไรต้องตอบแทนในตอนนี้",
    "choices": [
      {
        "title": "รับเงินตามข้อเสนอ",
        "success": {
          "report": "เงินเข้าคลัง แต่การตรวจพบผู้ให้ที่ไม่เปิดเผยทำลายความน่าเชื่อถือ",
          "scores": {
            "integrity": -25,
            "image": -10
          },
          "money": 750000
        }
      },
      {
        "title": "ขอเปิดเผยชื่อและรับผ่านบัญชีทางการ",
        "success": {
          "report": "กลุ่มทุนถอนข้อเสนอ",
          "scores": {
            "integrity": 8,
            "business": -8
          }
        }
      },
      {
        "title": "ปฏิเสธและแจ้งหน่วยตรวจสอบ",
        "success": {
          "report": "หน่วยตรวจรับเรื่อง กลุ่มทุนไม่พอใจ",
          "scores": {
            "integrity": 12,
            "business": -15,
            "government": 5
          }
        }
      },
      {
        "title": "ขอเอกสารชี้แจงที่มาก่อนพิจารณา",
        "success": {
          "report": "ตัวแทนยุติการติดต่อ",
          "scores": {
            "integrity": 5,
            "business": -5
          }
        }
      },
      {
        "title": "ขอเจรจาเพิ่มยอดตามเงื่อนไขเดิม",
        "success": {
          "report": "เงินเข้าคลังแต่เกิดข้อสงสัยหนัก",
          "scores": {
            "integrity": -30,
            "image": -12
          },
          "money": 950000
        },
        "chance": 0.45,
        "failure": {
          "report": "ข้อเสนอถูกเปิดเผยก่อนโอนเงิน",
          "scores": {
            "integrity": -25,
            "image": -15
          }
        }
      }
    ],
    "ignored": null,
    "minLevel": 1,
    "moralOnly": true
  },
  {
    "id": "moral-ai-official",
    "category": "government",
    "title": "โควต้าแยก AI จากโครงการทดลอง",
    "story": "หนังสือจังหวัดระบุโควต้า AI 1 จุดสำหรับเมืองที่เข้าร่วมโครงการสาธารณะ ไม่มีค่าใช้จ่ายหรือเงื่อนไขส่วนตัว",
    "choices": [
      {
        "title": "ตอบรับตามหนังสือ",
        "success": {
          "report": "ได้รับโควต้า AI ที่ถูกต้อง ไม่มีผลเสีย",
          "scores": {},
          "aiCredits": 1
        }
      },
      {
        "title": "ขอเผยแพร่หนังสือให้ประชาชนตรวจสอบ",
        "success": {
          "report": "ได้รับโควต้าและเปิดข้อมูลต่อชุมชน",
          "scores": {
            "integrity": 5
          },
          "aiCredits": 1
        }
      },
      {
        "title": "ขอให้จังหวัดชี้แจงรายละเอียด",
        "success": {
          "report": "จังหวัดยืนยันสิทธิ์และส่งโควต้า",
          "scores": {
            "government": 3
          },
          "aiCredits": 1
        }
      },
      {
        "title": "ปฏิเสธและให้เมืองพึ่งตนเอง",
        "success": {
          "report": "จังหวัดจัดโควต้าให้เมืองอื่น",
          "scores": {
            "government": -5
          }
        }
      },
      {
        "title": "ขอเพิ่มอีกหนึ่งจุดนอกหลักเกณฑ์",
        "success": {
          "report": "จังหวัดไม่อนุมัติเพิ่ม แต่ให้โควต้าเดิม",
          "scores": {
            "government": -8,
            "integrity": -5
          },
          "aiCredits": 1
        }
      }
    ],
    "ignored": null,
    "minLevel": 1,
    "moralOnly": true
  },
  {
    "id": "moral-ai-private",
    "category": "integrity",
    "title": "โควต้า AI ฟรีจากผู้รับเหมา",
    "story": "ผู้รับเหมารายหนึ่งเสนอจัดหาโควต้า AI 1 จุดให้ทันที ขอเพียงให้จดชื่อบริษัทเป็นผู้รับเหมาที่ควรได้รับการพิจารณาก่อนในอนาคต",
    "choices": [
      {
        "title": "รับข้อเสนอและตกลงจดชื่อบริษัท",
        "success": {
          "report": "ได้รับโควต้า แต่เงื่อนไขเอื้อประโยชน์ถูกทักท้วง",
          "scores": {
            "integrity": -22,
            "image": -8,
            "business": 5
          },
          "aiCredits": 1
        }
      },
      {
        "title": "ขอรับโดยไม่มีสิทธิพิเศษและลงเอกสาร",
        "success": {
          "report": "บริษัทถอนข้อเสนอ",
          "scores": {
            "integrity": 8,
            "business": -5
          }
        }
      },
      {
        "title": "ปฏิเสธและเปิดเผยข้อเสนอ",
        "success": {
          "report": "ชุมชนชื่นชม ผู้รับเหมาไม่พอใจ",
          "scores": {
            "integrity": 12,
            "business": -12
          }
        }
      },
      {
        "title": "ขอให้รัฐบาลพิจารณาแทนเมือง",
        "success": {
          "report": "รัฐบาลไม่อนุมัติ แต่ชื่นชมการส่งตรวจ",
          "scores": {
            "government": 5,
            "integrity": 5,
            "business": -5
          }
        }
      },
      {
        "title": "ขอเงินสนับสนุนเพิ่มเติมด้วย",
        "success": {
          "report": "ได้โควต้าและเงิน แต่การเอื้อประโยชน์ถูกเปิดเผย",
          "scores": {
            "integrity": -30,
            "image": -12
          },
          "money": 150000,
          "aiCredits": 1
        },
        "chance": 0.5,
        "failure": {
          "report": "บริษัทเปิดเผยการต่อรอง",
          "scores": {
            "integrity": -20,
            "image": -15
          }
        }
      }
    ],
    "ignored": null,
    "minLevel": 1,
    "moralOnly": true
  },
  {
    "id": "moral-ai-anonymous",
    "category": "integrity",
    "title": "โควต้า AI จากผู้สนับสนุนไม่เปิดชื่อ",
    "story": "ข้อความแจ้งว่าจะส่งโควต้า AI ฟรี 1 จุดผ่านโครงการเอกชน ไม่ขอตอบแทนชัดเจน แต่ช่องผู้สนับสนุนเว้นว่างและเร่งให้ตอบ",
    "choices": [
      {
        "title": "รับโควต้าทันที",
        "success": {
          "report": "ตรวจภายหลังพบว่าเป็นทุนสาธารณะจริง",
          "scores": {},
          "aiCredits": 1
        },
        "chance": 0.45,
        "failure": {
          "report": "ตรวจพบความเชื่อมโยงกับผู้เสนอราคาในเมือง",
          "scores": {
            "integrity": -20,
            "image": -8
          },
          "aiCredits": 1
        }
      },
      {
        "title": "ขอเลขเอกสารโครงการก่อนรับ",
        "success": {
          "report": "เอกสารยืนยันสิทธิ์และเมืองได้โควต้า",
          "scores": {
            "integrity": 6
          },
          "aiCredits": 1
        },
        "chance": 0.65,
        "failure": {
          "report": "ผู้เสนอไม่ส่งหลักฐานและยกเลิก",
          "scores": {
            "integrity": 3,
            "business": -5
          }
        }
      },
      {
        "title": "ขอให้หน่วยงานรัฐรับโควต้าแทน",
        "success": {
          "report": "รัฐบาลรับเรื่อง แต่เมืองยังไม่ได้โควต้า",
          "scores": {
            "government": 5,
            "integrity": 5
          }
        }
      },
      {
        "title": "ปฏิเสธโดยไม่ให้เหตุผล",
        "success": {
          "report": "เมืองไม่รับความเสี่ยง แต่เสียโอกาส",
          "scores": {
            "integrity": 3
          }
        }
      },
      {
        "title": "เปิดเผยข้อความต่อสาธารณะ",
        "success": {
          "report": "ประชาชนชื่นชม แต่ผู้ให้ทุนสุจริตบางรายกังวล",
          "scores": {
            "integrity": 10,
            "business": -6,
            "image": 3
          }
        }
      }
    ],
    "ignored": null,
    "minLevel": 1,
    "moralOnly": true
  },
  {
    "id": "moral-money-sponsor",
    "category": "integrity",
    "title": "เงินสนับสนุนกิจกรรมจากผู้จัดงาน",
    "story": "ผู้จัดงานเสนอเงิน 450,000 บาท ให้เมืองช่วยประชาสัมพันธ์ และขอไม่กล่าวถึงข้อร้องเรียนเก่าของผู้จัดในประกาศ",
    "choices": [
      {
        "title": "รับเงินและทำตามคำขอ",
        "success": {
          "report": "เงินเข้าคลัง แต่เมืองถูกทักท้วงเรื่องปิดบังข้อมูล",
          "scores": {
            "integrity": -20,
            "image": -8,
            "business": 5
          },
          "money": 450000
        }
      },
      {
        "title": "รับเฉพาะเมื่อเปิดเผยข้อเสนอและข้อร้องเรียน",
        "success": {
          "report": "ผู้จัดยอมลดเงื่อนไขและโอนเงิน",
          "scores": {
            "integrity": 5,
            "business": -5
          },
          "money": 250000
        },
        "chance": 0.6,
        "failure": {
          "report": "ผู้จัดถอนตัว",
          "scores": {
            "business": -10,
            "integrity": 5
          }
        }
      },
      {
        "title": "ปฏิเสธการรับเงิน",
        "success": {
          "report": "รักษาความเป็นอิสระ แต่ธุรกิจไม่พอใจ",
          "scores": {
            "integrity": 8,
            "business": -8
          }
        }
      },
      {
        "title": "ขอผู้ตรวจอิสระตรวจเอกสาร",
        "success": {
          "report": "พบข้อขัดแย้ง เมืองไม่รับเงิน",
          "scores": {
            "integrity": 10,
            "admin": -5
          }
        },
        "cost": 25000
      },
      {
        "title": "เสนอเงินบริจาคผ่านชุมชนแทน",
        "success": {
          "report": "ชุมชนได้รับความช่วยเหลือ แต่เมืองไม่ได้งบ",
          "scores": {
            "people": 8,
            "business": -5
          }
        }
      }
    ],
    "ignored": null,
    "minLevel": 1,
    "moralOnly": true
  },
  {
    "id": "moral-community",
    "category": "people",
    "title": "งบช่วยชุมชนหรือช่วยกิจการ",
    "story": "งบมีจำกัด ชุมชนขอความช่วยเหลือค่าครองชีพ ธุรกิจขอช่วยค่าใช้จ่ายเพื่อรักษางาน ทั้งสองฝ่ายมีข้อมูลสมเหตุสมผล",
    "choices": [
      {
        "title": "จัดงบทั้งหมดให้ชุมชน",
        "success": {
          "report": "ชุมชนพอใจ ธุรกิจรู้สึกถูกละเลย",
          "scores": {
            "people": 12,
            "business": -12
          }
        },
        "cost": 90000
      },
      {
        "title": "จัดงบทั้งหมดให้ธุรกิจ",
        "success": {
          "report": "ธุรกิจได้รับความช่วยเหลือ ชุมชนไม่พอใจ",
          "scores": {
            "business": 12,
            "people": -12
          }
        },
        "cost": 90000
      },
      {
        "title": "แบ่งงบตามเกณฑ์ที่เปิดเผย",
        "success": {
          "report": "ทั้งสองฝ่ายได้บางส่วน ฝ่ายบริหารถูกกดดัน",
          "scores": {
            "integrity": 8,
            "people": 4,
            "business": 4,
            "admin": -7
          }
        },
        "cost": 90000
      },
      {
        "title": "ขอรัฐบาลสมทบก่อนตัดสินใจ",
        "success": {
          "report": "รัฐบาลช่วยประสาน แต่เงินยังไม่เข้า",
          "scores": {
            "government": 7,
            "people": -5,
            "business": -5
          }
        }
      },
      {
        "title": "เก็บงบไว้สำหรับเหตุฉุกเฉิน",
        "success": {
          "report": "เมืองรักษางบ แต่ทั้งสองฝ่ายผิดหวัง",
          "scores": {
            "admin": 8,
            "people": -8,
            "business": -8
          }
        }
      }
    ],
    "ignored": null,
    "minLevel": 1,
    "moralOnly": true
  },
  {
    "id": "moral-friend",
    "category": "business",
    "title": "คำขอจากเพื่อนเก่าของนายก",
    "story": "เพื่อนเก่าที่ทำธุรกิจเสนอเงิน 600,000 บาท หากบริษัทมีสิทธิ์เข้าหารือก่อนรายอื่น ไม่ได้ขอให้ข้ามกฎหมายโดยตรง",
    "choices": [
      {
        "title": "รับเงินและตกลงให้เข้าหารือก่อน",
        "success": {
          "report": "เงินเข้าคลัง แต่สิทธิ์ไม่เท่าเทียมถูกวิจารณ์",
          "scores": {
            "integrity": -20,
            "business": 5,
            "image": -10
          },
          "money": 600000
        }
      },
      {
        "title": "ให้ทุกบริษัทหารือพร้อมกันโดยไม่รับเงิน",
        "success": {
          "report": "รักษาความเท่าเทียม แต่เพื่อนเก่าผิดหวัง",
          "scores": {
            "integrity": 10,
            "business": -8
          }
        }
      },
      {
        "title": "เสนอรับเงินโดยไม่ให้สิทธิพิเศษ",
        "success": {
          "report": "เพื่อนยอมสนับสนุนผ่านช่องทางปกติ",
          "scores": {
            "integrity": 5
          },
          "money": 300000
        },
        "chance": 0.5,
        "failure": {
          "report": "เพื่อนถอนข้อเสนอ",
          "scores": {
            "business": -5
          }
        }
      },
      {
        "title": "ขอคณะกรรมการอิสระพิจารณา",
        "success": {
          "report": "เป็นกลาง แต่เกิดความล่าช้า",
          "scores": {
            "integrity": 8,
            "admin": -5
          }
        },
        "cost": 20000
      },
      {
        "title": "ไม่ตอบรับและไม่เปิดเผยข้อเสนอ",
        "success": {
          "report": "ไม่มีเงินเข้าเมือง แต่ข้อสงสัยยังอยู่",
          "scores": {
            "image": -5,
            "business": -5
          }
        }
      }
    ],
    "ignored": null,
    "minLevel": 1,
    "moralOnly": true
  }
]);
// v7.2: ordinary decisions may include optional funding. Existing indices and event ids remain unchanged.
const MAYOR_V72_OFFERS = {
  "admin-rain": {
    "title": "รับเงินสนับสนุนอุปกรณ์ระบายน้ำ 650,000 บาทจากสมาคมช่าง",
    "success": {
      "money": 650000,
      "scores": {
        "admin": 3
      },
      "report": "สมาคมช่างบริจาคเงินผ่านบัญชีเทศบาลโดยไม่มีเงื่อนไขและเจ้าหน้าที่ใช้แผนรับมือเดิมได้ทัน ฝ่ายบริหารได้รับคำชมเรื่องการประสานทรัพยากร ไม่พบผลประโยชน์ทับซ้อน"
    }
  },
  "admin-crossing": {
    "title": "รับ 1,200,000 บาทจากบริษัทอุปกรณ์จราจร แลกกับการทดลองใช้ระบบของบริษัทก่อน",
    "success": {
      "money": 1200000,
      "scores": {
        "admin": -8,
        "integrity": -12,
        "people": -5
      },
      "report": "บริษัทจ่ายเงินครบ แต่การทดลองโดยไม่เปรียบเทียบระบบอื่นทำให้ทีมงานต้องแก้ปัญหาจราจรซ้ำ ชาวเมืองเสียเวลาเดินทาง และผู้ตรวจสอบพบว่าผู้ขายได้เปรียบคู่แข่ง"
    }
  },
  "admin-training": {
    "title": "รับทุนอบรมจากสถาบันการศึกษา 250,000 บาท โดยไม่กำหนดผู้รับเหมา",
    "success": {
      "money": 250000,
      "scores": {},
      "report": "สถาบันโอนทุนผ่านช่องทางราชการและไม่ขอสิทธิพิเศษ ทีมงานยังทำงานตามแผนเดิม จึงไม่มีคะแนนด้านใดเปลี่ยนแปลง"
    }
  },
  "image-interview": {
    "title": "รับ 700,000 บาทจากผู้ผลิตรายการเพื่อเปิดตัวรายการสัมภาษณ์นายก",
    "success": {
      "money": 700000,
      "scores": {
        "image": -8,
        "integrity": -5
      },
      "report": "รายการออกอากาศตามข้อตกลง แต่ผู้ชมพบว่าผู้สนับสนุนเป็นคู่สัญญาของเมืองและมีสิทธิอนุมัติคำถาม จึงตั้งข้อสงสัยว่าการสัมภาษณ์ไม่เป็นอิสระ"
    }
  },
  "image-speech": {
    "title": "รับเงินสนับสนุน 400,000 บาท พร้อมกล่าวขอบคุณผู้จัดงานตามกำหนด",
    "success": {
      "money": 400000,
      "scores": {
        "image": 4,
        "business": 3
      },
      "report": "พิธีกรประกาศยอดสนับสนุนอย่างเปิดเผย ผู้ชมเห็นว่านายกให้เกียรติผู้ร่วมจัดงาน ขณะที่ธุรกิจพอใจกับการประชาสัมพันธ์ที่เป็นธรรม"
    }
  },
  "image-community": {
    "title": "รับเงินสมทบกองทุนชุมชน 350,000 บาทจากผู้จัดงาน",
    "success": {
      "money": 350000,
      "scores": {},
      "report": "ยอดเงินปรากฏในทะเบียนรับบริจาคและไม่มีการเปลี่ยนแผนงานหรือสิทธิของผู้บริจาค ชาวเมืองและสื่อไม่ได้มีปฏิกิริยาเพิ่มเติม"
    }
  },
  "fame-food": {
    "title": "รับ 1,500,000 บาทจากผู้จัดเทศกาล และให้ผู้จัดคัดเลือกร้านค้าเอง",
    "success": {
      "money": 1500000,
      "scores": {
        "fame": 5,
        "business": -9,
        "people": -5
      },
      "report": "เทศกาลได้รับความสนใจจากสื่อ แต่ผู้จัดคัดเฉพาะร้านในเครือ ร้านรายย่อยถูกกันออกและชาวเมืองวิจารณ์ว่าพื้นที่สาธารณะไม่ได้เปิดให้ทุกคนเท่ากัน"
    }
  },
  "fame-tour-film": {
    "title": "เก็บค่าธรรมเนียมถ่ายทำ 900,000 บาทตามประกาศเทศบาล",
    "success": {
      "money": 900000,
      "scores": {
        "fame": 4
      },
      "report": "กองถ่ายชำระเงินตามอัตราที่ประกาศและไม่ปิดพื้นที่เกินเวลาที่ได้รับอนุญาต ภาพเมืองออกอากาศและทำให้คนรู้จักเมืองเพิ่มขึ้น"
    }
  },
  "fame-coast": {
    "title": "รับเงินสนับสนุนเก็บขยะชายฝั่ง 500,000 บาทโดยไม่อนุญาตป้ายโฆษณาเพิ่มเติม",
    "success": {
      "money": 500000,
      "scores": {},
      "report": "ผู้บริจาคยอมรับเงื่อนไข เงินเข้าสู่คลังตามระเบียบ ขณะที่กิจกรรมยังจัดตามกำหนดและไม่เกิดกระแสใหม่ด้านชื่อเสียง"
    }
  },
  "government-visit": {
    "title": "รับงบอุดหนุนทั่วไป 1,000,000 บาท พร้อมลงนามรับทราบข้อเสนอของคณะรัฐบาล",
    "success": {
      "money": 1000000,
      "scores": {
        "government": 4
      },
      "report": "ส่วนกลางตรวจเอกสารครบและอนุมัติงบทั่วไปโดยไม่ผูกกับการจัดซื้อ ผู้ประสานงานเห็นว่าเทศบาลส่งข้อมูลตามกำหนดจึงทำงานร่วมกันได้ดีขึ้น"
    }
  },
  "government-fund-return": {
    "title": "ยื่นขอเงินสำรอง 1,800,000 บาทโดยระบุว่าเมืองยังขาดแคลนงบช่วยเหลือ",
    "success": {
      "money": 1800000,
      "scores": {
        "government": -12,
        "integrity": -10
      },
      "report": "เงินได้รับอนุมัติจากข้อมูลเบื้องต้น แต่การตรวจภายหลังพบว่าเมืองมีเงินสำรองอยู่แล้วและไม่ได้เปิดเผย ฝ่ายรัฐบาลเสียความเชื่อถือและผู้ตรวจสอบตั้งข้อสังเกตเรื่องความครบถ้วนของข้อมูล"
    }
  },
  "government-liaison-daily": {
    "title": "รับเงินสนับสนุนงานประสานราชการ 200,000 บาทตามสิทธิที่ประกาศ",
    "success": {
      "money": 200000,
      "scores": {},
      "report": "ส่วนกลางโอนงบตามสิทธิของเทศบาลทุกแห่ง ไม่มีเงื่อนไขพิเศษหรือความขัดแย้งใหม่"
    }
  },
  "people-cost": {
    "title": "รับเงินจากเครือข่ายค้าปลีก 1,400,000 บาท แลกกับการประชาสัมพันธ์โครงการลดค่าครองชีพของเครือข่ายเท่านั้น",
    "success": {
      "money": 1400000,
      "scores": {
        "people": -8,
        "business": -5,
        "integrity": -6
      },
      "report": "ประชาชนพบว่าร้านอื่นที่เสนอราคาถูกกว่าถูกกันออกจากการประชาสัมพันธ์ ร้านรายย่อยร้องเรียนและสื่อถามเหตุใดเทศบาลจึงให้สิทธิแก่ผู้สนับสนุนรายเดียว"
    }
  },
  "people-recreation": {
    "title": "รับเงินสมทบ 600,000 บาทจากมูลนิธิ ให้ทุกชุมชนเข้าร่วมกิจกรรมได้",
    "success": {
      "money": 600000,
      "scores": {
        "people": 5
      },
      "report": "มูลนิธิสนับสนุนโดยไม่จำกัดผู้เข้าร่วม ครอบครัวในหลายชุมชนเข้าถึงกิจกรรมได้อย่างเท่าเทียมและแสดงความพอใจ"
    }
  },
  "people-complaint": {
    "title": "รับเงินสมทบระบบรับเรื่องร้องเรียน 300,000 บาทจากองค์กรสาธารณประโยชน์",
    "success": {
      "money": 300000,
      "scores": {},
      "report": "องค์กรสนับสนุนเงินโดยไม่เข้าถึงข้อมูลร้องเรียนหรือกำหนดลำดับคิว ระบบบริการยังทำงานตามเดิมและไม่มีคะแนนเปลี่ยนแปลง"
    }
  },
  "business-food-cost": {
    "title": "รับ 1,600,000 บาทจากผู้ค้าส่ง แลกกับการแนะนำร้านอาหารให้ซื้อวัตถุดิบจากรายเดียว",
    "success": {
      "money": 1600000,
      "scores": {
        "business": -10,
        "integrity": -8,
        "people": -4
      },
      "report": "ร้านอาหารหลายร้านพบว่าราคาและเงื่อนไขซื้อขายไม่เหมาะกับตน คู่แข่งร้องเรียนเรื่องการปิดกั้นตลาด และประชาชนกังวลว่าต้นทุนจะถูกส่งต่อมายังราคาอาหาร"
    }
  },
  "business-mall-sponsor": {
    "title": "รับ 850,000 บาทเป็นค่าธรรมเนียมจัดงานตามระเบียบเดียวกับผู้จัดรายอื่น",
    "success": {
      "money": 850000,
      "scores": {
        "business": 3
      },
      "report": "ผู้จัดงานจ่ายค่าธรรมเนียมตามประกาศที่ทุกกิจการเข้าถึงได้ ผู้ประกอบการพอใจที่กติกาชัดเจนและไม่มีข้อร้องเรียนเรื่องสิทธิพิเศษ"
    }
  },
  "business-new-market-daily": {
    "title": "รับเงินสมทบพัฒนาตลาด 450,000 บาทจากสมาคมการค้าโดยไม่สัญญาสิทธิพิเศษ",
    "success": {
      "money": 450000,
      "scores": {},
      "report": "เงินเข้าสู่คลังผ่านบัญชีปกติ สมาคมไม่ได้รับสิทธิในการจัดสรรที่ดินหรือใบอนุญาต คะแนนทุกด้านคงเดิม"
    }
  },
  "integrity-public-ledger": {
    "title": "รับทุนสนับสนุนระบบบัญชีเปิด 550,000 บาทและเปิดเผยผู้ให้ทุน",
    "success": {
      "money": 550000,
      "scores": {
        "integrity": 5
      },
      "report": "แหล่งที่มาของเงินและเงื่อนไขปรากฏในทะเบียนสาธารณะ ผู้ตรวจสอบยืนยันว่าไม่มีสิทธิแทรกแซงข้อมูล ความเชื่อถือด้านความโปร่งใสจึงเพิ่มขึ้น"
    }
  },
  "integrity-contract": {
    "title": "รับค่าชดเชย 2,000,000 บาท แลกกับการยอมใช้ข้อความในสัญญาฉบับเดิม",
    "success": {
      "money": 2000000,
      "scores": {
        "integrity": -15,
        "admin": -8,
        "business": -5
      },
      "report": "เมืองได้เงินทันที แต่ฝ่ายกฎหมายพบว่าข้อความเดิมเปิดทางให้คู่สัญญาได้เปรียบ ผู้ประกอบการอื่นคัดค้าน และฝ่ายบริหารต้องเสียเวลาทบทวนสัญญา"
    }
  },
  "integrity-audit-government": {
    "title": "รับเงินสนับสนุนการจัดทำเอกสาร 150,000 บาทจากหน่วยงานกลาง",
    "success": {
      "money": 150000,
      "scores": {},
      "report": "เงินเป็นงบเบิกจ่ายตามระเบียบ ผู้ตรวจสอบยังทำหน้าที่อย่างอิสระและไม่มีการเปลี่ยนแปลงความเชื่อถือของเมือง"
    }
  }
};
for(const event of MAYOR_EVENTS){const offer=MAYOR_V72_OFFERS[event.id];if(offer)event.choices.push(offer);}
MAYOR_EVENTS.push(...[
  {
    "id": "v72-road-fund",
    "category": "admin",
    "minLevel": 1,
    "title": "เงินด่วนสำหรับทางเข้าเมือง",
    "story": "บริษัทเสนอสนับสนุนทางเข้าเมือง ขณะเจ้าหน้าที่กำลังทบทวนสภาพถนน โดยมีข้อเสนอหลายรูปแบบ",
    "choices": [
      {
        "title": "อนุญาตให้บริษัทกำหนดพื้นที่ตรวจถนนเอง รับ 1,800,000 บาท",
        "success": {
          "money": 1800000,
          "scores": {
            "admin": -10,
            "integrity": -12
          },
          "report": "รายงานตรวจสภาพถูกจำกัดเฉพาะพื้นที่ที่บริษัทเลือก วิศวกรเทศบาลพบจุดเสี่ยงที่ตกหล่นและคณะตรวจสอบตั้งข้อสงสัยต่อความเป็นกลาง"
        }
      },
      {
        "title": "ใช้รายงานของวิศวกรเทศบาลและเปิดรับข้อเสนอทั่วไป",
        "success": {
          "money": 0,
          "scores": {
            "admin": 6,
            "integrity": 3
          },
          "report": "ทีมวิศวกรใช้หลักเกณฑ์เดียวกันในการประเมินทุกจุด จึงทำให้แผนซ่อมแซมมีความน่าเชื่อถือ"
        }
      },
      {
        "title": "เลื่อนเรื่องทั้งหมดไปก่อน",
        "success": {
          "money": 0,
          "scores": {
            "admin": -5
          },
          "report": "เจ้าหน้าที่ไม่มีคำสั่งให้เริ่มตรวจทางเข้าเมือง แผนงานจึงล่าช้า"
        }
      },
      {
        "title": "รับเงิน 450,000 บาทโดยไม่มีเงื่อนไขและบันทึกเป็นรายได้ทั่วไป",
        "success": {
          "money": 450000,
          "scores": {},
          "report": "บริษัทโอนเงินตามเงื่อนไขที่ไม่มีสิทธิแทรกแซง การตรวจถนนดำเนินตามแผนเดิม จึงไม่มีคะแนนเปลี่ยนแปลง"
        }
      },
      {
        "title": "ประกาศต่อประชาชนว่าถนนปลอดภัยแล้วเพื่อสร้างความมั่นใจ",
        "success": {
          "money": 0,
          "scores": {
            "image": -8,
            "admin": -5
          },
          "report": "เมื่อรายงานตรวจยังไม่เสร็จ สื่อพบว่าคำประกาศเร็วเกินไป นายกต้องชี้แจงและเจ้าหน้าที่ต้องแก้ไขข้อมูล"
        }
      }
    ]
  },
  {
    "id": "v72-media-fund",
    "category": "image",
    "minLevel": 1,
    "title": "รายการพิเศษของสถานีท้องถิ่น",
    "story": "สถานีท้องถิ่นอยากผลิตรายการเกี่ยวกับเมือง ผู้สนับสนุนเสนอร่วมออกค่าใช้จ่าย",
    "choices": [
      {
        "title": "ให้สัมภาษณ์โดยตอบคำถามจากประชาชนโดยตรง",
        "success": {
          "money": 0,
          "scores": {
            "image": 5
          },
          "report": "คำตอบมีทั้งข้อดีและข้อที่ยังต้องปรับปรุง ผู้ชมชื่นชมว่านายกตอบอย่างตรงไปตรงมา"
        }
      },
      {
        "title": "รับ 1,250,000 บาทและให้ผู้สนับสนุนอนุมัติคำถามก่อนออกอากาศ",
        "success": {
          "money": 1250000,
          "scores": {
            "image": -10,
            "integrity": -8
          },
          "report": "รายการเผยแพร่ได้ แต่ทีมข่าวเปิดเผยว่าคำถามสำคัญถูกตัดออก ความน่าเชื่อถือของนายกและความโปร่งใสลดลง"
        }
      },
      {
        "title": "ไม่อนุญาตให้สถานีถ่ายทำ",
        "success": {
          "money": 0,
          "scores": {
            "image": -4
          },
          "report": "สื่อรายงานว่าสำนักงานนายกปิดโอกาสให้ประชาชนรับรู้การทำงาน"
        }
      },
      {
        "title": "รับค่าธรรมเนียมถ่ายทำ 200,000 บาทตามประกาศ",
        "success": {
          "money": 200000,
          "scores": {},
          "report": "สถานีชำระค่าธรรมเนียมปกติและยังมีอิสระในการทำข่าว ไม่มีเหตุให้คะแนนเปลี่ยน"
        }
      },
      {
        "title": "รับปากว่าทุกปัญหาจะหมดไปภายในวันนี้",
        "success": {
          "money": 0,
          "scores": {
            "image": -8,
            "admin": -5
          },
          "report": "เมื่อถึงช่วงเย็นปัญหาหลายเรื่องยังไม่หมดไป สื่อเปรียบเทียบคำพูดกับผลจริงและเจ้าหน้าที่ถูกเร่งงานนอกแผน"
        }
      }
    ]
  },
  {
    "id": "v72-festival",
    "category": "fame",
    "minLevel": 1,
    "title": "เทศกาลอาหารของเมือง",
    "story": "ผู้จัดงานขอใช้พื้นที่สาธารณะจัดเทศกาล มีร้านค้าหลายกลุ่มอยากเข้าร่วม",
    "choices": [
      {
        "title": "เปิดให้ร้านค้าสมัครด้วยเกณฑ์เดียวกัน",
        "success": {
          "money": 0,
          "scores": {
            "fame": 4,
            "business": 5
          },
          "report": "งานมีร้านค้าหลากหลาย สื่อสนใจบรรยากาศและผู้ประกอบการเห็นว่าการคัดเลือกเป็นธรรม"
        }
      },
      {
        "title": "ให้ผู้จัดงานกำหนดราคาค่าเข้าชมเอง",
        "success": {
          "money": 0,
          "scores": {
            "people": -6
          },
          "report": "ราคาบัตรสูงกว่าที่ครอบครัวส่วนใหญ่รับได้ จึงเกิดเสียงร้องเรียนว่ากิจกรรมเมืองไม่ทั่วถึง"
        }
      },
      {
        "title": "รับเงิน 1,500,000 บาทและให้สิทธิพื้นที่ทั้งหมดแก่ผู้สนับสนุน",
        "success": {
          "money": 1500000,
          "scores": {
            "business": -10,
            "people": -6,
            "integrity": -5
          },
          "report": "ผู้สนับสนุนจัดพื้นที่ให้ร้านในเครือเป็นหลัก ร้านท้องถิ่นถูกกันออกและประชาชนตั้งข้อสงสัยว่าพื้นที่เมืองถูกให้สิทธิพิเศษ"
        }
      },
      {
        "title": "ยกเลิกงานเพื่อหลีกเลี่ยงความวุ่นวาย",
        "success": {
          "money": 0,
          "scores": {
            "fame": -4,
            "business": -5
          },
          "report": "ร้านที่เตรียมสินค้าไว้เสียโอกาสและสื่อยกเลิกข่าวกิจกรรมของเมือง"
        }
      },
      {
        "title": "รับค่าเช่าพื้นที่ 700,000 บาทด้วยอัตราที่ประกาศและเปิดรับร้านค้าทั่วไป",
        "success": {
          "money": 700000,
          "scores": {
            "fame": 3,
            "business": 4
          },
          "report": "เงินเข้าเมืองตามระเบียบ งานได้รับการประชาสัมพันธ์ และร้านค้าหลายรายมีโอกาสเข้าร่วม"
        }
      }
    ]
  },
  {
    "id": "v72-central-grant",
    "category": "government",
    "minLevel": 1,
    "title": "ข้อเสนองบประมาณเร่งด่วน",
    "story": "หน่วยงานส่วนกลางเปิดรอบงบอุดหนุนทั่วไป แต่กำหนดให้ข้อมูลความจำเป็นต้องตรงกับข้อเท็จจริง",
    "choices": [
      {
        "title": "รับงบตามสิทธิ 500,000 บาทและส่งข้อมูลครบถ้วน",
        "success": {
          "money": 500000,
          "scores": {
            "government": 5
          },
          "report": "เอกสารผ่านการตรวจตามปกติ หน่วยงานกลางชื่นชมความร่วมมือและโอนเงินเข้าคลัง"
        }
      },
      {
        "title": "ไม่ยื่นขอเงินเพราะไม่ต้องการภาระเอกสาร",
        "success": {
          "money": 0,
          "scores": {
            "government": -4
          },
          "report": "ส่วนกลางไม่ได้รับข้อมูลที่ขอ จึงมองว่าเทศบาลไม่พร้อมประสานงาน"
        }
      },
      {
        "title": "ขอให้เจ้าหน้าที่ตรวจความถูกต้องก่อนส่ง",
        "success": {
          "money": 0,
          "scores": {
            "admin": 3
          },
          "report": "เจ้าหน้าที่จัดข้อมูลเป็นระบบและส่งคำชี้แจงได้ครบตามกำหนด"
        }
      },
      {
        "title": "ขอ 2,000,000 บาทโดยรวมโครงการที่ยังไม่ผ่านการอนุมัติเป็นภาระเร่งด่วน",
        "success": {
          "money": 2000000,
          "scores": {
            "government": -12,
            "integrity": -12
          },
          "report": "เงินโอนจากการพิจารณาเบื้องต้น แต่ส่วนกลางพบว่ารายการที่แจ้งยังไม่ได้รับอนุมัติ ความเชื่อถือในข้อมูลเทศบาลลดลง"
        }
      },
      {
        "title": "รับเงินค่าประสานงาน 200,000 บาทตามอัตราปกติ",
        "success": {
          "money": 200000,
          "scores": {},
          "report": "การเบิกจ่ายเป็นรายการมาตรฐานของหน่วยงานและไม่ได้เปลี่ยนแผนหรือความสัมพันธ์กับรัฐบาล"
        }
      }
    ]
  },
  {
    "id": "v72-family-weekend",
    "category": "people",
    "minLevel": 1,
    "title": "วันหยุดสำหรับครอบครัว",
    "story": "ตัวแทนชุมชนอยากจัดกิจกรรมวันหยุดที่ทุกครอบครัวเข้าถึงได้ ผู้สนับสนุนหลายรายติดต่อเทศบาล",
    "choices": [
      {
        "title": "ให้ทุกครอบครัวลงทะเบียนด้วยหลักเกณฑ์เดียวกัน",
        "success": {
          "money": 0,
          "scores": {
            "people": 6
          },
          "report": "ชุมชนต่าง ๆ ได้โอกาสเท่ากันและชมว่าการจัดงานเป็นธรรม"
        }
      },
      {
        "title": "รับ 1,100,000 บาทจากสโมสรที่ขอสงวนสิทธิ์เข้าร่วมให้สมาชิก",
        "success": {
          "money": 1100000,
          "scores": {
            "people": -12,
            "integrity": -5
          },
          "report": "ครอบครัวที่ไม่เป็นสมาชิกถูกกันออกจากกิจกรรมที่ใช้ชื่อเทศบาล เกิดคำร้องเรื่องความเท่าเทียมและการให้สิทธิพิเศษ"
        }
      },
      {
        "title": "ประกาศให้ทุกคนเข้าร่วมโดยไม่จำกัดจำนวน",
        "success": {
          "money": 0,
          "scores": {
            "admin": -7,
            "people": -5
          },
          "report": "จำนวนคนเกินความพร้อมที่ผู้จัดเตรียมไว้ บางครอบครัวต้องรอนานและเจ้าหน้าที่จัดคิวไม่ทัน"
        }
      },
      {
        "title": "รับเงินจากมูลนิธิ 350,000 บาทโดยไม่มีเงื่อนไข",
        "success": {
          "money": 350000,
          "scores": {
            "people": 3
          },
          "report": "มูลนิธิสมทบผ่านช่องทางปกติและประชาชนยังเข้าได้ตามสิทธิเดิม ตัวแทนชุมชนชื่นชมการระดมทุน"
        }
      },
      {
        "title": "จัดกิจกรรมตามแผนเดิมโดยไม่เปลี่ยนอะไร",
        "success": {
          "money": 0,
          "scores": {},
          "report": "กิจกรรมดำเนินตามกำหนด ไม่มีค่าใช้จ่ายหรือความเปลี่ยนแปลงเพิ่มเติม"
        }
      }
    ]
  },
  {
    "id": "v72-supplier",
    "category": "business",
    "minLevel": 1,
    "title": "ผู้ค้าส่งขอเป็นคู่ค้าหลัก",
    "story": "กลุ่มร้านค้าต้องการต้นทุนที่ต่ำลง ผู้ค้าส่งรายหนึ่งเสนอเงินให้เมืองเพื่อขยายตลาด",
    "choices": [
      {
        "title": "เปิดเวทีให้ผู้ค้าส่งหลายรายเสนอเงื่อนไข",
        "success": {
          "money": 0,
          "scores": {
            "business": 6,
            "integrity": 3
          },
          "report": "ร้านค้าสามารถเปรียบเทียบราคาและเงื่อนไขได้ ผู้ประกอบการและผู้ตรวจสอบพอใจกับการแข่งขัน"
        }
      },
      {
        "title": "รับเงินสมทบ 400,000 บาทโดยไม่ให้สิทธิผูกขาด",
        "success": {
          "money": 400000,
          "scores": {},
          "report": "ผู้ค้าส่งยอมโอนเงินผ่านคลังตามปกติ โดยร้านค้ายังคงเลือกคู่ค้าเอง ไม่มีคะแนนเปลี่ยนแปลง"
        }
      },
      {
        "title": "สั่งให้ทุกกิจการซื้อจากรายที่เสนอราคาต่ำสุดทันที",
        "success": {
          "money": 0,
          "scores": {
            "business": -8,
            "admin": -5
          },
          "report": "ร้านค้าบางประเภทต้องใช้สินค้าต่างกันและไม่สามารถเปลี่ยนคู่ค้าทันที การบังคับใช้ทำให้เกิดคำร้องและเพิ่มภาระงาน"
        }
      },
      {
        "title": "ปฏิเสธการหารือกับผู้ค้าส่งทุกเจ้า",
        "success": {
          "money": 0,
          "scores": {
            "business": -5
          },
          "report": "สมาคมร้านค้าเสียโอกาสเจรจาลดต้นทุนและตำหนิเทศบาลที่ไม่รับฟัง"
        }
      },
      {
        "title": "รับ 1,750,000 บาทและประกาศให้บริษัทเป็นคู่ค้ารายเดียว",
        "success": {
          "money": 1750000,
          "scores": {
            "business": -12,
            "integrity": -10
          },
          "report": "ผู้ค้ารายอื่นเสียโอกาสและร้านค้าพบว่าไม่สามารถต่อรองราคาได้ ผู้ตรวจสอบพบการให้สิทธิผูกขาดโดยไม่มีการแข่งขัน"
        }
      }
    ]
  },
  {
    "id": "v72-public-donation",
    "category": "integrity",
    "minLevel": 1,
    "title": "เงินบริจาคก่อนการประมูล",
    "story": "ผู้ประกอบการติดต่อขอสนับสนุนงบเมือง ขณะเทศบาลกำลังเตรียมเปิดประมูลโครงการใหม่",
    "choices": [
      {
        "title": "ส่งเรื่องให้คณะกรรมการอิสระตรวจแหล่งเงินก่อน",
        "success": {
          "money": 0,
          "scores": {
            "integrity": 6,
            "admin": -3
          },
          "report": "คณะกรรมการยืนยันว่าต้องตรวจความเกี่ยวข้องกับการประมูลก่อนรับเงิน ความน่าเชื่อถือเพิ่มขึ้นแต่ฝ่ายบริหารต้องใช้เวลาตรวจสอบ"
        }
      },
      {
        "title": "รับ 1,900,000 บาททันทีและขอบคุณผ่านเพจเมือง",
        "success": {
          "money": 1900000,
          "scores": {
            "integrity": -15,
            "image": -8
          },
          "report": "ต่อมาพบว่าบริษัทเป็นผู้สนใจเข้าประมูล การเผยแพร่ภาพขอบคุณก่อนแข่งขันทำให้ประชาชนสงสัยว่าบริษัทได้รับการสนับสนุนเป็นพิเศษ"
        }
      },
      {
        "title": "ปฏิเสธข้อเสนอและประกาศหลักเกณฑ์รับเงินอย่างชัดเจน",
        "success": {
          "money": 0,
          "scores": {
            "integrity": 5,
            "business": -3
          },
          "report": "หลักเกณฑ์ป้องกันผลประโยชน์ทับซ้อนชัดขึ้น แต่ผู้ประกอบการบางรายผิดหวังที่ต้องชะลอการสนับสนุน"
        }
      },
      {
        "title": "รับเงิน 300,000 บาทจากกองทุนอิสระที่ไม่เกี่ยวข้องกับการประมูลและลงทะเบียนเปิดเผย",
        "success": {
          "money": 300000,
          "scores": {
            "integrity": 3
          },
          "report": "ผู้ตรวจสอบตรวจสอบแหล่งเงินแล้วไม่พบความเกี่ยวข้องกับคู่ประมูล รายการบริจาคเปิดเผยได้และเพิ่มความเชื่อถือ"
        }
      },
      {
        "title": "ไม่รับเงินแต่ขอให้เจ้าหน้าที่เก็บเรื่องนี้ไว้เป็นความลับ",
        "success": {
          "money": 0,
          "scores": {
            "integrity": -6,
            "image": -4
          },
          "report": "ข่าวการติดต่อรั่วไหลโดยไม่มีเอกสารสาธารณะให้ตรวจสอบ จึงเกิดข้อสงสัยแม้เมืองไม่ได้รับเงิน"
        }
      }
    ]
  }
]);
// Expand the original case-specific report into a readable account of actual consequences.
const MAYOR_V72_REACTION={
 admin:['ฝ่ายบริหารได้รับความเชื่อมั่นจากผลการดำเนินงาน','ฝ่ายบริหารเสียความเชื่อมั่นจากผลการดำเนินงาน'],
 image:['ภาพลักษณ์นายกดีขึ้นเมื่อเรื่องนี้เป็นที่รับรู้','ผลที่เกิดขึ้นทำให้ภาพลักษณ์นายกลดลง'],
 fame:['เหตุการณ์นี้ช่วยให้ชื่อเสียงเมืองดีขึ้น','เหตุการณ์นี้ส่งผลเสียต่อชื่อเสียงเมือง'],
 government:['ผลการตัดสินใจช่วยรักษาความเชื่อมั่นของหน่วยงานส่วนกลาง','ผลการตัดสินใจทำให้หน่วยงานส่วนกลางเชื่อมั่นน้อยลง'],
 people:['ประชาชนตอบรับผลที่เกิดขึ้นในเชิงบวก','ประชาชนไม่พอใจกับผลที่เกิดขึ้น'],
 business:['ผู้ประกอบการตอบรับผลที่เกิดขึ้นในเชิงบวก','ผู้ประกอบการไม่พอใจกับผลที่เกิดขึ้น'],
 integrity:['ผลที่เกิดขึ้นช่วยเพิ่มความเชื่อถือเรื่องความโปร่งใส','ผลที่เกิดขึ้นทำให้ความเชื่อถือเรื่องความโปร่งใสลดลง']
};
function mayorV72Narrative(i,r,changes,cashDelta,aiDelta){
 const parts=[r.report||'สรุปผลการตัดสินใจ'];
 if(i.eventId.startsWith("play-")||i.eventId.startsWith("story-play-"))return parts[0];
 const written=i.eventId.startsWith('play-')||i.eventId.startsWith('story-play-')||i.eventId.startsWith('v72-')||MAYOR_V72_OFFERS[i.eventId]?.success?.report===r.report;
 if(!written){
  const reactions=Object.entries(r.scores||{}).filter(([k,v])=>v&&MAYOR_V72_REACTION[k]).map(([k,v])=>MAYOR_V72_REACTION[k][v>0?0:1]);
  if(reactions.length)parts.push(reactions.join(' และ '));
 }
 if(cashDelta>0)parts.push('ฝ่ายการเงินบันทึกเงินเข้าคลังสุทธิ '+cashDelta.toLocaleString('th-TH')+' บาท');
 if(cashDelta<0)parts.push('ฝ่ายการเงินบันทึกเงินออกจากคลังสุทธิ '+(-cashDelta).toLocaleString('th-TH')+' บาท');
 if(aiDelta>0)parts.push('เมืองได้รับโควต้าแยก AI เพิ่ม '+aiDelta+' จุด');
 if(aiDelta<0)parts.push('โควต้าแยก AI ที่ยังไม่ได้ใช้ถูกเรียกคืน '+(-aiDelta)+' จุด');
 const effects={tripMultiplier:'รายได้จากภารกิจเดินทางที่เข้าเงื่อนไขเพิ่มขึ้นชั่วคราว',touristMultiplier:'รายได้จากนักท่องเที่ยวที่เข้าเงื่อนไขเพิ่มขึ้นชั่วคราว',tripDelta:'รายได้จากภารกิจเดินทางที่เข้าเงื่อนไขลดลงชั่วคราว',floodDamage:'พื้นที่อยู่อาศัยได้รับความเสียหายตามเงื่อนไขของเหตุการณ์',fillPopulation:'มีการรับประชากรเพิ่มเติมตามเงื่อนไขของเมือง',populationBlock:'การย้ายเข้าเมืองถูกระงับชั่วคราว',touristBlock:'การเดินทางเข้าของนักท่องเที่ยวถูกระงับชั่วคราว'};
 for(const e of r.effects||[])if(effects[e.kind])parts.push(effects[e.kind]);
 if(!Object.values(r.scores||{}).some(Boolean)&&!(r.effects||[]).length&&!aiDelta&&!cashDelta)parts.push('ไม่มีผลต่อคะแนนหรือสถานะพิเศษของเมือง');
 if(Object.entries(changes).some(([k,v])=>v.delta!==(r.scores[k]||0)))parts.push('คะแนนที่แสดงเป็นค่าจริงหลังจำกัดช่วงคะแนน 0–100');
 return parts.join(' — ');
}

const MAYOR_STORY_ARCS=[{"category":"admin","id":"drain","title":"คลองของชุมชน","actor":"ทีมช่างเทศบาล","opening":"ชุมชนขอให้ช่วยประสานลอกทางระบายน้ำ ก่อนฤดูฝน ทีมช่างเสนอจัดงานอาสาร่วมกัน","good":"ทีมช่างส่งภาพงานที่เสร็จแล้ว ชุมชนเสนอช่วยดูแลคลองต่อ","conflict":"ผู้รับเหมาร้องเรียนว่าถูกกันออกจากงาน ขอให้ทบทวนการจัดสรร","returning":"เอกสารการเบิกอุปกรณ์มีรายการที่ต้องชี้แจง","tone":"normal"},{"category":"admin","id":"traffic","title":"เมืองเดินทางได้","actor":"เครือข่ายผู้ใช้ถนน","opening":"เครือข่ายผู้ใช้ถนนขอร่วมสำรวจปัญหาการเดินทางและเสนอแนวทางปรับการประสานงาน","good":"ตัวแทนผู้ใช้ถนนขอบคุณที่รับฟัง พร้อมเสนอเผยแพร่บทเรียน","conflict":"ผู้ร้องเรียนกลับมาทวงแผนที่ตกลงไว้ และขอคำตอบจากนายก","returning":"ผู้ประสานงานเดิมถอนตัวหลังเกิดข้อโต้แย้งเรื่องรายงาน","tone":"normal"},{"category":"admin","id":"staff","title":"ทีมเทศบาลที่ไม่ยอมแพ้","actor":"หัวหน้าฝ่ายบริการ","opening":"เจ้าหน้าที่เสนอแบ่งเวลาจัดกิจกรรมพัฒนางาน และขอสมทบค่าอุปกรณ์ 30,000 บาท","good":"เจ้าหน้าที่นำวิธีทำงานใหม่มาแบ่งปันกับเทศบาลอื่น","conflict":"เจ้าหน้าที่บางส่วนค้านการจัดสรรงานและขอให้มีผู้ไกล่เกลี่ย","returning":"มีหนังสือร้องเรียนว่าภาระงานกลับไปตกที่คนเดิม","tone":"warm"},{"category":"admin","id":"documents","title":"กองเอกสารที่ค้าง","actor":"ฝ่ายทะเบียน","opening":"ฝ่ายทะเบียนขอให้ช่วยจัดการเอกสารค้าง มีทีมอาสาเสนอแรงงานแต่ยังต้องกำหนดหน้าที่","good":"ผู้ใช้บริการส่งจดหมายขอบคุณที่งานเอกสารรวดเร็วขึ้น","conflict":"ผู้ประสานงานแจ้งว่าบางรายการยังไม่ได้รับการตรวจสอบ","returning":"เอกสารชุดใหม่ขัดกับรายงานที่ส่งมาก่อนหน้า","tone":"normal"},{"category":"admin","id":"bridge","title":"สะพานกับผู้ตรวจ","actor":"คณะวิศวกรอิสระ","opening":"คณะวิศวกรเสนอร่วมตรวจงานบำรุงรักษาทางเข้าเมือง โดยขอให้เทศบาลจัดงบประสานงาน","good":"คณะวิศวกรชื่นชมการเปิดข้อมูลและขอแลกเปลี่ยนแนวทาง","conflict":"ผู้รับเหมาคัดค้านการตรวจที่อาจกระทบสัญญาเดิม","returning":"รายงานตรวจชุดใหม่มีข้อโต้แย้งจากคู่สัญญา","tone":"normal"},{"category":"image","id":"festival-photo","title":"ภาพถ่ายจากงานชุมชน","actor":"ชมรมถ่ายภาพ","opening":"ชมรมถ่ายภาพอยากเชิญนายกถ่ายภาพกับครอบครัวในงานชุมชน ขอสมทบค่าอุปกรณ์เล็กน้อย","good":"ภาพจากงานได้รับคำชม ชมรมส่งอัลบั้มมาให้สำนักงาน","conflict":"ผู้ร่วมงานตั้งคำถามว่าการจัดงานให้ความสำคัญกับผู้สนับสนุนมากเกินไป","returning":"สื่อขอคำชี้แจงเรื่องรายชื่อผู้ได้รับเชิญ","tone":"warm"},{"category":"image","id":"reporter","title":"นักข่าวที่ไม่ยอมปล่อย","actor":"นักข่าวท้องถิ่น","opening":"นักข่าวขอสัมภาษณ์เรื่องแผนใช้งบเมือง และเสนอให้เผยแพร่คำถามล่วงหน้า","good":"นักข่าวเผยแพร่บทสัมภาษณ์และขอให้เทศบาลเป็นตัวอย่างการสื่อสาร","conflict":"นักข่าวได้รับข้อร้องเรียนใหม่และขอเอกสารเพิ่มเติม","returning":"คลิปเก่าถูกนำกลับมาเผยแพร่พร้อมคำถามจากผู้ชม","tone":"crisis"},{"category":"image","id":"birthday","title":"วันเกิดท่านนายก","actor":"กลุ่มชาวเมือง","opening":"ชาวเมืองออกเงินกันเองจัดงานวันเกิดเล็ก ๆ และเชิญนายกมาร่วมงาน ขอเพียงค่าอุปกรณ์ส่วนกลาง","good":"ชุมชนส่งการ์ดและภาพงานมาให้ เป็นของขวัญที่ไม่ได้ขอสิทธิใด","conflict":"มีผู้ตั้งคำถามเรื่องค่าใช้จ่ายและรายชื่อผู้ร่วมงาน","returning":"ผู้จัดขอชี้แจงยอดเงินที่ยังไม่ตรงกับใบเสร็จ","tone":"warm"},{"category":"image","id":"student","title":"จดหมายจากเด็กน้อย","actor":"ชมรมเยาวชน","opening":"เด็ก ๆ ส่งภาพวาดเมืองมาให้และชวนนายกเยี่ยมชมงานศิลปะ ขอสมทบทุนวัสดุ 10,000 บาท","good":"เด็ก ๆ ส่งภาพวาดพร้อมจดหมายขอบคุณ นายกได้รับเชิญไปชมผลงาน","conflict":"ผู้ปกครองขอให้ทุกโรงเรียนเข้าร่วมได้เท่ากัน","returning":"ครูขอให้ตรวจหลักเกณฑ์การคัดเลือกผลงานอีกครั้ง","tone":"warm"},{"category":"image","id":"rumor","title":"ข่าวลือหน้าศาลาว่าการ","actor":"สื่อชุมชน","opening":"สื่อชุมชนขอคำชี้แจงหลังมีคนเผยแพร่ข่าวลือเกี่ยวกับรายจ่ายสำนักงาน ยังไม่มีหลักฐานยืนยัน","good":"สื่อชุมชนเผยแพร่คำชี้แจงที่ตรวจสอบได้","conflict":"ผู้ร้องไม่พอใจและส่งเรื่องให้สื่อจังหวัด","returning":"แหล่งข่าวเปิดเอกสารอีกชุดซึ่งต้องตรวจสอบเพิ่มเติม","tone":"normal"},{"category":"fame","id":"foodfest","title":"เทศกาลรสชาติเมือง","actor":"ชมรมอาหารพื้นถิ่น","opening":"ชมรมอาหารชวนเมืองร่วมจัดเทศกาล โดยขอให้ร้านเล็กมีพื้นที่ขายด้วย","good":"งานได้รับความสนใจจากผู้มาเยือน ชมรมขอส่งผลงานเข้าประกวด","conflict":"ร้านที่ไม่ได้พื้นที่ร้องขอให้เปิดเผยเกณฑ์คัดเลือก","returning":"ผู้จัดงานรายเดิมขอเปลี่ยนเงื่อนไขพื้นที่ในรอบถัดไป","tone":"warm"},{"category":"fame","id":"film","title":"เมืองบนจอภาพยนตร์","actor":"คณะถ่ายทำ","opening":"คณะถ่ายทำขอใช้สถานที่เมือง และเสนอให้ประชาชนมีส่วนร่วม","good":"ผู้ผลิตส่งจดหมายขอบคุณและเผยแพร่ผลงานเมือง","conflict":"ชุมชนร้องเรียนเรื่องการใช้สถานที่และการประชาสัมพันธ์","returning":"ผู้ผลิตขอแก้เงื่อนไขการใช้ภาพเมือง","tone":"normal"},{"category":"fame","id":"rival","title":"เมืองเพื่อนบ้าน","actor":"เทศบาลเมืองคู่แข่ง","opening":"เมืองข้างเคียงชวนร่วมกิจกรรมท่องเที่ยว แต่ผู้ประกอบการบางรายอยากให้เมืองโปรโมตตัวเองเท่านั้น","good":"เมืองคู่แข่งชื่นชมความร่วมมือและเสนอจัดงานร่วมอีกครั้ง","conflict":"ฝ่ายจัดงานโต้แย้งเรื่องส่วนแบ่งพื้นที่ประชาสัมพันธ์","returning":"สื่อพบว่าทั้งสองเมืองใช้ข้อมูลเปรียบเทียบคนละชุด","tone":"normal"},{"category":"fame","id":"clean-coast","title":"ชายหาดของทุกคน","actor":"กลุ่มอนุรักษ์ชายฝั่ง","opening":"อาสาสมัครชวนจัดกิจกรรมเก็บขยะริมชายฝั่ง พร้อมเปิดรับผู้สนับสนุนที่ลงทะเบียนได้","good":"อาสาสมัครส่งภาพกิจกรรมและได้รับความสนใจจากสื่อ","conflict":"ผู้สนับสนุนขอพื้นที่ป้ายโฆษณาเพิ่ม ขณะที่อาสาสมัครคัดค้าน","returning":"กลุ่มอนุรักษ์ขอทบทวนเงื่อนไขก่อนจัดงานครั้งต่อไป","tone":"warm"},{"category":"fame","id":"guide","title":"คู่มือเที่ยวเมือง","actor":"สมาคมที่พัก","opening":"สมาคมที่พักขอทำคู่มือเที่ยวเมือง โดยมีร้านและโรงแรมเสนอข้อมูลเข้ามา","good":"คู่มือได้รับคำชมและสื่อขอนำไปใช้ประกอบการเที่ยว","conflict":"ร้านรายย่อยร้องเรียนว่าคู่มือให้พื้นที่ไม่เท่าเทียม","returning":"ผู้จัดขอให้ผู้สนับสนุนเลือกเนื้อหาบางส่วนเอง","tone":"normal"},{"category":"government","id":"model","title":"นายกต้นแบบ","actor":"คณะทำงานจังหวัด","opening":"จังหวัดเชิญเทศบาลแลกเปลี่ยนวิธีบริหารเมือง ขอส่งรายงานและสมทบค่าเดินทางทีมงาน","good":"จังหวัดชื่นชมการทำงานและเสนอทุนขยายผลตามหลักเกณฑ์","conflict":"เจ้าหน้าที่ขอคำชี้แจงข้อมูลที่ไม่ตรงกันก่อนรับรอง","returning":"คณะประเมินขอเอกสารต้นฉบับเพิ่มก่อนประกาศผล","tone":"normal"},{"category":"government","id":"aid","title":"เมืองช่วยเมือง","actor":"หน่วยประสานจังหวัด","opening":"จังหวัดขอความร่วมมือช่วยพื้นที่อื่นผ่านกองทุนกลาง โดยเปิดเผยรายชื่อผู้สมทบ","good":"จังหวัดส่งหนังสือขอบคุณและชวนร่วมเครือข่ายช่วยเหลือ","conflict":"หน่วยประสานงานขอทบทวนคำมั่นที่เทศบาลเคยให้","returning":"ผู้ตรวจสอบขอรายละเอียดการจัดสรรกองทุน","tone":"warm"},{"category":"government","id":"grant","title":"ทุนพัฒนาโปร่งใส","actor":"ฝ่ายงบประมาณจังหวัด","opening":"จังหวัดเสนอให้เทศบาลส่งแผนพัฒนาเพื่อพิจารณาทุนตามสิทธิ ต้องใช้ข้อมูลที่ตรวจสอบได้","good":"ฝ่ายงบประมาณชื่นชมเอกสารและเชิญเข้ารอบทุนสนับสนุน","conflict":"ผู้ประเมินทักท้วงข้อมูลบางรายการและพักการพิจารณา","returning":"จังหวัดแจ้งว่าต้องชี้แจงข้อมูลเดิมก่อนพิจารณารอบใหม่","tone":"normal"},{"category":"government","id":"visit","title":"คณะเยี่ยมชมเมือง","actor":"คณะศึกษาดูงาน","opening":"คณะศึกษาดูงานขอเยี่ยมชมเทศบาลและพบตัวแทนประชาชน","good":"คณะดูงานส่งคำชมและเสนอเผยแพร่แนวทางของเมือง","conflict":"ผู้ร่วมคณะขอข้อมูลเรื่องค่าใช้จ่ายในการรับรอง","returning":"ฝ่ายประสานขอปรับกำหนดการและเกณฑ์การเข้าร่วม","tone":"warm"},{"category":"government","id":"inspection","title":"หนังสือจากจังหวัด","actor":"ผู้ตรวจราชการสมมติ","opening":"ผู้ตรวจราชการแจ้งว่าจะทบทวนขั้นตอนงบประมาณของเมือง และเปิดโอกาสให้เทศบาลส่งข้อมูล","good":"ผู้ตรวจแจ้งว่าการประสานงานเป็นไปด้วยดี","conflict":"ผู้ตรวจพบข้อสงสัยและกำหนดรอบชี้แจง","returning":"เอกสารใหม่ทำให้ต้องทบทวนข้อสรุปเดิม","tone":"crisis"},{"category":"people","id":"festival","title":"เทศกาลเล็ก ๆ ของเรา","actor":"คณะกรรมการชุมชน","opening":"ชาวเมืองรวมตัวจัดงานเทศกาลด้วยเงินของตนเอง ขอให้นายกสมทบ 30,000 บาท หรือมาร่วมเปิดงาน","good":"ชาวเมืองส่งภาพงานและจดหมายขอบคุณ เด็ก ๆ อยากทำกิจกรรมอีกปีหน้า","conflict":"ชุมชนอีกฝั่งขอสิทธิใช้พื้นที่จัดงานเท่าเทียมกัน","returning":"คณะจัดงานขอทบทวนการแบ่งพื้นที่ก่อนจัดรอบถัดไป","tone":"warm"},{"category":"people","id":"park","title":"สวนของครอบครัว","actor":"กลุ่มครอบครัว","opening":"กลุ่มครอบครัวชวนทำกิจกรรมดูแลสวนเดิม ไม่ได้ขอสร้างสวนเพิ่ม","good":"ครอบครัวส่งคำขอบคุณและอาสาดูแลกิจกรรมต่อเอง","conflict":"ผู้ใช้สวนบางกลุ่มขอให้เปิดพื้นที่ให้ทุกคนเข้าถึง","returning":"กลุ่มอาสาขอทบทวนตารางใช้พื้นที่ที่ยังไม่ลงตัว","tone":"warm"},{"category":"people","id":"coast","title":"เสียงจากชายฝั่ง","actor":"กลุ่มนักอนุรักษ์สิ่งแวดล้อม","opening":"กลุ่มทุนสนใจพัฒนาพื้นที่ริมทะเล ขณะกลุ่มอนุรักษ์ขอให้เปิดข้อมูลผลกระทบก่อนตัดสินใจ","good":"นักอนุรักษ์ชื่นชมการรับฟังและเสนอร่วมติดตามโครงการ","conflict":"นักอนุรักษ์ประกาศชุมนุมและเรียกร้องให้เปิดข้อตกลง","returning":"คนกลางที่เคยช่วยถูกตั้งคำถามเรื่องความเกี่ยวข้องกับกลุ่มทุน","tone":"crisis"},{"category":"people","id":"noise","title":"เพื่อนบ้านกับเสียงเพลง","actor":"ตัวแทนชุมชน","opening":"ชาวบ้านร้องเรียนเสียงจากกิจกรรมกลางคืน แต่ร้านค้าขอให้คงพื้นที่ทำมาหากิน","good":"ทั้งสองฝ่ายส่งข้อความขอบคุณที่ได้พูดคุยร่วมกัน","conflict":"ชุมชนแจ้งว่าเงื่อนไขที่ตกลงยังไม่เป็นที่ยอมรับ","returning":"มีคำร้องใหม่เรื่องการจัดกิจกรรมที่ไม่ตรงข้อตกลง","tone":"normal"},{"category":"people","id":"family","title":"กองทุนเด็กและครอบครัว","actor":"มูลนิธิชุมชน","opening":"มูลนิธิชวนร่วมจัดกิจกรรมเด็ก โดยเปิดให้ทุกชุมชนเข้าถึงได้ตามเกณฑ์เดียวกัน","good":"ครอบครัวส่งภาพกิจกรรมและคำขอบคุณ","conflict":"ผู้ปกครองบางส่วนขอให้ทบทวนเกณฑ์เข้าร่วม","returning":"มูลนิธิได้รับคำร้องเรื่องรายชื่อผู้รับสิทธิ","tone":"warm"},{"category":"business","id":"restaurants","title":"สงครามสมาคมร้านอาหาร","actor":"ประธานสมาคมร้านอาหาร","opening":"สมาคมขอให้เทศบาลช่วยค่าใช้จ่าย 100,000 บาท และเตือนว่าร้านสมาชิกอาจหยุดบริการหากไม่ได้รับคำตอบ","good":"สมาคมขอบคุณที่หารือและเสนอร่วมจัดกิจกรรมอาหาร","conflict":"สมาคมยื่นคำขาดขอเงิน 100,000 บาท มิฉะนั้นร้านสมาชิกบางส่วนจะหยุดให้บริการ","returning":"ร้านที่หยุดบริการเรียกร้องชดเชยเพิ่มเป็น 200,000 บาท และยังไม่ยอมรับข้อเสนอเดิม","tone":"crisis"},{"category":"business","id":"market","title":"ร้านเล็กกับผู้ค้ารายใหญ่","actor":"สมาคมร้านค้ารายย่อย","opening":"สมาคมขอให้เทศบาลจัดเกณฑ์สนับสนุนร้านเล็ก ขณะที่ผู้ค้ารายใหญ่ขอพื้นที่ประชาสัมพันธ์","good":"ร้านรายย่อยส่งหนังสือขอบคุณและเสนอจัดตลาดร่วม","conflict":"ผู้ค้ารายใหญ่กดดันให้เปลี่ยนเกณฑ์สนับสนุน","returning":"สมาคมนำข้อร้องเรียนเก่ากลับมาให้คณะกรรมการตรวจสอบ","tone":"normal"},{"category":"business","id":"hotel","title":"เจ้าบ้านของนักท่องเที่ยว","actor":"สมาคมโรงแรม","opening":"สมาคมโรงแรมชวนอบรมต้อนรับนักท่องเที่ยว ขอให้เทศบาลช่วยค่าอบรม","good":"สมาคมส่งคำขอบคุณและเสนอร่วมประชาสัมพันธ์เมือง","conflict":"ผู้ประกอบการบางรายร้องเรียนว่าไม่ได้รับสิทธิเท่าเทียม","returning":"ผู้จัดขอปรับเกณฑ์ผู้เข้าร่วมอีกครั้ง","tone":"warm"},{"category":"business","id":"supplier","title":"คู่ค้ารายใหม่","actor":"เครือข่ายผู้ค้าส่ง","opening":"ผู้ค้าส่งเสนอให้เมืองประสานร้านค้าหลายรายเพื่อซื้อวัตถุดิบร่วมกัน","good":"ร้านค้ารายย่อยรายงานว่าการหารือช่วยให้มีทางเลือกมากขึ้น","conflict":"ผู้ค้าส่งขอสิทธิผูกขาดและขู่ว่าจะถอนตัว","returning":"ผู้ค้าคู่แข่งยื่นคำร้องเกี่ยวกับข้อตกลงรอบก่อน","tone":"normal"},{"category":"business","id":"music","title":"คืนดนตรีของเมือง","actor":"ผู้จัดงานดนตรี","opening":"ผู้จัดงานขอร่วมจัดกิจกรรมดนตรีในสถานที่เดิม โดยขอความร่วมมือกับชุมชน","good":"งานได้รับเสียงตอบรับดีและผู้จัดเสนอทำกิจกรรมร่วมอีกครั้ง","conflict":"ชุมชนและผู้จัดโต้แย้งเรื่องเงื่อนไขเวลาและพื้นที่","returning":"ผู้จัดนำข้อเรียกร้องเรื่องค่าเสียหายกลับมาเจรจา","tone":"normal"},{"category":"integrity","id":"two-million","title":"เงาเงินสองล้าน","actor":"กลุ่มทุนพัฒนาเมือง","opening":"กลุ่มทุนเสนอเงิน 2,000,000 บาทเข้าคลัง แลกกับการใช้เงื่อนไขสัญญาฉบับเดิมที่ฝ่ายกฎหมายทักท้วง","good":"หน่วยตรวจสอบชื่นชมการเปิดข้อมูลและขอแลกเปลี่ยนแนวทาง","conflict":"คู่แข่งร้องเรียนสัญญา และสื่อถามถึงเงินสนับสนุนที่รับไว้","returning":"เอกสารข้อตกลงฉบับเก่าปรากฏขึ้นอีกครั้ง ผู้ตรวจขอคำชี้แจงรอบสุดท้าย","tone":"crisis"},{"category":"integrity","id":"donation","title":"ผู้บริจาคไม่ประสงค์ออกนาม","actor":"คณะตรวจสอบเมือง","opening":"มีผู้เสนอเงินสนับสนุนโดยไม่ระบุชื่อ ขอให้เทศบาลตอบก่อนส่งเอกสาร","good":"คณะตรวจสอบชื่นชมการกำหนดหลักเกณฑ์รับเงิน","conflict":"ผู้ให้ทุนขอให้ยกเว้นขั้นตอนบางส่วน และผู้ตรวจตั้งคำถาม","returning":"พบเอกสารที่ระบุเงื่อนไขเพิ่มเติมจากผู้ให้ทุน","tone":"crisis"},{"category":"integrity","id":"open-ledger","title":"บัญชีที่ประชาชนอ่านได้","actor":"ชมรมตรวจสอบงบ","opening":"ชมรมขอให้เทศบาลเปิดข้อมูลรายรับรายจ่ายและเสนออาสาช่วยจัดเอกสาร","good":"ประชาชนส่งคำชมและเสนอร่วมดูแลการเผยแพร่ข้อมูล","conflict":"มีผู้ร้องเรียนว่าข้อมูลบางรายการยังไม่ปรากฏในรายงาน","returning":"คณะตรวจสอบขอเทียบข้อมูลกับเอกสารต้นฉบับ","tone":"normal"},{"category":"integrity","id":"gift","title":"ของขวัญหน้าสำนักงาน","actor":"เครือข่ายผู้ประกอบการ","opening":"ผู้ประกอบการส่งของขวัญและขอให้นายกกำหนดวิธีรับหรือส่งคืนตามหลักเกณฑ์","good":"ผู้ประกอบการยอมทำตามระเบียบและส่งคำขอบคุณ","conflict":"ผู้ให้ของขวัญขอให้เก็บเรื่องเป็นส่วนตัว","returning":"สื่อได้รับข้อมูลว่ามีการติดต่อเรื่องของขวัญก่อนหน้านี้","tone":"normal"},{"category":"integrity","id":"volunteer","title":"รางวัลคนทำงานเปิดเผย","actor":"เครือข่ายอาสาตรวจสอบ","opening":"เครือข่ายอาสาชวนทำกิจกรรมสอนอ่านงบประมาณให้ประชาชน ขอสมทบค่าเอกสาร","good":"อาสาสมัครส่งจดหมายขอบคุณและนำเสนอผลงานต่อจังหวัด","conflict":"ผู้เข้าร่วมขอให้เปิดโอกาสให้คนอื่นตรวจเอกสารด้วย","returning":"คณะจัดงานขอทบทวนวิธีเผยแพร่ข้อมูลที่ยังไม่ครบ","tone":"warm"}];
MAYOR_STORY_ARCS.push(...[{"category":"admin","id":"extra-night-shift","title":"กาแฟของกะดึก","actor":"ทีมเจ้าหน้าที่กลางคืน","tone":"warm","opening":"เจ้าหน้าที่กะดึกขอจัดมุมพักในสำนักงานเดิม หลังทำงานต่อเนื่องหลายคืน","funded":"สมทบอุปกรณ์มุมพัก","free":"แวะขอบคุณและใช้วัสดุเดิม","risk":"บอกให้ทุกคนอดทนเพราะเป็นหน้าที่","good":"ทีมกะดึกส่งภาพมุมพักและข้อความขอบคุณ","conflict":"ตัวแทนแจ้งว่าเจ้าหน้าที่เริ่มขอลาเพราะปัญหาเวลาพัก","repair":"ปรับตารางพักและช่วยอุปกรณ์","final":"ฝ่ายบุคคลขอข้อสรุปตารางเวร","cost":8000,"reward":0,"temptation":0,"custom":true},{"category":"admin","id":"extra-queue","title":"วันประชาชนเต็มสำนักงาน","actor":"ฝ่ายบริการประชาชน","tone":"normal","opening":"มีคำร้องเรื่องรอคิวเอกสาร เจ้าหน้าที่เสนอทดลองระบบนัดหมายโดยไม่สร้างอาคารเพิ่ม","funded":"จัดงบอุปกรณ์คิว","free":"ทดลองแบ่งรอบนัดหมายด้วยทีมเดิม","risk":"สั่งหยุดรับคำร้องที่ยังค้าง","good":"ผู้ใช้บริการส่งคำชมหลังทดลองจัดคิว","conflict":"ประชาชนบางกลุ่มไม่ได้รับคิวและขอคำอธิบาย","repair":"จัดรอบเพิ่มเติมและเปิดเกณฑ์คิว","final":"ฝ่ายบริการขอมาตรฐานการรับคิว","cost":35000,"reward":0,"temptation":0,"custom":true},{"category":"admin","id":"extra-lost-map","title":"แผนที่หายไปไหน","actor":"ฝ่ายสำรวจเมือง","tone":"normal","opening":"แผนที่ประกอบการวางแผนมีสองฉบับ ผู้รับเหมาเสนอเงินหากใช้ฉบับของเขา","funded":"จ้างตรวจเทียบเอกสาร","free":"ให้ทีมสำรวจเทียบทะเบียนเดิม","risk":"รับเงิน 900,000 บาทและใช้ฉบับผู้รับเหมา","good":"วิศวกรชมการจัดเอกสารที่ตรวจสอบได้","conflict":"คู่สัญญาทักท้วงแนวเขตและขอตรวจสอบ","repair":"เปิดต้นฉบับและตรวจแนวเขต","final":"คณะกรรมการขอให้รับรองข้อมูลที่ตรวจสอบแล้ว","cost":45000,"reward":120000,"temptation":900000,"custom":true},{"category":"admin","id":"extra-rain-drill","title":"ซ้อมก่อนฝนมา","actor":"ทีมอาสาภัยพิบัติ","tone":"normal","opening":"อาสาสมัครขอฝึกประสานงานรับมือฝนหนักโดยใช้สถานที่เดิม","funded":"ช่วยอุปกรณ์ฝึก","free":"ให้เจ้าหน้าที่ร่วมซ้อมและบันทึกบทเรียน","risk":"ยกเลิกโดยไม่หารือ","good":"อาสาสมัครส่งสรุปการซ้อมและขอเผยแพร่บทเรียน","conflict":"อาสาสมัครขอคำชี้แจงเรื่องความพร้อม","repair":"จัดวันซ้อมใหม่และเชิญชุมชน","final":"ทีมประสานขอแผนซ้อมที่ชัดเจน","cost":25000,"reward":100000,"temptation":0,"custom":true},{"category":"admin","id":"extra-office-favor","title":"ตำแหน่งของคนรู้จัก","actor":"ฝ่ายบุคคล","tone":"crisis","opening":"ผู้มีอุปการคุณเสนอเงินแลกกับการแต่งตั้งคนรู้จักเข้าทีมโดยไม่แข่งขัน","funded":"จ้างผู้ประเมินอิสระ","free":"เปิดรับสมัครผ่านคณะกรรมการเดิม","risk":"รับเงิน 1,500,000 บาทและอนุมัติรายชื่อที่เสนอ","good":"ฝ่ายบุคคลได้รับคำชมเรื่องการคัดเลือก","conflict":"ผู้สมัครร้องเรียนการแต่งตั้งและส่งหลักฐานให้จังหวัด","repair":"จัดการประเมินใหม่โดยอิสระ","final":"จังหวัดขอคำชี้แจงการแต่งตั้ง","cost":60000,"reward":0,"temptation":1500000,"custom":true},{"category":"image","id":"extra-grandma","title":"ขนมจากคุณยาย","actor":"ชมรมผู้สูงอายุ","tone":"warm","opening":"คุณยายทำขนมมาให้เจ้าหน้าที่และเชิญนายกมาชิมในงานชุมชน","funded":"ช่วยค่าวัตถุดิบงานชมรม","free":"แวะชิมและพูดคุยกับสมาชิก","risk":"ให้คนไปรับแทนโดยไม่ตอบคำเชิญ","good":"ชมรมส่งสูตรขนมและการ์ดขอบคุณ","conflict":"สมาชิกเข้าใจว่านายกไม่สนใจกิจกรรม","repair":"แวะพบสมาชิกและร่วมกิจกรรม","final":"ชมรมขอแนวทางติดต่อครั้งต่อไป","cost":5000,"reward":0,"temptation":0,"custom":true},{"category":"image","id":"extra-raincoat","title":"เสื้อกันฝนสีเหลือง","actor":"นักเรียนอาสา","tone":"warm","opening":"นักเรียนชวนเก็บขยะหลังฝนและขอสมทบค่าเสื้อกันฝน","funded":"ช่วยค่าเสื้อกันฝน","free":"ร่วมกิจกรรมด้วยอุปกรณ์ส่วนตัว","risk":"ปฏิเสธว่างานไม่สำคัญ","good":"เด็กส่งภาพกิจกรรมและข้อความขอบคุณ","conflict":"ครูขอชี้แจงคำพูดที่ทำให้เด็กเสียกำลังใจ","repair":"พบเด็กและช่วยอุปกรณ์ตามจริง","final":"โรงเรียนขอคำตอบเรื่องกิจกรรมครั้งหน้า","cost":12000,"reward":0,"temptation":0,"custom":true},{"category":"image","id":"extra-edited-clip","title":"คลิปสิบวินาที","actor":"สำนักข่าวออนไลน์","tone":"crisis","opening":"คลิปนายกถูกตัดจนความหมายเปลี่ยน บริษัทเสนอเงินแลกสิทธิควบคุมคำชี้แจง","funded":"จ้างถอดคำพูดและเผยแพร่ต้นฉบับ","free":"เปิดคลิปเต็มและตอบคำถามเอง","risk":"รับเงิน 700,000 บาทและให้บริษัทจัดคำชี้แจง","good":"ผู้ชมขอบคุณที่ได้เห็นคลิปเต็ม","conflict":"นักข่าวพบผลประโยชน์เกี่ยวข้องกับบริษัทและขอสัญญา","repair":"เปิดสัญญาและแถลงข้อเท็จจริง","final":"สำนักข่าวขอคำตอบก่อนเผยแพร่บทตรวจสอบ","cost":20000,"reward":0,"temptation":700000,"custom":true},{"category":"image","id":"extra-photo-op","title":"รูปเดียวหน้าเวที","actor":"ผู้จัดงานการกุศล","tone":"normal","opening":"ผู้สนับสนุนอยากให้นายกถ่ายภาพกับป้ายบริษัทแทนผู้รับความช่วยเหลือ","funded":"ช่วยค่าเวทีโดยไม่รับพื้นที่พิเศษ","free":"ร่วมงานโดยให้ชุมชนเป็นหลัก","risk":"รับเงิน 450,000 บาทและให้พื้นที่ถ่ายภาพตามคำขอ","good":"ผู้จัดส่งภาพอาสาสมัครและคำขอบคุณ","conflict":"อาสาสมัครร้องเรียนว่าภาพงานกลายเป็นโฆษณา","repair":"เผยแพร่ภาพจริงและชี้แจงสิทธิ","final":"ผู้จัดขอข้อยุติเรื่องการใช้ภาพ","cost":15000,"reward":0,"temptation":450000,"custom":true},{"category":"image","id":"extra-apology","title":"คำพูดที่หลุดไป","actor":"ตัวแทนชุมชน","tone":"normal","opening":"ตัวแทนขอพบหลังคำกล่าวของสำนักงานทำให้คนรู้สึกถูกมองข้าม","funded":"จัดวงรับฟังพร้อมค่าเดินทาง","free":"พบตัวแทนและอธิบายเอง","risk":"ตำหนิผู้ร้องว่าทำเมืองเสียภาพลักษณ์","good":"ตัวแทนส่งข้อความว่าพูดคุยแล้วเข้าใจกัน","conflict":"ผู้ร้องส่งเรื่องให้สื่อเพราะคำชี้แจงไม่ตรงประเด็น","repair":"จัดวงสนทนาและบันทึกข้อสรุป","final":"ชุมชนขอแนวทางสื่อสารครั้งต่อไป","cost":18000,"reward":0,"temptation":0,"custom":true},{"category":"fame","id":"extra-kite","title":"ว่าวเหนือเมือง","actor":"ชมรมว่าวพื้นบ้าน","tone":"warm","opening":"ชมรมชวนจัดงานว่าวเล็ก ๆ และขอวัสดุสำหรับเด็ก","funded":"สมทบค่าว่าว","free":"ร่วมเปิดงานโดยไม่ใช้งบ","risk":"บอกว่างานเล็กเกินไป","good":"ชมรมส่งภาพว่าวรูปเมือง","conflict":"สมาชิกเสียใจที่กิจกรรมไม่ได้รับการรับฟัง","repair":"พบชมรมและช่วยกิจกรรม","final":"ชมรมขอคำตอบก่อนจัดงานครั้งหน้า","cost":20000,"reward":0,"temptation":0,"custom":true},{"category":"fame","id":"extra-postcard","title":"โปสการ์ดจากนักเดินทาง","actor":"กลุ่มนักเดินทาง","tone":"warm","opening":"นักเดินทางส่งโปสการ์ดภาพเมืองและเสนอทำสมุดความทรงจำแบบไม่หวังกำไร","funded":"สมทบค่าพิมพ์","free":"อนุญาตเผยแพร่ภาพสาธารณะตามเกณฑ์เดิม","risk":"เรียกเก็บค่าประชาสัมพันธ์โดยไม่มีเกณฑ์","good":"กลุ่มนักเดินทางส่งสมุดภาพฉบับแรก","conflict":"ผู้ร่วมโครงการทักท้วงค่าใช้จ่ายและระงับเผยแพร่","repair":"ทบทวนค่าธรรมเนียมและช่วยค่าพิมพ์","final":"กลุ่มขอระบุสิทธิการใช้ภาพชัดเจน","cost":9000,"reward":0,"temptation":0,"custom":true},{"category":"fame","id":"extra-marathon","title":"เส้นชัยของทุกคน","actor":"ชมรมวิ่ง","tone":"normal","opening":"ชมรมวิ่งเสนอจัดกิจกรรมในพื้นที่เดิม ขอความร่วมมือเรื่องเวลาและทางเดิน","funded":"ช่วยค่าป้ายและทีมประสาน","free":"ให้ชมรมเสนอแผนแก่ชุมชน","risk":"รับ 800,000 บาทแลกสิทธิชื่อเมืองโดยไม่เปิดเกณฑ์","good":"ชมรมส่งรายงานและหนังสือชมจากจังหวัด","conflict":"ผู้จัดรายอื่นคัดค้านสิทธิใช้ชื่อเมือง","repair":"ทบทวนสิทธิผู้สนับสนุนและรับฟังความเห็น","final":"จังหวัดขอข้อตกลงที่เท่าเทียม","cost":55000,"reward":180000,"temptation":800000,"custom":true},{"category":"fame","id":"extra-chef","title":"เชฟกลับบ้าน","actor":"ชมรมศิษย์เก่า","tone":"warm","opening":"เชฟที่เคยอยู่ในเมืองกลับมาสอนทำอาหารให้เยาวชนฟรี","funded":"ช่วยค่าวัตถุดิบ","free":"รวบรวมวัตถุดิบจากอาสาสมัคร","risk":"เรียกเก็บเงินเพื่อใช้ชื่อเมือง","good":"เยาวชนส่งภาพอาหารและเชฟขอเผยแพร่ผลงาน","conflict":"เชฟระงับกิจกรรมเพราะเข้าใจเงื่อนไขไม่ตรงกัน","repair":"คืนเงื่อนไขเดิมและช่วยวัตถุดิบ","final":"ชมรมขอยืนยันกิจกรรมรอบถัดไป","cost":22000,"reward":0,"temptation":0,"custom":true},{"category":"fame","id":"extra-award-rig","title":"รางวัลที่ซื้อได้","actor":"ผู้จัดประกวดเมือง","tone":"crisis","opening":"ผู้จัดเสนอเงินหากเทศบาลยอมให้ใช้ตัวเลขที่ยังไม่ผ่านการตรวจ","funded":"จ้างตรวจข้อมูลก่อนสมัคร","free":"ส่งข้อมูลจริงและยอมรับผล","risk":"รับเงิน 1,200,000 บาทและอนุมัติข้อมูลที่เสนอ","good":"กรรมการชมการส่งข้อมูลที่ตรวจสอบได้","conflict":"นักข่าวพบข้อมูลไม่ตรงต้นฉบับ","repair":"เปิดต้นฉบับและแก้ข้อความ","final":"ผู้จัดขอให้ยืนยันข้อมูลทางการ","cost":45000,"reward":250000,"temptation":1200000,"custom":true},{"category":"government","id":"extra-letter","title":"จดหมายขอบคุณจากจังหวัด","actor":"ฝ่ายประสานจังหวัด","tone":"warm","opening":"จังหวัดชวนส่งเรื่องอาสาสมัครเพื่อจัดทำหนังสือขอบคุณ","funded":"ช่วยค่าเอกสารและเดินทาง","free":"ส่งรายชื่อจากสำนักงานเดิม","risk":"ตัดชื่ออาสาสมัครเพื่อใส่ชื่อผู้บริหาร","good":"จังหวัดส่งหนังสือขอบคุณถึงอาสาสมัคร","conflict":"ตัวแทนทักท้วงรายชื่อที่ไม่ตรงผู้ทำงาน","repair":"แก้รายชื่อและส่งข้อมูลจริง","final":"จังหวัดขอรายชื่อฉบับรับรอง","cost":15000,"reward":0,"temptation":0,"custom":true},{"category":"government","id":"extra-deadline","title":"หนังสือที่มาช้า","actor":"ฝ่ายติดตามงบจังหวัด","tone":"normal","opening":"จังหวัดแจ้งเอกสารยังไม่ครบก่อนรอบพิจารณาทุน","funded":"อนุมัติค่าเตรียมเอกสาร","free":"ตรวจเอกสารและขอขยายเวลา","risk":"ส่งข้อมูลที่ยังไม่ตรวจให้ทันกำหนด","good":"จังหวัดรับเอกสารครบและแจ้งสิทธิเข้ารอบทุน","conflict":"ฝ่ายติดตามพบข้อมูลขัดกันและพักคำขอ","repair":"ส่งฉบับแก้และให้ผู้ตรวจทบทวน","final":"จังหวัดขอข้อสรุปก่อนปิดรอบทุน","cost":40000,"reward":250000,"temptation":0,"custom":true},{"category":"government","id":"extra-sister-city","title":"จดหมายจากเมืองพี่น้อง","actor":"สำนักงานความร่วมมือจังหวัด","tone":"normal","opening":"จังหวัดเสนอจับคู่เมืองแลกเปลี่ยนวิธีบริการประชาชน","funded":"ช่วยค่าเดินทางทีมงาน","free":"ประชุมแลกเปลี่ยนออนไลน์","risk":"เรียกสิทธิพิเศษนอกข้อตกลง","good":"เมืองคู่ร่วมงานส่งคำชม","conflict":"จังหวัดแจ้งอีกฝ่ายไม่ยอมรับข้อเรียกร้อง","repair":"กลับไปใช้ข้อตกลงเดิมและหารือ","final":"สำนักงานขอคำตอบก่อนลงนาม","cost":50000,"reward":200000,"temptation":0,"custom":true},{"category":"government","id":"extra-pressure","title":"โทรศัพท์ก่อนประกาศผล","actor":"ผู้ประสานงานสมมติ","tone":"crisis","opening":"บุคคลอ้างว่าประสานงานจังหวัดเสนอเงินแลกกับการประกาศสนับสนุนโครงการก่อนตรวจเอกสาร","funded":"จ้างตรวจอำนาจและเอกสาร","free":"ขอหนังสือยืนยันจากหน่วยงานโดยตรง","risk":"รับเงิน 2,000,000 บาทและประกาศสนับสนุน","good":"จังหวัดยืนยันช่องทางที่ถูกต้อง","conflict":"หน่วยงานแจ้งว่าบุคคลดังกล่าวไม่มีอำนาจเสนอเงื่อนไข","repair":"เปิดหนังสือติดต่อและส่งตรวจสอบ","final":"จังหวัดขอคำชี้แจงการประกาศและรับเงิน","cost":55000,"reward":0,"temptation":2000000,"custom":true},{"category":"government","id":"extra-forum","title":"เวทีเมืองเล็ก","actor":"คณะจัดเวทีจังหวัด","tone":"normal","opening":"จังหวัดเชิญนายกและตัวแทนชุมชนเข้าร่วมเวทีแลกเปลี่ยน","funded":"ช่วยค่าเดินทางตัวแทน","free":"ส่งตัวแทนโดยใช้ทรัพยากรเดิม","risk":"สงวนที่นั่งให้ผู้สนับสนุนสำนักงาน","good":"ผู้จัดส่งหนังสือชมข้อเสนอจากชุมชน","conflict":"ตัวแทนที่ไม่ได้เข้าร่วมขอทบทวนการจัดที่นั่ง","repair":"เปิดเกณฑ์และรับข้อเสนอผู้พลาดเวที","final":"จังหวัดขอข้อสรุปสิทธิครั้งถัดไป","cost":35000,"reward":150000,"temptation":0,"custom":true},{"category":"people","id":"extra-library","title":"หนังสือเล่มแรก","actor":"กลุ่มผู้ปกครอง","tone":"warm","opening":"ผู้ปกครองชวนจัดมุมแลกหนังสือในพื้นที่เดิม ขอทุนชั้นและป้าย","funded":"สมทบค่าชั้นหนังสือ","free":"รวบรวมหนังสือและวัสดุบริจาค","risk":"บอกให้ชุมชนเลิกกิจกรรม","good":"เด็กส่งการ์ดและภาพหนังสือที่นำมาแลก","conflict":"ผู้ปกครองขอทบทวนเพราะเด็กเตรียมกิจกรรมแล้ว","repair":"ประสานพื้นที่และสมทบวัสดุ","final":"ชุมชนขอกติกาใช้พื้นที่ร่วมกัน","cost":12000,"reward":0,"temptation":0,"custom":true},{"category":"people","id":"extra-stray","title":"บ้านชั่วคราวของเจ้าตูบ","actor":"กลุ่มอาสาดูแลสัตว์","tone":"warm","opening":"อาสาสมัครขอจัดวันดูแลสัตว์และหาบ้านในพื้นที่เดิม","funded":"ช่วยค่าอุปกรณ์และเวชภัณฑ์","free":"ประสานอาสาสมัครและผู้เชี่ยวชาญ","risk":"ปฏิเสธโดยไม่ฟังข้อเสนอ","good":"อาสาสมัครส่งภาพสัตว์ที่มีผู้รับดูแล","conflict":"เพื่อนบ้านร้องเรียนว่าไม่มีข้อตกลงพื้นที่","repair":"จัดประชุมชุมชนและช่วยอุปกรณ์","final":"ตัวแทนขอเงื่อนไขจัดกิจกรรม","cost":25000,"reward":0,"temptation":0,"custom":true},{"category":"people","id":"extra-waterfront","title":"ทางเดินของชาวประมง","actor":"ชาวประมงและนักอนุรักษ์","tone":"crisis","opening":"ผู้พัฒนาเสนอเงินแลกกับการรับรองสิทธิใช้พื้นที่ริมน้ำก่อนหารือชุมชน","funded":"จ้างประเมินและรับฟังชุมชน","free":"ชะลอการรับรองและเปิดรับข้อมูล","risk":"รับเงิน 1,800,000 บาทและรับรองสิทธิ","good":"ชุมชนขอบคุณที่ได้ร่วมกำหนดหลักเกณฑ์","conflict":"นักอนุรักษ์รวมตัวคัดค้านและขอเปิดเอกสาร","repair":"เปิดเอกสารและจัดการไกล่เกลี่ย","final":"จังหวัดขอข้อสรุปสิทธิพื้นที่เดิม","cost":70000,"reward":0,"temptation":1800000,"custom":true},{"category":"people","id":"extra-access","title":"ทางเข้าของทุกคน","actor":"ผู้สูงอายุและผู้พิการ","tone":"normal","opening":"ชุมชนขอสำรวจการเข้าถึงสถานที่เดิม ให้ผู้ใช้จริงร่วมตรวจ","funded":"ช่วยค่าตรวจและอุปกรณ์ชั่วคราว","free":"เดินสำรวจกับตัวแทน","risk":"ปฏิเสธเพราะผู้ร้องมีจำนวนน้อย","good":"ตัวแทนส่งข้อเสนอที่จัดลำดับแล้ว","conflict":"ตัวแทนขอจังหวัดช่วยรับฟังคำร้อง","repair":"จัดสำรวจร่วมและเผยแพร่ข้อสรุป","final":"ชุมชนขอแผนติดตามโดยไม่ผูกมัดสร้างตึก","cost":30000,"reward":100000,"temptation":0,"custom":true},{"category":"people","id":"extra-garden","title":"เมล็ดพันธุ์จากเพื่อนบ้าน","actor":"ชุมชนปลูกต้นไม้","tone":"warm","opening":"ชาวบ้านชวนแลกเมล็ดพันธุ์และดูแลพื้นที่สีเขียวเดิม","funded":"ช่วยค่าเมล็ดและเครื่องมือ","free":"ร่วมกิจกรรมและนำเมล็ดพันธุ์มาแลก","risk":"สั่งเลิกโดยไม่ชี้แจงเรื่องพื้นที่","good":"ชุมชนส่งต้นกล้าและจดหมายขอบคุณ","conflict":"อาสาสมัครขอพบเพราะถูกห้ามโดยไม่มีเหตุผล","repair":"หารือพื้นที่และช่วยวัสดุ","final":"ชุมชนขอเกณฑ์จัดกิจกรรมที่ทุกคนใช้ได้","cost":7000,"reward":0,"temptation":0,"custom":true},{"category":"business","id":"extra-bakery","title":"ขนมปังตอนเช้า","actor":"ชมรมร้านเบเกอรี่","tone":"warm","opening":"ร้านชวนแบ่งปันขนมจากสินค้าส่วนเกิน ไม่ขอสร้างร้านเพิ่ม","funded":"ช่วยค่าบรรจุภัณฑ์","free":"ประสานผู้รับและให้ร้านจัดเอง","risk":"เรียกค่าร่วมกิจกรรมโดยไม่แจ้งเกณฑ์","good":"ร้านส่งภาพและคำขอบคุณจากผู้รับ","conflict":"ร้านขอทบทวนค่าใช้จ่ายที่ไม่ตกลงไว้","repair":"แก้เกณฑ์และช่วยค่าบรรจุภัณฑ์","final":"ชมรมขอข้อตกลงก่อนกิจกรรมถัดไป","cost":10000,"reward":0,"temptation":0,"custom":true},{"category":"business","id":"extra-night-market","title":"ค่าพื้นที่ตลาดเย็น","actor":"กลุ่มผู้ค้าตลาดเย็น","tone":"normal","opening":"ผู้ค้าขอทบทวนเกณฑ์พื้นที่ ผู้ประสานรายใหญ่เสนอเงินหากได้เลือกผู้ค้าเอง","funded":"จ่ายค่าจัดทำเกณฑ์","free":"เปิดรับข้อเสนอจากทุกราย","risk":"รับเงิน 850,000 บาทและให้รายใหญ่เลือกผู้ค้า","good":"ผู้ค้าชื่นชมเกณฑ์เปิดเผย","conflict":"รายย่อยร้องเรื่องรายชื่อและขอเปิดข้อตกลง","repair":"ตรวจรายชื่อและจัดเกณฑ์ร่วม","final":"คณะประสานขอข้อสรุปการคัดเลือก","cost":30000,"reward":0,"temptation":850000,"custom":true},{"category":"business","id":"extra-factory-sound","title":"เสียงจากโรงงาน","actor":"ผู้ประกอบการและเพื่อนบ้าน","tone":"normal","opening":"ชุมชนร้องเรื่องเสียงจากกิจกรรมโรงงาน ผู้ประกอบการขอหารือช่วงเวลาและมาตรฐาน","funded":"ช่วยค่าตรวจวัดโดยผู้เชี่ยวชาญ","free":"ให้ทั้งสองฝ่ายหารือและส่งข้อมูล","risk":"รับเงิน 1,000,000 บาทและยุติรับคำร้อง","good":"ทั้งสองฝ่ายส่งข้อเสนอที่ตกลงร่วมกัน","conflict":"ชุมชนร้องว่าการยุติเรื่องไม่ตอบข้อกังวล","repair":"ตรวจข้อมูลอิสระและเปิดรับคำร้อง","final":"ฝ่ายประสานขอหลักเกณฑ์ยุติข้อพิพาท","cost":65000,"reward":0,"temptation":1000000,"custom":true},{"category":"business","id":"extra-apprentice","title":"เด็กฝึกงานคนแรก","actor":"ชมรมผู้ประกอบการรุ่นใหม่","tone":"warm","opening":"ชมรมเสนอแนะแนวอาชีพให้เยาวชนพบผู้ประกอบการ","funded":"ช่วยค่าเอกสารและวัสดุ","free":"ประสานสถานที่ให้ผู้ประกอบการร่วมจัด","risk":"ให้สิทธิเฉพาะครอบครัวผู้สนับสนุน","good":"เยาวชนส่งจดหมายขอบคุณ","conflict":"ผู้ปกครองร้องเรื่องเกณฑ์ไม่เท่าเทียม","repair":"เปิดเกณฑ์ใหม่และเพิ่มรอบกิจกรรม","final":"ชมรมขอข้อสรุปสิทธิเข้าร่วม","cost":18000,"reward":0,"temptation":0,"custom":true},{"category":"business","id":"extra-exclusive","title":"สัญญาที่ไม่มีคู่แข่ง","actor":"กลุ่มผู้ให้บริการเอกชน","tone":"crisis","opening":"บริษัทเสนอเงินแลกกับสิทธิประสานกิจกรรมเมืองเพียงรายเดียว","funded":"จ้างตรวจเงื่อนไขการแข่งขัน","free":"เปิดรับข้อเสนอจากหลายราย","risk":"รับเงิน 2,000,000 บาทและให้สิทธิรายเดียว","good":"รายย่อยชมการเปิดรับข้อเสนอทั่วไป","conflict":"คู่แข่งร้องเรียนและขอระงับสิทธิพิเศษ","repair":"เปิดข้อตกลงและจัดพิจารณาใหม่","final":"จังหวัดขอคำชี้แจงการเลือกผู้ให้บริการ","cost":80000,"reward":0,"temptation":2000000,"custom":true},{"category":"integrity","id":"extra-wallet","title":"กระเป๋าเงินที่เก็บได้","actor":"เจ้าหน้าที่ทำความสะอาด","tone":"warm","opening":"เจ้าหน้าที่เก็บกระเป๋าเงินได้และขอช่วยตามหาเจ้าของ","funded":"ช่วยค่าเอกสารประชาสัมพันธ์","free":"ลงทะเบียนของหายและประสานช่องทางเดิม","risk":"เก็บเป็นของสำนักงานโดยไม่ลงทะเบียน","good":"เจ้าของรับคืนและส่งจดหมายชมเจ้าหน้าที่","conflict":"ผู้แจ้งของหายขอหลักฐานการเก็บรักษา","repair":"ตรวจทะเบียนและส่งคืนตามหลักฐาน","final":"เจ้าหน้าที่ขอหลักเกณฑ์รับของหาย","cost":3000,"reward":0,"temptation":0,"custom":true},{"category":"integrity","id":"extra-invoice","title":"ใบเสร็จสองฉบับ","actor":"ฝ่ายบัญชีเทศบาล","tone":"normal","opening":"ฝ่ายบัญชีพบใบเสร็จยอดไม่ตรงกัน ผู้ส่งเสนอเงินให้ใช้ฉบับที่เบิกง่ายกว่า","funded":"จ้างตรวจเอกสาร","free":"ระงับรายการและขอต้นฉบับ","risk":"รับเงิน 600,000 บาทและอนุมัติฉบับที่เสนอ","good":"ฝ่ายบัญชีส่งรายงานที่ตรวจสอบแล้ว","conflict":"ผู้ตรวจขอคำอธิบายยอดเบิกและหลักฐาน","repair":"เปิดเอกสารและให้ผู้ตรวจอิสระทบทวน","final":"คณะตรวจสอบขอรับรองยอดที่แก้ไข","cost":25000,"reward":0,"temptation":600000,"custom":true},{"category":"integrity","id":"extra-whistle","title":"ซองจดหมายที่ไม่ลงชื่อ","actor":"เจ้าหน้าที่ผู้แจ้งเบาะแส","tone":"crisis","opening":"จดหมายแจ้งข้อสงสัยจัดซื้อ ผู้เกี่ยวข้องเสนอเงินหากปิดเรื่องโดยไม่ตรวจ","funded":"ตั้งคณะตรวจสอบและกันงบ","free":"รักษาข้อมูลผู้แจ้งและตรวจเอกสาร","risk":"รับเงิน 1,700,000 บาทและปิดเรื่อง","good":"ฝ่ายตรวจสอบได้ข้อเท็จจริงเพิ่ม","conflict":"ผู้แจ้งส่งหลักฐานให้หน่วยงานภายนอกหลังเรื่องถูกปิด","repair":"เปิดการตรวจใหม่และรักษาข้อมูลผู้แจ้ง","final":"คณะตรวจสอบขอคำชี้แจงการปิดเรื่องครั้งก่อน","cost":50000,"reward":0,"temptation":1700000,"custom":true},{"category":"integrity","id":"extra-scholarship","title":"ทุนที่ไม่มีเงื่อนไข","actor":"มูลนิธิการศึกษา","tone":"warm","opening":"มูลนิธิเสนอทุนกิจกรรมเยาวชนผ่านระบบเปิดเผย มีเกณฑ์และเอกสารครบ","funded":"ช่วยค่าเตรียมเอกสาร","free":"ให้คณะชุมชนตรวจเกณฑ์","risk":"ขอให้เลือกเฉพาะคนที่สำนักงานเสนอ","good":"มูลนิธิรับรองเกณฑ์และเสนอเงินสนับสนุน","conflict":"ผู้สมัครร้องเรื่องรายชื่อที่เปลี่ยนจากเกณฑ์เดิม","repair":"เปิดเกณฑ์และให้คณะอิสระพิจารณา","final":"มูลนิธิขอรายชื่อรับรองก่อนปิดรอบ","cost":12000,"reward":160000,"temptation":0,"custom":true},{"category":"integrity","id":"extra-ai-offer","title":"โควต้าที่มากับซอง","actor":"ตัวแทนผู้จำหน่ายระบบ","tone":"crisis","opening":"ผู้จำหน่ายเสนอแยก AI ฟรีหนึ่งจุด หากยอมรับเงื่อนไขโดยไม่เปิดเผย","funded":"จ้างตรวจเงื่อนไข","free":"ขอเสนอผ่านช่องทางเปิดเผย","risk":"รับโควต้าแยก AI ฟรีหนึ่งจุดโดยไม่เปิดเอกสาร","good":"หน่วยตรวจสอบชมการขอเงื่อนไขเป็นหนังสือ","conflict":"ผู้ประกอบการรายอื่นร้องเรื่องสิทธิที่ได้รับ","repair":"เปิดเอกสารให้ทุกฝ่ายตรวจ","final":"คณะตรวจสอบขอคำชี้แจงสิทธิพิเศษ","cost":35000,"reward":0,"temptation":0,"custom":true}]);
const MAYOR_STORY_META=Object.fromEntries(MAYOR_STORY_ARCS.map(a=>[a.id,a]));
function storyChoice(title,scores,report,next=null,extra={}){
 return {title,...(extra.cost?{cost:extra.cost,exactCost:true}:{}),success:{scores,report,...(extra.money?{money:extra.money}:{}),storyNext:next,...(extra.close?{storyClose:true}:{}),...(extra.open?{storyOpen:true}:{})},...(extra.chance?{chance:extra.chance,failure:{scores:extra.failureScores||{image:-5,admin:-5},report:extra.failureReport||"การเจรจาไม่เป็นไปตามที่หวัง เรื่องยังไม่ยุติ",storyNext:extra.failureNext||"return",...(extra.close||extra.failureClose?{storyClose:true}:{})}}:{})};
}
function storyScores(pairs){const result={};for(const [k,n] of pairs)result[k]=(result[k]||0)+n;return result;}
function storyDefinitions(){
 const events=[];
 for(const a of MAYOR_STORY_ARCS){
  if(a.custom)continue;
  const k=a.category,isFood=a.id==="restaurants",isCash=a.id==="two-million",warm=a.tone==="warm",crisis=a.tone==="crisis",cost=a.id==="student"?10000:warm?30000:50000;
  const add=(node,title,story,choices,ignored)=>events.push({id:"story-"+a.id+"-"+node,category:k,minLevel:1,title,story,choices,storyArc:a.id,storyNode:node,...(node==="root"?{}:{storyOnly:true}),...(ignored?{ignored}:{}),...(isFood?{storyRequiresKind:"restaurant"}:{})});
  const opt=storyChoice;
  const root=[
   opt(isFood?"สมทบ 100,000 บาท และตกลงเปิดบัญชีค่าใช้จ่าย":isCash?"จ้างตรวจสัญญาและเปิดให้คู่แข่งเสนอความเห็น":"สมทบ "+cost.toLocaleString("en-US")+" บาทและให้ผู้เกี่ยวข้องร่วมกำหนดเกณฑ์",storyScores([[k,6],["people",4]]),"ผู้เกี่ยวข้องตอบรับการร่วมมือและบันทึกข้อเสนอไว้","good",{cost:isFood?100000:cost}),
   opt(warm?"ไปร่วมงานโดยไม่ใช้งบเมือง":"เปิดเวทีหารือโดยใช้ทีมงานเดิม",storyScores([[k,4],["admin",-2]]),"ผู้เกี่ยวข้องยอมพูดคุยต่อ แต่ฝ่ายเทศบาลต้องแบ่งเวลาจากงานประจำ","good"),
   opt(warm?"ส่งคำขอบคุณและไม่ร่วมกิจกรรม":"ขอรายละเอียดเพิ่มก่อนผูกพันงบ",storyScores([[k,warm?2:1]]),"เทศบาลแจ้งจุดยืน ผู้เกี่ยวข้องรับทราบและอาจติดต่ออีกครั้ง",warm?null:"conflict"),
   opt(isFood?"ปฏิเสธเงินช่วยเหลือและยืนยันว่าเมืองจะไม่ทำตามคำขู่":isCash?"รับเงิน 2,000,000 บาทและใช้สัญญาเดิม":"ปฏิเสธข้อเสนอโดยไม่เปิดเวทีหารือ",storyScores([[k,-7],["people",-4],...(isCash?[["integrity",-15],["admin",-8]]:[])]),isCash?"เงินเข้าคลังแล้ว แต่เงื่อนไขที่ถูกทักท้วงยังไม่ถูกแก้ไข":"ผู้เกี่ยวข้องไม่พอใจคำตอบและจะหารือแนวทางตอบโต้",warm?null:"conflict",isCash?{money:2000000}:{}),
   opt(isFood?"ให้ตัวแทนสมาคมเจรจากับฝ่ายการเงิน":isCash?"ระงับการลงนามและให้ผู้ตรวจอิสระอ่านเอกสาร":"ให้ตัวแทนทั้งสองฝ่ายร่วมจัดทำข้อเสนอ",storyScores([[k,5],["integrity",3]]),"เริ่มประสานงานโดยยังไม่มีข้อผูกพันทางการเงิน","good",{chance:.7,failureNext:"conflict",failureScores:storyScores([[k,-4],["admin",-3]])})
  ];
  add("root",a.title,a.opening,root,warm?{scores:{[k]:-2},report:"ไม่ได้ตอบคำเชิญทันเวลา ผู้จัดดำเนินกิจกรรมตามปกติโดยไม่ใช้งบเมือง",storyNext:null}:undefined);
  add("good",warm?"จดหมายขอบคุณ · "+a.title:"รายงานความคืบหน้า · "+a.title,a.good,[
   opt("รับคำขอบคุณและเผยแพร่ข้อมูลตามจริง",storyScores([[k,5],["image",3]]),"การดำเนินงานได้รับการชื่นชม เรื่องยุติโดยไม่มีข้อผูกพันเพิ่มเติม",null),
   opt(warm?"ขอให้กิจกรรมครั้งต่อไปใช้ทรัพยากรของชุมชนเอง":"ส่งผลงานให้จังหวัดพิจารณาตามหลักเกณฑ์",storyScores([[k,4],["government",4]]),"ฝ่ายประสานรับเรื่องและจะตอบกลับหลังพิจารณา",warm?null:"award"),
   opt("ขอบคุณทุกฝ่ายและขอให้ติดตามผลอีกครั้ง",storyScores([[k,3],["integrity",2]]),"ผู้เกี่ยวข้องตกลงติดตามผลอีกระยะ",warm?null:"return"),
   opt("ให้เครดิตกับเจ้าหน้าที่และตัวแทนชุมชน",storyScores([[k,3],["people",4]]),"ชุมชนและเจ้าหน้าที่ได้รับการยอมรับ",null)
  ],{scores:storyScores([[k,-2]]),report:"พลาดโอกาสตอบกลับผู้ที่ติดต่อมา",storyNext:null});
  add("award","หนังสือชื่นชมจากจังหวัด · "+a.title,"จังหวัดได้รับรายงานเรื่อง "+a.title+" และเสนอทุนสนับสนุนทั่วไป 300,000 บาทตามระเบียบ ไม่มีเงื่อนไขก่อสร้างหรือเลือกผู้รับเหมา",[
   opt("รับทุนตามหนังสือและลงทะเบียนเปิดเผย",storyScores([["government",7],[k,4],["integrity",3]]),"จังหวัดอนุมัติทุนและบันทึกผลงานของเมือง",null,{money:300000}),
   opt("ขอให้จังหวัดเผยแพร่ผลงานแทนการรับเงิน",{government:5,fame:5},"จังหวัดเผยแพร่บทเรียนของเมือง",null),
   opt("ไม่รับทุนและขอรักษาแผนงานเดิม",storyScores([[k,2],["government",-2]]),"จังหวัดรับทราบการตัดสินใจ",null),
   opt("รับทุนและให้คณะตรวจสอบติดตามการใช้เงิน",{government:5,integrity:6},"เทศบาลลงทะเบียนทุนพร้อมกระบวนการตรวจสอบ",null,{money:300000,cost:10000})
  ],{scores:storyScores([["government",-3],[k,-2]]),report:"จังหวัดปิดรอบรับคำตอบแล้ว",storyNext:null});
  add("conflict","หนังสือยื่นคำขาด · "+a.title,a.conflict,[
   opt(isFood?"จ่าย 100,000 บาทตามข้อเรียกร้องและให้เปิดบริการตามเดิม":"อนุมัติงบไกล่เกลี่ย 100,000 บาท พร้อมบันทึกเงื่อนไข",storyScores([[k,6],["integrity",2]]),"คู่กรณีรับข้อเสนอชั่วคราวและยืนยันว่าจะติดตามผล","good",{cost:100000,open:isFood}),
   opt("เชิญคู่กรณีมาพูดคุยต่อหน้าคนกลาง",storyScores([[k,5],["people",3]]),"การหารือเริ่มขึ้น แต่ยังมีบางเงื่อนไขที่ไม่ได้ข้อยุติ","mediator",{chance:.6,failureNext:"return",failureScores:storyScores([[k,-5],["image",-4]]),failureClose:isFood,failureReport:isFood?"การเจรจาล้มเหลว ร้านสมาชิกบางส่วนแจ้งหยุดบริการ":"คู่กรณีปฏิเสธการหารือ"}),
   opt("ขอหน่วยงานจังหวัดช่วยตรวจข้อเท็จจริง",storyScores([["government",5],["integrity",4],[k,-2]]),"จังหวัดส่งผู้ประสานงานมารับเรื่อง","mediator"),
   opt(isFood?"ส่งทีมรักษาความปลอดภัยไปกดดันสมาคม":"ใช้แรงกดดันให้คู่กรณียุติข้อเรียกร้อง",storyScores([[k,-8],["integrity",-9],["image",-5]]),"คู่กรณีไม่ยอมถอนข้อเรียกร้อง และเรื่องถูกส่งต่อถึงสื่อ","return",{close:isFood}),
   opt("ปฏิเสธคำขาดและประกาศจุดยืนเดิม",storyScores([[k,-7],["people",-4]]),"คู่กรณีถอนตัวจากการเจรจาและเตรียมยื่นคำร้องเพิ่มเติม","return",{close:isFood})
  ],{scores:storyScores([[k,-10],["image",-3]]),report:"หมดเวลาตอบคำขาด คู่กรณีเดินหน้าตามที่แจ้ง",storyNext:"return",...(isFood?{storyClose:true}:{})});
  add("mediator","มือที่ยื่นเข้ามา · "+a.title,"คนกลางเสนอช่วยเจรจาเรื่อง "+a.title+" โดยไม่คิดค่าบริการ แต่ยังต้องยืนยันว่าแต่ละฝ่ายยอมรับข้อตกลงเดียวกัน",[
   opt("ให้คนกลางทำงานและเปิดบันทึกการเจรจา",storyScores([[k,5],["integrity",3]]),"ทั้งสองฝ่ายยอมรับความช่วยเหลือเบื้องต้น แต่ยังต้องติดตามคำยืนยัน","return",{open:isFood}),
   opt("เชิญตัวแทนทั้งสองฝ่ายร่วมรับรองข้อตกลง",storyScores([[k,6],["people",3]]),"คู่กรณีรับรองข้อตกลงและจะกลับมาทำตามเงื่อนไข","good",{chance:.65,failureNext:"return",open:isFood}),
   opt("ขอให้จังหวัดตรวจความเป็นอิสระของคนกลาง",{government:4,integrity:5},"จังหวัดรับเรื่องและขอเอกสารก่อนสรุปผล","return"),
   opt("ปฏิเสธคนกลางและดำเนินการเอง",storyScores([[k,-4],["admin",-3]]),"คู่กรณีไม่ยอมรับแนวทางใหม่","return")
  ],{scores:storyScores([[k,-5]]),report:"คนกลางถอนข้อเสนอเพราะไม่ได้รับคำตอบ",storyNext:"return"});
  add("return",isFood?"มันสายเกินไปแล้ว ท่านนายก":"เรื่องเดิมกลับมา · "+a.title,a.returning,[
   opt(isFood?"ยอมจ่ายชดเชย 200,000 บาทและตกลงเปิดร้าน":"จัดงบ 100,000 บาทสำหรับตรวจสอบและเยียวยาตามเกณฑ์",storyScores([[k,7],["people",5],["integrity",3]]),"คู่กรณียอมรับข้อตกลงใหม่และลงนามยุติข้อพิพาท",null,{cost:isFood?200000:100000,open:isFood}),
   opt("เจรจาโดยมีจังหวัดและตัวแทนประชาชนเป็นพยาน",storyScores([[k,6],["government",4],["integrity",4]]),"ทุกฝ่ายยอมลงนามในข้อตกลงที่เปิดเผย",null,{chance:.55,failureNext:"final",open:isFood,failureScores:storyScores([[k,-5],["admin",-4]]),failureReport:"คู่กรณีแจ้งว่ายังไม่ยอมรับข้อเสนอ เรื่องเข้าสู่การพิจารณารอบสุดท้าย"}),
   opt(isFood?"ให้ร้านอิสระร่วมประสานการกลับมาเปิดบริการ":"ยอมรับข้อจำกัดและส่งเรื่องให้คณะกรรมการอิสระ",storyScores([[k,3],["integrity",5],["admin",-3]]),"คณะกรรมการรับช่วงดำเนินการต่อ","final"),
   opt("ประกาศยืนกรานข้อเสนอเดิมและไม่เจรจาเพิ่ม",storyScores([[k,-9],["image",-5],["government",-4]]),"คู่กรณีแจ้งว่าจะส่งเรื่องต่อหน่วยงานที่เกี่ยวข้อง","final",{close:isFood})
  ],{scores:storyScores([[k,-10],["image",-5]]),report:"ไม่ได้รับคำตอบตามกำหนด เรื่องเข้าสู่การพิจารณารอบสุดท้าย",storyNext:"final",...(isFood?{storyClose:true}:{})});
  add("final","บทสรุปของข้อพิพาท · "+a.title,"ตัวแทนจังหวัดแจ้งว่าต้องมีข้อยุติเรื่อง "+a.title+" หลังจากการเจรจาหลายรอบ ทั้งสองฝ่ายต้องรับทราบคำตัดสินครั้งนี้",[
   opt("ยอมรับการตรวจสอบและจ่ายค่าเยียวยา 150,000 บาทตามเกณฑ์",storyScores([[k,6],["integrity",5],["government",4]]),"ทุกฝ่ายรับทราบผลและยุติข้อพิพาท",null,{cost:150000,open:isFood}),
   opt("ให้คณะกรรมการจังหวัดตัดสินโดยไม่ใช้งบเพิ่ม",storyScores([[k,2],["government",5],["integrity",3]]),"คณะกรรมการกำหนดข้อยุติ ผู้เกี่ยวข้องรับทราบ",null,{open:isFood}),
   opt("ยอมรับผิดพลาดและเผยแพร่บทเรียนต่อประชาชน",storyScores([[k,3],["people",4],["image",3]]),"ประชาชนรับทราบคำชี้แจงและคู่กรณียุติการติดตาม",null,{open:isFood}),
   opt("ไม่ยอมรับข้อสรุปและปล่อยให้หน่วยงานดำเนินการเอง",storyScores([[k,-12],["image",-8],["government",-6]]),"จังหวัดปิดการประสานงานและบันทึกความขัดแย้งไว้ ร้านค้าจะทยอยกลับมาดำเนินงานตามปกติหากเคยหยุดบริการ",null,{open:isFood})
  ],{scores:storyScores([[k,-12],["government",-6]]),report:"หน่วยงานปิดเรื่องโดยไม่รับคำชี้แจงจากนายก",storyNext:null,storyOpen:true});
 }
 return events;
}
MAYOR_EVENTS.push(...storyDefinitions());

function expandedStoryDefinitions(){
 const out=[];
 for(const a of MAYOR_STORY_ARCS.filter(x=>x.custom)){
  const k=a.category,warm=a.tone==="warm",crisis=a.tone==="crisis",ai=a.id==="extra-ai-offer";
  const sc=(...pairs)=>{const r={};for(const [key,n] of pairs)r[key]=(r[key]||0)+n;if(!Object.values(r).some(Boolean))r[k]=1;return r;};
  const opt=storyChoice,fmt=n=>n.toLocaleString("en-US");
  const add=(node,title,story,choices,ignored)=>out.push({id:"story-"+a.id+"-"+node,category:k,minLevel:1,title,story,choices,storyArc:a.id,storyNode:node,...(node==="root"?{}:{storyOnly:true}),ignored});
  const risk=()=>{const o=opt(a.risk,sc([k,crisis?-10:-5],["integrity",a.temptation||ai?-12:-2]),a.temptation?"เงินเข้าคลังตามข้อเสนอ แต่ข้อทักท้วงยังไม่ถูกตรวจสอบ":ai?"ได้รับสิทธิแยก AI แต่เอกสารยังไม่เปิดเผย":a.actor+" ไม่พอใจคำตอบและขอกลับไปหารือ","conflict",a.temptation?{money:a.temptation}:{});if(ai)o.success.aiCredits=1;return o;};
  add("root",a.title,a.opening,[
   opt(a.funded+" "+fmt(a.cost)+" บาท",sc([k,warm?3:6],["people",2]),a.actor+" รับข้อเสนอและจะรายงานผล","good",{cost:a.cost}),
   opt(a.free,sc([k,warm?3:4],["admin",-1]),a.actor+" รับแนวทางและเตรียมประสานต่อ","good",warm?{}:{chance:.8,failureNext:"conflict",failureScores:sc([k,-3],["admin",-2]),failureReport:"ยังประสานข้อเสนอไม่ได้ ฝ่าย "+a.actor+" ขอทบทวน"}),
   opt(warm?"ส่งคำขอบคุณและขอให้ดำเนินการเองตามสมัครใจ":"ขอข้อมูลเพิ่มเติมเป็นลายลักษณ์อักษร",sc([k,2],["integrity",1]),warm?"ผู้จัดรับทราบและขอบคุณที่ตอบกลับ":"ฝ่ายประสานจะส่งข้อมูลเพิ่มเติม",warm?null:"review"),risk()
  ],{scores:sc([k,-5]),report:"หมดเวลาตอบข้อเสนอของ "+a.actor,storyNext:warm?null:"conflict"});
  add("good",warm?"จดหมายถึงนายก · "+a.title:"รายงานผล · "+a.title,a.good+(a.reward?" ฝ่ายประสานเสนอเงินสนับสนุน "+fmt(a.reward)+" บาทตามเอกสารเปิดเผย ไม่ผูกมัดก่อสร้าง":""),[
   opt(a.reward?"รับทุนและลงบัญชีเปิดเผย":"ส่งคำขอบคุณและให้เครดิตผู้ลงมือทำ",sc([k,3],["image",2],["integrity",a.reward?2:0]),a.reward?"ได้รับเงินสนับสนุนและบันทึกเข้าคลังแล้ว":"ผู้เกี่ยวข้องได้รับคำขอบคุณ เรื่องยุติด้วยความเข้าใจ",null,a.reward?{money:a.reward}:{}),
   opt(warm?"ส่งข้อความกลับและเก็บภาพเป็นบันทึกเมือง":"เผยแพร่บทเรียนโดยไม่รับผลประโยชน์เพิ่มเติม",sc([k,2],["fame",2]),"ฝ่ายประสานรับทราบและเก็บเป็นบันทึกเมือง"),
   opt("ขอบคุณและไม่ประชาสัมพันธ์เพิ่มเติม",sc([k,1]),"ผู้เกี่ยวข้องยอมรับและปิดเรื่อง")
  ],{scores:sc([k,-2]),report:"พลาดการตอบกลับรายงานจาก "+a.actor,storyNext:null});
  add("review","ข้อมูลที่ขอ · "+a.title,a.actor+" ส่งข้อมูลเพิ่มเติมตามที่นายกขอ และต้องการข้อสรุปเรื่อง "+a.title,[
   opt(a.free,sc([k,3],["integrity",2]),"ฝ่ายประสานรับแนวทางหลังตรวจข้อมูล","good"),
   opt("ไม่รับข้อเสนอและแจ้งเหตุผลให้ทุกฝ่าย",sc([k,1],["integrity",2]),"ทุกฝ่ายรับทราบ ไม่มีข้อผูกพันเพิ่มเติม"),risk()
  ],{scores:sc([k,-5]),report:"ฝ่ายประสานไม่ได้รับคำตอบและส่งเรื่องติดตาม",storyNext:"conflict"});
  add("conflict","เลขานุการรายงาน · "+a.title,a.conflict,[
   opt(a.repair+" (งบ "+fmt(Math.ceil(a.cost*1.5))+" บาท)",sc([k,5],["integrity",2]),"คู่กรณีรับข้อเสนอแก้ไขและยอมให้ติดตามผล","good",{cost:Math.ceil(a.cost*1.5)}),
   opt("ให้คนกลางอิสระหารือกับ "+a.actor,sc([k,4],["government",2]),"คนกลางประสานจนคู่กรณียอมรับข้อสรุป",null,{chance:.55,failureNext:"final",failureScores:sc([k,-4],["image",-3]),failureReport:"คนกลางแจ้งว่าคู่กรณียังไม่ยอมรับข้อเสนอ ต้องสรุปรอบสุดท้าย"}),
   opt("ยืนยันคำตัดสินเดิมและไม่เปิดเจรจาเพิ่ม",sc([k,-7],["image",-4]),"คู่กรณีไม่ยอมถอนข้อร้องเรียน","final"),
   opt("ยอมรับข้อบกพร่องและให้ตัวแทนเสนอเงื่อนไขยุติ",sc([k,3],["admin",-1]),"ตัวแทนส่งเงื่อนไขสุดท้ายให้สำนักงาน","final")
  ],{scores:sc([k,-7],["image",-2]),report:"ข้อร้องเรียนถูกส่งต่อให้หน่วยประสาน",storyNext:"final"});
  add("final","ข้อสรุป · "+a.title,a.final,[
   opt("รับรองข้อสรุปตามข้อมูลที่ตรวจสอบได้และเผยแพร่บันทึก",sc([k,4],["integrity",3]),a.actor+" รับทราบและปิดเรื่อง"),
   opt("ให้ผู้ประสานอิสระสรุปโดยไม่ใช้งบเพิ่ม",sc([k,2],["government",2]),"ผู้ประสานส่งข้อสรุปและยุติการติดตาม"),
   opt("ไม่ยอมรับข้อสรุปและให้หน่วยงานบันทึกความเห็นคัดค้าน",sc([k,-9],["image",-4]),"หน่วยงานปิดรอบประสานพร้อมบันทึกข้อขัดแย้ง")
  ],{scores:sc([k,-8],["government",-3]),report:"ปิดรอบพิจารณาโดยไม่มีคำตอบจากนายก",storyNext:null});
 }
 return out;
}
MAYOR_EVENTS.push(...expandedStoryDefinitions());
const MAYOR_SUSPICIOUS_OFFERS=new Set(["fame-food:5"]);
function mayorRiskyOffer(d,index,r){
 if(d.playEvent)return false; // New moral stories own their consequences; no extra administrative sequel.
 return !!((r.money>0||r.aiCredits>0)&&((r.scores?.integrity||0)<0||MAYOR_SUSPICIOUS_OFFERS.has(d.id+":"+index)));
}
function mayorOfferLevel(value){return value>=1500000?10:value>=1000000?6:value>=500000?3:1;}
for(const d of MAYOR_EVENTS){
 if(!d.storyOnly){
  const largest=Math.max(0,...d.choices.map(o=>Math.max(o.success?.money||0,o.failure?.money||0)));
  d.minLevel=Math.max(d.minLevel||1,mayorOfferLevel(largest));
  if(largest>=500000)d.offerCooldown=5;
 }
 for(const o of d.choices)if(o.cost>0)o.exactCost=true;
 if(d.id==="story-birthday-root"||d.id==="story-festival-photo-root"){
  const o=d.choices[0];delete o.cost;delete o.exactCost;
  o.title="อนุญาตให้ใช้พื้นที่ส่วนกลางตามหลักเกณฑ์เดียวกับกิจกรรมอื่น";
  o.success.scores={image:3,integrity:3};
  o.success.report="ผู้จัดดำเนินกิจกรรมด้วยทรัพยากรของตนเองตามหลักเกณฑ์เดียวกัน ไม่มีการเบิกงบเมืองเพื่อประโยชน์ส่วนตัว";
 }
}



// SMCITY: short, city-driven events. Keep old definitions solely for existing saves.
const PLAY_PREFIX="play-";
const play=(title,report,scores={},extra={})=>({title,success:{report,scores,...extra}});
const spend=(title,cost,report,scores,extra={})=>({...play(title,report,scores,extra),cost,exactCost:true});
const gamble=(title,chance,win,lose)=>({title,chance,success:win,failure:lose});
const result=(report,scores={},extra={})=>({report,scores,...extra});
const buff=(scope,value=2)=>({effects:[{kind:scope==="tourist"?"touristMultiplier":"tripMultiplier",scope,value}]});
const drop=(scope,value=-150)=>({effects:[{kind:"tripDelta",scope,value}]});
const event=(id,category,title,story,choices,extra={})=>({id:PLAY_PREFIX+id,category,title,story,minLevel:1,choices,ignored:result("เรื่องนี้ผ่านไปแล้ว",{[category]:-2}),...extra});
const task=(title,key,count,report,scores,extra={},grant=0)=>({title,task:{kind:"build",key,count},...(grant?{grant}:{}),success:result(report,scores,extra),failure:result("สร้างไม่ครบตามที่รับปากไว้",{[Object.keys(scores)[0]]:-8})});
const trafficTask=(target,scope="all")=>({title:"รับคำท้า ทำภารกิจเดินทางให้สำเร็จ "+target+"%",task:{kind:"performance",target},success:result("ทำได้แล้ว! การเดินทางของชาวเมืองดีขึ้น",{admin:8,people:5},buff(scope,2)),failure:result("ยังทำผลงานไม่ถึงเป้าหมาย",{admin:-7,people:-3})});
const CITY_PLAY_EVENTS=[
 // The larger choice is shown only if it fits real demand and the treasury.
 event("home","people","มีคนอยากย้ายมาอยู่เมืองเรา","ครอบครัวใหม่กำลังมองหาบ้าน แต่ที่พักไม่พอ จะสร้างเพิ่มไหม?",[
  task("สร้างบ้านเพิ่ม 1 หลัง","home_starter",1,"ครอบครัวใหม่มีบ้านให้ย้ายเข้าแล้ว!",{people:7,admin:3},{money:30000}),
  task("สร้างบ้านเพิ่ม 2 หลัง","home_starter",2,"ชาวเมืองดีใจที่มีบ้านรองรับมากขึ้น",{people:10,admin:4},{money:60000}),
  play("ยังไม่ขยายบ้านตอนนี้","ครอบครัวเหล่านั้นต้องรอบ้านว่าง",{people:-3})]),
 event("food","people","ชาวเมืองหิวแล้ว!","ร้านอาหารเต็มจนหลายคนหาที่กินไม่ได้ ขอร้านเพิ่มหน่อยนะท่านนายก",[
  task("สร้างร้านอาหาร 1 แห่ง","restaurant_starter",1,"ร้านใหม่เปิดแล้ว ชาวเมืองยิ้มออก",{people:7,business:3},{money:50000,...buff("restaurant")}),
  task("สร้างร้านอาหาร 2 แห่ง","restaurant_starter",2,"ร้านใหม่ช่วยเพิ่มที่นั่งให้คนในเมือง",{people:10,business:4},{money:100000,...buff("restaurant",3)}),
  play("ให้รอร้านที่มีอยู่ก่อน","คนที่หิวต้องรอต่อไป",{people:-4})]),
 event("shop","people","ซื้อของไม่ทัน","ร้านค้าใกล้บ้านเต็มบ่อย ชาวเมืองขอให้เพิ่มร้านอีกหน่อย",[
  task("สร้างร้านค้า 1 แห่ง","shop_starter",1,"ชาวเมืองมีทางเลือกเพิ่ม",{people:7,admin:3},{money:40000,...buff("shop")}),
  task("สร้างร้านค้า 2 แห่ง","shop_starter",2,"ร้านใหม่พร้อมรองรับลูกค้า",{people:10,business:4},{money:80000,...buff("shop")}),
  play("รอให้ร้านเดิมมีที่ว่าง","ชาวเมืองยังต้องต่อคิว",{people:-3})]),
 event("park","image","เด็ก ๆ อยากมีที่เล่น","เด็ก ๆ ชูป้ายขอสวนสาธารณะเพิ่ม จะหาให้พวกเขาไหม?",[
  task("สร้างสวนสาธารณะ 1 แห่ง","park_starter",1,"เด็ก ๆ มีที่พักผ่อนเพิ่มแล้ว",{image:7,people:5},{money:35000,...buff("park")}),
  play("ขอเก็บเงินไว้ก่อน","เด็ก ๆ ฝากข้อความว่าจะรอ",{image:-3})]),
 event("office","admin","คนอยากทำงาน","มีคนมาสมัครงานแต่ตำแหน่งว่างไม่พอ ขอสำนักงานเพิ่มสักแห่ง",[
  task("สร้างสำนักงาน 1 แห่ง","office_starter",1,"สำนักงานใหม่เปิดรับสมัครงาน",{admin:8,people:5},{money:80000,...buff("office")}),
  task("สร้างสำนักงาน 2 แห่ง","office_starter",2,"เมืองมีตำแหน่งงานใหม่มากขึ้น",{admin:10,business:5},{money:160000,...buff("office")}),
  play("ยังไม่เพิ่มสำนักงาน","ผู้สมัครงานต้องรอโอกาสต่อไป",{admin:-4})]),
 event("factory","business","นักลงทุนอยากเปิดโรงงาน","บริษัทหนึ่งสนใจตั้งโรงงานในเมือง และพร้อมจ้างคนเมื่อมีพื้นที่",[
  task("สร้างโรงงาน 1 แห่ง","factory_starter",1,"โรงงานพร้อมรับคนเข้าทำงาน",{business:8,admin:4},{money:100000,...buff("factory")}),
  play("ยังไม่ขยายโรงงาน","นักลงทุนขอไปดูเมืองอื่นก่อน",{business:-3})]),
 event("hotel","fame","นักท่องเที่ยวไม่มีห้องพัก","นักท่องเที่ยวบางคนยังหาห้องพักไม่ได้ เจ้าของกิจการขอให้เพิ่มโรงแรม",[
  task("สร้างโรงแรม 1 แห่ง","hotel_starter",1,"โรงแรมใหม่พร้อมต้อนรับแขก",{fame:8,business:4},{money:80000,...buff("tourist")}),
  task("สร้างโรงแรม 2 แห่ง","hotel_starter",2,"เมืองมีห้องพักรองรับเพิ่ม",{fame:10,business:5},{money:160000,...buff("tourist")}),
  play("พักแผนขยายโรงแรมไว้ก่อน","นักท่องเที่ยวบางคนต้องรอห้องว่าง",{fame:-4})]),
 event("mall","business","คนแน่นห้าง","ผู้ประกอบการเห็นว่าพื้นที่ชอปปิงไม่พอ อยากเปิดห้างเพิ่ม",[
  task("สร้างห้าง 1 แห่ง","mall_starter",1,"ห้างใหม่พร้อมต้อนรับลูกค้า",{business:8,people:4},{money:120000,...buff("mall")}),
  play("ชะลอการสร้างห้าง","ผู้ประกอบการยอมรอ",{business:-3})]),
 event("pub","business","เมืองเงียบไปหรือเปล่า?","คนชอบเที่ยวกลางคืนบอกว่าผับที่มีอยู่เต็มบ่อย ขอที่เที่ยวเพิ่มอีกสักแห่ง",[
  task("สร้างผับ 1 แห่ง","pub_starter",1,"ผับใหม่เปิดให้บริการ",{business:8,fame:4},{money:90000,...buff("pub")}),
  play("ยังไม่เพิ่มผับ","ผู้ประกอบการผิดหวังเล็กน้อย",{business:-3,people:2})]),
 event("casino","business","ลูกค้าเต็มคาสิโน","ผู้ประกอบการบอกว่าที่นั่งไม่พอ อยากลงทุนเพิ่ม",[
  task("สร้างคาสิโน 1 แห่ง","casino_starter",1,"สถานที่ใหม่เปิดรับลูกค้า",{business:9,admin:3},{money:150000,...buff("casino")}),
  play("ไม่ขยายคาสิโนตอนนี้","ผู้ประกอบการเก็บแผนไว้ก่อน",{business:-4})]),
 event("home-help","government","จังหวัดช่วยค่าบ้าน","จังหวัดมีเงินช่วยสร้างบ้านให้เมืองที่ยังมีคนรอที่พัก สนใจไหม?",[
  task("รับงบ 24,000 บาท สร้างบ้าน 1 หลัง","home_starter",1,"สร้างบ้านสำเร็จ จังหวัดส่งคำชมมา",{government:7,people:5},{money:20000},24000),
  task("รับงบ 48,000 บาท สร้างบ้าน 2 หลัง","home_starter",2,"โครงการบ้านสำเร็จ",{government:10,people:7},{money:40000},48000),
  play("ขอไม่รับงบรอบนี้","จังหวัดส่งโอกาสให้เมืองอื่น",{})]),
 event("shop-help","government","ทุนร้านค้าเล็ก ๆ","จังหวัดอยากช่วยเมืองที่ยังมีร้านค้าไม่พอ เปิดโอกาสให้ขอเงินสร้างร้าน",[
  task("รับงบ 20,000 บาท สร้างร้านค้า 1 แห่ง","shop_starter",1,"ร้านใหม่สร้างเสร็จตามที่ตกลง",{government:7,business:5},{money:30000},20000),
  play("ขอผ่านก่อน","ไม่มีภาระผูกพันกับเมือง",{})]),
 event("food-help","government","ทุนช่วยเรื่องปากท้อง","จังหวัดเสนอเงินช่วยเปิดร้านอาหารในเมืองที่ยังมีคนรอคิว",[
  task("รับงบ 30,000 บาท สร้างร้านอาหาร 1 แห่ง","restaurant_starter",1,"ร้านอาหารสร้างเสร็จตามเป้า",{government:8,people:5},buff("restaurant"),30000),
  play("ขอผ่านก่อน","จังหวัดเก็บงบไว้ช่วยเมืองอื่น",{})]),
 event("hotel-help","government","ทุนต้อนรับนักท่องเที่ยว","จังหวัดอยากให้เมืองมีห้องพักพอสำหรับนักท่องเที่ยวที่รออยู่",[
  task("รับงบ 50,000 บาท สร้างโรงแรม 1 แห่ง","hotel_starter",1,"โรงแรมพร้อมเปิดรับแขก",{government:7,fame:5},buff("tourist"),50000),
  play("ยังไม่รับทุน","จังหวัดรับทราบ",{})]),
 event("traffic","admin","ขอถนนโล่ง ๆ สักวัน!","ชาวเมืองอยากไปทำงานและกลับบ้านให้ทัน มาลองทำให้การเดินทางดีขึ้นไหม?",[
  trafficTask(80),trafficTask(90),
  play("วันนี้ยังไม่รับปาก","ชาวเมืองหวังว่าพรุ่งนี้จะดีขึ้น",{admin:-2})]),
 event("traffic-hard","admin","เมืองเราจะทำได้ไหม?","ชมรมคนขับรถอยากท้าว่าวันนี้เมืองจะทำภารกิจเดินทางสำเร็จเกิน 95% ได้หรือเปล่า",[
  {...trafficTask(95),success:result("ทำได้จริง! ชมรมส่งเงินรางวัลมา",{admin:10,image:6},{money:150000,...buff("all",3)})},
  play("ไม่รับคำท้า","ชมรมบอกไว้ลองวันอื่นก็ได้",{})],{minLevel:5}),
 // Short events: no follow-up unless the story itself warrants it.
 event("school","image","รูปวาดของเด็ก ๆ","เด็ก ๆ วาดรูปเมืองในฝัน มีรูปนายกยืนอยู่หน้าบ้านด้วย อยากไปดูไหม?",[
  play("ไปดูด้วยตัวเอง","เด็ก ๆ ดีใจมาก วาดรูปนายกเพิ่มอีกเต็มกระดาษ",{image:6,people:3}),
  play("ฝากคำชมไปให้","เด็ก ๆ ยิ้มและเอาคำชมไปติดหน้าห้อง",{image:3})]),
 event("grandma","image","วันเกิดคุณยาย","คุณยายอายุ 90 ปี อยากพบคุณสักครั้งในชีวิต",[
  play("แวะไปอวยพรคุณยาย","คุณยายยิ้มจนตาหยี ลูกหลานขอบคุณจากใจ",{image:7,people:4}),
  play("ส่งการ์ดอวยพร","คุณยายเก็บการ์ดไว้เป็นที่ระลึก",{image:3}),
  play("ฝากเลขานุการไปแทน","ครอบครัวเข้าใจว่านายกมีงานมาก",{})]),
 event("stray","people","เจ้าตูบหน้าศาลา","หมาจรตัวหนึ่งมานอนรอหน้าเมืองทุกวัน ชาวบ้านกำลังช่วยกันหาบ้านให้",[
  spend("ช่วยค่ารักษาและอาหาร",5000,"เจ้าตูบได้บ้านใหม่แล้ว!",{people:6,image:3}),
  play("ช่วยประกาศหาคนรับเลี้ยง","มีครอบครัวอาสารับเจ้าตูบไปดูแล",{people:4}),
  play("ให้ชาวบ้านช่วยกันต่อ","กลุ่มอาสารับเรื่องต่อไป",{})]),
 event("festival","people","ชาวเมืองจัดงานกันเอง","ชาวบ้านกำลังจัดงานเทศกาลเล็ก ๆ ขอค่าอุปกรณ์จัดงาน 20,000 บาท",[
  spend("สมทบ 20,000 บาท",20000,"งานครึกครื้น ร้านค้าขายดี!",{people:7,business:4},buff("all")),
  play("ไปร่วมงานโดยไม่ใช้งบเมือง","ชาวบ้านดีใจที่นายกมาร่วมงาน",{people:4,image:3}),
  play("ส่งคำอวยพร","งานยังจัดได้ด้วยแรงชุมชน",{})]),
 event("thankyou","people","คำขอบคุณจากชาวเมือง","คนในเมืองรวมตัวกันมอบจดหมายขอบคุณให้ทีมงานที่ช่วยดูแลเมือง",[
  play("ขอบคุณทีมงานต่อหน้าทุกคน","ทีมงานมีกำลังใจ ชาวเมืองปรบมือ",{people:5,image:4},buff("all")),
  play("รับจดหมายไว้เป็นที่ระลึก","จดหมายถูกติดไว้ในห้องทำงาน",{people:3})]),
 event("rain","admin","ฝนตกหนัก","วันนี้ฝนตกหนัก คนเดินทางลำบาก ทีมงานขอเงินจัดการจุดเสี่ยง",[
  spend("ช่วยทีมงาน 40,000 บาท",40000,"ทีมงานออกดูแลจุดเสี่ยง",{admin:6,people:4},buff("all")),
  gamble("ให้ทีมงานเดิมจัดการ",.65,result("ฝนหยุดเร็วกว่าที่คิด",{admin:3}),result("คนบ่นว่าเดินทางลำบาก",{admin:-5},drop("all")))]),
 event("driver","admin","คนขับรถอาสา","กลุ่มคนขับรถอยากช่วยประชาสัมพันธ์การเดินทางช่วงเร่งด่วน",[
  play("ให้ช่วยกันเลย","คนขับรถร่วมมือกันดี",{admin:4,people:4},buff("all")),
  play("ขอให้ใช้แผนเดิม","กลุ่มอาสารับทราบ",{})]),
 event("map","admin","ทีมงานเจอจุดติดขัด","คนขับรถส่งภาพถนนที่รถต่อคิวยาวมาให้ อยากให้เมืองเร่งแก้",[
  trafficTask(85),
  play("รับเรื่องไว้ดูตอนมีเวลา","ชาวเมืองรอดูผลงาน",{admin:-3})]),
 event("photo","image","ถ่ายรูปกับนายก","เด็กนักเรียนขอถ่ายรูปกับนายกตอนมาเที่ยวเมือง",[
  play("ถ่ายด้วยกันเลย","ภาพถูกแชร์ในกลุ่มครอบครัว เด็ก ๆ ดีใจ",{image:5,fame:2}),
  play("ฝากทีมงานต้อนรับ","เด็ก ๆ ยังได้ภาพสวยกลับบ้าน",{image:1})]),
 event("live","image","ไลฟ์สดไม่ทันตั้งตัว","เพจท้องถิ่นอยากสัมภาษณ์สดเกี่ยวกับชีวิตในเมือง",[
  gamble("ตอบสดแบบเป็นกันเอง",.75,result("คนดูชอบความเป็นกันเอง",{image:8,fame:3}),result("นายกตอบติดขัด คลิปถูกแซว",{image:-5})),
  play("ขอคุยวันหลัง","เพจเข้าใจและรอวันนัด",{})]),
 event("lost","integrity","กระเป๋าเงินหาย","คนเก็บขยะเจอกระเป๋าเงินของนักท่องเที่ยว มีเงินอยู่ข้างใน",[
  play("ช่วยตามหาเจ้าของ","นักท่องเที่ยวได้รับของคืนและขอบคุณเมือง",{integrity:7,fame:3}),
  play("เก็บไว้ที่จุดรับของหาย","เจ้าของสามารถมาติดต่อรับได้",{integrity:4}),
  play("เอาเงินเข้าคลังเมือง","เจ้าของกลับมาหาของและผิดหวัง",{integrity:-10,image:-5},{money:10000})]),
 event("honest","integrity","ของขวัญไม่มีเงื่อนไข","ร้านค้าเล็ก ๆ ส่งของขวัญขอบคุณทีมงาน ไม่ได้ขออะไรตอบแทน",[
  play("รับแล้วแบ่งให้ทีมงาน","ทุกคนดีใจ ไม่มีการแลกสิทธิพิเศษ",{integrity:3,image:3}),
  play("ขอบคุณและส่งคืนอย่างสุภาพ","ร้านค้าเข้าใจและยังสนับสนุนเมือง",{integrity:4})],{needsKind:"shop"}),
 event("mistake","integrity","เงินโอนเกิน","ร้านค้าแจ้งว่าโอนเงินเข้าคลังเกิน 50,000 บาท",[
  play("คืนเงินส่วนที่โอนเกิน","ร้านค้าชื่นชมความตรงไปตรงมา",{integrity:8,business:3}),
  play("อ้างว่าเป็นเงินบริจาค","ร้านค้าเปิดเผยหลักฐานการโอน",{integrity:-12,business:-6},{money:50000})],{needsKind:"shop"}),
 event("tour-group","fame","ทัวร์ลงเมืองเรา!","บริษัททัวร์อยากแนะนำเมืองให้ลูกค้ารู้จัก ขอให้ช่วยโปรโมตแหล่งเที่ยว",[
  spend("ร่วมโปรโมต 30,000 บาท",30000,"แคมเปญได้รับความสนใจจากนักท่องเที่ยว",{fame:7,business:4},buff("tourist")),
  play("ช่วยแชร์ข้อมูลฟรี","บริษัททัวร์ขอบคุณและแชร์เมืองต่อ",{fame:4},buff("tourist",1.5)),
  play("ยังไม่โปรโมต","ทัวร์เลือกเที่ยวตามแผนเดิม",{})],{needsKind:"hotel"}),
 event("hotel-vip","fame","แขกคนสำคัญ","โรงแรมแจ้งว่ามีนักธุรกิจคนดังมาพัก เขาอยากรู้จักเมืองของเรา",[
  spend("ช่วยจัดต้อนรับ 20,000 บาท",20000,"แขกประทับใจและแนะนำเมืองต่อ",{fame:7,image:4},buff("tourist")),
  play("ฝากแผนที่เที่ยวให้","แขกกล่าวขอบคุณ",{fame:3})],{needsKind:"hotel"}),
 event("hotel-review","business","รีวิวโรงแรม","แขกโพสต์ว่าที่พักดีแต่เดินทางลำบาก เจ้าของโรงแรมอยากให้ช่วย",[
  trafficTask(85),
  play("ขอโทษและรับฟัง","เจ้าของโรงแรมขอบคุณที่รับฟัง แต่ยังรอแก้รถติด",{business:3,fame:-2}),
  play("บอกให้แขกไปเมืองอื่น","รีวิวถูกแชร์ต่ออย่างรวดเร็ว",{business:-7,image:-7})],{needsKind:"hotel"}),
 event("factory-late","admin","พนักงานไปทำงานสาย","คนงานโรงงานบ่นว่ารถติดจนเสียเวลาทุกเช้า เจ้าของโรงงานขอให้ช่วย",[
  trafficTask(85,"factory"),
  play("รับฟังและไม่รับปากเกินจริง","เจ้าของโรงงานยังรอผลงาน",{admin:-2,business:2}),
  play("โทษคนงานว่าตื่นสายเอง","คนงานไม่พอใจ",{people:-7,image:-4})],{needsKind:"factory"}),
 event("factory-party","business","โรงงานฉลองยอดขาย","โรงงานขายดีมาก อยากจัดเลี้ยงพนักงานและขอให้นายกกล่าวเปิดงาน",[
  play("ไปร่วมแสดงความยินดี","เจ้าของโรงงานส่งเงินสมทบเมือง",{business:6,image:3},{money:80000,...buff("factory")}),
  play("ฝากคำยินดีไป","โรงงานจัดงานเองอย่างสนุก",{business:3})],{needsKind:"factory"}),
 event("office-lunch","business","พนักงานออฟฟิศพักเที่ยง","สำนักงานอยากชวนร้านอาหารจัดมื้อเที่ยงพิเศษให้พนักงาน",[
  play("ช่วยประชาสัมพันธ์","ร้านอาหารและสำนักงานร่วมจัดกิจกรรม",{business:5,people:3},buff("restaurant")),
  play("ให้บริษัทจัดกันเอง","บริษัทจัดงานตามแผนเดิม",{})],{needsKind:"office",alsoKind:"restaurant"}),
 event("office-award","government","เมืองแห่งการทำงาน","จังหวัดอยากยกย่องเมืองที่คนเดินทางไปทำงานได้ดี",[
  {...trafficTask(90,"office"),success:result("จังหวัดส่งเงินรางวัลมาให้เมือง",{government:8,admin:5},{money:150000,...buff("office")})},
  play("ขอไม่เข้าร่วม","จังหวัดรับทราบ",{})],{needsKind:"office"}),
 event("food-fair","fame","เทศกาลของอร่อย","ร้านอาหารชวนจัดงานรวมของอร่อยประจำเมือง ขอช่วยค่าเตรียมงาน 25,000 บาท",[
  spend("ช่วยจัดงาน",25000,"งานคึกคัก คนแห่มากินอาหาร",{fame:7,business:5},buff("restaurant",3)),
  play("ช่วยแชร์ข่าวงานฟรี","งานได้รับความสนใจพอสมควร",{fame:3},buff("restaurant")),
  play("ไม่ร่วมจัด","ร้านค้าจัดงานขนาดเล็กเอง",{})],{needsKind:"restaurant"}),
 event("food-review","fame","นักรีวิวเจอร้านเด็ด","นักรีวิวมาเจอร้านอาหารอร่อยและอยากถ่ายคลิปแนะนำร้าน",[
  play("ช่วยแชร์คลิป","คลิปได้รับความสนใจ คนอยากลองอาหารเมืองเรา",{fame:5,business:3},buff("restaurant")),
  play("ให้ร้านจัดการเอง","ร้านลงคลิปตามปกติ",{fame:2})],{needsKind:"restaurant"}),
 event("food-free","people","ข้าวฟรีให้คนหิว","ร้านอาหารอยากแจกข้าวให้คนในเมืองหนึ่งวัน ขอให้ช่วยค่าอาหาร",[
  spend("สมทบค่าอาหาร 15,000 บาท",15000,"เจ้าของร้านแจกข้าวจนหมด ชาวเมืองอิ่มใจ",{people:7,business:4},buff("restaurant")),
  play("ชวนคนร่วมบริจาคโดยสมัครใจ","ร้านได้อาสาสมัครช่วยงาน",{people:4})],{needsKind:"restaurant"}),
 event("pub-concert","business","คืนนี้มีคอนเสิร์ต","เจ้าของผับอยากจัดคอนเสิร์ตใหญ่ แต่ชาวบ้านกังวลเรื่องเสียงดัง",[
  play("ให้จัดงานและขอให้ลดเสียง","งานสนุก คนแถวนั้นพอรับได้",{business:6,people:-2},buff("pub")),
  play("ให้จัดเต็มทั้งคืน","ผับขายดี แต่คนรอบ ๆ บ่นว่านอนไม่หลับ",{business:9,people:-8},buff("pub",3)),
  play("ไม่อนุญาตจัดงานใหญ่","ชุมชนสบายใจ แต่เจ้าของผับเสียดาย",{people:5,business:-6})],{needsKind:"pub"}),
 event("pub-birthday","image","เพลงให้ท่านนายก","วงดนตรีในผับแต่งเพลงขำ ๆ เกี่ยวกับรถติดในเมือง อยากให้นายกฟัง",[
  play("ขอไปฟังด้วยคน","ทุกคนหัวเราะ นายกได้รับคำชมว่าไม่ถือตัว",{image:6,business:3},buff("pub")),
  play("ส่งข้อความขอบคุณ","วงดนตรีดีใจที่นายกได้ฟัง",{image:2})],{needsKind:"pub"}),
 event("casino-visit","fame","แขกจากเมืองอื่น","คาสิโนจัดงานต้อนรับแขกต่างเมือง ขอให้ช่วยแนะนำสถานที่เที่ยวอื่นด้วย",[
  play("แนะนำโรงแรมและร้านอาหารในเมือง","แขกได้รู้จักเมืองมากขึ้น",{fame:5,business:3},buff("tourist")),
  play("ไม่ร่วมประชาสัมพันธ์","เจ้าของกิจการทำแผนของตนเอง",{})],{needsKind:"casino"}),
 event("casino-noise","people","เสียงดังจากคาสิโน","คนในละแวกคาสิโนบ่นว่ากลางคืนเสียงดัง",[
  play("ขอให้ลดเสียง","เพื่อนบ้านสบายใจขึ้น แต่กิจการเสียบรรยากาศบางส่วน",{people:6,business:-3},drop("casino",-100)),
  play("ให้เปิดตามเดิม","เจ้าของกิจการดีใจ แต่เพื่อนบ้านไม่พอใจ",{business:5,people:-6})],{needsKind:"casino"}),
 event("mall-sale","business","ห้างจัดมหกรรมลดราคา","ห้างอยากจัดวันลดราคาใหญ่และขอช่วยแชร์ข่าว",[
  play("ช่วยแชร์ข่าวให้","ลูกค้าสนใจงานลดราคา",{business:6,people:3},buff("mall")),
  play("ปล่อยให้ห้างโปรโมตเอง","ห้างจัดงานตามแผน",{})],{needsKind:"mall"}),
 event("park-run","people","วิ่งเล่นที่สวน","กลุ่มคนรักสุขภาพอยากจัดงานวิ่งเล็ก ๆ ในสวน",[
  spend("ช่วยค่าน้ำและอุปกรณ์ 10,000 บาท",10000,"งานสนุกและชาวเมืองได้ออกกำลังกาย",{people:6,image:3},buff("park")),
  play("ช่วยแชร์ข่าวฟรี","อาสาสมัครร่วมจัดงานเอง",{people:4})],{needsKind:"park"}),
 event("shop-local","business","ซื้อของร้านใกล้บ้าน","ร้านค้ารายย่อยอยากให้คนในเมืองรู้จักร้านของตัวเอง",[
  play("ช่วยแชร์ร้านทุกราย","ชุมชนรู้จักร้านค้าเพิ่มขึ้น",{business:6,integrity:3},buff("shop")),
  play("เลือกแชร์เฉพาะร้านเพื่อนสนิท","ร้านอื่นน้อยใจที่ไม่ได้รับโอกาส",{business:-4,integrity:-6})],{needsKind:"shop"}),
 event("province-help","government","จังหวัดขอความช่วยเหลือ","เมืองข้างเคียงจัดงานใหญ่แต่ขาดเงินซื้ออุปกรณ์ ขอให้เราช่วย 50,000 บาท",[
  spend("สมทบ 50,000 บาท",50000,"เมืองเพื่อนบ้านส่งคำขอบคุณ",{government:8,fame:4}),
  play("ช่วยประชาสัมพันธ์แทน","จังหวัดขอบคุณสำหรับความร่วมมือ",{government:3}),
  play("ขอเก็บงบไว้ในเมือง","จังหวัดเข้าใจว่าเรามีภาระของตัวเอง",{})]),
 event("province-ai","government","ของขวัญจากจังหวัด","จังหวัดมีโควต้าไฟจราจร AI เหลือหนึ่งจุด เสนอให้เมืองที่ดูแลการเดินทางดี",[
  {...trafficTask(85),success:result("เมืองผ่านเป้า จังหวัดมอบโควต้าให้",{government:7,admin:6},{aiCredits:1})},
  play("ไม่รับคำท้า","จังหวัดให้โอกาสเมืองอื่น",{})],{minLevel:3}),
 event("province-visit","government","แขกมาดูเมือง","จังหวัดส่งทีมมาเยี่ยมชมเมือง ขอให้นายกพาเดินดูด้วย",[
  play("พาไปชมเมืองด้วยตัวเอง","แขกประทับใจและส่งคำชม",{government:6,image:3}),
  spend("ช่วยค่าอาหารต้อนรับ 10,000 บาท",10000,"แขกได้รับการต้อนรับอย่างดี",{government:5,business:3},buff("restaurant"))],{needsKind:"restaurant"}),
 event("province-gift","government","เงินช่วยพัฒนาเมือง","จังหวัดส่งเงินช่วยเมือง 100,000 บาท ไม่มีเงื่อนไขพิเศษ",[
  play("รับเงินเข้าเมือง","เมืองได้รับเงินช่วยเหลือ",{government:5},{money:100000}),
  play("ให้จังหวัดส่งไปเมืองที่ต้องการกว่า","จังหวัดชื่นชมความเอื้อเฟื้อ",{government:4,image:4})],{minLevel:3}),
 event("good-road","image","วันนี้คนขับรถยิ้ม","ชาวเมืองบอกว่าช่วงนี้เดินทางดีขึ้น อยากชื่นชมทีมงาน",[
  play("ขอบคุณทุกคนที่ช่วยกัน","ชาวเมืองมีกำลังใจ",{image:6,admin:3},buff("all")),
  play("ฝากคำชมให้ทีมงาน","ทีมงานดีใจที่มีคนเห็นความพยายาม",{image:3})],{minPerformance:80}),
 // Some generous offers are perfectly ordinary; others cost trust immediately.
 event("donor","integrity","เศรษฐีใจดี","เจ้าของกิจการอยากบริจาค 500,000 บาทให้เมืองโดยไม่ขอสิ่งตอบแทน",[
  play("รับเงินเข้าคลังเมือง","เงินมาจากผู้บริจาคจริง ไม่มีข้อแลกเปลี่ยน",{integrity:4,business:3},{money:500000}),
  play("ขอบคุณแต่ไม่รับ","ผู้บริจาคยอมรับการตัดสินใจ",{integrity:2})],{moralOnly:true,minLevel:3,offerCooldown:7}),
 event("ai-gift","integrity","ไฟ AI ฟรีจริงหรือ?","ผู้ผลิตอยากให้โควต้า AI ฟรี 1 จุดเพื่อทดลองสินค้า และไม่ขอสิทธิพิเศษ",[
  play("รับข้อเสนอ","ผู้ผลิตให้โควต้าตามที่สัญญา",{business:3},{aiCredits:1}),
  play("ขอทราบชื่อผู้ให้ก่อน","เป็นบริษัทจริง เมืองได้โควต้าฟรี",{integrity:5},{aiCredits:1}),
  play("ไม่รับ","เมืองพลาดโอกาส แต่ไม่มีความเสียหาย",{})],{moralOnly:true,minLevel:3,offerCooldown:7}),
 event("envelope","integrity","ซองเงินหน้าห้อง","คนแปลกหน้าเสนอเงิน 300,000 บาท ถ้านายกช่วยโปรโมตเฉพาะร้านของเขา",[
  play("รับและโปรโมตตามที่ขอ","ร้านอื่นสังเกตเห็นความลำเอียง",{integrity:-10,business:-4},{money:300000}),
  play("ไม่รับเงิน แต่ให้ทุกคนโปรโมตเท่ากัน","ร้านเล็กชื่นชมความยุติธรรม",{integrity:7,business:3}),
  play("ไม่ตอบรับข้อเสนอ","คนแปลกหน้ากลับไป",{})],{moralOnly:true,minLevel:2,offerCooldown:5}),
 event("friend","integrity","เพื่อนเก่ามาขอฝาก","เพื่อนสมัยเรียนขอให้ช่วยโฆษณากิจการของเขาเป็นพิเศษ แลกเงิน 200,000 บาท",[
  play("รับเงินช่วยเพื่อน","เพื่อนดีใจ แต่คู่แข่งไม่พอใจ",{integrity:-9,business:-4},{money:200000}),
  play("ให้เข้าร่วมกับร้านอื่นตามปกติ","เพื่อนยอมรับและร้านอื่นรู้สึกเป็นธรรม",{integrity:6,business:3}),
  play("ปฏิเสธ","เพื่อนผิดหวัง แต่ไม่ได้ทำให้เมืองเสียหาย",{integrity:3})],{moralOnly:true,offerCooldown:5}),
 event("casino-money","integrity","เงินก้อนโตจากคาสิโน","เจ้าของคาสิโนเสนอ 2,000,000 บาท ขอให้นายกไม่สนใจคำร้องเรียนเรื่องเสียงดัง",[
  play("รับเงินและปล่อยเรื่องร้องเรียน","เงินเข้าคลัง แต่เพื่อนบ้านรู้สึกว่าถูกทอดทิ้ง",{integrity:-16,people:-8,business:5},{money:2000000}),
  play("ไม่รับเงินและขอให้ลดเสียง","ชาวบ้านชื่นชม เจ้าของกิจการผิดหวัง",{integrity:8,people:5,business:-4}),
  play("ขอให้บริจาคโดยไม่ตั้งเงื่อนไข","เจ้าของคาสิโนถอนข้อเสนอ",{integrity:4})],{moralOnly:true,needsKind:"casino",minLevel:10,offerCooldown:10}),
 // Only a handful of hand-written stories continue. Their next steps are not generic paperwork.
];
function playArc(id,category,title,actor,nodes,extra={}){
 const arc=PLAY_PREFIX+id;
 MAYOR_STORY_META[arc]={id:arc,category,title,actor,tone:"play"};
 for(const [node,heading,story,choices,options] of nodes){
  CITY_PLAY_EVENTS.push({...event(id+"-"+node,category,heading,story,choices,{...extra,...options}),id:"story-"+arc+"-"+node,playEvent:true,storyArc:arc,storyNode:node,...(node==="root"?{}:{storyOnly:true}),ignored:result("ไม่ได้ตอบกลับ เรื่องจบลง",{[category]:-2},{storyNext:null})});
 }
}
playArc("midnight-money","integrity","เงินปริศนา","คุณภพ",[
 ["root","เงินสองล้านตอนเที่ยงคืน","คุณภพโทรมาเสนอเงิน 2 ล้านบาทให้เมือง บอกเพียงว่าไว้วันหลังค่อยคุยกัน",[
  play("รับเงินไว้ก่อน","คุณภพโอนเงินตามที่พูด",{integrity:-5},{money:2000000,storyNext:"conflict"}),
  play("ถามว่าเขาต้องการอะไร","เขาหัวเราะและบอกว่าจะโทรมาใหม่",{integrity:3},{storyNext:"good"}),
  play("ไม่รับเงินที่ไม่รู้เงื่อนไข","เขาวางสายและไม่ติดต่อมาอีก",{integrity:6},{storyNext:null})]],
 ["conflict","เขากลับมาแล้ว","คุณภพขอให้ช่วยโปรโมตบริษัทของเขาเป็นพิเศษ มิฉะนั้นอยากได้เงินคืน",[
  play("ยอมช่วยโปรโมตเฉพาะบริษัทเขา","บริษัทได้โฆษณา ร้านอื่นรู้สึกถูกเอาเปรียบ",{integrity:-15,business:-6,image:-5},{storyNext:null}),
  play("คืนเงินทั้งหมดและไม่ให้สิทธิพิเศษ","คุณภพยอมจบเรื่อง เงินที่ยังคืนไม่ครบจะค้างชำระ",{integrity:5,image:3},{refund:2000000,storyNext:null}),
  play("ขอให้โปรโมตกับร้านอื่นอย่างเท่าเทียม","เขาไม่พอใจและเรียกเงินคืนครึ่งหนึ่ง",{integrity:3,business:3},{refund:1000000,storyNext:null})]],
 ["good","ความจริงของคุณภพ","เขาเคยอยู่เมืองนี้ตอนเด็ก ตอนนี้อยากช่วยบ้านเกิด แต่ขอให้ประกาศชื่อผู้บริจาค",[
  play("รับเงินบริจาคอย่างเปิดเผย","คุณภพโอนเงินเข้าคลังโดยไม่มีสิทธิพิเศษ",{integrity:7,image:4},{money:1000000,storyNext:null}),
  play("ขอบคุณแต่ไม่รับ","คุณภพยังยินดีที่ได้กลับบ้านเกิด",{integrity:3},{storyNext:null})]]
],{moralOnly:true,minLevel:10,offerCooldown:10});
playArc("ai-mystery","integrity","คนส่งโควต้า AI","คุณนัท",[
 ["root","โควต้า AI จากคนแปลกหน้า","คนที่ไม่ยอมบอกชื่อบริษัทเสนอส่งโควต้า AI ฟรี 1 จุด และเร่งให้ตอบ",[
  play("รับไว้ก่อน","โควต้าเข้าบัญชีเมืองแล้ว",{integrity:-5},{aiCredits:1,storyNext:"conflict"}),
  play("ถามชื่อและที่มาก่อน","เขาขอเวลาติดต่อบริษัท",{integrity:3},{storyNext:"good"}),
  play("ปฏิเสธ","เขาไม่ติดต่อกลับ",{integrity:4},{storyNext:null})]],
 ["conflict","โควต้ามีเจ้าของ","คุณนัทขอให้ช่วยโฆษณาบริษัทเขาเป็นพิเศษ แลกกับไฟ AI ที่ให้ไปแล้ว",[
  play("ยอมโฆษณา","คู่แข่งไม่พอใจที่เขาได้สิทธิพิเศษ",{integrity:-10,business:-5},{storyNext:null}),
  play("คืนโควต้าที่ยังไม่ได้ใช้","คุณนัทถอนข้อเสนอ หากใช้โควต้าแล้วต้องชดใช้มูลค่า 100,000 บาท",{integrity:4},{returnAI:1,storyNext:null})]],
 ["good","บริษัทตัวจริง","บริษัทติดต่อมาเอง ยืนยันว่าต้องการให้เมืองลองใช้ไฟ AI ฟรีโดยไม่ขออะไร",[
  play("รับโควต้า","เมืองได้รับโควต้าตามข้อเสนอ",{integrity:5},{aiCredits:1,storyNext:null}),
  play("ขอบคุณแต่ไม่รับ","บริษัทเข้าใจ",{integrity:2},{storyNext:null})]]
],{moralOnly:true,minLevel:3,offerCooldown:9});
playArc("food-hero","business","ร้านป้าดา","ป้าดา",[
 ["root","ร้านป้าดาจะปิดแล้ว","ป้าดาบอกว่าลูกค้ามาช้าเพราะรถติด เงินหมุนไม่พอจะจ่ายค่าแรง",[
  spend("ช่วยค่าแรงฉุกเฉิน 50,000 บาท",50000,"ป้าดาจ่ายค่าแรงพนักงานได้ทัน",{business:6,people:4},{storyNext:"good"}),
  play("ให้ช่วยกันโปรโมตร้านแทน","ป้าดาลองทำตามและหวังว่าลูกค้าจะมา",{business:3},{storyNext:"award"}),
  play("ไม่ช่วยด้วยงบเมือง","ป้าดาเข้าใจแต่ต้องลดเวลาทำงาน",{business:-4,people:-2},{storyNext:null})]],
 ["good","ป้าดามีข่าวดี","ร้านกลับมาขายดีแล้ว ป้าดาอยากจัดวันแจกข้าวขอบคุณคนในเมือง",[
  play("ช่วยแชร์ข่าว","ร้านแจกอาหารและมีคนมาช่วยมากมาย",{people:7,business:5}, {...buff("restaurant",3),storyNext:null}),
  play("ไปขอบคุณป้าดา","ป้าดายิ้มและมอบเงินสมทบเมือง 70,000 บาท",{image:5,business:5},{money:70000,storyNext:null})]],
 ["award","คลิปป้าดาดังแล้ว","คลิปอาหารของป้าดาถูกแชร์ ร้านกลับมาคึกคักโดยไม่ใช้งบเมือง",[
  play("แวะไปแสดงความยินดี","ลูกค้าชื่นชมนายกและร้านอาหารขายดี",{image:5,fame:4},{...buff("restaurant",2),storyNext:null}),
  play("ส่งข้อความยินดี","ป้าดาขอบคุณที่ช่วยแชร์ร้าน",{business:4},{storyNext:null})]]
],{needsKind:"restaurant",minLevel:2});
playArc("hotel-star","fame","แขกที่ไม่มีใครรู้จัก","คุณมีนา",[
 ["root","แขกโรงแรมขอพบ","โรงแรมโทรบอกว่าคุณมีนา นักเดินทางธรรมดาคนหนึ่ง อยากให้นายกแนะนำเมือง",[
  play("แนะนำเมืองด้วยตัวเอง","คุณมีนาประทับใจและถ่ายคลิปไว้",{image:4,fame:3},{storyNext:"good"}),
  play("ส่งแผนที่เที่ยวให้","เธอขอบคุณและออกเที่ยวตามแผนที่",{fame:3},{storyNext:null}),
  play("วันนี้ไม่มีเวลา","โรงแรมดูแลแขกตามปกติ",{}, {storyNext:null})]],
 ["good","คลิปดังข้ามคืน","ที่แท้คุณมีนาเป็นนักทำสารคดีชื่อดัง คลิปแนะนำเมืองมียอดชมสูง",[
  play("ขอบคุณและแชร์คลิป","เมืองได้รับความสนใจจากนักท่องเที่ยว",{fame:9,business:4},{...buff("tourist",3),storyNext:null}),
  play("ส่งข้อความขอบคุณส่วนตัว","เธอส่งเงินสมทบเมือง 100,000 บาท",{fame:5,image:4},{money:100000,storyNext:null})]]
],{needsKind:"hotel",minLevel:2});
playArc("factory-kid","image","ความฝันของต้น","ต้น",[
 ["root","เด็กฝึกงานคนแรก","ต้นอยากทำงานโรงงานเพื่อช่วยครอบครัว ขอให้นายกช่วยแนะนำช่องทางสมัคร",[
  play("แนะนำให้สมัครเหมือนคนอื่น","ต้นขอบคุณและเตรียมตัวสมัคร",{image:4,integrity:4},{storyNext:"good"}),
  play("ขอให้โรงงานจัดคนสอนสมัครงาน","เจ้าของโรงงานยินดีช่วยเด็ก ๆ ทุกคน",{people:4,business:3},{storyNext:"good"}),
  play("ฝากให้รับต้นเป็นกรณีพิเศษ","ต้นได้งาน แต่คนสมัครคนอื่นไม่พอใจ",{integrity:-7,image:-3},{storyNext:null})]],
 ["good","ต้นทำสำเร็จแล้ว","ต้นส่งรูปวันทำงานวันแรกมาให้ ครอบครัวดีใจมาก",[
  play("ส่งคำยินดี","ต้นส่งข้อความขอบคุณอย่างซึ้งใจ",{image:7,people:4},{storyNext:null}),
  play("ชวนโรงงานแบ่งปันประสบการณ์ให้เด็กคนอื่น","โรงงานร่วมกิจกรรมแนะแนว",{people:6,business:5},{...buff("factory"),storyNext:null})]]
],{needsKind:"factory",minLevel:2});
// Calls outside office hours: no extra story unless expressly written.
CITY_PLAY_EVENTS.push(
 event("night-fire","admin","ไฟไหม้ที่ {target}!","มีควันไฟออกจากอาคาร คนโทรขอความช่วยเหลือด่วน",[
  spend("ส่งทีมช่วยเหลือและงบฉุกเฉิน",60000,"ทีมช่วยเหลือควบคุมไฟได้",{admin:8,people:6}),
  gamble("ขอทีมเสริมจากจังหวัด",.75,result("ทีมเสริมมาทัน",{government:6,admin:5}),result("ทีมมาช้า การเดินทางสะดุด",{admin:-8,people:-5},drop("all"))),
  play("รอดูเหตุการณ์","ไฟลุกลามก่อนทีมช่วยเหลือมาถึง",{admin:-12,people:-8},drop("all"))],{emergencyOnly:true,target:["home","shop","restaurant","office","factory","hotel","mall","pub","casino"],ignored:result("ไม่มีคำสั่งทันเวลา ชาวเมืองเดือดร้อน",{admin:-10,people:-6},drop("all"))}),
 event("night-road","admin","รถติดหนักกลางคืน","รถหลายคันต่อคิวยาว คนกลับบ้านโทรเข้ามาร้องเรียน",[
  spend("ส่งทีมช่วยจัดการ 25,000 บาท",25000,"ทีมออกไปช่วยดูแลการจราจร",{admin:6,people:4}),
  play("ขอให้ทุกคนอดทนอีกหน่อย","บางคนไม่พอใจ แต่ทีมงานยังทำหน้าที่",{admin:-4,people:-3})],{emergencyOnly:true,ignored:result("ชาวเมืองรอคำตอบแต่ไม่ได้รับ",{admin:-8,people:-5})}),
 event("night-hotel","fame","แขกติดอยู่ที่โรงแรม","แขกของ {target} บ่นว่ากลับที่พักไม่ทันเพราะรถติด",[
  play("โทรขอโทษและประสานทีมช่วย","แขกประทับใจที่เมืองใส่ใจ",{fame:5,image:4}),
  play("บอกให้โรงแรมจัดการเอง","โรงแรมขอโทษแขกและผิดหวังในตัวนายก",{business:-5,fame:-5})],{emergencyOnly:true,target:["hotel"],ignored:result("แขกโพสต์ร้องเรียนเรื่องการเดินทาง",{fame:-8,business:-4})}),
 event("night-pub","people","เพื่อนบ้านนอนไม่หลับ","คนใกล้ {target} โทรมาแจ้งว่าเสียงดังมาก ขอให้ช่วยก่อนคืนนี้จะจบ",[
  play("ขอให้ลดเสียงทันที","ชุมชนขอบคุณ ผับเสียลูกค้าบางส่วน",{people:6,business:-4},drop("pub",-100)),
  play("ให้จัดงานจนจบ","ผับขายดี แต่ชาวบ้านไม่พอใจ",{business:4,people:-8},buff("pub"))],{emergencyOnly:true,target:["pub"],ignored:result("ชาวบ้านร้องเรียนเรื่องเสียงดังต่อ",{people:-7,image:-4})}),
 event("night-power","business","ไฟดับที่ {target}","เจ้าของกิจการโทรมาขอความช่วยเหลือ ลูกค้ากำลังรออยู่",[
  spend("ช่วยค่าแก้เหตุฉุกเฉิน 35,000 บาท",35000,"ทีมช่างช่วยแก้สถานการณ์ได้",{business:7,admin:5}),
  gamble("ขอให้ทีมช่างเดิมเข้าช่วย",.65,result("ทีมช่างมาทัน",{admin:4,business:4}),result("กิจการเสียเวลาและลูกค้า",{business:-7,admin:-4}))],{emergencyOnly:true,target:["shop","restaurant","office","factory","hotel","mall","pub","casino"],ignored:result("กิจการต้องรอความช่วยเหลือ",{business:-7,admin:-4})})
);
for(const d of CITY_PLAY_EVENTS){
 d.playEvent=true;d.offerCooldown??=3;
 if(["play-factory-late","play-hotel-review","play-map","play-night-road","play-night-hotel"].includes(d.id))d.maxPerformance=90;
 if(d.id==="story-play-midnight-money-conflict")d.ignored=result("คุณภพไม่ได้คำตอบ จึงขอเงินคืนทั้งหมด",{integrity:-4},{refund:2000000,storyNext:null});
 if(d.id==="story-play-ai-mystery-conflict")d.ignored=result("คุณนัทถอนโควต้าที่ให้มา",{integrity:-4},{returnAI:1,storyNext:null});
}
MAYOR_EVENTS.push(...CITY_PLAY_EVENTS);

function createMayorCore(definitions, random=Math.random){
const keys=["admin","image","fame","government","people","business","integrity"], byId=new Map(definitions.map(d=>[d.id,d]));
const clone=x=>JSON.parse(JSON.stringify(x));
const dayAt=t=>Math.floor((t-360)/1440), start=d=>d*1440+360, deadline=d=>start(d)+600;
const grade=v=>v>=86?"A":v>=71?"B":v>=51?"C":v>=26?"D":"F";
const clamp=v=>Math.max(0,Math.min(100,Math.trunc(v)));
function fresh(t){return {version:1,playEdition:1,day:dayAt(t),lastTime:t,scores:Object.fromEntries(keys.map(k=>[k,60])),issues:[],effects:[],history:[],flags:[],suspendedUntil:null,sequence:0,unpaid:0,audits:[],offerDays:{},started:false,nightAt:null,nightDay:null,stories:[],exploreQuota:{day:dayAt(t),used:{}}};}
function restore(saved,t){
 if(!saved||saved.version!==1)return fresh(t);
 const s={...fresh(t),...clone(saved)};s.scores=s.scores&&typeof s.scores==="object"?s.scores:{};
 for(const k of keys)s.scores[k]=clamp(Number.isFinite(s.scores[k])?s.scores[k]:60);
 for(const k of ["issues","effects","history","flags","stories","audits"])if(!Array.isArray(s[k]))s[k]=[];
 s.unpaid=Math.max(0,Number.isFinite(s.unpaid)?Math.floor(s.unpaid):0);
 if(!saved.offerDays||typeof saved.offerDays!=="object"){s.offerDays={};for(const h of s.history){const d=byId.get(h.eventId);if(d?.offerCooldown&&["success","failed"].includes(h.status)&&h.source!=="audit"){const day=h.day??dayAt(h.at);if(Number.isFinite(day))s.offerDays[h.eventId]=Math.max(s.offerDays[h.eventId]??-Infinity,day);}}}
 if(saved.playEdition!==1){
  // Preserve balances, scores, old results, accepted jobs and pending repayments.
  s.issues=s.issues.filter(i=>i.status!=="pending"||byId.get(i.eventId)?.playEvent);
  for(const x of s.stories)if(x.status==="active"&&!String(x.arc||"").startsWith(PLAY_PREFIX)){x.status="ended";x.endedDay=s.day;x.dueDay=null;x.closedIds=[];}
  s.nightAt=null;s.nightDay=null;s.playEdition=1;
 }
 reconcileExploreQuota(s,true);stories(s);return s;
}
const active=(s,t)=>s.suspendedUntil!==null&&t<s.suspendedUntil;
function score(s,changes,t){let crossed=false;for(const [k,delta] of Object.entries(changes||{})){if(!keys.includes(k))continue;const before=s.scores[k];s.scores[k]=clamp(before+delta);if(before>25&&s.scores[k]<=25)crossed=true;}if(crossed&&!active(s,t))s.suspendedUntil=start(dayAt(t)+2);}
function count(level){if(level<=5)return 1;if(level<=10)return 1+(random()<.5?1:0);if(level<=20)return 2;if(level<=30)return 2+(random()<.5?1:0);if(level<=50)return 3;return 3+(random()<.5?1:0);}

function stories(s){if(!Array.isArray(s.stories))s.stories=[];return s.stories;}
function arcEligible(s,a,city){
 const list=stories(s);if(list.filter(x=>x.status==="active").length>=2||list.some(x=>x.status==="active"&&x.category===a.category))return false;
 if(list.some(x=>x.arc===a.id&&x.status==="ended"&&s.day-(x.endedDay??s.day)<10))return false;
 if(s.issues.some(i=>i.status==="pending"&&i.source!=="story"&&byId.get(i.eventId)?.storyArc&&i.category===a.category))return false;
 if(a.id==="restaurants"&&!Object.keys(city.buildingCounts||{}).some(k=>buildGroup(k,city)==="restaurant"&&city.buildingCounts[k]>0))return false;
 return true;
}
function kindPresent(city,kind){return Object.entries(city.buildingCounts||{}).some(([k,n])=>n>0&&city.catalog?.[k]?.kind===kind);}
function playFits(d,city){
 if(d.needsKind&&!kindPresent(city,d.needsKind))return false;
 if(d.alsoKind&&!kindPresent(city,d.alsoKind))return false;
 if(d.minPerformance!=null&&!(Number.isFinite(city.recentPerformance)&&city.recentPerformance>=d.minPerformance))return false;
 if(d.maxPerformance!=null&&!(Number.isFinite(city.recentPerformance)&&city.recentPerformance<d.maxPerformance))return false;
 return true;
}
function storyEventAllowed(s,d,city){
 if(!d.playEvent||d.storyOnly||!playFits(d,city))return false;
 if(d.offerCooldown&&Number.isFinite(s.offerDays?.[d.id])&&s.day-s.offerDays[d.id]<d.offerCooldown)return false;
 if(!d.storyArc)return true;
 return arcEligible(s,MAYOR_STORY_META[d.storyArc],city)&&!s.issues.some(i=>i.status==="pending"&&byId.get(i.eventId)?.storyArc&&i.category===d.category);
}
function storyNextDay(s,x,node){return s.day+(node==="award"?2:node==="return"&&x.node==="mediator"?2:1);}
function storyCloseIds(x,city){
 if(x.closedIds?.length)return;
 const ids=Object.keys(city.buildingIds||{}).filter(k=>buildGroup(k,city)==="restaurant").flatMap(k=>city.buildingIds[k]||[]).sort((a,b)=>a-b);
 x.closedIds=ids.slice(0,Math.ceil(ids.length/2));
}
function storyHook(s,i,r,city,t,cashDelta){
 const d=byId.get(i.eventId);let x=i.storyId?stories(s).find(y=>y.id===i.storyId):null;
 let node=r.storyNext,arc=d?.storyArc;
 if(!d?.playEvent)return "";
 if(!node&&!x)return "";
 if(!arc&&!x){
  if(i.eventId==="business-restaurant"){arc="restaurants";node=(i.selected===3||i.status==="expired"||i.status==="failed")?"conflict":i.selected===2?"good":null;}
  else if(i.eventId==="integrity-contract"&&i.selected===5&&cashDelta>0){arc="two-million";node="conflict";}
  else if(i.eventId==="v72-road-fund"&&i.selected===0){arc="two-million";node="conflict";}
  else if(i.eventId==="people-cost"&&i.selected===0&&i.status==="success"){arc="family";node="good";}
  else if(i.eventId==="admin-traffic"&&i.selected===1&&i.status==="success"){arc="traffic";node="good";}
  else if(i.eventId==="moral-public-grant"&&i.status==="success"&&cashDelta>0&&random()<.5){arc="grant";node="good";}
  else if(i.eventId==="v72-festival"&&i.selected===2){arc="foodfest";node="conflict";}
  else if(i.eventId==="v72-central-grant"&&i.selected===0&&i.status==="success"){arc="model";node="good";}
 }
 if(!x){
  const a=MAYOR_STORY_META[arc];if(!a||!arcEligible(s,a,city))return "";
  if(!d?.storyArc&&!node)return "";
  x={id:"thread-"+i.id,arc:a.id,title:a.title,actor:a.actor,category:a.category,tone:a.tone,startedDay:s.day,status:"active",node:"root",dueDay:null,closedIds:[],history:[],cash:0,turns:0};
  const previous=stories(s).filter(y=>y.arc===a.id&&y.status==="ended").at(-1);
  if(previous)x.previousStory={id:previous.id,endedDay:previous.endedDay,report:previous.history?.at(-1)?.report||"",choice:previous.history?.at(-1)?.choiceTitle||""};
  stories(s).push(x);i.storyId=x.id;
 }
 x.turns++;x.cash+=cashDelta;
 if(r.storyClose)storyCloseIds(x,city);
 if(r.storyOpen)x.closedIds=[];
 if(x.turns>=8&&node!==null)node="final";
 if(x.node==="final")node=null;
 x.history.push({day:s.day,eventId:i.eventId,issueId:i.id,choice:i.selected??null,choiceTitle:d?.choices?.[i.selected]?.title||"ไม่ได้ตอบตามกำหนด",report:r.report||"",cashDelta,scores:clone(r.scores||{})});
 if(node){x.dueDay=storyNextDay(s,x,node);x.node=node;return "";}
 x.status="ended";x.endedDay=s.day;x.dueDay=null;x.closedIds=[];return "";
}
function storyPulse(s,city,t){
 if(active(s,t)||t>=deadline(s.day))return;
 for(const x of stories(s)){
  if(x.status!=="active"||x.dueDay==null||x.dueDay>s.day||s.issues.some(i=>i.storyId===x.id&&i.status==="pending"))continue;
  const d=byId.get("story-"+x.arc+"-"+x.node);if(!d)continue;
  if(d.needsKind&&!kindPresent(city,d.needsKind)){x.status="ended";x.endedDay=s.day;x.dueDay=null;x.closedIds=[];continue;}
  const prior=x.history.at(-1);
   const i={id:++s.sequence,eventId:d.id,category:d.category,status:"pending",source:"story",day:s.day,storyId:x.id,
    context:prior?"ครั้งก่อน: "+prior.choiceTitle:""};
   s.issues.push(i);
 }
}
function storyClosed(s,id){return (s?.stories||[]).some(x=>x.status==="active"&&x.closedIds?.includes(id));}
function hasBuildings(need,city){return Object.entries(need||{}).every(([key,n])=>(city.buildingCounts?.[key]||0)>=n);}
// Use the service category, not the individual building model, to prevent repeat requests.
function buildGroup(key,city){const k=city.catalog?.[key]?.kind||String(key).split("_")[0];return k==="office"||k==="factory"?"work":k;}
function buildTaskDays(s,city){
 if(!s.buildTaskDays||typeof s.buildTaskDays!=="object"){
  s.buildTaskDays={};
  for(const h of s.history||[]){
   if(h.status!=="working")continue;
   const task=h.task||(byId.get(h.eventId)?.choices||[]).map(o=>o.task).find(t=>t?.kind==="build");
   if(task?.kind!=="build"||(!h.task&&!String(h.report||"").includes("ก่อสร้าง")))continue;
   const k=buildGroup(task.key,city),d=Number.isInteger(h.day)?h.day:dayAt(h.at);
   if(Number.isInteger(d))s.buildTaskDays[k]=Math.max(s.buildTaskDays[k]??-Infinity,d);
  }
 }
 return s.buildTaskDays;
}
function buildTaskBlock(s,o,city,issue=null){
 if(o.task?.kind!=="build")return "";
 const task=o.task,b=city.catalog?.[task.key],group=buildGroup(task.key,city);
 if(!b)return "ไม่พบข้อมูลอาคาร";
 const last=buildTaskDays(s,city)[group];
 if(Number.isInteger(last)&&s.day-last<3)return "เพิ่งรับภารกิจสร้างประเภทนี้ ต้องเว้น 3 วัน";
 const duplicate=s.issues.some(i=>i.id!==issue?.id&&i.day===s.day&&(
  i.status==="working"&&i.task?.kind==="build"&&buildGroup(i.task.key,city)===group||
  i.status==="pending"&&(!issue||i.id<issue.id)&&(byId.get(i.eventId)?.choices||[]).some(x=>x.task?.kind==="build"&&buildGroup(x.task.key,city)===group)
 ));
 if(duplicate)return "มีเรื่องก่อสร้างประเภทเดียวกันอยู่แล้ว";
 if(typeof city.capacityNeed!=="function")return "ยังไม่มีข้อมูลความจุ";
 const need=city.capacityNeed(group);
 const unit=group==="home"?b.residents:group==="work"?b.jobs:group==="hotel"?b.beds:b.service;
 if(!need||!Number.isFinite(unit)||unit<=0)return "ยังไม่มีข้อมูลความจุ";
 if(!(need.deficit>0))return "ความจุเดิมเพียงพอ ไม่จำเป็นต้องสร้างเพิ่ม";
 // Fixed-size contracts are offered only when their quantity matches actual unmet capacity.
 if(task.count>Math.ceil(need.deficit/unit))return "จำนวนอาคารตามข้อเสนอเกินความจำเป็น";
 if(need.capacity>0&&task.count*unit>need.deficit+Math.max(1,Math.ceil(unit/2)))return "ขนาดโครงการเกินความต้องการ";
 return "";
}
function eligibleOption(s,o,city,issue=null){if(o.cost>0&&city.money<o.cost)return false;if(o.grant>0&&s.unpaid>0)return false;if(!Object.entries(o.requires||{}).every(([k,n])=>s.scores[k]>=n)||!hasBuildings(o.requiresBuildings,city))return false;if(o.task?.kind==="build"){if(buildTaskBlock(s,o,city,issue))return false;const b=city.catalog?.[o.task.key];if(!b||!b.unlocked||!Number.isFinite(b.cost)||b.cost<0||city.canBuild?.(o.task.key,o.task.count)!==true)return false;const net=Math.max(0,b.cost*o.task.count-(o.grant||0));if(net>Math.max(0,city.money))return false;}return true;}
function options(s,issue,city){
 const d=byId.get(issue.eventId);if(!d)return [];
 return d.choices.map((o,i)=>({index:i,...clone(o),enabled:eligibleOption(s,o,city,issue),capacityBlock:buildTaskBlock(s,o,city,issue),payable:Math.max(0,Math.floor(o.cost||0)),debtBlock:!!(o.grant>0&&s.unpaid>0)}));
}
function candidates(s,city,category){
 const pool=definitions.filter(d=>storyEventAllowed(s,d,city)&&(!category||d.category===category)&&city.level>=d.minLevel&&hasBuildings(d.requiresBuildings,city)&&!s.issues.some(i=>i.eventId===d.id)&&(!d.choices.some(o=>o.task?.kind==="build")||d.choices.some(o=>o.task?.kind==="build"&&eligibleOption(s,o,city))));
 return pool.filter(d=>!d.emergencyOnly&&!d.moralOnly);
}
function issue(s,city,category,source){
 let a=candidates(s,city,category);
 if(source==="daily")a=a.filter(d=>!s.issues.some(i=>i.day===s.day&&i.category===d.category&&["pending","working"].includes(i.status)));
 if(!a.length)return null;
 const build=a.filter(d=>d.choices.some(o=>o.task?.kind==="build")),quick=a.filter(d=>!d.storyArc&&!d.choices.some(o=>o.task?.kind==="build")),roots=a.filter(d=>d.storyArc);
 const roll=random(),pool=roll<.45&&build.length?build:roll>.95&&roots.length?roots:quick.length?quick:build.length?build:roots.length?roots:a;
 const d=pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];
 const i={id:++s.sequence,eventId:d.id,category:d.category,status:"pending",source,day:s.day};s.issues.push(i);return i;
}
function ensureDailyCoverage(s,city,t){
 if(active(s,t)||t>=deadline(s.day))return;
 const limit=city.level>=15?5:4;
 // Count today's completed events too; do not refill after each answer.
 const daily=s.issues.filter(i=>i.source==="daily"&&byId.get(i.eventId)?.playEvent).length;
 for(let n=daily;n<limit;n++)if(!issue(s,city,null,"daily"))break;
}
function specialIssue(s,city,kind,t){const pool=definitions.filter(d=>d[kind]&&city.level>=d.minLevel&&storyEventAllowed(s,d,city)&&hasBuildings(d.requiresBuildings,city)&&!s.issues.some(i=>i.eventId===d.id)&&(!d.target||Object.keys(city.buildingIds||{}).some(k=>d.target.includes(city.catalog?.[k]?.kind)&&city.buildingIds[k].length)));if(!pool.length)return null;const d=pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];const i={id:++s.sequence,eventId:d.id,category:d.category,status:"pending",source:kind==="emergencyOnly"?"night":"moral",day:s.day};if(i.source==="night"){i.openedAt=t;i.deadline=Math.min(start(s.day+1),t+120);if(d.target){const targets=Object.keys(city.buildingIds).filter(k=>d.target.includes(city.catalog[k]?.kind)).flatMap(k=>city.buildingIds[k].map(id=>({id,name:city.catalog[k].name+" #"+id})));i.target=targets[Math.min(targets.length-1,Math.floor(random()*targets.length))];}}s.issues.push(i);return i;}
function planNight(s,t){if(s.nightDay===s.day)return;s.nightDay=s.day;s.nightAt=null;if(active(s,t))return;const first=start(s.day)+720,last=start(s.day)+960;if(t<=last){const earliest=Math.max(first,Math.ceil(t));if(random()<.55)s.nightAt=earliest+Math.floor(random()*(last-earliest+1));}}
function startDay(s,city,t){s.started=true;planNight(s,t);if(active(s,t)||t>=deadline(s.day))return;storyPulse(s,city,t);ensureDailyCoverage(s,city,t);if(random()<.65)specialIssue(s,city,"moralOnly",t);}
function issueDeadline(i){return i.source==="night"&&Number.isFinite(i.deadline)?i.deadline:deadline(i.day);}
function needsAdvance(s,t){return !s?.started||s.day!==dayAt(t)||s.nightDay!==s.day||s.lastTime<deadline(s.day)&&t>=deadline(s.day)||Number.isFinite(s.nightAt)&&t>=s.nightAt||s.issues.some(i=>i.source==="night"&&i.status==="pending"&&t>=issueDeadline(i));}
function nightPulse(s,city,t){if(!Number.isFinite(s.nightAt)||t<s.nightAt)return;const at=s.nightAt;s.nightAt=null;if(active(s,at))return;specialIssue(s,city,"emergencyOnly",at);}
function cancelInvalidNight(s,city,t){
 for(const i of s.issues)if(i.source==="night"&&i.status==="pending"&&i.target&&!Object.values(city.buildingIds||{}).some(ids=>ids.includes(i.target.id))){
  i.status="deferred";record(s,i,"อาคารเป้าหมายไม่มีอยู่แล้ว เจ้าหน้าที่ยุติคำขอเดิมโดยไม่คิดคะแนนหรือรางวัล",t,{cashDelta:0,scoreChanges:{}});
 }
}
function record(s,i,report,t,details=null){if(byId.get(i.eventId)?.offerCooldown&&["success","failed","expired"].includes(i.status)&&i.source!=="audit"){s.offerDays??={};s.offerDays[i.eventId]=dayAt(t);}s.history.push({id:i.id,eventId:i.eventId,category:i.category,status:i.status,report,at:t,source:i.source,day:i.day,...(i.storyId?{storyId:i.storyId}:{}),...(i.task?{task:clone(i.task)}:{}),...(i.target?{target:clone(i.target)}:{}),...(details?{details}: {})});}
function apply(s,i,result,city,t,cashBefore=city.money){const r={...(result||{})},before={...s.scores},aiBefore=city.aiCredits;if(r.money)city.money+=r.money;if(r.refund>0||r.returnAI>0){
 let amount=r.refund||0;if(r.returnAI>0){const n=Math.min(r.returnAI,Math.max(0,city.aiCredits||0));city.aiCredits-=n;amount+=(r.returnAI-n)*100000;}
 if(amount){const refund=repay(s,city,amount);r.report=(r.report||"คืนเงิน")+" · คืนแล้ว "+refund.paid.toLocaleString("th-TH")+" บาท"+(refund.remaining?" ค้างคืน "+refund.remaining.toLocaleString("th-TH")+" บาท":"");}
 }if(r.aiCredits&&Number.isFinite(city.aiCredits))city.aiCredits=Math.min(100000,Math.max(0,city.aiCredits+r.aiCredits));score(s,r.scores,t);const scoreChanges=Object.fromEntries(Object.keys(r.scores||{}).filter(k=>keys.includes(k)).map(k=>[k,{before:before[k],after:s.scores[k],delta:s.scores[k]-before[k]}]));for(const e of r.effects||[]){if(["floodDamage","fillPopulation"].includes(e.kind)){city.applyEffect?.(clone(e));}else if(t<start(i.day+1)||i.task&&byId.get(i.eventId)?.playEvent){s.effects.push({...clone(e),expires:start(dayAt(t)+1),source:i.id});}}for(const flag of r.flags||[])if(!s.flags.includes(flag))s.flags.push(flag);const cashDelta=city.money-cashBefore,aiDelta=Number.isFinite(aiBefore)?city.aiCredits-aiBefore:0;const storyNote=i.source==="audit"||i.source==="debt"?"":storyHook(s,i,r,city,t,cashDelta);const report=mayorV72Narrative(i,r,scoreChanges,cashDelta,aiDelta)+storyNote;record(s,i,report,t,{money:r.money||0,scores:clone(r.scores||{}),effects:clone(r.effects||[]),paid:i.paid||0,grant:i.grant||0,scoreChanges,cashDelta,aiCredits:aiDelta});if(i.source!=="audit"&&i.source!=="debt"&&i.selected!=null)registerAudit(s,i,r,t,aiDelta);return report;}
function choose(s,id,index,city,t){cancelInvalidNight(s,city,t);const i=s.issues.find(x=>x.id===id);if(!i||i.status!=="pending"||active(s,t)||dayAt(t)!==i.day||t>=issueDeadline(i))return {ok:false};const o=options(s,i,city)[index];if(!o?.enabled)return {ok:false};const cashBefore=city.money;if(o.payable)city.money-=o.payable;if(o.grant)city.money+=o.grant;i.selected=index;i.paid=o.payable;i.grant=o.grant||0;if(o.task){i.status="working";i.task=clone(o.task);if(o.task.kind==="build"){i.baseline=(city.buildingIds?.[o.task.key]||[]).slice();buildTaskDays(s,city)[buildGroup(o.task.key,city)]=s.day;}const objective=o.task.kind==="build"?"ก่อสร้าง "+(city.catalog?.[o.task.key]?.name||o.task.key)+" จำนวน "+o.task.count+" แห่ง":"ทำให้ภารกิจเดินทางสำเร็จถึง "+o.task.target+"%";const report="รับภารกิจแล้ว! "+objective+" ก่อน 06:00 วันถัดไป"+(i.paid?" และอนุมัติงบ "+i.paid.toLocaleString("th-TH")+" บาท":"")+(i.grant?" โดยได้รับเงินสนับสนุน "+i.grant.toLocaleString("th-TH")+" บาท ซึ่งต้องคืนหากไม่ผ่านเงื่อนไข":"")+" คะแนนจะสรุปเมื่อภารกิจสิ้นสุด";record(s,i,report,t,{money:0,scores:{},effects:[],paid:i.paid,grant:i.grant,scoreChanges:{},cashDelta:city.money-cashBefore});return {ok:true,working:true,report};}const won=o.chance===undefined||random()<o.chance;i.status=won?"success":"failed";i.rollWon=won;return {ok:true,won,report:apply(s,i,won?o.success:o.failure,city,t,cashBefore)};}
function repay(s,city,amount){
 const due=Math.max(0,Math.floor(amount||0)),paid=Math.min(Math.max(0,Math.floor(city.money)),due);
 city.money-=paid;s.unpaid+=due-paid;return {paid,remaining:due-paid};
}
function finish(s,i,city,t,won){
 if(i.status!=="working")return false;const o=byId.get(i.eventId)?.choices[i.selected];if(!o){i.status="deferred";return false;}
 i.status=won?"success":"failed";const cashBefore=city.money,r={...(won?o.success:o.failure)};
 if(!won&&i.grant){const debt=repay(s,city,i.grant);r.report=(r.report||"ภารกิจไม่สำเร็จ")+" · คืนเงินแล้ว "+debt.paid.toLocaleString("th-TH")+" บาท"+(debt.remaining?" ค้างคืน "+debt.remaining.toLocaleString("th-TH")+" บาท":" ครบจำนวน");}
 if(i.task?.kind==="performance"){const rate=city.performanceForDay?.(i.day);r.report=(r.report||"สรุปผลงาน")+" · ผลปิดรอบ "+(Number.isFinite(rate)?rate.toFixed(1)+"%":"ไม่มีข้อมูลทริปที่ตัดสินผล")+" (เป้าหมาย "+i.task.target+"%)";}
 apply(s,i,r,city,t,cashBefore);return true;
}
function registerAudit(s,i,r,t,aiDelta){
 const d=byId.get(i.eventId);if(!d||!mayorRiskyOffer(d,i.selected,r))return;
 if(!Array.isArray(s.audits))s.audits=[];
 if(s.audits.some(a=>a.issueId===i.id))return;
 const severity=Math.max(5,-(r.scores?.integrity||0)),cash=Math.max(0,Math.floor(r.money||0));
 const detected=random()<Math.min(.92,.40+severity*.018);
 const dueDay=dayAt(t)+2+Math.floor(random()*3);
 s.audits.push({issueId:i.id,eventId:i.eventId,category:i.category,choice:d.choices[i.selected]?.title||d.title,cash,ai:Math.max(0,aiDelta||0),dueDay,detected,status:"pending"});
}
function settleAudits(s,city,t){
 for(const a of s.audits||[]){
  if(a.status!=="pending"||a.dueDay>s.day)continue;
  a.status=a.detected?"recovered":"closed";
  if(!a.detected)continue;
  const i={id:++s.sequence,eventId:a.eventId,category:"integrity",status:"failed",source:"audit",day:s.day};
  const before=city.money,refund=repay(s,city,a.cash),take=Math.min(a.ai,Math.max(0,city.aiCredits||0));
  const r={scores:{integrity:-8,image:-5},aiCredits:-take,report:"ผลตรวจสอบย้อนหลัง: พบผลประโยชน์ทับซ้อนจากการเลือก "+a.choice+" · หน่วยตรวจสอบเรียกเงินคืน "+a.cash.toLocaleString("th-TH")+" บาท คืนจริง "+refund.paid.toLocaleString("th-TH")+" บาท"+(refund.remaining?" เหลือค้าง "+refund.remaining.toLocaleString("th-TH")+" บาท":"")+(a.ai>take?" · โควต้าที่ถูกใช้ไปแล้วไม่สามารถเรียกคืนได้ แต่บันทึกความผิดไว้":"")};
  apply(s,i,r,city,t,before);
 }
}
function collectDebt(s,city,t){
 if(!(s.unpaid>0)||!(city.money>0))return;
 const paid=Math.min(s.unpaid,Math.floor(city.money*.2));if(!paid)return;
 city.money-=paid;s.unpaid-=paid;
 record(s,{id:++s.sequence,eventId:"mayor-debt",category:"government",status:"settled",source:"debt",day:s.day},"ฝ่ายการเงินชำระหนี้เงินสนับสนุนและเงินเรียกคืน "+paid.toLocaleString("th-TH")+" บาท · คงเหลือ "+s.unpaid.toLocaleString("th-TH")+" บาท",t,{cashDelta:-paid,scoreChanges:{}});
}
function taskSuccess(i,city){
 const task=i.task;if(!task)return false;
 if(task.kind==="build"){const old=new Set(i.baseline||[]);return new Set((city.buildingIds?.[task.key]||[]).filter(id=>!old.has(id))).size>=task.count;}
 if(task.kind==="performance"){const rate=city.performanceForDay?.(i.day);return Number.isFinite(rate)&&rate>=task.target;}
 return false;
}
// Contracts are settled once from the final ledger and buildings still standing.
function checkTasks(s,city,t){for(const i of s.issues)if(i.status==="working"&&t>=start(i.day+1))finish(s,i,city,start(i.day+1),taskSuccess(i,city));}
function expire(s,city,t){
 cancelInvalidNight(s,city,t);
 for(const i of s.issues){
  if(i.status!=="pending"||t<issueDeadline(i))continue;
  const at=issueDeadline(i),d=byId.get(i.eventId);
  if(active(s,at)){i.status="deferred";record(s,i,"อยู่ระหว่างพักอำนาจ เจ้าหน้าที่รับเรื่องไว้โดยไม่หักคะแนนซ้ำ",at,{cashDelta:0,scoreChanges:{}});continue;}
  i.status="expired";const r=d?.playEvent||i.source==="night"||i.source==="story"||d?.storyArc?d?.ignored:null;
  apply(s,i,r||{scores:{[i.category]:-10},report:"ละเลยการตัดสินใจก่อน 16:00",...(d?.storyArc?{storyNext:"conflict"}:{})},city,at);
 }
}
function advance(s,city,t){
 if(t<s.lastTime)throw new Error("Mayor clock cannot run backward");
 if(!s.started)startDay(s,city,s.lastTime);
 while(s.day<dayAt(t)){
  const boundary=start(s.day+1);
  expire(s,city,deadline(s.day));nightPulse(s,city,boundary);expire(s,city,boundary);
  checkTasks(s,city,boundary);
  s.effects=s.effects.filter(e=>e.expires>boundary);s.issues=[];s.day++;
  s.exploreQuota={day:s.day,used:{}};
  collectDebt(s,city,boundary);settleAudits(s,city,boundary);startDay(s,city,boundary);
 }
 planNight(s,t);storyPulse(s,city,t);ensureDailyCoverage(s,city,t);
 expire(s,city,t);nightPulse(s,city,t);expire(s,city,t);checkTasks(s,city,t);s.lastTime=t;
}
const EXPLORE_DAILY_LIMIT=3;
// Persist used quota separately from the issue list; reconcile older saves without
// double-counting an issue which has both an acceptance and a completion history.
function reconcileExploreQuota(s,includeHistory=false){
 const valid=s.exploreQuota?.day===s.day&&s.exploreQuota.used&&typeof s.exploreQuota.used==="object";
 if(!valid)s.exploreQuota={day:s.day,used:{}};
 const seen=Object.fromEntries(keys.map(k=>[k,new Set()]));
 const mark=(i,day)=>{if(i.source==="explore"&&day===s.day&&seen[i.category]&&i.id!=null)seen[i.category].add(i.id);};
 for(const i of s.issues||[])mark(i,i.day);
 if(includeHistory||!valid){
  const first=new Set();
  for(const h of s.history||[]){if(h.source!=="explore"||h.id==null||first.has(h.id))continue;first.add(h.id);mark(h,Number.isInteger(h.day)?h.day:dayAt(h.at));}
 }
 for(const k of keys){const n=s.exploreQuota.used[k];s.exploreQuota.used[k]=Math.min(EXPLORE_DAILY_LIMIT,Math.max(Number.isFinite(n)?Math.floor(n):0,seen[k].size,0));}
 return s.exploreQuota;
}
function exploreRemaining(s,category){if(!keys.includes(category))return 0;return EXPLORE_DAILY_LIMIT-reconcileExploreQuota(s).used[category];}
function explore(s,city,category,t){
 if(!keys.includes(category)||!exploreRemaining(s,category)||active(s,t)||t>=deadline(s.day)||dayAt(t)!==s.day||s.issues.some(i=>i.category===category&&["pending","working"].includes(i.status)))return null;
 const q=reconcileExploreQuota(s),used=q.used[category],i=issue(s,city,category,"explore");
 if(i)q.used[category]=Math.min(EXPLORE_DAILY_LIMIT,used+1);
 return i;
}
function tripReward(s,base,scope,isTourist,t){const es=s.effects.filter(e=>t<e.expires&&(e.scope==="all"||e.scope===scope||isTourist&&e.scope==="tourist"));const multipliers=es.filter(e=>e.kind==="tripMultiplier"||e.kind==="touristMultiplier").map(e=>e.value);const delta=Math.min(0,...es.filter(e=>e.kind==="tripDelta").map(e=>e.value));return Math.max(0,Math.floor(base*Math.max(1,...multipliers)+delta));}
return {fresh,restore,grade,dayAt,start,deadline,issueDeadline,needsAdvance,noon:deadline,active,options,advance,explore,exploreRemaining,choose,checkTasks,tripReward,storyClosed};
}
if(typeof window!=='undefined')window.SMMayorCore={createMayorCore,MAYOR_EVENTS,MAYOR_CATEGORIES};
if(typeof module!=='undefined'&&module.exports)module.exports={createMayorCore,MAYOR_EVENTS,MAYOR_CATEGORIES};
