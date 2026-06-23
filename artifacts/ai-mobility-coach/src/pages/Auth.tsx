import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Auth() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation("/welcome"); }, [setLocation]);
  return null;
}
