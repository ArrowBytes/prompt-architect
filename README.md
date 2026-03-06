# ⚡️ Prompt Architect

**Live Demo:**https://prompt-architect-eta.vercel.app/

Prompt Architect is a sleek, AI-powered web application designed to transform raw, unstructured thoughts into highly optimized, ready-to-use AI prompts. Built by Pramath Ram, this tool leverages Google's prompt engineering best practices—specifically the Persona, Context, Task, Constraints, and Format framework—to ensure maximum output quality from Large Language Models. 

## 🛠 Tech Stack

* **Frontend Framework:** Next.js (App Router) & React
* **Styling & UI:** Tailwind CSS with Glassmorphic design principles
* **Icons:** Lucide React
* **Backend & Database:** Supabase (PostgreSQL)
* **Authentication:** Supabase Auth (Email/Password & Session Management)
* **AI Engine:** OpenAI API (`gpt-4o-mini` model)
* **Deployment:** Vercel

## ✨ Core Features

* **AI Prompt Engineering Engine:** Automatically restructures vague ideas into highly detailed, actionable prompts.
* **Secure User Accounts:** Full authentication flow protecting user data.
* **Personalized Archive:** A slide-out history drawer that retrieves and displays prompts specific to the logged-in user.
* **Dynamic Learning:** An integrated tip engine that cycles through prompt engineering best practices in real-time.

## 🚀 Getting Started Locally

1. **Clone the repository:** `git clone https://github.com/your-username/prompt-architect.git`
2. **Install dependencies:** `npm install`
3. **Environment Variables:** Create a `.env.local` file with:
   * `NEXT_PUBLIC_SUPABASE_URL`
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   * `OPENAI_API_KEY`
4. **Database Setup:** Run the provided SQL script in Supabase to create the `prompts` table with a `user_id` foreign key.
5. **Run the server:** `npm run dev`

---
**Author:** Pramath Ram
