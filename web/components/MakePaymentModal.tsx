import * as React from "react";
import { X, CreditCard, Banknote } from "lucide-react";
import { Button } from "./Button";
import { authFetch } from "@/lib/api/auth";

interface MakePaymentModalProps {
  pickupId?: string;
  bulkRequestId?: string;
  amount: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function MakePaymentModal({ pickupId, bulkRequestId, amount, onClose, onSuccess }: MakePaymentModalProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = React.useState<"SSLCOMMERZ" | "COD" | null>(null);

  const handleProceed = async () => {
    if (!selectedMethod) return;
    setIsLoading(true);
    setError(null);
<<<<<<< HEAD
    try {
      const res = await authFetch<{ gatewayUrl?: string }>("/payments/initiate", {
        method: "POST",
        body: JSON.stringify({ pickupId, bulkRequestId }),
      });

      console.log("SSLCommerz Initiate Response:", res);

      if (!res?.gatewayUrl) {
        throw new Error("Failed to initialize SSLCommerz payment: Invalid gateway URL");
      }

      window.location.href = res.gatewayUrl;
    } catch (err: any) {
      setError(err.message || "Failed to initiate payment");
      setIsLoading(false);
    }
  };

  const handleCOD = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await authFetch("/payments/cod", {
        method: "POST",
        body: JSON.stringify({ pickupId, bulkRequestId }),
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to complete COD payment");
      setIsLoading(false);
=======

    if (selectedMethod === "SSLCOMMERZ") {
      try {
        const res = await authFetch<{ gatewayUrl?: string }>("/payments/initiate", {
          method: "POST",
          body: JSON.stringify({ pickupId, bulkRequestId }),
        });
        
        console.log("SSLCommerz Initiate Response:", res);
        
        if (!res?.gatewayUrl) {
          throw new Error("Failed to initialize SSLCommerz payment: Invalid gateway URL");
        }
        
        window.location.href = res.gatewayUrl;
      } catch (err: any) {
        setError(err.message || "Failed to initiate payment");
        setIsLoading(false);
      }
    } else if (selectedMethod === "COD") {
      try {
        await authFetch("/payments/cod", {
          method: "POST",
          body: JSON.stringify({ pickupId, bulkRequestId }),
        });
        onSuccess();
      } catch (err: any) {
        setError(err.message || "Failed to complete COD payment");
        setIsLoading(false);
      }
>>>>>>> 4d230576b3977a8f2212bcc00c70d81eee221d69
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-900/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-neutral-100 bg-neutral-50/50">
          <h2 className="text-xl font-bold text-neutral-900">Make Payment</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-white border border-neutral-200 text-neutral-500 hover:bg-neutral-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6">
          <div className="text-center">
            <p className="text-sm text-neutral-500 font-medium">Amount to Pay</p>
            <p className="text-4xl font-bold text-emerald-600 mt-2">৳{amount.toLocaleString()}</p>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>}

          <div className="flex flex-col gap-3 mt-4">
            <button
              onClick={() => setSelectedMethod("SSLCOMMERZ")}
              disabled={isLoading}
              className={`w-full flex justify-start items-center gap-4 py-4 px-6 border-2 rounded-xl transition-all ${
                selectedMethod === "SSLCOMMERZ"
                  ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-600/20"
                  : "border-neutral-200 bg-white text-neutral-700 hover:border-emerald-300 hover:bg-neutral-50"
              } ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
<<<<<<< HEAD
              <CreditCard size={20} />
              Pay Online (SSLCommerz)
            </Button>

            <Button
              variant="secondary"
              size="lg"
              className="w-full flex justify-center items-center gap-2 py-4 border-2"
              onClick={handleCOD}
=======
              <CreditCard size={24} className={selectedMethod === "SSLCOMMERZ" ? "text-emerald-600" : "text-neutral-400"} />
              <div className="flex flex-col items-start">
                <span className="font-semibold text-lg">Pay Online</span>
                <span className="text-xs font-medium opacity-80 mt-0.5">Secure payment via SSLCommerz</span>
              </div>
            </button>
            
            <button
              onClick={() => setSelectedMethod("COD")}
>>>>>>> 4d230576b3977a8f2212bcc00c70d81eee221d69
              disabled={isLoading}
              className={`w-full flex justify-start items-center gap-4 py-4 px-6 border-2 rounded-xl transition-all ${
                selectedMethod === "COD"
                  ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-600/20"
                  : "border-neutral-200 bg-white text-neutral-700 hover:border-emerald-300 hover:bg-neutral-50"
              } ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <Banknote size={24} className={selectedMethod === "COD" ? "text-emerald-600" : "text-neutral-400"} />
              <div className="flex flex-col items-start">
                <span className="font-semibold text-lg">Cash on Delivery</span>
                <span className="text-xs font-medium opacity-80 mt-0.5">Pay in cash when collected</span>
              </div>
            </button>
          </div>
        </div>

        <div className="p-6 pt-4 border-t border-neutral-100 bg-neutral-50 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleProceed} 
            disabled={isLoading || !selectedMethod} 
            className="bg-emerald-600 hover:bg-emerald-700 px-6"
          >
            {isLoading ? "Processing..." : "Proceed to Payment"}
          </Button>
        </div>
      </div>
    </div>
  );
}
