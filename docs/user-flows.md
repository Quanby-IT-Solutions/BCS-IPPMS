# User Flows

## Integrated Project and Production Management Information System (IPPMS)

### Section 0 - System Administration & Security Layer

#### 0.1 System Administrator - Dynamic RBAC & Division-Based Segregation User Flow

1. Open App and Login.
2. Open Admin Console.
3. Navigate to Role Management Dashboard.
4. Click "Create Custom Role".
5. Toggle granular permissions (module-level, sub-module-level, and action-level) on the Permission & Action Matrix.
6. Configure division-based data access segregation per the BCS organizational structure.
7. Click "Save Role".
8. System stores the role and makes it available for user assignment.

Wireframe Pages

- Admin Console Dashboard
- Role Management Dashboard
- Custom Role Creator Wizard
- Permission & Action Matrix
- Division Segregation Settings

#### 0.2 Auditor / Security Officer - Audit Trail & Security Enforcement User Flow

1. Open App and Login.
2. Navigate to System Audit Log.
3. Set date filters or search parameters for specific users or modules.
4. View comprehensive logs capturing exact user actions, timestamps, and system activities.
5. Export logs if necessary for external compliance review.

Wireframe Pages

- Security Operations Dashboard
- System Audit Log Interface
- Activity History Dashboard

#### 0.3 Security Administrator - Password Policy & Authentication Management User Flow

1. Open App and Login.
2. Navigate to Security Policy Manager.
3. Access Authentication Settings.
4. Define strict password policies (e.g., character complexity, expiration dates, lockout thresholds).
5. Click "Apply Policies" to enforce rules system-wide.

Wireframe Pages

- Security Policy Manager
- Authentication Settings Panel
- Password Rule Configuration Screen

#### 0.4 System Integrator - API Access & Integration Management User Flow

1. Open App and Login.
2. Navigate to API Management Dashboard.
3. Generate new API Key or view existing RESTful API endpoints.
4. Configure access limits or IP whitelisting for the generated key.
5. Access the API Documentation Portal for integration references.

Wireframe Pages

- API Management Dashboard
- Developer/Integration Settings
- API Documentation Portal

#### 0.5 User Access Manager - User Account Management User Flow

1. Open App and Login.
2. Navigate to User Directory.
3. Click "Create New User".
4. Enter user credentials and personal details.
5. Assign the user to a previously created custom Role and specific Division.
6. Click "Save User" to grant active access to the IPPMS.

Wireframe Pages

- User Directory
- Account Creation Wizard
- User Profile Management

### Section A - IPPMS Core - Project Lifecycle Management

#### A.1 Project Planner - Project Planning & Conceptualization User Flow

1. Open App and Login.
2. Navigate to Proposal Management Wizard.
3. Complete Project Conceptualization fields (objectives, scope, deliverables).
4. Draft initial timeline using the Schedule Planner.
5. Save draft or submit the proposal for multi-level approval.

Wireframe Pages

- Proposal Management Wizard
- Project Conceptualization Board
- Schedule Planner

#### A.2 Task Manager - Task Delegation & Work Assignment User Flow

1. Open App and Login.
2. Open active Project Dashboard.
3. Navigate to Task Delegation Interface.
4. Review internal personnel workload on the Resource Capacity View.
5. Assign specific tasks, deadlines, and requirements to selected personnel.
6. System automatically notifies assigned users.

Wireframe Pages

- Project Master Dashboard
- Task Delegation Interface
- Work Assignment Board
- Resource Capacity View

#### A.3 Project Executor - Project Execution, Monitoring, & Closure User Flow

1. Open App and Login.
2. Navigate to Project Execution Dashboard.
3. Update task statuses and log progress on the Milestone Tracker.
4. Upon project completion, navigate to Project Evaluation & Closure Form.
5. Submit final metrics, attach final files, and formally close the project.

Wireframe Pages

- Project Execution Dashboard
- Milestone Tracker
- Project Evaluation & Closure Form

### Section B - Multi-Level Approval Workflow Engine

#### B.1 Workflow Configurator - Configurable Approval Chains User Flow

1. Open App and Login.
2. Navigate to Workflow Builder.
3. Select a specific module (e.g., Project Proposals or Job Orders) and target Division.
4. Map out the multi-level approval chain by dragging and dropping required roles.
5. Save Workflow Configuration.
6. System applies the automated routing to all future requests in that module.

Wireframe Pages

- Workflow Builder Interface
- Approval Routing Matrix
- Division Chain Setup

#### B.2 Approving Officer - Status Tracking, Delegation, & Escalation User Flow

1. Open App and Login.
2. Navigate to "My Approvals Inbox".
3. Open a pending request and review attached documents.
4. Choose an action: Approve, Reject, Delegate to another officer, or Escalate up the hierarchy.
5. Add required notes and submit.
6. System updates status tags and notifies the requester.

Wireframe Pages

- My Approvals Inbox
- Request Review Screen
- Status Tracking Board
- Escalation & Delegation Interface

### Section C - Production & Circulation Workflow Module

#### C.1 Production Manager - Job Order Management & Production Scheduling User Flow

1. Open App and Login.
2. Navigate to Job Order Masterlist.
3. Open a newly approved Job Order.
4. Conduct Task Assessment and review securely handled files.
5. Assign to production queues using the Production Scheduler.
6. Change status to "In Production".

Wireframe Pages

- Job Order Masterlist
- Task Assessment Interface
- File Handling Repository
- Production Scheduler

#### C.2 Inventory Manager - Inventory & Storage Control User Flow

1. Open App and Login.
2. Navigate to Inventory Dashboard.
3. Monitor real-time physical material counts linked to active job orders.
4. Perform stock adjustments or allocate items via the Storage Allocation Screen.
5. Log movements in the Stock Movement Log.

Wireframe Pages

- Inventory Dashboard
- Stock Movement Log
- Storage Allocation Screen

#### C.3 Logistics Officer - Logistics, Dispatch, & Circulation User Flow

1. Open App and Login.
2. Navigate to Circulation Master List.
3. Select a completed Job Order ready for deployment.
4. Fill out the Dispatch Documentation Form.
5. Monitor real-time transit status on the Logistics Tracking Map.
6. Mark as "Delivered" to close the circulation loop.

Wireframe Pages

- Circulation Master List
- Dispatch Documentation Form
- Logistics Tracking Map

### Section D - Dashboard, Analytics & Calendar Integration

#### D.1 Division Manager - Real-Time Monitoring & Performance Analytics User Flow

1. Open App and Login.
2. System loads the customized Division Analytics Dashboard based on role.
3. Review real-time performance indicators and operational metrics.
4. Interact with the Progress Visualizer to drill down into specific project health statuses.

Wireframe Pages

- Division Analytics Dashboard
- KPI Metrics Interface
- Progress Visualizer

#### D.2 Staff Member - Calendar Integration & Event Tracking User Flow

1. Open App and Login.
2. Navigate to Integrated Division Calendar.
3. Filter views by project milestones, production tasks, or dispatch schedules.
4. Click on specific events in the Schedule Timeline View for expanded details.

Wireframe Pages

- Integrated Division Calendar
- Schedule Timeline View

#### D.3 Data Manager - Report Generation & File Import User Flow

1. Open App and Login.
2. Navigate to Report Generator Dashboard.
3. Select data parameters and click "Export" to extract operational data.
4. Navigate to Bulk File Import Utility.
5. Upload necessary external files to sync with active system records.

Wireframe Pages

- Report Generator Dashboard
- Data Export Interface
- Bulk File Import Utility
