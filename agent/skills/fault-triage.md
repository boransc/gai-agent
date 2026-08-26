---
description: Use when a customer describes a symptom instead of naming a job — the car won't start, there's a strange noise, a warning light is on, or they say they don't know what's wrong — and the right service has to be worked out before anything can be quoted.
---

# Working out what's actually wrong

The customer describes symptoms. Your job is to turn that into **one configured
service** plus a `faultDescription` good enough to estimate from. You are
narrowing down which service to quote — you are not diagnosing the car.

Ask at most two or three questions before moving on. This is an enquiry form,
not an interrogation, and the mechanic will see the vehicle anyway.

## "It won't start"

This splits several ways, and the distinction matters because a battery is a
fixed-price job while an unknown no-start is charged as diagnostic time.

Ask: **what happens when you turn the key?**

- **Nothing at all** — no lights, no dash, completely dead → strongly suggests
  a flat or failed battery.
- **Clicking, or the engine turns slowly** → also points at the battery, or its
  connections.
- **Dash lights come on but the engine doesn't turn** → could be the starter or
  the battery. Not clear-cut.
- **Engine turns over normally but won't fire** → not a battery. Fuel, spark or
  sensors. This is diagnostic work.

Two useful follow-ups: **how old is the battery**, and **did it happen suddenly
or has it been getting slower**? A battery that's over about five years old and
has been cranking sluggishly is a much safer call than one that died overnight
with no warning.

Route it as **battery replacement** only when the customer themselves is
confident it's the battery — they've tested it, had it jump-started
successfully, or it's old and failing gradually. Anything ambiguous is
**won't start / diagnostics**. Getting this wrong in the customer's favour is
worse than asking: quoting a battery for what turns out to be a starter motor
sets up a price that won't hold.

## "There's a noise"

Ask **where from, when does it happen, and does it change with speed or
braking?**

- **Squealing or grinding when braking** → brake pads. Route as **brake pad
  replacement**. Grinding in particular means the pads are likely gone, so say
  plainly that it needs looking at soon.
- **Knocking, whining, rumbling, or anything not tied to braking** → **strange
  noise / diagnostics**.

If braking is involved at all, treat it as brake work rather than a general
noise — it's the safer route, and brake jobs get human review anyway.

## Warning lights

A dashboard light is almost never enough to name a repair. Ask **which light,
and what colour**. Red generally means stop driving; amber generally means get
it checked.

Route as **won't start / diagnostics** if the car also won't run, otherwise
**strange noise / diagnostics** as the general investigation service. Tell them
the visit covers finding the fault, and the repair is quoted separately.

If they can photograph the dashboard, that's genuinely more reliable than a
description — invite it.

## When to stop and get a person involved

Say the enquiry needs a human, and don't try to talk them through it, if they
mention:

- smoke, burning smells, or anything overheating
- brakes that failed or went to the floor
- steering that feels loose or wrong
- the car having been in an accident

These reach a mechanic regardless — the configured review rules catch them —
but don't be casual about them in the meantime.

## What this skill does not change

- The **quote still comes from the tools**, in the same order, every time. This
  only helps you pick the right `serviceId` and write a useful
  `faultDescription`.
- **Never name a cause as if it's settled.** Say "that sounds like it could be
  the battery", never "your battery is dead". You have not seen the car.
- **Never estimate a price, a duration, or a part cost yourself**, even one the
  customer suggests. If they ask what a starter motor costs, that isn't a
  configured service and you don't know.
- If a symptom maps to work the business doesn't offer, say so plainly instead
  of routing it to the nearest service that happens to be on the list.
