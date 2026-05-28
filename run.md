Welcome to the configuration manual for IssueFlow, a lightweight, robust project and issue tracking backend service built using NestJS and TypeScript.

📋 Prerequisites
Before proceeding, ensure you have the following environments installed on your machine:

Node.js: v18.x or higher (v20+ recommended)

npm: v9.x or higher

cURL or Postman: For verifying API route mutations locally

🛠️ Step 1: Install System Dependencies
Isolate your terminal inside the project root directory and execute the following command to download and map your application dependencies:

Bash
npm install
Required Typings & Modules Included
If your local development compilation complains about missing multipart or decoration libraries, run this auxiliary setup block:

Bash
npm install --save-dev @types/multer @types/passport-jwt @types/supertest
npm install class-validator class-transformer
🗄️ Step 2: Database Configuration
Because IssueFlow utilizes a high-performance In-Memory Data Store Array System with auto-incrementing engines for this initial delivery checkpoint, no external database installation (such as PostgreSQL, MySQL, or MongoDB) is required to run the platform.

The backend will automatically initialize empty user registries, project frameworks, and ticket matrix structures upon server startup.

⚠️ Note: Because the state is stored in memory, restarting or shutting down the application process will cleanly cycle the data registries back to zero.

🏗️ Step 3: Build the Project
To compile your TypeScript architecture directly down into native, production-grade JavaScript execution components, trigger the compiler step:

Bash
npm run build
The compiled output footprint will be generated inside a newly created /dist folder in your directory tree.

🚀 Step 4: Run the Application
Depending on your current development phase, choose the appropriate runtime execution command:

Run in Development Hot-Reload Mode (Recommended)
This starts the application engine on a live observer watcher loop. Any local file code changes you save will trigger an instant backend hot-recompile:

Bash
npm run start:dev
Run Compiled Production Output
Bash
npm run start:prod
Once the application initialization loop completes successfully, the service will bind to its local port:

Plaintext
[Nest] 12345  - 05/28/2026, 8:41:11 PM   LOG [NestApplication] Nest application successfully started +2ms
The application will be accessible at: http://localhost:3000

🧪 Step 5: Execute the Testing Suite
IssueFlow comes packaged with an automated test runner suite verifying your critical business logic constraints (Optimistic concurrency locking, forward-only ticket status lifecycles, and auto-assignment structures).

Run Core Engine Unit Tests
Bash
npm run test
Run End-to-End (E2E) Integration Infrastructure Tests
Ensure your application instance is not actively occupying port 3000 on the same thread before initiating E2E testing loops:

Bash
npm run test:e2e
📡 Quick Sanity Check (Verification Verification)
While the application server is running, you can hit the custom health-check endpoint via terminal or browser to verify system status:

Bash
curl -X GET http://localhost:3000/
Expected Plaintext Response Payload Output:

Plaintext
IssueFlow is running!