# Critique

## What Helped

nopCommerce's layered architecture made instrumentation unusually clean. Because business logic lives in the service layer and everything (web UI, API, background jobs) goes through it, three instrumentation points were enough to cover the entire flow. In a controller-heavy codebase that would have taken 30+.

DI being pervasive also helped. Adding `services.AddNopOpenTelemetry(...)` at startup was all it took to wire everything up. The built-in instrumentation for ASP.NET Core and SQL Client handled the HTTP and database spans automatically, so custom spans only needed to fill the gap in between.

## What Hindered

The pricing cache was the main friction point. `IStaticCacheManager.GetAsync` doesn't expose whether a request was a hit or a miss, it just returns the value. The workaround was a captured `isCacheMiss` flag inside the cache lambda, which works because the lambda only executes on a miss. It's functional but fragile; a `CacheResult<T>` return type with hit/miss metadata would have made this trivial.

`GetFinalPriceAsync` is also a problem for observability. Tier pricing, discount evaluation, and final assembly all happen inside one method, so a single `CalculatePrice` span is all you get. There's no way to tell which part is slow without refactoring the method itself, which isn't worth the risk on a pricing-critical path.

## Surgical Changes

Three files were modified. In `ProductService`, a span and two metrics were wrapped around the existing search logic. The only careful part was the `pageSize > 1` filter on the empty search counter. Internal code calls the same method with `pageSize=1` for existence checks, and without the filter those would pollute the metric.

In `PriceCalculationService`, the cache call was restructured so the stopwatch and metric recording happen inside the lambda. This adds a small closure allocation per cache miss, which is acceptable at normal call rates.

In `ProductController`, a span and view counter were added at the HTTP entry point. This was the only change in the presentation layer, justified because HTTP status codes are only knowable there.

In all three cases the business logic was untouched. Instrumentation wraps existing behaviour, it doesn't change it.

## What I Would Change Going Forward

The cache interface is the most valuable fix: returning hit/miss metadata from `GetAsync` would eliminate the lambda hack and make cache visibility automatic for any future instrumentation work.

## On IEventPublisher

I thought about instrumenting the event publisher, however I later decided against it. The "search and view product" flow is query-centric and fires no entity events, so wrapping `HandleEventAsync` calls in child spans would have added overhead with zero signal for this specific flow. It would also have introduced instrumentation that isn't visible in the Grafana dashboard or Jaeger traces for the use case being tested, making it noise rather than insight. For a write-heavy flow like order placement or product publishing, where event handlers are actually on the critical path, it would be the right call.