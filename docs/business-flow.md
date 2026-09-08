# Business flow

## Actors

| Role           | Who they are                                              | Can do                                          |
| -------------- | ------------------------------------------------------- | --------------------------------------------- |
| **MANUFACTURER** | the business giving the order / material (e.g. _Yash Garment_) | **read-only**: view Job Cards, status, activity, PDF, share; manage their Jobber contacts |
| **JOBBER**       | the workshop / karkhana doing the job-work (e.g. _ABC Jeans Workshop_) | create & edit Job Cards, run the status workflow, manage their Manufacturer contacts |
| **ADMIN**        | operator of this JOBCARD instance                      | first-run setup, create users, oversight (read) |

The **Manufacturer ↔ Jobber** relationship is many-to-many and is realised
through Job Cards. Every Job Card carries both `manufacturerId` and `jobberId`.

```
Yash Garment
 ├── ABC Jeans Workshop ── JC-1001, JC-1005, JC-1012
 └── Royal Jeans        ── JC-1003, JC-1008
```

## First run

1. No Admin exists → the app opens **`/setup`**. Create the first Admin
   (`POST /auth/setup`). The endpoint self-disables afterwards (`409`).
2. Admin creates users (`POST /users`): each JOBBER user is linked to a Jobber
   master record by name, each MANUFACTURER user to a Manufacturer master record
   by name (find-or-create).
3. `npm run seed` does 1–2 plus a linked pair and sample Job Cards for local dev.

## Jobber journey

```
Login  →  Jobber Dashboard
          "Which Manufacturer's work do I have to do?"
          summary tiles (Total / Pending / In Progress / Completed / Dispatched)
          + My Manufacturers (per-Manufacturer counts) + Recent Job Cards
          + [ + New Job Card ]

Manufacturers tab
  → (empty state) + Add Manufacturer  → name only, e.g. "Yash Garment"
    the Manufacturer becomes selectable when creating a Job Card

+ New Job Card
  1. Select Manufacturer (only ones you added)
  2. Job Card form, sections:
       Job Card Details  (number auto · date · short number/name · program/cutting dates)
       Fabric Details    (type · color · description · pana · MTR · average · PCS;
                          average/PCS auto-fill from MTR; calculated fields look different)
       Size Quantities   (large touch rows on mobile; Bulk Fill / Fill All / Clear All;
                          Total PCS + Average auto-calculated)
       Bale / Roll       (stacked cards, + Add; Count + Total MTR auto)
       Cutting           (pattern · marker L/W · lay length · layers · plies · pattern image:
                          Take Photo / Choose Photo — mobile-friendly, preview, replace/remove)
       Notes             (comfortable textarea; EN / HI / GU text supported)
  3. Sticky bottom bar: [ Cancel ] [ Save Job Card ] → "Saving…" → "Job Card Created"
     → navigate to Job Card Detail. Duplicate submits blocked; input never lost on failure.

Job Card Detail  (accordions: Details · Fabric · Sizes · Bale/Roll · Cutting · Notes · Activity)
  Status actions (only the valid ones for the current state):
    DRAFT        → [ Mark Ready ] [ Start Work ] [ Cancel ]
    READY        → [ Start Work ] [ Cancel ]
    IN_PROGRESS  → [ Mark Completed ] [ Cancel ]
    COMPLETED    → [ Dispatch ]           (dispatchStatus IN_FACTORY → DISPATCHED)
    DISPATCHED   → [ Bring Back ]
  [ Share ] (Web Share API, or copy link)   [ PDF ]   [ Edit ]   [ Delete ] (soft)
```

## Manufacturer journey

```
Login  →  Manufacturer Dashboard
          "Which Jobber has my work?"
          summary tiles + My Jobbers (per-Jobber counts)

Jobbers tab  →  + Add Jobber (name only)  →  tap a Jobber
  Jobber Detail: pair summary (this Manufacturer + this Jobber) + that pair's Job Cards
  Tap a Job Card  →  Job Card Detail in READ-ONLY mode
    • view everything, view status, view Activity timeline, generate PDF, Share
    • NO edit / delete / status / quantity / fabric / cutting / notes changes
      (buttons are absent; the API returns 403 READ_ONLY_ROLE regardless)
```

## Status model (two independent machines)

```
workStatus:     DRAFT ─ready→ READY ─start→ IN_PROGRESS ─complete→ COMPLETED
                  └────────── cancel ──────────┴──────────────→ CANCELLED (terminal)
dispatchStatus: IN_FACTORY ─dispatch (requires COMPLETED)→ DISPATCHED ─bring-back→ IN_FACTORY
```

Transitions are enforced by the backend (`WORK_TRANSITIONS` /
`DISPATCH_TRANSITIONS` in `modules/jobcards/jobcard.constants.ts`). The frontend
only renders buttons that map to a currently-valid action.

## Activity / audit

Every meaningful action writes an append-only `audit_logs` entry
(`JOBCARD_CREATED`, `WORK_STARTED`, `WORK_COMPLETED`, `DISPATCHED`,
`BROUGHT_BACK`, `WORK_CANCELLED`, `JOBCARD_UPDATED`, `MANUFACTURER_LINKED`,
`JOBBER_LINKED`). The Job Card Detail "Activity" section renders them grouped by
day (Today / Yesterday / date). Audit history is never deleted.

## Isolation guarantees (also covered by automated tests)

- Manufacturer A can **never** see Manufacturer B's Job Cards.
- Jobber X can **never** see Jobber Y's Job Cards (list or by id → `404`).
- A Manufacturer can **never** create / edit / progress / delete a Job Card.
- A Jobber can only create a Job Card for a Manufacturer they have added.
- Enforcement is server-side (service layer query scoping); the UI merely
  reflects it.
