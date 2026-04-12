import { useLocation } from "wouter";

export function useNavigate() {
  const [, setLocation] = useLocation();
  return {
    navigate: (path: string) => setLocation(path),
  };
}
