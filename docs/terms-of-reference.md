# TERMS OF REFERENCE (TOR)

## Integrated Project and Production Management Information System (IPPMS)

### 1. PROJECT BACKGROUND

The Bureau of Communications Services (BCS) requires an Integrated Project and Production Management Information System (IPPMS) to digitize and streamline its operational workflows. The proposed solution is a custom software application designed specifically for the exclusive use of the client under a perpetual license, with no subscription-based model.

### 2. PROJECT OBJECTIVES

- **2.1** Develop and implement the IPPMS using the latest stable version of PHP with an MVC framework, RESTful API support, and Microsoft SQL Server Standard Edition.
- **2.2** Deploy the application on a Two-Tier Architecture (Application Server and Database Server) utilizing the client-provided infrastructure.
- **2.3** Digitize the entire project lifecycle, from planning and conceptualization to execution, monitoring, and closure.
- **2.4** Establish a highly configurable, multi-level approval workflow engine with status tracking, delegation, and escalation capabilities across different modules and divisions.
- **2.5** Streamline production and circulation processes through integrated job order management, logistics monitoring, inventory control, and dispatch tracking.
- **2.6** Provide real-time data visualization and operational insights via role-specific dashboards, performance indicators, and calendar integrations.
- **2.7** Ensure robust system security, accountability, and API-readiness through comprehensive audit trails, secure authentication, and a highly granular Role-Based Access Control (RBAC) mechanism.

### 3. USER ROLES AND ACCESS

- The system shall utilize a Role-Based Access Control (RBAC) architecture with division-based data segregation configured per the BCS organizational structure (per TOR Item 11).
- Permissions shall be configurable at the module, sub-module, and action levels.
- The system must support secure authentication with password policy enforcement, and have no limitations on the number of internal users or transactions.

### 4. FUNCTIONAL REQUIREMENTS

#### 4.1 IPPMS Core - Project Lifecycle Management Module

- Project Planning & Proposal Management.
- Project Conceptualization & Scheduling.
- Task Delegation & Work Assignment.
- Project Execution & Monitoring.
- Project Closure & Evaluation.

#### 4.2 Multi-Level Approval Workflow Engine

- Configurable multi-level approval workflows featuring status tagging.
- Configurable approval chains mapped to specific modules and divisions.
- Approval delegation and hierarchical escalation support.
- Real-time status tracking and automated notification systems.

#### 4.3 Production & Circulation Workflow Module

- Job order management and task assessment functionalities.
- Inventory and storage control integrated with production workflows.
- Secure file handling and production scheduling.
- Logistics and dispatch documentation and monitoring.
- Circulation and distribution tracking mechanisms.

#### 4.4 Dashboard, Analytics & Calendar Integration

- Real-time monitoring dashboard featuring performance indicators and progress visualization.
- Embedded calendar integration capabilities.
- Role-specific data views customized per division.

#### 4.5 Audit Trail, Security & API-Ready Layer

- Comprehensive audit trail capturing exact user actions, timestamps, and system activities.
- Secure authentication layer with strict password policy enforcement.
- API-ready architecture engineered for future external integrations.

### 5. NON-FUNCTIONAL REQUIREMENTS

- **5.1 Infrastructure Architecture:** The system must be deployed using a Two-Tier Architecture (Application Server and Database Server).
- **5.2 Technology Stack:** Development must utilize PHP (latest stable, MVC framework, RESTful API) paired with Microsoft SQL Server Standard Edition.
- **5.3 Deployment Environment:** Installation, configuration, and validation of system connectivity must be executed across all environments on the client-provided servers.
- **5.4 Quality Assurance:** The system must undergo functional testing, security and vulnerability testing, and system performance testing.

### 6. LEGAL AND COMPLIANCE REQUIREMENTS

- **6.1** Full compliance with all TOR Technical Requirements and Specifications (Items 1-23).
- **6.2** Compliance with TOR SLA requirements, validating Severity 1 to Severity 4 response tiers prior to acceptance.
- **6.3** Enforcement of liquidated damages provisions as per the SLA.
- **6.4** Licensing must be strictly perpetual with 1 installation, prohibiting subscription-based models.
- **6.5** Pricing quotations must remain valid for sixty (60) calendar days from the date of submission.

### 7. DELIVERABLES

- **7.1** A fully functioning IPPMS software application under a Perpetual License.
- **7.2** Facilitation of User Acceptance Testing (UAT) with authorized BCS representatives, including defect tracking and resolution.
- **7.3** A dedicated Project Manager for the full project duration delivering regular progress reports, percentage of completion tracking, and milestone coordination.
- **7.4** Business Analyst & Technical Lead support for requirements finalization and system architecture oversight.
- **7.5** Face-to-face Train-the-Trainers knowledge transfer sessions with certificates issued to all participants.
- **7.6** A formal Knowledge Transfer Plan, training guides, and presentation materials.
- **7.7 Technical Documentation:** Installation & Configuration Manual, Operations Manual, 1 User's Manual (per TOR Item 23), API reference documentation, Technical Specifications, and a System Architecture Document.
- **7.8** A 1-Year SLA-covered software warranty covering software updates, security patches, bug fixes, and technical support.
- **7.9 SLA Response Times:** Severity 1 (Critical) on-site support within 4 hours; Severity 2 (High) within 1 working day; Severity 3 (Moderate) within 5 working days; Severity 4 (Low) available in the next update.

### 8. ASSUMPTIONS AND DEPENDENCIES

- **8.1** Cloud hosting, server hardware, and database storage are NOT included in the vendor's scope; these must be provided entirely by the Bureau of Communications Services (per TOR Item 7).
- **8.2** The vendor will remain available for post-training consultations as required.
- **8.3** The vendor is available to present previously developed Information Management Systems during post-qualification (per TOR Other Technical Requirements).
