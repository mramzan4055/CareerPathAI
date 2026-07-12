# 🚀 CareerPathAI - Frontend

An intelligent career guidance platform built with **Next.js** and **Supabase**, talking to the
`KaamYabi AI` FastAPI backend (see the `Backend/` repo) for CV parsing, job matching, and
skill-gap analysis. CareerPathAI helps users discover personalized career paths using AI-driven
recommendations.

---

## ✨ Features

- 🔐 **Authentication** — Secure sign-in/sign-up via Supabase Auth (email/password, session in `SupabaseAuthProvider`)
- 🔑 **Forgot / Reset Password** — Password recovery flow
- 📄 **CV Upload & Skill Gap Analysis** — Upload a resume, get parsed structured data, target-role and skill-gap tracking
- 💼 **Job Search & Matching** — Search jobs and get semantic matches against your CV, save/unsave jobs
- 🎨 **Modern UI** — Beautiful interface built with Radix UI & Tailwind CSS
- 🌙 **Theme Support** — Light/dark mode with next-themes
- 📱 **Responsive Design** — Works seamlessly across all devices

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| [Next.js 14](https://nextjs.org/) (App Router) | React framework |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [Supabase Auth + JS client](https://supabase.com/) | Authentication & database access |
| [Tailwind CSS](https://tailwindcss.com/) | Styling |
| [Radix UI](https://www.radix-ui.com/) / shadcn-style components | UI components |
| [Lucide React](https://lucide.dev/) / react-icons | Icons |

> Auth is handled entirely by Supabase — there is no NextAuth.js and no `src/app/api/` route
> handlers in this project. All backend calls go to the FastAPI service via `src/lib/api.ts`,
> authenticated with the caller's Supabase access token.

---

## 📁 Project Structure

```
src/
├── app/
│   ├── dashboard/         # Authenticated app shell + feature pages
│   │   ├── cv/            # CV view
│   │   ├── jobs/          # Job search & matching
│   │   ├── profile/       # Profile (+ print/ variant)
│   │   ├── resume/        # Resume lab
│   │   ├── saved/         # Saved jobs
│   │   └── skills/        # Skill gap analysis
│   ├── forgot-password/   # Password recovery page
│   ├── reset-password/    # Password reset page
│   ├── sign-in/           # Sign in page
│   ├── sign-up/           # Sign up page
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/
│   ├── ui/                # Reusable UI primitives (shadcn-style)
│   ├── views/             # Feature view components rendered by dashboard pages
│   ├── auth-islands.tsx   # Auth-aware landing-page CTAs
│   ├── job-detail-modal.tsx
│   ├── course-placeholder.tsx
│   └── user-button.tsx    # User profile button
├── lib/
│   ├── api.ts             # Typed client for the FastAPI backend (attaches Supabase auth token)
│   ├── supabase.ts        # Server-only Supabase client (service role) -- currently unused in src/
│   ├── supabase-browser.ts # Supabase browser client (anon key)
│   └── utils.ts           # Utility functions
└── providers/
    └── supabase-auth-provider.tsx # Auth context provider
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- A [Supabase](https://supabase.com/) project

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/rizwanrolex/CareerPathAI-Frontend.git
   cd CareerPathAI-Frontend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   Copy `.env.example` to `.env.local` and fill in real values:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000
   ```

   You'll also need the `Backend/` FastAPI service running locally (see its own README) for
   CV parsing, job search/matching, and skill-gap features to work.

4. **Run the development server**

   ```bash
   npm run dev
   ```

5. **Open in browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

---

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👤 Author

**M Ramzan** — [@rizwanrolex](https://github.com/rizwanrolex)
