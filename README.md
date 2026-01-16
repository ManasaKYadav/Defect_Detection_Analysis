Defect Guardian AI 🛡️🔬
Defect Guardian AI is an enterprise-grade quality assurance platform that leverages Computer Vision and Artificial Intelligence to automate industrial defect detection. By using high-resolution image analysis, the platform identifies structural and surface irregularities with human-level precision.

🌟 Key Features
AI-Powered Analysis: Real-time defect detection powered by Google Gemini Vision AI.

Multi-Category Detection:

Surface Defects: Scratches, dents, and pitting.

Structural Issues: Cracks and deformations.

Assembly: Dimensional accuracy and contamination checks.

Automated Reporting: Generates detailed inspection reports with severity levels (Low, Medium, High, Critical).

Secure Authentication: Protected access via Supabase Auth.

Inspection History: Persistent database tracking of all past scans and results.

Batch Processing: Capability to handle multiple image uploads for high-volume environments.

🛠️ Tech Stack
Frontend: React 18 + Vite + TypeScript

Styling: Tailwind CSS + Shadcn UI (Radix UI)

State & Data: TanStack Query (React Query) + Context API

Backend/AI:

Supabase: Auth, Database, and Edge Functions.

Gemini Vision AI: Image processing and defect classification.

Testing: Vitest + Testing Library

🚀 Getting Started
1. Prerequisites
Node.js (v18+)

A Supabase Project

A Google Gemini API Key (configured in Supabase)

2. Installation
Bash

# Clone the repository
git clone https://github.com/ManasaKYadav/Defect_Detection_Analysis.git

# Navigate to folder
cd defect-guardian-ai-main

# Install dependencies
npm install
3. Environment Setup
Create a .env file in the root directory and add your Supabase credentials:

Code snippet

VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
4. Running the Project
Bash

# Start development server
npm run dev
The app will be available at http://localhost:8080/.

📂 Project Structure
src/components/DefectAnalyzer.tsx: The core AI interface for image processing.

src/services/defectAnalysisService.ts: Communicates with Supabase Edge Functions to trigger Gemini AI.

supabase/functions/analyze-defect: Server-side logic for secure AI processing.

src/context/InspectionContext.tsx: Manages the global state of inspection results.

📊 Deployment (Vercel)
This project is optimized for Vercel. When deploying:

Connect your GitHub repository.

Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to Project Settings > Environment Variables.

Ensure your Supabase Edge Functions are deployed using the Supabase CLI:

Bash

supabase functions deploy analyze-defect