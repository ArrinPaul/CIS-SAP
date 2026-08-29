'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Loader2 } from 'lucide-react';
import { searchUsers } from '@/app/actions/users';
import { useDebounce } from '@/hooks/use-debounce';

interface UserPickerProps {
  onSelect: (userId: string, name: string) => void;
  excludeIds?: string[];
}

export function UserPicker({ onSelect, excludeIds = [] }: UserPickerProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    async function performSearch() {
      if (!debouncedQuery) {
        setUsers([]);
        return;
      }

      setLoading(true);
      setLoadError(false);
      try {
        const results = await searchUsers(debouncedQuery);
        setUsers(results.filter((u: any) => !excludeIds.includes(u.id)));
      } catch (error) {
        setLoadError(true);
        console.error('Search failed:', error);
      } finally {
        setLoading(false);
      }
    }

    performSearch();
  }, [debouncedQuery, excludeIds]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search people by name..." 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 bg-card border-border text-foreground"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
        {debouncedQuery && !loading && loadError ? (
          <p className="text-center py-10 text-notion-ink-muted text-body-sm">Couldn&apos;t search right now. Please try again.</p>
        ) : debouncedQuery && !loading && users.length === 0 ? (
          <p className="text-center py-10 text-muted-foreground text-sm">No users found.</p>
        ) : !debouncedQuery ? (
           <p className="text-center py-10 text-muted-foreground text-sm">Type a name to search...</p>
        ) : (
          users.map((u: any) => (
            <button
              key={u.id}
              onClick={() => onSelect(u.id, u.name || 'User')}
              className="w-full flex items-center gap-3 p-2 hover:bg-card rounded-lg transition-colors text-left"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={u.image} />
                <AvatarFallback className="bg-primary/10 text-primary">{u.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-foreground">{u.name}</p>
                <p className="text-xs text-muted-foreground">{u.role}</p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
