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

    public static readonly Counter<int> PricingCacheRequests = Meter.CreateCounter<int>(
        "nop_pricing_cache_requests",
        description: "Number of pricing cache hits and misses");

    // Price calculation duration
    public static readonly Histogram<double> PriceCalculationDuration = Meter.CreateHistogram<double>(
        "nop_price_calculation_duration",
        unit: "ms",
        description: "Duration of price calculation");
}