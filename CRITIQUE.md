# Critique

## What Helped

nopCommerce's layered architecture made instrumentation clean. Because business logic lives in the service layer and everything goes through it, three instrumentation points were enough to cover the entire flow. In a controller-heavy codebase that would require more spans.

DI being pervasive also helped. Adding `services.AddNopOpenTelemetry(...)` at startup was all that was necessary to wire everything up. 

## What Hindered

The pricing cache was the hardest part. `IStaticCacheManager.GetAsync` doesn't say if a request was a hit or a miss, it just returns the value. The workaround was a captured `isCacheMiss` flag inside the cache lambda, which works because the lambda only executes on a miss.

`GetFinalPriceAsync` is also a problem for observability. All pricing calculations happen inside one method, so the `CalculatePrice` span is what we have. To see which part exacly is slowing down, we would have to refactor the method.


## Things I would change

The cache interface is the most valuable fix: returning hit/miss metadata from `GetAsync` would eliminate the lambda hack and make cache visibility automatic for any future instrumentation work.
Refactoring `GetFinalPriceAsync` into smaller methods would be ideal as well.
Also, depending if the flow is supposed to change, maybe instrumenting the EventPublisher would be a good idea to get visibility on event handlers execution time.

## Changes I've Made

Three files were modified. In `ProductService`, a span and two metrics were wrapped around the existing search logic. The only "strange" part was the `pageSize > 1` filter on the empty search counter, I noticed that without it, the counter was being incremented multiple times.

In `PriceCalculationService`, the cache call was restructured so the stopwatch and metric recording happen inside the lambda. 

In `ProductController`, a span and view counter were added at the HTTP entry point. This was the only change in the presentation layer.

In all three cases the business logic was untouched. Instrumentation only wraps existing behaviour.

## On IEventPublisher

I thought about instrumenting the event publisher, however I later decided against it. The "search and view product" flow is focused on queries and fires no entity events, so wrapping `HandleEventAsync` calls in child spans would have added zero signal for this specific flow. For a write-heavy flow like the admin product publishing, where event handlers are actually on the critical path, it would probably be the best decision.