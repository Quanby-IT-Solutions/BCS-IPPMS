# BCS IPPMS - Demo Presentation Guide (Role-Based Story Format)

> **How to present this system to executives.** Walk through one request end-to-end by switching between your real quick-access roles.

---

## The Story: "One Request, Six Role Perspectives"

**Scenario:** A division request is planned, approved, executed, circulated, and audited.

**Roles used in demo (Quick dev access):**
- Admin (Global)
- Planner (Operations)
- Approver (Operations)
- Executor (Operations)
- Planner (R&D)
- Approver (R&D)

---

## ACT 1 - Planner (Operations): Create and Prepare the Work

**Narrator says:** *"We start as a Planner in Operations. This role prepares work and makes it approval-ready."*

### Scene 1: Open Planning Command View

**As:** Planner (Operations)

**Go to:** `/dashboard`

> *"This is the Planner's command view: current workload, upcoming deadlines, and active priorities."*

**What to show:**
- Dashboard tiles and summary widgets
- How the planner identifies what to initiate or update

### Scene 2: Create or Review a Project

**As:** Planner (Operations)

**Go to:** `/projects`

> *"Projects are the container of work: scope, timeline, and responsible teams."*

**What to show:**
- Project list and status
- Open a project detail page

### Scene 3: Break Work into Assignable Tasks

**As:** Planner (Operations)

**Go to:** `/tasks`

> *"The planner converts project scope into assignable tasks with deadlines and ownership."*

**What to show:**
- Task rows/cards with status and assignee
- Priority and due-date management

### Scene 4: Align Dates and Milestones

**As:** Planner (Operations)

**Go to:** `/calendar`

> *"All milestones and commitments are aligned on one integrated calendar."*

**What to show:**
- Time-based view of project workload
- Milestone alignment across the team

**Transition:** *"Once planning is complete, the request moves to the approver."*

---

## ACT 2 - Approver (Operations): Govern and Decide

**Narrator says:** *"Now we switch to the Operations Approver who ensures requests follow governance and policy before execution."*

### Scene 5: Approval Inbox Review

**As:** Approver (Operations)

**Go to:** `/approvals`

> *"The approver sees pending requests and decides with full accountability."*

**What to show:**
- Pending approvals queue
- Status tags and timestamps
- Open one request for review

### Scene 6: Decision Actions

**As:** Approver (Operations)

**Go to:** `/approvals`

> *"From here, the approver can approve, reject, delegate, or escalate with notes."*

**What to show:**
- Decision action controls
- Required notes/rationale entry
- Resulting status change

### Scene 7: Optional Workflow Governance View

**As:** Approver (Operations) or Admin (Global)

**Go to:** `/approvals/workflows`

> *"Approval routing can be configured to match organizational hierarchy and division requirements."*

**What to show:**
- Approval chain configuration concept
- Module/division-specific routing

**Transition:** *"After approval, the work is released for execution."*

---

## ACT 3 - Executor (Operations): Deliver the Output

**Narrator says:** *"Now we switch to the Executor role to show production and delivery."*

### Scene 8: Execute in Production

**As:** Executor (Operations)

**Go to:** `/production`

> *"Approved requests enter active execution. The executor tracks operational progress to completion."*

**What to show:**
- Production queue and active items
- Status progression during execution

### Scene 9: Dispatch and Circulation

**As:** Executor (Operations)

**Go to:** `/circulation`

> *"Completed outputs move into circulation for dispatch tracking and closure."*

**What to show:**
- Dispatch status lifecycle
- Delivery tracking states

### Scene 10: Raise a Support Blocker (if needed)

**As:** Executor (Operations)

**Go to:** `/submit-ticket`

> *"If something blocks execution, users can submit support tickets directly in-system."*

**What to show:**
- Ticket creation flow
- Traceability of operational blockers

**Transition:** *"Now we show the same story from R&D to highlight division-aware governance."*

---

## ACT 4 - Planner (R&D): Division-Specific Planning

**Narrator says:** *"Switching to Planner in R&D demonstrates that the same platform supports division-specific work contexts."*

### Scene 11: R&D Planning Overview

**As:** Planner (R&D)

**Go to:** `/dashboard`

> *"The dashboard context reflects this role's responsibilities and allowed data scope."*

**What to show:**
- Division-relevant cards and queues
- Different planning emphasis from Operations

### Scene 12: R&D Work Structuring

**As:** Planner (R&D)

**Go to:** `/projects` then `/tasks`

> *"R&D planning follows the same lifecycle discipline: structure projects, assign tasks, and track progress."*

**What to show:**
- R&D project/task records
- Consistency of workflow with role-based scope

**Transition:** *"Then the R&D approver validates and routes decisions for that division."*

---

## ACT 5 - Approver (R&D): Division Approval Control

**Narrator says:** *"This role confirms that approvals can be managed per division while keeping a unified platform."*

### Scene 13: R&D Approvals

**As:** Approver (R&D)

**Go to:** `/approvals`

> *"The approver sees requests requiring R&D authority and can process them through the same controlled actions."*

**What to show:**
- Division-appropriate pending items
- Approve/reject/delegate/escalate flow

### Scene 14: Performance Visibility

**As:** Approver (R&D)

**Go to:** `/analytics`

> *"Leads can review throughput and performance trends to improve cycle time and decision quality."*

**What to show:**
- KPI and trend views
- Drilldowns for decision-making

---

## ACT 6 - Admin (Global): Security, Control, and Trust

**Narrator says:** *"Finally, we show how global administration ensures this speed is matched with security and accountability."*

### Scene 15: User Administration

**As:** Admin (Global)

**Go to:** `/user-management`

> *"Admins manage account lifecycle and role assignment."*

**What to show:**
- User directory
- Create/update/deactivate actions

### Scene 16: Role Governance

**As:** Admin (Global)

**Go to:** `/roles`

> *"Roles define exactly who can do what across modules and actions."*

**What to show:**
- Role definitions
- Permission granularity

### Scene 17: Security and Audit

**As:** Admin (Global)

**Go to:** `/security` then `/audit`

> *"Security policy plus audit trail provides governance, traceability, and compliance confidence."*

**What to show:**
- Security configuration controls
- Searchable audit logs with user/action/date filters

### Scene 18: Integration Readiness

**As:** Admin (Global)

**Go to:** `/api-management`

> *"The platform is integration-ready, with managed API access for future interoperability."*

**What to show:**
- API management surface
- Controlled access model

---

## CLOSING - Executive Message

**Narrator says:**

> *"In this demo, Planner prepares work. Approver governs decisions. Executor delivers outputs. Admin enforces security and accountability. The same pattern works across Operations and R&D.*
>
> *That is the value of BCS IPPMS: one platform for execution speed, governance control, and full traceability."*

---

## Quick Route Guide by Role

| Role | Primary Pages to Show |
|------|------------------------|
| Planner (Operations) | `/dashboard`, `/projects`, `/tasks`, `/calendar` |
| Approver (Operations) | `/approvals`, `/approvals/workflows` |
| Executor (Operations) | `/production`, `/circulation`, `/submit-ticket` |
| Planner (R&D) | `/dashboard`, `/projects`, `/tasks` |
| Approver (R&D) | `/approvals`, `/analytics` |
| Admin (Global) | `/user-management`, `/roles`, `/security`, `/audit`, `/api-management` |

---

## Demo Flow (Fast Version)

1. Planner (Operations): `/dashboard` -> `/projects` -> `/tasks`
2. Approver (Operations): `/approvals`
3. Executor (Operations): `/production` -> `/circulation`
4. Planner (R&D): `/projects` -> `/tasks`
5. Approver (R&D): `/approvals`
6. Admin (Global): `/audit`

---

## Demo Tips

1. Start by showing the quick role switch cards to set context.
2. Keep one sample request name across all role switches.
3. Narrate access boundaries explicitly: "what this role can see and do."
4. Pair operational screens with governance screens in the same storyline.
5. End on `/audit` for accountability and executive confidence.
