"use client";

import * as React from "react";
import { X, Heart, Leaf, Stethoscope, Users, GraduationCap, Trash2, Loader2 } from "lucide-react";
import { Button } from "./Button";
import { Icon } from "./Icon";

export interface CsrContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number, percentage: number | null, cause: string) => Promise<void>;
  paymentAmount: number;
}

const CAUSES = [
  { id: "Tree Plantation", icon: Leaf, color: "text-emerald-500", bg: "bg-emerald-100" },
  { id: "Community Health", icon: Stethoscope, color: "text-blue-500", bg: "bg-blue-100" },
  { id: "Elderly Care", icon: Users, color: "text-purple-500", bg: "bg-purple-100" },
  { id: "Education Support", icon: GraduationCap, color: "text-amber-500", bg: "bg-amber-100" },
  { id: "Environmental Cleanup", icon: Trash2, color: "text-teal-500", bg: "bg-teal-100" },
] as const;

export function CsrContributionModal({ isOpen, onClose, onConfirm, paymentAmount }: CsrContributionModalProps) {
  const [selectedPercentage, setSelectedPercentage] = React.useState<number | null>(5);
  const [customAmountStr, setCustomAmountStr] = React.useState<string>("");
  const [selectedCause, setSelectedCause] = React.useState<string>(CAUSES[0].id);
  const [isConfirming, setIsConfirming] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedPercentage(5);
      setCustomAmountStr("");
      setSelectedCause(CAUSES[0].id);
      setIsConfirming(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePercentageClick = (pct: number) => {
    setSelectedPercentage(pct);
    setCustomAmountStr("");
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedPercentage(null);
    setCustomAmountStr(e.target.value);
  };

  const donationAmount = selectedPercentage 
    ? Math.floor((paymentAmount * selectedPercentage) / 100) 
    : (parseInt(customAmountStr, 10) || 0);

  const isInvalidAmount = donationAmount <= 0 || donationAmount > paymentAmount || isNaN(donationAmount);

  const handlePrimaryClick = async () => {
    if (isInvalidAmount || !selectedCause) return;
    
    if (!isConfirming) {
      setIsConfirming(true);
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(donationAmount, selectedPercentage, selectedCause);
      onClose();
    } catch (err) {
      alert("Failed to submit CSR contribution. Please try again.");
      setIsConfirming(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-slide-up relative flex flex-col max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-600 transition-colors rounded-full hover:bg-neutral-100 z-10 bg-white/80 backdrop-blur-sm"
          disabled={isSubmitting}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8 overflow-y-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-full">
              <Heart className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-neutral-900">Support Sustainability Through CSR</h2>
          </div>
          
          {!isConfirming ? (
            <>
              <p className="text-neutral-600 mb-6">
                Your pickup has been completed successfully. Would you like to contribute a portion of this payment to a social or environmental cause?
              </p>
              
              <div className="mb-6 p-4 bg-neutral-50 rounded-xl border border-neutral-100 flex justify-between items-center">
                <span className="text-neutral-600 font-medium">Received Payment</span>
                <span className="text-xl font-bold text-neutral-900">৳{paymentAmount.toLocaleString()}</span>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-neutral-900 mb-3">Donation Amount</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handlePercentageClick(5)}
                    className={`py-3 rounded-xl border font-medium transition-colors ${
                      selectedPercentage === 5 
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700" 
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                    }`}
                  >
                    <div className="text-lg">5%</div>
                    <div className="text-xs opacity-80">৳{Math.floor((paymentAmount * 5) / 100).toLocaleString()}</div>
                  </button>
                  <button
                    onClick={() => handlePercentageClick(10)}
                    className={`py-3 rounded-xl border font-medium transition-colors ${
                      selectedPercentage === 10 
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700" 
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                    }`}
                  >
                    <div className="text-lg">10%</div>
                    <div className="text-xs opacity-80">৳{Math.floor((paymentAmount * 10) / 100).toLocaleString()}</div>
                  </button>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="Custom"
                      value={customAmountStr}
                      onChange={handleCustomAmountChange}
                      className={`w-full h-full py-3 px-3 rounded-xl border font-medium text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                        selectedPercentage === null 
                        ? "border-emerald-600 bg-white text-neutral-900" 
                        : "border-neutral-200 bg-white text-neutral-700"
                      }`}
                    />
                  </div>
                </div>
                {isInvalidAmount && selectedPercentage === null && customAmountStr !== "" && (
                  <p className="text-red-500 text-sm mt-2">Please enter a valid amount up to ৳{paymentAmount.toLocaleString()}</p>
                )}
              </div>

              <div className="mb-8">
                <label className="block text-sm font-semibold text-neutral-900 mb-3">Select a Cause</label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {CAUSES.map(cause => (
                    <button
                      key={cause.id}
                      onClick={() => setSelectedCause(cause.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        selectedCause === cause.id 
                        ? "border-emerald-600 bg-emerald-50/50" 
                        : "border-neutral-200 bg-white hover:border-neutral-300"
                      }`}
                    >
                      <div className={`p-2 rounded-full ${cause.bg} ${cause.color}`}>
                        <Icon icon={cause.icon as any} size="sm" />
                      </div>
                      <span className={`font-medium ${selectedCause === cause.id ? "text-emerald-900" : "text-neutral-700"}`}>
                        {cause.id}
                      </span>
                      {selectedCause === cause.id && (
                        <div className="ml-auto w-4 h-4 rounded-full bg-emerald-600 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={onClose}>
                  Skip
                </Button>
                <Button 
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white border-none" 
                  onClick={handlePrimaryClick}
                  disabled={isInvalidAmount || !selectedCause}
                >
                  Donate ৳{donationAmount.toLocaleString()}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                <Heart className="w-8 h-8 fill-current" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-2">Confirm Contribution</h3>
              <p className="text-neutral-600 mb-8 text-lg">
                Are you sure you want to donate <strong className="text-emerald-700">৳{donationAmount.toLocaleString()}</strong> to <strong className="text-neutral-900">{selectedCause}</strong>?
              </p>
              
              <div className="flex gap-3">
                <Button 
                  variant="secondary" 
                  className="flex-1" 
                  onClick={() => setIsConfirming(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white border-none" 
                  onClick={handlePrimaryClick}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                  Confirm Contribution
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
