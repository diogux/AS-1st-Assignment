using System.Diagnostics;
using System.Diagnostics.Metrics;

namespace Nop.Core.Infrastructure;

/// <summary>
/// OpenTelemetry monitoring
/// </summary>
public static class NopMonitoring
{
    public const string ActivitySourceName = "Nop.Commerce";
    public const string MeterName = "Nop.Commerce";

    public static readonly ActivitySource ActivitySource = new(ActivitySourceName);
    public static readonly Meter Meter = new(MeterName);

    // Search delay metric
    public static readonly Histogram<double> SearchLatency = Meter.CreateHistogram<double>(
        "nop_search_latency",
        unit: "ms",
        description: "Latency of product searches");

    // Empty searches metric
    public static readonly Counter<int> EmptySearches = Meter.CreateCounter<int>(
        "nop_empty_searches",
        description: "Number of searches that returned zero results");

    // Product views metric
    public static readonly Counter<int> ProductViews = Meter.CreateCounter<int>(
        "nop_product_views",
        description: "Number of product page views");
}