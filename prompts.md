Model Used: Gemini 3.5 Flash

Prompts Used:

1.

issueFlow is a backend service designed to handle a lightweight project and issue tracking platform. The system manages users, projects, tickets (issues), comments on tickets, audit logs, ticket dependencies, attachments, and bulk ticket import/export.
Functionality

The system provides the following APIs:
Users API: Manages user identities behind ticket assignments and comments.

User Management
The system must support a basic user registry. Each user record acts as the identity behind ticket assignments and comments.
Features:
• Register a new user with: username, email, full_name, and role (ADMIN or DEVELOPER). • Fetch a user by their id. • Update a user's details (full name, role). • Delete a user. • Fetch all users.
Constraints:
• Role must be one of: ADMIN, DEVELOPER

give me an initial code to work with in typescript for NestJS 

2.

Next API:

Authentication
The system must protect all API endpoints using JWT-based authentication.
Features:
• POST /auth/login - accepts username and password, returns a signed JWT access token.
IssueFlow | TDP 2026 Home Assignment  |  Confidential
Page 2 of 6
• POST /auth/logout - invalidates the current token (server-side deny-list or stateless expiry). • GET /auth/me - returns the profile of the currently authenticated user.

API DescriptionEndpointRequest BodyResponse StatusResponse BodyLogin (obtain JWT)POST /auth/login{ "username": "jdoe", "password": "secret" }200 OK{ "accessToken": "<jwt>", "tokenType": "Bearer", "expiresIn": 3600 }Logout (invalidate token)POST /auth/logout200 OKGet current userGET /auth/me

3.

Next API to implement:

Project Management
Projects are the top-level containers that group related tickets together.
Features:
• Create a new project with: name, description, and owner (a userId). • Fetch a project by id. • Update a project's name or description. • Delete a project. • Fetch all projects.

Projects APIs

API DescriptionEndpointRequest BodyResponse StatusResponse BodyGet all projectsGET /projects200 OK[ { "id": 1, "name": "Sample Project", "description": "A sample project", "ownerId": 1 } ]Get project by IDGET /projects/:projectId200 OK{ "id": 1, "name": "Sample Project", "description": "A sample project", "ownerId": 1 }Create a projectPOST /projects{ "name": "Sample Project", "description": "A sample project", "ownerId": 1 }200 OK{ "id": 1, "name": "Sample Project", "description": "A sample project", "ownerId": 1 }Update a projectPATCH /projects/:projectId{ "name": "Updated Name", "description": "Updated description" }200 OKSoft-delete a projectDELETE /projects/:projectId200 OK

4.

I need to create Tickets API:

Tickets APIs

API DescriptionEndpointRequest BodyResponse StatusResponse BodyGet tickets by projectGET /tickets?projectId=:projectId200 OK[ { "id": 1, "title": "Fix login bug", "description": "...", "status": "TODO", "priority": "HIGH", "type": "BUG", "projectId": 1, "assigneeId": 2, "dueDate": "2026-04-01T00:00:00Z", "isOverdue": false } ]Get ticket by IDGET /tickets/:ticketId200 OK{ "id": 1, "title": "Fix login bug", "description": "...", "status": "TODO", "priority": "HIGH", "type": "BUG", "projectId": 1, "assigneeId": 2, "dueDate": "2026-04-01T00:00:00Z", "isOverdue": false }Create a ticketPOST /tickets{ "title": "Fix login bug", "description": "...", "status": "TODO", "priority": "HIGH", "type": "BUG", "projectId": 1, "assigneeId": 2, "dueDate": "2026-04-01T00:00:00Z" }200 OK{ "id": 1, "title": "Fix login bug", "description": "...", "status": "TODO", "priority": "HIGH", "type": "BUG", "projectId": 1, "assigneeId": 2, "dueDate": "2026-04-01T00:00:00Z", "isOverdue": false }Update a ticketPATCH /tickets/:ticketId{ "title": "...", "description": "...", "status": "IN_PROGRESS", "priority": "MEDIUM", "assigneeId": 3, "dueDate": "2026-04-01T00:00:00Z" }200 OKSoft-delete a ticketDELETE /tickets/:ticketId200 OKExport tickets to CSVGET /tickets/export?projectId=:projectId200 OKCSV file with fields: id, title, description, status, priority, type, assigneeIdImport tickets from CSVPOST /tickets/importmultipart/form-data: file (CSV), projectId (form field)200 OK{ "created": 42, "failed": 3, "errors": [...] }

Ticket Management
Tickets (also called issues) are the core work items tracked in the system. Each ticket belongs to exactly one project.
Features:
• Create a ticket with: title, description, status, priority, type, projectId, and
optional assigneeId. • Fetch a ticket by its id.
• Update a ticket's fields (title, description, status, priority, assigneeId).
• Delete a ticket. • Fetch all tickets belonging to a given project. • Update a ticket - A ticket can’t be updated simultaneously by two users (or more)
Constraints:
• Status must be one of: TODO, IN_PROGRESS, IN_REVIEW, DONE. • Priority must be one of: LOW, MEDIUM, HIGH, CRITICAL. • Type must be one of: BUG, FEATURE, TECHNICAL. • A ticket can’t be updated once it’s DONE
• A ticket's status may only move forward in the lifecycle: TODO → IN_PROGRESS → IN_REVIEW → DONE. Backward transitions are not allowed.

5.

Now implement comments api:

Comments APIs

API DescriptionEndpointRequest BodyResponse StatusResponse BodyGet comments for ticketGET /tickets/:ticketId/comments200 OK[ { "id": 1, "ticketId": 1, "authorId": 2, "content": "Hello @jdoe!", "mentionedUsers": [{ "id": 1, "username": "jdoe", "fullName": "John Doe" }] } ]Add a commentPOST /tickets/:ticketId/comments{ "authorId": 2, "content": "Hello @jdoe!" }200 OK{ "id": 1, "ticketId": 1, "authorId": 2, "content": "Hello @jdoe!", "mentionedUsers": [{ "id": 1, "username": "jdoe", "fullName": "John Doe" }] }Update a commentPATCH /tickets/:ticketId/comments/:commentId{ "content": "Updated comment." }200 OKDelete a commentDELETE /tickets/:ticketId/comments/:commentId200 OK

Comment Management
Users can leave comments on tickets to provide context, updates, or discussion.
Features:
• Add a comment to a ticket with: content and authorId. • Fetch all comments for a given ticket. • Update the content of an existing comment. • Delete a comment. • Two users can’t edit a comment in the same time (Admin/ Developer)

6.

implement Audit Log APIs:

API DescriptionEndpointQuery ParamsResponse StatusResponse BodyGet audit logsGET /audit-logsOptional: entityType, entityId, action, actor200 OK[ { "id": 1, "action": "CREATE", "entityType": "TICKET", "entityId": 5, "performedBy": 2, "actor": "USER", "timestamp": "2026-03-01T10:00:00Z" } ]

Audit log
The system must maintain a persistent, append-only record of all state-changing actions performed within the application. This ensures a transparent history of project and ticket evolutions.
Features: • All state changing actions should be recorded – those that were manually requested by the user or automatically ran by the system. • Provide an endpoint to retrieve all logs, or filtered by a specific filed.

7.

Now lets implement Ticket Dependencies APIs:

API DescriptionEndpointRequest BodyResponse StatusResponse BodyAdd a dependencyPOST /tickets/:ticketId/dependencies{ "blockedBy": 42 }200 OKList dependenciesGET /tickets/:ticketId/dependencies200 OK[ { "id": 42, "title": "Blocking ticket", "status": "IN_PROGRESS" } ]Remove a dependencyDELETE /tickets/:ticketId/dependencies/:blockerId200 OK

Tickets can depend on other tickets. A ticket cannot transition to DONE if it has unresolved blockers.
Features:
• Add a dependency: POST /tickets/{ticketId}/dependencies with body {
"blockedBy": 42 } means ticket ticketId is blocked by ticket 42. • List dependencies: GET /tickets/{ticketId}/dependencies returns all tickets this ticket is blocked by.
• Remove a dependency: DELETE /tickets/{ticketId}/dependencies/{blockerId}.
Constraints:
• Both tickets must exist and belong to the same project.

8.

Now I want to implemet Attachments APIs:

Attachments APIs

API DescriptionEndpointRequest BodyResponse StatusResponse BodyUpload attachmentPOST /tickets/:ticketId/attachmentsmultipart/form-data: file200 OK{ "id": 1, "ticketId": 1, "filename": "screenshot.png", "contentType": "image/png" }Delete attachmentDELETE /tickets/:ticketId/attachments/:attachmentId200 OK

Users can attach files to tickets (e.g. screenshots, logs, design assets).
Constraints:
• Maximum file size: 10 MB. Uploads exceeding this limit must be rejected.
• Allowed file types: image/png, image/jpeg, application/pdf, text/plain. Reject all
others.

9.

Help me implement the following:

Ticket Export & Import
Support bulk export and import of tickets for project migration, backups, or integrations with external tools.
Features:
• Export tickets: GET /tickets/export?projectId={id} returns a CSV file with all tickets for the project. Include fields: id, title, description, status, priority, type,
assigneeId.
• Import tickets: POST /tickets/import accepts a CSV file (multipart/form-data) and creates tickets in bulk. The request must specify the target projectId as a form field. Returns
a summary: { "created": 42, "failed": 3, "errors": [...] }.
Constraints:
• The CSV format must handle commas and quotes inside field values correctly

10.

Now I want to implement the following:

Soft Delete APIs

Tickets and projects support soft delete only — deleted records are hidden from standard responses but can be restored by ADMIN users. Permanent (hard) deletion is not exposed through the API.
Tickets

API DescriptionEndpointRequest BodyResponse StatusResponse BodyList soft-deleted ticketsGET /tickets/deleted?projectId=:projectId200 OK[ { "id": 1, "title": "...", "status": "TODO", "priority": "HIGH", "type": "BUG", "projectId": 1 } ]Restore a soft-deleted ticketPOST /tickets/:ticketId/restore200 OK
Projects

API DescriptionEndpointRequest BodyResponse StatusResponse BodyList soft-deleted projectsGET /projects/deleted200 OK[ { "id": 1, "name": "Sample Project", "description": "...", "ownerId": 1 } ]Restore a soft-deleted projectPOST /projects/:projectId/restore200 OK

Soft Delete for Tickets and Projects
Tickets and projects can only be soft-deleted. Soft-deleted records are hidden from standard API responses but can be recovered or audited.
Features:
• GET /tickets/deleted?projectId={id} and GET /projects/deleted list only the
soft-deleted records (ADMIN only).
• POST /tickets/{id}/restore and POST /projects/{id}/restore recover a soft-
deleted record (ADMIN only).

11.

implement the following:

Mentions APIs

API DescriptionEndpointQuery ParamsResponse StatusResponse BodyGet mentions for a userGET /users/:userId/mentionsOptional: page, pageSize200 OK{ "data": [ { "id": 1, "ticketId": 3, "authorId": 2, "content": "Hey @jdoe ...", "mentionedUsers": [{ "id": 1, "username": "jdoe", "fullName": "John Doe" }] } ], "total": 10, "page": 1 }

Mention Mechanism in Comments
When a user includes @username inside a comment body, the mentioned user is notified and the association is persisted for later retrieval.
Features:
• GET /users/{userId}/mentions returns all comments where that user was mentioned, newest first. • Mention metadata is included in each comment response: mentionedUsers: [{ id,
username, fullName }].
• On comment update the mention list is re-evaluated: newly added mentions are created, removed mentions are deleted.
Constraints:
• Mentions are case-insensitive when matching usernames.

12.

Now implement the following:

Auto-Scheduling Escalation Level on Tickets
Tickets are automatically escalated in priority when they remain unresolved past a configured due date.
Features:
• Ticket creation and update accept an optional dueDate field (ISO-8601 datetime). • For each overdue ticket whose priority is below CRITICAL, the priority is promoted one level:
LOW → MEDIUM → HIGH → CRITICAL.
• When a ticket reaches CRITICAL and is still overdue, its is_overdue flag is set to true; this flag is visible in all GET responses.
Constraints:
• Escalation is idempotent: a CRITICAL ticket is never escalated further regardless of how far past due it is. • Escalation only applies to tickets for which dueDate has been set. • A manual priority change by a user (via PATCH /tickets/{id}) resets the auto-escalation state for that ticket (is_overdue is cleared, and the next escalation cycle re-evaluates from the new priority). • Escalation does not transition a ticket's status field; only the priority and is_overdue flag are modified.

13.

Implement the following:

Workload API

API DescriptionEndpointResponse StatusResponse BodyGet project workloadGET /projects/:projectId/workload200 OK[ { "userId": 1, "username": "jdoe", "openTicketCount": 3 }, { "userId": 2, "username": "asmith", "openTicketCount": 5 } ]

Auto Assignment to Users by Workload
When a ticket is created without an explicit assigneeId, the system automatically selects the least- loaded DEVELOPER in the project.
Features:
• On ticket creation, if assigneeId is not provided, the system queries all DEVELOPER. • Workload is defined as the count of non-DONE tickets currently assigned to each user within the same project. • The user with the lowest workload count is auto-assigned. Ties are broken by user registration order (oldest registrant first). • If no DEVELOPER users are linked to the project, the ticket is created with assigneeId = null (unassigned) without error.
• GET /projects/{projectId}/workload returns a list of { userId, username,
openTicketCount } for all users in the project, sorted by openTicketCount ascending. • Each auto-assignment is recorded in the Audit Log with actor = SYSTEM, action =
AUTO_ASSIGN.
Constraints:
• Only users with role DEVELOPER are candidates for auto-assignment. ADMIN users are excluded. • Auto-assignment can be overridden at any time by explicitly providing assigneeId in a PATCH
/tickets/{id} request.
• Auto-assignment is not triggered on ticket update, only on creation when assigneeId is absent.



14.

Input Validation & Error Handling

• Don’t allow invalid values into the API • In case of error, make sure to return an informative error.



15.


Testing

Provide relevant tests covering the key behaviors of your implementation.

