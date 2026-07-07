// @ts-nocheck
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/shared/services/mail.service', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
}));

import * as authService from '@/modules/auth/auth.service';
import User from '@/modules/users/user.model';
import Vehicle from '@/modules/vehicles/vehicle.model';

const basePassenger = {
  firstName: 'Asha',
  lastName: 'Rao',
  email: 'asha.rao@st.com',
  password: 'password123',
  phone: '9999999999',
  address: '221B Baker Street',
  role: 'passenger',
};

const baseHybrid = {
  ...basePassenger,
  email: 'hybrid.driver@st.com',
  role: 'hybrid',
  vehicleName: 'Swift Dzire',
  vehiclePlateNumber: 'MH12AB1234',
  vehicleType: 'petrol',
  mileage: 18,
  seatCount: 4,
};

describe('auth.service.register', () => {
  it('creates a passenger user and returns a signed token', async () => {
    const { user, token } = await authService.register(basePassenger);
    expect(user.email).toBe(basePassenger.email);
    expect(user.password).toBeUndefined();
    expect(user.emailVerificationToken).toBeUndefined();
    expect(user.isEmailVerified).toBe(false);
    expect(typeof token).toBe('string');
  });

  it('rejects duplicate email registration', async () => {
    await authService.register(basePassenger);
    await expect(authService.register(basePassenger)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('auto-creates a vehicle for hybrid role users', async () => {
    const { user } = await authService.register(baseHybrid);
    const vehicle = await Vehicle.findOne({ owner: user._id });
    expect(vehicle).not.toBeNull();
    expect(vehicle!.vehiclePlateNumber).toBe('MH12AB1234');
  });

  it('rolls back user creation if vehicle creation fails', async () => {
    const conflictingHybrid = { ...baseHybrid, email: 'other.driver@st.com' };
    // Pre-seed a vehicle with the same plate number to force a duplicate-key failure.
    await Vehicle.create({
      owner: (await User.create({ ...basePassenger, email: 'placeholder@st.com' }))._id,
      vehicleName: 'Existing Car',
      vehiclePlateNumber: conflictingHybrid.vehiclePlateNumber,
      seatCount: 4,
      vehicleType: 'petrol',
      mileage: 15,
    });

    await expect(authService.register(conflictingHybrid)).rejects.toThrow();
    const orphanUser = await User.findOne({ email: conflictingHybrid.email });
    expect(orphanUser).toBeNull();
  });
});

describe('auth.service.login', () => {
  it('logs in a verified user with correct credentials', async () => {
    const user = await User.create({ ...basePassenger, isEmailVerified: true });
    const { user: loggedIn, token } = await authService.login(basePassenger.email, basePassenger.password);
    expect(loggedIn.email).toBe(basePassenger.email);
    expect(loggedIn.password).toBeUndefined();
    expect(typeof token).toBe('string');
  });

  it('rejects an incorrect password', async () => {
    await User.create({ ...basePassenger, isEmailVerified: true });
    await expect(authService.login(basePassenger.email, 'wrong-password')).rejects.toMatchObject({ statusCode: 401 });
  });

  it('rejects login for a non-existent email', async () => {
    await expect(authService.login('nobody@st.com', 'password123')).rejects.toMatchObject({ statusCode: 401 });
  });

  it('blocks login for an unverified account', async () => {
    await User.create({ ...basePassenger, isEmailVerified: false });
    await expect(authService.login(basePassenger.email, basePassenger.password)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('normalizes email case before lookup', async () => {
    await User.create({ ...basePassenger, isEmailVerified: true });
    const { user } = await authService.login(basePassenger.email.toUpperCase(), basePassenger.password);
    expect(user.email).toBe(basePassenger.email);
  });
});

describe('auth.service email verification + password reset', () => {
  it('verifies email with a valid token', async () => {
    const { user } = await authService.register(basePassenger);
    const stored = await User.findById(user._id).select('+emailVerificationToken');
    const result = await authService.verifyEmail(stored!.emailVerificationToken);
    expect(result.message).toMatch(/verified/i);
    const refreshed = await User.findById(user._id);
    expect(refreshed!.isEmailVerified).toBe(true);
  });

  it('rejects an invalid verification token', async () => {
    await expect(authService.verifyEmail('bogus-token')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('runs the forgot-password -> verify-otp -> reset-password flow', async () => {
    await User.create({ ...basePassenger, isEmailVerified: true });

    await authService.forgotPassword(basePassenger.email);
    const stored = await User.findOne({ email: basePassenger.email }).select('+resetOtp +resetOtpExpiry');
    expect(stored!.resetOtp).toMatch(/^\d{4}$/);

    const verifyResult = await authService.verifyOtp(basePassenger.email, stored!.resetOtp!);
    expect(verifyResult.verified).toBe(true);

    await authService.resetPassword(basePassenger.email, stored!.resetOtp!, 'newpassword456');
    const { token } = await authService.login(basePassenger.email, 'newpassword456');
    expect(typeof token).toBe('string');
  });

  it('rejects verifyOtp with a wrong code', async () => {
    await User.create({ ...basePassenger, isEmailVerified: true });
    await authService.forgotPassword(basePassenger.email);
    await expect(authService.verifyOtp(basePassenger.email, '0000')).rejects.toMatchObject({ statusCode: 400 });
  });
});
