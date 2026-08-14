"use client";

import * as React from "react";
import { TreePine, ShoppingBag, Droplets, X, Loader2, Gift } from "lucide-react";
import { Button } from "@/components/Button";
import { claimPlatinumGift } from "@/lib/api/rewards";

export type PlatinumGift = "TREE_SAPLING" | "ECO_TOTE_BAG" | "REUSABLE_WATER_BOTTLE";

interface PlatinumGiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClaimed: (gift: string, claimDate: string, nextEligibleDate: string) => void;
}

const GIFTS = [
  {
    id: "TREE_SAPLING",
    name: "Tree Sapling",
    icon: TreePine,
    description: "A small tree sapling to plant and nurture.",
  },
  {
    id: "ECO_TOTE_BAG",
    name: "Eco-friendly Tote Bag",
    icon: ShoppingBag,
    description: "A reusable, sustainable canvas tote bag.",
  },
  {
    id: "REUSABLE_WATER_BOTTLE",
    name: "Reusable Water Bottle",
    icon: Droplets,
    description: "A high-quality stainless steel water bottle.",
  },
];

export function PlatinumGiftModal({ isOpen, onClose, onClaimed }: PlatinumGiftModalProps) {
  const [selectedGift, setSelectedGift] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleClaim = async () => {
    if (!selectedGift) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await claimPlatinumGift(selectedGift);
      onClaimed(res.selectedGift, res.giftClaimDate, res.nextGiftEligibleDate);
      onClose();
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-slide-up">
        <div className="flex justify-between items-center p-6 border-b border-neutral-100">
          <h2 className="text-xl font-semibold text-neutral-900 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-100 text-pink-600 shrink-0"><Gift className="w-4 h-4" /></div> Claim Your Platinum Gift
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-neutral-100 transition-colors">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-neutral-600 mb-6 text-sm">Select one gift. You can only claim one gift per reward cycle (every 6 months).</p>
          
          <div className="grid gap-4 mb-6">
            {GIFTS.map((gift) => (
              <button
                key={gift.id}
                onClick={() => setSelectedGift(gift.id)}
                className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left
                  ${selectedGift === gift.id 
                    ? "border-primary-500 bg-primary-50" 
                    : "border-neutral-200 hover:border-primary-300 hover:bg-neutral-50"
                  }`}
              >
                <div className={`p-3 rounded-full ${selectedGift === gift.id ? "bg-primary-100 text-primary-700" : "bg-neutral-100 text-neutral-600"}`}>
                  <gift.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900">{gift.name}</h3>
                  <p className="text-sm text-neutral-500 mt-1">{gift.description}</p>
                </div>
                <div className="ml-auto flex items-center self-center">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                    ${selectedGift === gift.id ? "border-primary-500" : "border-neutral-300"}`}>
                    {selectedGift === gift.id && <div className="w-3 h-3 bg-primary-500 rounded-full" />}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {error && <p className="text-error-600 text-sm mb-4 bg-error-50 p-3 rounded-lg">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleClaim} disabled={!selectedGift || isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirm Selection
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
