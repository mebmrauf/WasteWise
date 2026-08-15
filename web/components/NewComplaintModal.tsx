"use client";

import * as React from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { ErrorBanner } from "./ErrorBanner";
import { createComplaint } from "@/lib/api/complaints";

interface NewComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  limitedOptions?: boolean;
}

export function NewComplaintModal({ isOpen, onClose, onSuccess, limitedOptions }: NewComplaintModalProps) {
  const [pickupRequestId, setPickupRequestId] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [againstUserId, setAgainstUserId] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupRequestId.trim()) {
      setError("Please provide a Pickup Request ID.");
      return;
    }
    if (description.trim().length < 10) {
      setError("Description must be at least 10 characters long.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createComplaint({
        pickupRequestId: pickupRequestId.trim(),
        description: description.trim(),
        ...(againstUserId.trim() && !limitedOptions ? { againstUserId: againstUserId.trim() } : {}),
      });
      onSuccess();
      onClose();
      // Reset form
      setPickupRequestId("");
      setDescription("");
      setAgainstUserId("");
    } catch (err: any) {
      setError(err.message || "Failed to submit complaint.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="File a Complaint">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
        {error && <ErrorBanner title="Error">{error}</ErrorBanner>}

        <div>
          <label htmlFor="pickupRequestId" className="block text-body-sm font-medium text-neutral-700 mb-1">
            Pickup Request ID <span className="text-red-500">*</span>
          </label>
          <input
            id="pickupRequestId"
            type="text"
            className="w-full rounded-xl border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-body"
            value={pickupRequestId}
            onChange={(e) => setPickupRequestId(e.target.value)}
            placeholder="e.g. clabc123..."
            disabled={isSubmitting}
            required
          />
          <p className="text-xs text-neutral-500 mt-1">
            You must link this complaint to a specific pickup request.
          </p>
        </div>

        {!limitedOptions && (
          <div>
            <label htmlFor="againstUserId" className="block text-body-sm font-medium text-neutral-700 mb-1">
              Complaint Against (User ID) <span className="text-neutral-400 font-normal">(Optional)</span>
            </label>
            <input
              id="againstUserId"
              type="text"
              className="w-full rounded-xl border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-body"
              value={againstUserId}
              onChange={(e) => setAgainstUserId(e.target.value)}
              placeholder="If this is about a specific person"
              disabled={isSubmitting}
            />
          </div>
        )}

        <div>
          <label htmlFor="description" className="block text-body-sm font-medium text-neutral-700 mb-1">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            rows={4}
            className="w-full rounded-xl border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-body"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Please describe the issue in detail..."
            disabled={isSubmitting}
            required
            minLength={10}
            maxLength={1000}
          />
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isSubmitting || !pickupRequestId.trim() || description.trim().length < 10}>
            {isSubmitting ? "Submitting..." : "Submit Complaint"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
