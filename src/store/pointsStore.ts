import { create } from "zustand";
import { getLevel } from "@/lib/points/economy";
import type { DanceItem } from "@/lib/mmd/modelData";

interface PurchaseItem {
  itemType: string;
  itemId: string;
  cost: number;
  purchasedAt: string;
}

interface RefundedItem {
  itemId: string;
  cost: number;
}

interface PointsState {
  points: number;
  totalEarned: number;
  level: { level: number; name: string; nextThreshold: number | null };
  purchases: PurchaseItem[];
  dances: DanceItem[];
  refunded: RefundedItem[];
  isLoading: boolean;
  fetchPoints: () => Promise<void>;
  fetchDances: () => Promise<void>;
  purchaseItem: (itemType: string, itemId: string) => Promise<boolean>;
}

export const usePointsStore = create<PointsState>((set, get) => ({
  points: 0,
  totalEarned: 0,
  level: getLevel(0),
  purchases: [],
  dances: [],
  refunded: [],
  isLoading: false,

  fetchPoints: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch("/api/points");
      if (res.ok) {
        const data = await res.json();
        set({
          points: data.points,
          totalEarned: data.totalEarned,
          level: data.level,
          purchases: data.purchases,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  fetchDances: async () => {
    try {
      const res = await fetch("/api/dances");
      if (res.ok) {
        const data = await res.json();
        set({ dances: data.dances || [] });
        if (data.refunded?.length) {
          set({ refunded: data.refunded });
          get().fetchPoints();
        }
      }
    } catch {}
  },

  purchaseItem: async (itemType: string, itemId: string) => {
    try {
      const res = await fetch("/api/shop/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemType, itemId }),
      });
      if (res.ok) {
        await get().fetchPoints();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },
}));
