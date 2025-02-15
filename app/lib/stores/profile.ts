import { atom } from 'nanostores';
import { authStore, updateUserData } from './auth';

interface Profile {
  username: string;
  bio: string;
  avatar: string;
}

// Initialize profile store with auth user data or defaults
const getInitialProfile = (): Profile => {
  const authState = authStore.get();
  if (authState.user) {
    return {
      username: authState.user.username,
      bio: authState.user.bio || '',
      avatar: authState.user.avatar || '',
    };
  }
  return {
    username: 'Guest User',
    bio: '',
    avatar: '',
  };
};

export const profileStore = atom<Profile>(getInitialProfile());

// Subscribe to auth store changes
authStore.subscribe((authState) => {
  if (authState.user) {
    profileStore.set({
      username: authState.user.username,
      bio: authState.user.bio || '',
      avatar: authState.user.avatar || '',
    });
  } else {
    profileStore.set({
      username: 'Guest User',
      bio: '',
      avatar: '',
    });
  }
});

export const updateProfile = (updates: Partial<Profile>) => {
  const currentProfile = profileStore.get();
  const newProfile = { ...currentProfile, ...updates };
  
  // Update profile store
  profileStore.set(newProfile);

  // Sync with auth store
  updateUserData(updates);

  // Persist to localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('bolt_profile', JSON.stringify(newProfile));
  }
};
