"use client";
import { useAuth } from './useAuth';
import { useProfileCompletion } from '@/components/ProfileCompletionBanner';

export const useProfileGuard = () => {
  const { user } = useAuth();
  const { isComplete } = useProfileCompletion();

  const verifyEmailWarning = () => {
    alert("Action blocked: Please verify your @st.com email address first. You can resend the verification email from your dashboard.");
  };

  const verifyProfileWarning = () => {
    alert("Action blocked: Please complete your profile first (including uploading a vehicle photo if you are a driver).");
  };

  const canCreateRide = () => {
    if (!user) return false;
    return true;
  };

  const canBookRide = () => {
    if (!user) return false;
    return true;
  };

  return { canCreateRide, canBookRide };
};
