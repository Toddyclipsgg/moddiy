import { supabase } from './supabase';
import { getDeviceFingerprint, checkSecurityMetrics, updateSecurityMetrics, isDeviceBlocked, canCreateNewAccount } from './security/deviceFingerprint';
import type { DeviceInfo } from '~/types/security';

export async function signUp(email: string, password: string, username: string) {
  try {
    // Get device fingerprint
    const deviceInfo = await getDeviceFingerprint();

    // Check if device can create new account
    const canCreate = await canCreateNewAccount(deviceInfo);
    if (!canCreate) {
      throw new Error('Device has reached maximum number of accounts or is blocked');
    }

    // Attempt to sign up
    const { data: auth, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      throw signUpError;
    }

    if (!auth.user) {
      throw new Error('No user returned after signup');
    }

    // Create profile
    const { error: profileError } = await supabase.from('profiles').insert({
      id: auth.user.id,
      username,
      email,
    });

    if (profileError) {
      // Cleanup if profile creation fails
      await supabase.auth.signOut();
      throw profileError;
    }

    // Update security metrics
    const metrics = await checkSecurityMetrics(deviceInfo);
    await updateSecurityMetrics(deviceInfo, {
      ...metrics,
      accountsPerDevice: metrics.accountsPerDevice + 1
    }, true);

    return { user: auth.user, error: null };
  } catch (error) {
    return { user: null, error };
  }
}

export async function signIn(email: string, password: string) {
  try {
    // Get device fingerprint
    const deviceInfo = await getDeviceFingerprint();

    // Check security metrics
    const metrics = await checkSecurityMetrics(deviceInfo);

    // Check if device is blocked
    if (isDeviceBlocked(metrics)) {
      throw new Error('Device is temporarily blocked due to too many failed attempts');
    }

    // Attempt to sign in
    const { data: auth, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // Update metrics for failed attempt
      await updateSecurityMetrics(deviceInfo, metrics, false);
      throw signInError;
    }

    if (!auth.user) {
      throw new Error('No user returned after signin');
    }

    // Update metrics for successful login
    await updateSecurityMetrics(deviceInfo, metrics, true);

    return { user: auth.user, error: null };
  } catch (error) {
    return { user: null, error };
  }
} 