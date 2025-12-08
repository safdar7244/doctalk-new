# DocTalk - AI Document Chat SaaS

## Project Overview
DocTalk is an AI-powered SaaS application that allows users to upload documents (PDFs, Word docs, etc.) and chat with them to get answers, summaries, and insights.

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **React**: 19.2.0
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Theme**: next-themes (dark/light mode support)
- **Fonts**: Geist Sans & Geist Mono
- **Authentication**: AWS Cognito via `@aws-sdk/client-cognito-identity-provider`

## Project Structure
```
src/
├── app/
│   ├── layout.tsx           # Root layout with ThemeProvider & AuthProvider
│   ├── page.tsx             # Landing page
│   ├── globals.css          # Global styles & Tailwind config
│   ├── actions/
│   │   └── auth.ts          # Server actions for authentication
│   ├── signup/
│   │   └── page.tsx         # Sign up page
│   ├── login/
│   │   └── page.tsx         # Login page
│   └── verify-email/
│       └── page.tsx         # Email verification page
├── components/
│   ├── theme-provider.tsx   # Dark/light mode provider
│   ├── auth-provider.tsx    # Authentication context provider
│   └── landing/
│       ├── index.ts         # Barrel exports
│       ├── header.tsx       # Navigation header
│       ├── hero.tsx         # Hero section
│       ├── features.tsx     # Features section
│       ├── how-it-works.tsx
│       ├── pricing.tsx      # Pricing plans
│       ├── cta.tsx          # Call-to-action section
│       └── footer.tsx
├── lib/
│   └── cognito.ts           # AWS Cognito client & utilities
```

## Authentication (AWS Cognito)

### Setup
1. Create a `.env.local` file from `.env.local.example`
2. Add your Cognito User Pool configuration:
```env
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Cognito User Pool Requirements
- Enable `USER_PASSWORD_AUTH` flow in App Client settings
- Enable email as sign-in alias
- Configure email verification (required)
- Password policy: 8+ chars, uppercase, lowercase, numbers, special chars

### Auth Flow
1. **Sign Up** (`/signup`) → User registers with email/password
2. **Verify Email** (`/verify-email`) → User enters 6-digit code sent to email
3. **Login** (`/login`) → User signs in, tokens stored in HTTP-only cookies
4. **Protected Routes** → Use `useRequireAuth()` hook to protect pages

### Auth Hooks & Utilities
```typescript
// In client components:
import { useAuth, useRequireAuth, useRedirectIfAuthenticated } from "@/components/auth-provider";

// Get current user
const { user, isLoading, isAuthenticated, signOut } = useAuth();

// Protect a page (redirects to /login if not authenticated)
const { isLoading } = useRequireAuth();

// Redirect if already logged in (for login/signup pages)
useRedirectIfAuthenticated("/dashboard");
```

### Server Actions
```typescript
import {
  signUpAction,
  confirmSignUpAction,
  signInAction,
  signOutAction,
  getAuthUserAction,
  forgotPasswordAction,
  confirmForgotPasswordAction,
  resendConfirmationCodeAction,
} from "@/app/actions/auth";
```

## Design System

### Colors
- **Primary**: Violet/Indigo gradient (`from-violet-600 to-indigo-600`)
- **Accent**: Purple, Pink, Rose (for background glows)
- **Background**: White / Gray-950 (dark)
- **Text**: Gray-900 (light) / White (dark)
- **Error**: Red-50/Red-600 (light) / Red-500/10 (dark)
- **Success**: Green-50/Green-600 (light) / Green-500/10 (dark)

### UI Patterns
- Glassmorphism cards with `backdrop-blur-xl` and semi-transparent backgrounds
- Gradient background orbs with blur effects (`blur-3xl`)
- Rounded elements: `rounded-full` for buttons, `rounded-2xl` for cards
- Shadow with brand color: `shadow-violet-500/25`
- Hover effects: `hover:scale-105` for buttons
- Loading states with `Loader2` spinner from Lucide
- Disabled states with `disabled:opacity-50 disabled:cursor-not-allowed`

### Animation
- Use Framer Motion for entrance animations
- Standard pattern: `initial={{ opacity: 0, y: 20 }}` → `animate={{ opacity: 1, y: 0 }}`
- Stagger delays: 0.1s increments
- Error/success messages: `initial={{ opacity: 0, y: -10 }}`

## Commands
```bash
npm run dev    # Start development server
npm run build  # Build for production
npm run start  # Start production server
npm run lint   # Run ESLint
```

## Routes
- `/` - Landing page
- `/signup` - Sign up page (redirects to /verify-email)
- `/verify-email` - Email verification with 6-digit code
- `/login` - Login page (redirects to /dashboard on success)
- `/forgot-password` - Password reset (not yet implemented)
- `/dashboard` - Main app dashboard (not yet implemented)

## Pending Features
- [ ] Forgot password flow
- [ ] Dashboard (document upload, chat interface)
- [ ] Document upload functionality
- [ ] AI chat integration
- [ ] User profile/settings
- [ ] Subscription/payment integration
- [ ] Social login (Google, GitHub) - buttons exist but not wired up

## Notes
- All components use `"use client"` directive for client-side interactivity
- Dark mode is handled via `next-themes` with class-based switching
- The app uses the `@/` path alias for imports (maps to `src/`)
- Auth tokens stored in HTTP-only cookies for security
- Access tokens expire in 1 hour, refresh tokens in 30 days
