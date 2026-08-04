export type UserProfile = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  updatedAt: string;
};

export type UserProfileApiResponse = {
  profile: UserProfile;
};
