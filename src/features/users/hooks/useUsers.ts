import { useCallback, useEffect, useState } from 'react';
import { getAllSpecialists } from '../../kanban/services/kanban-service';
import type { Specialist } from '../../kanban/types';
import { getUserRows, type UserRow } from '../services/user-service';

export function useUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [u, s] = await Promise.all([getUserRows(), getAllSpecialists()]);
      setUsers(u);
      setSpecialists(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los usuarios.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return { users, specialists, loading, error, refetch: load };
}
