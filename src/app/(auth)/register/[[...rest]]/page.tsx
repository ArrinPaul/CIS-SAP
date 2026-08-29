'use client';

import { SignUp } from "@clerk/nextjs";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { motion } from "framer-motion";

const AUTH_APPEARANCE = {
  elements: {
    rootBox: "w-full flex justify-center",
    card: "w-full bg-muted/30 backdrop-blur-xl border border-border/70 rounded-[2.5rem] shadow-2xl p-8 md:p-12 ring-1 ring-white/5",
    headerTitle: "text-2xl font-display font-bold tracking-tight text-foreground",
    headerSubtitle: "text-muted-foreground text-sm font-medium leading-relaxed",
    socialButtonsBlockButton:
      "h-12 rounded-2xl border border-border/70 bg-background/80 hover:bg-muted transition-all text-foreground font-bold uppercase tracking-[0.2em] text-[10px] shadow-sm",
    socialButtonsBlockButtonText: "font-bold text-foreground",
    dividerRow: "py-6",
    dividerLine: "bg-border/70",
    dividerText:
      "text-[9px] uppercase font-black tracking-[0.4em] text-muted-foreground/60 px-4 bg-transparent",
    formFieldLabel:
      "text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground mb-2 ml-1",
    formFieldInput:
      "h-12 rounded-2xl border border-border/60 bg-background/80 focus:bg-background focus:ring-4 focus:ring-primary/10 focus:border-primary/60 transition-all text-foreground px-5 text-sm font-medium",
    formButtonPrimary:
      "h-12 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all font-black uppercase tracking-[0.2em] text-[10px] shadow-notion-soft",
    footerActionText: "text-muted-foreground font-bold text-[10px] uppercase tracking-wider",
    footerActionLink:
      "text-primary font-black hover:text-primary/80 transition-colors uppercase tracking-[0.2em] text-[10px] ml-2",
    identityPreviewText: "text-foreground font-bold",
    identityPreviewEditButton: "text-primary",
    formResendCodeLink: "text-primary font-black uppercase tracking-[0.2em] text-[10px]",
    otpCodeFieldInput:
      "rounded-2xl border border-border/60 bg-background/80 text-foreground focus:border-primary/60 focus:ring-4 focus:ring-primary/10",
  },
};

export default function RegisterPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground grid place-items-center p-6 md:p-12">
      {/* BACKGROUND ELEMENTS */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-[-5%] h-[520px] w-[520px] rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-48 left-[-10%] h-[520px] w-[520px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(rgba(148,163,184,0.35) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-[480px] flex flex-col items-center gap-10"
      >
        <Link href="/" className="flex flex-col items-center gap-4 group transition-transform hover:scale-105">
          <Logo iconClassName="w-12 h-12" />
          <span className="font-display font-bold tracking-tighter text-3xl">Eventra</span>
        </Link>

        <div className="w-full flex justify-center">
           <SignUp 
             path="/register" 
             appearance={AUTH_APPEARANCE} 
           />
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground transition-all group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Return to home
        </Link>

        <div className="flex gap-8 text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">
          <span className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
            Core_Node_v0.1
          </span>
          <span>AES-256 Encrypted</span>
        </div>
      </motion.div>
    </div>
  );
}
