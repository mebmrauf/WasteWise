"use client";

import * as React from "react";
import { format } from "date-fns";
import { PaymentRecord } from "@/lib/api/payments";
import { 
  Receipt, 
  CheckCircle2, 
  XCircle, 
  Search, 
  CreditCard, 
  Banknote, 
  Clock, 
  Wallet,
  FileText,
  User,
  Truck,
  Building2,
  ListFilter
} from "lucide-react";
import { Button } from "./Button";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

interface PaymentHistoryTableProps {
  payments: PaymentRecord[];
  type: "received" | "made";
}

export function PaymentHistoryTable({ payments, type }: PaymentHistoryTableProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [methodFilter, setMethodFilter] = React.useState<string>("ALL");

  const handleDownloadReceipt = (payment: PaymentRecord) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("WasteWise Payment Receipt", 14, 22);

    doc.setFontSize(12);
    doc.text(`Transaction ID: ${payment.transactionId || payment.id}`, 14, 32);
    doc.text(`Date: ${format(new Date(payment.createdAt), "PPpp")}`, 14, 38);
    
    doc.text(`Payment Method: ${payment.paymentMethod}`, 14, 48);
    doc.text(`Status: ${payment.status}`, 14, 54);

    doc.text(`From: ${payment.payer.fullName} (${payment.payer.email})`, 14, 64);
    doc.text(`To: ${payment.customer.fullName} (${payment.customer.email})`, 14, 70);

    const relatedId = payment.pickupId || payment.bulkRequestId || "N/A";
    const requestType = payment.pickupId ? "Smart Pickup" : "Bulk Pickup";

    doc.text(`Related Request: ${requestType} - #${relatedId.slice(-6).toUpperCase()}`, 14, 80);

    doc.setFontSize(14);
    doc.text(`Total Amount: BDT ${payment.amount.toLocaleString()}`, 14, 95);

    doc.save(`receipt-${payment.id.slice(-6)}.pdf`);
  };

  // Derived Summary Stats
  const stats = React.useMemo(() => {
    let totalPayments = payments.length;
    let totalAmount = 0;
    let sslCommerzCount = 0;
    let codCount = 0;
    let pendingCount = 0;
    let completedCount = 0;

    payments.forEach(p => {
      if (p.status === "COMPLETED") {
        totalAmount += p.amount;
        completedCount++;
      }
      if (p.status === "PENDING") pendingCount++;
      if (p.paymentMethod === "SSLCOMMERZ") sslCommerzCount++;
      if (p.paymentMethod === "COD") codCount++;
    });

    return { totalPayments, totalAmount, sslCommerzCount, codCount, pendingCount, completedCount };
  }, [payments]);

  // Filtered Payments
  const filteredPayments = React.useMemo(() => {
    return payments.filter(p => {
      const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
      const matchesMethod = methodFilter === "ALL" || p.paymentMethod === methodFilter;
      
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        !searchQuery ||
        p.id.toLowerCase().includes(searchLower) ||
        (p.transactionId && p.transactionId.toLowerCase().includes(searchLower)) ||
        (p.pickupId && p.pickupId.toLowerCase().includes(searchLower)) ||
        (p.bulkRequestId && p.bulkRequestId.toLowerCase().includes(searchLower)) ||
        p.customer.fullName.toLowerCase().includes(searchLower) ||
        p.payer.fullName.toLowerCase().includes(searchLower);

      return matchesStatus && matchesMethod && matchesSearch;
    });
  }, [payments, statusFilter, methodFilter, searchQuery]);

  return (
    <div className="flex flex-col gap-8">
      {/* Summary Statistic Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm flex flex-col justify-center items-start">
          <div className="flex items-center gap-2 text-neutral-500 mb-2">
            <Receipt className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Total</span>
          </div>
          <span className="text-2xl font-bold text-neutral-900">{stats.totalPayments}</span>
        </div>
        
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 shadow-sm flex flex-col justify-center items-start">
          <div className="flex items-center gap-2 text-emerald-700 mb-2">
            <Wallet className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              {type === "received" ? "Received" : "Paid"}
            </span>
          </div>
          <span className="text-2xl font-bold text-emerald-700">৳{stats.totalAmount.toLocaleString()}</span>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 shadow-sm flex flex-col justify-center items-start">
          <div className="flex items-center gap-2 text-blue-700 mb-2">
            <CreditCard className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Online</span>
          </div>
          <span className="text-2xl font-bold text-blue-700">{stats.sslCommerzCount}</span>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 shadow-sm flex flex-col justify-center items-start">
          <div className="flex items-center gap-2 text-amber-700 mb-2">
            <Banknote className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">COD</span>
          </div>
          <span className="text-2xl font-bold text-amber-700">{stats.codCount}</span>
        </div>

        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 shadow-sm flex flex-col justify-center items-start">
          <div className="flex items-center gap-2 text-orange-700 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Pending</span>
          </div>
          <span className="text-2xl font-bold text-orange-700">{stats.pendingCount}</span>
        </div>

        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 shadow-sm flex flex-col justify-center items-start">
          <div className="flex items-center gap-2 text-emerald-700 mb-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Completed</span>
          </div>
          <span className="text-2xl font-bold text-emerald-700">{stats.completedCount}</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="relative w-full md:max-w-md h-10">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="w-4 h-4 text-neutral-400" />
          </div>
          <input 
            type="text"
            placeholder="Search by ID, name..."
            className="w-full h-full pl-10 pr-4 bg-white border border-neutral-200 rounded-xl text-sm text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <div className="flex items-center gap-2 shrink-0 h-10">
            <ListFilter className="w-4 h-4 text-neutral-400" />
            <select
              className="h-full bg-white border border-neutral-200 rounded-xl px-3 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2 shrink-0 h-10">
            <select
              className="h-full bg-white border border-neutral-200 rounded-xl px-3 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
            >
              <option value="ALL">All Methods</option>
              <option value="SSLCOMMERZ">Online (SSL)</option>
              <option value="COD">Cash (COD)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cards List */}
      {filteredPayments.length === 0 ? (
        <div className="rounded-3xl border border-neutral-200 bg-white p-12 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center mb-4">
            <Receipt className="w-10 h-10 text-neutral-300" />
          </div>
          <h3 className="text-xl font-bold text-neutral-900">No payments found</h3>
          <p className="mt-2 text-neutral-500 max-w-sm mx-auto">
            Completed payment transactions will appear here. Try adjusting your filters if you're looking for something specific.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPayments.map((payment) => {
            const isCompleted = payment.status === "COMPLETED";
            const isPending = payment.status === "PENDING";
            const isOnline = payment.paymentMethod === "SSLCOMMERZ";
            
            return (
              <div key={payment.id} className="group bg-white border border-neutral-200 rounded-3xl p-6 flex flex-col gap-5 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-neutral-500 font-semibold uppercase tracking-wider mb-1">
                      {payment.pickupId ? "Smart Pickup" : "Bulk Pickup"}
                    </p>
                    <p className="text-3xl font-black text-neutral-900 tracking-tight">
                      ৳{payment.amount.toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-2 items-end">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      isCompleted ? "bg-emerald-100 text-emerald-700" :
                      isPending ? "bg-orange-100 text-orange-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {payment.status}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${
                      isOnline ? "bg-blue-100 text-blue-700" : 
                      payment.paymentMethod === "NOT_SELECTED" ? "bg-neutral-100 text-neutral-500" : 
                      "bg-neutral-100 text-neutral-600"
                    }`}>
                      {isOnline ? <CreditCard size={12} /> : payment.paymentMethod === "NOT_SELECTED" ? <Clock size={12} /> : <Banknote size={12} />}
                      {payment.paymentMethod === "SSLCOMMERZ" ? "Online" : payment.paymentMethod === "NOT_SELECTED" ? "Not Selected" : "Cash"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 py-4 border-y border-neutral-100 my-1">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs text-neutral-500 font-medium">Customer</p>
                      <p className="text-sm font-semibold text-neutral-900 truncate">{payment.customer.fullName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                      {payment.bulkRequestId ? (
                        <Building2 className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Truck className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs text-neutral-500 font-medium">
                        {payment.bulkRequestId ? "Recycling Company" : "Collector"}
                      </p>
                      <p className="text-sm font-semibold text-neutral-900 truncate">{payment.payer.fullName}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 text-sm text-neutral-600">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Date & Time</span>
                    <span className="font-medium">{format(new Date(payment.createdAt), "MMM d, yyyy h:mm a")}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Request ID</span>
                    <span className="font-medium text-neutral-900">
                      #{payment.pickupId ? payment.pickupId.slice(-6).toUpperCase() : payment.bulkRequestId?.slice(-6).toUpperCase()}
                    </span>
                  </div>
                  {isOnline && payment.transactionId && (
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-500">Transaction ID</span>
                      <span className="font-mono text-xs font-semibold text-neutral-900 truncate max-w-[120px]">
                        {payment.transactionId}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-auto pt-2">
                  <Button 
                    variant="secondary" 
                    className="flex-1 flex justify-center items-center gap-2"
                    onClick={() => handleDownloadReceipt(payment)}
                    disabled={isPending}
                  >
                    <FileText size={16} />
                    {isPending ? "Not Available" : "Receipt"}
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="flex-1 flex justify-center items-center bg-neutral-100/50 hover:bg-neutral-100 border border-transparent hover:border-neutral-200"
                    onClick={() => handleDownloadReceipt(payment)}
                    disabled={isPending}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
