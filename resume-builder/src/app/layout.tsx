import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/components/auth/AuthProvider";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "AI Resume Builder - Create Professional Resumes with AI",
  description: "Build stunning, ATS-optimized resumes with AI assistance. Get real-time feedback, smart suggestions, and professional templates.",
  keywords: "resume builder, AI resume, professional resume, ATS optimization, job application",
  authors: [{ name: "AI Resume Builder Team" }],
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#3b82f6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} antialiased min-h-screen`}>
        <AuthProvider>
          <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
