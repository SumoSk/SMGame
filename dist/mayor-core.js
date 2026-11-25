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
function createMayorCore(definitions, random=Math.random){
const keys=["admin","image","fame","government","people","business","integrity"], byId=new Map(definitions.map(d=>[d.id,d]));
const clone=x=>JSON.parse(JSON.stringify(x));
const dayAt=t=>Math.floor((t-360)/1440), start=d=>d*1440+360, noon=d=>start(d)+360;
const grade=v=>v>=86?"A":v>=71?"B":v>=51?"C":v>=26?"D":"F";
const clamp=v=>Math.max(0,Math.min(100,Math.trunc(v)));
function fresh(t){return {version:1,day:dayAt(t),lastTime:t,scores:Object.fromEntries(keys.map(k=>[k,60])),issues:[],effects:[],history:[],flags:[],suspendedUntil:null,sequence:0,unpaid:0,started:false};}
function restore(saved,t){if(!saved||saved.version!==1)return fresh(t);const s=clone(saved);for(const k of keys)s.scores[k]=clamp(Number.isFinite(s.scores[k])?s.scores[k]:60);return s;}
const active=(s,t)=>s.suspendedUntil!==null&&t<s.suspendedUntil;
function score(s,changes,t){let crossed=false;for(const [k,delta] of Object.entries(changes||{})){if(!keys.includes(k))continue;const before=s.scores[k];s.scores[k]=clamp(before+delta);if(before>25&&s.scores[k]<=25)crossed=true;}if(crossed&&!active(s,t))s.suspendedUntil=start(dayAt(t)+2);}
function count(level){if(level<=5)return 1;if(level<=10)return 1+(random()<.5?1:0);if(level<=20)return 2;if(level<=30)return 2+(random()<.5?1:0);if(level<=50)return 3;return 3+(random()<.5?1:0);}
function hasBuildings(need,city){return Object.entries(need||{}).every(([key,n])=>(city.buildingCounts?.[key]||0)>=n);}
function eligibleOption(s,o,city){if(!Object.entries(o.requires||{}).every(([k,n])=>s.scores[k]>=n)||!hasBuildings(o.requiresBuildings,city))return false;if(o.task?.kind==="build"){const b=city.catalog?.[o.task.key];if(!b||!b.unlocked||!Number.isFinite(b.cost)||b.cost<0||city.canBuild?.(o.task.key,o.task.count)!==true)return false;const net=Math.max(0,b.cost*o.task.count-(o.grant||0));if(net>Math.floor(Math.max(0,city.money)*.2))return false;}return true;}
function options(s,issue,city){const d=byId.get(issue.eventId);return d.choices.map((o,i)=>({index:i,...clone(o),enabled:eligibleOption(s,o,city),payable:Math.min(Math.max(0,Math.floor(o.cost||0)),Math.floor(Math.max(0,city.money)*.2))}));}
function candidates(s,city,category){return definitions.filter(d=>(!category||d.category===category)&&city.level>=d.minLevel&&hasBuildings(d.requiresBuildings,city)&&!s.issues.some(i=>i.eventId===d.id)&&(!d.choices.some(o=>o.task?.kind==="build")||d.category!=="government"||d.choices.some(o=>o.task?.kind==="build"&&eligibleOption(s,o,city))));}
function issue(s,city,category,source){const a=candidates(s,city,category);if(!a.length)return null;const d=a[Math.min(a.length-1,Math.floor(random()*a.length))];const i={id:++s.sequence,eventId:d.id,category:d.category,status:"pending",source,day:s.day};s.issues.push(i);return i;}
function startDay(s,city,t){s.started=true;if(active(s,t)||t>=noon(s.day))return;for(let i=0,n=count(city.level);i<n;i++)if(!issue(s,city,null,"daily"))break;}
function record(s,i,report,t){s.history.push({id:i.id,eventId:i.eventId,category:i.category,status:i.status,report,at:t});}
function apply(s,i,result,city,t){const r=result||{};if(r.money)city.money+=r.money;score(s,r.scores,t);for(const e of r.effects||[]){if(["floodDamage","fillPopulation"].includes(e.kind)){city.applyEffect?.(clone(e));}else if(t<start(i.day+1)){s.effects.push({...clone(e),expires:start(i.day+1),source:i.id});}}for(const flag of r.flags||[])if(!s.flags.includes(flag))s.flags.push(flag);record(s,i,r.report||"",t);return r.report||"";}
function choose(s,id,index,city,t){const i=s.issues.find(x=>x.id===id);if(!i||i.status!=="pending"||active(s,t)||dayAt(t)!==i.day||t>=noon(i.day))return {ok:false};const o=options(s,i,city)[index];if(!o?.enabled)return {ok:false};if(o.payable)city.money-=o.payable;if(o.grant)city.money+=o.grant;i.selected=index;i.paid=o.payable;i.grant=o.grant||0;if(o.task){i.status="working";i.task=clone(o.task);if(o.task.kind==="build")i.baseline=(city.buildingIds?.[o.task.key]||[]).slice();record(s,i,"รับภารกิจแล้ว",t);return {ok:true,working:true};}const won=o.chance===undefined||random()<o.chance;i.status=won?"success":"failed";i.rollWon=won;return {ok:true,won,report:apply(s,i,won?o.success:o.failure,city,t)};}
function finish(s,i,city,t,won){if(i.status!=="working")return false;const o=byId.get(i.eventId).choices[i.selected];i.status=won?"success":"failed";if(!won&&i.grant){const paid=Math.min(Math.max(0,city.money),i.grant);city.money-=paid;s.unpaid+=i.grant-paid;}apply(s,i,won?o.success:o.failure,city,t);return true;}
function checkTasks(s,city,t){for(const i of s.issues){if(i.status!=="working"||t>=start(i.day+1))continue;const task=i.task;let success=false;if(task.kind==="build"){const old=new Set(i.baseline);success=new Set((city.buildingIds?.[task.key]||[]).filter(id=>!old.has(id))).size>=task.count;}else if(task.kind==="performance"){success=Number.isFinite(city.performance)&&city.performance>=task.target;}if(success)finish(s,i,city,t,true);}}
function expire(s,city,t){for(const i of s.issues){if(i.status==="pending"&&t>=noon(i.day)){i.status="expired";apply(s,i,{scores:{[i.category]:-10},report:"ละเลยการตัดสินใจก่อนเที่ยง"},city,noon(i.day));}}}
function advance(s,city,t){if(t<s.lastTime)throw new Error("Mayor clock cannot run backward");if(!s.started)startDay(s,city,s.lastTime);while(s.day<dayAt(t)){const boundary=start(s.day+1);expire(s,city,boundary);for(const i of s.issues)if(i.status==="working")finish(s,i,city,boundary,false);s.effects=s.effects.filter(e=>e.expires>boundary);s.issues=[];s.day++;startDay(s,city,boundary);}expire(s,city,t);checkTasks(s,city,t);s.lastTime=t;}
function explore(s,city,category,t){if(!keys.includes(category)||active(s,t)||t>=noon(s.day)||dayAt(t)!==s.day||s.issues.some(i=>i.category===category&&["pending","working"].includes(i.status)))return null;return issue(s,city,category,"explore");}
function tripReward(s,base,scope,isTourist,t){const es=s.effects.filter(e=>t<e.expires&&(e.scope==="all"||e.scope===scope||isTourist&&e.scope==="tourist"));const multipliers=es.filter(e=>e.kind==="tripMultiplier"||e.kind==="touristMultiplier").map(e=>e.value);const delta=Math.min(0,...es.filter(e=>e.kind==="tripDelta").map(e=>e.value));return Math.max(0,Math.floor(base*Math.max(1,...multipliers)+delta));}
return {fresh,restore,grade,dayAt,start,noon,active,options,advance,explore,choose,checkTasks,tripReward};
}
if(typeof window!=='undefined')window.SMMayorCore={createMayorCore,MAYOR_EVENTS,MAYOR_CATEGORIES};
if(typeof module!=='undefined'&&module.exports)module.exports={createMayorCore,MAYOR_EVENTS,MAYOR_CATEGORIES};
