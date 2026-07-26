"use client";

import { useState } from "react";
import { Check, Copy, MoreHorizontal } from "lucide-react";

export type SubscriberListItem = {
  id: string;
  email: string;
  name: string | null;
  customAnswer: string | null;
  status: "pending" | "subscribed" | "unsubscribed";
  position: number;
  referralCount: number;
  referredByEmail: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  createdAt: string;
};

export function SubscriberTable({
  projectId,
  subscribers,
}: {
  projectId: string;
  subscribers: SubscriberListItem[];
}) {
  const [items, setItems] = useState(subscribers);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function copyEmail(subscriber: SubscriberListItem) {
    await navigator.clipboard.writeText(subscriber.email);
    setCopiedId(subscriber.id);
    window.setTimeout(() => setCopiedId(null), 1500);
  }

  async function updateStatus(subscriber: SubscriberListItem) {
    const nextStatus =
      subscriber.status === "unsubscribed" ? "subscribed" : "unsubscribed";
    setWorkingId(subscriber.id);
    setError("");
    try {
      const response = await fetch(
        `/api/projects/${projectId}/subscribers/${subscriber.id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        },
      );
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error || "Unable to update the subscriber.");
      }
      setItems((current) =>
        current.map((item) =>
          item.id === subscriber.id ? { ...item, status: nextStatus } : item,
        ),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to update the subscriber.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function removeSubscriber(subscriber: SubscriberListItem) {
    const confirmed = window.confirm(
      `Remove ${subscriber.email}? This cannot be undone.`,
    );
    if (!confirmed) return;
    setWorkingId(subscriber.id);
    setError("");
    try {
      const response = await fetch(
        `/api/projects/${projectId}/subscribers/${subscriber.id}`,
        { method: "DELETE" },
      );
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error || "Unable to remove the subscriber.");
      }
      setItems((current) =>
        current.filter((item) => item.id !== subscriber.id),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to remove the subscriber.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  if (!items.length) {
    return (
      <div className="subscriber-empty">
        <span aria-hidden="true">@</span>
        <h2>No subscribers match these filters.</h2>
        <p>Try a broader search or share the published waitlist.</p>
      </div>
    );
  }

  return (
    <>
      {error ? (
        <p className="subscriber-action-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="subscriber-table-wrap">
        <table className="subscriber-table">
          <thead>
            <tr>
              <th>Subscriber</th>
              <th>Status</th>
              <th>Position</th>
              <th>Referrals</th>
              <th>Attribution</th>
              <th>Joined</th>
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((subscriber) => (
              <tr key={subscriber.id}>
                <td data-label="Subscriber">
                  <strong>{subscriber.email}</strong>
                  {subscriber.name ? <span>{subscriber.name}</span> : null}
                  {subscriber.customAnswer ? (
                    <small title={subscriber.customAnswer}>
                      {subscriber.customAnswer}
                    </small>
                  ) : null}
                </td>
                <td data-label="Status">
                  <span className={`subscriber-status is-${subscriber.status}`}>
                    {subscriber.status}
                  </span>
                </td>
                <td data-label="Position">#{subscriber.position}</td>
                <td data-label="Referrals">{subscriber.referralCount}</td>
                <td data-label="Attribution">
                  <span>
                    {subscriber.utmSource || "Direct"}
                    {subscriber.utmMedium
                      ? ` / ${subscriber.utmMedium}`
                      : ""}
                  </span>
                  {subscriber.utmCampaign ? (
                    <small>{subscriber.utmCampaign}</small>
                  ) : null}
                  {subscriber.referredByEmail ? (
                    <small>via {subscriber.referredByEmail}</small>
                  ) : null}
                </td>
                <td data-label="Joined">
                  {new Intl.DateTimeFormat("en", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(subscriber.createdAt))}
                </td>
                <td className="subscriber-row-actions">
                  <details>
                    <summary aria-label={`Actions for ${subscriber.email}`}>
                      <MoreHorizontal size={18} aria-hidden="true" />
                    </summary>
                    <div>
                      <button
                        type="button"
                        onClick={() => copyEmail(subscriber)}
                      >
                        {copiedId === subscriber.id ? (
                          <Check size={14} />
                        ) : (
                          <Copy size={14} />
                        )}
                        {copiedId === subscriber.id ? "Copied" : "Copy email"}
                      </button>
                      <button
                        type="button"
                        disabled={workingId === subscriber.id}
                        onClick={() => updateStatus(subscriber)}
                      >
                        {subscriber.status === "unsubscribed"
                          ? "Resubscribe"
                          : "Unsubscribe"}
                      </button>
                      <button
                        type="button"
                        className="danger"
                        disabled={workingId === subscriber.id}
                        onClick={() => removeSubscriber(subscriber)}
                      >
                        Remove
                      </button>
                    </div>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
