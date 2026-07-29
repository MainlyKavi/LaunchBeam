import Link from "next/link";
import { Download, Search } from "lucide-react";
import { notFound } from "next/navigation";
import {
  SubscriberTable,
  type SubscriberListItem,
} from "@/components/subscribers/subscriber-table";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOwnedProject } from "@/lib/project-queries";
import "./subscribers.css";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const validStatuses = new Set(["all", "pending", "subscribed", "unsubscribed"]);
const validSorts = new Set(["newest", "oldest", "position", "referrals"]);

function safeSearch(value: string) {
  return value.replace(/[%(),]/g, "").trim().slice(0, 100);
}

export default async function ProjectSubscribersPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{
    q?: string;
    status?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  const project = await getOwnedProject(projectId);
  if (!project) notFound();

  const search = safeSearch(query.q ?? "");
  const status = validStatuses.has(query.status ?? "")
    ? query.status!
    : "all";
  const sort = validSorts.has(query.sort ?? "") ? query.sort! : "newest";
  const page = Math.max(1, Math.min(10_000, Number(query.page) || 1));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createServerSupabaseClient();
  let request = supabase
    .from("subscribers")
    .select(
      "id,email,name,custom_answer,status,position,referral_count,referred_by,utm_source,utm_medium,utm_campaign,created_at",
      { count: "exact" },
    )
    .eq("project_id", projectId);

  if (search) {
    request = request.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
  }
  if (status !== "all") {
    request = request.eq(
      "status",
      status as "pending" | "subscribed" | "unsubscribed",
    );
  }

  if (sort === "oldest") request = request.order("created_at");
  if (sort === "position") request = request.order("position");
  if (sort === "referrals") {
    request = request.order("referral_count", { ascending: false });
  }
  if (sort === "newest") {
    request = request.order("created_at", { ascending: false });
  }
  request = request.order("id", { ascending: true });

  const { data, count, error } = await request.range(from, to);
  if (error) throw new Error("Subscribers could not be loaded.");

  const referrerIds = Array.from(
    new Set(
      (data ?? [])
        .map((row) => row.referred_by)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const referrerEmails = new Map<string, string>();
  if (referrerIds.length) {
    const { data: referrers } = await supabase
      .from("subscribers")
      .select("id,email")
      .eq("project_id", projectId)
      .in("id", referrerIds);
    referrers?.forEach((referrer) =>
      referrerEmails.set(referrer.id, referrer.email),
    );
  }

  const subscribers: SubscriberListItem[] = (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    customAnswer: row.custom_answer,
    status: row.status,
    position: row.position,
    referralCount: row.referral_count,
    referredByEmail: row.referred_by
      ? (referrerEmails.get(row.referred_by) ?? null)
      : null,
    utmSource: row.utm_source,
    utmMedium: row.utm_medium,
    utmCampaign: row.utm_campaign,
    createdAt: row.created_at,
  }));
  const subscriberVersion = subscribers
    .map(
      (subscriber) =>
        `${subscriber.id}:${subscriber.status}:${subscriber.position}:${subscriber.referralCount}:${subscriber.createdAt}`,
    )
    .join("|");
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildPageUrl = (targetPage: number) => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (status !== "all") params.set("status", status);
    if (sort !== "newest") params.set("sort", sort);
    params.set("page", String(targetPage));
    return `?${params.toString()}`;
  };

  return (
    <main className="subscribers-page">
      <header className="project-page-header">
        <div>
          <Link href="/dashboard">Dashboard</Link>
          <span>/</span>
          <Link href={`/dashboard/projects/${projectId}/edit`}>
            {project.name}
          </Link>
        </div>
        <p className="dashboard-eyebrow">Audience</p>
        <h1>Subscribers</h1>
        <p>
          Search, review attribution, update status, or export the audience
          behind this launch.
        </p>
        <a
          className="dashboard-button secondary"
          href={`/api/projects/${projectId}/export`}
        >
          <Download size={16} aria-hidden="true" />
          Export CSV
        </a>
      </header>

      <form className="subscriber-filters" method="get">
        <label className="subscriber-search">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search by email or name</span>
          <input
            name="q"
            type="search"
            defaultValue={search}
            placeholder="Search email or name"
          />
        </label>
        <label>
          <span className="sr-only">Filter by status</span>
          <select name="status" defaultValue={status}>
            <option value="all">All statuses</option>
            <option value="subscribed">Subscribed</option>
            <option value="pending">Pending</option>
            <option value="unsubscribed">Unsubscribed</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Sort subscribers</span>
          <select name="sort" defaultValue={sort}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="position">Waitlist position</option>
            <option value="referrals">Most referrals</option>
          </select>
        </label>
        <button type="submit">Apply</button>
      </form>

      <div className="subscriber-summary">
        <strong>{total.toLocaleString()}</strong>
        <span>{total === 1 ? "subscriber" : "subscribers"}</span>
      </div>

      <SubscriberTable
        key={`${page}:${status}:${sort}:${search}:${subscriberVersion}`}
        projectId={projectId}
        subscribers={subscribers}
      />

      {totalPages > 1 ? (
        <nav className="subscriber-pagination" aria-label="Subscriber pages">
          {page > 1 ? <Link href={buildPageUrl(page - 1)}>Previous</Link> : <span />}
          <span>
            Page {Math.min(page, totalPages)} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={buildPageUrl(page + 1)}>Next</Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </main>
  );
}
