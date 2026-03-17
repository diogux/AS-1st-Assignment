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
                    .AddAspNetCoreInstrumentation()
                    /*options =>*/
                    /*{*/
                    /*    options.EnrichWithHttpRequest = (activity, request) =>*/
                    /*    {*/
                    /*        // i dont think this is necessary*/
                    /*        activity.SetTag("http.status_code", request.StatusCode);*/
                    /*    };*/
                    /*})*/
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
                    .AddAspNetCoreInstrumentation()
                    .AddHttpClientInstrumentation()
                    .AddRuntimeInstrumentation()
                    .AddOtlpExporter(options =>
                    {
                        options.Endpoint = new Uri(configuration["OTEL_EXPORTER_OTLP_ENDPOINT"] ?? "http://localhost:4317");
                    });
            });
    }
}