import { calculateDemandScore } from "@/lib/demand-score";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AnalyticsRange = "7d" | "30d" | "90d" | "all";

type EventRow = {
  event_type:
    | "page_view"
    | "signup"
    | "referral_visit"
    | "referral_signup"
    | "share_click";
  session_id: string | null;
  referrer: string | null;
  country: string | null;
  device_type: string | null;
  metadata: unknown;
  created_at: string;
};

type SubscriberAnalyticsRow = {
  id: string;
  status: "pending" | "subscribed" | "unsubscribed";
  referred_by: string | null;
  referral_count: number;
  created_at: string;
};

type ServerSupabaseClient = Awaited<
  ReturnType<typeof createServerSupabaseClient>
>;

const ANALYTICS_PAGE_SIZE = 1_000;
const MAXIMUM_EVENT_ROWS = 10_000;
const MAXIMUM_SUBSCRIBER_ROWS = 5_000;

export type AnalyticsDatum = { label: string; value: number };

export type ProjectAnalytics = {
  uniqueVisitors: number;
  demandVisitors: number;
  pageViews: number;
  subscribers: number;
  confirmedSubscribers: number;
  conversionRate: number;
  referralSignups: number;
  referralVisits: number;
  shareClicks: number;
  referralRate: number;
  signupSeries: AnalyticsDatum[];
  visitorSeries: AnalyticsDatum[];
  trafficSources: AnalyticsDatum[];
  campaigns: AnalyticsDatum[];
  topReferrers: Array<{ email: string; count: number }>;
  devices: AnalyticsDatum[];
  countries: AnalyticsDatum[];
  demandScore: ReturnType<typeof calculateDemandScore>;
  truncated: boolean;
};

function startForRange(range: AnalyticsRange) {
  if (range === "all") return null;
  const days = Number.parseInt(range, 10);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return start.toISOString();
}

function metadataString(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, 200)
    : null;
}

function increment(map: Map<string, number>, key: string, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function topData(map: Map<string, number>, limit = 6): AnalyticsDatum[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, value]) => ({ label, value }));
}

function isMissingAnalyticsTotalsRpc(error: {
  code?: string;
  message?: string;
}): boolean {
  if (error.code === "PGRST202" || error.code === "42883") {
    return true;
  }
  const message = error.message?.toLowerCase() ?? "";
  return (
    message.includes("get_project_analytics_totals") &&
    (message.includes("could not find") ||
      message.includes("does not exist") ||
      message.includes("schema cache"))
  );
}

function sourceFromEvent(event: EventRow) {
  const utmSource = metadataString(event.metadata, "utmSource");
  if (utmSource) return utmSource;
  if (!event.referrer) return "Direct";
  try {
    return new URL(event.referrer).hostname.replace(/^www\./, "");
  } catch {
    return "Direct";
  }
}

function createSeries(
  events: Array<{ created_at: string }>,
  range: AnalyticsRange,
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  let bucketSize = range === "90d" ? 3 : 1;
  if (range === "all" && events.length > 0) {
    const earliest = events.reduce(
      (minimum, event) =>
        Math.min(minimum, new Date(event.created_at).getTime()),
      today.getTime(),
    );
    const elapsedDays =
      Math.floor((today.getTime() - earliest) / 86_400_000) + 1;
    bucketSize = Math.max(1, Math.ceil(elapsedDays / 30));
    days = Math.ceil(elapsedDays / bucketSize) * bucketSize;
  } else if (range === "all") {
    days = 30;
  }
  const formatter = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  });
  const buckets: Array<{ start: Date; end: Date; label: string; value: number }> =
    [];
  for (let index = days - 1; index >= 0; index -= bucketSize) {
    const start = new Date(today);
    start.setDate(today.getDate() - index);
    const end = new Date(start);
    end.setDate(start.getDate() + bucketSize);
    buckets.push({
      start,
      end,
      label: formatter.format(start),
      value: 0,
    });
  }

  for (const event of events) {
    const date = new Date(event.created_at);
    const bucket = buckets.find(
      (candidate) => date >= candidate.start && date < candidate.end,
    );
    if (bucket) bucket.value += 1;
  }

  return buckets.map(({ label, value }) => ({ label, value }));
}

async function fetchEvents(
  supabase: ServerSupabaseClient,
  projectId: string,
  start: string | null,
): Promise<EventRow[]> {
  const rows: EventRow[] = [];
  for (
    let offset = 0;
    offset < MAXIMUM_EVENT_ROWS;
    offset += ANALYTICS_PAGE_SIZE
  ) {
    const finalRow = Math.min(
      offset + ANALYTICS_PAGE_SIZE - 1,
      MAXIMUM_EVENT_ROWS - 1,
    );
    let request = supabase
      .from("events")
      .select(
        "event_type,session_id,referrer,country,device_type,metadata,created_at",
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, finalRow);
    if (start) request = request.gte("created_at", start);

    const { data, error } = await request;
    if (error) throw new Error("Analytics events could not be loaded.");
    const page = (data ?? []) as EventRow[];
    rows.push(...page);
    if (page.length < finalRow - offset + 1) break;
  }
  return rows;
}

async function fetchSubscribers(
  supabase: ServerSupabaseClient,
  projectId: string,
  start: string | null,
): Promise<SubscriberAnalyticsRow[]> {
  const rows: SubscriberAnalyticsRow[] = [];
  for (
    let offset = 0;
    offset < MAXIMUM_SUBSCRIBER_ROWS;
    offset += ANALYTICS_PAGE_SIZE
  ) {
    const finalRow = Math.min(
      offset + ANALYTICS_PAGE_SIZE - 1,
      MAXIMUM_SUBSCRIBER_ROWS - 1,
    );
    let request = supabase
      .from("subscribers")
      .select("id,status,referred_by,referral_count,created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, finalRow);
    if (start) request = request.gte("created_at", start);

    const { data, error } = await request;
    if (error) throw new Error("Analytics subscribers could not be loaded.");
    const page = (data ?? []) as SubscriberAnalyticsRow[];
    rows.push(...page);
    if (page.length < finalRow - offset + 1) break;
  }
  return rows;
}

export async function getProjectAnalytics(
  projectId: string,
  range: AnalyticsRange,
): Promise<ProjectAnalytics> {
  const supabase = await createServerSupabaseClient();
  const start = startForRange(range);

  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * 86_400_000).toISOString();
  const fourteenDaysAgo = new Date(now - 14 * 86_400_000).toISOString();

  const [
    events,
    subscribers,
    rangeTotalsResult,
    uniqueVisitorsResult,
    allConfirmedResult,
    allReferralResult,
    recentResult,
    previousResult,
    topReferrersResult,
  ] = await Promise.all([
    fetchEvents(supabase, projectId, start),
    fetchSubscribers(supabase, projectId, start),
    supabase.rpc("get_project_analytics_totals", {
      p_project_id: projectId,
      p_start: start,
    }),
    supabase.rpc("get_project_unique_visitors", {
      p_project_id: projectId,
    }),
    supabase
      .from("subscribers")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("status", "subscribed"),
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("event_type", "referral_signup"),
    supabase
      .from("subscribers")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("status", "subscribed")
      .gte("created_at", sevenDaysAgo),
    supabase
      .from("subscribers")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("status", "subscribed")
      .gte("created_at", fourteenDaysAgo)
      .lt("created_at", sevenDaysAgo),
    supabase
      .from("subscribers")
      .select("email,referral_count")
      .eq("project_id", projectId)
      .eq("status", "subscribed")
      .gt("referral_count", 0)
      .order("referral_count", { ascending: false })
      .limit(6),
  ]);

  if (
    (rangeTotalsResult.error &&
      !isMissingAnalyticsTotalsRpc(rangeTotalsResult.error)) ||
    uniqueVisitorsResult.error ||
    allConfirmedResult.error ||
    allReferralResult.error ||
    recentResult.error ||
    previousResult.error ||
    topReferrersResult.error
  ) {
    throw new Error("Analytics could not be loaded.");
  }

  const pageViewEvents = events.filter(
    (event) => event.event_type === "page_view",
  );
  const referralSignupEvents = events.filter(
    (event) => event.event_type === "referral_signup",
  );
  const referralVisits = events.filter(
    (event) => event.event_type === "referral_visit",
  ).length;
  const shareClicks = events.filter(
    (event) => event.event_type === "share_click",
  ).length;
  const validSubscribers = subscribers.filter(
    (subscriber) => subscriber.status !== "unsubscribed",
  );
  const confirmedSubscriberRows = subscribers.filter(
    (subscriber) => subscriber.status === "subscribed",
  );
  const rangeTotals = rangeTotalsResult.error
    ? null
    : rangeTotalsResult.data?.[0] ?? null;
  const uniqueVisitors = rangeTotals
    ? Math.max(0, Number(rangeTotals.unique_visitors))
    : new Set(
        pageViewEvents
          .map((event) => event.session_id)
          .filter((id): id is string => Boolean(id)),
      ).size;
  const pageViews = rangeTotals
    ? Math.max(0, Number(rangeTotals.page_views))
    : pageViewEvents.length;
  const subscriberTotal = rangeTotals
    ? Math.max(0, Number(rangeTotals.subscribers))
    : validSubscribers.length;
  const confirmedSubscribers = rangeTotals
    ? Math.max(0, Number(rangeTotals.confirmed_subscribers))
    : confirmedSubscriberRows.length;
  const referralSignups = rangeTotals
    ? Math.max(0, Number(rangeTotals.referral_signups))
    : referralSignupEvents.length;
  const allUniqueVisitors = Math.max(
    0,
    Number(uniqueVisitorsResult.data ?? 0),
  );
  const conversionRate = uniqueVisitors
    ? (subscriberTotal / uniqueVisitors) * 100
    : 0;
  const referralRate = subscriberTotal
    ? (referralSignups / subscriberTotal) * 100
    : 0;

  const sources = new Map<string, number>();
  const campaigns = new Map<string, number>();
  const devices = new Map<string, number>();
  const countries = new Map<string, number>();
  for (const event of pageViewEvents) {
    increment(sources, sourceFromEvent(event));
    increment(
      campaigns,
      metadataString(event.metadata, "utmCampaign") ?? "No campaign",
    );
    increment(devices, event.device_type || "Unknown");
    increment(countries, event.country || "Unknown");
  }

  return {
    uniqueVisitors,
    demandVisitors: allUniqueVisitors,
    pageViews,
    subscribers: subscriberTotal,
    confirmedSubscribers,
    conversionRate,
    referralSignups,
    referralVisits,
    shareClicks,
    referralRate,
    signupSeries: createSeries(validSubscribers, range),
    visitorSeries: createSeries(pageViewEvents, range),
    trafficSources: topData(sources),
    campaigns: topData(campaigns),
    topReferrers: (topReferrersResult.data ?? []).map((row) => ({
      email: row.email,
      count: row.referral_count,
    })),
    devices: topData(devices),
    countries: topData(countries),
    demandScore: calculateDemandScore({
      uniqueVisitors: allUniqueVisitors,
      signups: allConfirmedResult.count ?? 0,
      referralSignups: allReferralResult.count ?? 0,
      recentSignups: recentResult.count ?? 0,
      previousSignups: previousResult.count ?? 0,
    }),
    truncated:
      events.length >= MAXIMUM_EVENT_ROWS ||
      subscribers.length >= MAXIMUM_SUBSCRIBER_ROWS,
  };
}
