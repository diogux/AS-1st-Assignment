# nopCommerce Event System - Simple Explanation

## 2 Event Handler (IEventPublisher)

This project uses **IEventPublisher** as an Observer pattern implementation.

Subscribers (IConsumer<T>)
- Location: `src/Libraries/Nop.Services/Events/IConsumer.cs`
- Listens for events and reacts
- Example: `src/Plugins/Nop.Plugin.Misc.News/Services/Events/EventConsumer.cs`

**Publishers (Services)**
- Location: Any service that publishes events (e.g., `OrderProcessingService`, `EntityRepository`)
- Announces when something happens
- Uses: `await _eventPublisher.PublishAsync(new OrderPlacedEvent(order))`

**Event Dispatcher (EventPublisher)**
- Location: `src/Libraries/Nop.Services/Events/EventPublisher.cs`
- Finds all subscribers and calls them sequentially

**Usage Example:**

```
// Publisher publishes
await _eventPublisher.PublishAsync(new OrderPlacedEvent(order));

// EventPublisher automatically finds all IConsumer<OrderPlacedEvent>
// and calls their HandleEventAsync() method
```

---

## The Core Idea

Think of it like a **notification system**:

- When something happens in the app (e.g., a product is inserted into the database), nopCommerce **announces it** (publishes an event)
- Other parts of the app that care about that event **listen for it** (implement consumers) and react automatically
- The part that announces doesn't need to know what listens—it just says "hey, something happened"

---

## The Three Main Players

### 1. **IEventPublisher** — The Announcer
- Says: "Hey everyone, an event just happened!"
- Has one job: publish events
- One method: `PublishAsync<TEvent>(TEvent @event)`
- Lives in the core

### 2. **IConsumer<T>** — The Listener
- Says: "I care about Event X, let me know when it happens"
- Listens for a **specific type** of event
- One method: `HandleEventAsync(T eventMessage)` — does something when event fires
- Can be in core or plugins

### 3. **EventPublisher** — The Delivery Person
- Takes an event from the announcer
- Finds all consumers listening for that event type
- Calls them one by one in order
- If one says "stop processing", it stops calling the others
- If one crashes, it logs the error but keeps going

---

## How It Works (Simple Flow)

```
1. Something happens in the app
   ↓
2. Code publishes an event: "A product was inserted!"
   ↓
3. EventPublisher finds all consumers listening for "product inserted"
   ↓
4. EventPublisher calls consumer 1: "Handle this event"
   ↓
5. EventPublisher calls consumer 2: "Handle this event"
   ↓
6. EventPublisher calls consumer 3: "Handle this event"
   ↓
7. All consumers have reacted (cache cleared, email sent, index updated, etc.)
```

---

## Real-World Example: Order Placed

**Scenario:** A customer places an order

**What happens:**
1. Order processing code saves order → publishes "OrderPlacedEvent"
2. Email consumer listens → sends order confirmation email
3. Inventory consumer listens → updates stock counts
4. Accounting consumer listens → records the transaction
5. Loyalty consumer listens → awards points to customer
6. Plugin consumer listens → does custom logic

**Key point:** Order processing code doesn't call these consumers directly. It just shouts "ORDER PLACED!" and they all react automatically.

---

## The "Stop Processing" Feature

Some events are special: they can stop other consumers from running.

**Example:** Price calculation
1. Core calculates default price: $100
2. Tier pricing adjusts it: $80 (doesn't stop)
3. Promotional pricing adjusts it: $60 (doesn't stop)
4. Custom plugin sets final price: $50 and says "STOP—use my price!"
5. No other pricing consumers run after this

This lets plugins **override** core behavior.

---

## Auto-Discovery Magic

At startup, nopCommerce:

1. **Scans** all code looking for classes that say "I listen to events" (implement `IConsumer<T>`)
2. **Registers** them in the dependency injection container—no manual setup needed
3. When an event fires, it **automatically finds** all the listeners

So if you create a new event consumer class, it **just works** without configuring anything.

---

## When to Use Events

### ✅ Do use for:
- **Side effects:** "When a product is saved, invalidate cache"
- **Plugins:** "Allow plugins to react to core events"
- **Loose coupling:** "Service A doesn't need to know about Service B"
- **Multiple reactions:** "When an order is placed, do 10 different things"

### ❌ Don't use for:
- **Direct dependencies:** "Service A needs data from Service B" → use DI
- **Sequential logic:** "First do X, then do Y, then do Z" → use domain services
- **Error handling:** "If step 2 fails, undo step 1" → transaction logic, not events

---

## What Events Exist?

nopCommerce has **built-in events** for common operations:

- **Entity operations:** `EntityInsertedEvent<T>`, `EntityUpdatedEvent<T>`, `EntityDeletedEvent<T>`
- **Business events:** `OrderPlacedEvent`, `OrderPaidEvent`, `CustomerRegisteredEvent`
- **UI events:** `ModelPreparedEvent` (before showing a page)
- **Custom events:** Anything your code publishes

---

## Summary Table

| Thing | Role | Example |
|-------|------|---------|
| **Event Publisher** | Finds & calls listeners | "OrderPlacedEvent was published" |
| **Event** | The notification | OrderPlacedEvent(order) |
| **Event Consumer** | Reacts to notification | Clear cache, send email, update inventory |
| **Stop Processing** | Halt other consumers | "I calculated the final price, stop" |

---

## Bottom Line

**nopCommerce events are a trigger system:**

- Code fires an event
- Listeners react automatically
- Multiple listeners can respond
- No tight coupling
- Plugins can extend without touching core code
