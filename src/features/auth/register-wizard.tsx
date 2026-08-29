'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  CheckCircle, 
  GraduationCap,
  Briefcase
} from 'lucide-react';
import { cn } from '@/core/utils/utils';

const ROLES = [
  {
    id: 'student',
    title: 'Student',
    icon: GraduationCap,
    description: 'For students attending events, workshops, and hackathons.',
    color: 'text-blue-500 bg-blue-500/10 border-blue-200'
  },
  {
    id: 'professional',
    title: 'Professional',
    icon: Briefcase,
    description: 'For industry pros networking and attending conferences.',
    color: 'text-purple-500 bg-purple-500/10 border-purple-200'
  },
  {
    id: 'organizer',
    title: 'Organizer',
    icon: Building2,
    description: 'For those hosting and managing events.',
    color: 'text-orange-500 bg-orange-500/10 border-orange-200'
  }
] as const;

export function RegisterWizard() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<'student' | 'professional' | 'organizer'>('student');

  const handleSignIn = () => {
    sessionStorage.setItem('preferred_role', selectedRole);
    router.push('/register');
  };


  return (
    <div className="w-full max-w-lg mx-auto text-foreground">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-3xl font-bold">Join Eventra</h2>
        <p className="text-muted-foreground">Choose your role to get started</p>
      </div>
      
      <div className="grid gap-4 mb-8">
        {ROLES.map((role) => (
          <div
            key={role.id}
            onClick={() => setSelectedRole(role.id as any)}
            className={cn(
              "relative flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all hover:bg-card",
              selectedRole === role.id ? "border-cyan-500 bg-primary/10" : "border-border bg-card"
            )}
          >
            <div className={cn("h-12 w-12 rounded-full flex items-center justify-center shrink-0", role.color)}>
              <role.icon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{role.title}</h3>
              <p className="text-sm text-muted-foreground">{role.description}</p>
            </div>
            {selectedRole === role.id && <CheckCircle className="h-5 w-5 text-primary" />}
          </div>
        ))}
      </div>

      <Button onClick={handleSignIn} className="w-full py-6 text-lg bg-notion-surface text-black hover:bg-gray-200">
        Continue as guest
      </Button>
    </div>
  );
}
