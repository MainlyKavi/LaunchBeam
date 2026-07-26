import type {
  AnalyticsDatum,
  AnalyticsRange,
  ProjectAnalytics,
} from "@/lib/analytics-dashboard";

export function AnalyticsView({
  analytics,
  range,
}: {
  analytics: ProjectAnalytics;
  range: AnalyticsRange;
}) {
  const metrics = [
    {
      label: "Unique visitors",
      value: analytics.uniqueVisitors.toLocaleString(),
    },
    { label: "Page views", value: analytics.pageViews.toLocaleString() },
    { label: "Subscribers", value: analytics.subscribers.toLocaleString() },
    {
      label: "Confirmed",
      value: analytics.confirmedSubscribers.toLocaleString(),
    },
    {
      label: "Conversion",
      value: `${analytics.conversionRate.toFixed(1)}%`,
    },
    {
      label: "Referral signups",
      value: analytics.referralSignups.toLocaleString(),
    },
    { label: "Referral rate", value: `${analytics.referralRate.toFixed(1)}%` },
  ];

  return (
    <>
      <section className="analytics-metric-grid" aria-label="Project metrics">
        {metrics.map((metric) => (
          <article key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </section>

      <div className="analytics-primary-grid">
        <section className="analytics-card analytics-chart-card">
          <header>
            <div>
              <span>Audience</span>
              <h2>Signups over time</h2>
            </div>
          </header>
          <BarSeries
            data={analytics.signupSeries}
            emptyCopy="Share the published waitlist to see signups here."
          />
        </section>

        <DemandScoreCard analytics={analytics} />
      </div>

      <section className="analytics-card analytics-chart-card">
        <header>
          <div>
            <span>Reach</span>
            <h2>Visitors over time</h2>
          </div>
          <strong>{range === "all" ? "All time" : range}</strong>
        </header>
        <BarSeries
          data={analytics.visitorSeries}
          emptyCopy="Page views will appear after the public waitlist receives traffic."
        />
      </section>

      <div className="analytics-breakdown-grid">
        <BreakdownCard title="Traffic sources" data={analytics.trafficSources} />
        <BreakdownCard title="UTM campaigns" data={analytics.campaigns} />
        <BreakdownCard title="Devices" data={analytics.devices} />
        <BreakdownCard title="Countries" data={analytics.countries} />
        <section className="analytics-card breakdown-card">
          <header>
            <h2>Top referrers (all time)</h2>
          </header>
          {analytics.topReferrers.length ? (
            <ol>
              {analytics.topReferrers.map((referrer) => (
                <li key={referrer.email}>
                  <span>{referrer.email}</span>
                  <strong>{referrer.count}</strong>
                </li>
              ))}
            </ol>
          ) : (
            <p className="analytics-empty-copy">
              Referral leaders will appear after subscribers share their links.
            </p>
          )}
        </section>
      </div>

      {analytics.truncated ? (
        <p className="analytics-data-note">
          Headline totals are exact. Charts and breakdowns show the most recent
          rows in this range because the safe detail window was reached.
        </p>
      ) : null}
    </>
  );
}

function BarSeries({
  data,
  emptyCopy,
}: {
  data: AnalyticsDatum[];
  emptyCopy: string;
}) {
  const maximum = Math.max(...data.map((item) => item.value), 0);
  if (!maximum) {
    return <p className="analytics-empty-copy large">{emptyCopy}</p>;
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const peak = data.reduce((highest, item) =>
    item.value > highest.value ? item : highest,
  );

  return (
    <div
      className="analytics-bars"
      role="list"
      aria-label={`Time series with ${data.length} periods and ${total.toLocaleString()} total events. Peak: ${peak.value.toLocaleString()} on ${peak.label}.`}
    >
      {data.map((item, index) => (
        <div
          className="analytics-bar-column"
          key={`${item.label}-${index}`}
          role="listitem"
          aria-label={`${item.label}: ${item.value.toLocaleString()}`}
          title={`${item.label}: ${item.value}`}
        >
          <span
            style={{
              height: `${Math.max(5, (item.value / maximum) * 100)}%`,
            }}
          />
          {data.length <= 10 || index % Math.ceil(data.length / 6) === 0 ? (
            <small>{item.label}</small>
          ) : (
            <small aria-hidden="true" />
          )}
        </div>
      ))}
    </div>
  );
}

function DemandScoreCard({ analytics }: { analytics: ProjectAnalytics }) {
  const { demandScore } = analytics;
  return (
    <section className="analytics-card demand-score-card">
      <header>
        <div>
          <span>Validation signal</span>
          <h2>Demand Score</h2>
        </div>
        <strong>
          {demandScore.eligible ? `${demandScore.score}/100` : "Collecting data"}
        </strong>
      </header>
      {demandScore.eligible && demandScore.score !== null ? (
        <>
          <div className="analytics-score-number">
            <strong>{demandScore.score}</strong>
            <span>/ 100</span>
          </div>
          <dl className="score-breakdown">
            <div>
              <dt>Conversion quality</dt>
              <dd>{demandScore.components.conversion}</dd>
            </div>
            <div>
              <dt>Referral activity</dt>
              <dd>{demandScore.components.referral}</dd>
            </div>
            <div>
              <dt>Signup volume</dt>
              <dd>{demandScore.components.volume}</dd>
            </div>
            <div>
              <dt>Recent momentum</dt>
              <dd>{demandScore.components.momentum}</dd>
            </div>
          </dl>
        </>
      ) : (
        <div className="demand-threshold">
          <strong>
            {analytics.demandVisitors.toLocaleString()} /{" "}
            {demandScore.minimumVisitors}
          </strong>
          <p>
            Collect at least {demandScore.minimumVisitors} visitors before
            calculating a Demand Score.
          </p>
          <progress
            max={demandScore.minimumVisitors}
            value={Math.min(
              analytics.demandVisitors,
              demandScore.minimumVisitors,
            )}
            aria-label="Demand Score visitor threshold"
          />
        </div>
      )}
      <p className="demand-formula">
        40% conversion &middot; 25% referrals &middot; 20% volume &middot; 15%
        momentum
      </p>
    </section>
  );
}

function BreakdownCard({
  title,
  data,
}: {
  title: string;
  data: AnalyticsDatum[];
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return (
    <section className="analytics-card breakdown-card">
      <header>
        <h2>{title}</h2>
      </header>
      {data.length ? (
        <ol>
          {data.map((item) => (
            <li key={item.label}>
              <span>
                {item.label}
                <i
                  aria-hidden="true"
                  style={{
                    width: `${total ? (item.value / total) * 100 : 0}%`,
                  }}
                />
              </span>
              <strong>{item.value.toLocaleString()}</strong>
            </li>
          ))}
        </ol>
      ) : (
        <p className="analytics-empty-copy">No data in this period yet.</p>
      )}
    </section>
  );
}
