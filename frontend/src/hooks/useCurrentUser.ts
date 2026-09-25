import { useQuery } from '@tanstack/react-query';
import { fetchSessionUser } from '../utils/api';

/** Shared query key for the logged-in user; set to null on logout. */
export const CURRENT_USER_KEY = ['currentUser'];

/**
 * The logged-in user, or null for anonymous visitors.
 *
 * The session itself is an httpOnly cookie that JavaScript cannot read, so the
 * user is the only source of truth for "am I logged in" in the UI.
 */
export const useCurrentUser = () =>
  useQuery({
    queryKey: CURRENT_USER_KEY,
    queryFn: fetchSessionUser,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
