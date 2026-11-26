'use strict';
// Isolated mayor prototype. Not loaded by the live game. Integration must supply verified city adapters.
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
 // The result card already shows actual scores, cash, AI credits and buffs.
 // Keep the narrative focused on what happened, not a second score report.
 return r.report||'สรุปผลการตัดสินใจ';
}

// v7.3 accepted construction/performance tasks can finish; never offer them again.
MAYOR_EVENTS.push(...[{"id":"play-home","category":"people","title":"มีคนอยากย้ายมาอยู่เมืองเรา","story":"ครอบครัวใหม่กำลังมองหาบ้าน แต่ที่พักไม่พอ จะสร้างเพิ่มไหม?","choices":[{"title":"สร้างบ้านเพิ่ม 1 หลัง","task":{"kind":"build","key":"home_starter","count":1},"success":{"report":"ครอบครัวใหม่มีบ้านให้ย้ายเข้าแล้ว!","scores":{"people":7,"admin":3},"money":30000},"failure":{"report":"สร้างไม่ครบตามที่รับปากไว้","scores":{"people":-8}}},{"title":"สร้างบ้านเพิ่ม 2 หลัง","task":{"kind":"build","key":"home_starter","count":2},"success":{"report":"ชาวเมืองดีใจที่มีบ้านรองรับมากขึ้น","scores":{"people":10,"admin":4},"money":60000},"failure":{"report":"สร้างไม่ครบตามที่รับปากไว้","scores":{"people":-8}}},{"title":"ยังไม่ขยายบ้านตอนนี้","success":{"report":"ครอบครัวเหล่านั้นต้องรอบ้านว่าง","scores":{"people":-3}}}],"minLevel":9007199254740991,"rollbackOnly":true},{"id":"play-food","category":"people","title":"ชาวเมืองหิวแล้ว!","story":"ร้านอาหารเต็มจนหลายคนหาที่กินไม่ได้ ขอร้านเพิ่มหน่อยนะท่านนายก","choices":[{"title":"สร้างร้านอาหาร 1 แห่ง","task":{"kind":"build","key":"restaurant_starter","count":1},"success":{"report":"ร้านใหม่เปิดแล้ว ชาวเมืองยิ้มออก","scores":{"people":7,"business":3},"money":50000,"effects":[{"kind":"tripMultiplier","scope":"restaurant","value":2}]},"failure":{"report":"สร้างไม่ครบตามที่รับปากไว้","scores":{"people":-8}}},{"title":"สร้างร้านอาหาร 2 แห่ง","task":{"kind":"build","key":"restaurant_starter","count":2},"success":{"report":"ร้านใหม่ช่วยเพิ่มที่นั่งให้คนในเมือง","scores":{"people":10,"business":4},"money":100000,"effects":[{"kind":"tripMultiplier","scope":"restaurant","value":3}]},"failure":{"report":"สร้างไม่ครบตามที่รับปากไว้","scores":{"people":-8}}},{"title":"ให้รอร้านที่มีอยู่ก่อน","success":{"report":"คนที่หิวต้องรอต่อไป","scores":{"people":-4}}}],"minLevel":9007199254740991,"rollbackOnly":true},{"id":"play-shop","category":"people","title":"ซื้อของไม่ทัน","story":"ร้านค้าใกล้บ้านเต็มบ่อย ชาวเมืองขอให้เพิ่มร้านอีกหน่อย","choices":[{"title":"สร้างร้านค้า 1 แห่ง","task":{"kind":"build","key":"shop_starter","count":1},"success":{"report":"ชาวเมืองมีทางเลือกเพิ่ม","scores":{"people":7,"admin":3},"money":40000,"effects":[{"kind":"tripMultiplier","scope":"shop","value":2}]},"failure":{"report":"สร้างไม่ครบตามที่รับปากไว้","scores":{"people":-8}}},{"title":"สร้างร้านค้า 2 แห่ง","task":{"kind":"build","key":"shop_starter","count":2},"success":{"report":"ร้านใหม่พร้อมรองรับลูกค้า","scores":{"people":10,"business":4},"money":80000,"effects":[{"kind":"tripMultiplier","scope":"shop","value":2}]},"failure":{"report":"สร้างไม่ครบตามที่รับปากไว้","scores":{"people":-8}}},{"title":"รอให้ร้านเดิมมีที่ว่าง","success":{"report":"ชาวเมืองยังต้องต่อคิว","scores":{"people":-3}}}],"minLevel":9007199254740991,"rollbackOnly":true},{"id":"play-park","category":"image","title":"เด็ก ๆ อยากมีที่เล่น","story":"เด็ก ๆ ชูป้ายขอสวนสาธารณะเพิ่ม จะหาให้พวกเขาไหม?","choices":[{"title":"สร้างสวนสาธารณะ 1 แห่ง","task":{"kind":"build","key":"park_starter","count":1},"success":{"report":"เด็ก ๆ มีที่พักผ่อนเพิ่มแล้ว","scores":{"image":7,"people":5},"money":35000,"effects":[{"kind":"tripMultiplier","scope":"park","value":2}]},"failure":{"report":"สร้างไม่ครบตามที่รับปากไว้","scores":{"image":-8}}},{"title":"ขอเก็บเงินไว้ก่อน","success":{"report":"เด็ก ๆ ฝากข้อความว่าจะรอ","scores":{"image":-3}}}],"minLevel":9007199254740991,"rollbackOnly":true},{"id":"play-office","category":"admin","title":"คนอยากทำงาน","story":"มีคนมาสมัครงานแต่ตำแหน่งว่างไม่พอ ขอสำนักงานเพิ่มสักแห่ง","choices":[{"title":"สร้างสำนักงาน 1 แห่ง","task":{"kind":"build","key":"office_starter","count":1},"success":{"report":"สำนักงานใหม่เปิดรับสมัครงาน","scores":{"admin":8,"people":5},"money":80000,"effects":[{"kind":"tripMultiplier","scope":"office","value":2}]},"failure":{"report":"สร้างไม่ครบตามที่รับปากไว้","scores":{"admin":-8}}},{"title":"สร้างสำนักงาน 2 แห่ง","task":{"kind":"build","key":"office_starter","count":2},"success":{"report":"เมืองมีตำแหน่งงานใหม่มากขึ้น","scores":{"admin":10,"business":5},"money":160000,"effects":[{"kind":"tripMultiplier","scope":"office","value":2}]},"failure":{"report":"สร้างไม่ครบตามที่รับปากไว้","scores":{"admin":-8}}},{"title":"ยังไม่เพิ่มสำนักงาน","success":{"report":"ผู้สมัครงานต้องรอโอกาสต่อไป","scores":{"admin":-4}}}],"minLevel":9007199254740991,"rollbackOnly":true},{"id":"play-factory","category":"business","title":"นักลงทุนอยากเปิดโรงงาน","story":"บริษัทหนึ่งสนใจตั้งโรงงานในเมือง และพร้อมจ้างคนเมื่อมีพื้นที่","choices":[{"title":"สร้างโรงงาน 1 แห่ง","task":{"kind":"build","key":"factory_starter","count":1},"success":{"report":"โรงงานพร้อมรับคนเข้าทำงาน","scores":{"business":8,"admin":4},"money":100000,"effects":[{"kind":"tripMultiplier","scope":"factory","value":2}]},"failure":{"report":"สร้างไม่ครบตามที่รับปากไว้","scores":{"business":-8}}},{"title":"ยังไม่ขยายโรงงาน","success":{"report":"นักลงทุนขอไปดูเมืองอื่นก่อน","scores":{"business":-3}}}],"minLevel":9007199254740991,"rollbackOnly":true},{"id":"play-hotel","category":"fame","title":"นักท่องเที่ยวไม่มีห้องพัก","story":"นักท่องเที่ยวบางคนยังหาห้องพักไม่ได้ เจ้าของกิจการขอให้เพิ่มโรงแรม","choices":[{"title":"สร้างโรงแรม 1 แห่ง","task":{"kind":"build","key":"hotel_starter","count":1},"success":{"report":"โรงแรมใหม่พร้อมต้อนรับแขก","scores":{"fame":8,"business":4},"money":80000,"effects":[{"kind":"touristMultiplier","scope":"tourist","value":2}]},"failure":{"report":"สร้างไม่ครบตามที่รับปากไว้","scores":{"fame":-8}}},{"title":"สร้างโรงแรม 2 แห่ง","task":{"kind":"build","key":"hotel_starter","count":2},"success":{"report":"เมืองมีห้องพักรองรับเพิ่ม","scores":{"fame":10,"business":5},"money":160000,"effects":[{"kind":"touristMultiplier","scope":"tourist","value":2}]},"failure":{"report":"สร้างไม่ครบตามที่รับปากไว้","scores":{"fame":-8}}},{"title":"พักแผนขยายโรงแรมไว้ก่อน","success":{"report":"นักท่องเที่ยวบางคนต้องรอห้องว่าง","scores":{"fame":-4}}}],"minLevel":9007199254740991,"rollbackOnly":true},{"id":"play-mall","category":"business","title":"คนแน่นห้าง","story":"ผู้ประกอบการเห็นว่าพื้นที่ชอปปิงไม่พอ อยากเปิดห้างเพิ่ม","choices":[{"title":"สร้างห้าง 1 แห่ง","task":{"kind":"build","key":"mall_starter","count":1},"success":{"report":"ห้างใหม่พร้อมต้อนรับลูกค้า","scores":{"business":8,"people":4},"money":120000,"effects":[{"kind":"tripMultiplier","scope":"mall","value":2}]},"failure":{"report":"สร้างไม่ครบตามที่รับปากไว้","scores":{"business":-8}}},{"title":"ชะลอการสร้างห้าง","success":{"report":"ผู้ประกอบการยอมรอ","scores":{"business":-3}}}],"minLevel":9007199254740991,"rollbackOnly":true},{"id":"play-pub","category":"business","title":"เมืองเงียบไปหรือเปล่า?","story":"คนชอบเที่ยวกลางคืนบอกว่าผับที่มีอยู่เต็มบ่อย ขอที่เที่ยวเพิ่มอีกสักแห่ง","choices":[{"title":"สร้างผับ 1 แห่ง","task":{"kind":"build","key":"pub_starter","count":1},"success":{"report":"ผับใหม่เปิดให้บริการ","scores":{"business":8,"fame":4},"money":90000,"effects":[{"kind":"tripMultiplier","scope":"pub","value":2}]},"failure":{"report":"สร้างไม่ครบตามที่รับปากไว้","scores":{"business":-8}}},{"title":"ยังไม่เพิ่มผับ","success":{"report":"ผู้ประกอบการผิดหวังเล็กน้อย","scores":{"business":-3,"people":2}}}],"minLevel":9007199254740991,"rollbackOnly":true},{"id":"play-casino","category":"business","title":"ลูกค้าเต็มคาสิโน","story":"ผู้ประกอบการบอกว่าที่นั่งไม่พอ อยากลงทุนเพิ่ม","choices":[{"title":"สร้างคาสิโน 1 แห่ง","task":{"kind":"build","key":"casino_starter","count":1},"success":{"report":"สถานที่ใหม่เปิดรับลูกค้า","scores":{"business":9,"admin":3},"money":150000,"effects":[{"kind":"tripMultiplier","scope":"casino","value":2}]},"failure":{"report":"สร้างไม่ครบตามที่รับปากไว้","scores":{"business":-8}}},{"title":"ไม่ขยายคาสิโนตอนนี้","success":{"report":"ผู้ประกอบการเก็บแผนไว้ก่อน","scores":{"business":-4}}}],"minLevel":9007199254740991,"rollbackOnly":true},{"id":"play-home-help","category":"government","title":"จังหวัดช่วยค่าบ้าน","story":"จังหวัดมีเงินช่วยสร้างบ้านให้เมืองที่ยังมีคนรอที่พัก สนใจไหม?","choices":[{"title":"รับงบ 24,000 บาท สร้างบ้าน 1 หลัง","task":{"kind":"build","key":"home_starter","count":1},"grant":24000,"success":{"report":"สร้างบ้านสำเร็จ จังหวัดส่งคำชมมา","scores":{"government":7,"people":5},"money":20000},"failure":{"report":"สร้างไม่ครบตามที่รับปากไว้","scores":{"government":-8}}},{"title":"รับงบ 48,000 บาท สร้างบ้าน 2 หลัง","task":{"kind":"build","key":"home_starter","count":2},"grant":48000,"success":{"report":"โครงการบ้านสำเร็จ","scores":{"government":10,"people":7},"money":40000},"failure":{"report":"สร้างไม่ครบตามที่รับปากไว้","scores":{"government":-8}}},{"title":"ขอไม่รับงบรอบนี้","success":{"report":"จังหวัดส่งโอกาสให้เมืองอื่น","scores":{}}}],"minLevel":9007199254740991,"rollbackOnly":true},{"id":"play-shop-help","category":"government","title":"ทุนร้านค้าเล็ก ๆ","story":"จังหวัดอยากช่วยเมืองที่ยังมีร้านค้าไม่พอ เปิดโอกาสให้ขอเงินสร้างร้าน","choices":[{"title":"รับงบ 20,000 บาท สร้างร้านค้า 1 แห่ง","task":{"kind":"build","key":"shop_starter","count":1},"grant":20000,"success":{"report":"ร้านใหม่สร้างเสร็จตามที่ตกลง","scores":{"government":7,"business":5},"money":30000},"failure":{"report":"สร้างไม่ครบตามที่รับปากไว้","scores":{"government":-8}}},{"title":"ขอผ่านก่อน","success":{"report":"ไม่มีภาระผูกพันกับเมือง","scores":{}}}],"minLevel":9007199254740991,"rollbackOnly":true},{"id":"play-food-help","category":"government","title":"ทุนช่วยเรื่องปากท้อง","story":"จังหวัดเสนอเงินช่วยเปิดร้านอาหารในเมืองที่ยังมีคนรอคิว","choices":[{"title":"รับงบ 30,000 บาท สร้างร้านอาหาร 1 แห่ง","task":{"kind":"build","key":"restaurant_starter","count":1},"grant":30000,"success":{"report":"ร้านอาหารสร้างเสร็จตามเป้า","scores":{"government":8,"people":5},"effects":[{"kind":"tripMultiplier","scope":"restaurant","value":2}]},"failure":{"report":"สร้างไม่ครบตามที่รับปากไว้","scores":{"government":-8}}},{"title":"ขอผ่านก่อน","success":{"report":"จังหวัดเก็บงบไว้ช่วยเมืองอื่น","scores":{}}}],"minLevel":9007199254740991,"rollbackOnly":true},{"id":"play-hotel-help","category":"government","title":"ทุนต้อนรับนักท่องเที่ยว","story":"จังหวัดอยากให้เมืองมีห้องพักพอสำหรับนักท่องเที่ยวที่รออยู่","choices":[{"title":"รับงบ 50,000 บาท สร้างโรงแรม 1 แห่ง","task":{"kind":"build","key":"hotel_starter","count":1},"grant":50000,"success":{"report":"โรงแรมพร้อมเปิดรับแขก","scores":{"government":7,"fame":5},"effects":[{"kind":"touristMultiplier","scope":"tourist","value":2}]},"failure":{"report":"สร้างไม่ครบตามที่รับปากไว้","scores":{"government":-8}}},{"title":"ยังไม่รับทุน","success":{"report":"จังหวัดรับทราบ","scores":{}}}],"minLevel":9007199254740991,"rollbackOnly":true},{"id":"play-traffic","category":"admin","title":"ขอถนนโล่ง ๆ สักวัน!","story":"ชาวเมืองอยากไปทำงานและกลับบ้านให้ทัน มาลองทำให้การเดินทางดีขึ้นไหม?","choices":[{"title":"รับคำท้า ทำภารกิจเดินทางให้สำเร็จ 80%","task":{"kind":"performance","target":80},"success":{"report":"ทำได้แล้ว! การเดินทางของชาวเมืองดีขึ้น","scores":{"admin":8,"people":5},"effects":[{"kind":"tripMultiplier","scope":"all","value":2}]},"failure":{"report":"ยังทำผลงานไม่ถึงเป้าหมาย","scores":{"admin":-7,"people":-3}}},{"title":"รับคำท้า ทำภารกิจเดินทางให้สำเร็จ 90%","task":{"kind":"performance","target":90},"success":{"report":"ทำได้แล้ว! การเดินทางของชาวเมืองดีขึ้น","scores":{"admin":8,"people":5},"effects":[{"kind":"tripMultiplier","scope":"all","value":2}]},"failure":{"report":"ยังทำผลงานไม่ถึงเป้าหมาย","scores":{"admin":-7,"people":-3}}},{"title":"วันนี้ยังไม่รับปาก","success":{"report":"ชาวเมืองหวังว่าพรุ่งนี้จะดีขึ้น","scores":{"admin":-2}}}],"minLevel":9007199254740991,"rollbackOnly":true},{"id":"play-traffic-hard","category":"admin","title":"เมืองเราจะทำได้ไหม?","story":"ชมรมคนขับรถอยากท้าว่าวันนี้เมืองจะทำภารกิจเดินทางสำเร็จเกิน 95% ได้หรือเปล่า","choices":[{"title":"รับคำท้า ทำภารกิจเดินทางให้สำเร็จ 95%","task":{"kind":"performance","target":95},"success":{"report":"ทำได้จริง! ชมรมส่งเงินรางวัลมา","scores":{"admin":10,"image":6},"money":150000,"effects":[{"kind":"tripMultiplier","scope":"all","value":3}]},"failure":{"report":"ยังทำผลงานไม่ถึงเป้าหมาย","scores":{"admin":-7,"people":-3}}},{"title":"ไม่รับคำท้า","success":{"report":"ชมรมบอกไว้ลองวันอื่นก็ได้","scores":{}}}],"minLevel":9007199254740991,"rollbackOnly":true},{"id":"play-map","category":"admin","title":"ทีมงานเจอจุดติดขัด","story":"คนขับรถส่งภาพถนนที่รถต่อคิวยาวมาให้ อยากให้เมืองเร่งแก้","choices":[{"title":"รับคำท้า ทำภารกิจเดินทางให้สำเร็จ 85%","task":{"kind":"performance","target":85},"success":{"report":"ทำได้แล้ว! การเดินทางของชาวเมืองดีขึ้น","scores":{"admin":8,"people":5},"effects":[{"kind":"tripMultiplier","scope":"all","value":2}]},"failure":{"report":"ยังทำผลงานไม่ถึงเป้าหมาย","scores":{"admin":-7,"people":-3}}},{"title":"รับเรื่องไว้ดูตอนมีเวลา","success":{"report":"ชาวเมืองรอดูผลงาน","scores":{"admin":-3}}}],"minLevel":9007199254740991,"rollbackOnly":true},{"id":"play-hotel-review","category":"business","title":"รีวิวโรงแรม","story":"แขกโพสต์ว่าที่พักดีแต่เดินทางลำบาก เจ้าของโรงแรมอยากให้ช่วย","choices":[{"title":"รับคำท้า ทำภารกิจเดินทางให้สำเร็จ 85%","task":{"kind":"performance","target":85},"success":{"report":"ทำได้แล้ว! การเดินทางของชาวเมืองดีขึ้น","scores":{"admin":8,"people":5},"effects":[{"kind":"tripMultiplier","scope":"all","value":2}]},"failure":{"report":"ยังทำผลงานไม่ถึงเป้าหมาย","scores":{"admin":-7,"people":-3}}},{"title":"ขอโทษและรับฟัง","success":{"report":"เจ้าของโรงแรมขอบคุณที่รับฟัง แต่ยังรอแก้รถติด","scores":{"business":3,"fame":-2}}},{"title":"บอกให้แขกไปเมืองอื่น","success":{"report":"รีวิวถูกแชร์ต่ออย่างรวดเร็ว","scores":{"business":-7,"image":-7}}}],"minLevel":9007199254740991,"rollbackOnly":true},{"id":"play-factory-late","category":"admin","title":"พนักงานไปทำงานสาย","story":"คนงานโรงงานบ่นว่ารถติดจนเสียเวลาทุกเช้า เจ้าของโรงงานขอให้ช่วย","choices":[{"title":"รับคำท้า ทำภารกิจเดินทางให้สำเร็จ 85%","task":{"kind":"performance","target":85},"success":{"report":"ทำได้แล้ว! การเดินทางของชาวเมืองดีขึ้น","scores":{"admin":8,"people":5},"effects":[{"kind":"tripMultiplier","scope":"factory","value":2}]},"failure":{"report":"ยังทำผลงานไม่ถึงเป้าหมาย","scores":{"admin":-7,"people":-3}}},{"title":"รับฟังและไม่รับปากเกินจริง","success":{"report":"เจ้าของโรงงานยังรอผลงาน","scores":{"admin":-2,"business":2}}},{"title":"โทษคนงานว่าตื่นสายเอง","success":{"report":"คนงานไม่พอใจ","scores":{"people":-7,"image":-4}}}],"minLevel":9007199254740991,"rollbackOnly":true},{"id":"play-office-award","category":"government","title":"เมืองแห่งการทำงาน","story":"จังหวัดอยากยกย่องเมืองที่คนเดินทางไปทำงานได้ดี","choices":[{"title":"รับคำท้า ทำภารกิจเดินทางให้สำเร็จ 90%","task":{"kind":"performance","target":90},"success":{"report":"จังหวัดส่งเงินรางวัลมาให้เมือง","scores":{"government":8,"admin":5},"money":150000,"effects":[{"kind":"tripMultiplier","scope":"office","value":2}]},"failure":{"report":"ยังทำผลงานไม่ถึงเป้าหมาย","scores":{"admin":-7,"people":-3}}},{"title":"ขอไม่เข้าร่วม","success":{"report":"จังหวัดรับทราบ","scores":{}}}],"minLevel":9007199254740991,"rollbackOnly":true},{"id":"play-province-ai","category":"government","title":"ของขวัญจากจังหวัด","story":"จังหวัดมีโควต้าไฟจราจร AI เหลือหนึ่งจุด เสนอให้เมืองที่ดูแลการเดินทางดี","choices":[{"title":"รับคำท้า ทำภารกิจเดินทางให้สำเร็จ 85%","task":{"kind":"performance","target":85},"success":{"report":"เมืองผ่านเป้า จังหวัดมอบโควต้าให้","scores":{"government":7,"admin":6},"aiCredits":1},"failure":{"report":"ยังทำผลงานไม่ถึงเป้าหมาย","scores":{"admin":-7,"people":-3}}},{"title":"ไม่รับคำท้า","success":{"report":"จังหวัดให้โอกาสเมืองอื่น","scores":{}}}],"minLevel":9007199254740991,"rollbackOnly":true}]);

// Thai copy edit: presentation only. Event IDs, option indexes and mechanics are unchanged.
const MAYOR_THAI_COPY={"admin-rain":{"title":"ฝนใหญ่กำลังมา","story":"เจ้าหน้าที่เตือนว่าฝนอาจตกหนักจนบ้านเรือนน้ำท่วม เราจะเตรียมรับมืออย่างไร?","choices":[{"title":"อนุมัติงบป้องกันเต็มรูปแบบ","success":"เจ้าหน้าที่ระบายน้ำทันเวลา เมืองรอดจากน้ำท่วม"},{"title":"ขออุปกรณ์จากรัฐบาล","success":"รัฐบาลส่งอุปกรณ์มาให้ เมืองปลอดภัยโดยไม่ต้องจ่ายเงิน แต่ชาวบ้านบางส่วนรู้สึกว่านายกรีบตัดสินใจโดยไม่ได้ฟังพวกเขา"},{"title":"รอดูทิศทางฝน ไม่ใช้งบ","success":"โชคดี พายุเปลี่ยนทิศทาง เมืองไม่เสียหาย","failure":"ฝนตกหนักและเกิดความเสียหายในเขตชุมชน"},{"title":"ขอให้อาสาสมัครมาช่วย","success":"ทีมชุมชนพร้อมรับมือฝน แต่ชาวบ้านบางส่วนรู้สึกว่านายกรีบตัดสินใจโดยไม่ได้ฟังพวกเขา"},{"title":"ตั้งศูนย์รับแจ้งเหตุ","success":"เจ้าหน้าที่พร้อมรับเรื่องฉุกเฉิน"},{"title":"รับเงินสนับสนุนอุปกรณ์ระบายน้ำ 650,000 บาทจากสมาคมช่าง","success":"สมาคมช่างบริจาคเงินผ่านบัญชีเทศบาลโดยไม่มีเงื่อนไขและเจ้าหน้าที่ใช้แผนรับมือเดิมได้ทัน ฝ่ายบริหารได้รับคำชมเรื่องการจัดหาอุปกรณ์ ไม่พบผลประโยชน์ทับซ้อน"}]},"admin-traffic":{"title":"รถติดจนเป็นข่าว","story":"ชาวเมืองบ่นกันหนักว่าไปไหนก็สาย ขอให้นายกแก้รถติดให้เห็นผลภายในวันนี้","choices":[{"title":"ทำภารกิจเดินทางให้สำเร็จอย่างน้อย 80%","success":"เมืองผ่านเป้าหมายการเดินทาง","failure":"เมืองไม่ผ่านเป้าหมาย"},{"title":"ใช้งบช่วยจัดการจราจร","success":"เจ้าหน้าที่จัดระเบียบการจราจรแล้ว"},{"title":"ตำหนิคนที่ร้องเรียน","success":"ข้อร้องเรียนยุติลง","failure":"ประชาชนไม่พอใจคำตอบของนายก"},{"title":"ชวนชาวเมืองช่วยจัดระเบียบการเดินทาง","success":"ตัวแทนชุมชนยอมประสานงาน แต่ชาวบ้านบางส่วนรู้สึกว่านายกรีบตัดสินใจโดยไม่ได้ฟังพวกเขา"},{"title":"ลดรายได้จากทริปลง 100 บาทวันนี้ เพื่อช่วยค่าแก้รถติด","success":"เมืองประหยัดงบจากภารกิจในวันนี้"}]},"image-interview":{"title":"นักข่าวมารอสัมภาษณ์","story":"นักข่าวอยากถามนายกตรง ๆ ว่าเงินของเมืองถูกนำไปใช้อะไรบ้าง","choices":[{"title":"ชี้แจงต่อสื่อด้วยข้อมูล","success":"คำชี้แจงได้รับเสียงตอบรับที่ดี แต่ทีมงานต้องแบ่งเวลาจากงานประจำมาช่วย"},{"title":"จัดแถลงข่าว","success":"สื่อลงข่าวชื่นชมนายก"},{"title":"ปฏิเสธให้สัมภาษณ์","success":"สื่อวิจารณ์ว่านายกไม่ยอมตอบคำถาม"},{"title":"ท้าให้สื่อพิสูจน์ข้อกล่าวหา","success":"สื่อถอนข้อกล่าวหา","failure":"คำพูดของนายกกลายเป็นกระแสวิจารณ์"},{"title":"เชิญผู้แทนประชาชนร่วมให้ข้อมูล","success":"สื่อรับฟังข้อมูลจากทั้งสองฝ่าย แต่ทีมงานต้องแบ่งเวลาจากงานประจำมาช่วย"},{"title":"รับ 700,000 บาทจากผู้ผลิตรายการเพื่อเปิดตัวรายการสัมภาษณ์นายก","success":"รายการออกอากาศตามข้อตกลง แต่ผู้ชมพบว่าผู้สนับสนุนเป็นคู่สัญญาของเมืองและมีสิทธิอนุมัติคำถาม จึงตั้งข้อสงสัยว่าการสัมภาษณ์ไม่เป็นอิสระ"}]},"image-party":{"title":"จัดงานเลี้ยงให้นายกไหม?","story":"ทีมงานเสนอจัดงานเลี้ยงให้นายก โดยใช้เงินจากคลังเมือง","choices":[{"title":"บริจาคงบให้กิจกรรมชุมชน","success":"ประชาชนชื่นชมการจัดสรรงบ"},{"title":"รับจัดงานหรูจากผู้สนับสนุน","success":"งานเลี้ยงจบลงพร้อมกระแสวิจารณ์ แต่คลังได้รับเงินสนับสนุน"},{"title":"ยกเลิกงาน","success":"ไม่มีการใช้งบจัดงาน"},{"title":"ให้ชุมชนเป็นเจ้าภาพโดยไม่ใช้เงินเมือง","success":"ประชาชนจัดงานเรียบง่ายเอง แต่ทีมงานต้องแบ่งเวลาจากงานประจำมาช่วย"},{"title":"จัดงานปิด ไม่เปิดเผยรายชื่อผู้สนับสนุน","success":"งานผ่านไปโดยไม่มีเสียงวิจารณ์","failure":"ข้อมูลผู้สนับสนุนกลายเป็นประเด็นข่าว"}]},"fame-food":{"title":"เทศกาลอาหารริมทะเล","story":"ผู้จัดงานอยากจัดเทศกาลอาหารในเมืองวันนี้ มีร้านค้าหลายร้านสนใจเข้าร่วม","choices":[{"title":"ขอผู้สนับสนุนจัดงาน","success":"ผู้สนับสนุนรับผิดชอบค่าใช้จ่ายทั้งหมด แต่ชาวบ้านบางส่วนมองว่าเมืองให้ความสำคัญกับชื่อเสียงมากเกินไป"},{"title":"จัดงานด้วยงบเมือง","success":"เทศกาลดึงดูดผู้เดินทางมาร้านอาหาร"},{"title":"ไม่จัดงาน","success":"เมืองดำเนินงานตามปกติ"},{"title":"เก็บรายได้ร้านอาหารลดลง 100 บาทวันนี้ เพื่อร่วมงาน","success":"สมาคมยอมรับส่วนลด"},{"title":"ให้ผู้จัดโปรโมตงานด้วยตนเอง","success":"งานได้รับความสนใจเกินคาด","failure":"ผู้จัดโปรโมตงานไม่สำเร็จ"},{"title":"รับ 1,500,000 บาทจากผู้จัดเทศกาล และให้ผู้จัดคัดเลือกร้านค้าเอง","success":"เทศกาลได้รับความสนใจจากสื่อ แต่ผู้จัดคัดเฉพาะร้านในเครือ ร้านรายย่อยถูกกันออกและชาวเมืองวิจารณ์ว่าพื้นที่สาธารณะไม่ได้เปิดให้ทุกคนเท่ากัน"}]},"fame-news":{"title":"สื่ออยากพาเที่ยวเมืองเรา","story":"สื่อท่องเที่ยวอยากทำข่าวแนะนำเมือง และขอให้เราช่วยเตรียมข้อมูลสถานที่เที่ยว","choices":[{"title":"สนับสนุนการประชาสัมพันธ์","success":"เมืองได้รับความสนใจเพิ่มขึ้น"},{"title":"ให้สื่อทำงานตามปกติ","success":"สื่อเผยแพร่ข้อมูลเมืองตามจริง"},{"title":"ปฏิเสธความร่วมมือ","success":"เมืองพลาดโอกาสประชาสัมพันธ์"},{"title":"ขอความร่วมมือสมาคมธุรกิจส่งข้อมูลท่องเที่ยว","success":"สมาคมส่งข้อมูลให้สื่อโดยไม่ใช้เงินเมือง แต่ชาวบ้านบางส่วนมองว่าเมืองให้ความสำคัญกับชื่อเสียงมากเกินไป"},{"title":"ให้สื่อเลือกมุมโปรโมตเองทั้งหมด","success":"ข่าวได้รับความนิยม","failure":"เมืองถูกนำเสนอในแง่ลบ"}]},"government-home":{"title":"รัฐบาลช่วยสร้างบ้าน","story":"รัฐบาลเสนอเงินช่วยสร้างบ้านให้ชาวเมือง เราจะรับข้อเสนอแบบไหนดี?","choices":[{"title":"รับเงิน 72,000 บาท สร้างบ้านเริ่มต้น 3 หลัง","success":"สร้างบ้านครบตามสัญญา","failure":"สร้างบ้านไม่ครบ ต้องคืนเงินสนับสนุน"},{"title":"ไม่รับโครงการ","success":"รัฐบาลนำงบไปช่วยเมืองอื่นแทน"},{"title":"ขอเงิน 144,000 บาท สร้างบ้านเริ่มต้น 3 หลัง","success":"สร้างบ้านครบตามที่ตกลงไว้","failure":"สร้างบ้านไม่ครบตามเวลาที่กำหนด"},{"title":"รับเงิน 24,000 บาท สร้างบ้านเริ่มต้น 1 หลัง","success":"สร้างบ้านครบตามที่ตกลงไว้","failure":"สร้างบ้านไม่ครบตามเวลาที่กำหนด"},{"title":"ใช้เงินเมืองสร้างบ้านเริ่มต้น 1 หลัง","success":"สร้างบ้านครบตามที่ตกลงไว้","failure":"สร้างบ้านไม่ครบตามเวลาที่กำหนด"}]},"government-landmark":{"title":"ตึกมหานครของเมืองเรา","story":"รัฐบาลพร้อมช่วยออกค่าก่อสร้างตึกมหานคร หากสร้างเสร็จภายในเวลาที่กำหนด","choices":[{"title":"รับเงิน 2 ล้านบาท และสร้างตึกมหานคร 1 แห่ง","success":"ตึกมหานครสร้างเสร็จตามสัญญา","failure":"ไม่สามารถทำโครงการให้เสร็จ ต้องคืนเงินสนับสนุน"},{"title":"รับเงิน 1 ล้านบาท และสร้างตึกมหานคร 1 แห่ง","success":"สร้างตึกมหานครเสร็จตามเป้าหมาย","failure":"โครงการไม่สำเร็จ ต้องคืนเงินสนับสนุน"},{"title":"ใช้งบเมืองเอง สร้างตึกมหานคร 1 แห่ง","success":"เมืองสร้างแลนด์มาร์กด้วยงบของตนเอง","failure":"ก่อสร้างไม่ทันเวลา"},{"title":"ชะลอการก่อสร้าง","success":"เลื่อนแผนก่อสร้างออกไป"},{"title":"ไม่รับโครงการ","success":"รัฐบาลนำงบไปช่วยเมืองอื่นแทน"}]},"people-welcome":{"title":"คนใหม่อยากย้ายเข้าเมือง","story":"หลายครอบครัวสนใจย้ายมาอยู่ที่นี่ และขอให้เมืองช่วยเรื่องการย้ายบ้าน","choices":[{"title":"อนุมัติเงินรับขวัญ","success":"ผู้สมัครได้รับสิทธิย้ายเข้าเมื่อมีบ้านรองรับ"},{"title":"ขอความร่วมมือจากคนที่รู้จัก","success":"ประชาชนยินดีย้ายเข้าโดยไม่ต้องจ่ายเงิน แต่เจ้าของกิจการบางส่วนรู้สึกว่าต้องรับภาระเพิ่ม"},{"title":"ไม่สนับสนุน","success":"คนที่สนใจบางส่วนตัดสินใจไม่ย้ายเข้า"},{"title":"ให้ชุมชนช่วยต้อนรับผู้สมัคร","success":"ชุมชนร่วมประสานผู้สนใจ แต่เจ้าของกิจการบางส่วนรู้สึกว่าต้องรับภาระเพิ่ม"},{"title":"เปิดจุดให้คำปรึกษาการย้ายถิ่น","success":"ผู้สนใจได้รับข้อมูลครบถ้วน"}]},"people-cost":{"title":"ของแพงขึ้นทุกวัน","story":"ชาวเมืองเริ่มมีเงินไม่พอใช้ อยากให้นายกช่วยแบ่งเบาค่าใช้จ่ายในวันนี้","choices":[{"title":"อุดหนุนประชาชน","success":"ประชาชนได้รับความช่วยเหลือ"},{"title":"ลดรายได้จากทริปลง 100 บาทวันนี้","success":"เมืองลดภาระรายได้ของเมือง แต่เจ้าของกิจการบางส่วนรู้สึกว่าต้องรับภาระเพิ่ม"},{"title":"ขู่งดสวัสดิการ","success":"การร้องเรียนยุติลง","failure":"ประชาชนไม่พอใจและหยุดย้ายเข้าเมืองในวันนี้"},{"title":"ขอธุรกิจร่วมช่วยเหลือโดยไม่ใช้เงินเมือง","success":"เจ้าของกิจการยอมร่วมประสานมาตรการ แต่เจ้าของกิจการบางส่วนรู้สึกว่าต้องรับภาระเพิ่ม"},{"title":"ลดรายได้จากร้านค้า 150 บาทวันนี้","success":"ชุมชนได้รับมาตรการลดรายได้เฉพาะร้านค้า"},{"title":"รับเงินจากเครือข่ายค้าปลีก 1,400,000 บาท แลกกับการประชาสัมพันธ์โครงการลดค่าครองชีพของเครือข่ายเท่านั้น","success":"ประชาชนพบว่าร้านอื่นที่เสนอราคาถูกกว่าถูกกันออกจากการประชาสัมพันธ์ ร้านรายย่อยร้องเรียนและสื่อถามเหตุใดเทศบาลจึงให้สิทธิแก่ผู้สนับสนุนรายเดียว"}]},"business-restaurant":{"title":"เจ้าของร้านอาหารขอคุย","story":"สมาคมร้านอาหารขอให้เมืองลดรายได้จากทริปไปกินอาหาร จาก 500 บาทเหลือ 200 บาท เฉพาะวันนี้","choices":[{"title":"เจรจาให้รายได้เหลือ 400 บาทต่อทริป","success":"สมาคมยอมรับข้อเสนอ แต่ชาวบ้านบางส่วนรู้สึกว่าเมืองเข้าข้างเจ้าของกิจการ"},{"title":"สร้างร้านอาหารเริ่มต้นเพิ่ม 3 แห่ง","success":"ร้านอาหารเพิ่มขึ้นตามสัญญา","failure":"นายกทำตามข้อตกลงไม่สำเร็จ"},{"title":"จ่ายเงินช่วยร้านอาหาร","success":"สมาคมเลิกเรียกร้อง"},{"title":"ขู่ว่าจะรื้อร้านอาหารเริ่มต้น 3 แห่ง","success":"สมาคมยอมถอย รายได้ไม่ลด","failure":"ข้อข่มขู่ถูกเปิดเผยและธุรกิจต่อต้าน"},{"title":"ยอมลดรายได้เหลือ 200 บาทต่อทริป","success":"สมาคมยอมเลิกเรียกร้อง แต่ชาวบ้านบางส่วนรู้สึกว่าเมืองเข้าข้างเจ้าของกิจการ"}]},"business-pub":{"title":"เจ้าของผับขอส่วนลด","story":"เจ้าของผับขอให้เมืองลดรายได้จากทริปไปผับลง 400 บาทต่อทริป เฉพาะวันนี้","choices":[{"title":"เจรจาให้ลดรายได้เพียง 100 บาทต่อทริป","success":"สมาคมตกลง แต่ชาวบ้านบางส่วนรู้สึกว่าเมืองเข้าข้างเจ้าของกิจการ"},{"title":"สร้างผับใหญ่ 1 แห่ง","success":"เปิดผับใหญ่ตามสัญญา","failure":"ก่อสร้างไม่ทันเวลา"},{"title":"ยอมให้รายได้เหลือ 100 บาทต่อทริป","success":"ผู้ประกอบการถอนคำร้อง แต่ชาวบ้านบางส่วนรู้สึกว่าเมืองเข้าข้างเจ้าของกิจการ"},{"title":"ปฏิเสธคำขอ","success":"สมาคมไม่พอใจ"},{"title":"จ่ายเงินช่วยให้ผับพูดคุยกับชุมชน","success":"สมาคมผับพอใจกับมาตรการ"}]},"integrity-donor":{"title":"เงินที่มาพร้อมคำขอ","story":"นักธุรกิจเสนอเงินให้เมือง แต่ขอให้เราให้สิทธิพิเศษกับเขาในอนาคต","choices":[{"title":"รับเงินตามที่เสนอ","success":"เงินเข้าคลังเมืองแล้ว ข้อตกลงยังเป็นความลับ"},{"title":"ขอให้บริจาคโดยเปิดเผยชื่อ","success":"เมืองรับเงินอย่างเปิดเผย แต่ทีมงานต้องใช้เวลาเพิ่มในการตรวจสอบ"},{"title":"ขอเงินเพิ่มเป็นสองเท่า","success":"นักธุรกิจตกลงเพิ่มเงิน","failure":"นักธุรกิจถอนข้อเสนอ"},{"title":"ปฏิเสธข้อเสนอ","success":"นายกปฏิเสธเงินนอกระบบ"},{"title":"ส่งเรื่องให้หน่วยตรวจสอบ","success":"เจ้าหน้าที่รับเรื่องและตรวจสอบ"}]},"integrity-audit":{"title":"ยอดเงินในบัญชีไม่ตรงกัน","story":"เจ้าหน้าที่พบยอดเงินผิดปกติในบัญชีเมือง จึงมาถามนายกว่าจะจัดการอย่างไร","choices":[{"title":"ตรวจสอบโดยเปิดเผย","success":"รายการผิดปกติได้รับการตรวจสอบแล้ว"},{"title":"ให้คืนเงินที่ผิดพลาด","success":"เงินถูกส่งคืนเข้าคลัง"},{"title":"รับส่วนแบ่งและยุติเรื่อง","success":"เมืองได้เงินเพิ่ม แต่เกิดประวัติความไม่โปร่งใส"},{"title":"เชิญผู้แทนรัฐบาลตรวจเอกสารร่วมกัน","success":"เจ้าหน้าที่รัฐบาลช่วยตรวจสอบ แต่ทีมงานต้องใช้เวลาเพิ่มในการตรวจสอบ"},{"title":"รับรองบัญชีตามเอกสารเดิม","success":"การตรวจเอกสารผ่านโดยไม่มีข้อทักท้วง","failure":"ความคลาดเคลื่อนถูกเปิดเผย"}]},"admin-crossing":{"title":"ติดแยกจนไม่อยากออกจากบ้าน","story":"คนขับรถบ่นว่ารอไฟแดงและรถติดนานเกินไป ขอให้นายกช่วยแก้ปัญหา","choices":[{"title":"ส่งทีมไปช่วยจัดการจราจร","success":"เทศบาลจัดการเรื่องร้องเรียนแล้ว"},{"title":"ทำภารกิจเดินทางให้สำเร็จอย่างน้อย 80% วันนี้","success":"ผลการเดินทางผ่านเกณฑ์","failure":"ไม่ผ่านการประเมิน"},{"title":"ให้คนขับจัดการกันเอง","success":"ข้อร้องเรียนยุติลง","failure":"ประชาชนส่งเรื่องร้องเรียนเพิ่ม"},{"title":"คุยกับตัวแทนคนใช้ถนนโดยตรง","success":"ผู้แทนร่วมแก้ข้อร้องเรียน แต่ชาวบ้านบางส่วนรู้สึกว่านายกรีบตัดสินใจโดยไม่ได้ฟังพวกเขา"},{"title":"รับเรื่องแต่ไม่อนุมัติงบเพิ่ม","success":"ข้อร้องเรียนยังไม่ได้แก้ครบ"},{"title":"รับ 1,200,000 บาทจากบริษัทอุปกรณ์จราจร แลกกับการทดลองใช้ระบบของบริษัทก่อน","success":"บริษัทจ่ายเงินครบ แต่การทดลองโดยไม่เปรียบเทียบระบบอื่นทำให้ทีมงานต้องแก้ปัญหาจราจรซ้ำ ชาวเมืองเสียเวลาเดินทาง และผู้ตรวจสอบพบว่าผู้ขายได้เปรียบคู่แข่ง"}]},"admin-office":{"title":"งานล้นโต๊ะ","story":"เจ้าหน้าที่ทำงานไม่ทันและขออุปกรณ์เพิ่ม เพื่อให้จัดการงานของเมืองได้เร็วขึ้น","choices":[{"title":"สนับสนุนอุปกรณ์","success":"งานเอกสารถูกจัดการเรียบร้อย"},{"title":"ขอใช้ทรัพยากรจากหน่วยงานกลาง","success":"รัฐบาลอนุมัติอุปกรณ์ให้ แต่ชาวบ้านบางส่วนรู้สึกว่านายกรีบตัดสินใจโดยไม่ได้ฟังพวกเขา"},{"title":"ไม่เพิ่มงบ","success":"เจ้าหน้าที่ต้องใช้เครื่องมือเดิม"},{"title":"ให้หัวหน้าทีมแบ่งงานใหม่","success":"ทีมงานจัดคิวงานได้ดีขึ้น แต่ชาวบ้านบางส่วนรู้สึกว่านายกรีบตัดสินใจโดยไม่ได้ฟังพวกเขา"},{"title":"ยกเลิกงานเอกสารบางส่วนโดยไม่หารือ","success":"งานค้างลดลง","failure":"งานสำคัญตกหล่น"}]},"admin-inspection":{"title":"วันนี้เมืองจะทำได้แค่ไหน?","story":"คณะประเมินชวนเมืองเข้าร่วมทดสอบว่าเราจัดการการเดินทางได้ดีแค่ไหน","choices":[{"title":"ทำภารกิจเดินทางให้สำเร็จอย่างน้อย 85% วันนี้","success":"ได้รับใบรับรองและเงินรางวัล","failure":"เมืองไม่ผ่านเกณฑ์"},{"title":"ไม่เข้ารับการประเมิน","success":"เมืองไม่ร่วมการประเมิน"},{"title":"รับรองผลงานโดยไม่ตรวจสอบ","success":"คณะประเมินยอมรับรายงาน","failure":"รายงานมีข้อผิดพลาดถูกทักท้วง"},{"title":"ขอผู้ตรวจประเมินให้คำแนะนำก่อนเริ่ม","success":"ทีมประเมินยอมให้คำแนะนำฟรี"},{"title":"ส่งเจ้าหน้าที่อบรมมาตรฐานการตรวจ","success":"ทีมงานเข้าใจมาตรฐานมากขึ้น"}]},"admin-park":{"title":"ชาวเมืองอยากได้สวนเพิ่ม","story":"ชาวเมืองบอกว่าสวนที่มีอยู่ไม่พอ อยากได้พื้นที่พักผ่อนเพิ่มอีกสักหน่อย","choices":[{"title":"สร้างสวนเริ่มต้น 2 แห่ง","success":"สร้างพื้นที่พักผ่อนครบ","failure":"สร้างสวนไม่ครบ"},{"title":"สนับสนุนกิจกรรมชุมชน","success":"จัดกิจกรรมทดแทนพื้นที่พักผ่อน"},{"title":"ปฏิเสธคำร้อง","success":"ชุมชนไม่พอใจ"},{"title":"ขอสมาคมชุมชนร่วมดูแลพื้นที่เดิม","success":"ชุมชนช่วยจัดการพื้นที่สาธารณะ แต่ชาวบ้านบางส่วนรู้สึกว่านายกรีบตัดสินใจโดยไม่ได้ฟังพวกเขา"},{"title":"ลดรายได้จากสวน 100 บาทวันนี้","success":"ประชาชนพอใจกับมาตรการชั่วคราว"}]},"admin-restaurant":{"title":"ร้านอาหารไม่พอ","story":"คนในชุมชนหาที่กินอาหารได้ยาก เจ้าหน้าที่เสนอให้สร้างร้านอาหารเพิ่ม","choices":[{"title":"สร้างร้านอาหารเริ่มต้น 2 แห่ง","success":"เพิ่มจุดบริการอาหารสำเร็จ","failure":"สร้างไม่ครบ"},{"title":"ใช้งบช่วยชุมชน","success":"จัดการคำร้องบางส่วนได้"},{"title":"ไม่ดำเนินการ","success":"คำร้องไม่ได้รับการแก้ไข"},{"title":"ขอให้สมาคมร้านอาหารช่วยแก้ปัญหา","success":"สมาคมร่วมจัดการปัญหาบริการ แต่ชาวบ้านบางส่วนรู้สึกว่านายกรีบตัดสินใจโดยไม่ได้ฟังพวกเขา"},{"title":"ลดรายได้ร้านอาหาร 150 บาทวันนี้","success":"ประชาชนพอใจกับข้อตกลงชั่วคราว"}]},"admin-shops":{"title":"ร้านค้าไม่พอใช้","story":"ชาวเมืองอยากมีร้านค้าเพิ่ม จะได้ซื้อของใกล้บ้านสะดวกขึ้น","choices":[{"title":"สร้างร้านค้าเริ่มต้น 3 แห่ง","success":"เพิ่มจุดบริการครบ","failure":"ทำไม่ครบตามแผน"},{"title":"กันเงินไว้แก้ปัญหา","success":"จัดระบบช่วยเหลือชั่วคราว"},{"title":"พักแผนไว้ก่อน","success":"เจ้าหน้าที่เลื่อนโครงการ"},{"title":"เชิญร้านค้าช่วยสำรวจจุดบริการ","success":"สมาคมส่งข้อมูลให้เทศบาล แต่ชาวบ้านบางส่วนรู้สึกว่านายกรีบตัดสินใจโดยไม่ได้ฟังพวกเขา"},{"title":"ลดรายได้ร้านค้า 100 บาทวันนี้","success":"เมืองช่วยบรรเทาข้อร้องเรียน"}]},"admin-audit-cost":{"title":"ค่าใช้จ่ายเมืองเริ่มสูง","story":"ฝ่ายการเงินพบว่ารายจ่ายสูงกว่าที่คาด อยากให้นายกช่วยตัดค่าใช้จ่ายที่ไม่จำเป็น","choices":[{"title":"จ้างผู้ตรวจสอบงบ","success":"พบรายการที่ปรับปรุงได้"},{"title":"ใช้ทีมงานเดิมตรวจสอบ","success":"ปรับปรุงรายการได้บางส่วน"},{"title":"ไม่ทบทวน","success":"เสียโอกาสปรับปรุงงบ"},{"title":"ขอให้รัฐบาลส่งคนมาตรวจบัญชี","success":"ผู้ตรวจจากรัฐบาลช่วยทบทวนงบ แต่ชาวบ้านบางส่วนรู้สึกว่านายกรีบตัดสินใจโดยไม่ได้ฟังพวกเขา"},{"title":"ข้ามการตรวจและรับรองรายจ่ายเดิม","success":"รายจ่ายผ่านการตรวจรอบแรก","failure":"พบรายการที่อธิบายไม่ได้"}]},"admin-office-supply":{"title":"มีคนหางาน แต่สำนักงานไม่พอ","story":"เจ้าหน้าที่เสนอให้สร้างสำนักงานเพิ่ม เพื่อให้มีตำแหน่งงานรองรับชาวเมือง","choices":[{"title":"สร้างสำนักงานเริ่มต้น 2 แห่ง","success":"เปิดพื้นที่ทำงานครบ","failure":"สร้างไม่ทัน"},{"title":"ใช้งบช่วยแก้ปัญหา","success":"แก้ปัญหาเฉพาะหน้า"},{"title":"ปฏิเสธ","success":"การจัดสรรงานไม่เปลี่ยนแปลง"},{"title":"ขอบริษัทช่วยสำรวจความต้องการแรงงาน","success":"ภาคธุรกิจร่วมส่งข้อมูล แต่ชาวบ้านบางส่วนรู้สึกว่านายกรีบตัดสินใจโดยไม่ได้ฟังพวกเขา"},{"title":"ลดรายได้จากทริปไปสำนักงาน 100 บาทวันนี้","success":"สำนักงานได้รับความช่วยเหลือ"}]},"admin-city-fair":{"title":"ชิงรางวัลเมืองน่าอยู่","story":"เมืองได้รับเชิญให้พิสูจน์ฝีมือด้วยผลการเดินทางของชาวเมืองวันนี้","choices":[{"title":"ทำภารกิจเดินทางให้สำเร็จอย่างน้อย 90% วันนี้","success":"เมืองผ่านมาตรฐานระดับสูง","failure":"เมืองไม่ผ่านมาตรฐาน"},{"title":"ขอคำแนะนำเบื้องต้น","success":"ได้รับคำแนะนำจากคณะประเมิน"},{"title":"ไม่เข้าร่วม","success":"ไม่มีผลต่อโครงการ"},{"title":"ขอรับการประเมินเบื้องต้นโดยไม่ชิงรางวัล","success":"กรรมการช่วยประเมินโดยไม่ใช้เงินเมือง แต่ชาวบ้านบางส่วนรู้สึกว่านายกรีบตัดสินใจโดยไม่ได้ฟังพวกเขา"},{"title":"ประกาศว่าเมืองผ่านมาตรฐานก่อนประเมิน","success":"ข่าวได้รับการตอบรับ","failure":"กรรมการออกมาทักท้วง"}]},"admin-bridge-review":{"title":"สะพานยังปลอดภัยอยู่ไหม?","story":"วิศวกรขอเข้าตรวจสะพานและถนนทางเข้าเมือง ก่อนที่ปัญหาจะเกิดขึ้น","choices":[{"title":"จ้างทีมตรวจสภาพ","success":"รายงานตรวจสภาพเสร็จสิ้น"},{"title":"ขอวิศวกรจากรัฐบาล","success":"รัฐบาลช่วยตรวจสอบให้ แต่ชาวบ้านบางส่วนรู้สึกว่านายกรีบตัดสินใจโดยไม่ได้ฟังพวกเขา"},{"title":"เลื่อนตรวจไปก่อน","success":"ไม่พบปัญหาเพิ่มเติมในวันนี้","failure":"คำร้องเรื่องความปลอดภัยเพิ่มขึ้น"},{"title":"ให้ทีมช่างเมืองนำเสนอรายงานเดิม","success":"ทีมงานยืนยันรายการตรวจสอบ"},{"title":"เปิดช่องให้ประชาชนแจ้งจุดเสี่ยง","success":"ได้รับข้อมูลจุดเสี่ยงเพิ่มเติม"}]},"admin-paper":{"title":"เอกสารรอเซ็นเต็มโต๊ะ","story":"งานที่รอนายกอนุมัติเริ่มสะสม เจ้าหน้าที่ขอให้ช่วยจัดการให้เสร็จ","choices":[{"title":"จัดทีมสะสางเอกสาร","success":"เอกสารจัดการเสร็จครบแล้ว"},{"title":"มอบหมายทีมเดิม","success":"งานเอกสารดำเนินต่อได้"},{"title":"ปล่อยกองเอกสารไว้","success":"เจ้าหน้าที่รายงานความล่าช้า"},{"title":"ขอเจ้าหน้าที่จากรัฐบาลมาช่วย","success":"ส่วนกลางช่วยจัดลำดับเอกสาร แต่ชาวบ้านบางส่วนรู้สึกว่านายกรีบตัดสินใจโดยไม่ได้ฟังพวกเขา"},{"title":"อนุมัติเอกสารค้างโดยไม่ตรวจทีละฉบับ","success":"เอกสารผ่านไปโดยไม่มีปัญหา","failure":"เอกสารผิดเงื่อนไขถูกตรวจพบ"}]},"admin-public-work":{"title":"ขอสวนอีกสักแห่ง","story":"เจ้าหน้าที่เสนอให้เพิ่มพื้นที่พักผ่อนสำหรับคนในเมือง","choices":[{"title":"สร้างสวนเล็ก 1 แห่ง","success":"เปิดสวนเล็กตามแผน","failure":"สวนยังไม่สร้างเสร็จ"},{"title":"ใช้งบกิจกรรมชุมชนแทน","success":"กิจกรรมดำเนินการสำเร็จ"},{"title":"เลื่อนโครงการ","success":"โครงการยังไม่เริ่ม"},{"title":"ขอชุมชนช่วยจัดกิจกรรมในพื้นที่เดิม","success":"ชุมชนตกลงช่วยโดยไม่ใช้เงินเมือง แต่ชาวบ้านบางส่วนรู้สึกว่านายกรีบตัดสินใจโดยไม่ได้ฟังพวกเขา"},{"title":"ลดรายได้จากสวน 150 บาทวันนี้","success":"ชาวบ้านยอมรับการช่วยเหลือชั่วคราว"}]},"admin-training":{"title":"ทีมงานอยากเรียนรู้เพิ่ม","story":"เจ้าหน้าที่อยากอบรมวิธีรับมือกับปัญหาและข้อร้องเรียนของชาวเมือง","choices":[{"title":"อนุมัติอบรม","success":"ทีมงานผ่านการอบรม"},{"title":"ขอวิทยากรจากรัฐบาล","success":"ได้รับการสนับสนุนฟรี แต่ชาวบ้านบางส่วนรู้สึกว่านายกรีบตัดสินใจโดยไม่ได้ฟังพวกเขา"},{"title":"ไม่อนุมัติ","success":"เจ้าหน้าที่ต้องเรียนรู้ด้วยตนเอง"},{"title":"ขอหัวหน้าฝ่ายสอนงานภายใน","success":"ทีมงานจัดอบรมภายในสำเร็จ แต่ชาวบ้านบางส่วนรู้สึกว่านายกรีบตัดสินใจโดยไม่ได้ฟังพวกเขา"},{"title":"รับรองว่าทีมผ่านอบรมโดยไม่จัดจริง","success":"ไม่มีผู้ทักท้วงใบรับรอง","failure":"เอกสารถูกตรวจพบว่าไม่ตรงกับความจริง"},{"title":"รับทุนอบรมจากสถาบันการศึกษา 250,000 บาท โดยไม่กำหนดผู้รับเหมา","success":"สถาบันโอนทุนผ่านช่องทางราชการและไม่ขอสิทธิพิเศษ ทีมงานยังทำงานตามแผนเดิม จึงไม่มีคะแนนด้านใดเปลี่ยนแปลง"}]},"image-birthday":{"title":"วันเกิดนายก","story":"ทีมงานเสนอจัดงานวันเกิดให้นายก โดยใช้เงินของเมือง","choices":[{"title":"บริจาคงบให้ชุมชน","success":"ประชาชนชื่นชม"},{"title":"รับเงินจัดงานจากกลุ่มทุน","success":"ผู้สนับสนุนโอนเงินให้เมือง แต่สื่อวิจารณ์"},{"title":"ไม่จัดงาน","success":"นายกใช้ชีวิตตามปกติ"},{"title":"ให้ชุมชนร่วมจัดงานเล็ก ๆ โดยไม่ใช้เงินเมือง","success":"ชุมชนจัดงานเอง แต่ทีมงานต้องแบ่งเวลาจากงานประจำมาช่วย"},{"title":"จัดงานเฉพาะผู้สนับสนุนรายใหญ่","success":"งานผ่านไปอย่างเงียบ ๆ","failure":"รายชื่อแขกทำให้สื่อวิจารณ์"}]},"image-photo":{"title":"รถหรูหน้าสำนักงาน","story":"ภาพรถหรูของผู้สนับสนุนที่จอดหน้าสำนักงานนายกถูกนำไปลงข่าว","choices":[{"title":"เปิดเผยค่าใช้จ่าย","success":"สื่อยอมรับคำชี้แจง แต่ทีมงานต้องแบ่งเวลาจากงานประจำมาช่วย"},{"title":"จัดแถลงข่าว","success":"ทีมประชาสัมพันธ์ชี้แจงแล้ว"},{"title":"ท้าให้สื่อพิสูจน์","success":"เรื่องเงียบลง","failure":"กระแสวิจารณ์รุนแรงขึ้น"},{"title":"ให้ตัวแทนชุมชนร่วมตรวจข้อเท็จจริง","success":"ชุมชนยืนยันข้อมูลต่อสื่อ แต่ทีมงานต้องแบ่งเวลาจากงานประจำมาช่วย"},{"title":"ยอมรับว่าการรับรองไม่เหมาะสม","success":"สื่อชื่นชมการยอมรับข้อบกพร่อง"}]},"image-walk":{"title":"ชาวบ้านอยากคุยกับนายก","story":"คนที่ตลาดเช้าอยากเจอนายกและเล่าปัญหาที่พบด้วยตัวเอง","choices":[{"title":"จัดงานรับฟังความคิดเห็น","success":"ประชาชนชื่นชมการรับฟัง"},{"title":"ให้เจ้าหน้าที่รับฟังแทน","success":"มีการรับเรื่องเบื้องต้น"},{"title":"ไม่เข้าร่วม","success":"ประชาชนผิดหวัง"},{"title":"ลงพื้นที่ร่วมกับตัวแทนชุมชนโดยไม่จัดงาน","success":"ประชาชนได้พูดคุยกับนายกโดยตรง แต่ทีมงานต้องแบ่งเวลาจากงานประจำมาช่วย"},{"title":"จัดเฉพาะการพบปะผู้สนับสนุน","success":"กิจกรรมได้รับการตอบรับ","failure":"ผู้ร้องเรียนรู้สึกถูกกันออก"}]},"image-award":{"title":"นายกได้รับเสนอชื่อชิงรางวัล","story":"สมาคมในเมืองเสนอรางวัลนายกดีเด่น พร้อมเงินสนับสนุนกิจกรรมชุมชน","choices":[{"title":"รับรางวัลและเงินสนับสนุน","success":"เทศบาลได้รับรางวัล"},{"title":"ร่วมงานโดยไม่รับเงิน","success":"ได้รับเสียงชื่นชม แต่ทีมงานต้องแบ่งเวลาจากงานประจำมาช่วย"},{"title":"ปฏิเสธการเข้าร่วม","success":"นายกไม่ได้รับรางวัล"},{"title":"ชวนคณะกรรมการประเมินผลงานต่อหน้าประชาชน","success":"คณะกรรมการยอมเปิดเผยการประเมิน แต่ทีมงานต้องแบ่งเวลาจากงานประจำมาช่วย"},{"title":"รับเงินจากผู้จัดงานแต่ไม่ขึ้นเวที","success":"เมืองได้เงินแต่พลาดการพบปะชุมชน"}]},"image-rumor":{"title":"ข่าวลือเรื่องเงินเมือง","story":"มีคนปล่อยข่าวว่านายกใช้เงินของเมืองไม่เหมาะสม ชาวเมืองกำลังรอฟังคำตอบ","choices":[{"title":"เปิดเอกสารให้ตรวจสอบ","success":"เอกสารทำให้ความสงสัยลดลง แต่ทีมงานต้องแบ่งเวลาจากงานประจำมาช่วย"},{"title":"ตั้งคณะชี้แจง","success":"สื่อได้รับข้อมูลเพิ่มเติม"},{"title":"ไม่ตอบโต้","success":"ข่าวลือหายไปเอง","failure":"ข่าวลือถูกแชร์ต่อ"},{"title":"ให้รัฐบาลช่วยยืนยันข้อมูล","success":"ส่วนกลางยืนยันเอกสารที่เกี่ยวข้อง แต่ทีมงานต้องแบ่งเวลาจากงานประจำมาช่วย"},{"title":"ยอมรับว่ามีขั้นตอนที่ยังต้องปรับปรุง","success":"สื่อยอมรับคำชี้แจงตรงไปตรงมา"}]},"image-speech":{"title":"ขึ้นเวทีเปิดงาน","story":"ผู้จัดงานเชิญนายกไปกล่าวเปิดงานต่อหน้าชาวเมือง","choices":[{"title":"พูดถึงผลงานและรับฟังคำถาม","success":"ผู้ฟังตอบรับดี แต่ทีมงานต้องแบ่งเวลาจากงานประจำมาช่วย"},{"title":"เตรียมทีมช่วยร่างคำพูด","success":"การกล่าวเปิดงานราบรื่น"},{"title":"ไม่ไปงาน","success":"ผู้จัดงานผิดหวัง"},{"title":"ชวนตัวแทนชุมชนขึ้นเวทีร่วมกัน","success":"เวทีได้รับคำชื่นชม แต่ทีมงานต้องแบ่งเวลาจากงานประจำมาช่วย"},{"title":"ประกาศผลงานเกินกว่าที่ทำได้","success":"ผู้ฟังตอบรับคำพูด","failure":"ข้อมูลถูกทักท้วงหลังงาน"},{"title":"รับเงินสนับสนุน 400,000 บาท พร้อมกล่าวขอบคุณผู้จัดงานตามกำหนด","success":"พิธีกรประกาศยอดสนับสนุนอย่างเปิดเผย ผู้ชมเห็นว่านายกให้เกียรติผู้ร่วมจัดงาน ขณะที่ธุรกิจพอใจกับการประชาสัมพันธ์ที่เป็นธรรม"}]},"image-friend":{"title":"เพื่อนเก่ามาขอให้ช่วย","story":"เพื่อนของนายกอยากให้เมืองช่วยออกเงินจัดกิจกรรมส่วนตัว","choices":[{"title":"อนุมัติเงินตามคำขอ","success":"เพื่อนได้รับความช่วยเหลือ แต่สื่อไม่พอใจ"},{"title":"เสนอให้จัดเป็นกิจกรรมสาธารณะ","success":"กิจกรรมได้รับการปรับให้เป็นประโยชน์ส่วนรวม"},{"title":"ปฏิเสธ","success":"ไม่ใช้งบเมืองเพื่อเรื่องส่วนตัว"},{"title":"ให้คณะกรรมการอิสระพิจารณาคำขอ","success":"คำขอได้รับการพิจารณาตามเกณฑ์ แต่ทีมงานต้องแบ่งเวลาจากงานประจำมาช่วย"},{"title":"ให้สิทธิพิเศษโดยไม่ลงเอกสาร","success":"ไม่มีข้อร้องเรียนในวันนี้","failure":"ข้อตกลงถูกเปิดเผย"}]},"image-camera":{"title":"หนึ่งวันกับท่านนายก","story":"ทีมถ่ายสารคดีขอติดตามการทำงานของนายกตลอดวัน","choices":[{"title":"เปิดสำนักงานให้ถ่ายทำ","success":"สารคดีนำเสนอผลงานในทางดี แต่ทีมงานต้องแบ่งเวลาจากงานประจำมาช่วย"},{"title":"อนุญาตเฉพาะพื้นที่สาธารณะ","success":"รายการเผยแพร่ตามปกติ"},{"title":"ไม่อนุญาต","success":"พลาดโอกาสประชาสัมพันธ์"},{"title":"เปิดให้ผู้แทนชุมชนร่วมเล่าเรื่องเมือง","success":"สารคดีสะท้อนชีวิตชุมชน แต่ทีมงานต้องแบ่งเวลาจากงานประจำมาช่วย"},{"title":"ขายสิทธิ์ประชาสัมพันธ์ให้ผู้ผลิต","success":"คลังได้เงินแต่สื่อบางส่วนวิจารณ์"}]},"image-promise":{"title":"คำสัญญาเรื่องรถติด","story":"นักข่าวถามว่านายกจะทำให้คนในเมืองเดินทางสะดวกขึ้นได้จริงหรือไม่","choices":[{"title":"พิสูจน์ด้วยอัตราสำเร็จ 80% วันนี้","success":"นายกพิสูจน์ผลงานได้","failure":"ทำไม่สำเร็จตามที่รับปาก"},{"title":"ขอไม่ให้คำมั่นที่วัดผลไม่ได้","success":"สื่อรับทราบคำตอบ"},{"title":"ประกาศชัยชนะก่อนผลออก","success":"ข่าวได้รับการตอบรับ","failure":"ประชาชนตั้งคำถามกับคำประกาศ"},{"title":"ขอผู้แทนชุมชนร่วมกำหนดเป้าหมาย","success":"ชุมชนชื่นชมการตั้งเป้าหมายร่วมกัน แต่ทีมงานต้องแบ่งเวลาจากงานประจำมาช่วย"},{"title":"จัดเวทีติดตามผลต่อสาธารณะ","success":"ประชาชนได้รับข้อมูลอย่างเป็นระบบ"}]},"image-gift":{"title":"ของขวัญราคาแพง","story":"เจ้าของกิจการส่งของขวัญราคาแพงมาให้ที่สำนักงานนายก","choices":[{"title":"นำมูลค่าเข้าคลังและเปิดเผย","success":"เทศบาลรับทรัพย์สินอย่างเปิดเผย"},{"title":"ส่งคืน","success":"ผู้ส่งรับของคืน"},{"title":"รับไว้โดยไม่เปิดเผย","success":"เกิดประวัติรับผลประโยชน์"},{"title":"ขอเจ้าหน้าที่รัฐรับรองการส่งคืนของขวัญ","success":"การส่งคืนมีหลักฐานเปิดเผย แต่ทีมงานต้องแบ่งเวลาจากงานประจำมาช่วย"},{"title":"ให้ผู้ส่งเปลี่ยนเป็นของขวัญส่วนตัว","success":"เรื่องไม่ถูกนำเสนอในข่าว","failure":"สื่อพบการรับของขวัญ"}]},"image-survey":{"title":"ชาวเมืองคิดอย่างไรกับนายก?","story":"สำนักข่าวอยากสำรวจความคิดเห็นของชาวเมืองที่มีต่อนายก","choices":[{"title":"เผยแพร่ผลสำรวจตามจริง","success":"ประชาชนเห็นข้อมูลอย่างเปิดเผย"},{"title":"จัดแคมเปญรับฟังเพิ่มเติม","success":"ภาพลักษณ์ดีขึ้น"},{"title":"ไม่สนับสนุน","success":"ไม่มีการสำรวจเพิ่มเติม"},{"title":"ขอชุมชนร่วมตรวจวิธีสำรวจ","success":"ตัวแทนชุมชนยอมรับกระบวนการ แต่ทีมงานต้องแบ่งเวลาจากงานประจำมาช่วย"},{"title":"เผยแพร่เฉพาะผลสำรวจด้านบวก","success":"ข่าวได้รับความนิยม","failure":"ผู้สำรวจเปิดเผยข้อมูลที่ถูกตัดออก"}]},"image-critic":{"title":"คลิปนายกกำลังเป็นกระแส","story":"คลิปที่นายกตอบคำถามด้วยท่าทีไม่สุภาพกำลังถูกแชร์ไปทั่วเมือง","choices":[{"title":"กล่าวขอโทษต่อสาธารณะ","success":"กระแสวิจารณ์เบาลง แต่ทีมงานต้องแบ่งเวลาจากงานประจำมาช่วย"},{"title":"จัดเวทีตอบคำถาม","success":"ประชาชนได้รับคำอธิบาย"},{"title":"โต้กลับผู้เผยแพร่คลิป","success":"ผู้เผยแพร่ยุติเรื่อง","failure":"กระแสต่อต้านขยายตัว"},{"title":"เชิญผู้วิจารณ์มาร่วมรับฟังข้อเท็จจริง","success":"ผู้วิจารณ์ยอมรับการพูดคุย แต่ทีมงานต้องแบ่งเวลาจากงานประจำมาช่วย"},{"title":"ยอมรับข้อผิดพลาดพร้อมเปิดข้อมูล","success":"ความน่าเชื่อถือกลับมาบางส่วน"}]},"image-community":{"title":"ชวนท่านนายกมาร่วมงาน","story":"ตัวแทนชุมชนชวนนายกไปพบปะและพูดคุยกับชาวบ้านในงานเลี้ยง","choices":[{"title":"สนับสนุนงานชุมชน","success":"งานประสบความสำเร็จ"},{"title":"รับเชิญแบบเรียบง่าย","success":"นายกได้พบประชาชน"},{"title":"ปฏิเสธ","success":"ผู้จัดงานผิดหวังเล็กน้อย"},{"title":"ขอชุมชนจัดงานด้วยทรัพยากรที่มี","success":"งานจัดได้โดยไม่ใช้เงินเมือง แต่ทีมงานต้องแบ่งเวลาจากงานประจำมาช่วย"},{"title":"รับเงินสนับสนุนจากผู้ประกอบการในงาน","success":"คลังได้เงินแต่ชุมชนบางส่วนไม่พอใจ"},{"title":"รับเงินสมทบกองทุนชุมชน 350,000 บาทจากผู้จัดงาน","success":"ยอดเงินปรากฏในทะเบียนรับบริจาคและไม่มีการเปลี่ยนแผนงานหรือสิทธิของผู้บริจาค ชาวเมืองและสื่อไม่ได้มีปฏิกิริยาเพิ่มเติม"}]},"fame-tour-film":{"title":"หนังเรื่องใหม่ถ่ายที่เมืองเรา","story":"ทีมถ่ายภาพยนตร์อยากใช้สถานที่ในเมืองเป็นฉากในหนัง","choices":[{"title":"รับข้อเสนอประชาสัมพันธ์เมือง","success":"ภาพยนตร์โปรโมตเมือง แต่ชาวบ้านบางส่วนมองว่าเมืองให้ความสำคัญกับชื่อเสียงมากเกินไป"},{"title":"อนุญาตโดยไม่รับเงิน","success":"เมืองได้รับการเผยแพร่"},{"title":"ไม่อนุญาต","success":"พลาดโอกาสประชาสัมพันธ์"},{"title":"ขอผู้ผลิตนำเสนอเมืองโดยใช้เรื่องราวชุมชน","success":"ผู้ผลิตยอมรับรูปแบบที่เมืองเสนอ แต่ชาวบ้านบางส่วนมองว่าเมืองให้ความสำคัญกับชื่อเสียงมากเกินไป"},{"title":"อนุญาตให้ใช้ชื่อเมืองโดยไม่ตรวจเนื้อหา","success":"ภาพยนตร์โปรโมตเมืองได้ดี","failure":"เนื้อหาทำให้เมืองเสียชื่อเสียง"},{"title":"เก็บค่าธรรมเนียมถ่ายทำ 900,000 บาทตามประกาศเทศบาล","success":"กองถ่ายชำระเงินตามอัตราที่ประกาศและไม่ปิดพื้นที่เกินเวลาที่ได้รับอนุญาต ภาพเมืองออกอากาศและทำให้คนรู้จักเมืองเพิ่มขึ้น"}]},"fame-hotel-guide":{"title":"พาเที่ยว พาพัก","story":"สมาคมโรงแรมอยากทำคู่มือแนะนำที่พักในเมืองให้นักท่องเที่ยว","choices":[{"title":"สนับสนุนคู่มือ","success":"นักท่องเที่ยวรู้จักเมืองมากขึ้น"},{"title":"ขอผู้สนับสนุน","success":"สมาคมออกค่าใช้จ่ายให้ แต่ชาวบ้านบางส่วนมองว่าเมืองให้ความสำคัญกับชื่อเสียงมากเกินไป"},{"title":"ไม่ร่วมโครงการ","success":"คู่มือไม่ได้จัดทำ"},{"title":"ลดรายได้จากทริปโรงแรม 100 บาทวันนี้","success":"สมาคมที่พักยอมรับการสนับสนุน"},{"title":"ให้สมาคมเผยแพร่คู่มือโดยไม่ตรวจทาน","success":"คู่มือได้รับความนิยม","failure":"ข้อมูลที่พักผิดพลาดและถูกตำหนิ"}]},"fame-restaurant-star":{"title":"นักชิมชื่อดังมาเยือน","story":"นักชิมชื่อดังอยากทำคลิปแนะนำร้านอาหารในเมืองเรา","choices":[{"title":"สนับสนุนกิจกรรมชิมอาหาร","success":"ร้านอาหารได้รับความสนใจ"},{"title":"ปล่อยให้รีวิวตามจริง","success":"เมืองได้รับการกล่าวถึง"},{"title":"ท้าให้รีวิวอาหารเมือง","success":"นักชิมชื่นชอบ","failure":"รีวิวออกมาในเชิงลบ"},{"title":"ชวนสมาคมร้านอาหารดูแลการต้อนรับ","success":"สมาคมจัดกิจกรรมให้เอง แต่ชาวบ้านบางส่วนมองว่าเมืองให้ความสำคัญกับชื่อเสียงมากเกินไป"},{"title":"ลดรายได้ร้านอาหาร 100 บาทวันนี้","success":"ร้านอาหารได้รับการสนับสนุนชั่วคราว"}]},"fame-shopping":{"title":"เทศกาลช้อปปิ้ง","story":"ผู้จัดงานอยากโปรโมตห้างและแหล่งช้อปปิ้งของเมือง","choices":[{"title":"สนับสนุนงาน","success":"ห้างได้รับความนิยมวันนี้"},{"title":"ให้เอกชนออกงบ","success":"ผู้จัดงานรับผิดชอบค่าใช้จ่าย"},{"title":"ไม่จัดงาน","success":"เมืองดำเนินตามปกติ"},{"title":"ใช้เครือข่ายรัฐบาลช่วยเผยแพร่ข่าวงาน","success":"หน่วยงานกลางช่วยประชาสัมพันธ์ แต่ชาวบ้านบางส่วนมองว่าเมืองให้ความสำคัญกับชื่อเสียงมากเกินไป"},{"title":"ให้ผู้จัดโฆษณาเกินจริงเพื่อเรียกความสนใจ","success":"งานเป็นกระแส","failure":"นักท่องเที่ยวตำหนิโฆษณา"}]},"fame-night":{"title":"คืนนี้เที่ยวไหนดี?","story":"ผู้จัดงานอยากโปรโมตผับและสถานบันเทิงให้คนรู้จักมากขึ้น","choices":[{"title":"อนุมัติงบโปรโมต","success":"แคมเปญได้รับความนิยม"},{"title":"จัดแบบประหยัด","success":"แคมเปญขนาดเล็กสำเร็จ"},{"title":"ไม่ร่วม","success":"ไม่เกิดผลกระทบ"},{"title":"ให้ชุมชนช่วยกำหนดแนวทางกิจกรรม","success":"ชุมชนยอมรับแผนประชาสัมพันธ์ แต่ชาวบ้านบางส่วนมองว่าเมืองให้ความสำคัญกับชื่อเสียงมากเกินไป"},{"title":"รับสปอนเซอร์จากผู้จัดงาน","success":"คลังได้เงิน แต่ชุมชนกังวลเรื่องงาน"}]},"fame-coast":{"title":"ชายหาดสวยของเมืองเรา","story":"สื่ออยากชวนเมืองจัดกิจกรรมดูแลความสะอาดชายหาด","choices":[{"title":"จัดกิจกรรมทำความสะอาด","success":"ชายหาดได้รับเสียงชื่นชม"},{"title":"ขอให้อาสาสมัครช่วย","success":"กิจกรรมสำเร็จโดยไม่ใช้เงินเมือง"},{"title":"ไม่เข้าร่วม","success":"สื่อไม่พอใจการเพิกเฉย"},{"title":"ขอให้รัฐบาลช่วยประชาสัมพันธ์","success":"รัฐบาลสนับสนุนการประชาสัมพันธ์ แต่ชาวบ้านบางส่วนมองว่าเมืองให้ความสำคัญกับชื่อเสียงมากเกินไป"},{"title":"เผยแพร่ภาพชายฝั่งโดยไม่ตรวจสภาพ","success":"ภาพได้รับการแชร์","failure":"สื่อทักท้วงสภาพพื้นที่จริง"},{"title":"รับเงินสนับสนุนเก็บขยะชายฝั่ง 500,000 บาทโดยไม่อนุญาตป้ายโฆษณาเพิ่มเติม","success":"ผู้บริจาคยอมรับเงื่อนไข เงินเข้าสู่คลังตามระเบียบ ขณะที่กิจกรรมยังจัดตามกำหนดและไม่เกิดกระแสใหม่ด้านชื่อเสียง"}]},"fame-rival":{"title":"เมืองข้าง ๆ กำลังดัง","story":"เมืองเพื่อนบ้านกำลังได้รับความสนใจจากนักท่องเที่ยว เราจะทำอย่างไรดี?","choices":[{"title":"ร่วมโปรโมตทั้งสองเมือง","success":"เมืองได้รับการประชาสัมพันธ์ร่วมกัน"},{"title":"จัดแคมเปญของเราเอง","success":"เมืองได้รับความสนใจเพิ่ม"},{"title":"ไม่แข่งขัน","success":"กระแสคู่แข่งเงียบลง","failure":"เมืองเสียโอกาสและชื่อเสียงลดลง"},{"title":"ขอภาคธุรกิจร่วมทำแคมเปญ","success":"ผู้ประกอบการช่วยเผยแพร่เมือง แต่ชาวบ้านบางส่วนมองว่าเมืองให้ความสำคัญกับชื่อเสียงมากเกินไป"},{"title":"ประกาศว่าเมืองดีกว่าคู่แข่งโดยไม่เปรียบเทียบข้อมูล","success":"แคมเปญได้รับความสนใจ","failure":"เกิดกระแสวิจารณ์การกล่าวอ้าง"}]},"fame-landmark":{"title":"ตึกมหานครเข้าตาสื่อ","story":"สื่อด้านสถาปัตยกรรมอยากนำเรื่องตึกมหานครของเราไปเผยแพร่","choices":[{"title":"สนับสนุนงานนำเสนอ","success":"แลนด์มาร์กได้รับการประชาสัมพันธ์"},{"title":"ให้ข้อมูลอย่างเดียว","success":"สื่อเผยแพร่ข้อมูลเมือง"},{"title":"ไม่ร่วมงาน","success":"ไม่มีการประชาสัมพันธ์"},{"title":"ขอรัฐบาลช่วยเผยแพร่ผลงานสถาปัตยกรรม","success":"เมืองได้รับการประชาสัมพันธ์จากรัฐบาล แต่ชาวบ้านบางส่วนมองว่าเมืองให้ความสำคัญกับชื่อเสียงมากเกินไป"},{"title":"รับเงินสนับสนุนงานนำเสนอแบบมีผู้สนับสนุน","success":"คลังได้รับเงินและชื่อเมืองถูกกล่าวถึง"}]},"fame-park":{"title":"วันหยุดของครอบครัว","story":"ผู้จัดงานอยากชวนครอบครัวมาเที่ยวและทำกิจกรรมในสวนของเมือง","choices":[{"title":"สนับสนุนงาน","success":"กิจกรรมครอบครัวได้รับการตอบรับ"},{"title":"ให้ผู้จัดรับผิดชอบงบ","success":"กิจกรรมจัดขึ้นโดยเอกชน"},{"title":"ไม่อนุญาต","success":"งานไม่ได้จัด"},{"title":"ให้ตัวแทนครอบครัวจัดกิจกรรมเอง","success":"ชุมชนร่วมจัดงานโดยไม่ใช้เงินเมือง แต่ชาวบ้านบางส่วนมองว่าเมืองให้ความสำคัญกับชื่อเสียงมากเกินไป"},{"title":"ลดรายได้จากสวน 100 บาทวันนี้","success":"ผู้จัดได้รับการสนับสนุน"}]},"fame-visitor":{"title":"นักท่องเที่ยวเริ่มบ่น","story":"กลุ่มนักท่องเที่ยวไม่พอใจบริการในเมือง และอยากฟังคำตอบจากนายก","choices":[{"title":"จ่ายงบช่วยเหลือ","success":"กลุ่มทัวร์ถอนคำร้อง"},{"title":"เจรจาด้วยผลงานเมือง","success":"กลุ่มทัวร์ยอมรับคำชี้แจง แต่ชาวบ้านบางส่วนมองว่าเมืองให้ความสำคัญกับชื่อเสียงมากเกินไป"},{"title":"ไม่ตอบคำร้อง","success":"กลุ่มทัวร์ยุติเรื่อง","failure":"กลุ่มทัวร์ยกเลิกการเดินทาง"},{"title":"ขอผู้แทนธุรกิจร่วมไกล่เกลี่ย","success":"กลุ่มทัวร์ยอมรับคำชี้แจงร่วมกัน แต่ชาวบ้านบางส่วนมองว่าเมืองให้ความสำคัญกับชื่อเสียงมากเกินไป"},{"title":"ยอมรับปัญหาอย่างเปิดเผย","success":"ผู้ร้องเรียนเห็นว่าเมืองรับผิดชอบ"}]},"fame-press-trip":{"title":"พานักข่าวเที่ยวเมือง","story":"สมาคมท่องเที่ยวอยากพานักข่าวมาเที่ยวสถานที่ต่าง ๆ ในเมือง","choices":[{"title":"ต้อนรับเต็มรูปแบบ","success":"ข่าวท่องเที่ยวเผยแพร่ทั่วประเทศ"},{"title":"ต้อนรับแบบประหยัด","success":"ได้รับข่าวประชาสัมพันธ์เล็กน้อย"},{"title":"ไม่รับคณะ","success":"ไม่มีการเปลี่ยนแปลง"},{"title":"ขอให้รัฐบาลช่วยติดต่อสื่อ","success":"ส่วนกลางช่วยต้อนรับคณะสื่อ แต่ชาวบ้านบางส่วนมองว่าเมืองให้ความสำคัญกับชื่อเสียงมากเกินไป"},{"title":"ให้สปอนเซอร์รับผิดชอบงานต้อนรับ","success":"เมืองได้รับเงินสนับสนุนแต่สื่อบางส่วนไม่พอใจ"}]},"fame-city-award":{"title":"เมืองเราจะได้รางวัลไหม?","story":"คณะกรรมการคัดเลือกเมืองท่องเที่ยวดีเด่น ขอให้เราแสดงผลการเดินทางของเมือง","choices":[{"title":"ผ่านเกณฑ์การเดินทาง 85% วันนี้","success":"เมืองได้รับรางวัล","failure":"เมืองไม่ผ่านการคัดเลือก"},{"title":"ไม่สมัคร","success":"เมืองไม่เข้าร่วม"},{"title":"ขอคำแนะนำเพื่อปรับปรุง","success":"ได้รับคำแนะนำจากกรรมการ"},{"title":"ขอผู้ประเมินแนะนำโดยไม่เข้าชิง","success":"เมืองได้รับคำแนะนำโดยไม่ใช้เงินเมือง"},{"title":"อ้างรางวัลก่อนผลประเมิน","success":"ข่าวได้รับการตอบรับ","failure":"คณะกรรมการปฏิเสธคำกล่าวอ้าง"}]},"fame-festival-sponsor":{"title":"มีคนอยากออกเงินจัดงาน","story":"ผู้สนับสนุนเสนอเงินให้เมือง แลกกับพื้นที่โฆษณาในงานใหญ่","choices":[{"title":"รับเงินพร้อมประชาสัมพันธ์","success":"ผู้สนับสนุนโอนเงินให้"},{"title":"ขอรูปแบบไม่รบกวนชุมชน","success":"ผู้สนับสนุนตกลงข้อเสนอ แต่ชาวบ้านบางส่วนมองว่าเมืองให้ความสำคัญกับชื่อเสียงมากเกินไป"},{"title":"ไม่รับ","success":"ไม่มีเงินสนับสนุน"},{"title":"ให้ชุมชนกำหนดขอบเขตประชาสัมพันธ์","success":"ผู้สนับสนุนยอมรับแนวทางชุมชน แต่ชาวบ้านบางส่วนมองว่าเมืองให้ความสำคัญกับชื่อเสียงมากเกินไป"},{"title":"ขอเงินสนับสนุนเพิ่มโดยยืนยันสิทธิ์ผู้จัด","success":"ผู้จัดยอมเพิ่มเงิน","failure":"ผู้จัดถอนตัวและข่าวแพร่ออกไป"}]},"government-grant-shop":{"title":"รัฐบาลช่วยสร้างร้านค้าเริ่มต้น","story":"รัฐบาลเสนอเงินช่วยสร้างร้านค้าเริ่มต้น 3 แห่ง ให้เสร็จก่อน 06:00 น. ของวันถัดไป หากสร้างไม่ครบต้องคืนเงินที่รับมา","choices":[{"title":"รับงบ 18,000 บาท สร้างร้านค้าเริ่มต้น 3 แห่ง","success":"สร้างอาคารครบตามที่ตกลงกับรัฐบาล","failure":"สร้างไม่ครบตามสัญญา"},{"title":"รับงบ 9,000 บาท สร้างร้านค้าเริ่มต้น 3 แห่ง","success":"สร้างอาคารครบตามที่ตกลงไว้","failure":"ก่อสร้างไม่ครบ"},{"title":"ไม่รับโครงการ","success":"รัฐบาลนำงบไปช่วยเมืองอื่นแทน"},{"title":"ใช้งบเมืองเอง สร้างร้านค้าเริ่มต้น 3 แห่ง","success":"ส่งมอบร้านค้าเริ่มต้นตามข้อตกลงแล้ว","failure":"ส่งมอบร้านค้าเริ่มต้นไม่ครบตามเวลาที่กำหนด"},{"title":"ขอชะลอโครงการโดยส่งแผนพัฒนาแทน","success":"รัฐบาลรับทราบข้อจำกัดและเลื่อนโครงการ"}]},"government-grant-food":{"title":"รัฐบาลช่วยสร้างร้านอาหารเริ่มต้น","story":"รัฐบาลเสนอเงินช่วยสร้างร้านอาหารเริ่มต้น 3 แห่ง ให้เสร็จก่อน 06:00 น. ของวันถัดไป หากสร้างไม่ครบต้องคืนเงินที่รับมา","choices":[{"title":"รับงบ 30,000 บาท สร้างร้านอาหารเริ่มต้น 3 แห่ง","success":"สร้างอาคารครบตามที่ตกลงกับรัฐบาล","failure":"สร้างไม่ครบตามสัญญา"},{"title":"รับงบ 15,000 บาท สร้างร้านอาหารเริ่มต้น 3 แห่ง","success":"สร้างอาคารครบตามที่ตกลงไว้","failure":"ก่อสร้างไม่ครบ"},{"title":"ไม่รับโครงการ","success":"รัฐบาลนำงบไปช่วยเมืองอื่นแทน"},{"title":"ใช้งบเมืองเอง สร้างร้านอาหารเริ่มต้น 3 แห่ง","success":"ส่งมอบร้านอาหารเริ่มต้นตามข้อตกลงแล้ว","failure":"ส่งมอบร้านอาหารเริ่มต้นไม่ครบตามเวลาที่กำหนด"},{"title":"ขอชะลอโครงการโดยส่งแผนพัฒนาแทน","success":"รัฐบาลรับทราบข้อจำกัดและเลื่อนโครงการ"}]},"government-grant-office":{"title":"รัฐบาลช่วยสร้างสำนักงานเริ่มต้น","story":"รัฐบาลเสนอเงินช่วยสร้างสำนักงานเริ่มต้น 2 แห่ง ให้เสร็จก่อน 06:00 น. ของวันถัดไป หากสร้างไม่ครบต้องคืนเงินที่รับมา","choices":[{"title":"รับงบ 24,000 บาท สร้างสำนักงานเริ่มต้น 2 แห่ง","success":"สร้างอาคารครบตามที่ตกลงกับรัฐบาล","failure":"สร้างไม่ครบตามสัญญา"},{"title":"รับงบ 12,000 บาท สร้างสำนักงานเริ่มต้น 2 แห่ง","success":"สร้างอาคารครบตามที่ตกลงไว้","failure":"ก่อสร้างไม่ครบ"},{"title":"ไม่รับโครงการ","success":"รัฐบาลนำงบไปช่วยเมืองอื่นแทน"},{"title":"ใช้งบเมืองเอง สร้างสำนักงานเริ่มต้น 2 แห่ง","success":"ส่งมอบสำนักงานเริ่มต้นตามข้อตกลงแล้ว","failure":"ส่งมอบสำนักงานเริ่มต้นไม่ครบตามเวลาที่กำหนด"},{"title":"ขอชะลอโครงการโดยส่งแผนพัฒนาแทน","success":"รัฐบาลรับทราบข้อจำกัดและเลื่อนโครงการ"}]},"government-grant-park":{"title":"รัฐบาลช่วยสร้างสวนเริ่มต้น","story":"รัฐบาลเสนอเงินช่วยสร้างสวนเริ่มต้น 3 แห่ง ให้เสร็จก่อน 06:00 น. ของวันถัดไป หากสร้างไม่ครบต้องคืนเงินที่รับมา","choices":[{"title":"รับงบ 15,000 บาท สร้างสวนเริ่มต้น 3 แห่ง","success":"สร้างอาคารครบตามที่ตกลงกับรัฐบาล","failure":"สร้างไม่ครบตามสัญญา"},{"title":"รับงบ 7,500 บาท สร้างสวนเริ่มต้น 3 แห่ง","success":"สร้างอาคารครบตามที่ตกลงไว้","failure":"ก่อสร้างไม่ครบ"},{"title":"ไม่รับโครงการ","success":"รัฐบาลนำงบไปช่วยเมืองอื่นแทน"},{"title":"ใช้งบเมืองเอง สร้างสวนเริ่มต้น 3 แห่ง","success":"ส่งมอบสวนเริ่มต้นตามข้อตกลงแล้ว","failure":"ส่งมอบสวนเริ่มต้นไม่ครบตามเวลาที่กำหนด"},{"title":"ขอชะลอโครงการโดยส่งแผนพัฒนาแทน","success":"รัฐบาลรับทราบข้อจำกัดและเลื่อนโครงการ"}]},"government-grant-hotel":{"title":"รัฐบาลช่วยสร้างโรงแรมเริ่มต้น","story":"รัฐบาลเสนอเงินช่วยสร้างโรงแรมเริ่มต้น 2 แห่ง ให้เสร็จก่อน 06:00 น. ของวันถัดไป หากสร้างไม่ครบต้องคืนเงินที่รับมา","choices":[{"title":"รับงบ 10,000 บาท สร้างโรงแรมเริ่มต้น 2 แห่ง","success":"สร้างอาคารครบตามที่ตกลงกับรัฐบาล","failure":"สร้างไม่ครบตามสัญญา"},{"title":"รับงบ 5,000 บาท สร้างโรงแรมเริ่มต้น 2 แห่ง","success":"สร้างอาคารครบตามที่ตกลงไว้","failure":"ก่อสร้างไม่ครบ"},{"title":"ไม่รับโครงการ","success":"รัฐบาลนำงบไปช่วยเมืองอื่นแทน"},{"title":"ใช้งบเมืองเอง สร้างโรงแรมเริ่มต้น 2 แห่ง","success":"ส่งมอบโรงแรมเริ่มต้นตามข้อตกลงแล้ว","failure":"ส่งมอบโรงแรมเริ่มต้นไม่ครบตามเวลาที่กำหนด"},{"title":"ขอชะลอโครงการโดยส่งแผนพัฒนาแทน","success":"รัฐบาลรับทราบข้อจำกัดและเลื่อนโครงการ"}]},"government-grant-factory":{"title":"รัฐบาลช่วยสร้างโรงงานเริ่มต้น","story":"รัฐบาลเสนอเงินช่วยสร้างโรงงานเริ่มต้น 2 แห่ง ให้เสร็จก่อน 06:00 น. ของวันถัดไป หากสร้างไม่ครบต้องคืนเงินที่รับมา","choices":[{"title":"รับงบ 32,000 บาท สร้างโรงงานเริ่มต้น 2 แห่ง","success":"สร้างอาคารครบตามที่ตกลงกับรัฐบาล","failure":"สร้างไม่ครบตามสัญญา"},{"title":"รับงบ 16,000 บาท สร้างโรงงานเริ่มต้น 2 แห่ง","success":"สร้างอาคารครบตามที่ตกลงไว้","failure":"ก่อสร้างไม่ครบ"},{"title":"ไม่รับโครงการ","success":"รัฐบาลนำงบไปช่วยเมืองอื่นแทน"},{"title":"ใช้งบเมืองเอง สร้างโรงงานเริ่มต้น 2 แห่ง","success":"ส่งมอบโรงงานเริ่มต้นตามข้อตกลงแล้ว","failure":"ส่งมอบโรงงานเริ่มต้นไม่ครบตามเวลาที่กำหนด"},{"title":"ขอชะลอโครงการโดยส่งแผนพัฒนาแทน","success":"รัฐบาลรับทราบข้อจำกัดและเลื่อนโครงการ"}]},"government-grant-mall":{"title":"รัฐบาลช่วยสร้างห้างเริ่มต้น","story":"รัฐบาลเสนอเงินช่วยสร้างห้างเริ่มต้น 2 แห่ง ให้เสร็จก่อน 06:00 น. ของวันถัดไป หากสร้างไม่ครบต้องคืนเงินที่รับมา","choices":[{"title":"รับงบ 48,000 บาท สร้างห้างเริ่มต้น 2 แห่ง","success":"สร้างอาคารครบตามที่ตกลงกับรัฐบาล","failure":"สร้างไม่ครบตามสัญญา"},{"title":"รับงบ 24,000 บาท สร้างห้างเริ่มต้น 2 แห่ง","success":"สร้างอาคารครบตามที่ตกลงไว้","failure":"ก่อสร้างไม่ครบ"},{"title":"ไม่รับโครงการ","success":"รัฐบาลนำงบไปช่วยเมืองอื่นแทน"},{"title":"ใช้งบเมืองเอง สร้างห้างเริ่มต้น 2 แห่ง","success":"ส่งมอบห้างเริ่มต้นตามข้อตกลงแล้ว","failure":"ส่งมอบห้างเริ่มต้นไม่ครบตามเวลาที่กำหนด"},{"title":"ขอชะลอโครงการโดยส่งแผนพัฒนาแทน","success":"รัฐบาลรับทราบข้อจำกัดและเลื่อนโครงการ"}]},"government-grant-pub":{"title":"รัฐบาลช่วยสร้างผับเริ่มต้น","story":"รัฐบาลเสนอเงินช่วยสร้างผับเริ่มต้น 2 แห่ง ให้เสร็จก่อน 06:00 น. ของวันถัดไป หากสร้างไม่ครบต้องคืนเงินที่รับมา","choices":[{"title":"รับงบ 24,000 บาท สร้างผับเริ่มต้น 2 แห่ง","success":"สร้างอาคารครบตามที่ตกลงกับรัฐบาล","failure":"สร้างไม่ครบตามสัญญา"},{"title":"รับงบ 12,000 บาท สร้างผับเริ่มต้น 2 แห่ง","success":"สร้างอาคารครบตามที่ตกลงไว้","failure":"ก่อสร้างไม่ครบ"},{"title":"ไม่รับโครงการ","success":"รัฐบาลนำงบไปช่วยเมืองอื่นแทน"},{"title":"ใช้งบเมืองเอง สร้างผับเริ่มต้น 2 แห่ง","success":"ส่งมอบผับเริ่มต้นตามข้อตกลงแล้ว","failure":"ส่งมอบผับเริ่มต้นไม่ครบตามเวลาที่กำหนด"},{"title":"ขอชะลอโครงการโดยส่งแผนพัฒนาแทน","success":"รัฐบาลรับทราบข้อจำกัดและเลื่อนโครงการ"}]},"government-grant-home-small":{"title":"รัฐบาลช่วยสร้างบ้านเล็ก","story":"รัฐบาลเสนอเงินช่วยสร้างบ้านเล็ก 1 หลัง ให้เสร็จก่อน 06:00 น. ของวันถัดไป หากสร้างไม่ครบต้องคืนเงินที่รับมา","choices":[{"title":"รับงบ 260,000 บาท สร้างบ้านเล็ก 1 แห่ง","success":"สร้างอาคารครบตามที่ตกลงกับรัฐบาล","failure":"สร้างไม่ครบตามสัญญา"},{"title":"รับงบ 130,000 บาท สร้างบ้านเล็ก 1 แห่ง","success":"สร้างอาคารครบตามที่ตกลงไว้","failure":"ก่อสร้างไม่ครบ"},{"title":"ไม่รับโครงการ","success":"รัฐบาลนำงบไปช่วยเมืองอื่นแทน"},{"title":"ใช้งบเมืองเอง สร้างบ้านเล็ก 1 แห่ง","success":"ส่งมอบบ้านเล็กตามข้อตกลงแล้ว","failure":"ส่งมอบบ้านเล็กไม่ครบตามเวลาที่กำหนด"},{"title":"ขอชะลอโครงการโดยส่งแผนพัฒนาแทน","success":"รัฐบาลรับทราบข้อจำกัดและเลื่อนโครงการ"}]},"government-grant-pub-large":{"title":"รัฐบาลช่วยสร้างผับใหญ่","story":"รัฐบาลเสนอเงินช่วยสร้างผับใหญ่ 1 แห่ง ให้เสร็จก่อน 06:00 น. ของวันถัดไป หากสร้างไม่ครบต้องคืนเงินที่รับมา","choices":[{"title":"รับงบ 170,000 บาท สร้างผับใหญ่ 1 แห่ง","success":"สร้างอาคารครบตามที่ตกลงกับรัฐบาล","failure":"สร้างไม่ครบตามสัญญา"},{"title":"รับงบ 85,000 บาท สร้างผับใหญ่ 1 แห่ง","success":"สร้างอาคารครบตามที่ตกลงไว้","failure":"ก่อสร้างไม่ครบ"},{"title":"ไม่รับโครงการ","success":"รัฐบาลนำงบไปช่วยเมืองอื่นแทน"},{"title":"ใช้งบเมืองเอง สร้างผับใหญ่ 1 แห่ง","success":"ส่งมอบผับใหญ่ตามข้อตกลงแล้ว","failure":"ส่งมอบผับใหญ่ไม่ครบตามเวลาที่กำหนด"},{"title":"ขอชะลอโครงการโดยส่งแผนพัฒนาแทน","success":"รัฐบาลรับทราบข้อจำกัดและเลื่อนโครงการ"}]},"government-grant-mall-large":{"title":"รัฐบาลช่วยสร้างห้างใหญ่","story":"รัฐบาลเสนอเงินช่วยสร้างห้างใหญ่ 1 แห่ง ให้เสร็จก่อน 06:00 น. ของวันถัดไป หากสร้างไม่ครบต้องคืนเงินที่รับมา","choices":[{"title":"รับงบ 380,000 บาท สร้างห้างใหญ่ 1 แห่ง","success":"สร้างอาคารครบตามที่ตกลงกับรัฐบาล","failure":"สร้างไม่ครบตามสัญญา"},{"title":"รับงบ 190,000 บาท สร้างห้างใหญ่ 1 แห่ง","success":"สร้างอาคารครบตามที่ตกลงไว้","failure":"ก่อสร้างไม่ครบ"},{"title":"ไม่รับโครงการ","success":"รัฐบาลนำงบไปช่วยเมืองอื่นแทน"},{"title":"ใช้งบเมืองเอง สร้างห้างใหญ่ 1 แห่ง","success":"ส่งมอบห้างใหญ่ตามข้อตกลงแล้ว","failure":"ส่งมอบห้างใหญ่ไม่ครบตามเวลาที่กำหนด"},{"title":"ขอชะลอโครงการโดยส่งแผนพัฒนาแทน","success":"รัฐบาลรับทราบข้อจำกัดและเลื่อนโครงการ"}]},"government-visit":{"title":"แขกจากรัฐบาล","story":"เจ้าหน้าที่รัฐบาลอยากมาฟังว่านายกมีแผนพัฒนาเมืองอย่างไร","choices":[{"title":"ต้อนรับและเสนอแผนงาน","success":"รัฐบาลพอใจการประสานงาน"},{"title":"ประชุมแบบประหยัด","success":"หารือสำเร็จ"},{"title":"ไม่สะดวกเข้าพบ","success":"รัฐบาลไม่พอใจ"},{"title":"ใช้ความโปร่งใสของเมืองนำเสนอข้อมูลโดยตรง","success":"รัฐบาลชื่นชมเอกสารที่ตรวจสอบได้ แต่ฝ่ายบริหารต้องปรับแผนเพื่อประสานส่วนกลาง"},{"title":"เสนอผลงานเกินจริงเพื่อสร้างความประทับใจ","success":"คณะดูงานตอบรับดี","failure":"เจ้าหน้าที่ตรวจพบข้อมูลไม่ตรง"},{"title":"รับงบอุดหนุนทั่วไป 1,000,000 บาท พร้อมลงนามรับทราบข้อเสนอของคณะรัฐบาล","success":"ส่วนกลางตรวจเอกสารครบและอนุมัติงบทั่วไปโดยไม่ผูกกับการจัดซื้อ คนกลางเห็นว่าเทศบาลส่งข้อมูลตามกำหนดจึงทำงานร่วมกันได้ดีขึ้น"}]},"government-fund-return":{"title":"เมืองเพื่อนบ้านขอความช่วยเหลือ","story":"รัฐบาลขอให้เราช่วยเมืองอื่นที่กำลังประสบปัญหา","choices":[{"title":"ร่วมสมทบงบ","success":"รัฐบาลชื่นชมความร่วมมือ"},{"title":"สมทบตามกำลัง","success":"ได้รับคำขอบคุณจากรัฐบาล"},{"title":"ไม่ร่วมสมทบ","success":"รัฐบาลรับทราบการปฏิเสธ"},{"title":"ชวนคนในเมืองร่วมบริจาคแทนการใช้เงินเมือง","success":"ภาคธุรกิจช่วยประสานเงินสนับสนุน แต่ฝ่ายบริหารต้องปรับแผนเพื่อประสานส่วนกลาง"},{"title":"เสนอช่วยด้านข้อมูลโดยไม่สมทบเงิน","success":"รัฐบาลรับทราบข้อเสนอ"},{"title":"ยื่นขอเงินสำรอง 1,800,000 บาทโดยระบุว่าเมืองยังขาดแคลนงบช่วยเหลือ","success":"เงินได้รับอนุมัติจากข้อมูลเบื้องต้น แต่การตรวจภายหลังพบว่าเมืองมีเงินสำรองอยู่แล้วและไม่ได้เปิดเผย ฝ่ายรัฐบาลเสียความเชื่อถือและผู้ตรวจสอบตั้งข้อสังเกตเรื่องความครบถ้วนของข้อมูล"}]},"people-housing":{"title":"บ้านไม่พอแล้ว!","story":"ชาวเมืองขอให้สร้างบ้านเพิ่ม เพื่อให้คนที่อยากย้ายเข้ามามีที่พัก","choices":[{"title":"สร้างบ้านเริ่มต้น 3 หลัง","success":"สร้างบ้านครบตามคำขอ","failure":"สร้างบ้านไม่ครบ"},{"title":"สนับสนุนค่าใช้จ่ายย้ายถิ่น","success":"ประชาชนพอใจมาตรการช่วยเหลือ"},{"title":"ไม่ดำเนินการ","success":"ประชาชนชะลอการย้ายเข้า"},{"title":"ขอให้ชาวบ้านช่วยติดต่อคนที่อยากย้ายเข้า","success":"ชุมชนให้ข้อมูลบ้านที่ว่างจริง แต่เจ้าของกิจการบางส่วนรู้สึกว่าต้องรับภาระเพิ่ม"},{"title":"รับเรื่องและแจ้งข้อจำกัดพื้นที่อย่างเปิดเผย","success":"ประชาชนเข้าใจข้อจำกัด"}]},"people-food":{"title":"อยากกินข้าวใกล้บ้าน","story":"ชาวเมืองอยากมีร้านอาหารใกล้บ้านมากขึ้น จะได้ไม่ต้องเดินทางไกล","choices":[{"title":"สร้างร้านอาหารเริ่มต้น 2 แห่ง","success":"เพิ่มร้านอาหารครบ","failure":"ทำตามคำขอไม่ครบ"},{"title":"ช่วยเหลืองบชุมชน","success":"ประชาชนได้รับความช่วยเหลือ"},{"title":"ปฏิเสธ","success":"ประชาชนไม่พอใจ"},{"title":"ชวนสมาคมร้านอาหารมาฟังปัญหา","success":"สมาคมตกลงประสานปัญหา แต่เจ้าของกิจการบางส่วนรู้สึกว่าต้องรับภาระเพิ่ม"},{"title":"ลดรายได้ร้านอาหาร 150 บาทวันนี้","success":"ชุมชนได้รับมาตรการชั่วคราว"}]},"people-shopping":{"title":"อยากซื้อของใกล้บ้าน","story":"คนในชุมชนขอให้เพิ่มร้านค้า จะได้ซื้อของใช้ประจำวันสะดวกขึ้น","choices":[{"title":"สร้างร้านค้าเริ่มต้น 2 แห่ง","success":"เปิดร้านค้าเพิ่มตามคำขอ","failure":"สร้างไม่ครบ"},{"title":"จัดงบช่วยเหลือ","success":"ชุมชนได้รับความช่วยเหลือ"},{"title":"ไม่แก้ไข","success":"คำร้องไม่ถูกดำเนินการ"},{"title":"เชิญสมาคมร้านค้าหารือกับชุมชน","success":"สมาคมยอมรับข้อเสนอชุมชน แต่เจ้าของกิจการบางส่วนรู้สึกว่าต้องรับภาระเพิ่ม"},{"title":"ลดรายได้จากร้านค้า 150 บาทวันนี้","success":"เมืองสนับสนุนร้านค้าชั่วคราว"}]},"people-green":{"title":"เด็ก ๆ อยากมีที่เล่น","story":"ครอบครัวในเมืองขอให้สร้างสวนเพิ่ม จะได้มีที่พาเด็ก ๆ ไปพักผ่อน","choices":[{"title":"สร้างสวนเริ่มต้น 3 แห่ง","success":"เปิดสวนครบตามข้อตกลง","failure":"สร้างสวนไม่ครบ"},{"title":"จัดกิจกรรมชุมชน","success":"ประชาชนชื่นชมกิจกรรม"},{"title":"ไม่อนุมัติ","success":"ชุมชนผิดหวัง"},{"title":"ขออาสาสมัครร่วมดูแลพื้นที่เดิม","success":"ชุมชนร่วมจัดพื้นที่กิจกรรม แต่เจ้าของกิจการบางส่วนรู้สึกว่าต้องรับภาระเพิ่ม"},{"title":"ลดรายได้จากสวน 100 บาทวันนี้","success":"ประชาชนพอใจกับมาตรการ"}]},"people-jobs":{"title":"ชาวเมืองกำลังหางาน","story":"คนที่ยังไม่มีงานทำอยากให้เมืองเพิ่มสถานที่ทำงาน","choices":[{"title":"สร้างสำนักงานเริ่มต้น 3 แห่ง","success":"เพิ่มสถานที่ทำงานสำเร็จ","failure":"สร้างสำนักงานไม่ครบ"},{"title":"สนับสนุนค่าเดินทาง","success":"คนทำงานได้รับความช่วยเหลือ"},{"title":"ปฏิเสธ","success":"ประชาชนชะลอการย้ายเข้า"},{"title":"ขอภาคธุรกิจช่วยรับฟังความต้องการงาน","success":"ภาคธุรกิจร่วมประสาน แต่เจ้าของกิจการบางส่วนรู้สึกว่าต้องรับภาระเพิ่ม"},{"title":"ลดรายได้จากทริปไปสำนักงาน 100 บาทวันนี้","success":"คนทำงานได้รับมาตรการชั่วคราว"}]},"people-night-noise":{"title":"เสียงเพลงดังถึงบ้าน","story":"ชาวบ้านบ่นว่าเสียงจากผับดังจนรบกวนเวลานอน","choices":[{"title":"ลดรายได้จากผับ 200 บาทวันนี้","success":"ชุมชนพอใจการประนีประนอม"},{"title":"ใช้เงินช่วยแก้ปัญหาชุมชน","success":"ข้อร้องเรียนลดลง"},{"title":"ยืนยันนโยบายเดิม","success":"กลุ่มเจ้าของผับพอใจแต่ชุมชนไม่พอใจ"},{"title":"ไกล่เกลี่ยกับสมาคมผับโดยตรง","success":"ผู้ประกอบการยอมร่วมแก้คำร้องเรียน แต่เจ้าของกิจการบางส่วนรู้สึกว่าต้องรับภาระเพิ่ม"},{"title":"ขู่กลุ่มผู้ร้องเรียนให้หยุดประท้วง","success":"กลุ่มผู้ร้องเรียนยุติการประท้วง","failure":"คำขู่ถูกเผยแพร่ต่อสาธารณะ"}]},"people-casino":{"title":"ชาวบ้านไม่เห็นด้วยกับคาสิโน","story":"คนในชุมชนขอให้นายกทบทวนสิทธิพิเศษและการช่วยเหลือคาสิโน","choices":[{"title":"ลดรายได้คาสิโน 250 บาทวันนี้","success":"ประชาชนพอใจที่เมืองทบทวนนโยบาย"},{"title":"ช่วยเหลืองบชุมชน","success":"ประชาชนยอมรับมาตรการบางส่วน"},{"title":"ยืนยันข้อตกลงกับธุรกิจ","success":"ชุมชนไม่พอใจ"},{"title":"ขอให้รัฐบาลช่วยตรวจเรื่องร้องเรียน","success":"รัฐบาลส่งคนกลางให้ แต่เจ้าของกิจการบางส่วนรู้สึกว่าต้องรับภาระเพิ่ม"},{"title":"กล่าวว่าผู้ประท้วงบิดเบือนข้อมูล","success":"การประท้วงยุติลง","failure":"ชุมชนรวมตัวต่อต้านหนักขึ้น"}]},"people-fairness":{"title":"อยากให้เมืองดูแลทุกคน","story":"ชาวเมืองขอให้นายกแบ่งเงินช่วยเหลืออย่างเป็นธรรม ไม่ให้ใครได้เปรียบ","choices":[{"title":"เปิดประชุมรับฟัง","success":"ข้อเรียกร้องได้รับการพิจารณา"},{"title":"เจรจาผ่านตัวแทนชุมชน","success":"ตัวแทนยอมรับข้อตกลง แต่เจ้าของกิจการบางส่วนรู้สึกว่าต้องรับภาระเพิ่ม"},{"title":"ขู่งดงบชุมชน","success":"ตัวแทนยอมถอย","failure":"เกิดกระแสต่อต้าน"},{"title":"เปิดรายการใช้งบให้ชุมชนตรวจสอบ","success":"ชุมชนพอใจความโปร่งใส แต่เจ้าของกิจการบางส่วนรู้สึกว่าต้องรับภาระเพิ่ม"},{"title":"จ้างคนกลางมาฟังปัญหาจากทุกฝ่าย","success":"ข้อร้องเรียนได้รับการรับฟัง"}]},"people-commute":{"title":"อยากไปทำงานทันเวลา","story":"คนทำงานขอให้นายกช่วยแก้ปัญหาการเดินทางภายในวันนี้","choices":[{"title":"ทำภารกิจเดินทางให้สำเร็จอย่างน้อย 80% วันนี้","success":"เมืองทำตามคำมั่นสำเร็จ","failure":"แก้ปัญหาไม่สำเร็จ"},{"title":"ช่วยเหลือค่าเดินทาง","success":"ประชาชนได้รับความช่วยเหลือ"},{"title":"เพิกเฉย","success":"ประชาชนไม่พอใจ"},{"title":"ให้ผู้แทนแรงงานและธุรกิจร่วมเจรจา","success":"ทั้งสองฝ่ายยอมรับการประสานงาน แต่เจ้าของกิจการบางส่วนรู้สึกว่าต้องรับภาระเพิ่ม"},{"title":"ลดรายได้จากทริปทั้งหมด 100 บาทวันนี้","success":"เมืองยอมลดการจัดเก็บชั่วคราว"}]},"people-family":{"title":"ค่าใช้จ่ายลูก ๆ เพิ่มขึ้น","story":"หลายครอบครัวขอให้เมืองช่วยออกค่าใช้จ่ายสำหรับกิจกรรมของเด็ก","choices":[{"title":"อนุมัติงบเต็มจำนวน","success":"ครอบครัวได้รับการช่วยเหลือ"},{"title":"ช่วยเหลือเฉพาะส่วนจำเป็น","success":"ได้รับการตอบรับบางส่วน"},{"title":"ปฏิเสธ","success":"ประชาชนผิดหวัง"},{"title":"ขอผู้ประกอบการช่วยสนับสนุนกิจกรรมเด็ก","success":"ผู้ประกอบการร่วมช่วยโดยไม่ใช้เงินเมือง แต่เจ้าของกิจการบางส่วนรู้สึกว่าต้องรับภาระเพิ่ม"},{"title":"รับปากจัดเงินช่วยเหลือโดยไม่อนุมัติงบ","success":"ครอบครัวยอมรับการชี้แจง","failure":"ครอบครัวไม่พอใจที่ไม่ได้รับความช่วยเหลือ"}]},"people-petition":{"title":"จดหมายจากคนที่อยากย้ายมา","story":"คนที่สนใจย้ายเข้าเมืองอยากให้เราเพิ่มบ้านและสิ่งอำนวยความสะดวก","choices":[{"title":"สร้างบ้านเริ่มต้น 2 หลัง","success":"เพิ่มบ้านรองรับตามคำขอ","failure":"สร้างบ้านไม่ครบ"},{"title":"เปิดรับฟังความต้องการ","success":"ผู้สมัครพอใจการสื่อสาร"},{"title":"ไม่ตอบรับ","success":"ผู้สมัครชะลอการย้ายเข้า"},{"title":"ขอตัวแทนชุมชนช่วยดูแลผู้สมัคร","success":"ตัวแทนร่วมประสานโดยไม่ใช้เงินเมือง แต่เจ้าของกิจการบางส่วนรู้สึกว่าต้องรับภาระเพิ่ม"},{"title":"เปิดจุดรับคำปรึกษาที่อยู่อาศัย","success":"ผู้สมัครได้รับคำแนะนำ"}]},"people-recreation":{"title":"วันหยุดอยากมีอะไรทำ","story":"ชาวเมืองขอให้จัดกิจกรรมพักผ่อนสนุก ๆ ในวันนี้","choices":[{"title":"สนับสนุนกิจกรรม","success":"ประชาชนได้รับความสุขจากกิจกรรม"},{"title":"ขอผู้สนับสนุน","success":"กิจกรรมเกิดขึ้นโดยไม่ใช้เงินเมือง"},{"title":"ไม่จัดกิจกรรม","success":"ไม่มีผลกระทบ"},{"title":"ให้ชุมชนเป็นผู้จัดกิจกรรมเอง","success":"ชุมชนช่วยจัดงานโดยไม่ใช้เงินเมือง แต่เจ้าของกิจการบางส่วนรู้สึกว่าต้องรับภาระเพิ่ม"},{"title":"รับผู้สนับสนุนที่ขอพื้นที่โฆษณาเพิ่ม","success":"คลังได้เงินแต่ผู้ร่วมงานบางส่วนไม่พอใจ"},{"title":"รับเงินสมทบ 600,000 บาทจากมูลนิธิ ให้ทุกชุมชนเข้าร่วมกิจกรรมได้","success":"มูลนิธิสนับสนุนโดยไม่จำกัดผู้เข้าร่วม ครอบครัวในหลายชุมชนเข้าถึงกิจกรรมได้อย่างเท่าเทียมและแสดงความพอใจ"}]},"people-complaint":{"title":"เรื่องร้องเรียนเต็มกล่อง","story":"ชาวเมืองส่งเรื่องร้องเรียนเข้ามามาก และอยากให้นายกตอบว่าจะแก้อย่างไร","choices":[{"title":"ตั้งเวทีแก้ปัญหา","success":"ชุมชนยินดีที่นายกรับฟัง"},{"title":"รับปากติดตามเรื่อง","success":"ตัวแทนยอมรับคำตอบ"},{"title":"ประกาศปิดกล่องร้องเรียน","success":"คำร้องหยุดลง","failure":"ประชาชนต่อต้านหนักขึ้น"},{"title":"เปิดข้อมูลคำร้องให้ตัวแทนชุมชนตรวจสอบ","success":"ชุมชนเห็นความคืบหน้า แต่เจ้าของกิจการบางส่วนรู้สึกว่าต้องรับภาระเพิ่ม"},{"title":"เพิ่มช่องทางร้องเรียนผ่านคนกลาง","success":"ประชาชนได้รับช่องทางสื่อสารเพิ่มเติม"},{"title":"รับเงินสมทบระบบรับเรื่องร้องเรียน 300,000 บาทจากองค์กรสาธารณประโยชน์","success":"องค์กรสนับสนุนเงินโดยไม่เข้าถึงข้อมูลร้องเรียนหรือกำหนดลำดับคิว ระบบบริการยังทำงานตามเดิมและไม่มีคะแนนเปลี่ยนแปลง"}]},"business-association-shop":{"title":"เจ้าของร้านค้าขอความช่วยเหลือ","story":"เจ้าของร้านค้าขอให้เมืองลดรายได้จากทริปไปร้านค้าในวันนี้ หรือสร้างร้านค้าเพิ่มเพื่อรองรับคนในเมือง","choices":[{"title":"เจรจาลดรายได้เพียง 100 บาท","success":"สมาคมยอมรับข้อเสนอ แต่ชาวบ้านบางส่วนรู้สึกว่าเมืองเข้าข้างเจ้าของกิจการ"},{"title":"สร้างร้านค้าเริ่มต้น 2 แห่ง","success":"สร้างสถานที่เพิ่มตามสัญญา","failure":"ทำตามข้อตกลงไม่สำเร็จ"},{"title":"ยอมลดรายได้ลง 300 บาทวันนี้","success":"สมาคมเลิกเรียกร้อง แต่ชาวบ้านบางส่วนรู้สึกว่าเมืองเข้าข้างเจ้าของกิจการ"},{"title":"ขู่ว่าจะรื้อร้านค้าเริ่มต้น 2 แห่ง","success":"กลุ่มผู้ประกอบการยอมถอนคำร้อง","failure":"ผู้ประกอบการเปิดเผยคำข่มขู่"},{"title":"ปฏิเสธ","success":"เจ้าของกิจการไม่พอใจ"}]},"business-association-mall":{"title":"เจ้าของห้างขอความช่วยเหลือ","story":"เจ้าของห้างขอให้เมืองลดรายได้จากทริปไปห้างในวันนี้ หรือสร้างห้างเพิ่มเพื่อรองรับคนในเมือง","choices":[{"title":"เจรจาลดรายได้เพียง 100 บาท","success":"สมาคมยอมรับข้อเสนอ แต่ชาวบ้านบางส่วนรู้สึกว่าเมืองเข้าข้างเจ้าของกิจการ"},{"title":"สร้างห้างเริ่มต้น 2 แห่ง","success":"สร้างสถานที่เพิ่มตามสัญญา","failure":"ทำตามข้อตกลงไม่สำเร็จ"},{"title":"ยอมลดรายได้ลง 300 บาทวันนี้","success":"สมาคมเลิกเรียกร้อง แต่ชาวบ้านบางส่วนรู้สึกว่าเมืองเข้าข้างเจ้าของกิจการ"},{"title":"ขู่ว่าจะรื้อห้างเริ่มต้น 2 แห่ง","success":"กลุ่มผู้ประกอบการยอมถอนคำร้อง","failure":"ผู้ประกอบการเปิดเผยคำข่มขู่"},{"title":"ปฏิเสธ","success":"เจ้าของกิจการไม่พอใจ"}]},"business-association-office":{"title":"เจ้าของสำนักงานขอความช่วยเหลือ","story":"เจ้าของสำนักงานขอให้เมืองลดรายได้จากทริปไปสำนักงานในวันนี้ หรือสร้างสำนักงานเพิ่มเพื่อรองรับคนในเมือง","choices":[{"title":"เจรจาลดรายได้เพียง 100 บาท","success":"สมาคมยอมรับข้อเสนอ แต่ชาวบ้านบางส่วนรู้สึกว่าเมืองเข้าข้างเจ้าของกิจการ"},{"title":"สร้างสำนักงานเริ่มต้น 2 แห่ง","success":"สร้างสถานที่เพิ่มตามสัญญา","failure":"ทำตามข้อตกลงไม่สำเร็จ"},{"title":"ยอมลดรายได้ลง 300 บาทวันนี้","success":"สมาคมเลิกเรียกร้อง แต่ชาวบ้านบางส่วนรู้สึกว่าเมืองเข้าข้างเจ้าของกิจการ"},{"title":"ขู่ว่าจะรื้อสำนักงานเริ่มต้น 2 แห่ง","success":"กลุ่มผู้ประกอบการยอมถอนคำร้อง","failure":"ผู้ประกอบการเปิดเผยคำข่มขู่"},{"title":"ปฏิเสธ","success":"เจ้าของกิจการไม่พอใจ"}]},"business-association-factory":{"title":"เจ้าของโรงงานขอความช่วยเหลือ","story":"เจ้าของโรงงานขอให้เมืองลดรายได้จากทริปไปโรงงานในวันนี้ หรือสร้างโรงงานเพิ่มเพื่อรองรับคนในเมือง","choices":[{"title":"เจรจาลดรายได้เพียง 100 บาท","success":"สมาคมยอมรับข้อเสนอ แต่ชาวบ้านบางส่วนรู้สึกว่าเมืองเข้าข้างเจ้าของกิจการ"},{"title":"สร้างโรงงานเริ่มต้น 2 แห่ง","success":"สร้างสถานที่เพิ่มตามสัญญา","failure":"ทำตามข้อตกลงไม่สำเร็จ"},{"title":"ยอมลดรายได้ลง 300 บาทวันนี้","success":"สมาคมเลิกเรียกร้อง แต่ชาวบ้านบางส่วนรู้สึกว่าเมืองเข้าข้างเจ้าของกิจการ"},{"title":"ขู่ว่าจะรื้อโรงงานเริ่มต้น 2 แห่ง","success":"กลุ่มผู้ประกอบการยอมถอนคำร้อง","failure":"ผู้ประกอบการเปิดเผยคำข่มขู่"},{"title":"ปฏิเสธ","success":"เจ้าของกิจการไม่พอใจ"}]},"business-association-casino":{"title":"เจ้าของคาสิโนขอความช่วยเหลือ","story":"เจ้าของคาสิโนขอให้เมืองลดรายได้จากทริปไปคาสิโนในวันนี้ หรือสร้างคาสิโนเพิ่มเพื่อรองรับคนในเมือง","choices":[{"title":"เจรจาลดรายได้เพียง 100 บาท","success":"สมาคมยอมรับข้อเสนอ แต่ชาวบ้านบางส่วนรู้สึกว่าเมืองเข้าข้างเจ้าของกิจการ"},{"title":"สร้างคาสิโนเริ่มต้น 1 แห่ง","success":"สร้างสถานที่เพิ่มตามสัญญา","failure":"ทำตามข้อตกลงไม่สำเร็จ"},{"title":"ยอมลดรายได้ลง 300 บาทวันนี้","success":"สมาคมเลิกเรียกร้อง แต่ชาวบ้านบางส่วนรู้สึกว่าเมืองเข้าข้างเจ้าของกิจการ"},{"title":"ขู่ว่าจะรื้อคาสิโนเริ่มต้น 1 แห่ง","success":"กลุ่มผู้ประกอบการยอมถอนคำร้อง","failure":"ผู้ประกอบการเปิดเผยคำข่มขู่"},{"title":"ปฏิเสธ","success":"เจ้าของกิจการไม่พอใจ"}]},"business-association-hotel":{"title":"เจ้าของโรงแรมขอความช่วยเหลือ","story":"เจ้าของโรงแรมขอให้เมืองลดรายได้จากทริปไปโรงแรมในวันนี้ หรือสร้างโรงแรมเพิ่มเพื่อรองรับคนในเมือง","choices":[{"title":"เจรจาลดรายได้เพียง 100 บาท","success":"สมาคมยอมรับข้อเสนอ แต่ชาวบ้านบางส่วนรู้สึกว่าเมืองเข้าข้างเจ้าของกิจการ"},{"title":"สร้างโรงแรมเริ่มต้น 2 แห่ง","success":"สร้างสถานที่เพิ่มตามสัญญา","failure":"ทำตามข้อตกลงไม่สำเร็จ"},{"title":"ยอมลดรายได้ลง 300 บาทวันนี้","success":"สมาคมเลิกเรียกร้อง แต่ชาวบ้านบางส่วนรู้สึกว่าเมืองเข้าข้างเจ้าของกิจการ"},{"title":"ขู่ว่าจะรื้อโรงแรมเริ่มต้น 2 แห่ง","success":"กลุ่มผู้ประกอบการยอมถอนคำร้อง","failure":"ผู้ประกอบการเปิดเผยคำข่มขู่"},{"title":"ปฏิเสธ","success":"เจ้าของกิจการไม่พอใจ"}]},"business-association-park":{"title":"เจ้าของสวนขอความช่วยเหลือ","story":"เจ้าของสวนขอให้เมืองลดรายได้จากทริปไปสวนในวันนี้ หรือสร้างสวนเพิ่มเพื่อรองรับคนในเมือง","choices":[{"title":"เจรจาลดรายได้เพียง 100 บาท","success":"สมาคมยอมรับข้อเสนอ แต่ชาวบ้านบางส่วนรู้สึกว่าเมืองเข้าข้างเจ้าของกิจการ"},{"title":"สร้างสวนเริ่มต้น 2 แห่ง","success":"สร้างสถานที่เพิ่มตามสัญญา","failure":"ทำตามข้อตกลงไม่สำเร็จ"},{"title":"ยอมลดรายได้ลง 300 บาทวันนี้","success":"สมาคมเลิกเรียกร้อง แต่ชาวบ้านบางส่วนรู้สึกว่าเมืองเข้าข้างเจ้าของกิจการ"},{"title":"ขู่ว่าจะรื้อสวนเริ่มต้น 2 แห่ง","success":"กลุ่มผู้ประกอบการยอมถอนคำร้อง","failure":"ผู้ประกอบการเปิดเผยคำข่มขู่"},{"title":"ปฏิเสธ","success":"เจ้าของกิจการไม่พอใจ"}]},"business-food-cost":{"title":"วัตถุดิบทำอาหารแพงขึ้น","story":"เจ้าของร้านอาหารบ่นว่าต้นทุนสูงขึ้น ขอให้เมืองช่วยลดภาระเฉพาะวันนี้","choices":[{"title":"จ่ายเงินช่วยเหลือ","success":"สมาคมยอมถอนคำร้อง"},{"title":"ลดรายได้ร้านอาหาร 150 บาท","success":"เมืองลดการจัดเก็บตามข้อตกลง"},{"title":"ไม่ช่วย","success":"ผู้ประกอบการผิดหวัง"},{"title":"ขอให้รัฐบาลช่วยเจรจา","success":"รัฐบาลช่วยเจรจากับสมาคม แต่ชาวบ้านบางส่วนรู้สึกว่าเมืองเข้าข้างเจ้าของกิจการ"},{"title":"ขู่ว่าจะไม่รับข้อเรียกร้องอีก","success":"สมาคมเลิกร้องเรียน","failure":"สมาคมวิจารณ์นโยบายของเมือง"},{"title":"รับ 1,600,000 บาทจากผู้ค้าส่ง แลกกับการแนะนำร้านอาหารให้ซื้อวัตถุดิบจากรายเดียว","success":"ร้านอาหารหลายร้านพบว่าราคาและเงื่อนไขซื้อขายไม่เหมาะกับตน คู่แข่งร้องเรียนเรื่องการปิดกั้นตลาด และประชาชนกังวลว่าต้นทุนจะถูกส่งต่อมายังราคาอาหาร"}]},"business-mall-sponsor":{"title":"ห้างอยากจัดงานลดราคา","story":"เจ้าของห้างขอให้นายกช่วยสนับสนุนงานลดราคาครั้งใหญ่","choices":[{"title":"สนับสนุนการจัดงาน","success":"ห้างมีรายได้ภารกิจเพิ่มวันนี้"},{"title":"ขอผู้จัดออกค่าใช้จ่าย","success":"ผู้จัดยอมรับภาระค่าใช้จ่าย แต่ชาวบ้านบางส่วนรู้สึกว่าเมืองเข้าข้างเจ้าของกิจการ"},{"title":"ไม่จัดงาน","success":"ไม่มีผล"},{"title":"ขอรัฐบาลช่วยประชาสัมพันธ์งาน","success":"รัฐบาลช่วยโปรโมตงาน แต่ชาวบ้านบางส่วนรู้สึกว่าเมืองเข้าข้างเจ้าของกิจการ"},{"title":"ให้ห้างซื้อสิทธิ์ประชาสัมพันธ์ในวันนี้","success":"เมืองได้รับเงินสนับสนุน"},{"title":"รับ 850,000 บาทเป็นค่าธรรมเนียมจัดงานตามระเบียบเดียวกับผู้จัดรายอื่น","success":"ผู้จัดงานจ่ายค่าธรรมเนียมตามประกาศที่ทุกกิจการเข้าถึงได้ ผู้ประกอบการพอใจที่กติกาชัดเจนและไม่มีข้อร้องเรียนเรื่องสิทธิพิเศษ"}]},"business-night-event":{"title":"คืนนี้มีดนตรีสด","story":"เจ้าของผับอยากจัดงานดนตรี และขอให้เมืองช่วยโปรโมต","choices":[{"title":"รับการสนับสนุนจากเจ้าของผับ","success":"เมืองได้รับเงินและโปรโมตผับ"},{"title":"สนับสนุนงานแบบประหยัด","success":"งานได้รับความสนใจ"},{"title":"ไม่สนับสนุน","success":"เจ้าของผับผิดหวัง"},{"title":"ให้ชุมชนร่วมกำหนดเงื่อนไขงาน","success":"ชุมชนยอมรับการประสานงาน แต่ชาวบ้านบางส่วนรู้สึกว่าเมืองเข้าข้างเจ้าของกิจการ"},{"title":"เรียกเงินสนับสนุนเพิ่มจากผู้จัด","success":"ผู้จัดตกลงโอนเพิ่ม","failure":"ผู้จัดถอนข้อเสนอและวิจารณ์เมือง"}]},"business-casino-deal":{"title":"ข้อเสนอจากเจ้าของคาสิโน","story":"เจ้าของคาสิโนอยากให้เมืองช่วยเพิ่มรายได้ของคาสิโนในวันนี้","choices":[{"title":"รับข้อเสนออย่างเปิดเผย","success":"เมืองได้รับเงินสนับสนุน"},{"title":"เจรจาข้อตกลงทั่วไป","success":"กลุ่มทุนสนับสนุนเมืองโดยเปิดเผย"},{"title":"ปฏิเสธ","success":"กลุ่มทุนถอนตัว"},{"title":"ขอรัฐบาลร่วมตรวจเงื่อนไขก่อนรับข้อเสนอ","success":"ข้อตกลงได้รับการพิจารณาอย่างเปิดเผย แต่ชาวบ้านบางส่วนรู้สึกว่าเมืองเข้าข้างเจ้าของกิจการ"},{"title":"ขอเงินเพิ่มแลกกับการประชาสัมพันธ์เฉพาะกลุ่ม","success":"กลุ่มทุนตกลงเพิ่มเงิน","failure":"ข้อเสนอถูกเปิดเผยและถูกวิจารณ์"}]},"business-invest-office":{"title":"บริษัทใหม่อยากมาเปิดสำนักงาน","story":"นักลงทุนพร้อมช่วยออกเงิน หากเมืองสร้างสำนักงานเพิ่มได้ทันเวลา","choices":[{"title":"รับเงิน 60,000 บาท สร้างสำนักงานเริ่มต้น 3 แห่ง","success":"บริษัทรับมอบพื้นที่สำนักงาน","failure":"ไม่สามารถส่งมอบพื้นที่"},{"title":"ปฏิเสธข้อเสนอ","success":"นักลงทุนไปเมืองอื่น"},{"title":"จัดประชุมเพื่อรักษาความสัมพันธ์","success":"นักลงทุนรับทราบแผนในอนาคต"},{"title":"ขอให้รัฐบาลช่วยติดต่อนักลงทุน","success":"นักลงทุนพอใจการเจรจา แต่ชาวบ้านบางส่วนรู้สึกว่าเมืองเข้าข้างเจ้าของกิจการ"},{"title":"แจ้งข้อจำกัดการก่อสร้างตรงไปตรงมา","success":"นักลงทุนรับทราบเงื่อนไขเมือง"}]},"business-monopoly":{"title":"ห้างใหญ่ขอสิทธิพิเศษ","story":"เจ้าของห้างเสนอเงินให้เมือง แลกกับการลดการช่วยเหลือร้านค้ารายย่อย","choices":[{"title":"รับเงินตามข้อเสนอ","success":"เงินเข้าคลังแต่ร้านค้ารายย่อยเสียประโยชน์"},{"title":"เจรจาไม่ผูกขาด","success":"กลุ่มทุนตกลงสนับสนุนเมือง"},{"title":"ปฏิเสธ","success":"รักษาความเป็นธรรมแก่ร้านค้า"},{"title":"ให้รัฐบาลร่วมตรวจข้อเสนอ","success":"มีการหารือเงื่อนไขโดยเปิดเผย แต่ชาวบ้านบางส่วนรู้สึกว่าเมืองเข้าข้างเจ้าของกิจการ"},{"title":"เรียกเงินเพิ่มแลกสิทธิ์ประชาสัมพันธ์","success":"ผู้ค้ารายใหญ่ตกลงจ่ายเพิ่ม","failure":"ผู้ค้ารายย่อยเปิดเผยการต่อรอง"}]},"integrity-gift-supplier":{"title":"ของขวัญจากบริษัทก่อสร้าง","story":"บริษัทก่อสร้างเสนอเงินให้เมือง โดยขอให้เราให้ความสำคัญกับบริษัทเป็นพิเศษ","choices":[{"title":"รับเงินนอกข้อตกลง","success":"เงินเข้าคลังโดยมีประวัติผลประโยชน์"},{"title":"รับเฉพาะเงินบริจาคเปิดเผย","success":"เอกสารถูกเปิดเผยต่อสาธารณะ แต่ทีมงานต้องใช้เวลาเพิ่มในการตรวจสอบ"},{"title":"ส่งคืนทั้งหมด","success":"เทศบาลปฏิเสธผลประโยชน์ แต่ทีมงานต้องใช้เวลาเพิ่มในการตรวจสอบ"},{"title":"ขอให้รัฐบาลยืนยันว่าการปฏิเสธถูกต้อง","success":"เจ้าหน้าที่รัฐบาลร่วมตรวจสอบ แต่ทีมงานต้องใช้เวลาเพิ่มในการตรวจสอบ"},{"title":"ขอเปลี่ยนเป็นเงินสนับสนุนโดยไม่ลงรายชื่อ","success":"ผู้ให้โอนเงิน","failure":"รายละเอียดผู้ให้ถูกเปิดเผย"}]},"integrity-contract":{"title":"สัญญาที่ดูน่าสงสัย","story":"ฝ่ายกฎหมายพบว่าสัญญาฉบับหนึ่งอาจให้สิทธิพิเศษกับบริษัทมากเกินไป","choices":[{"title":"จ้างตรวจสัญญา","success":"ข้อกำหนดที่ไม่เป็นธรรมถูกทบทวน"},{"title":"ขอทีมกฎหมายรัฐบาล","success":"รัฐบาลช่วยตรวจสัญญา แต่ทีมงานต้องใช้เวลาเพิ่มในการตรวจสอบ"},{"title":"อนุมัติตามเดิม","success":"เมืองได้รับเงินแต่เสียความโปร่งใส"},{"title":"ให้คณะกรรมการประชาชนร่วมอ่านสัญญา","success":"ตัวแทนชุมชนร่วมตรวจเอกสาร แต่ทีมงานต้องใช้เวลาเพิ่มในการตรวจสอบ"},{"title":"ระงับสัญญาจนกว่าจะชี้แจงได้","success":"เมืองยังไม่รับข้อผูกพัน"},{"title":"รับค่าชดเชย 2,000,000 บาท แลกกับการยอมใช้ข้อความในสัญญาฉบับเดิม","success":"เมืองได้เงินทันที แต่ฝ่ายกฎหมายพบว่าข้อความเดิมเปิดทางให้คู่สัญญาได้เปรียบ ผู้ประกอบการอื่นคัดค้าน และฝ่ายบริหารต้องเสียเวลาทบทวนสัญญา"}]},"integrity-relative":{"title":"ญาติมาขอให้ช่วยธุรกิจ","story":"ญาติของนายกอยากให้เมืองช่วยกิจการของเขา โดยไม่ต้องผ่านขั้นตอนตามปกติ","choices":[{"title":"อนุมัติผลประโยชน์","success":"คลังได้รับเงินสนับสนุนที่ไม่โปร่งใส"},{"title":"เปิดให้พิจารณาตามปกติ","success":"ทุกฝ่ายได้รับเงื่อนไขเท่าเทียม แต่ทีมงานต้องใช้เวลาเพิ่มในการตรวจสอบ"},{"title":"ปฏิเสธ","success":"ไม่เกิดข้อตกลง"},{"title":"ขอรัฐบาลส่งผู้ประเมินอิสระ","success":"ส่วนกลางช่วยพิจารณาคำขอ แต่ทีมงานต้องใช้เวลาเพิ่มในการตรวจสอบ"},{"title":"ให้ญาติได้รับสิทธิ์โดยไม่เปิดเผย","success":"ข้อตกลงผ่านไปโดยไม่มีข่าว","failure":"หลักฐานความสัมพันธ์ถูกเปิดเผย"}]},"integrity-documents":{"title":"เอกสารการใช้เงินหาย","story":"เจ้าหน้าที่พบว่าเอกสารค่าใช้จ่ายบางรายการหายไป ขอให้นายกช่วยตัดสินใจ","choices":[{"title":"ตรวจสอบโดยเปิดเผย","success":"เอกสารได้รับการตรวจสอบ"},{"title":"เปิดเผยเอกสารที่มี","success":"ประชาชนได้ข้อมูลบางส่วน"},{"title":"ปล่อยเรื่องผ่านไป","success":"พบเอกสารภายหลัง","failure":"หน่วยงานตรวจสอบตั้งข้อสงสัย"},{"title":"ขอรัฐบาลส่งสำเนาเอกสารที่เกี่ยวข้อง","success":"ได้รับเอกสารยืนยันจากรัฐบาล แต่ทีมงานต้องใช้เวลาเพิ่มในการตรวจสอบ"},{"title":"พักการอนุมัติรายการที่เอกสารไม่ครบ","success":"เมืองไม่อนุมัติรายการที่ตรวจสอบไม่ได้"}]},"integrity-public-ledger":{"title":"สื่ออยากดูบัญชีเมือง","story":"นักข่าวขอให้เมืองเปิดเผยว่าได้รับเงินจากไหนและจ่ายเงินไปกับอะไร","choices":[{"title":"เผยแพร่ข้อมูลทั้งหมด","success":"สื่อได้รับข้อมูลตามคำขอ แต่ทีมงานต้องใช้เวลาเพิ่มในการตรวจสอบ"},{"title":"จ้างผู้ตรวจสอบอิสระ","success":"งบได้รับการตรวจสอบอย่างเป็นทางการ"},{"title":"ไม่เปิดเผย","success":"ความน่าเชื่อถือลดลง"},{"title":"เชิญตัวแทนชุมชนตรวจบัญชี","success":"ชุมชนได้ตรวจข้อมูลโดยไม่ใช้เงินเมือง แต่ทีมงานต้องใช้เวลาเพิ่มในการตรวจสอบ"},{"title":"เผยแพร่เฉพาะรายการที่ตรวจง่าย","success":"การเผยแพร่ไม่มีข้อทักท้วง","failure":"สื่อพบรายการที่ไม่เปิดเผย"},{"title":"รับทุนสนับสนุนระบบบัญชีเปิด 550,000 บาทและเปิดเผยผู้ให้ทุน","success":"แหล่งที่มาของเงินและเงื่อนไขปรากฏในทะเบียนสาธารณะ ผู้ตรวจสอบยืนยันว่าไม่มีสิทธิแทรกแซงข้อมูล ความเชื่อถือด้านความโปร่งใสจึงเพิ่มขึ้น"}]},"integrity-donation":{"title":"ผู้บริจาคไม่ยอมบอกชื่อ","story":"มีคนติดต่อขอโอนเงินให้เมือง แต่ไม่ต้องการเปิดเผยตัวตน","choices":[{"title":"รับเงินโดยไม่ตรวจสอบ","success":"เงินเข้าคลังแต่ไม่ทราบที่มา"},{"title":"ตรวจสอบและรับเงินอย่างเปิดเผย","success":"ตรวจสอบแหล่งเงินแล้ว"},{"title":"ปฏิเสธเงิน","success":"เงินถูกส่งคืน"},{"title":"ขอรัฐบาลตรวจแหล่งที่มาให้","success":"เจ้าหน้าที่ตรวจสอบและรับรองผู้ให้ แต่ทีมงานต้องใช้เวลาเพิ่มในการตรวจสอบ"},{"title":"ขอเงินเพิ่มโดยยอมไม่เปิดเผยชื่อ","success":"ผู้บริจาคโอนเพิ่ม","failure":"มีการเปิดเผยการต่อรอง"}]},"integrity-secret-deal":{"title":"คนมีอิทธิพลส่งคนมาคุย","story":"ตัวแทนเสนอเงินให้เมือง แลกกับการได้รับสิทธิพิเศษ","choices":[{"title":"ยอมรับข้อเสนอ","success":"เงินเข้าคลังและเกิดพันธะทางการเมือง"},{"title":"เปลี่ยนเป็นสัญญาเปิดเผย","success":"กลุ่มทุนยอมลดวงเงิน แต่ทีมงานต้องใช้เวลาเพิ่มในการตรวจสอบ"},{"title":"ปฏิเสธ","success":"ข้อตกลงไม่เกิดขึ้น"},{"title":"ส่งข้อเสนอให้คณะตรวจสอบ","success":"เจ้าหน้าที่รับเรื่องตรวจสอบ"},{"title":"ขอเงื่อนไขเพิ่มเติมโดยไม่เปิดเผย","success":"ตัวแทนยอมเพิ่มเงิน","failure":"ตัวแทนเปิดเผยการต่อรอง"}]},"integrity-clerk":{"title":"เจ้าหน้าที่ขอแบ่งเงิน","story":"พบว่าเจ้าหน้าที่คนหนึ่งเสนอแบ่งผลประโยชน์ให้ แลกกับการตัดสินใจของนายก","choices":[{"title":"ตั้งคณะสอบสวน","success":"การตรวจสอบเริ่มดำเนินการ"},{"title":"เรียกคืนเงิน","success":"เงินกลับเข้าคลัง"},{"title":"ยุติเรื่องแลกเงินเข้าคลัง","success":"เทศบาลรับเงินแต่ความโปร่งใสลดลง"},{"title":"ขอรัฐบาลส่งผู้สอบสวน","success":"รัฐบาลส่งเจ้าหน้าที่มาตรวจสอบ แต่ทีมงานต้องใช้เวลาเพิ่มในการตรวจสอบ"},{"title":"ให้เจ้าหน้าที่ชี้แจงภายในโดยไม่เปิดผล","success":"เรื่องยุติโดยไม่มีข่าว","failure":"ข้อมูลการสอบสวนรั่วไหล"}]},"integrity-tender":{"title":"บริษัทขอแซงคิว","story":"บริษัทที่สนใจประมูลงานของเมืองเสนอข้อแลกเปลี่ยน หากเราให้สิทธิ์พิจารณาบริษัทก่อนคู่แข่ง","choices":[{"title":"พิจารณาตามเกณฑ์เปิดเผย","success":"การพิจารณาดำเนินอย่างเป็นธรรม แต่ทีมงานต้องใช้เวลาเพิ่มในการตรวจสอบ"},{"title":"รับข้อเสนอแลกเงิน","success":"เมืองได้เงินแต่เสียความโปร่งใส"},{"title":"ระงับการพิจารณา","success":"โครงการถูกเลื่อน"},{"title":"ให้ตัวแทนประชาชนร่วมสังเกตการณ์","success":"ขั้นตอนพิจารณาเปิดเผยมากขึ้น แต่ทีมงานต้องใช้เวลาเพิ่มในการตรวจสอบ"},{"title":"ขอเงินเพิ่มจากผู้เสนอสิทธิ์พิเศษ","success":"บริษัทเพิ่มข้อเสนอ","failure":"คู่แข่งเปิดเผยการต่อรอง"}]},"integrity-audit-government":{"title":"รัฐบาลขอตรวจบัญชี","story":"เจ้าหน้าที่จากรัฐบาลขอเข้ามาตรวจสอบบัญชีและการใช้เงินของเมือง","choices":[{"title":"ให้ความร่วมมือเต็มรูปแบบ","success":"การตรวจสอบเสร็จสิ้น"},{"title":"ขอให้ตรวจจากข้อมูลที่มี","success":"ตรวจสอบบางส่วนสำเร็จ"},{"title":"ปฏิเสธการตรวจสอบ","success":"เรื่องตรวจสอบถูกยกเลิก","failure":"รัฐบาลตั้งข้อสงสัยเพิ่มเติม"},{"title":"เปิดเอกสารต่อสาธารณะพร้อมการตรวจ","success":"ส่วนกลางและประชาชนเห็นข้อมูลตรงกัน แต่ทีมงานต้องใช้เวลาเพิ่มในการตรวจสอบ"},{"title":"พักรายการที่ยังตรวจสอบไม่เสร็จ","success":"รายการค้างถูกพักเพื่อรอข้อมูล"},{"title":"รับเงินสนับสนุนการจัดทำเอกสาร 150,000 บาทจากหน่วยงานกลาง","success":"เงินเป็นงบเบิกจ่ายตามระเบียบ ผู้ตรวจสอบยังทำหน้าที่อย่างอิสระและไม่มีการเปลี่ยนแปลงความเชื่อถือของเมือง"}]},"integrity-press-ethics":{"title":"นักข่าวถามเรื่องความเป็นธรรม","story":"นักข่าวถามว่าทำไมผู้สนับสนุนบางรายจึงได้รับสิทธิพิเศษกว่าคนอื่น","choices":[{"title":"ชี้แจงและเปิดเอกสาร","success":"สื่อยอมรับข้อมูล แต่ทีมงานต้องใช้เวลาเพิ่มในการตรวจสอบ"},{"title":"ยอมรับข้อบกพร่อง","success":"ความโปร่งใสเพิ่มขึ้นแต่ภาพลักษณ์เสียหาย"},{"title":"ปฏิเสธทุกข้อกล่าวหา","success":"สื่อไม่มีข้อมูลเพิ่มเติม","failure":"ข้อกล่าวหาถูกขยายผล"},{"title":"ขอรัฐบาลร่วมตอบคำถามต่อสื่อ","success":"รัฐบาลยืนยันขั้นตอนตรวจสอบ แต่ทีมงานต้องใช้เวลาเพิ่มในการตรวจสอบ"},{"title":"จ้างผู้ตรวจสอบอิสระเผยแพร่ผล","success":"สื่อได้รับผลการตรวจสอบ"}]},"integrity-compensation":{"title":"เงินแลกกับการปิดเรื่อง","story":"กลุ่มธุรกิจเสนอเงินให้เมือง หากนายกยอมยุติเรื่องร้องเรียน","choices":[{"title":"รับเงินเพื่อยุติเรื่อง","success":"เมืองได้รับเงินแต่มีประวัติไม่โปร่งใส"},{"title":"เปิดเจรจาสาธารณะ","success":"ข้อพิพาทได้รับการพิจารณา แต่ทีมงานต้องใช้เวลาเพิ่มในการตรวจสอบ"},{"title":"ปฏิเสธ","success":"การร้องเรียนดำเนินตามปกติ"},{"title":"ให้ตัวแทนชุมชนร่วมพิจารณาข้อพิพาท","success":"ตัวแทนร่วมตรวจเงื่อนไข แต่ทีมงานต้องใช้เวลาเพิ่มในการตรวจสอบ"},{"title":"เรียกเงินเพิ่มแลกการยุติเรื่อง","success":"กลุ่มธุรกิจยอมเพิ่มเงิน","failure":"รายละเอียดการต่อรองถูกเปิดเผย"}]},"integrity-ethics":{"title":"กติกาการรับเงินของเมือง","story":"เจ้าหน้าที่อยากกำหนดกติกาใหม่ว่าเงินและของขวัญแบบไหนที่เมืองควรรับ","choices":[{"title":"อนุมัติและเปิดเผย","success":"เมืองได้รับการยอมรับด้านความโปร่งใส"},{"title":"ประกาศแนวทางโดยไม่ใช้เงินเมือง","success":"เจ้าหน้าที่รับทราบแนวปฏิบัติ"},{"title":"ไม่กำหนดกติกา","success":"ภาพลักษณ์ด้านความโปร่งใสลดลง"},{"title":"ขอให้รัฐบาลช่วยรับรองกติกา","success":"รัฐบาลช่วยรับรองแนวทาง แต่ทีมงานต้องใช้เวลาเพิ่มในการตรวจสอบ"},{"title":"ประกาศกติกาโดยยังไม่ได้ตรวจสอบ","success":"ไม่มีผู้ทักท้วง","failure":"เจ้าหน้าที่พบข้อกำหนดที่ไม่เป็นธรรม"}]},"government-liaison-daily":{"title":"รัฐบาลอยากรู้แผนของเรา","story":"รัฐบาลชวนนายกคุยเรื่องแผนพัฒนาและโอกาสได้รับเงินสนับสนุนในอนาคต","choices":[{"title":"ให้ทีมงานเตรียมแผนพัฒนาและติดต่อรัฐบาล","success":"รัฐบาลได้รับแผนและชื่นชมความร่วมมือ"},{"title":"หารือด้วยข้อมูลที่มีอยู่","success":"รัฐบาลยอมรับข้อมูลโดยไม่ต้องใช้งบ แต่ฝ่ายบริหารต้องปรับแผนเพื่อประสานส่วนกลาง"},{"title":"ตอบหนังสือรับทราบโดยไม่ขอรับโครงการ","success":"รัฐบาลรับทราบ เมืองยังไม่มีภาระผูกพัน"},{"title":"ไม่ให้ความร่วมมือ","success":"ส่วนกลางไม่พอใจการปฏิเสธ"},{"title":"เปิดแผนพัฒนาให้ชุมชนร่วมตรวจสอบก่อนส่ง","success":"ส่วนกลางชื่นชมข้อมูลที่เปิดเผย แต่ฝ่ายบริหารต้องปรับแผนเพื่อประสานส่วนกลาง"},{"title":"รับเงินสนับสนุนงานประสานราชการ 200,000 บาทตามสิทธิที่ประกาศ","success":"ส่วนกลางโอนงบตามสิทธิของเทศบาลทุกแห่ง ไม่มีเงื่อนไขพิเศษหรือความขัดแย้งใหม่"}]},"business-new-market-daily":{"title":"ร้านค้าใหม่อยากเข้ามา","story":"กลุ่มคนที่สนใจเปิดร้านค้าอยากรู้ว่าเมืองจะช่วยเหลือธุรกิจอย่างไร ก่อนตัดสินใจลงทุน","choices":[{"title":"จัดงานรับฟังความคิดเห็นผู้สนใจลงทุน","success":"กลุ่มธุรกิจชื่นชมการเปิดรับความคิดเห็น"},{"title":"เจรจาโดยใช้ความสัมพันธ์ที่มีอยู่","success":"ผู้สนใจลงทุนยอมรับแนวทางของเมือง แต่ชาวบ้านบางส่วนรู้สึกว่าเมืองเข้าข้างเจ้าของกิจการ"},{"title":"รับข้อเสนอไว้โดยยังไม่ตกลงใช้เงินเมือง","success":"ผู้ประกอบการได้รับคำตอบและจะพิจารณาแผนของตนต่อไป"},{"title":"ปฏิเสธการเข้าพบ","success":"กลุ่มผู้ประกอบการผิดหวัง"},{"title":"ให้ชุมชนร่วมเจรจาเงื่อนไขการลงทุน","success":"ผู้สนใจลงทุนชื่นชมการมีส่วนร่วม แต่ชาวบ้านบางส่วนรู้สึกว่าเมืองเข้าข้างเจ้าของกิจการ"},{"title":"รับเงินสมทบพัฒนาตลาด 450,000 บาทจากสมาคมการค้าโดยไม่สัญญาสิทธิพิเศษ","success":"เงินเข้าสู่คลังผ่านบัญชีปกติ สมาคมไม่ได้รับสิทธิในการจัดสรรที่ดินหรือใบอนุญาต คะแนนทุกด้านคงเดิม"}]},"night-fire":{"title":"ด่วน! ไฟไหม้ที่ {target}","story":"เจ้าหน้าที่โทรแจ้งว่ามีควันไฟออกจากอาคาร ต้องตัดสินใจทันทีว่าจะส่งทีมไหนเข้าไปช่วย งบฉุกเฉินมีจำกัด","choices":[{"title":"ใช้งบฉุกเฉิน ส่งทีมไปดับไฟ","success":"ทีมประสานงานควบคุมเหตุได้ แต่ต้องโยกงบส่วนอื่น"},{"title":"ขอทีมช่วยเหลือจากจังหวัด","success":"ทีมเสริมมาถึงทัน","failure":"ทีมเสริมมาช้า บริการหยุดชะงัก"},{"title":"ให้เจ้าของอาคารช่วยออกค่าใช้จ่าย","success":"เจ้าหน้าที่จัดการเหตุได้ แต่ผู้ประกอบการไม่พอใจ"},{"title":"ใช้ทีมและงบที่มีอยู่","success":"ทีมเดิมจัดการได้","failure":"ทรัพยากรไม่พอ เมืองเสียค่าประสานงาน"},{"title":"ลงพื้นที่ช่วยประสานงานด้วยตัวเอง","success":"ชุมชนชื่นชม แต่ภารกิจฝ่ายบริหารอื่นล่าช้า"}],"ignored":"ไม่มีคำสั่งทันเวลา ต้องเบิกงบสำรอง"},"night-power":{"title":"ด่วน! ไฟดับที่ {target}","story":"ผู้ดูแลอาคารโทรมาแจ้งว่าไฟดับ บริษัทช่างเจ้าเดิมพร้อมเข้าช่วยทันที หากไม่ต้องรอเทียบราคากับเจ้าอื่น","choices":[{"title":"เรียกทีมช่างตามขั้นตอนปกติ","success":"ประสานงานสำเร็จ แต่เจ้าของกิจการต้องรอ"},{"title":"อนุมัติผู้รับเหมารายเดิมทันที","success":"แก้เหตุได้รวดเร็ว แต่เอกสารถูกทักท้วง"},{"title":"ขอแรงสนับสนุนจากจังหวัด","success":"จังหวัดส่งทีมช่วยทัน","failure":"ทีมไม่พร้อมตามเวลา"},{"title":"ให้ผู้ประกอบการรับผิดชอบเอง","success":"ผู้ประกอบการดำเนินการ แต่ไม่พอใจเมือง"},{"title":"รอประเมินสาเหตุก่อนอนุมัติงบ","success":"ปัญหาแก้ไขได้โดยทีมเดิม","failure":"การรอเพิ่มข้อร้องเรียน"}],"ignored":"ข้อร้องเรียนเพิ่มขึ้นเพราะไม่ได้รับคำตอบ"},"night-road":{"title":"ด่วน! รถเสียบนถนนหลัก","story":"มีรถเสียบนถนนหลัก ทำให้รถติดยาว เจ้าหน้าที่รอคำสั่งว่าจะจัดการคืนนี้อย่างไร","choices":[{"title":"อนุมัติทีมช่วยเหลือฉุกเฉิน","success":"ทีมประสานงานรับมือเหตุได้รวดเร็ว"},{"title":"ขอให้จังหวัดส่งเจ้าหน้าที่","success":"จังหวัดช่วยประสานเหตุ","failure":"ทีมจังหวัดติดภารกิจอื่น"},{"title":"ขอผู้ประกอบการช่วยค่าใช้จ่าย","success":"ได้ความร่วมมือแต่ธุรกิจไม่พอใจ"},{"title":"ประกาศชี้แจงและใช้ทีมที่มีอยู่","success":"ประชาชนพอใจการสื่อสาร แต่ฝ่ายบริหารงานล่าช้า"},{"title":"รอให้การเดินทางเบาบางเอง","success":"ข้อร้องเรียนลดลงเอง","failure":"ปัญหายืดเยื้อและเสียงวิจารณ์เพิ่ม"}],"ignored":"เมืองถูกตำหนิว่าขาดการประสานงาน"},"night-aid":{"title":"ด่วน! ชุมชนขอเงินช่วยเหลือ","story":"ชาวบ้านต้องการเงินช่วยเหลือคืนนี้ แต่ข้อมูลผู้ขอเงินยังไม่ครบ อีกกลุ่มจึงขอให้ตรวจสอบก่อน","choices":[{"title":"อนุมัติผ่านคณะทำงานฉุกเฉิน","success":"ชุมชนได้รับการดูแล แต่ต้องเลื่อนงบงานอื่น"},{"title":"ขอจังหวัดตรวจเอกสารและสมทบ","success":"จังหวัดช่วยประสานได้ทัน","failure":"เอกสารไม่ทันเวลา ชุมชนผิดหวัง"},{"title":"โอนตามรายชื่อที่ตัวแทนส่งมา","success":"เงินถึงผู้ขอ แต่พบรายชื่อที่ตรวจสอบไม่ได้"},{"title":"ให้ภาคธุรกิจช่วยหาเงินแทนเมือง","success":"ชุมชนได้รับความช่วยเหลือ แต่ธุรกิจไม่พอใจ"},{"title":"รอเอกสารครบก่อนดำเนินการ","success":"ขั้นตอนถูกต้อง แต่ครอบครัวบางส่วนผิดหวัง"}],"ignored":"ชุมชนไม่ได้คำตอบและร้องเรียนต่อสื่อ"},"night-tourist":{"title":"ด่วน! นักท่องเที่ยวร้องเรียนที่ {target}","story":"นักท่องเที่ยวไม่พอใจบริการ เจ้าของกิจการขอให้เมืองช่วยจ่ายเงินชดเชย และอย่าเปิดเผยชื่อสถานที่","choices":[{"title":"ชดเชยผ่านช่องทางที่ตรวจสอบได้","success":"ผู้มาเยือนพอใจและขั้นตอนโปร่งใส"},{"title":"ให้ผู้ประกอบการรับผิดชอบตามข้อตกลง","success":"ผู้มาเยือนได้รับการดูแล แต่เจ้าของกิจการไม่พอใจ"},{"title":"จ่ายเงินแลกกับการไม่เผยแพร่เรื่อง","success":"ข่าวไม่ลุกลาม แต่ข้อตกลงไม่โปร่งใส"},{"title":"เปิดเผยข้อร้องเรียนและข้อเท็จจริง","success":"การเปิดเผยได้รับคำชม แต่เมืองและธุรกิจเสียภาพลักษณ์"},{"title":"ให้คู่กรณีตกลงกันเอง","success":"ทั้งสองฝ่ายตกลงกันได้","failure":"ข้อร้องเรียนแพร่กระจาย"}],"ignored":"ข้อร้องเรียนแพร่กระจายโดยไม่มีคำชี้แจง"},"night-leak":{"title":"ด่วน! นักข่าวได้เอกสารลับ","story":"นักข่าวกำลังจะเผยแพร่เอกสารการใช้เงินของเมืองคืนนี้ มีคนเสนอช่วยคุยกับนักข่าวเพื่อไม่ให้ข่าวออก","choices":[{"title":"เผยแพร่เอกสารที่ตรวจสอบแล้ว","success":"ประชาชนเห็นความโปร่งใส แต่ประเด็นงบกระทบภาพลักษณ์"},{"title":"ขอหน่วยงานรัฐตรวจข้อเท็จจริง","success":"รัฐส่งผู้ตรวจมา แต่ข่าวยังกระทบชื่อเสียงเมือง"},{"title":"ให้คนกลางเจรจาเป็นการภายใน","success":"ข่าวเงียบลงชั่วคราว","failure":"การเจรจาถูกเปิดเผยซ้ำ"},{"title":"ปฏิเสธทันทีโดยไม่ตรวจเอกสาร","success":"สื่อยอมรับคำปฏิเสธ","failure":"หลักฐานเพิ่มเติมขัดกับคำปฏิเสธ"},{"title":"ยอมรับข้อจำกัดและขอเวลาตรวจสอบ","success":"สื่อยอมรับคำชี้แจง แต่บางส่วนวิจารณ์ความล่าช้า"}],"ignored":"ข่าวถูกเผยแพร่โดยไม่มีคำชี้แจง"},"night-protest":{"title":"ด่วน! ชาวบ้านมารอคำตอบ","story":"ชาวบ้านไม่พอใจที่เมืองใช้เงินช่วยธุรกิจ แต่เจ้าของกิจการยืนยันว่ากำลังเดือดร้อน ทั้งสองฝ่ายต้องการคำตอบคืนนี้","choices":[{"title":"จัดเวทีร่วมทั้งสองฝ่าย","success":"ทั้งสองฝ่ายได้พูด แต่ฝ่ายบริหารต้องโยกกำลังงาน"},{"title":"ให้คำมั่นเพิ่มความช่วยเหลือชุมชน","success":"ชุมชนพอใจ ธุรกิจมองว่าเมืองเลือกข้าง"},{"title":"ช่วยเจ้าของกิจการตามแผนเดิม","success":"ธุรกิจพอใจ ผู้ร้องเรียนผิดหวัง"},{"title":"มอบให้ตัวแทนรัฐบาลไกล่เกลี่ย","success":"ทั้งสองฝ่ายยอมรับคนกลาง","failure":"การเจรจาล้มเหลว"},{"title":"ไม่รับข้อเสนอใดจนกว่าจะมีข้อมูลครบ","success":"รักษาความเป็นกลาง แต่ทั้งสองฝ่ายไม่พอใจ"}],"ignored":"เหตุการณ์กลายเป็นข่าว ทั้งสองฝ่ายไม่พอใจ"},"moral-public-grant":{"title":"กองทุนเสนอเงินช่วยเมือง","story":"กองทุนจดทะเบียนเสนอเงิน 350,000 บาท มีเอกสารครบ เปิดเผยชื่อผู้ให้ได้ และไม่บังคับเลือกผู้รับเหมา","choices":[{"title":"รับเงินเข้าคลังตามหนังสือ","success":"เอกสารผ่านการตรวจ เงินเข้าคลังโดยไม่มีผลเสีย"},{"title":"ขอให้รัฐบาลช่วยตรวจเอกสารก่อนรับ","success":"ส่วนกลางยืนยันที่มา เงินเข้าคลัง"},{"title":"ขอเปิดเผยรายชื่อผู้สนับสนุนเพิ่มเติม","success":"กองทุนยินดีเปิดข้อมูลและโอนเงิน"},{"title":"ปฏิเสธตามกติกาของเมือง","success":"กองทุนรับทราบ เมืองไม่ได้งบ"},{"title":"ขอเพิ่มยอดโดยไม่แจ้งเหตุผล","success":"กองทุนยุติการพิจารณา"}]},"moral-envelope":{"title":"เงิน 750,000 บาทจากคนไม่เปิดชื่อ","story":"กลุ่มทุนเสนอเงิน 750,000 บาท ขอไม่ลงชื่อผู้ให้และจะส่งเงินผ่านคนกลาง บอกว่าตอนนี้ยังไม่ขออะไรตอบแทน","choices":[{"title":"รับเงินตามข้อเสนอ","success":"เงินเข้าคลัง แต่การตรวจพบผู้ให้ที่ไม่เปิดเผยทำลายความน่าเชื่อถือ"},{"title":"ขอเปิดเผยชื่อและรับผ่านบัญชีทางการ","success":"กลุ่มทุนถอนข้อเสนอ"},{"title":"ปฏิเสธและแจ้งหน่วยตรวจสอบ","success":"หน่วยตรวจรับเรื่อง กลุ่มทุนไม่พอใจ"},{"title":"ขอเอกสารชี้แจงที่มาก่อนพิจารณา","success":"ตัวแทนยุติการติดต่อ"},{"title":"ขอเจรจาเพิ่มยอดตามเงื่อนไขเดิม","success":"เงินเข้าคลังแต่เกิดข้อสงสัยหนัก","failure":"ข้อเสนอถูกเปิดเผยก่อนโอนเงิน"}]},"moral-ai-official":{"title":"โควต้าแยก AI ฟรีจากจังหวัด","story":"จังหวัดเสนอแยก AI ฟรี 1 จุดให้เมืองที่ร่วมโครงการสาธารณะ ไม่มีค่าใช้จ่ายหรือเงื่อนไขส่วนตัว","choices":[{"title":"ตอบรับตามหนังสือ","success":"ได้รับโควต้า AI ที่ถูกต้อง ไม่มีผลเสีย"},{"title":"ขอเผยแพร่หนังสือให้ประชาชนตรวจสอบ","success":"ได้รับโควต้าและเปิดข้อมูลต่อชุมชน"},{"title":"ขอให้จังหวัดอธิบายรายละเอียด","success":"จังหวัดยืนยันสิทธิ์และส่งโควต้า"},{"title":"ปฏิเสธและให้เมืองพึ่งตนเอง","success":"จังหวัดจัดโควต้าให้เมืองอื่น"},{"title":"ขอเพิ่มอีก 1 จุดเป็นกรณีพิเศษ","success":"จังหวัดไม่อนุมัติเพิ่ม แต่ให้โควต้าเดิม"}]},"moral-ai-private":{"title":"ผู้รับเหมาเสนอแยก AI ฟรี","story":"บริษัทหนึ่งเสนอแยก AI ฟรี 1 จุด แลกกับการให้บริษัทมีสิทธิ์ได้รับการพิจารณางานก่อนเจ้าอื่นในอนาคต","choices":[{"title":"รับโควต้าและให้บริษัทได้สิทธิ์ก่อนรายอื่น","success":"ได้รับโควต้า แต่เงื่อนไขเอื้อประโยชน์ถูกทักท้วง"},{"title":"ขอรับโควต้าโดยไม่ให้สิทธิพิเศษ","success":"บริษัทถอนข้อเสนอ"},{"title":"ปฏิเสธและเปิดเผยข้อเสนอ","success":"ชุมชนชื่นชม ผู้รับเหมาไม่พอใจ"},{"title":"ให้รัฐบาลพิจารณาแทน","success":"รัฐบาลไม่อนุมัติ แต่ชื่นชมการส่งตรวจ"},{"title":"ขอเงินช่วยเมืองเพิ่มด้วย","success":"ได้โควต้าและเงิน แต่การเอื้อประโยชน์ถูกเปิดเผย","failure":"บริษัทเปิดเผยการต่อรอง"}]},"moral-ai-anonymous":{"title":"แยก AI ฟรีจากคนปริศนา","story":"มีข้อความเสนอแยก AI ฟรี 1 จุด ไม่ระบุชื่อผู้ให้หรือสิ่งที่ต้องตอบแทน และเร่งให้นายกตัดสินใจ","choices":[{"title":"รับโควต้าทันที","success":"ตรวจภายหลังพบว่าเป็นทุนสาธารณะจริง","failure":"ตรวจพบความเชื่อมโยงกับผู้เสนอราคาในเมือง"},{"title":"ขอข้อมูลโครงการก่อนรับ","success":"เอกสารยืนยันสิทธิ์และเมืองได้โควต้า","failure":"ผู้เสนอไม่ส่งหลักฐานและยกเลิก"},{"title":"ให้รัฐบาลรับโควต้าแทนเมือง","success":"รัฐบาลรับเรื่อง แต่เมืองยังไม่ได้โควต้า"},{"title":"ปฏิเสธโดยไม่อธิบายเหตุผล","success":"เมืองไม่รับความเสี่ยง แต่เสียโอกาส"},{"title":"เปิดเผยข้อความให้ชาวเมืองเห็น","success":"ประชาชนชื่นชม แต่ผู้ให้ทุนสุจริตบางรายกังวล"}]},"moral-money-sponsor":{"title":"เงินจัดงานที่มีข้อแม้","story":"ผู้จัดงานเสนอเงิน 450,000 บาท ให้เมืองช่วยโปรโมตงาน แต่ขอไม่ให้พูดถึงเรื่องร้องเรียนเก่า ๆ ของเขา","choices":[{"title":"รับเงินและทำตามคำขอ","success":"เงินเข้าคลัง แต่เมืองถูกทักท้วงเรื่องปิดบังข้อมูล"},{"title":"รับเฉพาะเมื่อเปิดเผยข้อเสนอและข้อร้องเรียน","success":"ผู้จัดยอมลดเงื่อนไขและโอนเงิน","failure":"ผู้จัดถอนตัว"},{"title":"ปฏิเสธการรับเงิน","success":"รักษาความเป็นอิสระ แต่ธุรกิจไม่พอใจ"},{"title":"ขอผู้ตรวจอิสระตรวจเอกสาร","success":"พบข้อขัดแย้ง เมืองไม่รับเงิน"},{"title":"เสนอเงินบริจาคผ่านชุมชนแทน","success":"ชุมชนได้รับความช่วยเหลือ แต่เมืองไม่ได้งบ"}]},"moral-community":{"title":"จะช่วยชาวบ้านหรือเจ้าของกิจการ?","story":"เงินเมืองมีจำกัด ชาวบ้านขอช่วยค่าครองชีพ ส่วนเจ้าของกิจการขอเงินช่วยรักษางานของพนักงาน ทั้งสองฝ่ายต่างก็มีเหตุผล","choices":[{"title":"จัดงบทั้งหมดให้ชุมชน","success":"ชุมชนพอใจ ธุรกิจรู้สึกถูกละเลย"},{"title":"จัดงบทั้งหมดให้ธุรกิจ","success":"ธุรกิจได้รับความช่วยเหลือ ชุมชนไม่พอใจ"},{"title":"แบ่งงบตามเกณฑ์ที่เปิดเผย","success":"ทั้งสองฝ่ายได้บางส่วน ฝ่ายบริหารถูกกดดัน"},{"title":"ขอรัฐบาลสมทบก่อนตัดสินใจ","success":"รัฐบาลช่วยประสาน แต่เงินยังไม่เข้า"},{"title":"เก็บงบไว้สำหรับเหตุฉุกเฉิน","success":"เมืองรักษางบ แต่ทั้งสองฝ่ายผิดหวัง"}]},"moral-friend":{"title":"ข้อเสนอจากเพื่อนเก่า","story":"เพื่อนเก่าเสนอเงิน 600,000 บาท ขอเพียงให้บริษัทของเขาได้คุยเรื่องงานกับเมืองก่อนรายอื่น","choices":[{"title":"รับเงินและตกลงให้เข้าหารือก่อน","success":"เงินเข้าคลัง แต่สิทธิ์ไม่เท่าเทียมถูกวิจารณ์"},{"title":"ให้ทุกบริษัทหารือพร้อมกันโดยไม่รับเงิน","success":"รักษาความเท่าเทียม แต่เพื่อนเก่าผิดหวัง"},{"title":"เสนอรับเงินโดยไม่ให้สิทธิพิเศษ","success":"เพื่อนยอมสนับสนุนผ่านช่องทางปกติ","failure":"เพื่อนถอนข้อเสนอ"},{"title":"ขอคณะกรรมการอิสระพิจารณา","success":"เป็นกลาง แต่เกิดความล่าช้า"},{"title":"ไม่ตอบรับและไม่เปิดเผยข้อเสนอ","success":"ไม่มีเงินเข้าเมือง แต่ข้อสงสัยยังอยู่"}]},"v72-road-fund":{"title":"บริษัทเสนอเงินช่วยถนน","story":"ขณะที่เมืองกำลังตรวจสภาพทางเข้าเมือง บริษัทหนึ่งเสนอเงินช่วย โดยมีข้อเสนอให้เลือกหลายแบบ","choices":[{"title":"อนุญาตให้บริษัทกำหนดพื้นที่ตรวจถนนเอง รับ 1,800,000 บาท","success":"รายงานตรวจสภาพถูกจำกัดเฉพาะพื้นที่ที่บริษัทเลือก วิศวกรเทศบาลพบจุดเสี่ยงที่ตกหล่นและคณะตรวจสอบตั้งข้อสงสัยต่อความเป็นกลาง"},{"title":"ใช้รายงานของวิศวกรเทศบาลและเปิดรับข้อเสนอทั่วไป","success":"ทีมวิศวกรใช้หลักเกณฑ์เดียวกันในการประเมินทุกจุด จึงทำให้แผนซ่อมแซมมีความน่าเชื่อถือ"},{"title":"เลื่อนเรื่องทั้งหมดไปก่อน","success":"เจ้าหน้าที่ไม่มีคำสั่งให้เริ่มตรวจทางเข้าเมือง แผนงานจึงล่าช้า"},{"title":"รับเงิน 450,000 บาทโดยไม่มีเงื่อนไขและบันทึกเป็นรายได้ทั่วไป","success":"บริษัทโอนเงินตามเงื่อนไขที่ไม่มีสิทธิแทรกแซง การตรวจถนนดำเนินตามแผนเดิม จึงไม่มีคะแนนเปลี่ยนแปลง"},{"title":"ประกาศต่อประชาชนว่าถนนปลอดภัยแล้วเพื่อสร้างความมั่นใจ","success":"เมื่อรายงานตรวจยังไม่เสร็จ สื่อพบว่าคำประกาศเร็วเกินไป นายกต้องชี้แจงและเจ้าหน้าที่ต้องแก้ไขข้อมูล"}]},"v72-media-fund":{"title":"รายการพิเศษเกี่ยวกับเมือง","story":"สถานีโทรทัศน์ท้องถิ่นอยากถ่ายทำรายการเกี่ยวกับเมือง และมีผู้สนับสนุนพร้อมออกเงินให้","choices":[{"title":"ให้สัมภาษณ์โดยตอบคำถามจากประชาชนโดยตรง","success":"คำตอบมีทั้งข้อดีและข้อที่ยังต้องปรับปรุง ผู้ชมชื่นชมว่านายกตอบอย่างตรงไปตรงมา"},{"title":"รับ 1,250,000 บาทและให้ผู้สนับสนุนอนุมัติคำถามก่อนออกอากาศ","success":"รายการเผยแพร่ได้ แต่ทีมข่าวเปิดเผยว่าคำถามสำคัญถูกตัดออก ความน่าเชื่อถือของนายกและความโปร่งใสลดลง"},{"title":"ไม่อนุญาตให้สถานีถ่ายทำ","success":"สื่อรายงานว่าสำนักงานนายกปิดโอกาสให้ประชาชนรับรู้การทำงาน"},{"title":"รับค่าธรรมเนียมถ่ายทำ 200,000 บาทตามประกาศ","success":"สถานีชำระค่าธรรมเนียมปกติและยังมีอิสระในการทำข่าว ไม่มีเหตุให้คะแนนเปลี่ยน"},{"title":"รับปากว่าทุกปัญหาจะหมดไปภายในวันนี้","success":"เมื่อถึงช่วงเย็นปัญหาหลายเรื่องยังไม่หมดไป สื่อเปรียบเทียบคำพูดกับผลจริงและเจ้าหน้าที่ถูกเร่งงานนอกแผน"}]},"v72-festival":{"title":"ร้านค้าอยากร่วมเทศกาลอาหาร","story":"ผู้จัดงานขอใช้พื้นที่สาธารณะจัดเทศกาลอาหาร มีร้านค้าหลายกลุ่มอยากเข้าร่วม","choices":[{"title":"เปิดให้ร้านค้าสมัครด้วยเกณฑ์เดียวกัน","success":"งานมีร้านค้าหลากหลาย สื่อสนใจบรรยากาศและผู้ประกอบการเห็นว่าการคัดเลือกเป็นธรรม"},{"title":"ให้ผู้จัดงานกำหนดราคาค่าเข้าชมเอง","success":"ราคาบัตรสูงกว่าที่ครอบครัวส่วนใหญ่รับได้ จึงเกิดเสียงร้องเรียนว่ากิจกรรมเมืองไม่ทั่วถึง"},{"title":"รับเงิน 1,500,000 บาทและให้สิทธิพื้นที่ทั้งหมดแก่ผู้สนับสนุน","success":"ผู้สนับสนุนจัดพื้นที่ให้ร้านในเครือเป็นหลัก ร้านท้องถิ่นถูกกันออกและประชาชนตั้งข้อสงสัยว่าพื้นที่เมืองถูกให้สิทธิพิเศษ"},{"title":"ยกเลิกงานเพื่อหลีกเลี่ยงความวุ่นวาย","success":"ร้านที่เตรียมสินค้าไว้เสียโอกาสและสื่อยกเลิกข่าวกิจกรรมของเมือง"},{"title":"รับค่าเช่าพื้นที่ 700,000 บาทด้วยอัตราที่ประกาศและเปิดรับร้านค้าทั่วไป","success":"เงินเข้าเมืองตามระเบียบ งานได้รับการประชาสัมพันธ์ และร้านค้าหลายรายมีโอกาสเข้าร่วม"}]},"v72-central-grant":{"title":"รัฐบาลเปิดให้ขอเงินช่วยเมือง","story":"รัฐบาลมีเงินช่วยพัฒนาเมือง แต่เมืองต้องแจ้งความจำเป็นตามจริง","choices":[{"title":"รับงบตามสิทธิ 500,000 บาทและส่งข้อมูลครบถ้วน","success":"เอกสารผ่านการตรวจตามปกติ หน่วยงานกลางชื่นชมความร่วมมือและโอนเงินเข้าคลัง"},{"title":"ไม่ยื่นขอเงินเพราะไม่ต้องการภาระเอกสาร","success":"ส่วนกลางไม่ได้รับข้อมูลที่ขอ จึงมองว่าเทศบาลไม่พร้อมประสานงาน"},{"title":"ขอให้เจ้าหน้าที่ตรวจความถูกต้องก่อนส่ง","success":"เจ้าหน้าที่จัดข้อมูลเป็นระบบและส่งคำชี้แจงได้ครบตามกำหนด"},{"title":"ขอ 2,000,000 บาทโดยรวมโครงการที่ยังไม่ผ่านการอนุมัติเป็นภาระเร่งด่วน","success":"เงินโอนจากการพิจารณาเบื้องต้น แต่ส่วนกลางพบว่ารายการที่แจ้งยังไม่ได้รับอนุมัติ ความเชื่อถือในข้อมูลเทศบาลลดลง"},{"title":"รับเงินค่าประสานงาน 200,000 บาทตามอัตราปกติ","success":"การเบิกจ่ายเป็นรายการมาตรฐานของหน่วยงานและไม่ได้เปลี่ยนแผนหรือความสัมพันธ์กับรัฐบาล"}]},"v72-family-weekend":{"title":"วันหยุดของทุกครอบครัว","story":"ชาวบ้านอยากจัดงานวันหยุดให้ทุกครอบครัวเข้าร่วม มีผู้สนับสนุนหลายรายเสนอเงินให้","choices":[{"title":"เปิดให้ทุกครอบครัวสมัครด้วยกติกาเดียวกัน","success":"ชุมชนต่าง ๆ ได้โอกาสเท่ากันและชมว่าการจัดงานเป็นธรรม"},{"title":"รับ 1,100,000 บาทจากสโมสรที่ขอสงวนสิทธิ์เข้าร่วมให้สมาชิก","success":"ครอบครัวที่ไม่เป็นสมาชิกถูกกันออกจากกิจกรรมที่ใช้ชื่อเทศบาล เกิดคำร้องเรื่องความเท่าเทียมและการให้สิทธิพิเศษ"},{"title":"ประกาศให้ทุกคนเข้าร่วมโดยไม่จำกัดจำนวน","success":"จำนวนคนเกินความพร้อมที่ผู้จัดเตรียมไว้ บางครอบครัวต้องรอนานและเจ้าหน้าที่จัดคิวไม่ทัน"},{"title":"รับเงินจากมูลนิธิ 350,000 บาทโดยไม่มีเงื่อนไข","success":"มูลนิธิสมทบผ่านช่องทางปกติและประชาชนยังเข้าได้ตามสิทธิเดิม ตัวแทนชุมชนชื่นชมการระดมทุน"},{"title":"จัดกิจกรรมตามแผนเดิมโดยไม่เปลี่ยนอะไร","success":"กิจกรรมดำเนินตามกำหนด ไม่มีค่าใช้จ่ายหรือความเปลี่ยนแปลงเพิ่มเติม"}]},"v72-supplier":{"title":"ผู้ค้าส่งเสนอเงินให้เมือง","story":"ร้านค้าอยากซื้อของได้ถูกลง ผู้ค้าส่งรายหนึ่งเสนอเงินให้เมืองเพื่อแลกกับโอกาสขายสินค้า","choices":[{"title":"เปิดเวทีให้ผู้ค้าส่งหลายรายเสนอเงื่อนไข","success":"ร้านค้าสามารถเปรียบเทียบราคาและเงื่อนไขได้ ผู้ประกอบการและผู้ตรวจสอบพอใจกับการแข่งขัน"},{"title":"รับเงินสมทบ 400,000 บาทโดยไม่ให้สิทธิผูกขาด","success":"ผู้ค้าส่งยอมโอนเงินผ่านคลังตามปกติ โดยร้านค้ายังคงเลือกคู่ค้าเอง ไม่มีคะแนนเปลี่ยนแปลง"},{"title":"สั่งให้ทุกกิจการซื้อจากรายที่เสนอราคาต่ำสุดทันที","success":"ร้านค้าบางประเภทต้องใช้สินค้าต่างกันและไม่สามารถเปลี่ยนคู่ค้าทันที การบังคับใช้ทำให้เกิดคำร้องและเพิ่มภาระงาน"},{"title":"ปฏิเสธการหารือกับผู้ค้าส่งทุกเจ้า","success":"สมาคมร้านค้าเสียโอกาสเจรจาลดต้นทุนและตำหนิเทศบาลที่ไม่รับฟัง"},{"title":"รับ 1,750,000 บาทและประกาศให้บริษัทเป็นคู่ค้ารายเดียว","success":"ผู้ค้ารายอื่นเสียโอกาสและร้านค้าพบว่าไม่สามารถต่อรองราคาได้ ผู้ตรวจสอบพบการให้สิทธิผูกขาดโดยไม่มีการแข่งขัน"}]},"v72-public-donation":{"title":"เงินบริจาคก่อนเปิดประมูล","story":"บริษัทเสนอเงินบริจาคให้เมือง ในช่วงที่เมืองกำลังเตรียมเปิดประมูลงานใหม่","choices":[{"title":"ส่งเรื่องให้คณะกรรมการอิสระตรวจแหล่งเงินก่อน","success":"คณะกรรมการยืนยันว่าต้องตรวจความเกี่ยวข้องกับการประมูลก่อนรับเงิน ความน่าเชื่อถือเพิ่มขึ้นแต่ฝ่ายบริหารต้องใช้เวลาตรวจสอบ"},{"title":"รับ 1,900,000 บาททันทีและขอบคุณผ่านเพจเมือง","success":"ต่อมาพบว่าบริษัทเป็นผู้สนใจเข้าประมูล การเผยแพร่ภาพขอบคุณก่อนแข่งขันทำให้ประชาชนสงสัยว่าบริษัทได้รับการสนับสนุนเป็นพิเศษ"},{"title":"ปฏิเสธและประกาศกติกาการรับเงินให้ชัดเจน","success":"หลักเกณฑ์ป้องกันผลประโยชน์ทับซ้อนชัดขึ้น แต่เจ้าของกิจการบางรายผิดหวังที่ต้องชะลอการสนับสนุน"},{"title":"รับเงิน 300,000 บาทจากกองทุนอิสระที่ไม่เกี่ยวข้องกับการประมูลและลงทะเบียนเปิดเผย","success":"ผู้ตรวจสอบตรวจสอบแหล่งเงินแล้วไม่พบความเกี่ยวข้องกับคู่ประมูล รายการบริจาคเปิดเผยได้และเพิ่มความเชื่อถือ"},{"title":"ไม่รับเงินแต่ขอให้เจ้าหน้าที่เก็บเรื่องนี้ไว้เป็นความลับ","success":"ข่าวการติดต่อรั่วไหลโดยไม่มีเอกสารสาธารณะให้ตรวจสอบ จึงเกิดข้อสงสัยแม้เมืองไม่ได้รับเงิน"}]}};
for(const d of MAYOR_EVENTS){const p=MAYOR_THAI_COPY[d.id];if(!p)continue;d.title=p.title;d.story=p.story;d.choices.forEach((o,i)=>{const c=p.choices[i];if(!c)return;o.title=c.title;if(o.success&&c.success)o.success.report=c.success;if(o.failure&&c.failure)o.failure.report=c.failure;});if(d.ignored&&p.ignored)d.ignored.report=p.ignored;}

/* Two event pools: founding and normal. Keep original IDs and choice indexes for saves. */
const MAYOR_CITY_COPY={"admin-rain":{"title":"ฝนหนักกำลังมา","story":"เจ้าหน้าที่แจ้งว่าฝนกำลังเข้าฝั่ง บ้านที่มีคนอยู่เสี่ยงน้ำท่วม จะเตรียมรับมืออย่างไร?"},"admin-traffic":{"title":"คนเริ่มบ่นเรื่องรถติด","story":"รถต่อคิวอยู่หลายคันจนคนในเมืองเดินทางช้า นายกจะจัดการอย่างไร?"},"image-interview":{"title":"นักข่าวขอเวลาสักครู่","story":"นักข่าวท้องถิ่นอยากรู้ว่าเราใช้งบพัฒนาเมืองไปกับอะไรบ้าง จะตอบอย่างไร?"},"image-party":{"title":"งานเลี้ยงของท่านนายก","story":"ทีมงานอยากจัดงานเลี้ยงให้คุณโดยใช้งบเมือง มีผู้สนับสนุนเสนอช่วยด้วย จะเลือกแบบไหน?"},"fame-food":{"title":"ชิมของอร่อยในเมืองเรา","story":"ผู้จัดงานอยากชวนร้านอาหารในเมืองมาร่วมเทศกาลเล็ก ๆ คุณจะสนับสนุนไหม?"},"fame-news":{"title":"สื่ออยากมาเที่ยวเมือง","story":"สื่อท่องเที่ยวติดต่อขอมาถ่ายทำสถานที่ที่นักท่องเที่ยวมาเยือน จะช่วยเขาอย่างไร?"},"government-home":{"title":"บ้านใหม่จากงบรัฐบาล","story":"รัฐบาลมีโครงการช่วยสร้างบ้านเพิ่มในพื้นที่ที่ต้องการที่อยู่อาศัย สนใจเข้าร่วมหรือไม่?"},"government-landmark":{"title":"ตึกสูงแห่งใหม่","story":"รัฐบาลเปิดโอกาสให้เมืองสร้างตึกมหานครด้วยงบสนับสนุน แต่ต้องส่งมอบให้ทันกำหนด"},"people-welcome":{"title":"ยินดีต้อนรับเพื่อนบ้านใหม่","story":"มีครอบครัวสนใจย้ายมาอยู่และเมืองมีบ้านว่างรองรับ จะช่วยให้พวกเขาเริ่มต้นอย่างไร?"},"people-cost":{"title":"ชาวบ้านอยากประหยัดขึ้น","story":"ตัวแทนชุมชนขอให้เมืองช่วยแบ่งเบาค่าใช้จ่ายในการใช้ชีวิตวันนี้ คุณจะทำอย่างไร?"},"business-restaurant":{"title":"ร้านอาหารขอเวลาคุย","story":"เจ้าของร้านอาหารอยากลดภาระที่ต้องจ่ายให้เมืองจากการเดินทางของลูกค้าในวันนี้"},"business-pub":{"title":"เจ้าของผับขอความช่วยเหลือ","story":"เจ้าของสถานบันเทิงขอให้ลดส่วนที่เมืองได้รับจากภารกิจเดินทางในวันนี้ลง 400 บาท"},"integrity-donor":{"title":"เงินก้อนที่มีข้อแม้","story":"นักธุรกิจขอให้เมืองรับเงินสนับสนุน โดยหวังว่าจะได้รับการพิจารณาเป็นพิเศษในอนาคต"},"integrity-audit":{"title":"ยอดเงินไม่ตรงกัน","story":"เจ้าหน้าที่พบรายการในบัญชีเมืองที่ยังอธิบายไม่ได้ จึงนำเรื่องมาขอคำตัดสินจากนายก"},"admin-crossing":{"title":"แยกนี้รอนานจัง","story":"มีรถรออยู่บนถนนหลายคัน คนขับบางคนขอให้เทศบาลช่วยให้เดินทางสะดวกขึ้น"},"admin-office":{"title":"เจ้าหน้าที่ขอเครื่องมือเพิ่ม","story":"เมื่อเมืองมีงานมากขึ้น ทีมเทศบาลขออุปกรณ์ช่วยจัดการเอกสารให้ทัน"},"admin-inspection":{"title":"ลองทดสอบการเดินทาง","story":"คณะประเมินชวนเมืองทดสอบว่าคนเดินทางถึงที่หมายตรงเวลาได้ดีแค่ไหนในวันนี้"},"admin-park":{"title":"ขอสวนใกล้บ้าน","story":"ชาวเมืองต้องการพื้นที่พักผ่อนเพิ่ม เพราะพื้นที่ที่รองรับอยู่ไม่พอ"},"admin-restaurant":{"title":"ถึงเวลากินข้าวแล้ว","story":"มีคนที่ยังหาที่นั่งกินอาหารไม่ได้เพราะร้านรองรับไม่พอ นายกจะช่วยอย่างไร?"},"admin-shops":{"title":"ร้านค้าอีกสักแห่ง","story":"คนในเมืองยังหาที่ซื้อของได้ไม่เพียงพอ เจ้าหน้าที่เสนอเพิ่มร้านค้า"},"admin-audit-cost":{"title":"ทบทวนค่าใช้จ่ายเมือง","story":"ฝ่ายการเงินขอให้นายกพิจารณารายจ่ายในการดูแลเมืองที่กำลังดำเนินงานอยู่"},"admin-office-supply":{"title":"ขอพื้นที่ทำงานเพิ่ม","story":"มีคนกำลังหางานมากกว่าตำแหน่งที่รองรับ เจ้าหน้าที่เสนอเพิ่มสำนักงาน"},"admin-city-fair":{"title":"เมืองน่าอยู่ประจำปี","story":"คณะผู้จัดงานเปิดรับเมืองที่ต้องการพิสูจน์คุณภาพการเดินทางเพื่อชิงรางวัล"},"admin-bridge-review":{"title":"ดูแลสะพานทางเข้า","story":"วิศวกรเสนอให้ตรวจความพร้อมของสะพานและถนนทางเข้าไว้ก่อนมีปัญหา"},"admin-paper":{"title":"เอกสารรออนุมัติ","story":"เจ้าหน้าที่นำเอกสารงานเมืองมาให้พิจารณาหลายฉบับ จะจัดการอย่างไร?"},"admin-public-work":{"title":"สวนสำหรับคนเมือง","story":"ความต้องการพื้นที่พักผ่อนมากกว่าที่เมืองรองรับได้ ทีมงานเสนอเพิ่มพื้นที่สวน"},"admin-training":{"title":"ทีมงานอยากพัฒนาตัวเอง","story":"เจ้าหน้าที่อยากเรียนรู้วิธีรับฟังและจัดการคำร้องของประชาชนให้ดีขึ้น"},"image-birthday":{"title":"วันเกิดท่านนายก","story":"ทีมงานเสนอจัดงานวันเกิดให้คุณ แต่มีข้อเสนอให้ใช้งบของเมืองด้วย"},"image-photo":{"title":"รถหรูหน้าสำนักงาน","story":"มีคนถ่ายภาพรถของผู้สนับสนุนที่มาพบคุณ แล้วนำไปเผยแพร่ จะชี้แจงอย่างไร?"},"image-walk":{"title":"ขอคุยกับนายกสักหน่อย","story":"ชาวบ้านอยากพบคุณด้วยตัวเอง เพื่อเล่าเรื่องชีวิตในเมือง"},"image-award":{"title":"มีคนเสนอชื่อนายก","story":"สมาคมท้องถิ่นเสนอชื่อคุณรับรางวัล พร้อมมีเงินสนับสนุนกิจกรรมชุมชน"},"image-rumor":{"title":"ข่าวลือเรื่องงบเมือง","story":"ข่าวลือว่ามีการใช้เงินไม่เหมาะสมเริ่มแพร่ไปในชุมชน จะรับมืออย่างไร?"},"image-speech":{"title":"ขอให้นายกเปิดงาน","story":"ผู้จัดกิจกรรมในชุมชนเชิญคุณไปกล่าวเปิดงาน จะตอบรับอย่างไร?"},"image-friend":{"title":"เพื่อนเก่ามาขอความช่วยเหลือ","story":"เพื่อนสนิทอยากให้เมืองช่วยสนับสนุนกิจกรรมของเขาเป็นกรณีพิเศษ"},"image-camera":{"title":"หนึ่งวันของนายก","story":"ทีมสารคดีอยากติดตามการทำงานของคุณเพื่อให้คนดูรู้จักเมืองมากขึ้น"},"image-promise":{"title":"คำถามเรื่องการเดินทาง","story":"นักข่าวถามว่าคุณมีแผนทำให้คนเดินทางสะดวกขึ้นอย่างไร จะตอบแบบไหน?"},"image-gift":{"title":"ของขวัญราคาแพง","story":"เจ้าของกิจการส่งของขวัญมาที่สำนักงานพร้อมข้อความขอบคุณนายก"},"image-survey":{"title":"ฟังเสียงคนในเมือง","story":"สำนักข่าวอยากสำรวจความเห็นของประชาชนที่มีต่อการทำงานของคุณ"},"image-critic":{"title":"คลิปที่ถูกแชร์ต่อ","story":"คลิปคำตอบของนายกที่บางคนมองว่าไม่สุภาพถูกแชร์ในชุมชน จะทำอย่างไร?"},"image-community":{"title":"ชวนมานั่งคุยกัน","story":"ตัวแทนชุมชนเชิญคุณไปร่วมกิจกรรมพบปะกับคนในเมือง"},"fame-tour-film":{"title":"เมืองเราในภาพยนตร์","story":"ทีมถ่ายหนังสนใจใช้ทิวทัศน์และสถานที่ในเมืองเป็นฉาก จะตกลงอย่างไร?"},"fame-hotel-guide":{"title":"คู่มือที่พักสำหรับแขก","story":"เจ้าของที่พักอยากทำคู่มือแนะนำโรงแรมในเมืองให้คนที่วางแผนมาเที่ยว"},"fame-restaurant-star":{"title":"นักชิมมาเยือน","story":"นักชิมที่มีผู้ติดตามจำนวนมากอยากมาแนะนำร้านอาหารในเมือง"},"fame-shopping":{"title":"ชวนเที่ยวงานช้อปปิ้ง","story":"ผู้จัดงานเสนอจัดกิจกรรมแนะนำห้างและร้านค้าในเมือง"},"fame-night":{"title":"คืนนี้มีดนตรี","story":"ผู้จัดกิจกรรมอยากประชาสัมพันธ์สถานบันเทิงที่เปิดอยู่ในเมือง"},"fame-coast":{"title":"ช่วยดูแลชายฝั่ง","story":"สื่อชวนเมืองทำกิจกรรมรักษาความสะอาดริมทะเล เพื่อให้ชายฝั่งน่าเที่ยว"},"fame-rival":{"title":"เพื่อนบ้านก็มีดี","story":"เมืองใกล้เคียงเปิดตัวกิจกรรมท่องเที่ยวใหม่ คุณจะวางแผนประชาสัมพันธ์เมืองอย่างไร?"},"fame-landmark":{"title":"ตึกของเราเข้าตาสื่อ","story":"สื่อสถาปัตยกรรมสนใจตึกมหานครที่สร้างเสร็จแล้ว อยากนำเรื่องราวไปเผยแพร่"},"fame-park":{"title":"วันหยุดในสวน","story":"ผู้จัดงานอยากแนะนำกิจกรรมสำหรับครอบครัวที่สวนของเมือง"},"fame-visitor":{"title":"แขกมาเที่ยวแล้วมีเรื่องอยากบอก","story":"ตัวแทนกลุ่มทัวร์ที่มาเยือนขอคุยกับเทศบาลเรื่องบริการที่ได้รับ"},"fame-press-trip":{"title":"พาสื่อรู้จักเมือง","story":"สมาคมท่องเที่ยวอยากพานักข่าวมาชมสถานที่ที่เมืองเปิดให้บริการแล้ว"},"fame-city-award":{"title":"รางวัลเมืองน่าเที่ยว","story":"คณะกรรมการชวนเมืองเข้าร่วมประเมินความพร้อมด้านการเดินทางของนักท่องเที่ยว"},"fame-festival-sponsor":{"title":"มีคนอยากช่วยออกเงินจัดงาน","story":"ผู้สนับสนุนขอร่วมจัดกิจกรรมในเมือง แลกกับพื้นที่ประชาสัมพันธ์"},"government-visit":{"title":"รัฐบาลอยากมาฟังแผน","story":"เจ้าหน้าที่จากรัฐบาลขอนัดพบเพื่อพูดคุยเรื่องแนวทางพัฒนาเมือง"},"government-fund-return":{"title":"เพื่อนบ้านขอแรงช่วย","story":"รัฐบาลส่งข่าวว่าพื้นที่ใกล้เคียงต้องการความช่วยเหลือ และขอให้เมืองเราร่วมสนับสนุน"},"people-housing":{"title":"อยากมีบ้านอีกสักหลัง","story":"คนสนใจเข้ามาอยู่ แต่จำนวนบ้านที่พร้อมรองรับไม่เพียงพอ"},"people-food":{"title":"อยากกินข้าวใกล้บ้าน","story":"ชาวเมืองบางคนยังหาที่กินข้าวไม่ได้เพราะความจุร้านอาหารไม่พอ"},"people-shopping":{"title":"ซื้อของได้สะดวกกว่านี้ไหม","story":"มีคนที่ยังเข้าใช้ร้านค้าไม่ได้เพราะพื้นที่รองรับไม่เพียงพอ"},"people-green":{"title":"เด็ก ๆ อยากมีที่เล่น","story":"ครอบครัวอยากมีพื้นที่พักผ่อนเพิ่ม เพราะสวนที่รองรับอยู่ยังไม่พอ"},"people-jobs":{"title":"อยากมีงานใกล้บ้าน","story":"มีคนกำลังหางาน แต่ตำแหน่งที่ว่างในเมืองรองรับไม่พอ"},"people-night-noise":{"title":"เสียงดังถึงบ้าน","story":"คนที่อยู่ในเมืองขอให้ช่วยดูแลเรื่องเสียงจากสถานบันเทิงที่เปิดให้บริการ"},"people-casino":{"title":"ชาวบ้านอยากคุยเรื่องคาสิโน","story":"ตัวแทนชุมชนขอให้เทศบาลทบทวนการสนับสนุนคาสิโนที่เปิดอยู่"},"people-fairness":{"title":"ขอให้ดูแลทุกคน","story":"ชาวบ้านอยากให้การจัดสรรงบเมืองคำนึงถึงคนในชุมชนอย่างเท่าเทียม"},"people-commute":{"title":"อยากไปทำงานทันเวลา","story":"คนในเมืองที่เดินทางอยู่ต้องรอรถบนถนนนาน ขอให้คุณช่วยหาทางออก"},"people-family":{"title":"ช่วยแบ่งเบาค่าใช้จ่ายครอบครัว","story":"ตัวแทนครอบครัวเสนอให้เมืองช่วยสนับสนุนกิจกรรมของเด็ก ๆ"},"people-petition":{"title":"จดหมายจากว่าที่เพื่อนบ้าน","story":"กลุ่มคนที่กำลังสนใจย้ายมาอยากทราบว่าเมืองมีแผนเพิ่มสิ่งอำนวยความสะดวกอย่างไร"},"people-recreation":{"title":"วันหยุดนี้ทำอะไรดี","story":"ชาวเมืองอยากชวนกันจัดกิจกรรมพักผ่อนที่สวนซึ่งเปิดอยู่"},"people-complaint":{"title":"เวลาฟังเสียงชาวบ้าน","story":"ตัวแทนชุมชนรวบรวมข้อเสนอเกี่ยวกับบริการเมืองมาพบคุณ จะจัดการอย่างไร?"},"business-food-cost":{"title":"ต้นทุนวัตถุดิบสูงขึ้น","story":"เจ้าของร้านอาหารแจ้งว่าค่าใช้จ่ายเพิ่มขึ้นและขอให้เมืองช่วยแบ่งเบา"},"business-mall-sponsor":{"title":"ห้างชวนจัดงานลดราคา","story":"ผู้ประกอบการห้างในเมืองอยากจัดกิจกรรมพิเศษเพื่อดึงลูกค้า"},"business-night-event":{"title":"งานดนตรีคืนนี้","story":"เจ้าของผับเสนอจัดงานดนตรีที่สถานที่ของตนและขอให้เมืองช่วยประชาสัมพันธ์"},"business-casino-deal":{"title":"ข้อเสนอจากคาสิโน","story":"เจ้าของคาสิโนที่เปิดอยู่เสนอข้อตกลงเกี่ยวกับรายได้จากผู้มาใช้บริการในวันนี้"},"business-invest-office":{"title":"บริษัทสนใจย้ายสำนักงาน","story":"นักลงทุนพร้อมสนับสนุนเงินหากเมืองเพิ่มพื้นที่สำนักงานตามกำหนด"},"business-monopoly":{"title":"ห้างใหญ่ขอสิทธิพิเศษ","story":"เจ้าของห้างเสนอเงินสนับสนุน แต่ต้องการให้เมืองลดการช่วยเหลือร้านค้ารายเล็ก"},"integrity-gift-supplier":{"title":"ของขวัญจากผู้รับเหมา","story":"บริษัทก่อสร้างเสนอเงินให้เมืองและขอให้ได้รับการพิจารณาเป็นพิเศษ"},"integrity-contract":{"title":"อ่านสัญญาอีกครั้ง","story":"เจ้าหน้าที่พบเงื่อนไขในร่างสัญญาที่อาจทำให้บริษัทได้เปรียบมากเกินไป"},"integrity-relative":{"title":"ญาติอยากได้โอกาส","story":"คนใกล้ชิดขอให้คุณช่วยกิจการของเขาโดยไม่ต้องรอขั้นตอนเหมือนคนอื่น"},"integrity-documents":{"title":"ตามหาเอกสารงบ","story":"เจ้าหน้าที่แจ้งว่าเอกสารรายการใช้จ่ายบางส่วนยังหาไม่พบ"},"integrity-public-ledger":{"title":"เปิดบัญชีให้ทุกคนดูไหม","story":"นักข่าวขอให้เมืองเปิดเผยรายละเอียดการใช้เงิน เพื่อให้ตรวจสอบได้"},"integrity-donation":{"title":"ผู้บริจาคไม่เปิดชื่อ","story":"มีคนติดต่อขอสนับสนุนเงินให้เมือง แต่ไม่ต้องการเปิดเผยชื่อ"},"integrity-secret-deal":{"title":"ตัวแทนจากกลุ่มทุน","story":"คนกลางเสนอเงินให้เมือง แลกกับการพิจารณาเรื่องของกลุ่มทุนเป็นพิเศษ"},"integrity-clerk":{"title":"เงินที่เจ้าหน้าที่ขอแบ่ง","story":"ฝ่ายตรวจสอบได้รับแจ้งว่ามีเจ้าหน้าที่เสนอแบ่งผลประโยชน์จากงานเมือง"},"integrity-tender":{"title":"บริษัทขอคุยก่อนคู่แข่ง","story":"บริษัทหนึ่งขอให้เทศบาลพิจารณาข้อเสนอของตนก่อนเปิดรับรายอื่น"},"integrity-audit-government":{"title":"รัฐบาลขอดูบัญชี","story":"หน่วยตรวจสอบแจ้งว่าจะเข้ามาดูความถูกต้องของบัญชีเมือง"},"integrity-press-ethics":{"title":"สื่อถามเรื่องความเป็นธรรม","story":"นักข่าวอยากรู้ว่าหลักเกณฑ์พิจารณาผู้สนับสนุนเมืองเป็นอย่างไร"},"integrity-compensation":{"title":"เงินแลกกับการจบเรื่อง","story":"ตัวแทนกลุ่มธุรกิจเสนอเงินให้เมือง เพื่อขอให้ยุติข้อพิพาทที่แจ้งไว้"},"integrity-ethics":{"title":"กติกาเรื่องของขวัญ","story":"เจ้าหน้าที่ชวนตั้งหลักเกณฑ์การรับเงินและของขวัญให้ทุกฝ่ายปฏิบัติเหมือนกัน"},"government-liaison-daily":{"title":"รัฐบาลพร้อมรับฟัง","story":"เจ้าหน้าที่ส่วนกลางอยากรู้แผนพัฒนาเมืองและพร้อมหารือเรื่องงบในอนาคต"},"business-new-market-daily":{"title":"เปิดโอกาสให้ร้านใหม่","story":"กลุ่มผู้สนใจลงทุนอยากทราบว่าเมืองจะสนับสนุนกิจการใหม่อย่างไร"},"night-fire":{"title":"ด่วน! ไฟไหม้ที่ {target}","story":"ศูนย์ประสานงานแจ้งพบควันไฟที่อาคารนี้ เจ้าหน้าที่รอคำสั่งของคุณ"},"night-power":{"title":"ด่วน! ไฟดับที่ {target}","story":"ผู้ดูแลแจ้งว่าไฟดับ ผู้รับเหมารายเดิมพร้อมเข้าช่วย แต่ขอข้ามขั้นตอนเปรียบเทียบราคา"},"night-road":{"title":"ด่วน! มีรถเสียบนถนน","story":"เจ้าหน้าที่แจ้งว่ามีรถเสียบนถนนที่กำลังมีรถสัญจร ต้องการคำสั่งจัดการ"},"night-aid":{"title":"สายด่วนขอความช่วยเหลือ","story":"ตัวแทนชุมชนแจ้งเหตุฉุกเฉินและขอเงินช่วยเหลือ แต่เอกสารบางส่วนยังไม่ครบ"},"night-tourist":{"title":"แขกร้องเรียนที่ {target}","story":"นักท่องเที่ยวแจ้งปัญหาที่สถานที่นี้ เจ้าของกิจการขอให้เมืองช่วยออกค่าใช้จ่ายและไม่เปิดชื่อ"},"night-leak":{"title":"เอกสารหลุดถึงนักข่าว","story":"นักข่าวได้รับเอกสารงบเมืองบางส่วนและเตรียมเผยแพร่ คนกลางเสนอช่วยเจรจา"},"night-protest":{"title":"ชาวบ้านอยากพบคืนนี้","story":"ตัวแทนชุมชนขอหารือเรื่องงบช่วยธุรกิจ ขณะที่ผู้ประกอบการก็ขอความช่วยเหลือ"},"moral-public-grant":{"title":"หนังสือจากกองทุน","story":"กองทุนที่จดทะเบียนเสนอเงิน 350,000 บาท มีเอกสารครบและอนุญาตให้เปิดเผยชื่อ"},"moral-envelope":{"title":"ซองเงินที่ไม่ระบุชื่อ","story":"กลุ่มทุนเสนอเงิน 750,000 บาท ขอส่งผ่านคนกลางและไม่ลงชื่อผู้ให้ โดยบอกว่ายังไม่มีสิ่งตอบแทน"},"moral-ai-official":{"title":"ของขวัญจากจังหวัด","story":"จังหวัดเสนอสิทธิ์ติดตั้งไฟจราจร AI หนึ่งจุดจากโครงการสาธารณะ มีหนังสือยืนยันชัดเจน"},"moral-ai-private":{"title":"ข้อเสนอไฟจราจร AI","story":"ผู้รับเหมาเสนอสิทธิ์ติดตั้งไฟ AI หนึ่งจุด ขอเพียงให้บริษัทได้เข้าพบก่อนรายอื่นในอนาคต"},"moral-ai-anonymous":{"title":"สิทธิ์ AI จากคนไม่เปิดชื่อ","story":"ผู้ติดต่อเสนอสิทธิ์ติดตั้งไฟ AI หนึ่งจุดฟรี แต่ไม่ลงชื่อผู้สนับสนุนและเร่งให้ตอบ"},"moral-money-sponsor":{"title":"เงินจัดงานมีข้อแม้","story":"ผู้จัดงานเสนอเงิน 450,000 บาท ขอให้ช่วยประชาสัมพันธ์โดยไม่กล่าวถึงข้อร้องเรียนของบริษัท"},"moral-community":{"title":"งบก้อนเดียว สองความต้องการ","story":"ตัวแทนชาวบ้านและเจ้าของกิจการต่างขอความช่วยเหลือจากเมือง แต่มีงบจำกัด"},"moral-friend":{"title":"เพื่อนเก่ากับเงินสนับสนุน","story":"เพื่อนเก่าเสนอเงิน 600,000 บาท โดยขอเข้าหารือเรื่องงานก่อนบริษัทอื่น"},"v72-road-fund":{"title":"บริษัทอยากช่วยพัฒนาถนน","story":"บริษัทเสนอเงินสนับสนุนทางเข้าเมือง พร้อมขอหารือเรื่องเงื่อนไข"},"v72-media-fund":{"title":"รายการพิเศษของเมือง","story":"สถานีท้องถิ่นเสนอทำรายการเกี่ยวกับเมือง และมีผู้สนับสนุนช่วยออกค่าใช้จ่าย"},"v72-festival":{"title":"ชวนร้านค้ามาร่วมเทศกาล","story":"ผู้จัดงานอยากใช้พื้นที่สาธารณะจัดงานอาหาร ร้านอาหารในเมืองสนใจเข้าร่วม"},"v72-central-grant":{"title":"งบช่วยเมืองจากรัฐบาล","story":"รัฐบาลเปิดให้ยื่นขอเงินอุดหนุน โดยกำหนดให้แจ้งข้อมูลตามความจริง"},"v72-family-weekend":{"title":"วันหยุดของทุกครอบครัว","story":"ตัวแทนชุมชนอยากจัดงานให้ทุกครอบครัวเข้าร่วม ผู้สนับสนุนหลายรายเสนอช่วย"},"v72-supplier":{"title":"ผู้ค้าส่งอยากเข้ามาช่วยร้านค้า","story":"ร้านค้าอยากลดต้นทุน ผู้ค้าส่งเสนอเงินให้เมืองเพื่อขอโอกาสทำธุรกิจ"},"v72-public-donation":{"title":"เงินบริจาคก่อนประมูล","story":"บริษัทสนใจบริจาคเงินให้เมือง ขณะที่เจ้าหน้าที่กำลังเตรียมเปิดรับข้อเสนองานใหม่"},"government-grant-shop":{"title":"งบรัฐบาลสำหรับร้านค้า","story":"รัฐบาลเสนอร่วมออกงบสร้างร้านค้าเพิ่ม หากเมืองสร้างตามจำนวนและเวลาที่กำหนด คุณจะรับโครงการไหม?"},"government-grant-food":{"title":"งบรัฐบาลสำหรับร้านอาหาร","story":"รัฐบาลเสนอร่วมออกงบสร้างร้านอาหารเพิ่ม หากเมืองสร้างตามจำนวนและเวลาที่กำหนด คุณจะรับโครงการไหม?"},"government-grant-office":{"title":"งบรัฐบาลสำหรับสำนักงาน","story":"รัฐบาลเสนอร่วมออกงบสร้างสำนักงานเพิ่ม หากเมืองสร้างตามจำนวนและเวลาที่กำหนด คุณจะรับโครงการไหม?"},"government-grant-park":{"title":"งบรัฐบาลสำหรับสวนสาธารณะ","story":"รัฐบาลเสนอร่วมออกงบสร้างสวนสาธารณะเพิ่ม หากเมืองสร้างตามจำนวนและเวลาที่กำหนด คุณจะรับโครงการไหม?"},"government-grant-hotel":{"title":"งบรัฐบาลสำหรับโรงแรม","story":"รัฐบาลเสนอร่วมออกงบสร้างโรงแรมเพิ่ม หากเมืองสร้างตามจำนวนและเวลาที่กำหนด คุณจะรับโครงการไหม?"},"government-grant-factory":{"title":"งบรัฐบาลสำหรับโรงงาน","story":"รัฐบาลเสนอร่วมออกงบสร้างโรงงานเพิ่ม หากเมืองสร้างตามจำนวนและเวลาที่กำหนด คุณจะรับโครงการไหม?"},"government-grant-mall":{"title":"งบรัฐบาลสำหรับห้าง","story":"รัฐบาลเสนอร่วมออกงบสร้างห้างเพิ่ม หากเมืองสร้างตามจำนวนและเวลาที่กำหนด คุณจะรับโครงการไหม?"},"government-grant-pub":{"title":"งบรัฐบาลสำหรับผับ","story":"รัฐบาลเสนอร่วมออกงบสร้างผับเพิ่ม หากเมืองสร้างตามจำนวนและเวลาที่กำหนด คุณจะรับโครงการไหม?"},"government-grant-home-small":{"title":"งบรัฐบาลสำหรับบ้านขนาดเล็ก","story":"รัฐบาลเสนอร่วมออกงบสร้างบ้านขนาดเล็กเพิ่ม หากเมืองสร้างตามจำนวนและเวลาที่กำหนด คุณจะรับโครงการไหม?"},"government-grant-pub-large":{"title":"งบรัฐบาลสำหรับผับขนาดใหญ่","story":"รัฐบาลเสนอร่วมออกงบสร้างผับขนาดใหญ่เพิ่ม หากเมืองสร้างตามจำนวนและเวลาที่กำหนด คุณจะรับโครงการไหม?"},"government-grant-mall-large":{"title":"งบรัฐบาลสำหรับห้างขนาดใหญ่","story":"รัฐบาลเสนอร่วมออกงบสร้างห้างขนาดใหญ่เพิ่ม หากเมืองสร้างตามจำนวนและเวลาที่กำหนด คุณจะรับโครงการไหม?"},"business-association-shop":{"title":"เจ้าของร้านค้ามาขอคุย","story":"กลุ่มเจ้าของร้านค้าที่เปิดอยู่ขอให้เมืองช่วยลดภาระจากรายได้การเดินทาง หรือเพิ่มพื้นที่รองรับลูกค้า จะตกลงอย่างไร?"},"business-association-mall":{"title":"เจ้าของห้างมาขอคุย","story":"กลุ่มเจ้าของห้างที่เปิดอยู่ขอให้เมืองช่วยลดภาระจากรายได้การเดินทาง หรือเพิ่มพื้นที่รองรับลูกค้า จะตกลงอย่างไร?"},"business-association-office":{"title":"เจ้าของสำนักงานมาขอคุย","story":"กลุ่มเจ้าของสำนักงานที่เปิดอยู่ขอให้เมืองช่วยลดภาระจากรายได้การเดินทาง หรือเพิ่มพื้นที่รองรับลูกค้า จะตกลงอย่างไร?"},"business-association-factory":{"title":"เจ้าของโรงงานมาขอคุย","story":"กลุ่มเจ้าของโรงงานที่เปิดอยู่ขอให้เมืองช่วยลดภาระจากรายได้การเดินทาง หรือเพิ่มพื้นที่รองรับลูกค้า จะตกลงอย่างไร?"},"business-association-casino":{"title":"เจ้าของคาสิโนมาขอคุย","story":"กลุ่มเจ้าของคาสิโนที่เปิดอยู่ขอให้เมืองช่วยลดภาระจากรายได้การเดินทาง หรือเพิ่มพื้นที่รองรับลูกค้า จะตกลงอย่างไร?"},"business-association-hotel":{"title":"เจ้าของโรงแรมมาขอคุย","story":"กลุ่มเจ้าของโรงแรมที่เปิดอยู่ขอให้เมืองช่วยลดภาระจากรายได้การเดินทาง หรือเพิ่มพื้นที่รองรับลูกค้า จะตกลงอย่างไร?"},"business-association-park":{"title":"เจ้าของสวนมาขอคุย","story":"กลุ่มเจ้าของสวนที่เปิดอยู่ขอให้เมืองช่วยลดภาระจากรายได้การเดินทาง หรือเพิ่มพื้นที่รองรับลูกค้า จะตกลงอย่างไร?"}};
for(const d of MAYOR_EVENTS){if(!d.rollbackOnly&&MAYOR_CITY_COPY[d.id])Object.assign(d,MAYOR_CITY_COPY[d.id]);}
MAYOR_EVENTS.push(...[{"id":"founding-welcome","category":"admin","title":"ยินดีต้อนรับท่านนายก","story":"วันนี้คือวันแรกของคุณในฐานะนายกเมืองแห่งใหม่ ทุกอย่างกำลังเริ่มต้นจากแผนของคุณ คุณอยากวางรากฐานเมืองนี้แบบไหน?","choices":[{"title":"ให้คนมีบ้านและใช้ชีวิตได้สะดวก","success":{"scores":{"people":5,"admin":2},"report":"ทีมงานจะให้ความสำคัญกับที่อยู่อาศัยและบริการพื้นฐาน"}},{"title":"สร้างโอกาสให้ธุรกิจและการจ้างงาน","success":{"scores":{"business":5,"admin":2},"report":"นักลงทุนเริ่มสนใจแนวทางสร้างงานของเมือง"}},{"title":"พัฒนาเป็นเมืองท่องเที่ยว","success":{"scores":{"fame":5,"government":2},"report":"ฝ่ายพัฒนาเมืองรับแนวทางส่งเสริมการท่องเที่ยวไปวางแผน"}},{"title":"ค่อย ๆ พัฒนาและรักษางบเมือง","success":{"scores":{"admin":5,"integrity":2},"report":"ทีมงานเห็นด้วยกับการเริ่มต้นโดยคำนึงถึงเงินในคลัง"}}],"minLevel":1,"foundingOnly":true,"once":true},{"id":"founding-grant","category":"government","title":"เงินขวัญถุงจากรัฐบาล","story":"รัฐบาลส่งหนังสือแสดงความยินดี พร้อมงบตั้งต้น 500,000 บาทให้เมืองใหม่ โดยให้ลงบัญชีเปิดเผยตามปกติ","choices":[{"title":"รับงบเข้าคลังตามระเบียบ","success":{"scores":{"government":5,"integrity":3},"report":"รัฐบาลโอนงบสนับสนุนเข้าคลังเมืองเรียบร้อย","money":500000}},{"title":"ขอให้เจ้าหน้าที่ตรวจเอกสารก่อนรับ","success":{"scores":{"admin":3,"integrity":4},"report":"เอกสารผ่านการตรวจและเงินถูกโอนเข้าคลัง","money":500000}},{"title":"ไม่ขอรับในรอบนี้","success":{"scores":{"government":-2},"report":"รัฐบาลรับทราบและจัดสรรงบให้พื้นที่อื่น"}}],"minLevel":1,"foundingOnly":true,"once":true},{"id":"founding-casino","category":"integrity","title":"เงิน 2 ล้านบาทจากคนแปลกหน้า","story":"ตัวแทนกลุ่มธุรกิจคาสิโนจากต่างเมืองส่งข้อความแสดงความยินดี พร้อมเสนอเงิน 2,000,000 บาทเข้าคลัง ขอเพียงไม่ระบุชื่อผู้ให้ บอกว่ายังไม่มีสิ่งที่ต้องการตอบแทน","choices":[{"title":"รับเงินตามข้อเสนอ","success":{"scores":{"integrity":-8,"business":5},"report":"เงินเข้าคลังแล้ว แต่ที่มาของเงินยังไม่ถูกเปิดเผย คนกลางบอกว่าจะติดต่อมาอีก","money":2000000,"flags":["foundingCasinoAccepted"]}},{"title":"ขอรับผ่านช่องทางเปิดเผย","success":{"scores":{"integrity":6},"report":"กลุ่มทุนยอมเปิดชื่อและลดข้อเสนอเหลือ 300,000 บาท","money":300000}},{"title":"ปฏิเสธเงินก้อนนี้","success":{"scores":{"integrity":7,"business":-2},"report":"กลุ่มทุนถอนข้อเสนอ เมืองยังใช้เงินตามแผนเดิม"}},{"title":"ขอข้อมูลบริษัทและที่มาของเงินก่อน","success":{"scores":{"admin":3,"integrity":5},"report":"ผู้ติดต่อไม่ยอมส่งเอกสารครบ เรื่องจึงถูกพักไว้"}}],"minLevel":1,"foundingOnly":true,"once":true},{"id":"founding-investor","category":"business","title":"นักลงทุนรายแรก","story":"กลุ่มผู้ประกอบการสนใจเข้ามาเปิดกิจการในเมืองใหม่ ขอทราบแนวทางก่อนตัดสินใจลงทุน พร้อมเสนอเงินช่วยค่าเตรียมพื้นที่ 180,000 บาทผ่านคลังเมือง","choices":[{"title":"เปิดให้ทุกกิจการเสนอแผนด้วยกติกาเดียวกัน","success":{"scores":{"business":5,"integrity":3},"report":"กลุ่มทุนยอมร่วมสมทบโดยไม่ขอสิทธิ์พิเศษ","money":180000}},{"title":"ให้กลุ่มนี้เลือกทำเลก่อนรายอื่น","success":{"scores":{"business":4,"integrity":-5},"report":"บริษัทพอใจและเพิ่มเงินสนับสนุนเป็น 350,000 บาท แต่เกิดสิทธิ์พิเศษที่ตรวจสอบได้","money":350000}},{"title":"ยังไม่รับข้อเสนอ ขอวางผังเมืองก่อน","success":{"scores":{"admin":4},"report":"กลุ่มทุนยินดีรอแผนที่ชัดเจน"}}],"minLevel":1,"foundingOnly":true,"once":true},{"id":"founding-ai","category":"government","title":"ของขวัญจากจังหวัด","story":"จังหวัดมีโควตาติดตั้งไฟจราจร AI เหลือ 1 จุดจากโครงการทดลอง เมืองใหม่สามารถรับสิทธิ์เก็บไว้ใช้เมื่อมีแยกพร้อม","choices":[{"title":"รับสิทธิ์ตามหนังสือโครงการ","success":{"scores":{"government":4},"report":"จังหวัดจัดสรรโควตาให้เมืองเรียบร้อย","aiCredits":1}},{"title":"ขอให้ส่งรายละเอียดการใช้งานก่อน","success":{"scores":{"admin":3,"government":2},"report":"เอกสารครบและเมืองได้รับโควตาตามสิทธิ์","aiCredits":1}},{"title":"ยกสิทธิ์ให้เมืองอื่นก่อน","success":{"scores":{"government":2},"report":"จังหวัดนำสิทธิ์ไปจัดสรรให้เมืองที่ต้องการ"}}],"minLevel":1,"foundingOnly":true,"once":true},{"id":"founding-plan","category":"fame","title":"เมืองใหม่ในสายตาคนอื่น","story":"สื่อท้องถิ่นอยากเล่าเรื่องการก่อตั้งเมืองใหม่ และขอสัมภาษณ์ว่าคุณมีแผนอะไรสำหรับอนาคต","choices":[{"title":"เล่าถึงแผนที่ทำได้จริง","success":{"scores":{"image":4,"fame":3},"report":"บทสัมภาษณ์ช่วยให้คนรู้จักเมืองและเข้าใจแนวทางของคุณ"}},{"title":"ประกาศว่าจะเป็นเมืองใหญ่ที่สุดในประเทศเร็ว ๆ นี้","success":{"scores":{"fame":4,"admin":-3},"report":"ข่าวได้รับความสนใจ แต่ทีมงานเตือนว่าเป้าหมายยังไม่มีแผนรองรับ"}},{"title":"ขอให้รอจนเริ่มก่อสร้างก่อน","success":{"scores":{"admin":2},"report":"สื่อตกลงรอติดตามเมื่อมีความคืบหน้า"}}],"minLevel":1,"foundingOnly":true,"once":true},{"id":"founding-family","category":"people","title":"จดหมายจากครอบครัวแรก","story":"ครอบครัวหนึ่งส่งข้อความว่าหวังจะย้ายมาอยู่เมื่อเมืองมีบ้านพร้อม พวกเขาอยากให้คุณดูแลเรื่องอะไรเป็นพิเศษ","choices":[{"title":"วางแผนให้มีบ้านและร้านค้าใกล้กัน","success":{"scores":{"people":5,"admin":2},"report":"ครอบครัวขอบคุณและรอติดตามการพัฒนา"}},{"title":"ให้ความสำคัญกับถนนและการเดินทาง","success":{"scores":{"people":3,"admin":3},"report":"พวกเขาพอใจที่เมืองคิดถึงการเดินทางตั้งแต่ต้น"}},{"title":"ยังไม่ให้คำมั่น จนกว่าจะมีบ้านพร้อม","success":{"scores":{"admin":3},"report":"ครอบครัวเข้าใจและยังไม่เร่งตัดสินใจ"}}],"minLevel":1,"foundingOnly":true,"once":true},{"id":"founding-friend","category":"image","title":"เพื่อนเก่ามาแสดงความยินดี","story":"เพื่อนเก่าส่งของขวัญและเสนอเงินช่วยเมือง 250,000 บาท โดยขอให้บริษัทของเขาได้เข้าพบคุณก่อนรายอื่นเมื่อเริ่มมีงานก่อสร้าง","choices":[{"title":"รับตามที่เพื่อนเสนอ","success":{"scores":{"business":3,"integrity":-6},"report":"เงินถูกโอนเข้าคลัง แต่บริษัทได้รับช่องทางเข้าพบเป็นพิเศษ","money":250000}},{"title":"ขอให้บริจาคโดยไม่ผูกกับสิทธิ์ใด ๆ","success":{"scores":{"integrity":5,"image":2},"report":"เพื่อนตกลงบริจาค 100,000 บาทโดยไม่ขอสิทธิ์พิเศษ","money":100000}},{"title":"ขอบคุณและปฏิเสธเงิน","success":{"scores":{"integrity":4},"report":"เพื่อนยอมรับคำตอบ และการพบปะจบลงด้วยดี"}}],"minLevel":1,"foundingOnly":true,"once":true},{"id":"founding-tools","category":"admin","title":"เตรียมทีมก่อนสร้างเมือง","story":"ทีมงานขอให้นายกตัดสินใจว่าจะเตรียมแผนงานอย่างไร ก่อนเริ่มรับประชาชนและกิจการเข้ามา","choices":[{"title":"จัดทำแผนถนนและบริการพื้นฐาน","success":{"scores":{"admin":5},"report":"ทีมงานมีแนวทางชัดเจนในการเตรียมเมือง"}},{"title":"ขอคำแนะนำจากรัฐบาล","success":{"scores":{"government":4,"admin":2},"report":"รัฐบาลส่งคู่มือการวางแผนเมืองมาให้"}},{"title":"เริ่มจากโครงการเล็ก ๆ ก่อน","success":{"scores":{"admin":3,"people":2},"report":"ทีมงานพร้อมเริ่มด้วยโครงการที่ดูแลง่าย"}}],"minLevel":1,"foundingOnly":true,"once":true},{"id":"founding-donation","category":"integrity","title":"ทุนจากมูลนิธิ","story":"มูลนิธิพัฒนาเมืองเสนอเงิน 120,000 บาทเพื่อสนับสนุนงานเริ่มต้น มีชื่อผู้ให้และเอกสารครบ ไม่มีข้อเรียกร้องเพิ่มเติม","choices":[{"title":"รับเงินและเปิดเผยรายการบริจาค","success":{"scores":{"integrity":4,"people":2},"report":"มูลนิธิโอนเงินเข้าคลังและเผยแพร่เอกสารได้","money":120000}},{"title":"ขอให้ตรวจสอบเอกสารก่อน","success":{"scores":{"admin":3,"integrity":3},"report":"เอกสารผ่านการตรวจและได้รับเงินครบ","money":120000}},{"title":"ไม่รับเพื่อใช้เงินของเมืองเอง","success":{"scores":{"admin":2},"report":"มูลนิธิเคารพการตัดสินใจของเมือง"}}],"minLevel":1,"foundingOnly":true,"once":true},{"id":"founding-casino-return","category":"integrity","minLevel":1,"once":true,"followup":true,"title":"คนกลางติดต่อกลับมา","story":"กลุ่มคาสิโนที่เคยให้เงินก้อนใหญ่ตอนเริ่มเมืองกลับมาติดต่ออีกครั้ง ครั้งนี้ขอให้บริษัทในเครือได้รับโอกาสเจรจาก่อนผู้ลงทุนรายอื่น คุณจะทำอย่างไร?","choices":[{"title":"ให้เข้าพบก่อนตามที่ขอ","success":{"money":400000,"scores":{"business":5,"integrity":-10,"image":-3},"report":"กลุ่มทุนโอนเงินเพิ่ม แต่ข่าวเรื่องการให้สิทธิ์พิเศษเริ่มแพร่ออกไป"}},{"title":"ให้เข้าร่วมด้วยกติกาเดียวกับทุกบริษัท","success":{"scores":{"integrity":6,"business":-3},"report":"กลุ่มทุนไม่พอใจ แต่เมืองยืนยันว่าทุกบริษัทต้องผ่านขั้นตอนเดียวกัน"}},{"title":"เปิดเผยข้อเสนอและให้ตรวจสอบเงินก้อนเดิม","success":{"scores":{"integrity":9,"admin":-3,"business":-5},"report":"เจ้าหน้าที่เปิดการตรวจสอบย้อนหลัง เมืองต้องใช้เวลาอธิบายที่มาของเงิน แต่ความโปร่งใสดีขึ้น"}}]}]);


/* Welcome gifts and an always available, non-punitive decision in every event.
   Append fallback choices rather than moving indexes referenced by saved tasks. */
MAYOR_EVENTS.push(
 {id:"founding-mahanakhon",category:"government",minLevel:1,foundingOnly:true,once:true,
  title:"ของขวัญจากรัฐบาล",story:"เนื่องในโอกาสเข้ารับตำแหน่งนายกเมืองคนใหม่ รัฐบาลขอมอบสิทธิ์สร้างตึกมหานคร 1 แห่ง พร้อมรับผิดชอบค่าก่อสร้างทั้งหมด เพื่อสนับสนุนการพัฒนาเมืองของคุณ",
  choices:[{title:"รับข้อเสนอ",success:{freeMahanakhon:1,scores:{government:4},report:"ได้รับโควตาตึกมหานครฟรี 1 แห่งแล้ว เลือกสร้างได้จากเมนูที่อยู่อาศัย เมื่อพร้อม โดยไม่เสียค่าก่อสร้าง"}},
   {title:"ไม่รับข้อเสนอ",success:{scores:{},report:"เมืองขอบคุณรัฐบาลและขอพัฒนาด้วยงบของตนเอง ไม่มีผลเสีย"}}]},
 {id:"founding-cars",category:"business",minLevel:1,foundingOnly:true,once:true,
  title:"รถยนต์ของขวัญจากผู้ผลิต",story:"บริษัทผู้ผลิตรถยนต์ขอร่วมแสดงความยินดี โดยมอบรถเร็ว รถอัจฉริยะ รถบิน และรถวาร์ป F1 อย่างละ 1 คัน ให้ประชาชนกลุ่มขยัน โดยไม่มีค่าใช้จ่ายหรือเงื่อนไขผูกมัด",
  choices:[{title:"รับข้อเสนอ",success:{hardworkingCars:4,flags:["foundingCarsAccepted"],scores:{business:4},report:"ได้รับรถทั้ง 4 ประเภทในกลุ่มขยันแล้ว หากยังไม่มีคนเพียงพอ รถที่เหลือจะรอให้ประชาชนกลุ่มนี้ย้ายเข้ามา"}},
   {title:"ไม่รับข้อเสนอ",success:{scores:{},report:"บริษัทรับทราบและเมืองไม่มีข้อผูกมัดหรือผลเสีย"}}]}
);
const foundingGiftIds=["founding-grant","founding-mahanakhon","founding-cars","founding-ai"];
// Keep historical indexes intact. Hide the older middle option, not delete it.
for(const id of ["founding-grant","founding-ai"]){
 const d=MAYOR_EVENTS.find(x=>x.id===id);
 d.choices[0].title="รับข้อเสนอ";
 d.choices[1].legacyHidden=true;
 d.choices[2]={...d.choices[2],title:"ไม่รับข้อเสนอ",success:{scores:{},report:id==="founding-grant"?"เมืองสละสิทธิ์รับเงินสนับสนุนครั้งนี้ ไม่มีผลเสีย":"เมืองสละสิทธิ์รับโควตาไฟจราจร AI ครั้งนี้ ไม่มีผลเสีย"}};
}
const casinoOpening=MAYOR_EVENTS.find(x=>x.id==="founding-casino");
casinoOpening.choices[2]={...casinoOpening.choices[2],success:{scores:{integrity:7},report:"กลุ่มทุนถอนข้อเสนอ เมืองไม่ต้องผูกพันกับเงินก้อนนี้"}};
function safeMayorOption(o){
 const r=o.success;
 return !o.legacyHidden&&!o.task&&!o.cost&&!o.grant&&o.chance===undefined&&
 !Object.keys(o.requires||{}).length&&!Object.keys(o.requiresBuildings||{}).length&&
 !!r&&!(r.money<0)&&!(r.aiCredits<0)&&!(r.freeMahanakhon<0)&&!(r.hardworkingCars<0)&&
 !Object.values(r.scores||{}).some(v=>v<0)&&!(r.effects||[]).length&&
 (!(r.flags||[]).length||(r.hardworkingCars===4&&r.flags.every(f=>f==="foundingCarsAccepted")));
}
for(const d of MAYOR_EVENTS){
 let safe;
 if(foundingGiftIds.includes(d.id))safe=d.choices[0];
 else if(d.id==="founding-casino")safe=d.choices[2];
 else if(d.id==="founding-casino-return"){
   // Ending the favour without a new commitment is always possible.
   safe={title:"ไม่ให้สิทธิ์พิเศษ และให้เจ้าหน้าที่ตอบตามระเบียบ",success:{scores:{},report:"เมืองไม่รับข้อเสนอเพิ่มเติม และยืนยันว่าทุกบริษัทใช้กติกาเดียวกัน ไม่มีผลเสียเพิ่มเติม"}};
   d.choices.push(safe);
 }else safe=d.choices.find(o=>safeMayorOption(o)&&!o.success.money&&!o.success.aiCredits)||d.choices.find(safeMayorOption);
 if(!safe){
   safe={title:d.emergencyOnly?"ให้เจ้าหน้าที่ดำเนินการตามขั้นตอนปกติ":"ไม่รับข้อเสนอเพิ่มเติม ดำเนินงานตามแผนเดิม",
    success:{scores:{},report:d.emergencyOnly?"ทีมงานดำเนินการตามขั้นตอนปกติ ไม่มีค่าใช้จ่ายหรือผลเสียเพิ่มเติมต่อเมือง":"เมืองดำเนินงานตามแผนเดิม ไม่มีค่าใช้จ่าย ภารกิจ หรือผลเสียเพิ่มเติม"}};
   d.choices.push(safe);
 }
 if(!safeMayorOption(safe))throw new Error("Unsafe guide: "+d.id);
 safe.noRisk=true;
 safe.title+=" (ไม่มีความเสี่ยง)";
}

function createMayorCore(definitions, random=Math.random){
const keys=["admin","image","fame","government","people","business","integrity"], byId=new Map(definitions.map(d=>[d.id,d]));
const clone=x=>JSON.parse(JSON.stringify(x));
const dayAt=t=>Math.floor((t-360)/1440), start=d=>d*1440+360, deadline=d=>start(d)+600;
const grade=v=>v>=86?"A":v>=71?"B":v>=51?"C":v>=26?"D":"F";
const clamp=v=>Math.max(0,Math.min(100,Math.trunc(v)));
function fresh(t){return {version:1,day:dayAt(t),lastTime:t,scores:Object.fromEntries(keys.map(k=>[k,60])),issues:[],effects:[],history:[],flags:[],suspendedUntil:null,sequence:0,unpaid:0,started:false,nightAt:null,nightDay:null,exploreQuota:{day:dayAt(t),used:{}},openingHandled:false,openingDay:null,foundingSeen:[],needsCityReview:false};}
function restore(saved,t){
 if(!saved||saved.version!==1)return fresh(t);
 const s=clone(saved);for(const k of keys)s.scores[k]=clamp(Number.isFinite(s.scores[k])?s.scores[k]:60);
 // The original v7.2 event pool is unchanged. Discard unanswered v7.3 events
 // without penalties; preserve accepted tasks and history, scores, effects and debt.
 s.issues=(s.issues||[]).filter(i=>{const d=byId.get(i.eventId);return !!d&&(!d.rollbackOnly||i.status!=="pending")&&(i.status!=="working"||!!d.choices[i.selected]?.task);});
 if(Array.isArray(s.stories))for(const x of s.stories){if(x.status==="active"){x.status="ended";x.endedDay=s.day;x.dueDay=null;x.closedIds=[];}}
 s.openingHandled=typeof s.openingHandled==="boolean"?s.openingHandled:!!(s.started||s.history?.length);s.openingDay=Number.isInteger(s.openingDay)?s.openingDay:null;s.foundingSeen=Array.isArray(s.foundingSeen)?s.foundingSeen:[];s.needsCityReview=true;reconcileExploreQuota(s,true);return s;
}
const active=(s,t)=>s.suspendedUntil!==null&&t<s.suspendedUntil;
function score(s,changes,t){let crossed=false;for(const [k,delta] of Object.entries(changes||{})){if(!keys.includes(k))continue;const before=s.scores[k];s.scores[k]=clamp(before+delta);if(before>25&&s.scores[k]<=25)crossed=true;}if(crossed&&!active(s,t))s.suspendedUntil=start(dayAt(t)+2);}
function count(level){if(level<=5)return 1;if(level<=10)return 1+(random()<.5?1:0);if(level<=20)return 2;if(level<=30)return 2+(random()<.5?1:0);if(level<=50)return 3;return 3+(random()<.5?1:0);}
function hasBuildings(need,city){return Object.entries(need||{}).every(([key,n])=>(city.buildingCounts?.[key]||0)>=n);}

function foundingPhase(s,city){return s.openingDay===s.day||!(city.population>0);}
function seenEvent(s,d){return !!d.once&&((s.history||[]).some(h=>h.eventId===d.id)||(s.foundingSeen||[]).includes(d.id));}
function hasKind(city,...kinds){return Object.entries(city.buildingCounts||{}).some(([k,n])=>n>0&&kinds.includes(city.catalog?.[k]?.kind||k.split("_")[0]));}
function anyBusiness(city){return hasKind(city,"shop","restaurant","mall","office","factory","hotel","park","pub","casino");}
const demandEvents={"admin-park":"park","admin-restaurant":"restaurant","admin-shops":"shop","admin-office-supply":"work","admin-public-work":"park","people-housing":"home","people-food":"restaurant","people-shopping":"shop","people-green":"park","people-jobs":"work"};
const trafficEvents=new Set(["admin-traffic","admin-crossing","people-commute","image-promise"]);
const performanceEvents=new Set(["admin-inspection","admin-city-fair","fame-city-award"]);
const touristEvents=new Set(["fame-news","fame-visitor","night-tourist","fame-city-award"]);
const socialBusinessEvents=new Set(["v72-festival","v72-supplier","moral-community","night-protest","integrity-compensation"]);
function sceneEligible(s,d,city){
 if(d.rollbackOnly||seenEvent(s,d))return false;
 if(d.foundingOnly)return foundingPhase(s,city);
 if(foundingPhase(s,city))return false;
 if(d.followup)return s.flags.includes("foundingCasinoAccepted")&&(s.history||[]).some(h=>h.eventId==="founding-casino"&&h.status==="success"&&s.day>=h.day+2);
 if(!(city.population>0))return false;
 if(d.requiresBuildings&&!hasBuildings(d.requiresBuildings,city))return false;
 if(demandEvents[d.id]&&!(city.capacityNeed?.(demandEvents[d.id])?.deficit>0))return false;
 if(trafficEvents.has(d.id)&&!city.trafficCongested)return false;
 if(performanceEvents.has(d.id)&&!(city.tripCount>0&&Number.isFinite(city.performance)))return false;
 if(touristEvents.has(d.id)&&!(city.tourists>0))return false;
 if(socialBusinessEvents.has(d.id)&&!anyBusiness(city))return false;
 if(d.id==="v72-festival"&&!hasKind(city,"restaurant"))return false;
 if(d.id==="people-welcome"&&!(city.capacityNeed?.("home")?.free>0))return false;
 if(d.id==="admin-rain"&&!hasKind(city,"home"))return false;
 if(d.id==="night-road"&&!(city.roadVehicles>0))return false;
 if(d.id==="fame-press-trip"&&!hasKind(city,"hotel","restaurant","park","mall","pub","casino"))return false;
 if(d.id==="fame-festival-sponsor"&&!anyBusiness(city))return false;
 if(d.id==="moral-money-sponsor"&&!anyBusiness(city))return false;
 if(d.id==="business-monopoly"&&!hasKind(city,"shop"))return false;
 if(d.target&&!Object.keys(city.buildingIds||{}).some(k=>d.target.includes(city.catalog?.[k]?.kind)&&(city.buildingIds[k]||[]).length))return false;
 return true;
}
function makeIssue(s,d,source){const i={id:++s.sequence,eventId:d.id,category:d.category,status:"pending",source,day:s.day};s.issues.push(i);if(d.once)(s.foundingSeen||=[]).push(d.id);return i;}
function foundingIssue(s,city,category){
 const pool=definitions.filter(d=>d.foundingOnly&&d.id!=="founding-welcome"&&(!category||d.category===category)&&sceneEligible(s,d,city)&&!s.issues.some(i=>i.eventId===d.id));
 if(!pool.length)return null;
 const d=pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];return makeIssue(s,d,"founding");
}
function refreshOldPending(s,city){
 if(!s.needsCityReview)return;
 s.needsCityReview=false;
 s.issues=s.issues.filter(i=>{if(i.status!=="pending")return true;const d=byId.get(i.eventId);if(!d)return false;if(d.once)return d.foundingOnly?foundingPhase(s,city):true;return sceneEligible(s,d,city);});
}

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
function eligibleOption(s,o,city,issue=null){if(o.legacyHidden)return false;if(o.noRisk)return true;if(!Object.entries(o.requires||{}).every(([k,n])=>s.scores[k]>=n)||!hasBuildings(o.requiresBuildings,city))return false;if(o.task?.kind==="build"){if(buildTaskBlock(s,o,city,issue))return false;const b=city.catalog?.[o.task.key];if(!b||!b.unlocked||!Number.isFinite(b.cost)||b.cost<0||city.canBuild?.(o.task.key,o.task.count)!==true)return false;const net=Math.max(0,b.cost*o.task.count-(o.grant||0));if(net>Math.floor(Math.max(0,city.money)*.2))return false;}return true;}
function options(s,issue,city){const d=byId.get(issue.eventId);return d.choices.map((o,i)=>({index:i,...clone(o),enabled:eligibleOption(s,o,city,issue),capacityBlock:buildTaskBlock(s,o,city,issue),payable:Math.min(Math.max(0,Math.floor(o.cost||0)),Math.floor(Math.max(0,city.money)*.2))}));}
function candidates(s,city,category){const pool=definitions.filter(d=>!d.rollbackOnly&&!d.foundingOnly&&sceneEligible(s,d,city)&&(!category||d.category===category)&&city.level>=d.minLevel&&hasBuildings(d.requiresBuildings,city)&&!s.issues.some(i=>i.eventId===d.id)&&(!d.choices.some(o=>o.task?.kind==="build")||d.choices.some(o=>o.task?.kind==="build"&&eligibleOption(s,o,city))));const regular=pool.filter(d=>!d.emergencyOnly&&!d.moralOnly);const normal=regular.filter(d=>!d.fallbackOnly);return normal.length?normal:regular;}
function issue(s,city,category,source){if(foundingPhase(s,city))return foundingIssue(s,city,category);const a=candidates(s,city,category);if(!a.length)return null;const d=a.find(x=>x.followup)||a[Math.min(a.length-1,Math.floor(random()*a.length))];return makeIssue(s,d,source);}
function ensureDailyCoverage(s,city,t){if(active(s,t)||t>=deadline(s.day))return;if(foundingPhase(s,city)){if(!s.issues.some(i=>i.source==="founding"))foundingIssue(s,city,null);return;}for(const category of keys)if(!s.issues.some(i=>i.category===category))issue(s,city,category,"daily");}
function specialIssue(s,city,kind,t){const pool=definitions.filter(d=>d[kind]&&sceneEligible(s,d,city)&&city.level>=d.minLevel&&!s.issues.some(i=>i.eventId===d.id)&&(!d.target||Object.keys(city.buildingIds||{}).some(k=>d.target.includes(city.catalog?.[k]?.kind)&&city.buildingIds[k].length)));if(!pool.length)return null;const d=pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];const i={id:++s.sequence,eventId:d.id,category:d.category,status:"pending",source:kind==="emergencyOnly"?"night":"moral",day:s.day};if(i.source==="night"){i.openedAt=t;i.deadline=Math.min(start(s.day+1),t+120);if(d.target){const targets=Object.keys(city.buildingIds).filter(k=>d.target.includes(city.catalog[k]?.kind)).flatMap(k=>city.buildingIds[k].map(id=>({id,name:city.catalog[k].name+" #"+id})));i.target=targets[Math.min(targets.length-1,Math.floor(random()*targets.length))];}}s.issues.push(i);return i;}
function planNight(s,t){if(s.nightDay===s.day)return;s.nightDay=s.day;s.nightAt=null;if(active(s,t))return;const first=start(s.day)+720,last=start(s.day)+960;if(t<=last){const earliest=Math.max(first,Math.ceil(t));s.nightAt=earliest+Math.floor(random()*(last-earliest+1));}}
function ensureWelcomeGifts(s,city,t){if(s.openingDay!==s.day||t>=deadline(s.day))return;for(const id of [...foundingGiftIds,"founding-casino"]){const d=byId.get(id);if(d&&!seenEvent(s,d)&&!s.issues.some(i=>i.eventId===id))makeIssue(s,d,"founding");}}
function startDay(s,city,t){s.started=true;planNight(s,t);if(active(s,t)||t>=deadline(s.day))return;if(!s.openingHandled&&byId.has("founding-welcome")){s.openingHandled=true;s.openingDay=s.day;makeIssue(s,byId.get("founding-welcome"),"founding");ensureWelcomeGifts(s,city,t);return;}ensureDailyCoverage(s,city,t);if(foundingPhase(s,city))return;for(let i=1,n=count(city.level);i<n;i++)if(!issue(s,city,null,"daily"))break;specialIssue(s,city,"moralOnly",t);}
function issueDeadline(i){return i.source==="night"&&Number.isFinite(i.deadline)?i.deadline:deadline(i.day);}
function needsAdvance(s,t){return !s?.started||s.needsCityReview||s.day!==dayAt(t)||s.nightDay!==s.day||s.lastTime<deadline(s.day)&&t>=deadline(s.day)||Number.isFinite(s.nightAt)&&t>=s.nightAt||s.issues.some(i=>i.source==="night"&&i.status==="pending"&&t>=issueDeadline(i));}
function nightPulse(s,city,t){if(!Number.isFinite(s.nightAt)||t<s.nightAt)return;const at=s.nightAt;s.nightAt=null;if(active(s,t)||t>=at+120||t>=start(s.day+1))return;specialIssue(s,city,"emergencyOnly",at);}
function record(s,i,report,t,details=null){s.history.push({id:i.id,eventId:i.eventId,category:i.category,status:i.status,report,at:t,source:i.source,day:i.day,...(i.task?{task:clone(i.task)}:{}),...(i.target?{target:clone(i.target)}:{}),...(details?{details}: {})});}
function apply(s,i,result,city,t,cashBefore=city.money){const r=result||{},before={...s.scores},aiBefore=city.aiCredits;if(r.money)city.money+=r.money;const freeMahanakhon=r.freeMahanakhon?city.grantFreeMahanakhon?.(r.freeMahanakhon)||0:0;const hardworkingCars=r.hardworkingCars?city.grantHardworkingCars?.()||0:0;if(r.aiCredits&&Number.isFinite(city.aiCredits))city.aiCredits=Math.min(100000,Math.max(0,city.aiCredits+r.aiCredits));score(s,r.scores,t);const scoreChanges=Object.fromEntries(Object.keys(r.scores||{}).filter(k=>keys.includes(k)).map(k=>[k,{before:before[k],after:s.scores[k],delta:s.scores[k]-before[k]}]));for(const e of r.effects||[]){if(["floodDamage","fillPopulation"].includes(e.kind)){city.applyEffect?.(clone(e));}else if(t<start(i.day+1)){s.effects.push({...clone(e),expires:start(i.day+1),source:i.id});}}for(const flag of r.flags||[])if(!s.flags.includes(flag))s.flags.push(flag);const cashDelta=city.money-cashBefore,aiDelta=Number.isFinite(aiBefore)?city.aiCredits-aiBefore:0;const report=mayorV72Narrative(i,r,scoreChanges,cashDelta,aiDelta);record(s,i,report,t,{money:r.money||0,scores:clone(r.scores||{}),effects:clone(r.effects||[]),paid:i.paid||0,grant:i.grant||0,scoreChanges,cashDelta,aiCredits:aiDelta,freeMahanakhon,hardworkingCars});return report;}
function choose(s,id,index,city,t){const i=s.issues.find(x=>x.id===id);if(!i||i.status!=="pending"||active(s,t)||dayAt(t)!==i.day||t>=issueDeadline(i))return {ok:false};const o=options(s,i,city)[index];if(!o?.enabled)return {ok:false};const cashBefore=city.money;if(o.payable)city.money-=o.payable;if(o.grant)city.money+=o.grant;i.selected=index;i.paid=o.payable;i.grant=o.grant||0;if(o.task){i.status="working";i.task=clone(o.task);if(o.task.kind==="build"){i.baseline=(city.buildingIds?.[o.task.key]||[]).slice();buildTaskDays(s,city)[buildGroup(o.task.key,city)]=s.day;}const objective=o.task.kind==="build"?"ก่อสร้าง "+(city.catalog?.[o.task.key]?.name||o.task.key)+" จำนวน "+o.task.count+" แห่ง":"ทำให้ภารกิจเดินทางสำเร็จถึง "+o.task.target+"%";const report="เทศบาลรับข้อเสนอแล้ว เจ้าหน้าที่จะติดตามเป้าหมาย "+objective+" ก่อน 06:00 วันถัดไป"+(i.paid?" และอนุมัติงบ "+i.paid.toLocaleString("th-TH")+" บาท":"")+(i.grant?" โดยได้รับเงินสนับสนุน "+i.grant.toLocaleString("th-TH")+" บาท ซึ่งต้องคืนหากไม่ผ่านเงื่อนไข":"")+" คะแนนจะสรุปเมื่อภารกิจสิ้นสุด";record(s,i,report,t,{money:0,scores:{},effects:[],paid:i.paid,grant:i.grant,scoreChanges:{},cashDelta:city.money-cashBefore});return {ok:true,working:true,report};}const won=o.chance===undefined||random()<o.chance;i.status=won?"success":"failed";i.rollWon=won;return {ok:true,won,report:apply(s,i,won?o.success:o.failure,city,t,cashBefore)};}
function finish(s,i,city,t,won){if(i.status!=="working")return false;const o=byId.get(i.eventId).choices[i.selected];i.status=won?"success":"failed";const cashBefore=city.money;if(!won&&i.grant){const paid=Math.min(Math.max(0,city.money),i.grant);city.money-=paid;s.unpaid+=i.grant-paid;}apply(s,i,won?o.success:o.failure,city,t,cashBefore);return true;}
function checkTasks(s,city,t){for(const i of s.issues){if(i.status!=="working"||t>=start(i.day+1))continue;const task=i.task;let success=false;if(task.kind==="build"){const old=new Set(i.baseline);success=new Set((city.buildingIds?.[task.key]||[]).filter(id=>!old.has(id))).size>=task.count;}else if(task.kind==="performance"){success=Number.isFinite(city.performance)&&city.performance>=task.target;}if(success)finish(s,i,city,t,true);}}
function expire(s,city,t){for(const i of s.issues){if(i.status==="pending"&&t>=issueDeadline(i)){i.status="expired";if(i.source==="founding"){record(s,i,"ข้อเสนอหมดเวลา ไม่มีการหักคะแนน",issueDeadline(i));continue;}const r=i.source==="night"?byId.get(i.eventId)?.ignored:null;apply(s,i,r||{scores:{[i.category]:-10},report:"ละเลยการตัดสินใจก่อน 16:00"},city,issueDeadline(i));}}}
function advance(s,city,t){if(t<s.lastTime)throw new Error("Mayor clock cannot run backward");refreshOldPending(s,city);if(!s.started)startDay(s,city,s.lastTime);if(s.day===dayAt(t))ensureWelcomeGifts(s,city,t);while(s.day<dayAt(t)){const boundary=start(s.day+1);expire(s,city,boundary);for(const i of s.issues)if(i.status==="working")finish(s,i,city,boundary,false);s.effects=s.effects.filter(e=>e.expires>boundary);s.issues=[];s.day++;s.exploreQuota={day:s.day,used:{}};startDay(s,city,boundary);}planNight(s,t);ensureDailyCoverage(s,city,t);expire(s,city,t);nightPulse(s,city,t);checkTasks(s,city,t);s.lastTime=t;}
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
 const q=reconcileExploreQuota(s),used=q.used[category],i=foundingPhase(s,city)?null:issue(s,city,category,"explore");
 if(i)q.used[category]=Math.min(EXPLORE_DAILY_LIMIT,used+1);
 return i;
}
function tripReward(s,base,scope,isTourist,t){const es=s.effects.filter(e=>t<e.expires&&(e.scope==="all"||e.scope===scope||isTourist&&e.scope==="tourist"));const multipliers=es.filter(e=>e.kind==="tripMultiplier"||e.kind==="touristMultiplier").map(e=>e.value);const delta=Math.min(0,...es.filter(e=>e.kind==="tripDelta").map(e=>e.value));return Math.max(0,Math.floor(base*Math.max(1,...multipliers)+delta));}
return {fresh,restore,grade,dayAt,start,deadline,issueDeadline,needsAdvance,noon:deadline,active,options,advance,explore,exploreRemaining,choose,checkTasks,tripReward};
}
if(typeof window!=='undefined')window.SMMayorCore={createMayorCore,MAYOR_EVENTS,MAYOR_CATEGORIES};
if(typeof module!=='undefined'&&module.exports)module.exports={createMayorCore,MAYOR_EVENTS,MAYOR_CATEGORIES};
