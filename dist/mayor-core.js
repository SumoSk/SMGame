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
function createMayorCore(definitions, random=Math.random){
const keys=["admin","image","fame","government","people","business","integrity"], byId=new Map(definitions.map(d=>[d.id,d]));
const clone=x=>JSON.parse(JSON.stringify(x));
const dayAt=t=>Math.floor((t-360)/1440), start=d=>d*1440+360, deadline=d=>start(d)+600;
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
function candidates(s,city,category){const pool=definitions.filter(d=>(!category||d.category===category)&&city.level>=d.minLevel&&hasBuildings(d.requiresBuildings,city)&&!s.issues.some(i=>i.eventId===d.id)&&(!d.choices.some(o=>o.task?.kind==="build")||d.category!=="government"||d.choices.some(o=>o.task?.kind==="build"&&eligibleOption(s,o,city))));const normal=pool.filter(d=>!d.fallbackOnly);return normal.length?normal:pool;}
function issue(s,city,category,source){const a=candidates(s,city,category);if(!a.length)return null;const d=a[Math.min(a.length-1,Math.floor(random()*a.length))];const i={id:++s.sequence,eventId:d.id,category:d.category,status:"pending",source,day:s.day};s.issues.push(i);return i;}
function ensureDailyCoverage(s,city,t){if(active(s,t)||t>=deadline(s.day))return;for(const category of keys)if(!s.issues.some(i=>i.category===category))issue(s,city,category,"daily");}
function startDay(s,city,t){s.started=true;if(active(s,t)||t>=deadline(s.day))return;ensureDailyCoverage(s,city,t);for(let i=1,n=count(city.level);i<n;i++)if(!issue(s,city,null,"daily"))break;}
function record(s,i,report,t,details=null){s.history.push({id:i.id,eventId:i.eventId,category:i.category,status:i.status,report,at:t,...(details?{details}: {})});}
function apply(s,i,result,city,t,cashBefore=city.money){const r=result||{},before={...s.scores};if(r.money)city.money+=r.money;score(s,r.scores,t);const scoreChanges=Object.fromEntries(Object.keys(r.scores||{}).filter(k=>keys.includes(k)).map(k=>[k,{before:before[k],after:s.scores[k],delta:s.scores[k]-before[k]}]));for(const e of r.effects||[]){if(["floodDamage","fillPopulation"].includes(e.kind)){city.applyEffect?.(clone(e));}else if(t<start(i.day+1)){s.effects.push({...clone(e),expires:start(i.day+1),source:i.id});}}for(const flag of r.flags||[])if(!s.flags.includes(flag))s.flags.push(flag);record(s,i,r.report||"",t,{money:r.money||0,scores:clone(r.scores||{}),effects:clone(r.effects||[]),paid:i.paid||0,grant:i.grant||0,scoreChanges,cashDelta:city.money-cashBefore});return r.report||"";}
function choose(s,id,index,city,t){const i=s.issues.find(x=>x.id===id);if(!i||i.status!=="pending"||active(s,t)||dayAt(t)!==i.day||t>=deadline(i.day))return {ok:false};const o=options(s,i,city)[index];if(!o?.enabled)return {ok:false};const cashBefore=city.money;if(o.payable)city.money-=o.payable;if(o.grant)city.money+=o.grant;i.selected=index;i.paid=o.payable;i.grant=o.grant||0;if(o.task){i.status="working";i.task=clone(o.task);if(o.task.kind==="build")i.baseline=(city.buildingIds?.[o.task.key]||[]).slice();record(s,i,"รับภารกิจแล้ว",t,{money:0,scores:{},effects:[],paid:i.paid,grant:i.grant,scoreChanges:{},cashDelta:city.money-cashBefore});return {ok:true,working:true};}const won=o.chance===undefined||random()<o.chance;i.status=won?"success":"failed";i.rollWon=won;return {ok:true,won,report:apply(s,i,won?o.success:o.failure,city,t,cashBefore)};}
function finish(s,i,city,t,won){if(i.status!=="working")return false;const o=byId.get(i.eventId).choices[i.selected];i.status=won?"success":"failed";const cashBefore=city.money;if(!won&&i.grant){const paid=Math.min(Math.max(0,city.money),i.grant);city.money-=paid;s.unpaid+=i.grant-paid;}apply(s,i,won?o.success:o.failure,city,t,cashBefore);return true;}
function checkTasks(s,city,t){for(const i of s.issues){if(i.status!=="working"||t>=start(i.day+1))continue;const task=i.task;let success=false;if(task.kind==="build"){const old=new Set(i.baseline);success=new Set((city.buildingIds?.[task.key]||[]).filter(id=>!old.has(id))).size>=task.count;}else if(task.kind==="performance"){success=Number.isFinite(city.performance)&&city.performance>=task.target;}if(success)finish(s,i,city,t,true);}}
function expire(s,city,t){for(const i of s.issues){if(i.status==="pending"&&t>=deadline(i.day)){i.status="expired";apply(s,i,{scores:{[i.category]:-10},report:"ละเลยการตัดสินใจก่อน 16:00"},city,deadline(i.day));}}}
function advance(s,city,t){if(t<s.lastTime)throw new Error("Mayor clock cannot run backward");if(!s.started)startDay(s,city,s.lastTime);while(s.day<dayAt(t)){const boundary=start(s.day+1);expire(s,city,boundary);for(const i of s.issues)if(i.status==="working")finish(s,i,city,boundary,false);s.effects=s.effects.filter(e=>e.expires>boundary);s.issues=[];s.day++;startDay(s,city,boundary);}ensureDailyCoverage(s,city,t);expire(s,city,t);checkTasks(s,city,t);s.lastTime=t;}
function explore(s,city,category,t){if(!keys.includes(category)||active(s,t)||t>=deadline(s.day)||dayAt(t)!==s.day||s.issues.some(i=>i.category===category&&["pending","working"].includes(i.status)))return null;return issue(s,city,category,"explore");}
function tripReward(s,base,scope,isTourist,t){const es=s.effects.filter(e=>t<e.expires&&(e.scope==="all"||e.scope===scope||isTourist&&e.scope==="tourist"));const multipliers=es.filter(e=>e.kind==="tripMultiplier"||e.kind==="touristMultiplier").map(e=>e.value);const delta=Math.min(0,...es.filter(e=>e.kind==="tripDelta").map(e=>e.value));return Math.max(0,Math.floor(base*Math.max(1,...multipliers)+delta));}
return {fresh,restore,grade,dayAt,start,deadline,noon:deadline,active,options,advance,explore,choose,checkTasks,tripReward};
}
if(typeof window!=='undefined')window.SMMayorCore={createMayorCore,MAYOR_EVENTS,MAYOR_CATEGORIES};
if(typeof module!=='undefined'&&module.exports)module.exports={createMayorCore,MAYOR_EVENTS,MAYOR_CATEGORIES};
