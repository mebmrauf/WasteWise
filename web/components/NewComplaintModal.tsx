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
  const [requestId, setRequestId] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [againstUserId, setAgainstUserId] = React.useState("");
  const [photos, setPhotos] = React.useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestId.trim()) {
      setError("Please provide a Request ID.");
      return;
    }
    if (description.trim().length < 10) {
      setError("Description must be at least 10 characters long.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("requestId", requestId.trim());
      formData.append("description", description.trim());
      if (againstUserId.trim() && !limitedOptions) {
        formData.append("againstUserId", againstUserId.trim());
      }
      photos.forEach(photo => {
        formData.append("photos", photo);
      });

      await createComplaint(formData);
      onSuccess();
      onClose();
      // Reset form
      setRequestId("");
      setDescription("");
      setAgainstUserId("");
      setPhotos([]);
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
          <label htmlFor="requestId" className="block text-body-sm font-medium text-neutral-700 mb-1">
            Request ID <span className="text-red-500">*</span>
          </label>
          <input
            id="requestId"
            type="text"
            className="w-full rounded-xl border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-body"
            value={requestId}
            onChange={(e) => setRequestId(e.target.value)}
            placeholder="e.g. A1B2C3"
            disabled={isSubmitting}
            required
          />
          <p className="text-xs text-neutral-500 mt-1">
            You must link this complaint to a specific pickup or bulk request.
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

        <div>
          <label htmlFor="photos" className="block text-body-sm font-medium text-neutral-700 mb-1">
            Attachments (Optional)
          </label>
          <input
            id="photos"
            type="file"
            accept="image/jpeg, image/png, image/webp"
            multiple
            className="w-full text-body-sm"
            disabled={isSubmitting}
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length > 2) {
                setError("You can only attach a maximum of 2 photos.");
                e.target.value = "";
                return;
              }
              const oversized = files.find(f => f.size > 2 * 1024 * 1024);
              if (oversized) {
                setError("Each photo must be 2MB or smaller.");
                e.target.value = "";
                return;
              }
              setError(null);
              setPhotos(files);
            }}
          />
          <p className="text-xs text-neutral-500 mt-1">
            Max 2 photos, up to 2MB each (JPEG, PNG, or WebP).
          </p>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isSubmitting || !requestId.trim() || description.trim().length < 10}>
            {isSubmitting ? "Submitting..." : "Submit Complaint"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
