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
const MAXIMUM_PAGE_VIEW_ROWS = 10_000;
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

async function fetchPageViews(
  supabase: ServerSupabaseClient,
  projectId: string,
  start: string | null,
): Promise<EventRow[]> {
  const rows: EventRow[] = [];
  for (
    let offset = 0;
    offset <= MAXIMUM_PAGE_VIEW_ROWS;
    offset += ANALYTICS_PAGE_SIZE
  ) {
    const finalRow = Math.min(
      offset + ANALYTICS_PAGE_SIZE - 1,
      MAXIMUM_PAGE_VIEW_ROWS,
    );
    let request = supabase
      .from("events")
      .select(
        "event_type,session_id,referrer,country,device_type,metadata,created_at",
      )
      .eq("project_id", projectId)
      .eq("event_type", "page_view")
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
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
    offset <= MAXIMUM_SUBSCRIBER_ROWS;
    offset += ANALYTICS_PAGE_SIZE
  ) {
    const finalRow = Math.min(
      offset + ANALYTICS_PAGE_SIZE - 1,
      MAXIMUM_SUBSCRIBER_ROWS,
    );
    let request = supabase
      .from("subscribers")
      .select("id,status,referred_by,referral_count,created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
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
    uniqueVisitorsResult,
    allConfirmedResult,
    allReferralResult,
    recentResult,
    previousResult,
    topReferrersResult,
  ] = await Promise.all([
    fetchPageViews(supabase, projectId, start),
    fetchSubscribers(supabase, projectId, start),
    supabase.rpc("get_project_unique_visitors", {
      p_project_id: projectId,
    }),
    supabase
      .from("subscribers")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("status", "subscribed"),
    supabase
      .from("subscribers")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("status", "subscribed")
      .not("referred_by", "is", null),
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
  const uniqueVisitors = new Set(
    pageViewEvents
      .map((event) => event.session_id)
      .filter((id): id is string => Boolean(id)),
  ).size;
  const allUniqueVisitors = Math.max(
    0,
    Number(uniqueVisitorsResult.data ?? 0),
  );
  const validSubscribers = subscribers.filter(
    (subscriber) => subscriber.status !== "unsubscribed",
  );
  const confirmedSubscriberRows = subscribers.filter(
    (subscriber) => subscriber.status === "subscribed",
  );
  const confirmedSubscribers = confirmedSubscriberRows.length;
  const referralSignups = confirmedSubscriberRows.filter(
    (subscriber) => subscriber.referred_by,
  ).length;
  const conversionRate = uniqueVisitors
    ? (validSubscribers.length / uniqueVisitors) * 100
    : 0;
  const referralRate = validSubscribers.length
    ? (referralSignups / validSubscribers.length) * 100
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
    pageViews: pageViewEvents.length,
    subscribers: validSubscribers.length,
    confirmedSubscribers,
    conversionRate,
    referralSignups,
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
      events.length > MAXIMUM_PAGE_VIEW_ROWS ||
      subscribers.length > MAXIMUM_SUBSCRIBER_ROWS,
  };
}
