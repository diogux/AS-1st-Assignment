using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Nop.Core.Infrastructure;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

namespace Nop.Web.Framework.Infrastructure.Extensions;

/// <summary>
/// Represents extensions to configure OpenTelemetry
/// </summary>
public static class OpenTelemetryServiceCollectionExtensions
{
    /// <summary>
    /// Add OpenTelemetry instrumentation and exporters
    /// </summary>
    /// <param name="services">Collection of service descriptors</param>
    /// <param name="configuration">Configuration</param>
    public static void AddNopOpenTelemetry(this IServiceCollection services, IConfiguration configuration)
    {
        var resourceBuilder = ResourceBuilder.CreateDefault()
            .AddService(NopMonitoring.ActivitySourceName);

        services.AddOpenTelemetry()
            .WithTracing(tracing =>
            {
                tracing
                    .SetResourceBuilder(resourceBuilder)
                    .AddSource(NopMonitoring.ActivitySourceName)
                    .AddAspNetCoreInstrumentation(options =>
                    {
                        options.EnrichWithHttpResponse = (activity, response) =>
                        {
                            activity.SetTag("http.status_code", response.StatusCode);
                        };
                    })
                    .AddHttpClientInstrumentation()
                    .AddSqlClientInstrumentation()
                    .AddOtlpExporter(options =>
                    {
                        options.Endpoint = new Uri(configuration["OTEL_EXPORTER_OTLP_ENDPOINT"] ?? "http://localhost:4317");
                    });
            })
            .WithMetrics(metrics =>
            {
                metrics
                    .SetResourceBuilder(resourceBuilder)
                    .AddMeter(NopMonitoring.MeterName)
                    .AddView("nop_price_calculation_duration", new ExplicitBucketHistogramConfiguration
                    {
                        Boundaries = [0.5, 1, 2, 3, 4, 5, 7.5, 10, 20, 50, 100, 250, 500]
                    })
                    .AddView("nop_search_latency", new ExplicitBucketHistogramConfiguration
                    {
                        Boundaries = [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000]
                    })
                    .AddAspNetCoreInstrumentation()
                    .AddHttpClientInstrumentation()
                    .AddRuntimeInstrumentation()
                    .AddOtlpExporter((exporterOptions, metricReaderOptions) =>
                    {
                        exporterOptions.Endpoint = new Uri(configuration["OTEL_EXPORTER_OTLP_ENDPOINT"] ?? "http://localhost:4317");
                        metricReaderOptions.PeriodicExportingMetricReaderOptions.ExportIntervalMilliseconds = 1000;
                    });
            });
    }
}