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

    // "business" metric 
    public static readonly Histogram<double> OrderValueProcessed = Meter.CreateHistogram<double>(
        "nop_order_value_processed",
        unit: "USD",
        description: "Total value of orders processed");

    // delay metric
    public static readonly Histogram<double> PaymentGatewayLatency = Meter.CreateHistogram<double>(
        "nop_payment_gateway_latency",
        unit: "ms",
        description: "Latency of payment gateway calls");

    // failure metric
    public static readonly Counter<int> PaymentFailures = Meter.CreateCounter<int>(
        "nop_payment_failures",
        description: "Number of failed payment attempts");
}