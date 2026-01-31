import type { MenuCategory, MenuItem, TaxType } from "@/lib/setupData";
import type {
  MenuItemModifiers,
  MenuItemModifierGroupLink,
  ModifierGroup,
  ModifierOption,
} from "@/lib/posData";

export const DEMO_RESTAURANT_ID = "demo";

type DemoPosMenu = {
  restaurantId: string;
  categories: MenuCategory[];
  items: MenuItem[];
  ivuRate: number;
  pricesIncludeTax: boolean;
};

function demoId(prefix: string, n: number) {
  return `${prefix}_${n}`;
}

export function getDemoPosMenuData(): DemoPosMenu {
  const categories: MenuCategory[] = [
    { id: demoId("cat", 1), restaurant_id: DEMO_RESTAURANT_ID, name: "Breakfast / Desayuno", color: "#FDE68A" },
    { id: demoId("cat", 2), restaurant_id: DEMO_RESTAURANT_ID, name: "Burgers", color: "#86EFAC" },
    { id: demoId("cat", 3), restaurant_id: DEMO_RESTAURANT_ID, name: "Drinks / Bebidas", color: "#93C5FD" },
  ];

  const items: MenuItem[] = [
    {
      id: demoId("item", 1),
      restaurant_id: DEMO_RESTAURANT_ID,
      category_id: categories[1].id,
      name: "Classic Burger",
      description: "Beef patty, lettuce, tomato, house sauce.",
      price: 9.99,
      image_path: null,
      sku: "BUR-CLSC",
      barcode: null,
      department: "Kitchen",
      unit: "each",
      is_weighted: false,
      is_active: true,
      sort_order: 10,
      tax_type: "state_tax" as TaxType,
    },
    {
      id: demoId("item", 2),
      restaurant_id: DEMO_RESTAURANT_ID,
      category_id: categories[0].id,
      name: "Mofongo",
      description: "Garlic mashed plantain. Choose protein.",
      price: 13.99,
      image_path: null,
      sku: "MOF-BASE",
      barcode: null,
      department: "Kitchen",
      unit: "each",
      is_weighted: false,
      is_active: true,
      sort_order: 20,
      tax_type: "state_tax" as TaxType,
    },
    {
      id: demoId("item", 3),
      restaurant_id: DEMO_RESTAURANT_ID,
      category_id: categories[2].id,
      name: "Coffee",
      description: "Hot brewed coffee.",
      price: 2.5,
      image_path: null,
      sku: "DRK-COF",
      barcode: null,
      department: "Bar",
      unit: "each",
      is_weighted: false,
      is_active: true,
      sort_order: 30,
      tax_type: "state_tax" as TaxType,
    },
  ];

  return {
    restaurantId: DEMO_RESTAURANT_ID,
    categories,
    items,
    ivuRate: 0.07,
    pricesIncludeTax: false,
  };
}

type DemoGroup = {
  group: ModifierGroup;
  options: ModifierOption[];
};

function group(id: string, name: string, description?: string | null): ModifierGroup {
  return {
    id,
    restaurant_id: DEMO_RESTAURANT_ID,
    name,
    description: description ?? null,
    is_active: true,
  };
}

function option(id: string, groupId: string, name: string, priceDelta: number, sortOrder: number): ModifierOption {
  return {
    id,
    restaurant_id: DEMO_RESTAURANT_ID,
    group_id: groupId,
    name,
    price_delta: priceDelta,
    is_active: true,
    sort_order: sortOrder,
  };
}

function link(
  id: string,
  menuItemId: string,
  groupId: string,
  isRequired: boolean,
  minSelect: number,
  maxSelect: number | null,
  sortOrder: number,
): MenuItemModifierGroupLink {
  return {
    id,
    restaurant_id: DEMO_RESTAURANT_ID,
    menu_item_id: menuItemId,
    group_id: groupId,
    is_required: isRequired,
    min_select: minSelect,
    max_select: maxSelect,
    sort_order: sortOrder,
  };
}

export function getDemoMenuItemModifiers(menuItemId: string): MenuItemModifiers {
  const burgerId = demoId("item", 1);
  const mofongoId = demoId("item", 2);
  const coffeeId = demoId("item", 3);

  const grpCheeseId = demoId("grp", 1);
  const grpAddonsId = demoId("grp", 2);
  const grpProteinId = demoId("grp", 3);
  const grpSizeId = demoId("grp", 4);

  const groups: Record<string, DemoGroup> = {
    [grpCheeseId]: {
      group: group(grpCheeseId, "Cheese", "Choose your cheese"),
      options: [
        option(demoId("opt", 1), grpCheeseId, "American", 0, 10),
        option(demoId("opt", 2), grpCheeseId, "Swiss", 0.5, 20),
        option(demoId("opt", 3), grpCheeseId, "Cheddar", 0.5, 30),
      ],
    },
    [grpAddonsId]: {
      group: group(grpAddonsId, "Burger Add-ons", "Extras for your burger"),
      options: [
        option(demoId("opt", 4), grpAddonsId, "Bacon", 2, 10),
        option(demoId("opt", 5), grpAddonsId, "Fried Egg", 1.5, 20),
        option(demoId("opt", 6), grpAddonsId, "Avocado", 1.5, 30),
      ],
    },
    [grpProteinId]: {
      group: group(grpProteinId, "Choose Protein", "Pick one protein"),
      options: [
        option(demoId("opt", 7), grpProteinId, "Pork Chunks (Chicharrón)", 0, 10),
        option(demoId("opt", 8), grpProteinId, "Chicken", 0, 20),
        option(demoId("opt", 9), grpProteinId, "Shrimp", 3, 30),
      ],
    },
    [grpSizeId]: {
      group: group(grpSizeId, "Size", "Choose drink size"),
      options: [
        option(demoId("opt", 10), grpSizeId, "Small", 0, 10),
        option(demoId("opt", 11), grpSizeId, "Medium", 0.5, 20),
        option(demoId("opt", 12), grpSizeId, "Large", 1, 30),
      ],
    },
  };

  const links: Array<{ link: MenuItemModifierGroupLink; groupId: string }> = [];

  if (menuItemId === burgerId) {
    links.push({
      link: link(demoId("lnk", 1), burgerId, grpCheeseId, false, 0, 1, 10),
      groupId: grpCheeseId,
    });
    links.push({
      link: link(demoId("lnk", 2), burgerId, grpAddonsId, false, 0, 3, 20),
      groupId: grpAddonsId,
    });
  }

  if (menuItemId === mofongoId) {
    links.push({
      link: link(demoId("lnk", 3), mofongoId, grpProteinId, true, 1, 1, 10),
      groupId: grpProteinId,
    });
  }

  if (menuItemId === coffeeId) {
    links.push({
      link: link(demoId("lnk", 4), coffeeId, grpSizeId, true, 1, 1, 10),
      groupId: grpSizeId,
    });
  }

  return links.map(({ link: l, groupId }) => ({
    link: l,
    group: groups[groupId].group,
    options: groups[groupId].options,
  }));
}
