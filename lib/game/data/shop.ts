export interface ShopListing {
  id: string
  price: number  // gold cost to buy
}

// World position of the shopkeeper NPC (near player spawn at 0,0)
export const SHOP_NPC_X = 4
export const SHOP_NPC_Y = -3

export const SHOP_INTERACT_RANGE = 2.5

// Items the shop sells (buy prices are slightly above item base value)
export const SHOP_BUY_ITEMS: ShopListing[] = [
  { id: 'hp_potion_s',   price: 30  },
  { id: 'hp_potion_m',   price: 80  },
  { id: 'hp_potion_l',   price: 200 },
  { id: 'energy_pot',    price: 50  },
  { id: 'atk_potion',    price: 120 },
  { id: 'def_potion',    price: 120 },
  { id: 'taming_snare',  price: 80  },
  { id: 'soothe_balm',   price: 60  },
  { id: 'beast_collar',  price: 350 },
  { id: 'bronze_sword',  price: 60  },
  { id: 'leather_chaps', price: 70  },
  { id: 'iron_shield',   price: 120 },
]

// Items sell back at this fraction of their base value
export const SELL_RATIO = 0.4
